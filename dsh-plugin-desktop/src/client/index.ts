import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type convergence only: locale/theme declarations expose settings slot rows.
// The desktop client does not load or register a settings surface.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import { BalanceCard, type BalanceCardInjected } from './deepseek-balance.tsx'
import { applyAdvancedShell } from './advanced-shell.ts'
import { startRendererBootReporter } from './boot-health.ts'
import { parseDesktopClientEnvironment } from './environment.ts'
import { applyLegalBrand } from './legal-brand.ts'

export { applyAdvancedShell } from './advanced-shell.ts'
export {
  RENDERER_BOOT_REPORT_PATH,
  rendererBootReport,
  sendRendererBootReport,
  startRendererBootReporter,
} from './boot-health.ts'
export type { RendererBootLoader, RendererBootReport } from './boot-health.ts'
export { parseDesktopClientEnvironment } from './environment.ts'
export type { DesktopClientEnvironment, DesktopClientMode, DesktopClientPlatform } from './environment.ts'

/** Services required by advanced presentation. */
export const inject = [
  'slots',
  'sessions',
  'theme',
  'connection',
]

/** Register desktop-owned client surfaces for the current BrowserWindow mode. @param ctx - browser Cordis context. */
export function apply(ctx: ClientContext): void {
  const environment = parseDesktopClientEnvironment(window.location.search)
  ctx.effect(
    () => startRendererBootReporter(ctx.loader),
    'dsh-plugin-desktop: renderer boot health report',
  )
  ctx.effect(
    () => applyLegalBrand(),
    'dsh-plugin-desktop: AI法律顾问 brand and legal boundary',
  )
  const connection = ctx.get('connection') as unknown as BalanceCardInjected['connection']
  const slots = ctx.slots as unknown as {
    inject: (name: string, factory: () => unknown) => unknown
    register: (
      options: { name: string; id: string; order: number; inject: () => BalanceCardInjected },
      component: typeof BalanceCard,
    ) => unknown
  }
  slots.inject('sidebar.footer.action', () => slots.register({
    name: 'sidebar.footer.action',
    id: 'ai-legal-advisor-deepseek-balance',
    order: 0,
    inject: () => ({ connection }),
  }, BalanceCard))
  if (environment.mode === 'advanced') applyAdvancedShell(ctx, environment)
}
