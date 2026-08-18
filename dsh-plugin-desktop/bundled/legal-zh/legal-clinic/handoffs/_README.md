# handoffs/ — 学期末案件交接备忘录

按学期设文件夹，每个活跃案件一份交接备忘录。由 `/legal-clinic:semester-handoff` 在学期末生成。接手学生在 `/ramp` 期间就其继承的案件读取。

## Layout

```
handoffs/
├── _README.md                             # 本文件
└── [YYYY-学期]/                           # 如 2026-spring, 2026-fall
    ├── _summary.md                        # 跨案件汇总：什么在移交、谁交给谁
    ├── [case-id].md                       # 每个活跃案件一份
    └── ...
```

## Slug / 文件夹命名约定

学期文件夹：`[年份]-[spring|summer|fall]`。示例：
- `2026-spring`
- `2026-summer`
- `2026-fall`

案件备忘录：使用 case_id（来自 `deadlines.yaml` 或接待记录）。与该案件的其他文件保持一致。

## What a handoff memo contains

- 案件摘要（事实、实践领域、当前态势）
- 离任学生姓名 + 与当事人建立的关系（如相关）
- 待决期限（取自 `deadlines.yaml`）
- 未决问题／待定决策
- 沟通历史（取自 `client-comms/[case-id]/log.md`）
- 迄今起草／提交的文书（指向案件文件的指针）
- 接手学生首先需要了解／做的事
- 指导老师对接手学生的提示（如有）

## Workflow

1. `/legal-clinic:semester-handoff` 由指导老师（或离任学生就自己的案件）在学期结束前约 1-2 周运行。
2. 输出逐案备忘录 + 汇总。
3. 接手届学生在下学期初运行 `/legal-clinic:ramp`；`/ramp` 为每位新学生所分配的案件浮现交接备忘录。

## Retention

交接备忘录留存于磁盘。历史交接对诊所自身的案件移交记录、以及学生查看案件如何跨学期演变均有用。
