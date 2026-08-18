/*
 * Adapted from tyche66/DSH-money-view (MIT License).
 * The upstream source snapshot and license are preserved in bundled/dsh-money-view.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { BalanceSnapshot } from '../deepseek-balance.ts'

const MIN_TIMER_MS = 1_000
const MAX_TIMER_MS = 30 * 60 * 1_000
const STYLE_ID = 'ai-legal-advisor-deepseek-balance-styles'

const BALANCE_CSS = `
[data-ai-legal-balance-card], [data-ai-legal-balance-rail] { box-sizing: border-box; }
[data-ai-legal-balance-card] { width: 100%; border: 1px solid #e6e8eb; border-radius: 9px; background: #fff; color: #1f2329; padding: 9px 10px 8px; text-align: left; cursor: pointer; transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease; }
[data-ai-legal-balance-card]:hover { border-color: #cdd2d8; background: #fcfcfd; box-shadow: 0 2px 10px rgb(31 35 41 / 6%); }
[data-ai-legal-balance-card]:focus-visible, [data-ai-legal-balance-rail]:focus-visible { outline: 2px solid #8ab4f8; outline-offset: 2px; }
.ai-legal-balance-heading, .ai-legal-balance-value-line { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ai-legal-balance-label { color: #69707d; font-size: 12px; font-weight: 500; letter-spacing: .01em; }
.ai-legal-balance-dot, .ai-legal-balance-syncing { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 999px; background: #55a36b; }
.ai-legal-balance-syncing { background: #f0a44b; animation: ai-legal-balance-pulse 1.1s ease-in-out infinite; }
.ai-legal-balance-currency { margin-top: 7px; }
.ai-legal-balance-currency-name { color: #8b929e; font-size: 10px; font-weight: 600; letter-spacing: .08em; }
.ai-legal-balance-value { color: #29313d; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 14px; font-variant-numeric: tabular-nums; font-weight: 650; letter-spacing: -.02em; }
.ai-legal-balance-progress-track { height: 4px; margin-top: 6px; overflow: hidden; border-radius: 999px; background: #eef0f2; }
.ai-legal-balance-progress-value { display: block; height: 100%; min-width: 2px; border-radius: inherit; background: linear-gradient(90deg, #70b880, #55a36b); transition: width 220ms ease; }
.ai-legal-balance-meta, .ai-legal-balance-footer { overflow: hidden; color: #9aa1ab; font-size: 10px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.ai-legal-balance-meta { margin-top: 4px; }
.ai-legal-balance-footer { margin-top: 7px; }
.ai-legal-balance-empty { padding: 12px 0 3px; color: #858c97; font-size: 11px; line-height: 1.35; }
[data-ai-legal-balance-rail] { display: flex; width: 36px; min-height: 36px; align-items: center; justify-content: center; gap: 2px; border: 0; border-radius: 9px; background: transparent; color: #5f6874; cursor: pointer; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; padding: 0; }
[data-ai-legal-balance-rail]:hover { background: #f2f4f6; }
.ai-legal-balance-rail-glyph { color: #6e7885; font-size: 14px; font-weight: 700; }
.ai-legal-balance-rail-value { max-width: 25px; overflow: hidden; font-size: 9px; text-overflow: ellipsis; }
@keyframes ai-legal-balance-pulse { 0%, 100% { opacity: .42; transform: scale(.8); } 50% { opacity: 1; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { [data-ai-legal-balance-card], .ai-legal-balance-progress-value { transition: none; } .ai-legal-balance-syncing { animation: none; } }
`

function installBalanceStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = BALANCE_CSS
  document.head.append(style)
}

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
    style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
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

interface BalanceRpcResult {
  readonly ok: boolean
  readonly value?: unknown
  readonly error?: { readonly message: string }
}

export interface BalanceCardInjected {
  readonly connection: {
    readonly rpc: {
      readonly call: (channel: string, endpoint: string, payload: Record<string, never>) => Promise<BalanceRpcResult>
    }
  }
}
export interface BalanceCardOwnerProps { readonly wide: boolean }
export type BalanceCardProps = BalanceCardOwnerProps & BalanceCardInjected

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
          error: result.ok ? '余额响应格式无效' : result.error?.message ?? '余额请求失败',
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
    installBalanceStyles()
    let disposed = false
    let timer: number | undefined
    const schedule = (next: BalanceSnapshot | undefined): void => {
      if (disposed) return
      const target = next?.nextQueryAt ?? Date.now() + 5 * 60 * 1_000
      const delay = Math.max(MIN_TIMER_MS, Math.min(MAX_TIMER_MS, target - Date.now()))
      timer = window.setTimeout(() => { void poll() }, delay)
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
      <button type="button" data-ai-legal-balance-rail title={title} aria-label={title} onClick={() => { void refresh() }}>
        <span className="ai-legal-balance-rail-glyph">{first?.currency === 'USD' ? '$' : '¥'}</span>
        {first !== undefined && <span className="ai-legal-balance-rail-value">{first.totalBalance.toFixed(2)}</span>}
      </button>
    )
  }

  return (
    <button type="button" data-ai-legal-balance-card title={title} aria-label={title} onClick={() => { void refresh() }}>
      <div className="ai-legal-balance-heading">
        <span className="ai-legal-balance-label">DeepSeek API 余额</span>
        <span className={busy ? 'ai-legal-balance-syncing' : 'ai-legal-balance-dot'} aria-hidden="true" />
      </div>
      {snapshot?.currencies.length === 0
        ? <div className="ai-legal-balance-empty">{statusLabel(snapshot)}</div>
        : snapshot?.currencies.map(item => (
          <div className="ai-legal-balance-currency" key={item.currency}>
            <div className="ai-legal-balance-value-line">
              <span className="ai-legal-balance-currency-name">{item.currency}</span>
              <strong className="ai-legal-balance-value">{money(item.currency, item.totalBalance)}</strong>
            </div>
            <div className="ai-legal-balance-progress-track" aria-label={`${item.currency} 余额 ${item.progress.toFixed(1)}%`}>
              <span className="ai-legal-balance-progress-value" style={{ width: `${item.progress}%` } as CSSProperties} />
            </div>
            <div className="ai-legal-balance-meta">今日基准 {money(item.currency, item.baselineBalance)} · {item.progress.toFixed(1)}%</div>
          </div>
        ))}
      <div className="ai-legal-balance-footer">{queryTime(snapshot)}</div>
    </button>
  )
}
