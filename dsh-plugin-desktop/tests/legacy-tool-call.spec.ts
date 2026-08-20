import { describe, expect, it } from 'vitest'
import { looksLikeLegacyReadFileText, parseLegacyReadFileCalls } from '../src/legacy-tool-call.ts'

describe('legacy read-file tool-call compatibility', () => {
  it('converts the direct read tag shown by affected models', () => {
    expect(parseLegacyReadFileCalls('<read path="C:\\Users\\Qiqi\\Desktop\\合同.md">'))
      .toEqual([{ name: 'read', arguments: JSON.stringify({ file_path: 'C:\\Users\\Qiqi\\Desktop\\合同.md' }) }])
  })

  it('converts a direct file-read tag to the real read tool', () => {
    expect(parseLegacyReadFileCalls('<file-read path="C:\\Users\\Qiqi\\Desktop\\合同.md">'))
      .toEqual([{ name: 'read', arguments: JSON.stringify({ file_path: 'C:\\Users\\Qiqi\\Desktop\\合同.md' }) }])
  })

  it('converts the DSML invoke envelope and maps file to path', () => {
    const output = '< | DSML | | tool_calls> < | DSML | | invoke name="read_file"> '
      + '< | DSML | | parameter name="file" string="true">C:\\Users\\Qiqi\\Desktop\\云端数据分析与运营服务合同.md'
      + '< / | DSML | | parameter> < | DSML | | invoke> < / | DSML | | tool_calls>'
    expect(parseLegacyReadFileCalls(output)).toEqual([{
      name: 'read',
      arguments: JSON.stringify({ file_path: 'C:\\Users\\Qiqi\\Desktop\\云端数据分析与运营服务合同.md' }),
    }])
  })

  it('converts the screenshot file-read DSML envelope to the real read tool', () => {
    const output = '< | DSML | | tool_calls> < | DSML | | invoke name="file-read"> '
      + '< | DSML | | parameter name="path" string="true">C:\\Users\\WDAGUtilityAccount\\Desktop\\云端数据分析与运营服务合同.md'
      + '< / | DSML | | parameter> < / | DSML | | invoke> < / | DSML | | tool_calls>'
    expect(looksLikeLegacyReadFileText(output.slice(0, 52))).toBe(true)
    expect(parseLegacyReadFileCalls(output)).toEqual([{
      name: 'read',
      arguments: JSON.stringify({ file_path: 'C:\\Users\\WDAGUtilityAccount\\Desktop\\云端数据分析与运营服务合同.md' }),
    }])
  })

  it('handles HTML entities without interpreting arbitrary tool names', () => {
    expect(parseLegacyReadFileCalls('<invoke name="read_file"><parameter name="path">a&amp;b&lt;c.md</parameter></invoke>'))
      .toEqual([{ name: 'read', arguments: JSON.stringify({ file_path: 'a&b<c.md' }) }])
    expect(parseLegacyReadFileCalls('<invoke name="bash"><parameter name="command">rm -rf /</parameter></invoke>'))
      .toEqual([])
  })

  it('keeps ordinary text outside the compatibility path', () => {
    expect(looksLikeLegacyReadFileText('<')).toBe(true)
    expect(looksLikeLegacyReadFileText('< | DSML')).toBe(true)
    expect(looksLikeLegacyReadFileText('合同审查结论：')).toBe(false)
    expect(parseLegacyReadFileCalls('合同审查结论：未发现伪工具调用。')).toEqual([])
  })
})
