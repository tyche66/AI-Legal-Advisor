# 文件读取真实性修复

## 目标

合同审查只能在目标文件存在真实 `read` 调用和对应的非错误完整结果后输出完整报告。

## 实现

- `document-read-integrity` 从持久化的 `tool/call` 和同一调用的 `tool/result` 生成读取证据。模型 Markdown、思考文本和回放消息不参与证据判断。
- `read` 的 `presentationMeta` 提供已解析路径、返回行和总行数。只有从第 1 行读取至总行数的非空结果为 `complete`；空文件、部分窗口、错误或缺少元数据不会放行。
- Agent Loop 在写入最终 `assistant/message` 前触发 `agent/before-message`。桌面门禁在文件型合同审查缺少当前目标路径的完整证据时替换回答为固定阻断说明。
- 可见 DSML 的 `read`、`read_file` 和 `file-read` 统一转换为上游真实 `read(file_path)` 调用，仍需等待真实工具结果。

## 覆盖

`document-read-integrity.spec.ts` 覆盖无调用、无结果、错误结果、空文件、部分读取、完整读取、无关文件读取和历史 Markdown 回放。`legacy-tool-call.spec.ts` 覆盖直接和 DSML 的别名映射。

## 限制

该门禁保护文件型合同审查的最终持久化消息。通用法律问答和用户明确粘贴的临时审查不以文件读取结果为前置条件。
