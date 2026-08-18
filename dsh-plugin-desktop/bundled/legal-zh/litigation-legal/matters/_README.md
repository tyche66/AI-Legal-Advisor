# matters/ — 案件组合数据

本文件夹存放案件组合。两层结构：

- **`_log.yaml`** — 台账。每个事项一行。可被技能解析。汇总的权威来源。
- **`[slug]/`** — 逐事项细节。叙述与历史。供人阅读与编辑之处。

## Layout

```
matters/
├── _log.yaml                  # 台账（所有事项，含已关闭）
├── _README.md                 # 本文件
└── [matter-slug]/
    ├── matter.md              # 叙述式接洽 + 主张理论 + 态势
    └── history.md             # 仅追加的事件日志
```

## Slug 约定

小写、连字符、年份置尾。示例：
- `contract-dispute-acme-2026`
- `samr-inquiry-2026`
- `employment-smith-2026`

年份使 slug 稳定，即便日后出现类似事项。文件夹名与 slug 完全一致。

## Who writes what

| 文件 | 由谁写入 | 可直接编辑？ |
|---|---|---|
| `_log.yaml` | `/matter-intake`、`/matter-update`、`/matter-close` | 可以，但须在该事项的 `history.md` 中反映变更 |
| `matter.md` | 接洽时由 `/matter-intake` 写入；由 `/matter-close` 追加 | 可以，用于演进中的主张理论／态势备注 |
| `history.md` | `/matter-intake` 初始化；`/matter-update` 与 `/matter-close` 追加 | 实践中仅追加——将既往记录视为记录 |

## Closed matters

留在此处。不要删除。`/portfolio-status` 默认将其从活跃汇总中过滤；`/portfolio-status --all` 会纳入。已关闭事项是案件组合判断的训练集。

## Corrections

如某条历史记录有误，不要编辑。追加一条引用并更正它的新记录。更正的记录与更正本身同样重要。
