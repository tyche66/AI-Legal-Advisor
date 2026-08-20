/** Enforce contract-review file-read evidence from durable tool events. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import type { AssistantMessage } from '@deepseek-ai/dsh-llm'

export const name = 'document-read-integrity'

const BLOCKED_MESSAGE = '尚未获得该文件的真实读取结果，因此不能确认文件内容，也不能开始正式合同审查。\n请重新发送文件、选择可访问的文件路径，或明确粘贴需要临时审查的正文。'

export type DocumentReadStatus = 'complete' | 'partial' | 'empty' | 'failed' | 'unavailable'

export interface DocumentReadEvidence {
  requestedPath: string
  resolvedPath?: string
  status: DocumentReadStatus
  totalLines?: number
  returnedLines?: number
}

interface ReadCall {
  path: string
}

interface ReadMeta {
  path: string
  offset: number
  lines: Array<{ number: number, text: string }>
  totalLines: number
}

interface EventLike {
  type: string
  data: Record<string, unknown>
  sourceEventSeqs?: readonly number[]
  seq: number
}

declare module '@deepseek-ai/cordis' {
  interface Events {
    'agent/before-message'(payload: {
      agent: Agent
      turn: number
      step: number
      message: AssistantMessage
    }, next: (message: AssistantMessage) => Promise<AssistantMessage>): Promise<AssistantMessage>
  }
}

function contentOf(message: AssistantMessage | undefined): AssistantMessage['content'] {
  const content = (message as { content?: unknown } | undefined)?.content
  return Array.isArray(content) ? content as AssistantMessage['content'] : []
}

function normalizeAssistantMessage(message: AssistantMessage): AssistantMessage {
  if (Array.isArray((message as { content?: unknown }).content)) return message
  return { ...message, content: [] } as AssistantMessage
}

function textOf(message: AssistantMessage | undefined): string {
  return contentOf(message)
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')
}

function pathFromArguments(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const path = parsed.file_path
    return typeof path === 'string' && path.trim().length > 0 ? path : undefined
  } catch {
    return undefined
  }
}

function readMeta(value: unknown): ReadMeta | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const meta = value as Record<string, unknown>
  if (typeof meta.path !== 'string' || typeof meta.offset !== 'number' || !Number.isInteger(meta.offset)
    || typeof meta.totalLines !== 'number' || !Number.isInteger(meta.totalLines)
    || !Array.isArray(meta.lines)) return undefined
  const lines: Array<{ number: number, text: string }> = []
  for (const line of meta.lines) {
    if (line === null || typeof line !== 'object' || Array.isArray(line)) return undefined
    const item = line as Record<string, unknown>
    if (typeof item.number !== 'number' || !Number.isInteger(item.number) || typeof item.text !== 'string') return undefined
    lines.push({ number: item.number, text: item.text })
  }
  return { path: meta.path, offset: meta.offset, lines, totalLines: meta.totalLines }
}

function statusFromResult(call: ReadCall, result: EventLike): DocumentReadEvidence {
  const message = result.data.message
  if (message === null || typeof message !== 'object' || (message as Record<string, unknown>).isError === true) {
    return { requestedPath: call.path, status: 'failed' }
  }
  const meta = readMeta(result.data.meta)
  if (meta === undefined) return { requestedPath: call.path, status: 'unavailable' }
  if (meta.totalLines === 0) return { requestedPath: call.path, resolvedPath: meta.path, status: 'empty', totalLines: 0, returnedLines: 0 }
  const returnedLines = meta.lines.length
  const lastLine = meta.lines.at(-1)?.number ?? 0
  return {
    requestedPath: call.path,
    resolvedPath: meta.path,
    status: meta.offset === 1 && returnedLines > 0 && lastLine >= meta.totalLines ? 'complete' : 'partial',
    totalLines: meta.totalLines,
    returnedLines,
  }
}

/** Derive read evidence exclusively from a paired durable read call and result. */
export function documentReadEvidence(events: readonly EventLike[]): DocumentReadEvidence[] {
  const calls = new Map<number, ReadCall>()
  const evidence: DocumentReadEvidence[] = []
  for (const event of events) {
    if (event.type === 'tool/call' && event.data.name === 'read') {
      const path = pathFromArguments(event.data.arguments)
      if (path !== undefined) calls.set(event.seq, { path })
      continue
    }
    if (event.type !== 'tool/result') continue
    const callSeq = event.sourceEventSeqs?.[0]
    if (callSeq === undefined) continue
    const call = calls.get(callSeq)
    if (call !== undefined) evidence.push(statusFromResult(call, event))
  }
  return evidence
}

/** True only for a file-backed contract review request, not ordinary legal Q&A. */
export function requiresVerifiedRead(events: readonly EventLike[]): boolean {
  const userText = userTextFrom(events)
  return /合同|协议|contract/iu.test(userText)
    && /审查|审核|review/iu.test(userText)
    && /文件|附件|路径|\.docx?\b|\.pdf\b|\.md\b/iu.test(userText)
}

function userTextFrom(events: readonly EventLike[]): string {
  return events
    .filter(event => event.type === 'user/message')
    .flatMap(event => {
      const content = event.data.content
      return Array.isArray(content)
        ? content.filter(block => block !== null && typeof block === 'object' && (block as { type?: unknown }).type === 'text')
          .map(block => (block as { text?: unknown }).text).filter((text): text is string => typeof text === 'string')
        : []
    })
    .join('\n')
}

function requestedPaths(events: readonly EventLike[]): string[] {
  const matches = userTextFrom(events).match(/[A-Za-z]:\\[^\s"'，。；]+|(?:\\|\/)[^\s"'，。；]+(?:\.docx?|\.pdf|\.md)/giu) ?? []
  return matches.map(path => path.replaceAll('/', '\\').toLowerCase())
}

function supportsCurrentRequest(events: readonly EventLike[], evidence: DocumentReadEvidence[]): boolean {
  const requested = requestedPaths(events)
  if (requested.length === 0) return false
  return evidence.some(item => item.status === 'complete'
    && requested.includes(item.requestedPath.replaceAll('/', '\\').toLowerCase()))
}

/** Replace unsupported contract-review prose before it becomes a durable answer. */
export function gateContractReviewMessage(events: readonly EventLike[], message: AssistantMessage): AssistantMessage {
  const safeMessage = normalizeAssistantMessage(message)
  const content = safeMessage.content
  if (!requiresVerifiedRead(events) || content.some(block => block.type === 'tool-call')) return safeMessage
  const evidence = documentReadEvidence(events)
  if (supportsCurrentRequest(events, evidence)) return safeMessage
  if (textOf(safeMessage).trim().length === 0) return safeMessage
  const { kind: _kind, ...source } = safeMessage.source
  return createAssistantMessage({ content: [{ type: 'text', text: BLOCKED_MESSAGE }], source })
}

/** Register the final-message gate. Tool events remain the sole evidence source. */
export function apply(ctx: Context): void {
  ctx.on('agent/before-message', async ({ agent, message }, next) => {
    let candidate: AssistantMessage | undefined
    try {
      candidate = await next(message)
    } catch {
      return normalizeAssistantMessage(message)
    }
    // A compatibility hook must never turn a malformed provider response into a
    // session-ending exception. Normalize the message when a downstream handler
    // returns no assistant message.
    if (!candidate) return normalizeAssistantMessage(message)
    try {
      return gateContractReviewMessage(agent.session.events as unknown as EventLike[], candidate)
    } catch {
      return candidate
    }
  })
}
