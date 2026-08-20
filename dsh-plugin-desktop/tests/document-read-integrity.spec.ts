import { describe, expect, it } from 'vitest'
import { createAssistantMessage } from '@deepseek-ai/dsh-llm'
import { documentReadEvidence, gateContractReviewMessage } from '../src/document-read-integrity.ts'

const request = {
  type: 'user/message', seq: 1, data: {
    content: [{ type: 'text', text: '请审查该合同文件 C:\\contracts\\agreement.md' }],
  },
} as const

const claimedRead = createAssistantMessage({
  content: [{ type: 'text', text: '文件已读取。现在开始建立事实账本并完成合同审查。' }],
  source: { provider: 'test', model: 'test' },
})

function readCall(seq = 2) {
  return { type: 'tool/call', seq, data: { name: 'read', arguments: JSON.stringify({ file_path: 'C:\\contracts\\agreement.md' }) } }
}

function readResult(sourceEventSeqs: number[], meta: unknown, isError = false) {
  return { type: 'tool/result', seq: 3, sourceEventSeqs, data: { message: { isError }, meta } }
}

describe('document read integrity', () => {
  it('blocks a model-only claim because Markdown is not read evidence', () => {
    expect(gateContractReviewMessage([request], claimedRead).content).toEqual([{
      type: 'text', text: expect.stringContaining('尚未获得该文件的真实读取结果'),
    }])
  })

  it('does not complete a read call without its paired result', () => {
    expect(documentReadEvidence([request, readCall()])).toEqual([])
    expect(gateContractReviewMessage([request, readCall()], claimedRead).content[0]).toMatchObject({
      type: 'text', text: expect.stringContaining('尚未获得该文件的真实读取结果'),
    })
  })

  it('records an error result as failed and blocks the report', () => {
    const events = [request, readCall(), readResult([2], undefined, true)]
    expect(documentReadEvidence(events)).toEqual([{
      requestedPath: 'C:\\contracts\\agreement.md', status: 'failed',
    }])
    expect(gateContractReviewMessage(events, claimedRead).content[0]).toMatchObject({
      type: 'text', text: expect.stringContaining('尚未获得该文件的真实读取结果'),
    })
  })

  it('classifies empty and partial windows without allowing a full-read claim', () => {
    const empty = [request, readCall(), readResult([2], { path: 'agreement.md', offset: 1, lines: [], totalLines: 0 })]
    expect(documentReadEvidence(empty)[0]?.status).toBe('empty')
    const partial = [request, readCall(), readResult([2], {
      path: 'agreement.md', offset: 1, lines: [{ number: 1, text: '第一条' }], totalLines: 2,
    })]
    expect(documentReadEvidence(partial)[0]?.status).toBe('partial')
    expect(gateContractReviewMessage(partial, claimedRead).content[0]).toMatchObject({
      type: 'text', text: expect.stringContaining('尚未获得该文件的真实读取结果'),
    })
  })

  it('allows a report only after a complete result paired with the real read call', () => {
    const events = [request, readCall(), readResult([2], {
      path: 'agreement.md', offset: 1, lines: [{ number: 1, text: '第一条' }], totalLines: 1,
    })]
    expect(documentReadEvidence(events)[0]).toMatchObject({
      requestedPath: 'C:\\contracts\\agreement.md', resolvedPath: 'agreement.md', status: 'complete',
    })
    expect(gateContractReviewMessage(events, claimedRead)).toBe(claimedRead)
  })

  it('fails open when an assistant message has no content array', () => {
    const malformed = { ...claimedRead, content: undefined } as unknown as typeof claimedRead
    expect(() => gateContractReviewMessage([request], malformed)).not.toThrow()
    expect(gateContractReviewMessage([request], malformed)).toMatchObject({ content: [] })
    expect(gateContractReviewMessage([request], malformed)).not.toBe(malformed)
  })

  it('does not use an unrelated successful read as evidence for the requested contract', () => {
    const events = [request, {
      ...readCall(), data: { name: 'read', arguments: JSON.stringify({ file_path: 'C:\\contracts\\other.md' }) },
    }, readResult([2], {
      path: 'other.md', offset: 1, lines: [{ number: 1, text: '第一条' }], totalLines: 1,
    })]
    expect(gateContractReviewMessage(events, claimedRead).content[0]).toMatchObject({
      type: 'text', text: expect.stringContaining('尚未获得该文件的真实读取结果'),
    })
  })

  it('does not derive evidence from replayed assistant Markdown', () => {
    const replay = [{ type: 'assistant/message', seq: 2, data: { message: claimedRead } }]
    expect(documentReadEvidence([request, ...replay])).toEqual([])
    expect(gateContractReviewMessage([request, ...replay], claimedRead).content[0]).toMatchObject({
      type: 'text', text: expect.stringContaining('尚未获得该文件的真实读取结果'),
    })
  })
})
