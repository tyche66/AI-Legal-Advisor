# inbound/ — 收到的法律来函

本文件夹存放对外部来件的分流与回应工作：收到的律师函、送达公司的调查令/协助调查通知、监管机构询问、证据保全通知、针对我方的停止侵权函。

与 `demand-letters/`（对外发出）和 `matters/`（受追踪的案件组合）分开，因为来件有自身的工作流：读取 → 分流 → 决策 → 回应（或上升为事项）。并非每件来件都会成为受追踪的事项。

## Layout

```
inbound/
├── _README.md
└── [slug]/
    ├── incoming.pdf              # 或 .eml / .docx——原件（或链接/指针）
    ├── triage.md                 # 分析：范围、依据、选项、建议
    └── response-v1.docx          # 起草的回应（如回应，迭代为 v2、v3）
```

## Slug 约定

`[类型]-[发件方简称]-[yyyy-mm]`。示例：

- `demand-rec-acme-2026-04`（收到的律师函）
- `subpoena-court-a-2026-04`（第三方调查令/协助调查通知）
- `regulator-samr-inquiry-2026-04`（监管机构询问，如市场监管部门）
- `preservation-vendor-2026-04`（收到的证据保全通知）

## Workflow

| 类型 | 命令 | 输出 |
|---|---|---|
| 收到律师函 | `/litigation-legal:demand-received [路径]` | triage.md + 可选回应稿 |
| 送达调查令/协助调查通知 | `/litigation-legal:subpoena-triage [路径]` | triage.md + 异议备忘录 |
| 监管机构询问 | *后续技能* | |

每次分流会交叉核对 `matters/_log.yaml` 中的相关事项（同一对方、主题重叠）。如存在相关事项，分流予以标记并提议将此件作为 related_matter 记录添加。如此来件本身应成为受追踪的事项，分流将预填字段后移交 `/matter-intake`。

## Relationship to matters

- 来件 + 与现有事项相关 → 通过 `_log.yaml` 中的 `related_matters` 字段链接；文件留在 `inbound/`。
- 来件 + 应成为事项 → 创建事项；matter.md 交叉链接回 `inbound/[slug]/`。
- 来件 + 已处理并关闭（无需事项） → 作为记录留在 `inbound/`。

## Relationship to outbound

如对来件催告的回应本身是一封对外催告（反催告），分流将预填后移交 `/demand-intake`。该对外催告存于 `demand-letters/`，并交叉链接回此来件文件夹。
