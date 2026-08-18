# Contributing to DSH Money View

感谢你参与 DSH Money View。这个项目是面向 DeepSeek Harness 的社区插件，欢迎提交兼容性反馈、安装问题、UI 改进和 Host/client 插件设计建议。

## 提交 Issue

提交问题前，请先确认你使用的 Harness commit 或版本、Node.js 与 pnpm 版本、操作系统、插件配置方式，以及问题是否可以稳定复现。请不要在 Issue、截图或日志中公开 API Key。

余额查询相关问题请附上脱敏后的状态信息，例如插件当前显示的 `status`、`fetchedAt`、`nextQueryAt`、货币类型和错误消息。不要上传包含 Authorization header 的完整网络请求。

## 提交 Pull Request

请保持 Host 与 Client 边界清晰。API Key、凭据解析和外部请求只能留在 Host 侧；浏览器端只接收余额快照和可展示状态。修改查询策略时，请同时更新 README、配置说明和 smoke test。

建议在本地 Harness workspace 中运行：

```bash
pnpm --filter @deepseek-ai/dsh-deepseek-balance bundle
node scripts/test-deepseek-balance-smoke.mjs
```

提交前请执行 `git diff --check`，并在 PR 描述中说明变更目的、测试结果和是否影响默认 Web bundle。

## 设计约束

本插件的默认行为是：近 30 分钟内没有 DeepSeek 调用时不访问余额接口；实际刷新优先尊重响应的 `Cache-Control: max-age`；没有服务端新鲜度提示时才使用 5 分钟回退；每天第一次成功查询建立余额基准。请不要为了增加“实时感”而恢复固定每分钟请求。

## 行为准则

请保持专业、尊重和可复现。对于不同 Harness 版本产生的兼容性差异，请优先提供最小复现和版本信息，而不是只报告“不能用”。
