/** Enforce contract-review file-read evidence from durable tool events. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import type { AssistantMessage } from '@deepseek-ai/dsh-llm'

export const name = 'document-read-integrity'

const BLOCKED_NO_EVIDENCE = '本轮尚未读取任何文件，因此不能确认文件内容，也不能开始正式合同审查。\n请重新发送文件、选择可访问的文件路径，或明确粘贴需要临时审查的正文。'
const BLOCKED_PARTIAL = (covered: number, total: number): string =>
  `文件读取不完整：已覆盖第 1–${covered} 行 / 共 ${total} 行。请补读剩余部分后再继续审查。`
const BLOCKED_FAILED = '文件读取失败。请确认路径可访问、文件存在且不为空，然后再试。'

export type DocumentReadStatus = 'complete' | 'partial' | 'empty' | 'failed' | 'unavailable'

export interface DocumentReadEvidence {
  requestedPath: string
  resolvedPath?: string
  status: DocumentReadStatus
  totalLines?: number
  returnedLines?: number
  coveredLines?: number
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
    /**
     * Final-message gate before the assistant message is persisted.
     * The waterfall contract is zero-arg `next`: cordis drops the inner's
     * arguments when it composes the chain, so listeners must call
     * `await next()` with no arguments to receive the assembled message
     * (carried by the `message` field of the payload closure).
     */
    'agent/before-message'(payload: {
      agent: Agent
      turn: number
      step: number
      message: AssistantMessage
    }, next: () => Promise<AssistantMessage>): Promise<AssistantMessage>
  }
}

function contentOf(message: AssistantMessage): AssistantMessage['content'] {
  return Array.isArray(message.content) ? message.content : []
}

function textOf(message: AssistantMessage): string {
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

interface ReadWindow {
  requestedPath: string
  resolvedPath?: string
  totalLines: number
  covered: Set<number>
  failed: boolean
  unavailable: boolean
}

function emptyWindow(requestedPath: string): ReadWindow {
  return { requestedPath, totalLines: 0, covered: new Set(), failed: false, unavailable: false }
}

function applyWindow(window: ReadWindow, meta: ReadMeta): void {
  if (window.totalLines === 0) window.totalLines = meta.totalLines
  if (window.resolvedPath === undefined && meta.path !== '') window.resolvedPath = meta.path
  for (const line of meta.lines) {
    if (line.number >= 1 && line.number <= meta.totalLines) window.covered.add(line.number)
  }
}

/**
 * Derive read evidence by merging every read result that targets the same
 * path. Long files split across multiple `read` calls are marked `complete`
 * only when the union of returned line numbers covers `[1..totalLines]`;
 * anything less is `partial` with `coveredLines` reported.
 */
export function documentReadEvidence(events: readonly EventLike[]): DocumentReadEvidence[] {
  const calls = new Map<number, ReadCall>()
  const windows = new Map<string, ReadWindow>()
  const order: string[] = []
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
    if (call === undefined) continue
    if (event.data.message !== null && typeof event.data.message === 'object'
      && (event.data.message as Record<string, unknown>).isError === true) {
      let window = windows.get(call.path)
      if (window === undefined) {
        window = emptyWindow(call.path)
        windows.set(call.path, window)
        order.push(call.path)
      }
      window.failed = true
      continue
    }
    const meta = readMeta(event.data.meta)
    if (meta === undefined) {
      let window = windows.get(call.path)
      if (window === undefined) {
        window = emptyWindow(call.path)
        windows.set(call.path, window)
        order.push(call.path)
      }
      window.unavailable = true
      continue
    }
    let window = windows.get(call.path)
    if (window === undefined) {
      window = emptyWindow(call.path)
      windows.set(call.path, window)
      order.push(call.path)
    }
    applyWindow(window, meta)
  }
  const evidence: DocumentReadEvidence[] = []
  for (const path of order) {
    const window = windows.get(path)
    if (window === undefined) continue
    if (window.failed) {
      evidence.push({ requestedPath: window.requestedPath, status: 'failed' })
      continue
    }
    if (window.unavailable) {
      evidence.push({
        requestedPath: window.requestedPath,
        ...(window.resolvedPath !== undefined ? { resolvedPath: window.resolvedPath } : {}),
        status: 'unavailable',
      })
      continue
    }
    if (window.totalLines === 0) {
      evidence.push({
        requestedPath: window.requestedPath,
        ...(window.resolvedPath !== undefined ? { resolvedPath: window.resolvedPath } : {}),
        status: 'empty',
        totalLines: 0,
        returnedLines: 0,
      })
      continue
    }
    const covered = window.covered.size
    let contiguous = 0
    while (window.covered.has(contiguous + 1)) contiguous++
    const status: DocumentReadStatus = contiguous >= window.totalLines ? 'complete' : 'partial'
    evidence.push({
      requestedPath: window.requestedPath,
      ...(window.resolvedPath !== undefined ? { resolvedPath: window.resolvedPath } : {}),
      status,
      totalLines: window.totalLines,
      returnedLines: covered,
      coveredLines: contiguous,
    })
  }
  return evidence
}

/** True for a file-backed contract review request, not ordinary legal Q&A. */
export function requiresVerifiedRead(events: readonly EventLike[]): boolean {
  const userText = userTextFrom(events)
  const mentionsContract = /合同|协议|contract/iu.test(userText)
  const mentionsReview = /审查|审核|review/iu.test(userText)
  if (mentionsContract && mentionsReview) return true
  const fileHint = /文件|附件|路径|这份|此份|本合同|\.docx?\b|\.pdf\b|\.md\b/iu.test(userText)
  return mentionsContract && fileHint
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

function normalizePath(path: string): string {
  return path.replaceAll('/', '\\').replace(/\\+/g, '\\').toLowerCase()
}

function requestedPaths(events: readonly EventLike[]): string[] {
  const userText = userTextFrom(events)
  const matches = userText.match(/[A-Za-z]:\\[^\s"'，。；]+|(?:\\|\/)[^\s"'，。；]+(?:\.docx?|\.pdf|\.md)/giu) ?? []
  const seen = new Set<string>()
  const result: string[] = []
  for (const path of matches) {
    const key = normalizePath(path)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(path)
    }
  }
  return result
}

function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))
  return idx >= 0 ? path.slice(idx + 1) : path
}

function supportsCurrentRequest(events: readonly EventLike[], evidence: DocumentReadEvidence[]): boolean {
  const requested = requestedPaths(events)
  if (requested.length > 0) {
    return evidence.some(item => {
      if (item.status !== 'complete') return false
      const candidates = [
        normalizePath(item.requestedPath),
        ...(item.resolvedPath !== undefined ? [normalizePath(item.resolvedPath)] : []),
      ]
      return requested.some(req => candidates.includes(normalizePath(req))
        || candidates.some(c => c.endsWith('\\' + basename(req).toLowerCase())))
    })
  }
  return evidence.some(item => item.status === 'complete')
}

/** Replace unsupported contract-review prose before it becomes a durable answer. */
export function gateContractReviewMessage(events: readonly EventLike[], message: AssistantMessage): AssistantMessage {
  const content = contentOf(message)
  if (!requiresVerifiedRead(events) || content.some(block => block.type === 'tool-call')) return message
  const evidence = documentReadEvidence(events)
  if (supportsCurrentRequest(events, evidence)) return message
  if (textOf(message).trim().length === 0) return message
  const blocked = blockedReason(evidence)
  const { kind: _kind, ...source } = message.source
  return createAssistantMessage({ content: [{ type: 'text', text: blocked }], source })
}

function blockedReason(evidence: DocumentReadEvidence[]): string {
  const failed = evidence.find(item => item.status === 'failed')
  if (failed !== undefined) return BLOCKED_FAILED
  const partial = evidence.find(item => item.status === 'partial' && item.totalLines !== undefined)
  if (partial !== undefined) {
    const covered = partial.coveredLines ?? 0
    return BLOCKED_PARTIAL(covered, partial.totalLines ?? 0)
  }
  return BLOCKED_NO_EVIDENCE
}

/** Register the final-message gate. Tool events remain the sole evidence source. */
export function apply(ctx: Context): void {
  ctx.on('agent/before-message', async ({ agent }, next) => {
    const candidate = await next()
    try {
      return gateContractReviewMessage(agent.session.events as unknown as EventLike[], candidate)
    } catch {
      return candidate
    }
  })
}
