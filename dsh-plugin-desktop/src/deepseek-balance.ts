/*
 * Adapted from tyche66/DSH-money-view (MIT License).
 * The upstream source snapshot and license are preserved in bundled/dsh-money-view.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import { credentialRef, type CredentialProvider } from '@deepseek-ai/dsh-credentials'
import type {
  ConnectionRpcEndpointMatcher,
  ConnectionRpcHandler,
  HostConnectionHandle,
} from '@deepseek-ai/dsh-client-connection'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
import z from '@deepseek-ai/schemastery'

export interface Config {
  readonly baseURL?: string
  readonly apiKeyEnv?: string
  readonly defaultRefreshIntervalMs?: number
  readonly activityWindowMs?: number
}

export interface BalanceCurrencySnapshot {
  readonly currency: 'CNY' | 'USD'
  readonly totalBalance: number
  readonly baselineBalance: number
  readonly progress: number
}

export interface BalanceSnapshot {
  readonly status: 'ready' | 'idle' | 'error' | 'unconfigured'
  readonly currencies: readonly BalanceCurrencySnapshot[]
  readonly fetchedAt?: number
  readonly lastActivityAt?: number
  readonly nextQueryAt: number
  readonly error?: string
}

interface WireBalanceInfo {
  readonly currency?: unknown
  readonly total_balance?: unknown
}

interface WireBalanceResponse {
  readonly balance_infos?: unknown
}

const CHANNEL = '/api'
const ENDPOINT = 'deepseek-balance/get'
const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_API_KEY_ENV = 'DEEPSEEK_API_KEY'
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1_000
const DEFAULT_ACTIVITY_WINDOW_MS = 30 * 60 * 1_000
const MIN_REFRESH_INTERVAL_MS = 60 * 1_000
const MAX_REFRESH_INTERVAL_MS = 30 * 60 * 1_000

const isCurrency = (value: unknown): value is BalanceCurrencySnapshot['currency'] =>
  value === 'CNY' || value === 'USD'

const clampProgress = (value: number): number => Math.max(0, Math.min(100, value))

function localDay(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseTotalBalance(value: unknown): number | undefined {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(amount) && amount >= 0 ? amount : undefined
}

function cacheMaxAge(response: Response): number | undefined {
  const header = response.headers.get('cache-control')
  const match = header?.match(/(?:^|,)\s*max-age\s*=\s*(\d+)/i)
  if (match?.[1] === undefined) return undefined
  const seconds = Number(match[1])
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined
  return Math.max(MIN_REFRESH_INTERVAL_MS, Math.min(MAX_REFRESH_INTERVAL_MS, seconds * 1_000))
}

function failureMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) return error.message
  return '余额查询失败'
}

function ok(value: BalanceSnapshot): RpcResult<BalanceSnapshot> {
  return { ok: true, value }
}

export const name = 'deepseek-balance'
export const inject = ['connection', 'credentials']

export const Config: z<Config> = z.object({
  baseURL: z.string().default(DEFAULT_BASE_URL),
  apiKeyEnv: z.string().default(DEFAULT_API_KEY_ENV),
  defaultRefreshIntervalMs: z.number().default(DEFAULT_REFRESH_INTERVAL_MS),
  activityWindowMs: z.number().default(DEFAULT_ACTIVITY_WINDOW_MS),
})

export function apply(ctx: Context, rawConfig: Config = {}): void {
  const config = {
    baseURL: rawConfig.baseURL ?? DEFAULT_BASE_URL,
    apiKeyEnv: rawConfig.apiKeyEnv ?? DEFAULT_API_KEY_ENV,
    defaultRefreshIntervalMs: Math.max(
      MIN_REFRESH_INTERVAL_MS,
      Math.min(MAX_REFRESH_INTERVAL_MS, rawConfig.defaultRefreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS),
    ),
    activityWindowMs: Math.max(MIN_REFRESH_INTERVAL_MS, rawConfig.activityWindowMs ?? DEFAULT_ACTIVITY_WINDOW_MS),
  }
  const credentials = ctx.get('credentials') as CredentialProvider | undefined
  const connection = ctx.get('connection') as HostConnectionHandle | undefined
  if (connection === undefined) return
  const reference = credentialRef(config.apiKeyEnv)

  let lastActivityAt: number | undefined
  let fetchedAt: number | undefined
  let nextQueryAt = 0
  let lastError: string | undefined
  let baselineDay: string | undefined
  const baselineByCurrency = new Map<BalanceCurrencySnapshot['currency'], number>()
  let currentBalances: readonly { currency: BalanceCurrencySnapshot['currency']; totalBalance: number }[] = []

  const snapshot = (now = Date.now()): BalanceSnapshot => {
    const active = lastActivityAt !== undefined && now - lastActivityAt <= config.activityWindowMs
    const currencies = currentBalances.map(({ currency, totalBalance }) => {
      const baseline = baselineByCurrency.get(currency) ?? totalBalance
      return {
        currency,
        totalBalance,
        baselineBalance: baseline,
        progress: baseline <= 0 ? 0 : clampProgress(totalBalance / baseline * 100),
      }
    })
    return {
      status: lastError !== undefined && fetchedAt === undefined
        ? 'error'
        : credentials === undefined
          ? 'unconfigured'
          : active && currencies.length > 0
            ? 'ready'
            : 'idle',
      currencies,
      ...(fetchedAt === undefined ? {} : { fetchedAt }),
      ...(lastActivityAt === undefined ? {} : { lastActivityAt }),
      nextQueryAt: active ? nextQueryAt : now + config.defaultRefreshIntervalMs,
      ...(lastError === undefined ? {} : { error: lastError }),
    }
  }

  const refresh = async (now: number): Promise<BalanceSnapshot> => {
    const active = lastActivityAt !== undefined && now - lastActivityAt <= config.activityWindowMs
    if (!active) return snapshot(now)
    if (fetchedAt !== undefined && now < nextQueryAt) return snapshot(now)
    if (credentials === undefined) {
      lastError = '未找到 Harness 凭据服务'
      return snapshot(now)
    }
    const hit = await credentials.resolve(reference)
    if (hit === undefined) {
      lastError = `未配置 ${config.apiKeyEnv}`
      return { ...snapshot(now), status: 'unconfigured' }
    }
    try {
      const response = await fetch(`${config.baseURL.replace(/\/$/, '')}/user/balance`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${hit.value}`, Accept: 'application/json' },
      })
      if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`)
      const body = await response.json() as WireBalanceResponse
      const infos = Array.isArray(body.balance_infos) ? body.balance_infos as WireBalanceInfo[] : []
      const parsed = infos.flatMap(info => {
        if (!isCurrency(info.currency)) return []
        const totalBalance = parseTotalBalance(info.total_balance)
        return totalBalance === undefined ? [] : [{ currency: info.currency, totalBalance }]
      })
      if (parsed.length === 0) throw new Error('DeepSeek 返回中没有可识别的余额')

      const day = localDay(now)
      if (baselineDay !== day) {
        baselineDay = day
        baselineByCurrency.clear()
        for (const item of parsed) baselineByCurrency.set(item.currency, item.totalBalance)
      } else {
        for (const item of parsed) if (!baselineByCurrency.has(item.currency)) baselineByCurrency.set(item.currency, item.totalBalance)
      }
      currentBalances = parsed
      fetchedAt = now
      lastError = undefined
      nextQueryAt = now + (cacheMaxAge(response) ?? config.defaultRefreshIntervalMs)
      return snapshot(now)
    } catch (error: unknown) {
      lastError = failureMessage(error)
      nextQueryAt = now + config.defaultRefreshIntervalMs
      return snapshot(now)
    }
  }

  ctx.on('agent/request', async (
    _payload: { agent: unknown; turn: number; step: number; signal: AbortSignal },
    next: () => Promise<LlmCallConfig>,
  ) => {
    return next().then(request => {
      if (request.provider === 'deepseek') lastActivityAt = Date.now()
      return request
    })
  })

  ctx.effect(() => {
    const matches: ConnectionRpcEndpointMatcher = endpoint => endpoint === ENDPOINT
    const handler: ConnectionRpcHandler = async (_endpoint, _payload, signal) => {
      signal.throwIfAborted()
      return ok(await refresh(Date.now()))
    }
    const remove = connection.rpc.intercept(CHANNEL, matches, handler, { authority: 'loopback' })
    return () => { void remove() }
  }, 'deepseek-balance: rpc')
}

export default apply
