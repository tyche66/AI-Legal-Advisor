# 法律领域托管 Agent 模板

本仓库中每个 Agent 以**两种方式**交付：作为你今天就可以安装的 Claude Code 插件（见仓库根目录各业务领域目录），以及作为平台团队部署在自有工作流引擎后台的 **Claude Managed Agent** 模板。**同一个 Agent，同一套技能——选择你的运行场景。** 以下每个目录是一个部署清单，引用对应插件中的权威 system prompt 和技能文件，确保单一事实来源。

这些是**蓝图，而非成品。** 它们是起点。请根据你的文档管理系统、合同台账、飞书工作空间、通知路由和审查节奏进行调整。未经适配无法开箱即用，它们也不应如此。

运行 `../scripts/deploy-managed-agent.sh <slug>` 上传技能、创建 leaf worker，并以解析后的配置执行 `POST /v1/agents`。每个模板附带 [`steering-examples.json`](./reg-monitor/steering-examples.json) 和每个 Agent 的 README（涵盖安全层和交接说明）。

| Agent | 对应插件 | 监控内容 | CMA steering 事件 | Leaf worker |
|-------|----------|----------|-------------------|-------------|
| [`reg-monitor`](./reg-monitor/) | regulatory-legal | 法规信息源（司法部数据库、部委 RSS、元典） | `检查 <日期> 之前的法规动态，重要性阈值：<阈值>` | feed-reader · materiality-filter · **digest-writer** |
| [`renewal-watcher`](./renewal-watcher/) | commercial-legal | 合同台账（法大大、e签宝）中的续签和解约截止日期 | `扫描 <X>–<Y> 天内的续签，标记审查指引偏离` | repo-reader · deadline-calculator · **alert-writer** |
| [`diligence-grid`](./diligence-grid/) | corporate-legal | 虚拟数据室（飞书、Google Drive、Datasite）中新增上传和批量审查 | `按 schema <schema-id> 审查 <path> 文件夹` | doc-reader · extractor · normalizer · **grid-writer** |
| [`launch-radar`](./launch-radar/) | product-legal | 产品路线图/上线追踪器（Jira、Linear、Asana）中需要法务审查的产品 | `扫描追踪器中未来 <N> 周的上线计划` | tracker-reader · risk-classifier · **memo-writer** |
| [`docket-watcher`](./docket-watcher/) | litigation-legal | 法院案件进展（元典、聚法案例）中的新进展、截止日期和交付物 | `监控案号 <case-id>，法院 <court>，事项 <matter-id>` | docket-reader · deadline-mapper · **tracker-writer** |

**粗体** leaf = 唯一拥有 `Write` 权限的 worker。

## 清单与 API

`agent.yaml` 文件使用真实 `POST /v1/agents` 字段名，同时包含部署脚本自动解析的若干约定：

| 清单约定 | 解析为 |
|----------|--------|
| `system: {file: ../../<插件名>/agents/<agent>.md, append: "..."}` | `system: "<内联内容 + append>"` |
| `system: {text: "..."}` | `system: "<text>"` |
| `skills: [{from_plugin: ../../<插件名>}]` | 上传该目录下所有 `skills/*` → `[{type: custom, skill_id: ...}, ...]` |
| `skills: [{path: ../../...}]` | `skills: [{type: custom, skill_id: <上传后id>}]` |
| `callable_agents: [{manifest: ./subagents/x.yaml}]` | `callable_agents: [{type: agent, id: <创建后id>, version: latest}]` |

> **研究预览：** `callable_agents`（多 Agent 委托）支持**一级委托**。编排器可调用 worker；worker 不能进一步调用子 Agent。

## 跨 Agent 交接

命名 Agent 之间从不直接相互调用。当一个 Agent 需要另一个 Agent 时（如 `launch-radar` 发现一个需要完整审查备忘录的上线项目），它在输出中发出一个 `handoff_request`；[`../scripts/orchestrate.py`](../scripts/orchestrate.py)（或你自己的事件总线）将其作为新的 steering 事件路由至目标会话。参考脚本对目标进行硬白名单限制并对荷载进行 schema 验证。

## 安全模型

法律文件和法院文书是**不可信输入。** 每个蓝图采用三层 worker 拆分：

1. **Readers** 接触不可信文档，仅拥有 `Read`/`Grep`——无 MCP、无 Write、无网络。返回长度上限的结构化 JSON。文档中嵌入的任何指令都是数据，而非命令。
2. **Analyzers** 接收来自 readers 的结构化 JSON，应用用户配置规则，拥有 MCP 读取权限用于验证。无 Write。
3. **Writers** 产出最终交付物，是唯一拥有 `Write` 的层级。它们从不接触原始文档。

编排器既不持有 Write 权限，也不读取原始文档。它路由，不处理。

## 工作成果与保密

正常部署下，这些 Agent 产出的所有内容均为**律师工作成果**。每个清单中的无头附加指令要求 Agent 在开头附加用户插件配置中的工作成果保密声明。部署前请与你的法务团队确认声明内容。如果部署中处理不应保留的材料，请先审查 Anthropic 的数据留存设置和你自己的存储留存策略。

## 你得到什么、不会得到什么

- **你得到的：** 可工作的清单结构、含合理安全分层的参考架构、经 Claude Code 插件验证的技能、steering 事件示例。
- **你不会得到的：** 开箱即用的生产级 Agent。你需要将 MCP 连接器接入**你的**系统、设定调度节奏、配置通知路由、为你的实务调优提示词，并在信任输出之前完成你自己的评估。
- **你特别不会得到的：** 律师的替代品。这些 Agent 监控、提取和起草。律师审查、核实并做出决策。
