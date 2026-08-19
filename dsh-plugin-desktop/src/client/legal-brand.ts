const PRODUCT_NAME = 'AI法律顾问'
const LEGAL_EXPERT_LABEL = 'AI法务专家'
const BOUNDARY_NOTICE_ID = 'ai-legal-advisor-boundary-notice'
const BRAND_STYLE_ID = 'ai-legal-advisor-brand-style'
const HIDDEN_BUILTIN_PRESET_IDS = new Set(['standard', 'code', 'minimal', 'cordis'])
const HIDDEN_BUILTIN_PRESET_LABELS = ['Standard mode', 'Code mode', 'PTC mode', 'Minimal mode', 'Creator mode', '标准模式', 'PTC 模式', '极简模式', '创造模式'] as const
let boundaryNoticeDismissed = false

const LEGAL_AI_BOUNDARY_ZH = '仅供法律信息整理、风险提示与工作草稿使用，不是律师意见、法律意见、诉讼代理或辩护；输出可能不完整或错误，法律依据、期限、事实和具体案件结论必须由具备相应资质的专业人士复核。请勿直接提交未经脱敏的敏感材料。'
const LEGAL_AI_BOUNDARY_EN = 'For legal information organization, risk spotting, and working drafts only. It is not legal advice, attorney advice, representation, or a defense service. Outputs may be incomplete or wrong; qualified professionals must review laws, deadlines, facts, and case conclusions. Do not submit sensitive material without appropriate redaction.'

const COPY_REPLACEMENTS: readonly [string, string][] = [
  ['DeepSeek Harness 目前的 0.1 版本仍处在面向 Harness 开发者进行测试的阶段，还有许多地方需要持续改进和打磨，希望听取广大开发者的反馈建议。预计 DeepSeek Harness 的核心插件以及基础 API 都会在接下来的一段时间内快速迭代、持续演化。', `欢迎使用 ${PRODUCT_NAME}。本产品用于法律信息整理、风险提示和工作草稿生成，不替代律师或其他具备相应资质的专业人士。\n\n${LEGAL_AI_BOUNDARY_ZH}`],
  ['DeepSeek Harness 目前的 0.1 版本仍处在面向 Harness 开发者进行测试的阶段，还有许多地方需要持续改进和打磨，希望听取广大开发者的反馈建议。预计 DeepSeek Harness 的核心插件以及基础 API 都会在接下来的一段时间内快速迭代、持续演化。', `欢迎使用 ${PRODUCT_NAME}。本产品用于法律信息整理、风险提示和工作草稿生成，不替代律师或其他具备相应资质的专业人士。\n\n${LEGAL_AI_BOUNDARY_ZH}`],
  ['DeepSeek Harness 0.1 remains in testing for Harness developers. Many areas need further improvement, and we welcome feedback from the developer community. DeepSeek Harness\'s core plugins and foundational APIs will continue to evolve rapidly over the coming months.\n\nWe look forward to exploring the limits of intelligence with developers around the world, building on open-source, open, reusable, and composable infrastructure. We welcome Harness developers everywhere to join the DSH plugin ecosystem.', `${PRODUCT_NAME} organizes legal information, highlights risks, and prepares working drafts. It does not replace a lawyer or another qualified professional.\n\n${LEGAL_AI_BOUNDARY_EN}`],
  ['Configure the official DeepSeek provider to start building.', `Configure ${PRODUCT_NAME} to start using the legal workbench.`],
  ['配置 DeepSeek 官方模型，即可开始使用。', `配置 ${PRODUCT_NAME}，即可开始使用。`],
  ['The DeepSeek search provider.', `${PRODUCT_NAME} search service.`],
  ['DeepSeek 搜索提供方。', `${PRODUCT_NAME} 搜索服务。`],
  ['DeepSeek Harness', PRODUCT_NAME],
  ['Into the Unknown', LEGAL_EXPERT_LABEL],
]

function replaceKnownCopy(value: string): string {
  let next = value
  for (const [from, to] of COPY_REPLACEMENTS) next = next.replaceAll(from, to)
  return next
}

function rewriteTextNode(node: Text): void {
  const parent = node.parentElement
  if (parent === null || parent.closest('script, style, code, pre, textarea, input') !== null) return
  const value = node.nodeValue
  if (value === null) return
  const next = replaceKnownCopy(value)
  if (next !== value) node.nodeValue = next
}

function rewriteTextNodes(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    rewriteTextNode(root as Text)
    return
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let current: Node | null
  while ((current = walker.nextNode()) !== null) nodes.push(current as Text)
  for (const node of nodes) rewriteTextNode(node)
}

function rewriteAttributes(root: ParentNode): void {
  const elements = root.querySelectorAll<HTMLElement>('[aria-label], [title], [placeholder]')
  for (const element of elements) {
    for (const name of ['aria-label', 'title', 'placeholder'] as const) {
      const value = element.getAttribute(name)
      if (value === null) continue
      const next = replaceKnownCopy(value)
      if (next !== value) element.setAttribute(name, next)
    }
  }
}

function hideUpstreamHeroPreviewBadge(): void {
  for (const element of document.querySelectorAll<HTMLElement>('[class*="previewBadge"]')) {
    element.setAttribute('aria-hidden', 'true')
  }
}

function markRunningTurnStatus(): void {
  for (const element of document.querySelectorAll<HTMLElement>('[role="status"]')) {
    if ((element.textContent ?? '').includes('Deep diving...')) {
      element.dataset.aiLegalTurnStatus = 'true'
    } else {
      delete element.dataset.aiLegalTurnStatus
    }
  }
}

function hideBuiltInAgentPresets(): void {
  for (const element of document.querySelectorAll<HTMLElement>('li, [role="menuitem"]')) {
    const presetId = element.querySelector('code')?.textContent?.trim() ?? ''
    const text = element.textContent?.trim() ?? ''
    const isHiddenPreset = HIDDEN_BUILTIN_PRESET_IDS.has(presetId)
      || HIDDEN_BUILTIN_PRESET_LABELS.some(label => text.includes(label))
    if (!isHiddenPreset) continue
    const card = element.matches('li') ? element : element.closest<HTMLElement>('li') ?? element
    card.dataset.aiLegalHiddenPreset = 'true'
    card.setAttribute('aria-hidden', 'true')
  }
}

function installBrandStyles(): void {
  if (document.getElementById(BRAND_STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = BRAND_STYLE_ID
  style.textContent = `
    /* The upstream wordmark and whale are decorative brand marks. The product
       surface uses the AI法律顾问 wordmark while upstream notices remain in
       THIRD_PARTY_NOTICES.md and the source distribution. */
    button:has(> svg[viewBox="0 0 182 24"]) {
      min-width: 142px !important;
    }
    button:has(> svg[viewBox="0 0 182 24"]) > svg,
    button:has(> svg[viewBox="0 0 23.16 17.04"]) > svg[viewBox="0 0 23.16 17.04"] {
      display: none !important;
    }
    button:has(> svg[viewBox="0 0 182 24"])::after {
      content: "AI法律顾问";
      display: block;
      overflow: hidden;
      color: currentColor;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: .02em;
      line-height: 24px;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    /* Empty-session HeroShell renders the upstream headline as a plain span,
       not as BrandWordmark. The exact text replacement handles the title;
       hiding the badge leaves a clean AI法律顾问 header beside the icon. */
    [class*="previewBadge"] { display: none !important; }
    #${BOUNDARY_NOTICE_ID} {
      position: fixed;
      right: 16px;
      bottom: 14px;
      z-index: 2147483000;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      max-width: min(680px, calc(100vw - 32px));
      padding: 10px 12px;
      border: 1px solid color-mix(in srgb, #15345f 28%, transparent);
      border-radius: 10px;
      background: color-mix(in srgb, #f7fbff 94%, transparent);
      color: #15345f;
      box-shadow: 0 6px 24px rgb(15 39 73 / 16%);
      font: 12px/1.55 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      backdrop-filter: blur(10px);
    }
    #${BOUNDARY_NOTICE_ID} strong {
      display: block;
      margin-bottom: 2px;
      font-size: 12px;
    }
    #${BOUNDARY_NOTICE_ID} span { display: block; }
    #${BOUNDARY_NOTICE_ID} button {
      flex: none;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 16px;
      line-height: 20px;
    }
    #${BOUNDARY_NOTICE_ID} button:hover { background: rgb(21 52 95 / 10%); }
    [data-ai-legal-hidden-preset="true"] { display: none !important; }
    /* The upstream turn-status module can be remounted after this product layer;
       keep a product-owned shimmer on the running status element as a fallback. */
    [data-ai-legal-turn-status="true"] {
      background: linear-gradient(
        90deg,
        var(--dsw-static-deepseek-500, #315ee7) 0%,
        var(--dsw-static-deepseek-500, #315ee7) 40%,
        var(--dsw-static-deepseek-200, #9bb5ff) 50%,
        var(--dsw-static-deepseek-500, #315ee7) 60%,
        var(--dsw-static-deepseek-500, #315ee7) 100%
      );
      background-position: 100% 0;
      background-size: 250% 100%;
      background-clip: text;
      color: transparent !important;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: ai-legal-turn-status-shimmer 1.8s linear infinite;
    }
    @keyframes ai-legal-turn-status-shimmer {
      to { background-position: 0 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      [data-ai-legal-turn-status="true"] {
        background-position: 0 0;
        background-size: 100% 100%;
        animation: none;
      }
    }
    @media (max-width: 700px) {
      #${BOUNDARY_NOTICE_ID} { right: 8px; bottom: 8px; max-width: calc(100vw - 16px); }
    }
  `
  document.head.append(style)
}

function mountBoundaryNotice(): void {
  if (boundaryNoticeDismissed || document.getElementById(BOUNDARY_NOTICE_ID) !== null) return
  const notice = document.createElement('aside')
  notice.id = BOUNDARY_NOTICE_ID
  notice.setAttribute('role', 'note')
  notice.innerHTML = `<div><strong>${PRODUCT_NAME} · 法律 AI 使用边界</strong><span>${LEGAL_AI_BOUNDARY_ZH}</span></div><button type="button" aria-label="关闭法律 AI 使用边界提示">×</button>`
  notice.querySelector('button')?.addEventListener('click', () => {
    boundaryNoticeDismissed = true
    notice.remove()
  }, { once: true })
  document.body.append(notice)
}

function applyBranding(): void {
  document.title = PRODUCT_NAME
  installBrandStyles()
  rewriteTextNodes(document.body)
  rewriteAttributes(document.body)
  hideUpstreamHeroPreviewBadge()
  hideBuiltInAgentPresets()
  markRunningTurnStatus()
  mountBoundaryNotice()
}

/** Install the product-owned browser brand and legal-use boundary notice. */
export function applyLegalBrand(): () => void {
  const run = (): void => { applyBranding() }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true })
  else run()

  let scheduled = false
  let pendingTimer: ReturnType<typeof setTimeout> | undefined
  const pendingNodes = new Set<Node>()
  const flush = (): void => {
    scheduled = false
    pendingTimer = undefined
    const nodes = [...pendingNodes]
    pendingNodes.clear()
    for (const node of nodes) {
      if (node.isConnected) {
        rewriteTextNodes(node)
        if (node instanceof Element) rewriteAttributes(node)
      }
    }
    if (document.title.includes('DeepSeek')) document.title = PRODUCT_NAME
    hideUpstreamHeroPreviewBadge()
    hideBuiltInAgentPresets()
    markRunningTurnStatus()
    mountBoundaryNotice()
  }
  const enqueue = (node: Node): void => {
    pendingNodes.add(node)
    if (scheduled) return
    scheduled = true
    pendingTimer = setTimeout(flush, 0)
  }
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'childList') {
        for (const node of record.addedNodes) enqueue(node)
      } else if (record.type === 'attributes' && record.target instanceof HTMLElement) {
        enqueue(record.target)
      }
    }
  })
  const observationRoot = document.body ?? document.documentElement
  observer.observe(observationRoot, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder'] })
  return () => {
    observer.disconnect()
    if (pendingTimer !== undefined) clearTimeout(pendingTimer)
    pendingNodes.clear()
    document.getElementById(BRAND_STYLE_ID)?.remove()
    document.getElementById(BOUNDARY_NOTICE_ID)?.remove()
  }
}
