export interface LegacyToolCall {
  name: 'read'
  arguments: string
}

function decodeLegacyToolText(value: string): string {
  return value
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .trim()
}

/**
 * Recover only the read-file form of visible DSML/XML tool calls.
 * The runtime patch contains the same narrow parser because this compatibility
 * seam runs inside the upstream pi-ai bundle rather than the desktop package.
 */
export function parseLegacyReadFileCalls(text: string): LegacyToolCall[] {
  const normalized = text.replace(/<\s*(\/?)\s*\|\s*DSML\s*\|\s*\|\s*/gi, '<$1')
  const calls: LegacyToolCall[] = []
  const directRead = /<\s*(?:read|read_file|file-read)\b[^>]*\bpath\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*\/?\s*>/gi
  for (const match of normalized.matchAll(directRead)) {
    const path = decodeLegacyToolText(match[1] ?? match[2] ?? '')
    if (path.length > 0) calls.push({ name: 'read', arguments: JSON.stringify({ file_path: path }) })
  }

  const invoke = /<\s*invoke\b[^>]*\bname\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)(?:<\/\s*invoke\s*>|<\s*invoke\s*>)/gi
  for (const match of normalized.matchAll(invoke)) {
    const name = decodeLegacyToolText(match[1] ?? match[2] ?? '')
    if (!/^(?:read|read_file|file-read)$/i.test(name)) continue
    const args: Record<string, string> = {}
    const parameter = /<\s*parameter\b[^>]*\bname\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)(?:<\/\s*parameter\s*>|<\s*parameter\s*>)/gi
    for (const item of (match[3] ?? '').matchAll(parameter)) {
      const key = decodeLegacyToolText(item[1] ?? item[2] ?? '')
      if (key.length > 0) args[key] = decodeLegacyToolText(item[3] ?? '')
    }
    if (args.file_path === undefined && typeof args.path === 'string') args.file_path = args.path
    if (args.file_path === undefined && typeof args.file === 'string') args.file_path = args.file
    if (typeof args.file_path === 'string') calls.push({ name: 'read', arguments: JSON.stringify({ file_path: args.file_path }) })
  }
  return calls
}

/** Return true while a streamed text block still looks like a read envelope. */
export function looksLikeLegacyReadFileText(text: string): boolean {
  return /^\s*</.test(text) && (text.trim().length < 32 || /<\s*(?:read|read_file|file-read)\b|<\s*\|\s*DSML\b/i.test(text))
}
