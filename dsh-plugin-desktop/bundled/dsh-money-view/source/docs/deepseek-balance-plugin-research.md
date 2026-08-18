# DeepSeek 余额插件研究记录

## Harness 扩展机制

- 仓库：`https://github.com/deepseek-ai/deepseek-harness`
- Harness 的架构原则是“一切皆插件”，UI 通过 Cordis client plugin 与 slot registry 扩展。
- `packages/client/ui-sidebar/src/client/SidebarRoot.tsx` 明确渲染顺序：`sidebar.workspaces` 位于中部，底部 `footArea` 先渲染 `sidebar.footer.action`，再渲染 `sidebar.settings`。
- `packages/client/ui-sidebar/src/client/contract/slots.ts` 声明：`sidebar.footer.action` 是 `kind: list`、`scope: root`，注册组件只接收 `{ wide: boolean }`。
- 现有插件通过 `ctx.slots.inject('目标插槽', () => ctx.slots.register({...}, Component))` 注册，注册动作依赖插槽声明但不要求固定加载顺序。
- Client 插件通过 package.json 的 `dsh.client` 声明被发现，并通过 `exports["./client"]` 提供浏览器 bundle；通常需要 node half 的空 `apply` 与 browser half 的 `client/index.ts`。

## 官方余额接口

来源：`https://api-docs.deepseek.com/zh-cn/api/get-user-balance/`

- 请求：`GET https://api.deepseek.com/user/balance`
- 认证：使用 DeepSeek API key 的 `Authorization: Bearer <key>` 请求头。
- 200 响应：`is_available: boolean` 与 `balance_infos: object[]`。
- `balance_infos[].currency` 为 `CNY` 或 `USD`。
- `total_balance` 是包含赠金和充值余额的总可用余额；另有 `granted_balance` 与 `topped_up_balance`，字段类型均为字符串。

## 用户界面要求

- 按截图将余额卡片放在 Harness 左侧栏底部、Settings 上方，对应 `sidebar.footer.action` 插槽。
- 显示余额金额与进度条。
- 余额进度条分母取“当日首次查询”的总余额；跨自然日首次查询时重置基准。
- 自动查询频率为每 1 分钟一次，但仅在最近 10 分钟存在 API 调用时才触发；无调用时不轮询。

## 更新周期补充

截至 2026-08-18，DeepSeek 官方余额接口文档明确了 `GET /user/balance` 和返回字段，但未在该接口页面公开一个固定的余额刷新周期。插件因此不把“5 分钟”硬编码为官方承诺：服务端优先读取响应的 `Cache-Control: max-age` 作为下一次查询间隔；若响应没有该提示，则使用 5 分钟作为可配置的默认回退值。这样可避免高频重复查询，也能在官方未来通过响应头发布不同周期时自动跟随。

参考 URL：`https://api-docs.deepseek.com/zh-cn/api/get-user-balance/`
