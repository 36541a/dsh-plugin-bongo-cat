/**
 * Host-half integration smoke test for dsh-plugin-bongo-cat.
 *
 * Loads the real built lib/index.js with a fake Cordis context that has NO
 * `settings` service on purpose: DSH 0.2.x removed ctx.settings.register,
 * so the plugin must work with webServer alone. Drives the /bongo-cat RPC
 * channel and the asset routes with synthetic node req/res pairs.
 *
 * Run:  node .verify/host-smoke.mjs
 */
import { EventEmitter } from 'node:events'
import { Writable } from 'node:stream'
import { copyFileSync, mkdirSync, mkdtempSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
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
/* fake Cordis context (webServer only — no settings service)          */
/* ------------------------------------------------------------------ */

const routes = []
const ctx = {
  webServer: { register: (route) => { routes.push(route) } },
  effect: (fn) => fn(),
  on: () => () => {},
  get: () => ({})
}

apply(ctx)

/* ------------------------------------------------------------------ */
/* synthetic req/res over the registered routes                        */
/* ------------------------------------------------------------------ */

/**
 * Peer address the next synthetic request arrives as. Loopback by default;
 * tests flip it to prove the filesystem endpoints refuse another machine.
 */
let peerAddress = '127.0.0.1'

function callRoute(route, method, url, payload, rpcMethod) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter()
    req.method = method
    req.url = url
    req.headers = { 'content-type': 'application/json' }
    req.socket = { remoteAddress: peerAddress }
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
// No ctx.settings in the fake context — apply() must still succeed (the
// 0.2.x compatibility contract). The store writes only on the first update.
check('applies without a settings service', routes.length >= 4)
check('settings.json is absent until the first write', !existsSync(join(DSH_HOME, 'storages', 'bongo-cat', 'settings.json')))
check('prefix route /bongo-cat registered', prefixRoute() !== undefined)
check('exact route /plugins/bongo-cat/skin registered', exactRoute('/plugins/bongo-cat/skin') !== undefined)
check('exact route /plugins/bongo-cat/sound registered', exactRoute('/plugins/bongo-cat/sound') !== undefined)
check('prefix route /plugins/bongo-cat/native registered', routes.some((r) => r.kind === 'prefix' && r.path === '/plugins/bongo-cat/native'))

console.log('— config —')
let r = await rpc('config/get')
check('config/get returns defaults', r.ok === true && r.value.enabled === true && r.value.skin === 'Cat' && r.value.counter === 0, JSON.stringify(r))

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

r = await rpc('config/set', { patch: { skin: 'Black', position: 'top-left', offsetX: 12 } })
check('config/set accepts valid patch', r.ok === true && r.value.skin === 'Black' && r.value.position === 'top-left' && r.value.offsetX === 12, JSON.stringify(r))

// The store must persist to its own file, not to a DSH settings document.
const settingsFile = join(DSH_HOME, 'storages', 'bongo-cat', 'settings.json')
let persisted
try {
  persisted = JSON.parse(readFileSync(settingsFile, 'utf8'))
} catch {
  persisted = undefined
}
check('config/set persists settings.json', persisted !== undefined && persisted.skin === 'Black' && persisted.offsetX === 12, JSON.stringify(persisted))

console.log('— widgets contract —')

const clockInstance = {
  id: 'clock', type: 'clock', enabled: true, x: 40, y: 300, size: 'sm', opacity: 1,
  config: { hour12: false, seconds: true, showDate: true }
}
const steamInstance = {
  id: 'steam', type: 'steam', enabled: true, x: 40, y: 420, size: 'md', opacity: 0.9,
  config: { limit: 3, showPlaytime: false }
}

r = await rpc('config/set', { patch: { widgets: [clockInstance, steamInstance] } })
check('config/set accepts widget instances', r.ok === true && r.value.widgets.length === 2, JSON.stringify(r).slice(0, 200))

r = await rpc('config/get')
check('widgets round-trip through the store', r.ok === true && r.value.widgets?.[0]?.id === 'clock' && r.value.widgets?.[1]?.config?.limit === 3, JSON.stringify(r.value?.widgets)?.slice(0, 200))

// Normalisation: unknown config keys are dropped, missing one fall back to the
// type defaults, and numbers clamp — a newer build stays readable.
r = await rpc('config/set', { patch: { widgets: [
  { ...clockInstance, config: { hour12: true, bogus: 1 } },
  { ...steamInstance, config: { limit: 99 } }
] } })
check('widget config is normalised, not rejected', r.ok === true && r.value.widgets[0].config.showDate === true && r.value.widgets[0].config.bogus === undefined, JSON.stringify(r.value?.widgets?.[0]?.config))
check('out-of-range widget config clamps', r.ok === true && r.value.widgets[1].config.limit === 8, String(r.value?.widgets?.[1]?.config?.limit))

const rejected = async (label, widgets) => {
  const result = await rpc('config/set', { patch: { widgets } })
  check(label, result.ok === false && result.error?.code === 'bad-request', JSON.stringify(result).slice(0, 160))
}
await rejected('duplicate widget ids are rejected', [clockInstance, { ...clockInstance }])
await rejected('unknown widget type is rejected', [{ ...clockInstance, type: 'weather' }])
await rejected('widget opacity out of range is rejected', [{ ...clockInstance, opacity: 0.1 }])
await rejected('widget id with bad characters is rejected', [{ ...clockInstance, id: 'Clock!' }])
const tooMany = Array.from({ length: 13 }, (_, index) => ({ ...clockInstance, id: `clock-${index}` }))
await rejected('more than twelve widgets are rejected', tooMany)
check('rejected widget patches leave the list untouched', (await rpc('config/get')).value.widgets.length === 2)

console.log('— steam library —')
r = await rpc('steam/library')
check('steam/library answers', r.ok === true && Array.isArray(r.value?.games), JSON.stringify(r).slice(0, 160))
check('steam/library reports a source', r.ok === true && ['steam', 'none'].includes(r.value?.source), String(r.value?.source))
check('steam/library entries are well formed', r.ok === true && r.value.games.every((game) => Number.isInteger(game.appid) && typeof game.name === 'string'), `games=${r.value?.games?.length}`)
r = await rpc('steam/launch', { appid: 'not-a-number' })
check('steam/launch rejects a non-numeric appid', r.ok === false && r.error?.code === 'bad-request', JSON.stringify(r).slice(0, 160))

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
const afterSkin = await rpc('config/get')
check('settings synced to revision 1', afterSkin.ok === true && afterSkin.value.customSkinRevision === 1, JSON.stringify(afterSkin).slice(0, 200))

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

console.log('— loopback-only write guard —')
peerAddress = '10.0.0.5'
const remoteImport = await rpc('skins/import', { data: PNG_B64, name: 'from-lan.png' })
check('another machine cannot import a skin', remoteImport.ok === false && remoteImport.error?.code === 'forbidden', JSON.stringify(remoteImport).slice(0, 160))
const remoteRemove = await rpc('skins/remove')
check('another machine cannot remove a skin', remoteRemove.ok === false && remoteRemove.error?.code === 'forbidden', JSON.stringify(remoteRemove).slice(0, 160))
const remoteNative = await rpc('native/remove')
check('another machine cannot remove native assets', remoteNative.ok === false && remoteNative.error?.code === 'forbidden', JSON.stringify(remoteNative).slice(0, 160))
const remoteSettings = await rpc('config/get')
check('settings stay readable for the floating pet', remoteSettings.ok === true, JSON.stringify(remoteSettings).slice(0, 120))
peerAddress = '::1'
const ipv6Import = await rpc('skins/import', { data: PNG_B64, name: 'ipv6.png' })
check('IPv6 loopback counts as this machine', ipv6Import.ok === true, JSON.stringify(ipv6Import).slice(0, 160))
peerAddress = '127.0.0.1'

r = await rpc('skins/remove')
const afterRemove = await rpc('config/get')
check('skins/remove clears revision', r.ok === true && afterRemove.ok === true && afterRemove.value.customSkinRevision === 0, JSON.stringify(afterRemove).slice(0, 200))

console.log('— sound import —')
r = await rpc('sounds/import', { data: WAV_B64, name: 'tok.wav' })
check('sounds/import accepts wav', r.ok === true && r.value.revision === 1, JSON.stringify(r))
asset = await callRoute(exactRoute('/plugins/bongo-cat/sound'), 'GET', '/plugins/bongo-cat/sound?v=1')
check('sound route serves audio/wav', asset.head?.code === 200 && asset.head?.headers?.['Content-Type'] === 'audio/wav' && asset.body.length > 0)

console.log('— info —')
r = await rpc('info')
check('info returns asset meta', r.ok === true && r.value.skin.revision === 0 && r.value.sound.revision === 1, JSON.stringify(r))

console.log('— native artwork —')
let nativeStatus = await rpc('native/status')
check('native/status reports unavailable before import', nativeStatus.ok === true && nativeStatus.value.available === false)

// simulate a successful extraction by writing the frames into DSH_HOME
const nativeDir = join(DSH_HOME, 'storages', 'bongo-cat', 'native')
const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
mkdirSync(nativeDir, { recursive: true })
for (const frame of ['idle', 'tap-left', 'tap-right']) {
  writeFileSync(join(nativeDir, `${frame}.png`), TINY_PNG)
}
writeFileSync(join(nativeDir, 'native.json'), JSON.stringify({ skin: 'DefaultBongo', size: [1020, 750], extractedAt: '2026-10-18T18:10:14' }))

nativeStatus = await rpc('native/status')
check('native/status sees extracted frames', nativeStatus.ok === true && nativeStatus.value.available === true && nativeStatus.value.skin === 'DefaultBongo', JSON.stringify(nativeStatus))

const nativeRoute = routes.find((r) => r.kind === 'prefix' && r.path === '/plugins/bongo-cat/native')
let nativeAsset = await callRoute(nativeRoute, 'GET', '/plugins/bongo-cat/native/idle.png?v=1')
check('native route serves idle.png', nativeAsset.head?.code === 200 && nativeAsset.head?.headers?.['Content-Type'] === 'image/png' && nativeAsset.body.length > 0)

nativeAsset = await callRoute(nativeRoute, 'GET', '/plugins/bongo-cat/native/evil.png')
check('native route rejects unknown frames', nativeAsset.head?.code === 404)

let infoResult = await rpc('info')
check('info includes native block', infoResult.ok === true && infoResult.value.native?.available === true)

let removed = await rpc('native/remove')
check('native/remove clears the frames', removed.ok === true)
nativeStatus = await rpc('native/status')
check('native/status unavailable after removal', nativeStatus.ok === true && nativeStatus.value.available === false)

console.log('— skin catalog —')
mkdirSync(join(nativeDir, 'icons'), { recursive: true })
writeFileSync(join(nativeDir, 'skins.json'), JSON.stringify({ skins: [{ name: 'Cat' }, { name: 'Black' }] }))
writeFileSync(join(nativeDir, 'icons', 'Cat.png'), TINY_PNG)
writeFileSync(join(nativeDir, 'icons', 'Black.png'), TINY_PNG)
let catalog = await rpc('native/catalog')
check('native/catalog lists skins', catalog.ok === true && catalog.value.skins.length === 2 && catalog.value.skins.includes('Black'), JSON.stringify(catalog))
check('native/catalog reports current skin', catalog.ok === true && typeof catalog.value.current === 'string')
let iconAsset = await callRoute(nativeRoute, 'GET', '/plugins/bongo-cat/native/icons/Black.png?v=1')
check('icon route serves a skin icon', iconAsset.head?.code === 200 && iconAsset.head?.headers?.['Content-Type'] === 'image/png')
iconAsset = await callRoute(nativeRoute, 'GET', '/plugins/bongo-cat/native/icons/Nope.png')
check('icon route 404s unknown skins', iconAsset.head?.code === 404)

console.log('— legacy skin migration —')
// 0.4.x stored a built-in art id ("classic") in `skin`; 0.5+ stores a Steam
// sprite prefix. A stale value must not survive into a re-extract.
writeFileSync(settingsFile, JSON.stringify({ skin: 'classic', counter: 7 }))
routes.length = 0
apply(ctx)
check('stale skin falls back to the default cat', (await rpc('config/get')).value?.skin === 'Cat')
check('the rest of the stored settings survive', (await rpc('config/get')).value?.counter === 7)

console.log('— bad requests —')
r = await rpc('nope/unknown')
check('unknown endpoint rejected', r.ok === false && /unknown bongo-cat endpoint/.test(r.error?.message ?? ''))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
