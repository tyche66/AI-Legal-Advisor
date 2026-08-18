---
name: chinese-legal-tax
description: "Use when the user needs Chinese legal work in the 税务合规与筹划 domain: 主体税负分流、增值税法、发票合规、金税四期、三流一致、虚开逃税红线、合法节税、税收优惠、小微与研发加计、核定征收、社保入税、税务筹划红线、税务法. This is a Codex adapter for claude-for-legal-ZH/tax-legal; it routes natural-language requests to the original domain CLAUDE.md and skills/*/SKILL.md workflows."
---

# 税务合规与筹划 Codex Adapter

This skill lets Codex use the original `claude-for-legal-ZH/tax-legal` content without requiring Claude Code slash commands.

## Source Files

- Domain root: `tax-legal`
- Domain profile template and shared rules: `tax-legal/CLAUDE.md`
- Original skills directory: `tax-legal/skills`
- Original plugin description: 面向老板与创业者的税务合规工作流：主体税负分流、发票与金税四期合规审查、合法节税与逃税红线审查、税收优惠与政策红利梳理。所有税率、起征点、优惠额度均须运行时检索官方公告后引用，绝不硬编码。每项输出均为供律师/注册税务师复核的草稿，而非税务意见。

## How To Use

1. Read `tax-legal/CLAUDE.md` before substantive work.
2. Select the closest original skill from the list below, then read its `SKILL.md`.
3. Follow that skill's workflow, translating Claude Code slash-command wording into Codex actions and natural conversation.
4. If multiple original skills apply, execute them in the order implied by the workflow and merge the result.
5. Do not run Claude-specific plugin commands. Ignore Claude hooks. Use Codex tools for local files, web verification, document rendering, and user-visible output.

## Configuration Compatibility

The original project stores setup profiles under `~/.claude/plugins/config/...`. For Codex, use this order:

1. If a populated Claude profile exists, read it as the user's existing practice profile.
2. Otherwise use or create `~/.codex/legal-zh/tax-legal/CLAUDE.md` for Codex-specific setup.
3. If the selected skill requires setup and the profile still contains `[PLACEHOLDER]`, run the domain's `cold-start-interview` workflow in conversation before producing customized legal work.

When an original instruction says to run `/tax-legal:some-command`, interpret that as: load `skills/some-command/SKILL.md` and perform the workflow in Codex.

## Available Original Skills

`cold-start-interview`, `customize`, `entity-tax-triage`, `incentive-finder`, `invoice-compliance-review`, `matter-workspace`, `tax-planning-guardrails`

## Legal Output Rules

- Treat all output as lawyer-review draft work, not legal advice replacing professional judgment.
- Mark uncertain legal citations or case references as requiring verification unless verified from a reliable source in this session.
- For current law, regulatory updates, case retrieval, filing requirements, deadlines, or other time-sensitive legal facts, verify with current sources before relying on them.
- Preserve the original workflow's escalation, approval, confidentiality, and source-labeling requirements.
