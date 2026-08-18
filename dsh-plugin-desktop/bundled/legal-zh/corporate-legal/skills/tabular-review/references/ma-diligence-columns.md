# 并购尽职调查 — 标准列集

买方对标的合同进行审查的默认列集。以此为起点，再根据交易实际增删列。这是起点而非检查清单——真正重要的内容由收购协议的陈述与保证条款和尽调需求清单驱动。

*说明：下方 YAML 的 `id` 为程序标识符（表格引擎按此列名读取），保持英文键名；`label`（列名）与 `prompt`（取数指令）为中文。分类项 `options` 使用英文枚举值，含义见列名与指令。*

```yaml
schema:
  name: "并购尽职调查 — 标准列集"
  columns:
    - id: counterparty
      label: "合同相对方"
      type: verbatim
      prompt: "标的主体以外的缔约方名称，按合同原文准确记录。"

    - id: agreement_type
      label: "合同类型"
      type: classify
      options: [framework_agreement, purchase_order, license_in, license_out, lease, services, supply, distribution, nda, joint_venture, loan, guaranty, labor, other]
      prompt: "这是何种合同？（框架协议/采购订单/许可引进/许可输出/租赁/服务/供货/经销/保密/合资合作/借款/担保/劳动/其他）"

    - id: effective_date
      label: "生效日期"
      type: date
      prompt: "合同何时生效？"

    - id: term
      label: "合同期限"
      type: duration
      prompt: "初始期限是多长？"

    - id: auto_renewal
      label: "自动续期"
      type: classify
      options: [none, annual, fixed_period, evergreen]
      prompt: "合同是否自动续期？按何种周期？"

    - id: termination_for_convenience
      label: "任意解除权"
      type: classify
      options: [none, either_party, target_only, counterparty_only]
      prompt: "是否约定无需理由即可解除？哪一方享有？（注意与法定解除权《民法典》第563条的区分）"

    - id: termination_notice
      label: "解除通知期"
      type: duration
      prompt: "解除合同需提前多久通知？"

    - id: change_of_control
      label: "控制权变更"
      type: classify
      options: [silent, consent_required, consent_not_unreasonably_withheld, automatic_termination, notice_only, counterparty_right_to_terminate]
      prompt: "合同是否就标的主体的控制权变更作出约定？触发条件与后果为何？"

    - id: assignment
      label: "合同转让"
      type: classify
      options: [silent, consent_required, consent_not_unreasonably_withheld, freely_assignable, assignable_to_affiliates, non_assignable]
      prompt: "标的主体能否转让本合同？有何限制？（合同权利义务转让须符合《民法典》第545、551条）"

    - id: exclusivity
      label: "独家/竞业限制"
      type: classify
      options: [none, exclusive_supplier, exclusive_customer, non_compete, non_solicit, territory_restriction, most_favored_nation]
      prompt: "合同是否限制任一方与他人竞争或缔约？（注意排他/独家安排的反垄断合规风险）"

    - id: liability_cap
      label: "责任上限"
      type: currency
      prompt: "是否约定责任上限？金额或倍数为何？"

    - id: indemnification
      label: "赔偿/补偿"
      type: classify
      options: [none, mutual, target_indemnifies, counterparty_indemnifies, ip_only, third_party_claims_only]
      prompt: "由谁向谁赔偿、就何种事项赔偿？"

    - id: governing_law
      label: "适用法律"
      type: verbatim
      prompt: "合同约定适用哪一法域的法律？（中国大陆法/港澳台/境外——如非中国大陆法须标记）"

    - id: dispute_resolution
      label: "争议解决"
      type: classify
      options: [litigation, arbitration_institutional, arbitration_adhoc, mediation_first, silent]
      prompt: "争议如何解决？（诉讼/机构仲裁如CIETAC/BAC/临时仲裁/先行调解/未约定）约定仲裁的须记录仲裁机构与仲裁地。"

    - id: most_favored_nation
      label: "最惠待遇/价格保护"
      type: classify
      options: [none, mfn_pricing, price_matching, benchmarking_right]
      prompt: "是否约定最惠待遇或价格保护条款？"

    - id: minimum_commitments
      label: "最低采购/量的承诺"
      type: currency
      prompt: "是否约定最低采购额、最低数量或最低消费承诺？"

    - id: ip_ownership
      label: "知识产权归属"
      type: classify
      options: [each_owns_own, target_owns_work_product, counterparty_owns_work_product, joint, license_only, silent]
      prompt: "合同项下创造或使用的知识产权归谁所有？（职务成果归属注意《专利法》第6条、《著作权法》第18条）"

    - id: confidentiality_term
      label: "保密义务存续期"
      type: duration
      prompt: "合同终止后保密义务存续多久？"

    - id: insurance_requirements
      label: "保险要求"
      type: classify
      options: [none, general_liability, professional_liability, cyber, product_liability, employer_liability]
      prompt: "合同要求投保何种商业保险？（一般责任/职业责任/网络安全/产品责任/雇主责任等；注意工伤由法定社保覆盖，非合同保险事项）"

    - id: audit_rights
      label: "审计/核查权"
      type: classify
      options: [none, counterparty_may_audit_target, target_may_audit_counterparty, mutual]
      prompt: "任一方是否享有审计或核查权？"

    - id: notices
      label: "通知条款"
      type: verbatim
      prompt: "标的主体的通知地址与送达方式为何？"
```

## 按交易类型的常见增列

- **科技/知识产权密集型标的：** 源代码托管、开源许可合规、数据权利、AI 模型训练数据使用权、API 接入权限、数据出境安排
- **医疗/生命科学：** 药品/医疗器械注册证、与国家药监局（NMPA）的往来、临床试验义务、受试者数据与人类遗传资源合规、个人信息保护合规
- **涉政府/国资标的：** 政府采购合同的转让/变更审批、国有资产处置与评估备案、涉密资质与保密义务、军工/国防相关准入、上级主管部门审批
- **不动产：** 续租选择权、租金递增、物业管理费分摊、租赁登记备案、抵押权与承租人优先购买权、租赁期限是否超过20年（《民法典》第705条）
- **受监管金融：** 金融监管审批条件、资本充足要求、证监会/中国人民银行/国家金融监督管理总局的备案或核准触发、反洗钱合规

## 快速初筛的常见减列

在时间紧张的初步筛查中，以下 6 列可回答早期交易 80% 的问题：counterparty、effective_date、term、change_of_control、assignment、termination_for_convenience。先跑这几列，待交易团队排定优先级后再扩展列集。
