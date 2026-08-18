# 续约监控（Renewal Watcher）— 托管 Agent 模板

## 概述

扫描合同库中即将到来的续约与解约（cancel-by）期限，对照团队手册交叉核对，标记临近期限、手册偏离与上报触发的合同，并写出预警报告。与 [`renewal-watcher`](../../commercial-legal/agents/renewal-watcher.md) Claude Code agent 及 [`renewal-tracker`](../../commercial-legal/skills/renewal-tracker) 技能同源——本目录是用于 `POST /v1/agents` 的托管 Agent 部署清单。

这是一份**蓝图，而非成品。** 它与合同管理系统（CLM）无关——默认接入合同库 MCP（面向中国大陆从业者的 e签宝/法大大/飞书文档）；使用其他 CLM 或以签署 PDF 存于共享盘的团队应相应替换 MCP 端点。

## ⚠️ 部署前须知

- **从合同元数据拉取的解约日期与续约条款可能有误。** CLM 元数据会与已签署文档产生漂移——补充协议签了却未重新摄取、生效日期与签署日期不一、自动续约机制有时被误标。在依赖某个计算出的期限作出解约或续约决定前，持证律师须对照已签署协议及任何补充协议核验。
- **上报路由遵循配置的矩阵；它不作上报判断。** 被标记的手册偏离在具体情境下仍可能可接受；未被标记的条款仍可能需要关注。矩阵是路由器，而非审查者。
- **安静的周不等于干净的周。** 未被浮现的合同，可能是从 CLM 缺失、被误标，或已过通知窗口而元数据未反映。全清页脚意味着 agent 已运行，而非无事可做。

## 部署

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export CLM_MCP_URL=...                # e签宝/法大大/飞书文档 CLM 端点
export FEISHU_MCP_URL=...
# 可选——如你的签署协议存于此处，请在清单中启用
export GDRIVE_MCP_URL=...
../../scripts/deploy-managed-agent.sh renewal-watcher
```

## Steering 事件

见 [`steering-examples.json`](./steering-examples.json)。默认周一上午扫描使用第一个示例。另两个覆盖临时的对方范围运行与签署后偏离检查。

## 安全与交接

合同文本、对方消息与 CLM 评论是**不可信输入。** 三层隔离：

| 层级 | 接触不可信文档？ | 工具 | 连接器 |
|---|---|---|---|
| **`repo-reader`** | **是** | 仅 `Read`、`Grep` | CLM（e签宝/法大大/飞书文档，只读） |
| `deadline-calculator` / 编排器 | 否 | `Read`、`Grep`、`Glob`、`Agent` | 无 |
| **`alert-writer`**（Write 持有者） | 否 | `Read`、`Write`、`Edit` | 无 |

`repo-reader` 返回长度上限、schema 校验的 JSON。`deadline-calculator` 是对该 JSON 加磁盘上手册配置的纯计算——无 MCP、无网络。`alert-writer` 产出 `./out/renewal-alerts-<YYYY-MM-DD>.md` 并为飞书推送发出 `handoff_request`。

**交接：** 编排器使用部署团队文书风格配置中的频道，将 `alert-writer` 的 `handoff_request` 路由至飞书发送 worker。agent 从不自行发送飞书消息。

**关联 agent：** 当需要签署后偏离检查时，`handoff_request` 也可路由至 [`deal-debrief`](../../commercial-legal/agents/deal-debrief.md)；当续约期偏离累积成模式时，可路由至 [`playbook-monitor`](../../commercial-legal/agents/playbook-monitor.md)。具名 agent 从不彼此直接调用——路由是编排器的职责。

**不予保证：** 本 agent 建议一项行动；由律师决定是解约、重新谈判，还是让续约自然生效。

## 适配说明

在你信赖其对你工作流的输出之前：

- **指向你的 CLM。** 将 `CLM_MCP_URL` 设为你的合同管理系统（e签宝、法大大、飞书文档或等价物）。如签署协议存于共享盘文件夹，则依赖 `gdrive` 与 repo-reader 的回退搜索路径。如它们存于无公开 MCP 的 CLM，请接一个自定义连接器并更新 MCP server 块。
- **设置飞书频道。** alert-writer 发出的 `handoff_request` 会命名一个飞书频道。编排器从你手册配置的 **House style → Renewal alerts** 字段读取该频道。请在首次排程运行前设置，否则交接会进入死信。
- **调优前瞻窗口。** deadline-calculator 的默认档为逾期 / 30 / 60 / 90 / 180 天。如你的续约周期更短（一年以内的 SaaS 订购单）或更长（带 12 个月通知窗口的多年期企业主协议 MSA），请在 deadline-calculator 提示词及 `alert-writer.yaml` 的对应段中调整各档阈值。
- **调整上报矩阵。** deadline-calculator 读取你手册的上报矩阵，据以决定是否设 `escalation_needed: true` 及路由给谁。启用排程运行前，确认矩阵反映你当前的审批权限（谁批准让自动续约失效、谁批准超过金额门槛的重新谈判）。[`escalation-flagger`](../../commercial-legal/skills/escalation-flagger) 技能已加载于 `alert-writer` 用于格式化。
- **确认工作成果页眉。** `agent.yaml` 中的无界面追加指令让 agent 前置你手册的工作成果页眉。开启前请与你的法务负责人核对页眉措辞。
- **节奏。** 默认每周。高吞吐团队应每日运行；小团队可每月运行。节奏存于你自己的工作流引擎——cookbook 不自行排程。
