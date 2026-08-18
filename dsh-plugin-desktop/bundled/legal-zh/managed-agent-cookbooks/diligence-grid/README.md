# 尽调矩阵（Diligence Grid）— 托管 Agent 模板

## 概述

针对虚拟数据室（VDR）的批量文档审查。两种模式：

- **watch（监控）** —— 监控 VDR 中自某截止点以来的新上传件，对照部署团队的尽调清单类别分类，并标记落入高优先级类别（重大合同、诉讼、知识产权）的上传件。
- **grid（矩阵）** —— 针对一批文档、按列 schema 运行表格化审查。每份文档一行、每个数据点一列，每个单元格都溯源至逐字原文引用。这是并购尽调的主力工具。

与 [`corporate-legal`](../../corporate-legal) 插件同源——本目录是用于 `POST /v1/agents` 的托管 Agent 部署清单。grid 模式即 `tabular-review` 技能，以无界面方式跨一队抽取 worker 运行。

## ⚠️ 部署前须知

- **每个单元格都是线索，而非定论。** 在律师阅读底层文档之前，尽调矩阵既不是陈述与保证、也不是披露清单、更不是尽调备忘录。每个单元格中的逐字引用正是为了让审查者快速核验——请用它。
- **重大性过滤与列分类应用的是启发式规则，而非法律判断。** schema 判为"不重大"的合同，可能正是让交易告吹的那一份。抽取器若误读条款，"已作答"的单元格仍然是错的。审查者的工作量随 `unclear` + `needs_review` + `answered` 增长——而不只是被标记的那些。
- **watch 模式分类的是元数据与预览，而非完整文档。** 分类器标为"低优先级"的新上传件，仍可能是改变交易的补充协议（side letter）。把 watch 报告当作队列，而非过滤器。
- **对方上传的文档对工具链而言同样是不可信输入。** grid-writer 的 CSV 公式注入防御是强制的、非可选的——见下方安全章节。

## 部署

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export FEISHU_MCP_URL=...
export GDRIVE_MCP_URL=...
export CLM_MCP_URL=...                # 可选；如使用，请将工具集默认设为启用
export AI_CONTRACT_MCP_URL=...        # 可选；用于归一化环节的条款结构 QA
../../scripts/deploy-managed-agent.sh diligence-grid
```

## Steering 事件

见 [`steering-examples.json`](./steering-examples.json)。

## 安全与交接

VDR 文档——合同、董事会纪要、补充协议、对方上传件——是**不可信输入**。对方上传的合同可能包含意图操纵审查者或下游工具链的字符串。四层隔离，使持有 Write 之手与持有 MCP 之手远离文档：

| 层级 | 接触不可信文档？ | 工具 | 连接器 |
|---|---|---|---|
| **`doc-reader`** | **是**（只读） | `Read`、`Grep` | 飞书文档/企业网盘（只读） |
| **`extractor`** | **是**（只读） | `Read`、`Grep` | 无 |
| `normalizer` / 编排器 | 否 | `Read`、`Grep`、`Glob`、`Agent` | 无（明确可选，只读） |
| **`grid-writer`**（Write 持有者） | 否 | `Read`、`Write` | 无 |

`doc-reader` 与 `extractor` 返回长度上限、schema 校验的 JSON。编排器与 `normalizer` 只见结构化数据。`grid-writer` 产出 `./out/diligence-grid-<日期>.csv`、`./out/diligence-grid-<日期>_sources.csv` 与 `./out/diligence-grid-<日期>-summary.md`。

**CSV 公式注入。** `grid-writer` 写入的每个单元格——值、逐字引用、位置、文档名、列标签——都先对首字符做校验，检查 `=`、`+`、`-`、`@`、制表符与回车符。匹配者在落入 CSV 前会被前置一个单引号。对方上传的合同常含字符串，一旦交易团队打开文件，Excel 与在线表格便会将其作为公式执行（`=HYPERLINK(...)` 数据外泄、老版本 Excel 上的 `=cmd|...` DDE）。sources CSV 是更大的暴露面——逐字引用正是攻击者可控的表面。

**Xlsx 是部署层的关注点。** 本 cookbook 仅交付 CSV。部署团队依据 [`corporate-legal/skills/tabular-review/references/excel-output.md`](../../corporate-legal/skills/tabular-review/references/excel-output.md) 中的工作簿结构将其转换为 `.xlsx`——隐藏的 `_source` 列、悬停显示引用的单元格批注、基于状态的填充、每列的 `Verified` 下拉、`_schema` 与 `_summary` 工作表。该转换发生在部署团队的 Excel 表面（Excel 中的 Claude、openpyxl，或经 Sheets API 的在线表格）。从无界面 agent 直接交付 xlsx 需要可信运行时与宏表面，本 cookbook 有意不作此假设。

**不予保证：** 本 agent 产出的每个单元格都是**需要核验的线索**，而非定论。审查者阅读来源、核对引用、勾选 `Verified` 列。由律师决定什么进入陈述与保证、披露清单或备忘录。

## 适配说明

- **VDR URL。** 设置 `FEISHU_MCP_URL` / `GDRIVE_MCP_URL` / `CLM_MCP_URL` 以匹配你的数据室。默认启用飞书文档与 Google Drive；如你以其他平台为主，请翻转 [`agent.yaml`](./agent.yaml) 中的 `default_config`。如你的 VDR 是专门服务，向 `mcp_servers` 与 `tools` 添加带匹配 MCP URL 的条目。
- **列 schema。** 默认采用 [`corporate-legal/skills/tabular-review/references/ma-diligence-columns.md`](../../corporate-legal/skills/tabular-review/references/ma-diligence-columns.md) 中的并购尽调标准。请依交易类型定制——科技/IP、医疗健康、房地产、政府承包、受监管金融——使用该参考文件中的增补项。
- **输出去向。** 输出落在 `./out/`。通过你的部署管线将其接入交易文件夹、飞书文档工作区或共享盘文件夹。不要给 `grid-writer` 一个用于上传的 MCP；交接到你的上传步骤更清洁，也能保持 Write 层隔离。
- **默认模式。** watch 与 grid 按 steering 事件选择。如你的工作流几乎总是其中之一，请据此在编排器中预置 steering 事件模板。
- **清单类别。** watch 模式对照部署团队 corporate-legal `CLAUDE.md` 配置中的类别分类。接入 watch 模式到实盘交易前，请在该处重新运行 `/corporate-legal:cold-start-interview`。
- **工作成果页眉。** `grid-writer` 会前置部署团队 `## Outputs` 配置中的页眉。部署前请与你的法务团队确认页眉——它随审查者角色（律师 vs 非律师）而不同。
- **推送路由。** 本 agent 从不直接发帖。报告是文件；`handoff_request` 告诉编排器路由到哪个飞书频道。在部署团队 `CLAUDE.md` 的文书风格段中配置交易频道。
