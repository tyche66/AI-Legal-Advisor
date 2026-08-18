---
name: cold-start-interview
description: >
  税务实务画像冷启动访谈——首次使用时建立你的经营主体、纳税人身份、开票模式、
  税务顾问与风险偏好画像。当用户说"设置""初始化税务插件""cold-start""第一次用"
  或运行 /tax-legal:cold-start-interview 时使用。
argument-hint: "[--redo | --check-integrations]"
---

# /tax-legal:cold-start-interview

## 何时运行
用户首次使用税务插件，或运行 `/tax-legal:cold-start-interview`。目的：把 `CLAUDE.md` 模板中的 `[PLACEHOLDER]` 替换为真实画像，供每项技能读取。

## 需要做什么

1. **读取现有配置。** 读 `~/.claude/plugins/config/claude-for-legal-zh/tax-legal/CLAUDE.md` 与上级 `company-profile.md`。若已填充且非 `--redo`，提示改用 `/tax-legal:customize` 修改单项。
2. **采集画像（逐组提问，一次少量）：**
   - **主体与税负：** 经营主体类型（有限/OPC/个独/合伙/个体户）、行业、规模（营收/人数）、股东结构、增值税身份（小规模/一般）、所得税征收方式（查账/核定）。
   - **开票模式：** 自开专票/普票 / 代开 / 平台代开；进项来源与抵扣情况；已知历史风险动作。
   - **专业支持：** 财务由谁负责（内部会计/代账/事务所）；有无注册税务师/税务律师；升级联系人。
   - **风险偏好：** 保守/中性/激进；老板最关心的税负痛点。
   - **主管与历史：** 主管税务机关、未结稽查/争议。
   - **集成：** 文档存储、飞书/Slack、yuandian 是否可用（`--check-integrations` 仅重测集成）。
3. **写入配置。** 将答案填入 CLAUDE.md 对应节，展示写入内容并确认。不把敏感涉税数据、账号、凭证写入仓库或共享位置。
4. **收尾：** 建议下一步运行 `/tax-legal:entity-tax-triage` 或 `/tax-legal:incentive-finder`。

## 备注
- 一切以"供律师/注册税务师复核的草稿"定位，访谈中不给具体税额结论。
- 若用户是服务多客户的执业者，询问是否启用事项工作区（见 `matter-workspace`）。
