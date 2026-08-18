# 案件进程监控（Docket Watcher）— 托管 Agent 模板

## 概述

监控活跃诉讼案件组合中各事项的法院进程。人民法院案例库覆盖已公开裁判文书；裁判文书网覆盖审级卷宗；元典/聚法案例作更广覆盖的补充。对每个活跃事项，本 agent 拉取自上次检查以来的新卷宗，将卷宗类型映射到候选期限，与该事项的历史及未决交付物交叉核对，并产出案件进程状态报告加一份结构化期限清单。

与诉讼法务 Claude Code 插件中的 [`docket-watcher`](../../litigation-legal/agents/docket-watcher.md) agent 同源——本目录是用于 `POST /v1/agents` 的托管 Agent 部署清单。

## ⚠️ 部署前须知

- **计算出的期限是线索，而非日历条目。** 法院期限规则因法域、法院、法官及地方规定而异，并可能被审理规程或个案的审理计划修改。错过法院期限会带来执业过错后果。持证律师须在期限入档前，对照法院实际规则及任何个案命令核验每一个计算出的期限。本 agent 位于该决策的上游，而非其替代。
- **卷宗分类是启发式的。** agent 误分类的卷宗——把程序性申请读成实体性申请、把一份合意读成证据争议——可能产出错误的期限规则。阅读卷宗；不要相信标签。
- **未知法院不是默认值。** 如法域规则表未覆盖某法院，映射器必须产出 `confidence: low` + `needs_verification: true`，绝不静默默认。如你在冷僻法院上看到一个笃定的期限，在证实前把规则表当作已过时。
- **安静的进程不等于干净的进程。** 书记员会延迟入档。程序笔录有时在事件数天后才到。"无新卷宗"是关于数据流的陈述，而非关于案件的陈述。

## 部署

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export YUANDIAN_MCP_URL=...
export CAIPANWENSHU_MCP_URL=...
export FEISHU_MCP_URL=...
../../scripts/deploy-managed-agent.sh docket-watcher
```

## Steering 事件

见 [`steering-examples.json`](./steering-examples.json)。

## 安全与交接

法院卷宗是公开记录，但同时也是不可信输入。提交方控制文本，可嵌入针对 agent 的提示词、URL 与指令。三层隔离：

| 层级 | 接触卷宗？ | 工具 | 连接器 |
|---|---|---|---|
| **`docket-reader`** | **是** | 仅 `Read`、`Grep` | yuandian、caiPanWenShu（只读） |
| `deadline-mapper` / 编排器 | 否——只见结构化 JSON | `Read`、`Grep`、`Glob`、`Agent` | feishu（法域配置，只读） |
| **`tracker-writer`**（Write 持有者） | 否 | `Read`、`Write`、`Edit` | 无 |

`docket-reader` 返回长度上限、schema 校验的 JSON。`deadline-mapper` 无 MCP、无网络——它应用部署团队已配置的规则。`tracker-writer` 产出 `./out/docket-report-<日期>.md` 与 `./out/deadlines.yaml`，且从不见原始卷宗。

## 适配说明

本 cookbook 是起点。在你完成以下事项之前，它无法用于生产：

- **设置 MCP URL。** `YUANDIAN_MCP_URL` 与 `CAIPANWENSHU_MCP_URL` 必须指向你部署的端点，并带上你平台所需的认证。`FEISHU_MCP_URL`（或替代）指向你的法域规则表所在之处。
- **加载案件组合。** 本 agent 读取部署团队诉讼法务配置中的 `matters/_log.yaml`，加上逐事项的 `docket_id` 与 `court`。如你的案件管理系统是权威来源，请以 MCP 或定时同步将其前置到配置路径。
- **配置法域规则。** 为你组合中的每个法院向 deadline-mapper 提供一份地方规则表。全国统一规则你可一次性编码；地方各级法院与具体承办法官/合议庭才是地雷所在。未知法院应产出 `confidence: low` + `needs_verification: true`，绝不静默默认。
- **接通推送。** 决定输出去向：你的案件管理系统摄取 `./out/deadlines.yaml`；叙述报告推送至飞书、邮件或你的事项管理工作区；关键标记路由至你想要惊动的人。
- **设定节奏。** 多数事项每周；对任何 14 天内有开庭、任何 `trial` 或后期 `discovery` 态势、或任何 `risk: critical` 事项，改为每日。

## 计算出的期限是线索，而非日历条目

**本 agent 产出的计算期限，在入档前需人工对照有约束力的地方规则、审理规程与审理计划核验。错过法院期限会带来执业过错后果。本 agent 浮现期限；由人核验并入档。**

每个期限携带 `confidence` 与 `needs_verification` 字段。报告将低置信度条目单独分列，并在任何非源自明确统一规则的条目上加盖核验提示。把这当作人工审查的下限——而非上限。法官会以个案命令覆盖默认值，地方规则会变，且书记员实际入档送达的日期可能与进程显示的日期不同。

**不予保证：** 本 agent 建议一个期限；入档律师对照有约束力的规则确认并锁定日期。
