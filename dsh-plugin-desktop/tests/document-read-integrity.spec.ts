import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import type { AssistantMessage } from '@deepseek-ai/dsh-llm'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  apply,
  documentReadEvidence,
  gateContractReviewMessage,
  requiresVerifiedRead,
} from '../src/document-read-integrity.ts'

const contractPath = 'C:\\contracts\\agreement.md'

function makeMessage(text: string, blocks: AssistantMessage['content'] = [{ type: 'text', text }]): AssistantMessage {
  return createAssistantMessage({ content: blocks, source: { provider: 'test', model: 'test' } })
}

function readCall(seq: number, path = contractPath) {
  return { type: 'tool/call', seq, data: { name: 'read', arguments: JSON.stringify({ file_path: path }) } }
}

function readResult(
  sourceEventSeqs: number[],
  meta: { path: string; offset: number; lines: Array<{ number: number, text: string }>; totalLines: number } | undefined,
  isError = false,
) {
  return {
    type: 'tool/result',
    seq: 3,
    sourceEventSeqs,
    data: { message: { isError }, ...(meta !== undefined ? { meta } : {}) },
  }
}

function requestEvent(text = '请审查这份合同文件 C:\\contracts\\agreement.md') {
  return {
    type: 'user/message',
    seq: 1,
    data: {
      content: [{ type: 'text', text }],
    },
  }
}

describe('document read integrity', () => {
  describe('documentReadEvidence', () => {
    it('returns empty evidence when no tool events are present', () => {
      expect(documentReadEvidence([requestEvent()])).toEqual([])
    })

    it('records a single complete read as complete', () => {
      const events = [
        requestEvent(),
        readCall(2),
        readResult([2], {
          path: 'agreement.md', offset: 1,
          lines: [{ number: 1, text: '第一条' }],
          totalLines: 1,
        }),
      ]
      expect(documentReadEvidence(events)).toEqual([{
        requestedPath: contractPath,
        resolvedPath: 'agreement.md',
        status: 'complete',
        totalLines: 1,
        returnedLines: 1,
        coveredLines: 1,
      }])
    })

    it('marks a single partial read as partial', () => {
      const events = [
        requestEvent(),
        readCall(2),
        readResult([2], {
          path: 'agreement.md', offset: 1,
          lines: [{ number: 1, text: '第一条' }],
          totalLines: 100,
        }),
      ]
      expect(documentReadEvidence(events)[0]).toMatchObject({
        status: 'partial', totalLines: 100, returnedLines: 1, coveredLines: 1,
      })
    })

    it('merges multiple read results on the same path into one window', () => {
      const events = [
        requestEvent(),
        readCall(2),
        readResult([2], {
          path: 'agreement.md', offset: 1,
          lines: Array.from({ length: 500 }, (_, i) => ({ number: i + 1, text: 'x' })),
          totalLines: 1200,
        }),
        readCall(3, contractPath),
        readResult([3], {
          path: 'agreement.md', offset: 501,
          lines: Array.from({ length: 500 }, (_, i) => ({ number: 501 + i, text: 'x' })),
          totalLines: 1200,
        }),
        readCall(4, contractPath),
        readResult([4], {
          path: 'agreement.md', offset: 1001,
          lines: Array.from({ length: 200 }, (_, i) => ({ number: 1001 + i, text: 'x' })),
          totalLines: 1200,
        }),
      ]
      const evidence = documentReadEvidence(events)
      expect(evidence).toHaveLength(1)
      expect(evidence[0]).toMatchObject({
        status: 'complete', totalLines: 1200, returnedLines: 1200, coveredLines: 1200,
      })
    })

    it('keeps partial coverage when the union does not reach the total', () => {
      const events = [
        requestEvent(),
        readCall(2),
        readResult([2], {
          path: 'agreement.md', offset: 1,
          lines: Array.from({ length: 500 }, (_, i) => ({ number: i + 1, text: 'x' })),
          totalLines: 1200,
        }),
        readCall(3, contractPath),
        readResult([3], {
          path: 'agreement.md', offset: 501,
          lines: Array.from({ length: 400 }, (_, i) => ({ number: 501 + i, text: 'x' })),
          totalLines: 1200,
        }),
      ]
      expect(documentReadEvidence(events)[0]).toMatchObject({
        status: 'partial', totalLines: 1200, returnedLines: 900, coveredLines: 900,
      })
    })

    it('records a failed read as failed even when paired results also exist', () => {
      const events = [
        requestEvent(),
        readCall(2),
        readResult([2], undefined, true),
      ]
      expect(documentReadEvidence(events)).toEqual([{
        requestedPath: contractPath, status: 'failed',
      }])
    })

    it('treats assistant-message replay as no evidence', () => {
      const replay = [{
        type: 'assistant/message',
        seq: 2,
        data: { message: makeMessage('文件已读取，开始审查。') },
      }]
      expect(documentReadEvidence([requestEvent(), ...replay])).toEqual([])
    })
  })

  describe('requiresVerifiedRead', () => {
    it('matches a contract-review-with-path request', () => {
      expect(requiresVerifiedRead([requestEvent()])).toBe(true)
    })

    it('matches a contract-review request that only names the file type', () => {
      expect(requiresVerifiedRead([requestEvent('帮我审查这份合同附件 .md')])).toBe(true)
    })

    it('does not match an ordinary legal Q&A without a file hint', () => {
      expect(requiresVerifiedRead([requestEvent('合同法的一般原则是什么？')])).toBe(false)
    })

    it('does not match a generic PDF review without a contract mention', () => {
      expect(requiresVerifiedRead([requestEvent('帮我看看这份 .pdf')])).toBe(false)
    })
  })

  describe('gateContractReviewMessage', () => {
    it('blocks a model-only claim because Markdown is not read evidence', () => {
      expect(gateContractReviewMessage([requestEvent()], makeMessage('文件已读取，开始审查。')).content).toEqual([{
        type: 'text', text: expect.stringContaining('尚未读取'),
      }])
    })

    it('reports the actual covered range when reads are partial', () => {
      const events = [
        requestEvent(),
        readCall(2),
        readResult([2], {
          path: 'agreement.md', offset: 1,
          lines: Array.from({ length: 500 }, (_, i) => ({ number: i + 1, text: 'x' })),
          totalLines: 1200,
        }),
      ]
      const blocked = gateContractReviewMessage(events, makeMessage('审查报告'))
      expect(blocked.content[0]).toMatchObject({
        type: 'text', text: expect.stringContaining('500'),
      })
    })

    it('allows a report only after a complete result paired with the real read call', () => {
      const events = [
        requestEvent(),
        readCall(2),
        readResult([2], {
          path: 'agreement.md', offset: 1,
          lines: [{ number: 1, text: '第一条' }],
          totalLines: 1,
        }),
      ]
      const message = makeMessage('审查结论')
      expect(gateContractReviewMessage(events, message)).toBe(message)
    })

    it('always preserves tool-call blocks (the gate must not swallow them)', () => {
      const toolCallBlock = {
        type: 'tool-call',
        id: 'call-1' as never,
        name: 'read',
        arguments: JSON.stringify({ file_path: contractPath }),
      } as unknown as AssistantMessage['content'][number]
      const message = makeMessage('ignore', [toolCallBlock])
      expect(gateContractReviewMessage([requestEvent()], message)).toBe(message)
    })

    it('returns the original message unchanged when there is no text content', () => {
      const message = createAssistantMessage({
        content: [],
        source: { provider: 'test', model: 'test' },
      })
      expect(gateContractReviewMessage([requestEvent()], message)).toBe(message)
    })

    it('does not use an unrelated successful read as evidence for the requested contract', () => {
      const events = [
        requestEvent(),
        { ...readCall(2), data: { name: 'read', arguments: JSON.stringify({ file_path: 'C:\\contracts\\other.md' }) } },
        readResult([2], {
          path: 'other.md', offset: 1,
          lines: [{ number: 1, text: '第一条' }],
          totalLines: 1,
        }),
      ]
      const blocked = gateContractReviewMessage(events, makeMessage('审查报告'))
      expect(blocked.content[0]).toMatchObject({
        type: 'text', text: expect.stringContaining('尚未读取'),
      })
    })
  })

  describe('apply() waterfall contract', () => {
    type BeforeMessageListener = (
      payload: { agent: Agent; turn: number; step: number; message: AssistantMessage },
      next: () => Promise<AssistantMessage>,
    ) => Promise<AssistantMessage>

    async function mountWithListener(listener: BeforeMessageListener): Promise<Context> {
      const ctx = new Context()
      await ctx.plugin({ name: 'document-read-integrity', apply: (inner) => {
        const on = inner.on as unknown as (name: 'agent/before-message', listener: BeforeMessageListener) => () => boolean
        on('agent/before-message', listener)
      } })
      return ctx
    }

    function fakeAgent(events: ReadonlyArray<{ type: string; seq: number; data: Record<string, unknown> }> = []) {
      return {
        session: { events },
      } as unknown as Agent
    }

    it('passes the assembled message through the listener contract (zero-arg next)', async () => {
      const inner = vi.fn<(message: AssistantMessage) => void>()
      const ctx = await mountWithListener(async ({ agent: _agent, message }, next) => {
        const candidate = await next()
        expect(candidate).toBe(message)
        inner(candidate)
        return candidate
      })
      const assembled = makeMessage('hello')
      const result = await ctx.waterfall(
        'agent/before-message',
        { agent: fakeAgent(), turn: 1, step: 1, message: assembled },
        () => Promise.resolve(assembled),
      ) as AssistantMessage
      expect(result).toBe(assembled)
      expect(inner).toHaveBeenCalledWith(assembled)
    })

    it('keeps tool-call blocks even when prose would otherwise be blocked', async () => {
      const toolCallBlock = {
        type: 'tool-call',
        id: 'call-1' as never,
        name: 'read',
        arguments: JSON.stringify({ file_path: contractPath }),
      } as unknown as AssistantMessage['content'][number]
      const assembled = makeMessage('ignore', [toolCallBlock])
      const ctx = new Context()
      await ctx.plugin({ name: 'document-read-integrity', apply })
      const result = await ctx.waterfall(
        'agent/before-message',
        { agent: fakeAgent(), turn: 1, step: 1, message: assembled },
        () => Promise.resolve(assembled),
      ) as AssistantMessage
      expect(result.content).toEqual([toolCallBlock])
    })

    it('blocks unsupported prose via apply() when no read evidence exists', async () => {
      const ctx = new Context()
      await ctx.plugin({ name: 'document-read-integrity', apply })
      const events = [requestEvent()]
      const assembled = makeMessage('文件已读取，开始审查。')
      const result = await ctx.waterfall(
        'agent/before-message',
        { agent: fakeAgent(events), turn: 1, step: 1, message: assembled },
        () => Promise.resolve(assembled),
      ) as AssistantMessage
      expect(result.content[0]).toMatchObject({
        type: 'text', text: expect.stringContaining('尚未读取'),
      })
    })

    it('the listener never receives `next(message)` because cordis drops the argument', async () => {
      const observe = vi.fn()
      const ctx = new Context()
      await ctx.plugin({ name: 'document-read-integrity', apply: (inner) => {
        inner.on('agent/before-message', async ({ message }, next) => {
          observe(await next())
          return message
        })
      } })
      const assembled = makeMessage('hello')
      await ctx.waterfall(
        'agent/before-message',
        { agent: fakeAgent(), turn: 1, step: 1, message: assembled },
        () => Promise.resolve(assembled),
      )
      expect(observe).toHaveBeenCalledExactlyOnceWith(assembled)
    })
  })
})
