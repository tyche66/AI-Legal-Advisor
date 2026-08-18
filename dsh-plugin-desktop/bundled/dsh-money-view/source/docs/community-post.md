# Community post draft

## DSH Money View — DeepSeek Harness API balance in the sidebar

我发布了一个 DeepSeek Harness 社区插件：**DSH Money View**。

它把 DeepSeek API 余额放到 Harness 左侧栏底部，直接显示当前 CNY/USD 余额、每日首次查询基准、剩余比例和最近查询时间。插件不是简单地每分钟轮询：只有最近 30 分钟内发生过 DeepSeek 调用时才会访问余额接口，并优先遵循响应中的 `Cache-Control: max-age`；服务端未提供新鲜度时，默认回退 5 分钟。

主要特点：

- 使用 `sidebar.footer.action`，不打扰主工作流；
- 每个自然日首次成功查询建立进度基准；
- CNY/USD 分开显示，不做未经授权的汇率混算；
- API Key 由 Host 侧 credentials service 解析，不进入浏览器端；
- 提供代码渲染 UI 预览、安装指南、Bug Report、Feature Request 和 smoke test。

项目地址：

https://github.com/tyche66/DSH-money-view

首个社区预览版本：

https://github.com/tyche66/DSH-money-view/releases/tag/v0.1.0

当前版本面向从源码构建的 Harness workspace。欢迎测试安装流程、反馈不同 Harness commit 的兼容性，或者一起完善 Community Plugins 的安装方式。

如果你试用了这个插件，欢迎回复三个信息：Harness commit、安装方式、余额卡片是否在一次 DeepSeek 调用后正确更新。请不要公开 API Key 或 Authorization header。
