# 上线雷达（Launch Radar）— 托管 Agent 模板

## 概述

定时扫描产品团队的上线追踪器——飞书多维表格、钉钉、Teambition（或 Jira、Linear、Asana）——找出未来数周内很可能需要法务审查的上线项目。对照产品法务的风险校准表对每个上线项目分流，产出每周雷达备忘录：什么即将到来、什么需要法务关注、什么触发了标记。与 [`launch-watcher`](../../product-legal/agents/launch-watcher.md) Claude Code 插件 agent 同源——本目录是用于 `POST /v1/agents` 的托管 Agent 部署清单。

这是一份**蓝图，而非成品。** 未经适配无法开箱即用。你需要将 MCP 连接器接入你的追踪器、加载你的风险校准表、设定节奏，并配置备忘录的去向。适配说明见下。

## ⚠️ 部署前须知

- **雷达分流是路由决策，而非法律审查。** "需审查"意味着产品法务应看一眼；"知悉即可"不代表该上线没有问题；"跳过"不代表该上线获得放行。审查完整雷达，而不只是被标记项——未被标记项正是你会漏掉本应看到内容的地方。
- **风险分类使用你插件配置中的校准表。** 校准表若过时，分流也随之过时。新产品线、新监管机构、新经营地域、新第三方依赖，都需先落入校准表，雷达才能据以路由。
- **触发关键词清单是有立场的。** 如你的产品面与默认值不符（如你以生物识别为主、涉及关键信息基础设施要求、或以关键词未覆盖的方式处理未成年人数据），请在首次运行前重新调优，否则备忘录会漏掉它本应捕获的情形。
- **追踪器工单是不可信输入。** 产品经理可在标题或描述中填入任何内容，攻击者也可提交工单。分流据内容路由；它不为工单背书。

## 部署

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export FEISHU_MCP_URL=... DINGTALK_MCP_URL=... TEAMBITION_MCP_URL=... DRIVE_MCP_URL=...
../../scripts/deploy-managed-agent.sh launch-radar
```

只需为你实际使用的追踪器设置 MCP URL。编排器和 `tracker-reader` 会跳过未配置的 MCP。

## Steering 事件

见 [`steering-examples.json`](./steering-examples.json)。典型节奏是每周扫描一次、4–6 周展望窗口，外加当产品经理以"这有问题吗？"询问产品法务时的按需单工单分流。

## 安全与交接

追踪器工单是不可信输入。产品经理可在标题、描述或评论中填入任意文本，攻击者也可提交工单。三层隔离：

| 层级 | 接触不可信工单内容？ | 工具 | 连接器 |
|---|---|---|---|
| **`tracker-reader`** | **是** | 仅 `Read`、`Grep` | 飞书、钉钉、Teambition（只读） |
| `risk-classifier` / 编排器 | 否 | `Read`、`Grep`、`Glob`、`WebFetch`、`Agent` | 仅编排器：飞书 / 钉钉 / Teambition / 网盘（只读） |
| **`memo-writer`**（Write 持有者） | 否 | `Read`、`Write`、`Edit` | 无 |

`tracker-reader` 返回长度上限、schema 校验的上线项 JSON 列表。`risk-classifier` 无 MCP、无网络；它基于校验后的列表加用户校准文件工作。`memo-writer` 是唯一拥有 Write 的 worker，产出 `./out/launch-radar-<日期>.md`。编排器不持有 Write，也从不自行解析原始工单正文。

**交接：** 当某上线项需要完整法律审查备忘录而非雷达条目时，编排器为 `launch-review` 技能（在全新会话中运行）发出 `handoff_request`，而非内联起草备忘录。`scripts/orchestrate.py` 负责路由。

## 适配说明

在此变得有用之前你需要修改的内容：

- **追踪器指针。** 编辑 [`agent.yaml`](./agent.yaml) 和 [`subagents/tracker-reader.yaml`](./subagents/tracker-reader.yaml) 中的 `mcp_servers`，指向你追踪器的 MCP URL。如你只用其中一个，删除其余。如你的追踪器不在列表中，换入你实际使用的 MCP，并相应更新 `tracker-reader` system prompt。
- **风险校准。** `risk-classifier` 从 `../../product-legal/CLAUDE.md`（由 `/product-legal:cold-start-interview` 填充）读取用户校准。如你尚未运行冷启动，先运行，或在首次扫描前手写一份含"通常阻断／通常需付出工作量／通常仅知悉即可"表格的 CLAUDE.md。无校准时分类器仅回退至关键词触发，噪音较大。
- **扫描节奏与展望窗口。** 默认每周 / 6 周。你的上线节奏可能需要每日或每两周；提前期短则需更长展望窗口。在你的调度器（cron、Temporal、Airflow、EventBridge）中配置节奏，而非在 agent 内部。展望窗口通过 steering 事件传入。
- **推送渠道。** 备忘录默认写入 `./out/`。若要改为或额外推送至飞书，可 (a) 向 cookbook 添加飞书 MCP 并更新 `memo-writer` 使其写入后推送，或 (b) 让编排层拾取 `./out/launch-radar-<日期>.md` 并转发。此模式将推送置于 agent 之外，便于测试；择你运维方式所宜。
- **触发关键词。** `launch-watcher` system prompt 中的关键词清单是有立场的（儿童个人信息、敏感个人信息、AI 供应商名称等）。删除不适用于你产品的类别，添加领域专属术语（生物识别、位置/行踪轨迹、算法推荐、深度合成等），并对照你的校准表重新调优严重程度阈值。修改后重新部署。
- **保密页眉。** `memo-writer` 会前置插件配置中的工作成果页眉。部署前请与你的法务负责人确认确切标注——各法域标注方式不同。

## 你得到什么、不会得到什么

- **你得到的：** 可工作的清单、安全分层的管线、一份将每个上线项都引回其追踪器 URL 的备忘录，以及通往完整 launch-review 技能的交接路径。
- **你不会得到的：** 生产级 agent。将其接入你的追踪器、加载你的校准、设定节奏、运行评估，并在信任之前让产品法务对照他们对同一批工单的独立判断审查前几份输出。
- **你特别不会得到的：** 产品法务的替代品。本 agent 分流。律师审查、标记、决策。备忘录中每个"需审查"项都是线索，而非定论。
