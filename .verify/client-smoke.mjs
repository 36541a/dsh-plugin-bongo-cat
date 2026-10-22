/**
 * Browser-half smoke test for dsh-plugin-bongo-cat.
 *
 * Boots the real built lib/client.js inside jsdom through the
 * window.__ModuleLoader__ protocol with a stubbed `require`, a fake
 * ClientContext and an in-memory host RPC, then drives typing / clicking
 * / skin changes and inspects the overlay DOM.
 *
 * Run:  node .verify/client-smoke.mjs
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

await import('./build-contract.mjs')
const { SETTINGS_DEFAULTS } = await import('./lib/contract.js')

/* ------------------------------------------------------------------ */
/* jsdom boot                                                          */
/* ------------------------------------------------------------------ */

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://127.0.0.1:12345/',
  pretendToBeVisual: true
})
const { window } = dom

globalThis.window = window
globalThis.document = window.document
globalThis.requestAnimationFrame = (cb) => window.setTimeout(() => cb(Date.now()), 0)
globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id)

let capturedModule = null
window.__ModuleLoader__ = {
  load: (module) => { capturedModule = module }
}

/* ------------------------------------------------------------------ */
/* in-memory host                                                      */
/* ------------------------------------------------------------------ */

// The in-memory host starts from the CONTRACT defaults — the same source
// the real host schema is built from.
const serverState = {
  ...SETTINGS_DEFAULTS,
  // Two widgets are pre-seeded so the dock has something to reconcile on boot;
  // the add/remove flow itself is covered by the browser suite (vm/ui.mjs).
  widgets: [
    { id: 'clock', type: 'clock', enabled: true, x: 120, y: 120, size: 'sm', opacity: 1, config: { hour12: false, seconds: true, showDate: true } },
    { id: 'steam', type: 'steam', enabled: true, x: 120, y: 280, size: 'md', opacity: 1, config: { limit: 3, showPlaytime: true } }
  ],
  // A hat, an accessory and a non-default fur: enough to prove the overlay
  // projects a wardrobe, without depending on the drop ledger.
  wardrobe: {
    equipped: { hat: 'beanie', face: null, accessory: 'scarf' },
    fur: 'ginger',
    owned: { beanie: 1, scarf: 1, blush: 1 },
    claimed: 0,
    filter: 'all'
  }
}

const connection = {
  isLoopback: true,
  rpc: {
    call: async (channel, method, payload) => {
      if (channel !== '/bongo-cat') return { ok: false, error: { code: 'bad-request', message: 'wrong channel' } }
      if (method === 'config/get') return { ok: true, value: { ...serverState } }
      if (method === 'config/set') {
        Object.assign(serverState, payload.patch)
        return { ok: true, value: { ...serverState } }
      }
      if (method === 'stats/bump') {
        serverState.counter += payload.count
        return { ok: true, value: { counter: serverState.counter } }
      }
      if (method === 'stats/reset') {
        serverState.counter = 0
        return { ok: true, value: { counter: 0 } }
      }
      if (method === 'native/status') {
        return { ok: true, value: { available: true, skin: 'DefaultBongo', size: [1020, 750], extractedAt: 'test-stamp' } }
      }
      if (method === 'native/import') {
        return { ok: true, value: { available: true, skin: 'DefaultBongo', size: [1020, 750], extractedAt: 'test-stamp' } }
      }
      if (method === 'native/remove') {
        return { ok: true, value: { removed: true } }
      }
      if (method === 'steam/library') {
        return {
          ok: true,
          value: {
            source: 'steam',
            games: [
              { appid: 1337970, name: 'Bongo Cat', playtimeMinutes: 90, lastPlayed: 2 },
              { appid: 620, name: 'Portal 2', playtimeMinutes: 600, lastPlayed: 1 }
            ]
          }
        }
      }
      if (method === 'steam/launch') {
        serverState.launched = payload.appid
        return { ok: true, value: { launched: true } }
      }
      return { ok: false, error: { code: 'bad-request', message: `unexpected ${method}` } }
    }
  }
}

/* ------------------------------------------------------------------ */
/* fake ClientContext                                                  */
/* ------------------------------------------------------------------ */

const effects = []
const localeDicts = {}
const sectionSpecs = []

const ctx = {
  get: (name) => (name === 'connection' ? connection : undefined),
  effect: (fn) => {
    const disposer = fn()
    effects.push(disposer)
    return disposer
  },
  on: () => () => {},
  locale: {
    register: (ns, dict) => { localeDicts[ns] = dict },
    bind: (ns) => (key) => localeDicts[ns]?.zh?.[key] ?? key
  },
  slots: {
    inject: (_slot, register) => {
      sectionSpecs.push(register())
    },
    register: (spec, Component) => ({ ...spec, Component })
  }
}

/* ------------------------------------------------------------------ */
/* load the real client bundle                                         */
/* ------------------------------------------------------------------ */

const bundle = readFileSync(join(ROOT, 'lib', 'client.js'), 'utf8')
const requireStub = (id) => {
  if (id === 'react' || id === 'react-dom') return {}
  if (id === 'react/jsx-runtime' || id === 'react-dom/client') {
    return { jsx: () => null, jsxs: () => null, Fragment: Symbol('Fragment') }
  }
  throw new Error(`unexpected external require: ${id}`)
}
new Function('window', bundle)(window)

if (capturedModule === null) {
  console.log('FAIL  ModuleLoader protocol: window.__ModuleLoader__.load was never called')
  process.exit(1)
}
const { apply, inject } = capturedModule.factory(requireStub)
if (typeof apply !== 'function') {
  console.log('FAIL  client bundle does not export apply()')
  process.exit(1)
}

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

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

const root = () => document.getElementById('dsh-bongo-cat-root')

apply(ctx)
await sleep(20) // let store.load() resolve and paint

console.log('— module & registration —')
check('inject declares slots/locale/connection', Array.isArray(inject) && inject.includes('slots') && inject.includes('locale') && inject.includes('connection'))
check('locale dictionary registered (zh)', typeof localeDicts['bongo-cat']?.zh?.nav === 'string' && localeDicts['bongo-cat'].zh.nav === '邦哥猫')
check('locale dictionary registered (en)', localeDicts['bongo-cat']?.en?.nav === 'Bongo Cat')
check('settings.section registered with id bongo-cat', sectionSpecs.some((s) => s?.id === 'bongo-cat'))
check('settings.section exposes inject() payload', typeof sectionSpecs[0]?.inject === 'function')
check('overlay effect registered', effects.length >= 1)

console.log('— overlay DOM —')
const el = root()
check('overlay root mounted on body', el !== null)
check('speed variable applied', (el?.getAttribute('style') ?? '').includes('--bc-speed'), el?.getAttribute('style') ?? '')
check('counter badge rendered', el?.querySelector('div') !== null)
check('cat positioned from defaults', el?.style.left !== '' && el?.style.top !== '')
check('plugin css style tag injected', document.querySelector('style[data-plugin-css^="dsh-plugin-bongo-cat/"]') !== null)

console.log('— original artwork mode —')
const nativeWrap = el?.querySelector('[data-role="bongo-cat-native"]')
check('native layer mounted', nativeWrap !== null)
check('native mode active when assets available', (el?.className ?? '').includes('bc-native-mode'), el?.className ?? '')
check('native frames preloaded', nativeWrap?.querySelectorAll('img[data-frame]').length === 3)
const idleImg = nativeWrap?.querySelector('img[data-frame="idle"]')
check('idle frame URL points at the asset route', (idleImg?.getAttribute('src') ?? '').includes('/plugins/bongo-cat/native/idle.png'), idleImg?.getAttribute('src') ?? '')
check('idle frame active by default', nativeWrap?.getAttribute('data-active') === 'idle')

console.log('— typing interaction —')
const keyBefore = serverState.counter
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }))
const tapClass = (el?.className ?? '').split(/\s+/).some((c) => c.includes('bc-tap-'))
check('keydown triggers a paw tap class', tapClass, el?.className ?? '')
check('keydown swaps the native frame', nativeWrap?.getAttribute('data-active') !== 'idle', nativeWrap?.getAttribute('data-active') ?? '')
check('first keydown taps the left paw', nativeWrap?.getAttribute('data-active') === 'tap-left', nativeWrap?.getAttribute('data-active') ?? '')
await sleep(10)
check('counter badge counts the tap', el?.textContent?.includes('1') === true, el?.textContent ?? '')

await sleep(200)
const stillTapping = (el?.className ?? '').split(/\s+/).some((c) => c.includes('bc-tap-'))
check('tap class auto-clears', !stillTapping)
check('native frame returns to idle', nativeWrap?.getAttribute('data-active') === 'idle')

console.log('— left / right alternation —')
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true }))
check('second keydown taps the right paw', nativeWrap?.getAttribute('data-active') === 'tap-right', nativeWrap?.getAttribute('data-active') ?? '')
await sleep(220)
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true }))
check('third keydown taps the left paw again', nativeWrap?.getAttribute('data-active') === 'tap-left', nativeWrap?.getAttribute('data-active') ?? '')
await sleep(220)

console.log('— click interaction —')
document.body.dispatchEvent(new window.MouseEvent('pointerdown', { button: 0, bubbles: true }))
check('pointerdown also alternates (right paw)', nativeWrap?.getAttribute('data-active') === 'tap-right', nativeWrap?.getAttribute('data-active') ?? '')
await sleep(10)
const badgeEl = el?.querySelector('[data-role="bongo-cat-counter"]')
check('badge counts all taps locally', badgeEl?.textContent?.includes('4') === true, badgeEl?.textContent ?? '')

console.log('— modifier keys ignored —')
const classBeforeMod = el?.className ?? ''
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true }))
const classAfterMod = el?.className ?? ''
const newClass = classAfterMod.split(/\s+/).filter((c) => !classBeforeMod.split(/\s+/).includes(c))
check('ctrl+key does not tap', newClass.filter((c) => c.includes('bc-tap')).length === 0)

console.log('— visibility pause —')
const hasPaused = (el?.className ?? '').split(/\s+/).some((c) => c.includes('bc-paused'))
check('not paused while visible', !hasPaused)
Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
document.dispatchEvent(new window.Event('visibilitychange'))
await sleep(10)
const pausedNow = (el?.className ?? '').split(/\s+/).some((c) => c.includes('bc-paused'))
check('hidden page pauses the cat', pausedNow, el?.className ?? '')
const tapsBeforePaused = el?.textContent ?? ''
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'q', bubbles: true }))
check('paused cat ignores input', (el?.textContent ?? '') === tapsBeforePaused)
Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
document.dispatchEvent(new window.Event('visibilitychange'))
await sleep(10)
const pausedAfter = (el?.className ?? '').split(/\s+/).some((c) => c.includes('bc-paused'))
check('visible page resumes the cat', !pausedAfter)

console.log('— first-run hint —')
await sleep(900) // the hint fires 800ms after first paint
const toast = el?.querySelector('[data-role="bongo-cat-hint"]')
check('first-run hint toast shown', toast !== null && (toast.textContent ?? '').length > 0, toast?.textContent ?? '')
check('hintSeen persisted to host', serverState.hintSeen === true)

console.log('— skin selection —')
const spec = sectionSpecs[0]
const payload = spec.inject()
await payload.store.set({ skin: 'Black' })
await sleep(10)
check('skin selection persists', serverState.skin === 'Black', String(serverState.skin))

await payload.store.set({ size: 2 })
await sleep(10)
check('size change resizes stage', el?.firstElementChild?.style.width === '300px', el?.firstElementChild?.style.width ?? '')

await payload.store.set({ showCounter: false })
await sleep(10)
check('counter badge hides', el?.querySelector('[data-role="bongo-cat-counter"]')?.style.display === 'none')

console.log('— wardrobe overlay —')
const decor = el?.querySelector('[data-role="bongo-cat-decor"]')
const nativeLayer = el?.querySelector('[data-role="bongo-cat-native"]')
check('decor layer mounts inside the cat stage', decor !== null && decor.parentElement === nativeLayer?.parentElement)
check('the worn hat is drawn', decor?.querySelector('[data-slot="hat"]')?.getAttribute('data-item') === 'beanie')
check('the worn accessory is drawn', decor?.querySelector('[data-slot="accessory"]')?.getAttribute('data-item') === 'scarf')
check('an empty slot draws nothing', decor?.querySelector('[data-slot="face"]') === null)
check('sticker geometry comes from the catalogue', /left:50%/.test(decor?.querySelector('[data-slot="hat"]')?.getAttribute('style') ?? ''), decor?.querySelector('[data-slot="hat"]')?.getAttribute('style') ?? 'none')
check('fur colour filters the artwork', (nativeLayer?.style.filter ?? '').includes('sepia'), nativeLayer?.style.filter ?? 'none')
check('the counter badge is not tinted', (el?.querySelector('[data-role="bongo-cat-counter"]')?.style.filter ?? '') === '')

// Changing the wardrobe re-renders the layer: new hat, accessory taken off.
await payload.store.set({
  wardrobe: {
    equipped: { hat: 'crown', face: null, accessory: 'wings' },
    fur: 'original',
    owned: { beanie: 1, scarf: 1, blush: 1, crown: 1, wings: 1 },
    claimed: 0,
    filter: 'all'
  }
})
await sleep(20)
check('a wardrobe change re-renders the stickers', decor?.querySelector('[data-slot="hat"]')?.getAttribute('data-item') === 'crown')
// Wings declare `layer: 'back'`; they must render under the artwork, and the
// front layer must not duplicate them.
const decorBack = el?.querySelector('[data-role="bongo-cat-decor-back"]')
check('back-layer items render behind the cat', decorBack?.querySelector('[data-item="wings"]') !== null && decor?.querySelector('[data-item="wings"]') === null)
check('going back to the original fur clears the filter', (nativeLayer?.style.filter ?? '') === '', nativeLayer?.style.filter ?? 'none')

console.log('— enable toggle —')
await payload.store.set({ enabled: false })
await sleep(10)
check('disabling hides the overlay', el?.style.display === 'none')

console.log('— stats flush —')
// The 2 local taps ride the 4s batch window; a direct bump lands immediately.
const flushResult = await payload.rpc.call('/bongo-cat', 'stats/bump', { count: 3 })
check('rpc stats/bump reaches host', flushResult.ok === true && flushResult.value.counter === keyBefore + 3, JSON.stringify(flushResult))

console.log('— widget dock —')
const widgetLayer = document.getElementById('dsh-bongo-cat-widgets')
const catRoot = document.getElementById('dsh-bongo-cat-root')
check('widget layer mounts', widgetLayer !== null)
check('widget layer is independent of the cat root', widgetLayer !== null && catRoot !== null && !catRoot.contains(widgetLayer))
check('pre-seeded widgets are mounted', document.querySelectorAll('.bc-widget').length === 2, String(document.querySelectorAll('.bc-widget').length))

const clockCard = document.querySelector('.bc-widget[data-widget-type="clock"]')
check('clock card renders a time', /\d{1,2}:\d{2}/.test(clockCard?.textContent ?? ''), clockCard?.textContent ?? 'none')
check('clock card carries its instance id', clockCard?.getAttribute('data-widget-id') === 'clock')

const steamRows = [...document.querySelectorAll('.bc-widget[data-widget-type="steam"] .bc-widget-steam-row')]
check('steam widget lists installed games', steamRows.length === 2, `rows=${steamRows.length}`)
steamRows[0]?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
await sleep(80)
check('clicking a game asks the host to launch it', serverState.launched === 1337970, String(serverState.launched))

// Drag: pointerdown on the card, move, release. jsdom has no layout, so assert
// the style moved and that the new seat was persisted through config/set.
const beforeSeat = serverState.widgets.find((widget) => widget.id === 'clock').x
clockCard?.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 130, clientY: 130 }))
clockCard?.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 260, clientY: 200 }))
clockCard?.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 260, clientY: 200 }))
await sleep(80)
const afterSeat = serverState.widgets.find((widget) => widget.id === 'clock').x
check('dragging moves the card', clockCard?.style.left === '130px', clockCard?.style.left ?? 'none')
check('the new seat is persisted', afterSeat !== beforeSeat, `${beforeSeat} -> ${afterSeat}`)

console.log('— dispose —')
for (const disposer of effects) if (typeof disposer === 'function') disposer()
check('overlay removed after dispose', root() === null)
check('widget layer removed after dispose', document.getElementById('dsh-bongo-cat-widgets') === null)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
