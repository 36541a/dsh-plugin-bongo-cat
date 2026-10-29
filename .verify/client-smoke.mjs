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
    { id: 'clock', type: 'clock', enabled: true, x: 120, y: 120, size: 'sm', opacity: 1, config: { hour12: false, seconds: true, showDate: true } }
  ],
  // A hat, an accessory and a non-default fur: enough to prove the overlay
  // projects a wardrobe, without depending on the drop ledger.
  wardrobe: {
    equipped: { hat: 'acorn-cap', face: null, accessory: 'rose-scarf' },
    fur: 'ginger',
    owned: { 'acorn-cap': 1, 'rose-scarf': 1, 'blush-sticker': 1, 'top-hat': 1, 'paper-wings': 1 },
    claimed: 0,
    filter: 'all'
  }
}

/** Every stats/bump count the client sent, in order (counter-accounting checks). */
const bumps = []

/**
 * A miniature catalogue in the real v2 shape: rects in artboard pixels plus the
 * frame's crop box (0,0 here, so the percentages are easy to assert).
 */
const COSMETICS = [
  { id: 'acorn-cap', name: 'Acorn Cap', slot: 'hat', layer: 'front', rarity: 1, rect: [510, 100, 200, 120] },
  { id: 'top-hat', name: 'Top Hat', slot: 'hat', layer: 'front', rarity: 2, rect: [510, 60, 200, 220] },
  { id: 'blush-sticker', name: 'Blush', slot: 'face', layer: 'front', rarity: 1, rect: [400, 300, 220, 90] },
  { id: 'rose-scarf', name: 'Rose Scarf', slot: 'accessory', layer: 'front', rarity: 2, rect: [300, 500, 420, 160] },
  { id: 'paper-wings', name: 'Paper Wings', slot: 'back', layer: 'back', rarity: 3, rect: [180, 220, 660, 420] }
]

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
        bumps.push(payload.count)
        serverState.counter += payload.count
        return { ok: true, value: { counter: serverState.counter } }
      }
      if (method === 'stats/reset') {
        serverState.counter = 0
        return { ok: true, value: { counter: 0 } }
      }
      if (method === 'native/status') {
        return { ok: true, value: {
          available: true, skin: 'DefaultBongo', size: [1020, 750], box: [0, 0, 1020, 750], extractedAt: 'test-stamp',
          faceFrames: { idle: 'idle-face.png', 'tap-left': 'tap-left-face.png', 'tap-right': 'tap-right-face.png' }
        } }
      }
      if (method === 'cosmetics/catalog') {
        return { ok: true, value: { stamp: 'test-stamp', rectSpace: 'canvas', size: [1020, 750], items: COSMETICS } }
      }
      if (method === 'native/import') {
        return { ok: true, value: { available: true, skin: 'DefaultBongo', size: [1020, 750], extractedAt: 'test-stamp' } }
      }
      if (method === 'native/remove') {
        return { ok: true, value: { removed: true } }
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
check('the worn hat is drawn', decor?.querySelector('[data-slot="hat"]')?.getAttribute('data-item') === 'acorn-cap')
check('the worn accessory is drawn', decor?.querySelector('[data-slot="accessory"]')?.getAttribute('data-item') === 'rose-scarf')
check('an empty slot draws nothing', decor?.querySelector('[data-slot="face"]') === null)
check('sticker geometry comes from the catalogue', /left:50\.000%/.test(decor?.querySelector('[data-slot="hat"]')?.getAttribute('style') ?? ''), decor?.querySelector('[data-slot="hat"]')?.getAttribute('style') ?? 'none')
check('fur colour filters the artwork', (nativeLayer?.style.filter ?? '').includes('sepia'), nativeLayer?.style.filter ?? 'none')
check('the counter badge is not tinted', (el?.querySelector('[data-role="bongo-cat-counter"]')?.style.filter ?? '') === '')

// Changing the wardrobe re-renders the layer: new hat, accessory taken off.
await payload.store.set({
  wardrobe: {
    equipped: { hat: 'top-hat', face: null, accessory: 'paper-wings' },
    fur: 'original',
    owned: { 'acorn-cap': 1, 'rose-scarf': 1, 'blush-sticker': 1, 'top-hat': 1, 'paper-wings': 1 },
    claimed: 0,
    filter: 'all'
  }
})
await sleep(20)
check('a wardrobe change re-renders the stickers', decor?.querySelector('[data-slot="hat"]')?.getAttribute('data-item') === 'top-hat')
// Wings declare `layer: 'back'`; they must render under the artwork, and the
// front layer must not duplicate them.
const decorBack = el?.querySelector('[data-role="bongo-cat-decor-back"]')
check('back-layer items render behind the cat', decorBack?.querySelector('[data-item="paper-wings"]') !== null && decor?.querySelector('[data-item="paper-wings"]') === null)
check('going back to the original fur clears the filter', (nativeLayer?.style.filter ?? '') === '', nativeLayer?.style.filter ?? 'none')

// A face item replaces the cat's own expression: the artwork must swap to the
// frame with its eyes/mouth painted out, otherwise the emote's features land
// on top of the cat's and you get two sets of eyes.
const idleSrc = () => nativeWrap?.querySelector('img[data-frame="idle"]')?.getAttribute('src') ?? ''
check('without a face item the plain frame is used', idleSrc().includes('/native/idle.png'), idleSrc())
await payload.store.set({
  wardrobe: {
    equipped: { hat: 'top-hat', face: 'blush-sticker', accessory: 'paper-wings' },
    fur: 'original',
    owned: { 'acorn-cap': 1, 'rose-scarf': 1, 'blush-sticker': 1, 'top-hat': 1, 'paper-wings': 1 },
    claimed: 0,
    filter: 'all'
  }
})
await sleep(20)
check('a face item swaps in the blanked frame', idleSrc().includes('/native/idle-face.png'), idleSrc())
check('the expression patch is drawn over it', decor?.querySelector('[data-slot="face"]')?.getAttribute('data-item') === 'blush-sticker')
await payload.store.set({
  wardrobe: {
    equipped: { hat: 'top-hat', face: null, accessory: 'paper-wings' },
    fur: 'original',
    owned: { 'acorn-cap': 1, 'rose-scarf': 1, 'blush-sticker': 1, 'top-hat': 1, 'paper-wings': 1 },
    claimed: 0,
    filter: 'all'
  }
})
await sleep(20)
check('removing it restores the original face', idleSrc().includes('/native/idle.png'), idleSrc())

console.log('— click opens settings —')

// Stand-in for the DSH shell: the trigger carries the ARIA contract the
// helper looks for, and the dialog holds one nav entry with our own label.
let shellOpens = 0
let navClicks = 0
const fakeTrigger = document.createElement('button')
fakeTrigger.setAttribute('aria-haspopup', 'dialog')
fakeTrigger.setAttribute('aria-expanded', 'false')
fakeTrigger.addEventListener('click', () => {
  shellOpens += 1
  fakeTrigger.setAttribute('aria-expanded', 'true')
})
document.body.append(fakeTrigger)

const fakeDialog = document.createElement('div')
fakeDialog.setAttribute('role', 'dialog')
const fakeNav = document.createElement('button')
// The real shell renders an icon inside the same button, so textContent is
// "🐱 邦哥猫" and only the aria-label matches exactly — the tolerant path.
fakeNav.setAttribute('aria-label', '邦哥猫')
fakeNav.textContent = '🐱 邦哥猫'
fakeNav.addEventListener('click', () => { navClicks += 1 })
fakeDialog.append(fakeNav)
document.body.append(fakeDialog)

const stage = el?.querySelector('[data-role="bongo-cat-native"]')?.parentElement
check('the cat exposes a hover hint for the click', root()?.querySelector('[data-role="bongo-cat-hint-chip"]')?.textContent === '设置')

stage?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }))
await sleep(420)
check('clicking the cat opens the settings panel', shellOpens === 1, String(shellOpens))
check('the panel lands on the bongo-cat section', navClicks === 1, String(navClicks))

// A drag ends with a click on the stage; it must not open anything.
const positionBeforeDrag = serverState.position
stage?.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 100, clientY: 100 }))
stage?.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 240, clientY: 190 }))
stage?.dispatchEvent(new window.MouseEvent('pointerup', { bubbles: true, clientX: 240, clientY: 190 }))
stage?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }))
await sleep(420)
check('dragging the cat does not open settings', shellOpens === 1 && navClicks === 1, `${shellOpens}/${navClicks}`)
check('dropping the cat still snaps it to a corner', serverState.position !== positionBeforeDrag, String(serverState.position))

// Double-click keeps its own gesture (and cancels the pending jump).
stage?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 1 }))
stage?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, detail: 2 }))
await sleep(420)
check('double-click cycles the corner without opening settings', shellOpens === 1, String(shellOpens))

fakeTrigger.remove()
fakeDialog.remove()

console.log('— enable toggle —')
await payload.store.set({ enabled: false })
await sleep(10)
check('disabling hides the overlay', el?.style.display === 'none')

console.log('— stats flush —')
// The 2 local taps ride the 4s batch window; a direct bump lands immediately.
const flushResult = await payload.rpc.call('/bongo-cat', 'stats/bump', { count: 3 })
check('rpc stats/bump reaches host', flushResult.ok === true && flushResult.value.counter === keyBefore + 3, JSON.stringify(flushResult))

console.log('— counter accounting —')
// Regression guard for the badge double-count and the overlapping-flush
// re-send: one batch, reported once, and the badge must show the host's
// number — not host + the taps that batch just carried. The enable toggle
// above switched the cat off, so turn it back on through the store first.
await payload.store.set({ enabled: true })
await sleep(20)
const badgeNumber = () => Number((el?.querySelector('[data-role="bongo-cat-counter"]')?.textContent ?? '').replace(/[^\d]/g, ''))
const beforeBatch = serverState.counter
// Taps typed before this section are still in the batch window; top the batch
// up to exactly STATS_FLUSH_TAPS so the flush drains it completely.
const unsentBefore = badgeNumber() - beforeBatch
const burst = Math.max(1, 20 - (unsentBefore % 20))
bumps.length = 0
for (let index = 0; index < burst; index += 1) {
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'x', bubbles: true }))
}
await sleep(80)
check('a burst crosses exactly one flush', bumps.length === 1, JSON.stringify(bumps))
check('the host counted exactly what was reported', serverState.counter === beforeBatch + (bumps[0] ?? 0), `${serverState.counter} vs ${beforeBatch}+${bumps[0]}`)
check('the badge shows the host counter, not double', badgeNumber() === serverState.counter, `${badgeNumber()} vs ${serverState.counter}`)

console.log('— widget dock —')
const widgetLayer = document.getElementById('dsh-bongo-cat-widgets')
const catRoot = document.getElementById('dsh-bongo-cat-root')
check('widget layer mounts', widgetLayer !== null)
check('widget layer is independent of the cat root', widgetLayer !== null && catRoot !== null && !catRoot.contains(widgetLayer))
check('pre-seeded widgets are mounted', document.querySelectorAll('.bc-widget').length === 1, String(document.querySelectorAll('.bc-widget').length))

const clockCard = document.querySelector('.bc-widget[data-widget-type="clock"]')
check('clock card renders a time', /\d{1,2}:\d{2}/.test(clockCard?.textContent ?? ''), clockCard?.textContent ?? 'none')
check('clock card carries its instance id', clockCard?.getAttribute('data-widget-id') === 'clock')

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
