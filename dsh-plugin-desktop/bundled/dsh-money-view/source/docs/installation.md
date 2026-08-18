# Installation

> 当前版本是 DeepSeek Harness workspace extension，目标运行环境是从源码构建的 Harness，而不是独立浏览器扩展。

## 1. 获取 Harness 源码

```bash
git clone https://github.com/deepseek-ai/deepseek-harness
cd deepseek-harness
pnpm install
```

建议记录 Harness commit，后续提交兼容性问题时一并提供。

## 2. 复制插件源码

在 Harness workspace 中执行：

```bash
rm -rf packages/extensions/deepseek-balance
cp -R /path/to/DSH-money-view/packages/extensions/deepseek-balance packages/extensions/deepseek-balance
```

将 `packages/extensions/deepseek-balance` 加入你的 workspace package 管理范围，并确保包名保持为 `@deepseek-ai/dsh-deepseek-balance`。

## 3. 加入默认 Web bundle

在 `packages/bundle/web-app/package.json` 的 workspace dependencies 中加入：

```json
"@deepseek-ai/dsh-deepseek-balance": "workspace:^"
```

在 Web Cordis patch 的 browser roster 中加入：

```yaml
- id: deepseek-balance
  name: '@deepseek-ai/dsh-deepseek-balance'
```

该插件使用 `sidebar.footer.action`，卡片会显示在侧栏 Settings 上方。

## 4. 配置凭据

插件默认复用 Harness 的 `DEEPSEEK_API_KEY` credential reference。请按照 Harness 的凭据管理方式配置 API Key，不要把真实密钥写进 README、Cordis patch、浏览器 Local Storage 或截图。

如果你的 provider 使用不同的凭据引用名，可以在插件配置中设置：

```yaml
baseURL: 'https://api.deepseek.com'
apiKeyEnv: 'DEEPSEEK_API_KEY'
defaultRefreshIntervalMs: 300000
activityWindowMs: 1800000
```

## 5. 构建与运行

```bash
pnpm install
pnpm --filter @deepseek-ai/dsh-deepseek-balance bundle
pnpm run verify-cordis-config
pnpm run build
```

启动 Harness Web UI 后，使用 DeepSeek provider 发起一次调用。余额卡片会在最近 30 分钟存在调用活动时进行外部查询；如果没有近期调用，它会保持本地快照并显示等待状态。

## 6. 常见问题

### 卡片显示“未配置 DeepSeek API Key”

确认 provider 和余额插件引用的是同一个 credentials service，并确认配置使用的是引用名而不是明文 key。

### 卡片显示“等待最近 30 分钟内的 DeepSeek 调用”

这是预期行为。插件不会在没有近期 DeepSeek 调用时主动访问余额接口。先使用 DeepSeek provider 完成一次调用，再等待卡片按照 `nextQueryAt` 更新。

### 为什么不是每分钟查询

余额接口的服务端更新节奏优先于客户端轮询频率。插件优先遵循响应 `Cache-Control: max-age`；只有服务端未提供新鲜度信息时，才使用默认 5 分钟回退。

### 如何报告问题

请通过 [Bug Report](../.github/ISSUE_TEMPLATE/bug_report.md) 提交 Harness commit、Node/pnpm 版本和脱敏错误信息。不要上传 Authorization header 或 API Key。
