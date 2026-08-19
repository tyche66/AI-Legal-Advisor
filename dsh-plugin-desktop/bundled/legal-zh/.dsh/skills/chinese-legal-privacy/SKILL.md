---
name: chinese-legal-privacy
description: "Use when the user needs Chinese legal work in the 数据合规与隐私 domain: 个人信息保护影响评估、PIPL、数据处理协议、DSAR、隐私政策、数据合规差距、数据出境和隐私合规. This is a DeepSeek Harness (dsh) adapter for claude-for-legal-ZH/privacy-legal; it routes natural-language requests to the original domain CLAUDE.md and skills/*/SKILL.md workflows."
---

# 数据合规与隐私 DeepSeek Harness Adapter

This skill lets DeepSeek Harness (`dsh`) use the original `claude-for-legal-ZH/privacy-legal` content without requiring Claude Code slash commands.

## Source Files

- Domain root: `privacy-legal`
- Domain profile template and shared rules: `privacy-legal/CLAUDE.md`
- Original skills directory: `privacy-legal/skills`
- Original plugin description: 个人信息保护实务：处理活动分类、生成个人信息保护影响评估（个保法第55条）、审查个人信息处理协议（作为处理者或受托处理者）、在法定期限内起草个人信息主体权利响应（个保法第44-50条）、监测隐私政策与实践之间的偏差。
- Shared contract/DPA quality gates: `references/contract-review-quality-gates.md`（事实账本、读取阻断、引用回指和交付前三问）。

## Path Resolution

The repository-relative paths above resolve against the `claude-for-legal-ZH` repository root:

- If the current workspace contains the repository, resolve them against the repository root directly.
- Otherwise (user-level install), run `cat ~/.dsh/legal-zh/repo` once to get the absolute repository path recorded by `scripts/install-dsh.sh`, then prefix the relative paths with it.

## How To Use

1. Read `privacy-legal/CLAUDE.md` and, for DPA/contract work, `references/contract-review-quality-gates.md` before substantive work.
2. Acquire the user file and record source ID, parser status, reading scope and attachment status before analysis.
3. Build the shared DPA fact ledger before clause review; every role, purpose, data category, subject category, location, subprocessor, cross-border path, incident window, deletion/return, audit and training-use fact must have a source and status.
4. Select the closest original skill from the list below, then read its `SKILL.md`.
5. Follow that skill's workflow. For DPA/contract inputs, block on read failure or missing critical attachments unless the user explicitly chooses `[临时模式]`.
6. If multiple original skills apply, merge only source-bound findings and preserve attachment/read-scope states; run the shared quality-gate three questions before delivery.
7. Do not run Claude-specific plugin commands. Ignore Claude hooks. Use dsh filesystem, shell, web, and MCP tools for local files, verification, document rendering, and user-visible output.

## Configuration Compatibility

The original project stores setup profiles under `~/.claude/plugins/config/...`. For DeepSeek Harness, use this order:

1. If a populated Claude profile exists, read it as the user's existing practice profile.
2. Otherwise use or create `~/.dsh/legal-zh/privacy-legal/CLAUDE.md` for dsh-specific setup.
3. If the selected skill requires setup and the profile still contains `[PLACEHOLDER]`, run the domain's `cold-start-interview` workflow in conversation before producing customized legal work.

When an original instruction says to run `/privacy-legal:some-command`, interpret that as: load `privacy-legal/skills/some-command/SKILL.md` and perform the workflow in dsh.

## Legal Retrieval MCP

If the active dsh profile mounts the `chineselaw` or `yuandian` MCP servers (see `INSTALL_DSH.md`), prefer `mcp__chineselaw__*` and `mcp__yuandian__*` tools for statute, case, and regulatory verification. Without them, mark time-sensitive legal facts as requiring verification before reliance.

## Available Original Skills

`cold-start-interview`, `customize`, `dpa-review`, `dsar-response`, `matter-workspace`, `pia-generation`, `policy-monitor`, `reg-gap-analysis`, `use-case-triage`

## Legal Output Rules

- Treat all output as lawyer-review draft work, not legal advice replacing professional judgment.
- Mark uncertain legal citations or case references as requiring verification unless verified from a reliable source in this session.
- For current law, regulatory updates, case retrieval, filing requirements, deadlines, or other time-sensitive legal facts, verify with current sources before relying on them.
- Preserve the original workflow's escalation, approval, confidentiality, and source-labeling requirements.
- If file access fails or a quality gate fails, deliver only the failure state and remediation options; never produce a complete-looking DPA or compliance conclusion.
