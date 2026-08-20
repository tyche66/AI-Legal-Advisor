/**
 * Recover visible DSML/XML tool-call envelopes emitted by gateways that do
 * not populate the native tool-call field. The runtime patch contains the
 * same parser because this compatibility seam runs inside the upstream
 * pi-ai bundle rather than the desktop package.
 *
 * Two public helpers run against the same normalized text:
 *   - {@link parseLegacyToolCalls}: locate every envelope of any form
 *     (attribute, child-element, or JSON body), accept parameter
 *     synonyms (`file_path | path | file | filePath`), and emit one
 *     result per detected read envelope. Unknown tool names are ignored so
 *     the caller can keep their original text.
 *   - {@link splitLegacyToolText}: return the leftover prose between
 *     envelopes so a stream can emit `text-delta` blocks for narrative
 *     and `tool-call` blocks for the recovered envelopes.
 *
 * The parser is conservative: prose containing `<` characters that do
 * not match an envelope (e.g. `违约金 < 合同总额 5%`) is preserved verbatim.
 */

export type LegacyToolName =
  | 'read'
  | 'read_file'
  | 'file-read'
  | 'invoke'
  | 'tool_call'
  | 'tool-call'
  | string

export interface LegacyToolCall {
  /** The normalized tool name. */
  name: LegacyToolName
  arguments: string
}

export interface LegacyEnvelope {
  /** Inclusive start index in the normalized input. */
  start: number
  /** Exclusive end index in the normalized input. */
  end: number
  /** The recovered tool call parsed from this envelope. */
  call: LegacyToolCall
}

const PATH_KEYS = ['file_path', 'path', 'file', 'filePath', 'filepath'] as const

function decodeLegacyToolText(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .trim()
}

/** Normalize DSML and full-width pipe markers so downstream patterns see canonical XML. */
export function normalizeLegacyToolText(text: string): string {
  return text
    .replace(/｜/g, '|')
    .replace(/<\s*(\/?)\s*\|\s*DSML\s*\|\s*(?:\|\s*)?/gi, '<$1')
}

/**
 * Find every envelope in `text` (attribute, child-element, or JSON body)
 * with its inclusive [start, end) span in the **normalized** input. The
 * returned envelopes are in source order and never overlap. A consumer
 * that wants only the calls can map `.call`.
 */
export function findLegacyEnvelopes(text: string): LegacyEnvelope[] {
  const normalized = normalizeLegacyToolText(text)
  const envelopes: LegacyEnvelope[] = []
  const occupied = new Set<number>()
  const claim = (start: number, end: number): void => {
    for (let i = start; i < end; i++) occupied.add(i)
  }
  const overlaps = (start: number, end: number): boolean => {
    for (let i = start; i < end; i++) {
      if (occupied.has(i)) return true
    }
    return false
  }

  // Parse complete read envelopes first. This avoids treating a nested
  // parameter/path element as the outer envelope while scanning tags.
  for (const match of normalized.matchAll(/<\s*(read|read_file|file-read)\b([^>]*)>([\s\S]*?)<\s*\/\s*\1\s*>/gi)) {
    const start = match.index ?? 0
    const end = start + match[0].length
    const attrs = match[2] ?? ''
    const body = (match[3] ?? '').trim()
    const attrPath = readAttribute(attrs, 'file_path') ?? readAttribute(attrs, 'path')
      ?? readAttribute(attrs, 'file') ?? readAttribute(attrs, 'filePath')
    let path = attrPath
    if (path === undefined) path = pickPath(parsedJsonBody(body)) ?? extractChildPath(body)
    if (path !== undefined && !overlaps(start, end)) {
      claim(start, end)
      envelopes.push({ start, end, call: readCall(path) })
    }
  }

  for (const match of normalized.matchAll(/<\s*([a-z][\w-]*)\b([^>]*?)\/?\s*>/gi)) {
    const tag = (match[1] ?? '').toLowerCase()
    const attrs = match[2] ?? ''
    const tagStart = match.index ?? 0
    const tagEnd = tagStart + match[0].length
    if (overlaps(tagStart, tagEnd)) continue
    const isSelfClosing = match[0].trimEnd().endsWith('/>')
    if (/\b(?:file_path|path|file|filePath)\s*=/i.test(attrs)) {
      const path = readAttribute(attrs, 'path') ?? readAttribute(attrs, 'file_path')
        ?? readAttribute(attrs, 'file') ?? readAttribute(attrs, 'filePath')
      if (path !== undefined && path.length > 0) {
        if (isSelfClosing) {
          claim(tagStart, tagEnd)
          envelopes.push({ start: tagStart, end: tagEnd, call: readCall(path) })
        } else {
          const closer = new RegExp(`<\\s*/\\s*${escapeRegex(tag)}\\s*>`, 'i')
          const tail = normalized.slice(tagEnd)
          const closerMatch = tail.match(closer)
          if (closerMatch?.index !== undefined) {
            const envelopeEnd = tagEnd + closerMatch.index + closerMatch[0].length
            claim(tagStart, envelopeEnd)
            envelopes.push({ start: tagStart, end: envelopeEnd, call: readCall(path) })
          } else if (['read', 'read_file', 'file-read'].includes(tag)) {
            claim(tagStart, tagEnd)
            envelopes.push({ start: tagStart, end: tagEnd, call: readCall(path) })
          }
        }
      }
      continue
    }
    if (isSelfClosing) continue
    if (!['invoke', 'tool_call', 'tool-call', 'read', 'read_file', 'file-read'].includes(tag)) continue
    const closer = new RegExp(`(?:<\\s*/\\s*${escapeRegex(tag)}\\s*>|<\\s*${escapeRegex(tag)}\\s*>)`, 'i')
    const tail = normalized.slice(tagEnd)
    const closerMatch = tail.match(closer)
    if (closerMatch === null || closerMatch.index === undefined) continue
    const inner = tail.slice(0, closerMatch.index)
    const envelopeEnd = tagEnd + closerMatch.index + closerMatch[0].length
    if (overlaps(tagStart, envelopeEnd)) continue
    claim(tagStart, envelopeEnd)
    if (tag === 'invoke' || tag === 'tool_call' || tag === 'tool-call') {
      const args = parseInvokeBody(inner)
      const path = pickPath(args) ?? pickPath(parsedJsonBody(inner))
      if (path !== undefined) {
        envelopes.push({ start: tagStart, end: envelopeEnd, call: readCall(path) })
      }
      continue
    }
    const body = inner.trim()
    if (body.startsWith('{') && body.endsWith('}')) {
      const parsed = parsedJsonBody(inner)
      const path = pickPath(parsed)
      if (path !== undefined) {
        envelopes.push({ start: tagStart, end: envelopeEnd, call: readCall(path) })
        continue
      }
    }
    const childPath = extractChildPath(inner)
    if (childPath !== undefined) {
      envelopes.push({ start: tagStart, end: envelopeEnd, call: readCall(childPath) })
    }
  }

  envelopes.sort((a, b) => a.start - b.start)
  return envelopes
}

/**
 * Parse `text` into an ordered list of recovered tool calls. Same logic
 * as {@link findLegacyEnvelopes} but discards the span information.
 */
export function parseLegacyReadFileCalls(text: string): LegacyToolCall[] {
  return findLegacyEnvelopes(text).map(envelope => envelope.call)
}

/** Backward-compatible parser name used by the runtime patch tests. */
export const parseLegacyToolCalls = parseLegacyReadFileCalls

/**
 * Strip every recovered envelope from `text` and return the leftover
 * prose plus the calls, preserving source order. Prose containing `<`
 * characters that did not match an envelope is returned verbatim.
 */
export function splitLegacyToolText(text: string): { prose: string; calls: LegacyToolCall[] } {
  const envelopes = findLegacyEnvelopes(text)
  if (envelopes.length === 0) return { prose: text, calls: [] }
  const normalized = normalizeLegacyToolText(text)
  const parts: string[] = []
  let cursor = 0
  const calls: LegacyToolCall[] = []
  for (const envelope of envelopes) {
    parts.push(normalized.slice(cursor, envelope.start))
    cursor = envelope.end
    calls.push(envelope.call)
  }
  parts.push(normalized.slice(cursor))
  return { prose: parts.join(''), calls }
}

function readAttribute(attrs: string, key: string): string | undefined {
  const re = new RegExp(`\\b${escapeRegex(key)}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i')
  const m = attrs.match(re)
  if (m === null) return undefined
  return decodeLegacyToolText(m[1] ?? m[2] ?? '')
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readCall(path: string): LegacyToolCall {
  return { name: 'read', arguments: JSON.stringify({ file_path: path }) }
}

function parseInvokeBody(inner: string): Record<string, string> {
  const args: Record<string, string> = {}
  for (const m of inner.matchAll(/<\s*parameter\b([^>]*)>([\s\S]*?)(?:<\s*\/\s*parameter\s*>|<\s*parameter\s*>)/gi)) {
    const attrs = m[1] ?? ''
    const key = readAttribute(attrs, 'name')
    if (key === undefined || key.length === 0) continue
    const value = decodeLegacyToolText(m[2] ?? '')
    args[key] = value
  }
  return args
}

function extractChildPath(inner: string): string | undefined {
  for (const key of PATH_KEYS) {
    const re = new RegExp(`<\\s*${escapeRegex(key)}\\s*>([\\s\\S]*?)<\\s*/\\s*${escapeRegex(key)}\\s*>`, 'i')
    const m = inner.match(re)
    if (m !== null) {
      const value = decodeLegacyToolText(m[1] ?? '')
      if (value.length > 0) return value
    }
  }
  return undefined
}

function parsedJsonBody(inner: string): Record<string, unknown> {
  const trimmed = inner.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return {}
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>
    return parsed
  } catch {
    return {}
  }
}

function pickPath(record: Record<string, unknown>): string | undefined {
  for (const key of PATH_KEYS) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return undefined
}

/** True while a streamed text block still looks like a tool envelope. */
export function looksLikeLegacyToolText(text: string): boolean {
  if (!/^\s*</.test(text)) return false
  if (text.trim().length < 32) return true
  return /<\s*(?:read|read_file|file-read|invoke|tool_call|tool-call)\b|<\s*[|｜]\s*DSML\b/i.test(text)
}

/** Backward-compatible name retained for the desktop parser tests. */
export const looksLikeLegacyReadFileText = looksLikeLegacyToolText
