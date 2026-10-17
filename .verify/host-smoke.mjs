/**
 * Host-half integration smoke test for dsh-plugin-bongo-cat.
 *
 * Loads the real built lib/index.js with a stubbed @deepseek-ai/schemastery
 * and a fake Cordis context, then drives the /bongo-cat RPC channel and the
 * asset routes with synthetic node req/res pairs.
 *
 * Run:  node .verify/host-smoke.mjs
 */
import { EventEmitter } from 'node:events'
import { Writable } from 'node:stream'
import { copyFileSync, mkdirSync, mkdtempSync, existsSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DSH_HOME = mkdtempSync(join(tmpdir(), 'dsh-bongo-'))
process.env.DSH_HOME = DSH_HOME

// Self-contained: mirror the freshly built host bundle into .verify/lib/
// so this test always exercises the current build.
mkdirSync(join(HERE, 'lib'), { recursive: true })
copyFileSync(join(HERE, '..', 'lib', 'index.js'), join(HERE, 'lib', 'index.js'))

await import('./build-contract.mjs')
const { SETTINGS_DEFAULTS, sanitizeSettingsPatch } = await import('./lib/contract.js')
const { apply } = await import('./lib/index.js')

/* ------------------------------------------------------------------ */
/* fake Cordis context                                                 */
/* ------------------------------------------------------------------ */

// The in-memory host starts from the CONTRACT defaults — the same source
// the real schema is built from. The contract-guard section below then
// asserts the built plugin agrees.
const state = { ...SETTINGS_DEFAULTS }
let registeredNamespace = null

const scope = {
  get: () => ({ ...state }),
  update: async (patch) => { Object.assign(state, patch); return { ...state } }
}

const routes = []
const ctx = {
  settings: {
    register: (ns, schema, options) => {
      registeredNamespace = { ns, options }
      return scope
    }
  },
  webServer: { register: (route) => { routes.push(route) } },
  effect: (fn) => fn(),
  on: () => () => {},
  get: () => ({})
}

apply(ctx)

/* ------------------------------------------------------------------ */
/* synthetic req/res over the registered routes                        */
/* ------------------------------------------------------------------ */

function callRoute(route, method, url, payload, rpcMethod) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter()
    req.method = method
    req.url = url
    req.headers = { 'content-type': 'application/json' }
    req.destroy = () => {}

    const chunks = []
    let head = null
    const res = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.from(chunk))
        cb()
      },
      final(cb) {
        resolve({ head, body: Buffer.concat(chunks).toString('utf8') })
        cb()
      }
    })
    res.writeHead = (code, headers) => { head = { code, headers } }
    const originalEnd = res.end.bind(res)
    res.end = (text) => {
      if (typeof text === 'string' && text.length > 0) res.write(text)
      originalEnd()
    }

    try {
      route.handler(req, res)
    } catch (error) {
      reject(error)
      return
    }
    if (payload !== undefined) {
      const body = JSON.stringify({ type: 'client-request', rpcId: 't', method: rpcMethod ?? url.slice(url.lastIndexOf('/') + 1), payload })
      process.nextTick(() => {
        req.emit('data', Buffer.from(body))
        req.emit('end')
      })
    }
  })
}

const prefixRoute = () => routes.find((r) => r.kind === 'prefix' && r.path === '/bongo-cat')
const exactRoute = (path) => routes.find((r) => r.kind === 'exact' && r.path === path)

/** Call an RPC endpoint and return the unwrapped result envelope. */
const rpc = async (endpoint, payload = {}) => {
  const response = await callRoute(prefixRoute(), 'POST', `/bongo-cat/${endpoint}`, payload, endpoint)
  return JSON.parse(response.body).result
}

/* ------------------------------------------------------------------ */
/* assertions                                                          */
/* ------------------------------------------------------------------ */

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) {
    passed += 1
    console.log(`  ok  ${name}`)
  } else {
    failed += 1
    console.log(`FAIL  ${name} ${extra}`)
  }
}

const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
const WAV_B64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='

console.log('— registration —')
check('settings namespace registered as bongo-cat', registeredNamespace?.ns === 'bongo-cat')
check('settings registered with applies: live', registeredNamespace?.options?.applies === 'live')
check('prefix route /bongo-cat registered', prefixRoute() !== undefined)
check('exact route /plugins/bongo-cat/skin registered', exactRoute('/plugins/bongo-cat/skin') !== undefined)
check('exact route /plugins/bongo-cat/sound registered', exactRoute('/plugins/bongo-cat/sound') !== undefined)

console.log('— config —')
let r = await rpc('config/get')
check('config/get returns defaults', r.ok === true && r.value.enabled === true && r.value.skin === 'classic' && r.value.counter === 0, JSON.stringify(r))

// ── contract guard (ADR-0002 anti-drift): the built plugin's defaults
// must deep-equal the contract's defaults, key for key.
const hostDefaults = r.ok ? r.value : {}
const hostKeys = Object.keys(hostDefaults).sort()
const contractKeys = Object.keys(SETTINGS_DEFAULTS).sort()
check('host schema keys == contract keys', JSON.stringify(hostKeys) === JSON.stringify(contractKeys),
  `host: ${hostKeys.join(',')} | contract: ${contractKeys.join(',')}`)
const drift = contractKeys.filter((key) => JSON.stringify(hostDefaults[key]) !== JSON.stringify(SETTINGS_DEFAULTS[key]))
check('host defaults deep-equal contract defaults', drift.length === 0, `drifted: ${drift.join(',')}`)

// sanitizer unit checks (pure function from the contract)
const s1 = sanitizeSettingsPatch({ size: 5 })
check('sanitize rejects out-of-range size', s1.ok === false)
const s2 = sanitizeSettingsPatch({ counter: 5 })
check('sanitize rejects host-authoritative counter', s2.ok === false && /not writable/.test(s2.error))
const s3 = sanitizeSettingsPatch({ nope: 1 })
check('sanitize rejects unknown fields', s3.ok === false && /not writable/.test(s3.error))
const s4 = sanitizeSettingsPatch({ size: 1.236 })
check('sanitize rounds numbers to 2dp', s4.ok === true && s4.value.size === 1.24)
const s5 = sanitizeSettingsPatch({ position: 'top-right', customSkinFrames: 6 })
check('sanitize accepts enum + natural', s5.ok === true && s5.value.position === 'top-right' && s5.value.customSkinFrames === 6)
const s6 = sanitizeSettingsPatch({ position: 'middle' })
check('sanitize rejects bad enum', s6.ok === false)
const s7 = sanitizeSettingsPatch('nope')
check('sanitize rejects non-object', s7.ok === false)

r = await rpc('config/set', { patch: { size: 5 } })
check('config/set rejects out-of-range size', r.ok === false && r.error.code === 'bad-request')

r = await rpc('config/set', { patch: { counter: 99 } })
check('config/set rejects non-writable counter', r.ok === false)

r = await rpc('config/set', { patch: { skin: 'tabby', position: 'top-left', offsetX: 12 } })
check('config/set accepts valid patch', r.ok === true && r.value.skin === 'tabby' && r.value.position === 'top-left' && r.value.offsetX === 12, JSON.stringify(r))

console.log('— stats —')
r = await rpc('stats/bump', { count: 5 })
check('stats/bump accumulates', r.ok === true && r.value.counter === 5, JSON.stringify(r))
r = await rpc('stats/bump', { count: 0 })
check('stats/bump rejects count < 1', r.ok === false)
r = await rpc('stats/reset')
check('stats/reset zeroes counter', r.ok === true && r.value.counter === 0)

console.log('— steam scan —')
r = await rpc('skins/scan')
check('skins/scan returns roots array', r.ok === true && Array.isArray(r.value.roots), JSON.stringify(r).slice(0, 200))
console.log(`     (scanned ${r.value?.roots?.length ?? 0} root(s) on this machine)`)

console.log('— skin import (base64) —')
r = await rpc('skins/import', { data: PNG_B64, name: 'test-skin.png' })
check('skins/import accepts base64 png', r.ok === true && r.value.revision === 1, JSON.stringify(r))
check('settings synced to revision 1', state.customSkinRevision === 1)

const skinFile = join(DSH_HOME, 'storages', 'bongo-cat', 'skins', 'skin-1.png')
check('skin file written to storage', existsSync(skinFile))
check('skin bytes match upload', existsSync(skinFile) && statSync(skinFile).size === Buffer.from(PNG_B64, 'base64').length)

let asset = await callRoute(exactRoute('/plugins/bongo-cat/skin'), 'GET', '/plugins/bongo-cat/skin?v=1')
check('skin route serves revision 1 as image/png', asset.head?.code === 200 && asset.head?.headers?.['Content-Type'] === 'image/png' && asset.body.length > 0)

asset = await callRoute(exactRoute('/plugins/bongo-cat/skin'), 'GET', '/plugins/bongo-cat/skin?v=99')
check('skin route 404s stale revision', asset.head?.code === 404)

console.log('— skin import (path) security —')
r = await rpc('skins/import', { path: 'C:\\Windows\\win.ini', name: 'evil.png' })
check('skins/import rejects path outside scanned roots', r.ok === false && /outside the scanned/.test(r.error?.message ?? ''), JSON.stringify(r))

r = await rpc('skins/remove')
check('skins/remove clears revision', r.ok === true && state.customSkinRevision === 0)

console.log('— sound import —')
r = await rpc('sounds/import', { data: WAV_B64, name: 'tok.wav' })
check('sounds/import accepts wav', r.ok === true && r.value.revision === 1, JSON.stringify(r))
asset = await callRoute(exactRoute('/plugins/bongo-cat/sound'), 'GET', '/plugins/bongo-cat/sound?v=1')
check('sound route serves audio/wav', asset.head?.code === 200 && asset.head?.headers?.['Content-Type'] === 'audio/wav' && asset.body.length > 0)

console.log('— info —')
r = await rpc('info')
check('info returns asset meta', r.ok === true && r.value.skin.revision === 0 && r.value.sound.revision === 1, JSON.stringify(r))

console.log('— bad requests —')
r = await rpc('nope/unknown')
check('unknown endpoint rejected', r.ok === false && /unknown bongo-cat endpoint/.test(r.error?.message ?? ''))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
