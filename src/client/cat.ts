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
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { BongoSound } from './sound'
import { BongoCatSettings, NativeStatus, RpcResult, nativeFrameUrl, skinUrl, soundUrl } from './settings'
import { BongoCatStore } from './store'
import styles from './cat.module.css'

const ROOT_ID = 'dsh-bongo-cat-root'
const BASE_WIDTH = 150
const TAP_MS = 130
const NATIVE_FRAMES = ['idle', 'tap-left', 'tap-right'] as const
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

  stage.append(sprite, nativeWrap, empty, badge)
  root.append(stage)
  document.body.append(root)

  // ── state ─────────────────────────────────────────────────────
  let settings: BongoCatSettings | null = null
  let disposed = false
  let paused = false
  let tapSide: 'left' | 'right' = 'left'
  let tapTimer: number | null = null
  let spriteIdleTimer: number | null = null
  let hintToastTimer: number | null = null
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
    }, Math.max(120, TAP_MS * 4))
  }

  const slap = (side: 'left' | 'right' | 'both'): void => {
    if (settings === null || paused) return
    if (side === 'left' || side === 'right') {
      tapSide = side
      setTap(side)
      setSpriteFrame(side === 'left' ? 1 : 2)
    } else {
      setTap('both')
      setSpriteFrame(3)
    }
    if (settings.soundEnabled) sound.tok(1)
    sessionTaps += 1
    applyBadge(settings)
    stats.add(1)
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
    if (event.detail > 1) cycleCorner()
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
  const onNativeChanged = (): void => { void refreshNative() }
  window.addEventListener('bongo-cat:native-changed', onNativeChanged)
  void refreshNative()

  // initial paint from whatever the store already holds
  const initial = store.getSnapshot()
  if (initial.status === 'ready' && initial.value !== undefined) paint(initial.value)

  return () => {
    disposed = true
    window.clearTimeout(tapTimer ?? 0)
    window.clearTimeout(hintToastTimer ?? 0)
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
