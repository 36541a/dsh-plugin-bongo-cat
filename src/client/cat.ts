/**
 * Bongo Cat overlay controller (browser half).
 *
 * Renders the floating cat into the DSH web shell, listens for typing and
 * clicks, drives the paw-tap / freak / sleep / pet / night states, keeps
 * the counter in sync with the host, and persists position changes.
 *
 * Everything the cat needs is either static SVG (cat-svg.ts), CSS
 * (cat.module.css), or the /bongo-cat RPC channel — no cross-plugin value
 * imports.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { CAT_SVG, paletteVars, decoValue } from './cat-svg'
import { findSkin } from './skins'
import { BongoSound } from './sound'
import { BongoCatSettings, NativeStatus, RpcResult, nativeFrameUrl, skinUrl, soundUrl } from './settings'
import { BongoCatStore } from './store'
import styles from './cat.module.css'

const ROOT_ID = 'dsh-bongo-cat-root'
const BASE_WIDTH = 150
const TAP_MS = 130
const NATIVE_FRAMES = ['idle', 'tap-left', 'tap-right'] as const
const FREAK_WINDOW_MS = 1500
const FREAK_MIN_TAPS = 8
const FREAK_DURATION_MS = 2500
const SLEEP_IDLE_MS = 90_000
const SLEEP_NIGHT_MS = 45_000
const STATS_FLUSH_TAPS = 20
const STATS_FLUSH_MS = 4000

const CORNER_CYCLE: BongoCatSettings['position'][] = ['bottom-right', 'bottom-left', 'top-left', 'top-right']

/** Stat flush helper: batches counter bumps over the RPC channel. */
class StatsFlusher {
  private pending = 0
  private timer: number | null = null

  constructor(private readonly rpc: ClientConnectionRpc) {}

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
    const result = await this.rpc.call('/bongo-cat', 'stats/bump', { count }) as RpcResult<{ counter: number }>
    if (result.ok) this.pending = 0
    // on failure the pending count stays and rides the next flush
  }

  dispose(): void {
    if (this.timer !== null) window.clearTimeout(this.timer)
    this.timer = null
  }
}

/**
 * Attach the cat overlay to the document.
 * @param t optional translator for the first-run hint toast
 * @returns disposer removing the overlay and all listeners.
 */
export function attachBongoCat(ctx: ClientContext, store: BongoCatStore, rpc: ClientConnectionRpc, t?: (key: string) => string): () => void {
  if (document.getElementById(ROOT_ID) !== null) return () => undefined

  const sound = new BongoSound()
  const stats = new StatsFlusher(rpc)

  // ── DOM ───────────────────────────────────────────────────────
  const root = document.createElement('div')
  root.id = ROOT_ID
  root.className = styles['bc-root']
  root.dataset.plugin = 'dsh-plugin-bongo-cat'

  const stage = document.createElement('div')
  stage.className = styles['bc-stage']

  const sprite = document.createElement('div')
  sprite.className = styles['bc-sprite']

  // ── native (original Steam artwork) layer ─────────────────────
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

  const svgHost = document.createElement('div')
  svgHost.innerHTML = CAT_SVG
  const svg = svgHost.firstElementChild

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

  if (svg !== null) stage.append(svg)
  stage.append(sprite, nativeWrap, badge)
  root.append(stage)
  document.body.append(root)

  // ── state ─────────────────────────────────────────────────────
  let settings: BongoCatSettings | null = null
  let disposed = false
  let paused = false
  let tapSide: 'left' | 'right' = 'left'
  let tapTimer: number | null = null
  let freakTimer: number | null = null
  let idleTimer: number | null = null
  let spriteIdleTimer: number | null = null
  let hintToastTimer: number | null = null
  let sessionTaps = 0
  let lastInputAt = Date.now()
  const recentTaps: number[] = []
  let nativeStatus: NativeStatus = { available: false }
  let nativeStamp = ''
  let nativeFrame: (typeof NATIVE_FRAMES)[number] = 'idle'

  const cls = (name: string): string => styles[name] ?? name

  // ── settings projection ───────────────────────────────────────
  const applyPalette = (next: BongoCatSettings): void => {
    const skin = findSkin(next.skin)
    root.setAttribute('style', paletteVars(skin))
    root.dataset.deco = decoValue(skin)
    root.dataset.scheme = 'light'
  }

  const applySprite = (next: BongoCatSettings): void => {
    const active = next.customSkinRevision > 0
    root.classList.toggle(cls('bc-sprite-mode'), active)
    if (!active) return
    const frames = Math.min(12, Math.max(2, next.customSkinFrames))
    sprite.style.backgroundImage = `url("${skinUrl(next.customSkinRevision)}")`
    sprite.style.backgroundSize = `${frames * 100}% 100%`
    sprite.style.backgroundPosition = '0 50%'
  }

  const stageSize = (next: BongoCatSettings): { width: number; height: number } => {
    const width = Math.round(BASE_WIDTH * next.size)
    return { width, height: stage.offsetHeight || Math.round(width / (260 / 230)) }
  }

  const applyPosition = (next: BongoCatSettings): void => {
    const { width, height } = stageSize(next)
    stage.style.width = `${width}px`
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

  // ── original artwork (Steam) ──────────────────────────────────
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
    const useNative = next.renderer !== 'svg' && nativeStatus.available
    root.classList.toggle(cls('bc-native-mode'), useNative)
    nativeWrap.style.display = useNative ? '' : 'none'
    if (useNative) applyNativeSources()
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

  const applyNight = (): void => {
    const hour = new Date().getHours()
    const night = settings?.eggNight === true && (hour >= 23 || hour < 6)
    if (night) root.dataset.night = ''
    else delete root.dataset.night
  }

  const paint = (next: BongoCatSettings): void => {
    const prev = settings
    settings = next
    if (prev === null || prev.skin !== next.skin) {
      applyPalette(next)
      applySpeed(next)
    }
    if (prev === null
      || prev.customSkinRevision !== next.customSkinRevision
      || prev.customSkinFrames !== next.customSkinFrames) {
      applySprite(next)
    }
    applyPosition(next)
    applyBadge(next)
    applySound(next)
    applyMode(next)
    applyNight()
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

  // ── interaction ───────────────────────────────────────────────
  const setTap = (side: 'left' | 'right' | 'both'): void => {
    root.classList.remove(cls('bc-tap-left'), cls('bc-tap-right'), cls('bc-tap-both'))
    // force reflow so rapid alternating taps restart the transition
    void root.offsetWidth
    root.classList.add(cls(`bc-tap-${side}`))
    setNativeFrame(side === 'left' ? 'tap-left' : 'tap-right')
    if (tapTimer !== null) window.clearTimeout(tapTimer)
    tapTimer = window.setTimeout(() => {
      root.classList.remove(cls('bc-tap-left'), cls('bc-tap-right'), cls('bc-tap-both'))
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
    }, 700)
  }

  const enterFreak = (): void => {
    if (settings?.eggFreak !== true) return
    root.classList.add(cls('bc-is-freak'))
    if (freakTimer !== null) window.clearTimeout(freakTimer)
    freakTimer = window.setTimeout(() => {
      root.classList.remove(cls('bc-is-freak'))
      freakTimer = null
    }, FREAK_DURATION_MS)
  }

  const wake = (): void => {
    lastInputAt = Date.now()
    root.classList.remove(cls('bc-is-sleeping'))
  }

  const slap = (side: 'left' | 'right' | 'both'): void => {
    if (settings === null || paused) return
    wake()
    if (side === 'left' || side === 'right') {
      tapSide = side
      setTap(side)
      setSpriteFrame(side === 'left' ? 1 : 2)
    } else {
      setTap('both')
      setSpriteFrame(3)
    }
    if (settings.soundEnabled) {
      const freaking = root.classList.contains(cls('bc-is-freak'))
      sound.tok(freaking ? 1.45 : 1)
    }
    sessionTaps += 1
    applyBadge(settings)
    stats.add(1)

    const now = Date.now()
    recentTaps.push(now)
    while (recentTaps.length > 0 && now - recentTaps[0] > FREAK_WINDOW_MS) recentTaps.shift()
    if (recentTaps.length >= FREAK_MIN_TAPS) enterFreak()
  }

  const pet = (): void => {
    if (settings?.eggPet !== true) return
    wake()
    root.classList.add(cls('bc-is-petting'))
    if (settings.soundEnabled) sound.boop()
    window.setTimeout(() => root.classList.remove(cls('bc-is-petting')), 750)
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
    slap(tapSide === 'left' ? 'right' : 'left')
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (disposed || settings === null || !settings.enabled) return
    if (event.button !== 0) return
    if (event.target !== null && root.contains(event.target)) return
    slap('both')
  }

  // ── drag & click on the cat ───────────────────────────────────
  let dragStart: { x: number; y: number; left: number; top: number } | null = null
  let dragging = false

  const onStagePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return
    dragStart = { x: event.clientX, y: event.clientY, left: root.offsetLeft, top: root.offsetTop }
    stage.setPointerCapture(event.pointerId)
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

  const onStageClick = (event: MouseEvent): void => {
    if (dragging) return
    if (event.detail > 1) {
      cycleCorner()
      return
    }
    pet()
  }

  // ── idle watcher (sleep / night / visibility) ─────────────────
  // Visibility pause, adapted from dsh-wallpaper-engine's occlusion-pause:
  // a hidden tab keeps no reason to animate, synthesize audio or evaluate
  // sleep timers. Unlike their window-blur pause (deliberately NOT applied
  // for desktop shells, where the wallpaper stays visible), page visibility
  // is unambiguous — nothing is on screen.
  const onVisibilityChange = (): void => {
    if (disposed) return
    const hidden = document.visibilityState === 'hidden'
    if (hidden === paused) return
    paused = hidden
    root.classList.toggle(cls('bc-paused'), paused)
    if (paused) {
      sound.suspend()
    } else {
      sound.resume()
      lastInputAt = Date.now()
    }
  }

  const onIdleTick = (): void => {
    if (disposed || settings === null || paused) return
    applyNight()
    if (settings.eggSleep !== true) return
    const idle = Date.now() - lastInputAt
    const night = root.dataset.night !== undefined
    const threshold = night ? SLEEP_NIGHT_MS : SLEEP_IDLE_MS
    if (idle >= threshold && !root.classList.contains(cls('bc-is-freak'))) {
      root.classList.add(cls('bc-is-sleeping'))
    }
  }
  idleTimer = window.setInterval(onIdleTick, 5000)
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
  const onNativeChanged = (): void => { void refreshNative() }
  window.addEventListener('bongo-cat:native-changed', onNativeChanged)
  void refreshNative()

  // initial paint from whatever the store already holds
  const initial = store.getSnapshot()
  if (initial.status === 'ready' && initial.value !== undefined) paint(initial.value)

  return () => {
    disposed = true
    window.clearTimeout(tapTimer ?? 0)
    window.clearTimeout(freakTimer ?? 0)
    window.clearTimeout(hintToastTimer ?? 0)
    if (idleTimer !== null) window.clearInterval(idleTimer)
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
