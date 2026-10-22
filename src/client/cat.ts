/**
 * Bongo Cat overlay controller (browser half).
 *
 * Renders the ORIGINAL Steam Bongo Cat artwork (three frames extracted from
 * the user's own install) as a floating pet: typing and clicks swap the
 * frames, drag & double-click reposition it, the counter is batched to the
 * host, and a hidden tab freezes everything.
 *
 * There is no self-drawn cat any more — if the original frames are missing
 * the overlay shows a small hint instead of a fake cat. A user-imported
 * sprite-strip image still works as an override.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { DECOR_BACK_ROLE, DECOR_ROLE, artworkFilter, cosmeticIconUrl, cosmeticMarkup } from './cosmetics/render'
import { CosmeticCatalog, itemById } from '../shared/cosmetics'
import { openBongoCatSettings } from './settings-link'
import { BongoSound } from './sound'
import { BongoCatKey, BongoCatSettings, NativeStatus, RpcResult, nativeFrameUrl, skinUrl, soundUrl } from './settings'
import { BongoCatStore } from './store'
import styles from './cat.module.css'

const ROOT_ID = 'dsh-bongo-cat-root'
const BASE_WIDTH = 150
const TAP_MS = 100
const NATIVE_FRAMES = ['idle', 'tap-left', 'tap-right'] as const
const STATS_FLUSH_TAPS = 20
const STATS_FLUSH_MS = 4000

const CORNER_CYCLE: BongoCatSettings['position'][] = ['bottom-right', 'bottom-left', 'top-left', 'top-right']

/** What stats/bump answers with: the debited balance, the lifetime total and
 *  whatever the automatic drop just granted. */
export interface BumpResult {
  counter: number
  lifetimeTaps?: number
  wardrobe?: BongoCatSettings['wardrobe']
  granted?: { id: string; isNew: boolean }[]
}

/** Stat flush helper: batches counter bumps over the RPC channel. */
class StatsFlusher {
  private pending = 0
  private timer: number | null = null

  constructor(
    private readonly rpc: ClientConnectionRpc,
    private readonly onResult: (result: BumpResult) => void
  ) {}

  add(count: number): void {
    this.pending += count
    if (this.pending >= STATS_FLUSH_TAPS) {
      void this.flush()
      return
    }
    if (this.timer === null) {
      this.timer = window.setTimeout(() => {
        this.timer = null
        void this.flush()
      }, STATS_FLUSH_MS)
    }
  }

  async flush(): Promise<void> {
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
    if (this.pending === 0) return
    const count = this.pending
    const result = await this.rpc.call('/bongo-cat', 'stats/bump', { count }) as RpcResult<BumpResult>
    if (result.ok) {
      this.pending = 0
      this.onResult(result.value)
    }
    // on failure the pending count stays and rides the next flush
  }

  dispose(): void {
    if (this.timer !== null) window.clearTimeout(this.timer)
    this.timer = null
  }
}

/**
 * Attach the cat overlay to the document.
 * @param ctx client context (reserved for future service use)
 * @param t optional translator for the first-run hint toast
 * @returns disposer removing the overlay and all listeners.
 */
export function attachBongoCat(ctx: ClientContext, store: BongoCatStore, rpc: ClientConnectionRpc, t?: (key: BongoCatKey) => string): () => void {
  if (document.getElementById(ROOT_ID) !== null) return () => undefined

  const sound = new BongoSound()
  const stats = new StatsFlusher(rpc, (result) => {
    store.applyHostState({
      counter: result.counter,
      ...(result.lifetimeTaps === undefined ? {} : { lifetimeTaps: result.lifetimeTaps }),
      ...(result.wardrobe === undefined ? {} : { wardrobe: result.wardrobe })
    })
    if (result.granted !== undefined && result.granted.length > 0) showDropToast(result.granted)
  })

  // ── DOM ───────────────────────────────────────────────────────
  const root = document.createElement('div')
  root.id = ROOT_ID
  root.className = styles['bc-root']
  root.dataset.plugin = 'dsh-plugin-bongo-cat'

  const stage = document.createElement('div')
  stage.className = styles['bc-stage']
  stage.title = t ? t('openSettingsHint') : 'Click for settings'

  // user-imported sprite strip (optional override)
  const sprite = document.createElement('div')
  sprite.className = styles['bc-sprite']

  // ── original Steam artwork ────────────────────────────────────
  const nativeWrap = document.createElement('div')
  nativeWrap.className = styles['bc-native']
  nativeWrap.dataset.role = 'bongo-cat-native'
  const nativeImgs: Partial<Record<(typeof NATIVE_FRAMES)[number], HTMLImageElement>> = {}
  for (const frame of NATIVE_FRAMES) {
    const img = document.createElement('img')
    img.className = styles['bc-native-img']
    img.dataset.frame = frame
    img.alt = ''
    img.draggable = false
    img.addEventListener('load', () => {
      if (settings !== null && !disposed) applyPosition(settings)
    })
    nativeImgs[frame] = img
    nativeWrap.append(img)
  }
  nativeWrap.dataset.active = 'idle'

  // Worn stickers. Two layers: `back` items (wings) paint under the
  // transparent artwork so only their tips show past the silhouette; `front`
  // items (hats, faces, scarves) sit on top.
  const decorBack = document.createElement('div')
  decorBack.className = 'bc-decor'
  decorBack.dataset.role = DECOR_BACK_ROLE
  decorBack.setAttribute('aria-hidden', 'true')

  const decor = document.createElement('div')
  decor.className = 'bc-decor'
  decor.dataset.role = DECOR_ROLE
  decor.setAttribute('aria-hidden', 'true')

  // shown when no original artwork is available
  const empty = document.createElement('div')
  empty.className = styles['bc-empty']
  empty.dataset.role = 'bongo-cat-empty'
  empty.textContent = t ? t('nativeMissingShort') : '请先在设置里导入原版资源'

  const badge = document.createElement('div')
  badge.className = styles['bc-badge']
  badge.dataset.role = 'bongo-cat-counter'
  const drum = document.createElement('span')
  drum.className = styles['bc-badge-drum']
  drum.textContent = '🥁'
  const count = document.createElement('span')
  count.className = styles['bc-badge-count']
  count.textContent = '0'
  badge.append(drum, count)

  // Hover affordance for the click-to-settings gesture (pointer-events: none,
  // so it never steals the drag).
  const hint = document.createElement('div')
  hint.className = styles['bc-hint']
  hint.dataset.role = 'bongo-cat-hint-chip'
  hint.textContent = t ? t('openSettings') : 'Settings'

  stage.append(decorBack, sprite, nativeWrap, decor, empty, badge, hint)
  root.append(stage)
  document.body.append(root)

  // ── state ─────────────────────────────────────────────────────
  let settings: BongoCatSettings | null = null
  let disposed = false
  let paused = false
  let nextSide: 'left' | 'right' = 'left'
  let tapTimer: number | null = null
  let spriteIdleTimer: number | null = null
  let hintToastTimer: number | null = null
  let dropToastTimer: number | null = null
  let sessionTaps = 0
  let nativeStatus: NativeStatus = { available: false }
  let nativeStamp = ''
  let nativeFrame: (typeof NATIVE_FRAMES)[number] = 'idle'

  const cls = (name: string): string => styles[name] ?? name

  // ── projection ────────────────────────────────────────────────
  const applySprite = (next: BongoCatSettings): void => {
    const active = next.customSkinRevision > 0
    root.classList.toggle(cls('bc-sprite-mode'), active)
    if (!active) return
    const frames = Math.min(12, Math.max(2, next.customSkinFrames))
    sprite.style.backgroundImage = `url("${skinUrl(next.customSkinRevision)}")`
    sprite.style.backgroundSize = `${frames * 100}% 100%`
    sprite.style.backgroundPosition = '0 50%'
  }

  const stageHeight = (width: number): number => {
    if (root.classList.contains(cls('bc-sprite-mode'))) return Math.round(width * 0.75)
    const img = nativeImgs.idle
    if (img !== undefined && img.naturalWidth > 0 && img.naturalHeight > 0) {
      return Math.round((width * img.naturalHeight) / img.naturalWidth)
    }
    return Math.round((width * 501) / 777)
  }

  const applyPosition = (next: BongoCatSettings): void => {
    const width = Math.round(BASE_WIDTH * next.size)
    stage.style.width = `${width}px`
    const height = stage.offsetHeight || stageHeight(width)
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left: number
    let top: number
    if (next.position === 'bottom-right') {
      left = vw - next.offsetX - width
      top = vh - next.offsetY - height
    } else if (next.position === 'bottom-left') {
      left = next.offsetX
      top = vh - next.offsetY - height
    } else if (next.position === 'top-left') {
      left = next.offsetX
      top = next.offsetY
    } else {
      left = vw - next.offsetX - width
      top = next.offsetY
    }
    root.style.left = `${Math.round(left)}px`
    root.style.top = `${Math.round(top)}px`
  }

  const applyBadge = (next: BongoCatSettings): void => {
    badge.style.display = next.showCounter ? '' : 'none'
    count.textContent = (next.counter + sessionTaps).toLocaleString()
  }

  const applySound = (next: BongoCatSettings): void => {
    sound.setVolume(next.soundEnabled ? next.volume : 0)
    sound.setCustomUrl(next.customSoundRevision > 0 ? soundUrl(next.customSoundRevision) : null)
  }

  const applySpeed = (next: BongoCatSettings): void => {
    root.style.setProperty('--bc-speed', String(Math.min(2.5, Math.max(0.5, next.speed))))
  }

  /**
   * Project the wardrobe onto the cat: stickers inside the stage, fur colour
   * as a filter on the artwork (never on the root, or the badge and stickers
   * would be tinted too).
   *
   * The markup is rebuilt only when the equipped set or the fur changes — the
   * drop that triggers it also bumps `owned`, and rebuilding the layer on
   * every owned-count change would restart the sticker entrance animation.
   */
  let cosmeticKey = ''
  let catalog: CosmeticCatalog = { stamp: '', size: [1, 1], items: [] }
  const applyCosmetics = (next: BongoCatSettings): void => {
    const wardrobe = next.wardrobe
    const key = `${catalog.stamp}|${wardrobe.fur}|${wardrobe.equipped.hat ?? ''}|${wardrobe.equipped.face ?? ''}|${wardrobe.equipped.back ?? ''}|${wardrobe.equipped.accessory ?? ''}`
    if (key !== cosmeticKey) {
      cosmeticKey = key
      decor.innerHTML = cosmeticMarkup(wardrobe, catalog, 'front')
      decorBack.innerHTML = cosmeticMarkup(wardrobe, catalog, 'back')
    }
    const filter = artworkFilter(wardrobe)
    if (nativeWrap.style.filter !== filter) {
      nativeWrap.style.filter = filter
      sprite.style.filter = filter
    }
  }

  // ── original artwork plumbing ─────────────────────────────────
  const applyNativeSources = (): void => {
    if (!nativeStatus.available) return
    const stamp = nativeStamp || nativeStatus.extractedAt || '1'
    for (const frame of NATIVE_FRAMES) {
      const img = nativeImgs[frame]
      if (!img) continue
      const url = nativeFrameUrl(frame, stamp)
      if (img.getAttribute('src') !== url) img.src = url
    }
  }

  const applyMode = (next: BongoCatSettings): void => {
    const custom = next.customSkinRevision > 0
    const native = !custom && nativeStatus.available
    root.classList.toggle(cls('bc-native-mode'), native)
    root.classList.toggle(cls('bc-empty-mode'), !custom && !native)
    nativeWrap.style.display = native ? '' : 'none'
    empty.style.display = !custom && !native ? '' : 'none'
    // Nothing to dress when there is no artwork at all.
    const dressed = custom || native
    decor.style.display = dressed ? '' : 'none'
    decorBack.style.display = dressed ? '' : 'none'
    if (native) applyNativeSources()
  }

  const setNativeFrame = (frame: (typeof NATIVE_FRAMES)[number]): void => {
    if (nativeFrame === frame) return
    nativeFrame = frame
    nativeWrap.dataset.active = frame
  }

  const refreshNative = async (): Promise<void> => {
    const result = await rpc.call('/bongo-cat', 'native/status', {}) as RpcResult<NativeStatus>
    nativeStatus = result.ok ? result.value : { available: false }
    nativeStamp = nativeStatus.extractedAt ?? ''
    if (disposed || settings === null) return
    applyMode(settings)
    applyPosition(settings)
  }

  const refreshCosmetics = async (): Promise<void> => {
    const result = await rpc.call('/bongo-cat', 'cosmetics/catalog', {}) as RpcResult<CosmeticCatalog>
    if (disposed) return
    catalog = result.ok ? result.value : { stamp: '', size: [1, 1], items: [] }
    if (settings !== null) applyCosmetics(settings)
  }

  const paint = (next: BongoCatSettings): void => {
    const prev = settings
    settings = next
    if (prev === null || prev.customSkinRevision !== next.customSkinRevision
      || prev.customSkinFrames !== next.customSkinFrames) {
      applySprite(next)
    }
    applySpeed(next)
    applyPosition(next)
    applyBadge(next)
    applySound(next)
    applyCosmetics(next)
    applyMode(next)
    root.style.display = next.enabled ? '' : 'none'
    maybeShowHint(next)
  }

  /** One-shot first-run hint (dsh-wallpaper-engine's notice pattern, mini). */
  const maybeShowHint = (next: BongoCatSettings): void => {
    if (next.hintSeen || !next.enabled || hintToastTimer !== null) return
    hintToastTimer = window.setTimeout(() => {
      hintToastTimer = null
      if (disposed || settings === null || settings.hintSeen) return
      const toast = document.createElement('div')
      toast.className = styles['bc-toast']
      toast.dataset.role = 'bongo-cat-hint'
      toast.textContent = t ? t('hintToast') : '打字、点鼠标，猫就会敲起来！'
      root.append(toast)
      window.setTimeout(() => toast.remove(), 6000)
      void store.set({ hintSeen: true })
    }, 800)
  }

  /** Toast when the automatic drop grants an item: its icon plus the slot. */
  const showDropToast = (grants: { id: string; isNew: boolean }[]): void => {
    if (disposed) return
    const first = grants[0]
    const item = first === undefined ? undefined : itemById(catalog.items, first.id)
    const toast = document.createElement('div')
    toast.className = styles['bc-toast']
    toast.dataset.role = 'bongo-cat-drop'
    const art = document.createElement('span')
    art.className = styles['bc-toast-art']
    if (item !== undefined) {
      const img = document.createElement('img')
      img.src = cosmeticIconUrl(item.id, catalog.stamp)
      img.alt = ''
      img.draggable = false
      art.append(img)
    }
    const text = document.createElement('span')
    const label = t ? t('wardrobeDrop') : 'New cosmetic'
    const slot = item === undefined
      ? ''
      : item.slot === 'hat'
        ? t ? t('wardrobeHat') : 'Hats'
        : item.slot === 'face'
          ? t ? t('wardrobeFace') : 'Face'
          : item.slot === 'back'
            ? t ? t('wardrobeBack') : 'Wings'
            : t ? t('wardrobeAccessory') : 'Extras'
    text.textContent = grants.length > 1 ? `${label} ×${grants.length}` : `${label} · ${slot}`
    toast.append(art, text)
    root.append(toast)
    if (dropToastTimer !== null) window.clearTimeout(dropToastTimer)
    dropToastTimer = window.setTimeout(() => {
      toast.remove()
      dropToastTimer = null
    }, 4200)
  }

  // ── interaction ───────────────────────────────────────────────
  const setTap = (side: 'left' | 'right'): void => {
    root.classList.remove(cls('bc-tap-left'), cls('bc-tap-right'))
    // force reflow so rapid alternating taps restart the transition
    void root.offsetWidth
    root.classList.add(cls(`bc-tap-${side}`))
    setNativeFrame(side === 'left' ? 'tap-left' : 'tap-right')
    if (tapTimer !== null) window.clearTimeout(tapTimer)
    tapTimer = window.setTimeout(() => {
      root.classList.remove(cls('bc-tap-left'), cls('bc-tap-right'))
      setNativeFrame('idle')
      tapTimer = null
    }, TAP_MS)
  }

  const setSpriteFrame = (frame: number): void => {
    if (settings === null || settings.customSkinRevision <= 0) return
    const frames = Math.min(12, Math.max(2, settings.customSkinFrames))
    const safe = Math.min(frame, frames - 1)
    sprite.style.backgroundPosition = `${(safe / (frames - 1)) * 100}% 50%`
    if (spriteIdleTimer !== null) window.clearTimeout(spriteIdleTimer)
    spriteIdleTimer = window.setTimeout(() => {
      sprite.style.backgroundPosition = '0 50%'
      spriteIdleTimer = null
    }, Math.max(120, TAP_MS * 4))
  }

  const slap = (side: 'left' | 'right'): void => {
    if (settings === null || paused) return
    setTap(side)
    setSpriteFrame(side === 'left' ? 1 : 2)
    if (settings.soundEnabled) sound.tok(1)
    sessionTaps += 1
    applyBadge(settings)
    stats.add(1)
  }

  /**
   * Every input hits one paw, alternating left / right — the game itself
   * exposes only CatHitLeft and CatHitRight (no two-paw hit), so typing and
   * clicking share a single alternation here too.
   */
  const slapNext = (): void => {
    const side = nextSide
    nextSide = side === 'left' ? 'right' : 'left'
    slap(side)
  }

  const cycleCorner = (): void => {
    if (settings === null) return
    const index = CORNER_CYCLE.indexOf(settings.position)
    const next = CORNER_CYCLE[(index + 1) % CORNER_CYCLE.length]
    void store.set({ position: next })
  }

  // ── keyboard & mouse listeners ────────────────────────────────
  const onKeyDown = (event: KeyboardEvent): void => {
    if (disposed || settings === null || !settings.enabled) return
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key === 'Shift' || event.key === 'CapsLock') return
    slapNext()
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (disposed || settings === null || !settings.enabled) return
    if (event.button !== 0) return
    // `event.target` is typed EventTarget; a pointer target is always a Node.
    // Cast rather than `instanceof Node`: the constructor is realm-local, so
    // an instanceof check silently inverts inside jsdom or an iframe.
    const target = event.target as Node | null
    if (target !== null && root.contains(target)) return
    slapNext()
  }

  // ── drag & click on the cat ───────────────────────────────────
  let dragStart: { x: number; y: number; left: number; top: number } | null = null
  let dragging = false

  const onStagePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    // A pending single-click jump dies the moment a second press starts: that
    // press is either the start of a double-click or of a drag, and neither
    // should open Settings.
    if (openTimer !== null) {
      window.clearTimeout(openTimer)
      openTimer = null
      clickCandidate = true
    }
    dragStart = { x: event.clientX, y: event.clientY, left: root.offsetLeft, top: root.offsetTop }
    // Optional chain: older engines and jsdom do not implement capture.
    stage.setPointerCapture?.(event.pointerId)
  }

  const onStagePointerMove = (event: PointerEvent): void => {
    if (dragStart === null) return
    const dx = event.clientX - dragStart.x
    const dy = event.clientY - dragStart.y
    if (!dragging && Math.hypot(dx, dy) < 5) return
    dragging = true
    root.classList.add(cls('bc-is-dragging'))
    const width = stage.offsetWidth
    const height = stage.offsetHeight
    const left = Math.min(Math.max(0, dragStart.left + dx), window.innerWidth - width)
    const top = Math.min(Math.max(0, dragStart.top + dy), window.innerHeight - height)
    root.style.left = `${Math.round(left)}px`
    root.style.top = `${Math.round(top)}px`
  }

  const onStagePointerUp = (event: PointerEvent): void => {
    stage.releasePointerCapture?.(event.pointerId)
    if (!dragging) {
      dragStart = null
      return
    }
    dragging = false
    // The pointerup that ends a drag is followed by a click; swallow it.
    suppressClick = true
    window.setTimeout(() => { suppressClick = false }, 400)
    root.classList.remove(cls('bc-is-dragging'))
    const start = dragStart
    dragStart = null
    if (start === null || settings === null) return

    // snap the drop point onto the nearest corner + offsets
    const width = stage.offsetWidth
    const height = stage.offsetHeight
    const left = root.offsetLeft
    const top = root.offsetTop
    const right = window.innerWidth - (left + width)
    const bottom = window.innerHeight - (top + height)
    const position: BongoCatSettings['position'] =
      right <= left && bottom <= top ? 'bottom-right'
        : left < right && bottom <= top ? 'bottom-left'
          : left < right && top < bottom ? 'top-left'
            : 'top-right'
    void store.set({
      position,
      offsetX: Math.round(Math.min(left, right)),
      offsetY: Math.round(Math.min(top, bottom))
    })
  }

  /**
   * A drag still ends with a `click` on the stage, so the gesture that moves
   * the cat must not also open Settings. The flag is set on drop and expires
   * on its own in case the click never arrives (dropped outside the stage).
   */
  let suppressClick = false
  let openTimer: number | null = null
  let pokeTimer: number | null = null
  /** A second press landed while a single-click jump was still pending. */
  let clickCandidate = false

  /** Short squash so the click feels acknowledged before the panel opens. */
  const poke = (): void => {
    root.classList.add(cls('bc-poked'))
    if (pokeTimer !== null) window.clearTimeout(pokeTimer)
    pokeTimer = window.setTimeout(() => {
      root.classList.remove(cls('bc-poked'))
      pokeTimer = null
    }, 260)
  }

  const onStageClick = (event: MouseEvent): void => {
    if (suppressClick) {
      suppressClick = false
      clickCandidate = false
      return
    }
    // Double-click owns the corner cycle, so a single click waits one tap
    // interval before it acts. `detail` alone is not enough: a slow second
    // click still arrives as detail 1, and the pointerdown above has already
    // cancelled the pending jump — `clickCandidate` carries that over.
    if (event.detail > 1 || clickCandidate) {
      clickCandidate = false
      if (openTimer !== null) {
        window.clearTimeout(openTimer)
        openTimer = null
      }
      cycleCorner()
      return
    }
    if (openTimer !== null) window.clearTimeout(openTimer)
    openTimer = window.setTimeout(() => {
      openTimer = null
      poke()
      openBongoCatSettings(t ? t('nav') : 'Bongo Cat')
    }, 240)
  }

  // ── visibility pause ──────────────────────────────────────────
  // A hidden tab has no reason to animate or keep the AudioContext alive.
  const onVisibilityChange = (): void => {
    if (disposed) return
    const hidden = document.visibilityState === 'hidden'
    if (hidden === paused) return
    paused = hidden
    root.classList.toggle(cls('bc-paused'), paused)
    if (paused) sound.suspend()
    else sound.resume()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  // ── resize ────────────────────────────────────────────────────
  let resizeRaf = 0
  const onResize = (): void => {
    if (resizeRaf !== 0) return
    resizeRaf = window.requestAnimationFrame(() => {
      resizeRaf = 0
      if (settings !== null) applyPosition(settings)
    })
  }

  // ── wire up ───────────────────────────────────────────────────
  const unsubscribe = store.subscribe(() => {
    const snapshot = store.getSnapshot()
    if (snapshot.status !== 'ready' || snapshot.value === undefined) return
    paint(snapshot.value)
  })

  window.addEventListener('keydown', onKeyDown)
  document.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('resize', onResize)
  stage.addEventListener('pointerdown', onStagePointerDown)
  stage.addEventListener('pointermove', onStagePointerMove)
  stage.addEventListener('pointerup', onStagePointerUp)
  stage.addEventListener('pointercancel', onStagePointerUp)
  stage.addEventListener('click', onStageClick)
  window.addEventListener('pagehide', () => { void stats.flush() })

  // the settings panel fires this after importing / removing the original art
  const onNativeChanged = (): void => {
    void refreshNative()
    void refreshCosmetics()
  }
  window.addEventListener('bongo-cat:native-changed', onNativeChanged)
  void refreshNative()
  void refreshCosmetics()

  // initial paint from whatever the store already holds
  const initial = store.getSnapshot()
  if (initial.status === 'ready' && initial.value !== undefined) paint(initial.value)

  return () => {
    disposed = true
    window.clearTimeout(tapTimer ?? 0)
    window.clearTimeout(hintToastTimer ?? 0)
    window.clearTimeout(dropToastTimer ?? 0)
    if (openTimer !== null) window.clearTimeout(openTimer)
    if (pokeTimer !== null) window.clearTimeout(pokeTimer)
    if (spriteIdleTimer !== null) window.clearTimeout(spriteIdleTimer)
    window.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('bongo-cat:native-changed', onNativeChanged)
    window.removeEventListener('resize', onResize)
    stage.removeEventListener('pointerdown', onStagePointerDown)
    stage.removeEventListener('pointermove', onStagePointerMove)
    stage.removeEventListener('pointerup', onStagePointerUp)
    stage.removeEventListener('pointercancel', onStagePointerUp)
    stage.removeEventListener('click', onStageClick)
    unsubscribe()
    stats.dispose()
    sound.dispose()
    root.remove()
  }
}
