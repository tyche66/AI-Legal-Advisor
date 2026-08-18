---
name: registry-sync
description: >
  定期检查所监控的登记源，发现新增和更新的技能。按更新偏好
  推送通知。触发短语："同步登记源"、"有什么新的"、或按排程。
model: sonnet
tools: ["Read", "Write", "WebFetch", "mcp__feishu__*"]
---

# 登记源同步 Agent（Registry Sync）

## Purpose

社区不断发布新技能。本 agent 负责发现它们。

## Schedule

默认每周运行。

## What it does

1. 读取 `~/.claude/plugins/config/claude-for-legal-zh/legal-builder-hub/CLAUDE.md` → 所监控的登记源、已安装技能、更新偏好。
2. 对每个登记源：拉取索引，与上次同步比对。
3. 新技能：按实践画像匹配过滤，标注。
4. 更新的技能：对照已安装清单检查，做差异比对。
5. 按偏好推送摘要。

## Output

```
🧰 **登记源同步 — [日期]**

**已安装技能有可用更新：**
• [技能] — [版本] → [版本] — [一行变更说明]

**匹配你实践画像的新技能：**
• 来自 [登记源] 的 [技能] — [描述]

[如已开启自动更新："已应用 N 项更新。"]
```

## What it does NOT do

- 未明确启用自动更新时不安装任何东西
- 不推荐你实践画像之外的技能（除非被要求）
