# oc-status/ — 每周对方律师状态问询草稿

`/litigation-legal:oc-status` 的输出。按天分文件夹；每个文件夹含每个起草事项一份 markdown 文件，外加一份 `_summary.md`。

## Layout

```
oc-status/
├── _README.md                       # 本文件
└── [YYYY-MM-DD]/
    ├── _summary.md                  # 运行了什么、跳过了什么及原因
    ├── [slug-1].md                  # 每个事项一份邮件草稿
    ├── [slug-2].md
    └── ...
```

当邮件 MCP 已认证时，也会在用户收件箱中创建邮件草稿。markdown 文件是持久记录；邮件草稿是行动层。

## Cadence

按排程时为每周（周一上午）。用 `/litigation-legal:oc-status --setup-schedule` 注册排程。

随时可临时运行 `/litigation-legal:oc-status`（默认过滤器）或 `/litigation-legal:oc-status --slug=[slug]`（单个事项）。

## Housekeeping

旧的按日文件夹会累积。在对方律师回复且事项历史更新后，便无需保留。超过 30 天的可放心删除。
