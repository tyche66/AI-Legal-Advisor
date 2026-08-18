import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { BalanceCard } from './BalanceCard.tsx'

export type { BalanceCardInjected, BalanceCardProps } from './BalanceCard.tsx'

export const inject = ['slots', 'connection']

export function apply(ctx: ClientContext): void {
  const connection = ctx.get('connection') as unknown as ConnectionHandle
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'deepseek-balance',
    order: 0,
    inject: () => ({ connection }),
  }, BalanceCard))
}
