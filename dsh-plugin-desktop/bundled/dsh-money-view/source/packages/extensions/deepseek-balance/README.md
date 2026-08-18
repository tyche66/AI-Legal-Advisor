# DeepSeek API Balance Plugin

该插件在 DeepSeek Harness 左侧栏底部、Settings 上方显示 DeepSeek API 余额。余额数据由 Host 侧查询，浏览器只接收金额、进度和时间戳，因此 API key 不会进入前端 bundle。

## 查询策略

插件监听最终的 `agent/request` 路由，只把 `provider === 'deepseek'` 记作活动。余额接口只有在最近 **30 分钟**内发生过 DeepSeek 调用时才会访问；没有近期调用时，RPC 只返回本地快照，不向 DeepSeek 发请求。

实际刷新间隔优先使用余额响应中的 `Cache-Control: max-age`。如果官方响应没有发布该缓存提示，插件使用 **5 分钟**默认回退周期。这样默认不会每分钟重复查询，也可以在官方改变响应缓存策略后自动跟随。该接口页面目前公开了余额字段，但没有在文档中承诺固定刷新周期，因此 5 分钟属于可配置的保守默认值，而不是对官方行为的硬编码假设。

每日第一次成功查询会把每种货币的 `total_balance` 记录为当日基准；同一天后续查询只更新当前余额，跨自然日后的第一次成功查询才重新建立基准。进度条按 `当前余额 / 当日首次余额 × 100%` 计算，并限制在 0–100% 范围内。CNY 与 USD 分开显示，不会混合换算或相加。

## 默认集成

`packages/bundle/web-app/cordis.patch.yml` 已加入 `@deepseek-ai/dsh-deepseek-balance`，因此使用默认 Web bundle 时会自动加载。插件默认读取 Harness 凭据引用 `DEEPSEEK_API_KEY`，与现有 DeepSeek provider 保持一致。

如需自定义，可在 Cordis patch 中覆盖以下配置：

| 配置项 | 默认值 | 作用 |
|---|---:|---|
| `baseURL` | `https://api.deepseek.com` | DeepSeek-compatible API origin |
| `apiKeyEnv` | `DEEPSEEK_API_KEY` | 凭据引用名，不是明文 API key |
| `defaultRefreshIntervalMs` | `300000` | 没有 `max-age` 时的 5 分钟回退 |
| `activityWindowMs` | `1800000` | 30 分钟活动窗口 |

官方接口文档：[查询余额](https://api-docs.deepseek.com/zh-cn/api/get-user-balance/)。
