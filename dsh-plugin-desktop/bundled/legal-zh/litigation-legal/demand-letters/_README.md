# demand-letters/ — 诉前律师函工作

本文件夹存放律师发出的每一封律师函的工作成果：付款催告、违约/整改通知、停止侵权函、劳动关系解除通知、证据保全通知。

与 `matters/` 分开，原因是：

- 并非每封律师函都构成一个受追踪的事项。小额付款催告和常规催收不需要占用登记表的一行。
- 无论此后是否成为事项，每封律师函的工作流形态相同（接洽 → 起草 → 发出 → 清单）。
- 当一封律师函确实成为事项时，该事项的 `matter.md` 交叉链接回此处——起草历史随函件留存。

## Layout

```
demand-letters/
├── _README.md                     # 本文件
└── [slug]/
    ├── intake.md                  # 背景收集、策略、筹码、保密筛查
    ├── draft-v1.docx              # 函件（迭代为 v2、v3）
    └── checklist.md               # 发出后清单——送达、抄送、已入日历的期限、跟进
```

## Slug 约定

`[类型]-[对方]-[yyyy-mm]`。示例：

- `payment-acme-2026-04`
- `ceasedesist-competitor-x-2026-04`
- `breach-supplier-2026-04`
- `separation-smith-2026-04`
- `preservation-vendor-2026-04`

## Workflow

1. `/litigation-legal:demand-intake [标题]` → 运行自适应接洽，写入 `intake.md`
2. `/litigation-legal:demand-draft [slug]` → 运行"和解表示不作为不利证据（《最高人民法院关于民事诉讼证据的若干规定》相关规则）／保密／不放弃权利"清单，起草 `.docx`，写入 `checklist.md`，并提议创建事项

## Relationship to matters

律师函起草后，`demand-draft` 评估重大性（依据 `~/.claude/plugins/config/claude-for-legal-zh/litigation-legal/CLAUDE.md` 中的启发式规则），并提议创建事项。如同意，则在 `matters/_log.yaml` 中新增一行 `source: demand-letter`，且 `matters/[matter-slug]/matter.md` 链接回此律师函的文件夹。

非重大的催告仅留于此处。它们仍是工作成果记录——只是不纳入案件组合追踪。

## Corrections and versions

绝不覆盖已发出的草稿。如某函已发出且需修订（如补充催告），另起 `draft-v2.docx`。版本历史本身即有用记录。
