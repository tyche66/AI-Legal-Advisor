import { describe, expect, it } from 'vitest'
import { looksLikeLegacyReadFileText, parseLegacyReadFileCalls, splitLegacyToolText } from '../src/legacy-tool-call.ts'

describe('legacy read-file tool-call compatibility', () => {
  it('converts the direct read tag shown by affected models', () => {
    expect(parseLegacyReadFileCalls('<read path="C:\\Users\\Qiqi\\Desktop\\合同.md">'))
      .toEqual([{ name: 'read', arguments: JSON.stringify({ file_path: 'C:\\Users\\Qiqi\\Desktop\\合同.md' }) }])
  })

  it('converts a direct file-read tag to the real read tool', () => {
    expect(parseLegacyReadFileCalls('<file-read path="C:\\Users\\Qiqi\\Desktop\\合同.md">'))
      .toEqual([{ name: 'read', arguments: JSON.stringify({ file_path: 'C:\\Users\\Qiqi\\Desktop\\合同.md' }) }])
  })

  it('converts the child-element read_file form', () => {
    expect(parseLegacyReadFileCalls('<read_file>\n<path>C:\\Users\\Qiqi\\Desktop\\云端数据分析与运营服务合同.md</path>\n</read_file>'))
      .toEqual([{ name: 'read', arguments: JSON.stringify({ file_path: 'C:\\Users\\Qiqi\\Desktop\\云端数据分析与运营服务合同.md' }) }])
  })

  it('converts the JSON-body read_file form', () => {
    const body = JSON.stringify({ file_path: 'C:\\Users\\Qiqi\\Desktop\\云端数据分析与运营服务合同.md' })
    expect(parseLegacyReadFileCalls(`<read_file>${body}</read_file>`))
      .toEqual([{ name: 'read', arguments: JSON.stringify({ file_path: 'C:\\Users\\Qiqi\\Desktop\\云端数据分析与运营服务合同.md' }) }])
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

  it('converts a full-width DSML envelope emitted by the affected gateway', () => {
    const output = '<｜DSML｜tool_calls> <｜DSML｜invoke name="read"> '
      + '<｜DSML｜parameter name="file_path" string="true">C:\\Users\\WDAGUtilityAccount\\Desktop\\云端数据分析与运营服务合同.md'
      + '<｜DSML｜parameter> <｜DSML｜invoke> <｜DSML｜tool_calls>'
    expect(looksLikeLegacyReadFileText(output.slice(0, 28))).toBe(true)
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
    expect(parseLegacyReadFileCalls('违约金 < 合同总额 5%')).toEqual([])
    expect(parseLegacyReadFileCalls('<foo_bar><x>1</x></foo_bar>')).toEqual([])
  })

  it('preserves prose around a recovered envelope', () => {
    const text = '好的，我先读取合同文件。\n\n<read_file><path>C:\\合同.md</path></read_file>'
    expect(splitLegacyToolText(text)).toEqual({
      prose: '好的，我先读取合同文件。\n\n',
      calls: [{ name: 'read', arguments: JSON.stringify({ file_path: 'C:\\合同.md' }) }],
    })
  })
})
