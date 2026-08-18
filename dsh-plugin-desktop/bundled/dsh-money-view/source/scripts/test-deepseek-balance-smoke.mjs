import assert from 'node:assert/strict'
import apply from '../packages/extensions/deepseek-balance/lib/index.js'

let now = Date.parse('2026-08-18T09:00:00+08:00')
const realDateNow = Date.now
const realFetch = globalThis.fetch
Date.now = () => now

let requestCount = 0
let rpcHandler
const listeners = new Map()
const context = {
  get(name) {
    if (name === 'credentials') return { resolve: async () => ({ value: 'sk-test' }) }
    if (name === 'connection') {
      return { rpc: { intercept(_channel, _matches, handler) { rpcHandler = handler; return async () => {} } } }
    }
    throw new Error(`unexpected service ${name}`)
  },
  on(name, listener) { listeners.set(name, listener) },
  effect(setup) { return setup() },
}

globalThis.fetch = async () => {
  requestCount += 1
  return new Response(JSON.stringify({
    balance_infos: [{ currency: 'CNY', total_balance: requestCount === 1 ? '10.00' : '8.00' }],
  }), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'max-age=300' } })
}

apply(context)
const requestListener = listeners.get('agent/request')
assert.ok(requestListener)
const next = async () => ({ provider: 'deepseek', model: 'deepseek-chat' })
await requestListener({ agent: {}, turn: 1, step: 1, signal: new AbortController().signal }, next)

let result = await rpcHandler('deepseek-balance/get', {}, new AbortController().signal)
assert.equal(result.ok, true)
assert.equal(requestCount, 1)
assert.equal(result.value.status, 'ready')
assert.equal(result.value.currencies[0].baselineBalance, 10)
assert.equal(result.value.currencies[0].progress, 100)

now += 4 * 60 * 1_000
result = await rpcHandler('deepseek-balance/get', {}, new AbortController().signal)
assert.equal(requestCount, 1, 'must respect the 5-minute response freshness window')
assert.equal(result.value.currencies[0].totalBalance, 10)

now += 2 * 60 * 1_000
result = await rpcHandler('deepseek-balance/get', {}, new AbortController().signal)
assert.equal(requestCount, 2)
assert.equal(result.value.currencies[0].baselineBalance, 10)
assert.equal(result.value.currencies[0].totalBalance, 8)
assert.equal(result.value.currencies[0].progress, 80)

now += 25 * 60 * 1_000
result = await rpcHandler('deepseek-balance/get', {}, new AbortController().signal)
assert.equal(result.value.status, 'idle', 'must stop external queries after 30 minutes without activity')
assert.equal(requestCount, 2)

now = Date.parse('2026-08-19T09:00:00+08:00')
await requestListener({ agent: {}, turn: 2, step: 1, signal: new AbortController().signal }, next)
result = await rpcHandler('deepseek-balance/get', {}, new AbortController().signal)
assert.equal(requestCount, 3)
assert.equal(result.value.currencies[0].baselineBalance, 8, 'first query of a new local day must reset the baseline')

console.log('deepseek-balance smoke test passed')
Date.now = realDateNow
globalThis.fetch = realFetch
