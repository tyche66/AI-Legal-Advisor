# 监管变动监控（Reg Monitor）— 托管 Agent 模板

## 概述

按排程检查监管信息源，按部署团队的重大性阈值过滤，对始终重大的项目对照政策库做快速缺口检查，并写出摘要。与 [`reg-change-monitor`](../../regulatory-legal/agents/reg-change-monitor.md) Claude Code agent 及 [`reg-feed-watcher`](../../regulatory-legal/skills/reg-feed-watcher) / [`policy-diff`](../../regulatory-legal/skills/policy-diff) 技能同源——本目录是用于 `POST /v1/agents` 的托管 Agent 部署清单。

## ⚠️ 部署前须知

- **摘要项是经筛的线索，而非法律结论。** 重大性过滤应用的是可配置阈值，而非法律判断。agent 判为"知悉即可"的监管变动，可能对你的业务仍属重大。它标为"重大"的变动，可能最终并不适用。审查每份摘要；由持证律师决定某项是否需要行动、披露、政策变更或上报。
- **政策缺口检查是初筛，而非对适用性的法律评估。** 缺口面用启发式规则将新监管文本与你的政策库比对。"缺口"是供律师评估的线索；"一致"结果不构成合规认证。
- **重大性阈值是你的校准，而非法律。** 如你的 `## Materiality threshold` 段已过时或为不同风险姿态调优，分流即已过时。在启用排程运行前重新检查。
- **观察清单是你作出的覆盖断言。** 不在观察清单上的监管机构仍可能发布重大内容。漏掉某监管机构是配置 bug，而非信息源 bug。

## 部署

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export GDRIVE_MCP_URL=...
../../scripts/deploy-managed-agent.sh reg-monitor
```

## Steering 事件

见 [`steering-examples.json`](./steering-examples.json)。默认每周扫描使用第一个示例。另两个覆盖针对特定动态的定向深查与对被标记项的缺口分析。

## 安全与交接

监管信息源内容（国家法律法规数据库条目、监管机构 RSS 推送、元典提醒通知）是**不可信输入。** 三层隔离：

| 层级 | 接触不可信文档？ | 工具 | 连接器 |
|---|---|---|---|
| **`feed-reader`** | **是** | 仅 `Read`、`Grep`、`WebFetch` | 无 |
| `materiality-filter` / 编排器 | 否 | `Read`、`Grep`、`Glob`、`Agent` | gdrive（仅编排器） |
| **`digest-writer`**（Write 持有者） | 否 | `Read`、`Write`、`Edit` | 无 |

`feed-reader` 返回长度上限、schema 校验的 JSON。`materiality-filter` 是对该 JSON 加磁盘上 regulatory-legal 配置的纯计算——无 MCP、无网络。`digest-writer` 产出 `./out/reg-digest-<YYYY-MM-DD>.md` 并为飞书推送发出 `handoff_request`。

**交接：** 编排器使用部署团队文书风格配置中的频道，将 `digest-writer` 的 `handoff_request` 路由至飞书发送 worker。agent 从不自行发送飞书消息。

**不予保证：** 本 agent 浮现变动并标记潜在政策缺口；由律师决定某项监管变动是否需要行动、以及由谁负责应对。

## 适配说明

在你信赖其对你工作流的输出之前：

- **将 `feed-reader` 指向你的来源。** 默认目标是国家法律法规数据库（免费公开、无需 MCP）。如你所在机构订阅了元典、北大法宝、威科先行，或直连监管机构 RSS，请把端点加入 feed-reader 的 web_fetch 允许清单，并调整编排器的扫描计划。如你只有免费来源，仅国家法律法规数据库亦可工作。
- **（可选）设置元典 MCP URL。** 元典在清单中默认注释掉；如你的团队付费使用，请接通并将 `enabled: true` 翻转。
- **配置摘要推送频道。** digest-writer 发出的 `handoff_request` 会命名一个飞书频道。编排器从你 regulatory-legal 配置的 **House style → Reg digest** 字段读取该频道。请在首次排程运行前设置，否则交接会进入死信。想改为邮件或飞书知识库页面接收摘要的团队，应在编排器允许清单中替换交接目标。
- **调优重大性阈值。** materiality-filter 读取你配置的 `## Materiality threshold` 段——始终重大 / 值得审查 / 知悉即可。启用排程运行前，确认各档反映你当前的风险姿态；阈值过低会淹没摘要，过高则会漏掉带期限的义务。
- **更新观察清单。** materiality-filter 也读取 `## Regulators we watch` 表。随你经营版图变化增删监管机构。
- **确认工作成果页眉。** `agent.yaml` 中的无界面追加指令让 agent 前置你配置的工作成果页眉。开启前请与你的法务负责人核对页眉措辞。
- **节奏。** 默认每周。活跃的监管环境（金融服务立法周期、跨境 AI 监管）可能需要每日。节奏存于你自己的工作流引擎——cookbook 不自行排程。
