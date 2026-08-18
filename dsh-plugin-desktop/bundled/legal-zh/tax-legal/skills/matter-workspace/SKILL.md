---
name: matter-workspace
description: >
  管理事项工作空间——新建、列表、切换、关闭或脱钩（实务级）。
  当你为多个客户或多个主体的税务事项工作、需要防止一个事项的上下文泄漏到另一个时使用。
argument-hint: "<new | list | switch | close | none> [事项简称]"
---

# /matter-workspace

为多个客户/多个主体做税务工作时，事项工作空间将每个客户或主体的上下文独立保持。

## 子命令
- `/tax-legal:matter-workspace new <事项简称>` —— 新建事项，运行简短收案，写入 `matter.md`
- `/tax-legal:matter-workspace list` —— 列出事项含状态与活跃标记
- `/tax-legal:matter-workspace switch <事项简称>` —— 设置活跃事项
- `/tax-legal:matter-workspace close <事项简称>` —— 归档事项（移至 `matters/_archived/`，绝不删除）
- `/tax-legal:matter-workspace none` —— 脱离活跃事项，仅在实务级工作

## 指令
1. 读 `~/.claude/plugins/config/claude-for-legal-zh/tax-legal/CLAUDE.md`，确认 `## 事项工作区` 已填充。若 `已启用` 为 `✗`，告知："事项工作区已关闭——您被配置为企业自用，插件自动以实务级上下文运行。如实际服务多客户，请重跑 `/tax-legal:cold-start-interview --redo` 选择执业设置。"不报错——关闭是企业自用的预期状态。
2. 按 `$ARGUMENTS` 第一个标记分发：
   - `new` → 收案访谈（客户/主体、税务专项、纳税人身份、关注问题），写入 `matters/<事项简称>/matter.md`，播种 `history.md`、`notes.md`。
   - `list` → 枚举 `matters/*/matter.md`，打印表格标记活跃。
   - `switch` → 更新实务级 CLAUDE.md 的 `活跃事项:` 行。
   - `close` → 将 `matters/<事项简称>/` 移至 `matters/_archived/<事项简称>/`，在 `history.md` 记录关闭日期。
   - `none` → 将 `活跃事项:` 设为 `无 — 仅实务级上下文`。
3. 写入前向用户展示变更并确认。

## 备注
除非 `跨事项上下文` 为 `开`，否则绝不读取其他事项的文件——涉税信息敏感，防止客户/主体间上下文串扰。
