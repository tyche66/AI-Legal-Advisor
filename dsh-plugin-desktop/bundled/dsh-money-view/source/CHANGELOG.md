# Changelog

## [0.1.0] — 2026-08-18

### Added

- 在 DeepSeek Harness 左侧栏底部显示 CNY/USD API 余额。
- 使用当天第一次成功查询的 `total_balance` 作为余额进度基准。
- 只在最近 30 分钟存在 DeepSeek 调用时访问余额接口。
- 优先遵循余额响应中的 `Cache-Control: max-age`，缺少服务端新鲜度时默认回退 5 分钟。
- Host/client 双面 Cordis 插件结构，API Key 只在 Host 侧解析。
- 代码渲染的 UI 预览、安装指南、Bug Report 和 Feature Request 模板。
- Host smoke test，覆盖查询新鲜度、活动窗口、进度比例和跨日基准重置。

### Known limitations

- 当前版本面向从源码构建的 DeepSeek Harness workspace，不是独立浏览器扩展。
- 插件包依赖 Harness workspace 内部包；不同 Harness commit 可能需要调整 project references 或 Cordis composition。
- 官方余额接口文档公开了响应字段，但没有承诺固定的余额刷新周期，因此默认 5 分钟只是服务端未提供缓存提示时的保守回退。
