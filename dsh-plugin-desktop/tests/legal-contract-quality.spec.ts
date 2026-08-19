import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const packageRoot = new URL('../', import.meta.url)
const read = (relativePath: string) => readFileSync(new URL(relativePath, packageRoot), 'utf8')
const fixtures = JSON.parse(read('bundled/legal-zh/references/contract-review-regression/fixtures.json')) as {
  cases: Array<{
    id: string
    category: string
    read_status: string
    content: string | null
    source_path?: string
    must_confirm?: string[]
    must_not_be_unknown?: string[]
    must_report?: string[]
    must_cite_clauses?: string[]
    forbidden_in_source?: string[]
    forbidden_in_report?: string[]
    ambiguous_facts?: string[]
    expected_findings?: string[]
  }>
}

const qualityGates = read('bundled/legal-zh/references/contract-review-quality-gates.md')
const reviewSkill = read('bundled/legal-zh/commercial-legal/skills/review/SKILL.md')
const vendorSkill = read('bundled/legal-zh/commercial-legal/skills/vendor-agreement-review/SKILL.md')
const saasSkill = read('bundled/legal-zh/commercial-legal/skills/saas-msa-review/SKILL.md')
const dpaSkill = read('bundled/legal-zh/privacy-legal/skills/dpa-review/SKILL.md')
const commercialAdapter = read('bundled/legal-zh/.dsh/skills/chinese-legal-commercial/SKILL.md')
const privacyAdapter = read('bundled/legal-zh/.dsh/skills/chinese-legal-privacy/SKILL.md')
const personas = [
  'bundled/legal-presets/contract-reviewer/agent.cordis.yml',
  'bundled/legal-presets/legal-chief/agent.cordis.yml',
  'bundled/legal-presets/privacy-compliance/agent.cordis.yml',
  'bundled/legal-presets/dispute-organizer/agent.cordis.yml',
].map(read)

function getCase(id: string) {
  const item = fixtures.cases.find((candidate) => candidate.id === id)
  if (!item) throw new Error(`missing regression case: ${id}`)
  return item
}

describe('contract fact-fidelity regression fixtures', () => {
  it('contains exactly the six required fixed categories', () => {
    expect(fixtures.cases).toHaveLength(6)
    expect(fixtures.cases.map((item) => item.category)).toEqual([
      '简单中文合同',
      'SaaS合同',
      '附件缺失合同',
      '诱导模板样本',
      '长文档样本',
      '读取失败样本',
    ])
  })

  it('keeps confirmed facts and real clause anchors in the simple contract', () => {
    const item = getCase('simple-cn')
    expect(item.read_status).toBe('complete')
    for (const fact of item.must_confirm ?? []) expect(item.content).toContain(fact)
    for (const fact of item.must_not_be_unknown ?? []) expect(item.content).toContain(fact)
  })

  it('pins the SaaS facts that previously regressed into template values', () => {
    const item = getCase('saas-core')
    for (const fact of item.must_confirm ?? []) expect(item.content).toContain(fact)
    for (const clause of item.must_cite_clauses ?? []) expect(item.content).toContain(clause)
    for (const fabricatedFact of item.forbidden_in_report ?? []) {
      expect(item.content).not.toContain(fabricatedFact)
    }
  })

  it('requires explicit attachment disclosure when the正文 cites unavailable attachments', () => {
    const item = getCase('missing-attachments')
    expect(item.content).toContain('本次仅提供主服务协议正文')
    for (const attachmentName of ['数据处理协议', '价格表', 'SLA服务规格']) {
      expect(item.content).toContain(attachmentName)
    }
    expect(qualityGates).toContain('正文已读；以下附件未提供/未读取，因此相关结论不完整。')
    for (const fabricatedFact of item.forbidden_in_report ?? []) {
      expect(item.content).not.toContain(fabricatedFact)
    }
  })

  it('guards the negative template-injection sample against fabricated facts', () => {
    const item = getCase('template-injection-negative')
    for (const token of item.forbidden_in_source ?? []) expect(item.content).not.toContain(token)
    for (const missingFact of item.must_report ?? []) {
      expect(['金额缺失', '付款机制缺失', 'SLA缺失', '附件缺失', '知识产权归属待核实']).toContain(missingFact)
    }
  })

  it('preserves both sides of a long-document conflict and its source clauses', () => {
    const item = getCase('long-conflict')
    for (const fact of item.must_report ?? []) expect(item.content).toContain(fact)
    for (const clause of item.must_cite_clauses ?? []) expect(item.content).toContain(clause)
    expect(item.expected_findings).toEqual(expect.arrayContaining(['第三条与第十二条存在冲突', '第三十三条附件未提供']))
    expect(item.ambiguous_facts).toContain('SLA可用性')
  })

  it('blocks the read-failure fixture before any complete-looking report', () => {
    const item = getCase('read-failure')
    expect(item.read_status).toBe('failed')
    expect(item.content).toBeNull()
    expect(item.source_path).toContain('does-not-exist')
    for (const forbiddenText of item.forbidden_in_report ?? []) {
      expect(item.content ?? '').not.toContain(forbiddenText)
    }
    expect(item.must_report).toEqual(expect.arrayContaining(['文件读取失败', '不得生成完整审查报告']))
  })
})

describe('contract quality-gate wiring', () => {
  it('defines the structured ledger and all six delivery gates', () => {
    for (const token of [
      'read_status',
      'source_id',
      'attachments',
      'confirmed|missing|ambiguous|assumed',
      'Gate 1：文件读取与覆盖门禁',
      'Gate 2：事实完整性门禁',
      'Gate 3：真实条款引用门禁',
      'Gate 4：反模板污染与关键事实一致性',
      'Gate 5：法律结论与谈判立场门禁',
      'Gate 6：交付前三问',
      '100%',
      '50%+50%',
      '99.9%',
    ]) expect(qualityGates).toContain(token)
  })

  it('wires the fixed route and source-bound output into each skill', () => {
    for (const document of [reviewSkill, commercialAdapter]) {
      expect(document).toContain('事实账本')
      expect(document).toContain('vendor')
      expect(document).toContain('SaaS')
      expect(document).toContain('DPA')
      expect(document).toMatch(/quality_gates|质量门禁|quality gates/u)
    }
    expect(vendorSkill).toContain('步骤0：读取、确认覆盖范围并建立合同事实账本')
    expect(vendorSkill).toContain('Gate 1')
    expect(vendorSkill).toContain('Gate 6')
    expect(saasSkill).toContain('三态结果')
    expect(saasSkill).toContain('原文存在')
    expect(saasSkill).toContain('附件引用未提供')
    expect(dpaSkill).toContain('共享合同事实账本')
    expect(dpaSkill).toContain('训练模型用途')
    expect(privacyAdapter).toMatch(/共享 DPA 事实账本|shared DPA fact ledger|fact ledger/u)
  })

  it('puts the five hard anti-hallucination rules into all four runtime personas', () => {
    const ruleAlternatives = [
      /事实优先|原始材料优先|合同\/DPA 事实优先/u,
      /读取失败即停|读取失败|文件为空.*先停|文件访问失败/u,
      /禁止虚构原文/u,
      /逐条可回指/u,
      /输出前校验/u,
    ]
    for (const persona of personas) {
      for (const rule of ruleAlternatives) expect(persona).toMatch(rule)
    }
  })
})
