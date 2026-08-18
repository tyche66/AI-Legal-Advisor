# DeepSeek API 余额插件设计

## 总体方案

插件采用 Harness 推荐的双面插件结构：Node 侧负责读取 `DEEPSEEK_API_KEY`、观察真实的 `agent/request` 路由并调用 DeepSeek 官方接口；浏览器侧只接收脱敏后的余额快照，通过 `sidebar.footer.action` 贡献左侧栏底部卡片。这样 API key 不会进入浏览器 bundle，也不会出现在 session log、配置同步或 UI 状态中。

| 层 | 职责 | 关键接口 |
|---|---|---|
| Host | 解析凭据、记录最近一次 DeepSeek 请求、每分钟按需查询、保存当日基准 | `ctx.credentials.resolve()`、`agent/request`、Typert Remote |
| Client | 挂载 footer action、每分钟请求一次快照、展示金额/进度/状态 | `ctx.remote.deepseekBalance.get()`、`sidebar.footer.action` |
| 官方服务 | 返回当前账户余额 | `GET /user/balance`，`Authorization: Bearer <key>` |

## 触发与缓存语义

Host 在 `agent/request` waterfall 中等待下游返回最终请求配置，只将 `provider === 'deepseek'` 的调用记为活动。浏览器按 Host 返回的下一次查询时间调用 `get`；Host 只有在最近一次 DeepSeek 调用距当前不超过 30 分钟时才访问官方余额接口，否则返回已有快照并标记为 idle。实际请求间隔优先读取余额接口响应的 `Cache-Control: max-age`，若服务端没有发布该信息，则使用 5 分钟默认值。因此默认行为与官方 5 分钟更新节奏一致，而不是每分钟重复请求。首次成功查询会记录本地日期与当日基准总额；同一天后续查询不会改变基准，跨自然日的第一次成功查询才重置基准。进度百分比按 `current / baseline * 100` 计算并限制在 0–100 之间。

查询失败不会清空上一次成功余额，UI 会保留旧金额并显示错误状态；若从未成功查询，则显示“等待调用”或“查询失败”，避免把错误状态误当成零余额。USD 与 CNY 分别渲染，若响应包含多种币种则按 `currency` 分组，不把不同货币相加。

## UI 方案

UI 注册为 `sidebar.footer.action` 的列表项，排序位于 Settings 之前。展开状态使用接近 Harness 的低对比度白底、1px 边框、8px 圆角和细灰色进度轨道；卡片宽度随 footer 受限，金额采用紧凑的等宽数字。折叠状态只保留小型余额圆点/货币符号及 tooltip，避免破坏 56px rail。卡片点击触发即时刷新，鼠标悬停提示“最近一次查询时间、今日基准、触发条件和错误信息”。

## 可验证边界

测试覆盖包括：余额响应解析、双币种合并与金额格式化；10 分钟边界（含等于 10 分钟的情况）；同日保持基准、跨日重置；无 DeepSeek 调用时不发起网络请求；API key 缺失、401、非 JSON 和网络错误；展开/折叠 sidebar 的渲染；列表插槽注册与插件卸载后的清理。
