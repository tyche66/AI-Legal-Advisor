import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { SidebarFooterActionOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { BalanceSnapshot } from '../index.ts'
import css from './BalanceCard.module.css'

const MIN_TIMER_MS = 1_000
const MAX_TIMER_MS = 30 * 60 * 1_000

export interface BalanceCardInjected {
  readonly connection: ConnectionHandle
}

export type BalanceCardProps = SidebarFooterActionOwnerProps & BalanceCardInjected

function isSnapshot(value: unknown): value is BalanceSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<BalanceSnapshot>
  return (candidate.status === 'ready' || candidate.status === 'idle'
    || candidate.status === 'error' || candidate.status === 'unconfigured')
    && Array.isArray(candidate.currencies)
    && typeof candidate.nextQueryAt === 'number'
}

function money(currency: 'CNY' | 'USD', value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function statusLabel(snapshot: BalanceSnapshot | undefined): string {
  if (snapshot?.status === 'unconfigured') return '未配置 DeepSeek API Key'
  if (snapshot?.status === 'error') return snapshot.error ?? '余额查询失败'
  if (snapshot?.status === 'idle') return '等待最近 30 分钟内的 DeepSeek 调用'
  return snapshot?.fetchedAt === undefined ? '等待首次查询' : '余额已更新'
}

function queryTime(snapshot: BalanceSnapshot | undefined): string {
  if (snapshot?.fetchedAt === undefined) return '尚未成功查询'
  return `最近查询 ${new Date(snapshot.fetchedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

export function BalanceCard({ wide, connection }: BalanceCardProps) {
  const [snapshot, setSnapshot] = useState<BalanceSnapshot>()
  const [busy, setBusy] = useState(false)
  const snapshotRef = useRef<BalanceSnapshot>()
  const busyRef = useRef(false)

  const refresh = useCallback(async (): Promise<BalanceSnapshot | undefined> => {
    if (busyRef.current) return snapshotRef.current
    busyRef.current = true
    setBusy(true)
    try {
      const result = await connection.rpc.call('/api', 'deepseek-balance/get', {})
      if (!result.ok || !isSnapshot(result.value)) {
        const failed: BalanceSnapshot = {
          status: 'error', currencies: [], nextQueryAt: Date.now() + 5 * 60 * 1_000,
          error: result.ok ? '余额响应格式无效' : result.error.message,
        }
        snapshotRef.current = failed
        setSnapshot(failed)
        return failed
      }
      snapshotRef.current = result.value
      setSnapshot(result.value)
      return result.value
    } catch (error: unknown) {
      const failed: BalanceSnapshot = {
        status: 'error', currencies: [], nextQueryAt: Date.now() + 5 * 60 * 1_000,
        error: error instanceof Error ? error.message : '余额请求失败',
      }
      snapshotRef.current = failed
      setSnapshot(failed)
      return failed
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }, [connection])

  useEffect(() => {
    let disposed = false
    let timer: number | undefined
    const schedule = (next: BalanceSnapshot | undefined): void => {
      if (disposed) return
      const target = next?.nextQueryAt ?? Date.now() + 5 * 60 * 1_000
      const delay = Math.max(MIN_TIMER_MS, Math.min(MAX_TIMER_MS, target - Date.now()))
      timer = window.setTimeout(() => {
        void poll()
      }, delay)
    }
    const poll = async (): Promise<void> => {
      const next = await refresh()
      schedule(next)
    }
    void poll()
    return () => {
      disposed = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [refresh])

  const title = useMemo(() => `${statusLabel(snapshot)}；${queryTime(snapshot)}。点击立即检查`, [snapshot])

  if (!wide) {
    const first = snapshot?.currencies[0]
    return (
      <button type="button" className={css.railButton} title={title} aria-label={title} onClick={() => { void refresh() }}>
        <span className={css.railGlyph}>{first?.currency === 'USD' ? '$' : '¥'}</span>
        {first !== undefined && <span className={css.railValue}>{first.totalBalance.toFixed(2)}</span>}
      </button>
    )
  }

  return (
    <button type="button" className={css.card} title={title} aria-label={title} onClick={() => { void refresh() }}>
      <div className={css.heading}>
        <span className={css.label}>API 余额</span>
        <span className={busy ? css.syncing : css.dot} aria-hidden="true" />
      </div>
      {snapshot?.currencies.length === 0
        ? <div className={css.empty}>{statusLabel(snapshot)}</div>
        : snapshot?.currencies.map(item => (
          <div className={css.currency} key={item.currency}>
            <div className={css.valueLine}>
              <span className={css.currencyName}>{item.currency}</span>
              <strong className={css.value}>{money(item.currency, item.totalBalance)}</strong>
            </div>
            <div className={css.progressTrack} aria-label={`${item.currency} 余额 ${item.progress.toFixed(1)}%`}>
              <span className={css.progressValue} style={{ width: `${item.progress}%` } as CSSProperties} />
            </div>
            <div className={css.meta}>今日基准 {money(item.currency, item.baselineBalance)} · {item.progress.toFixed(1)}%</div>
          </div>
        ))}
      <div className={css.footer}>{queryTime(snapshot)}</div>
    </button>
  )
}
