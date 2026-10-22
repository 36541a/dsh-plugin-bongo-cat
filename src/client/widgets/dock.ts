/**
 * Widget dock — the composition layer.
 *
 * Owns exactly one thing: turning the `widgets` settings array into mounted
 * cards (and back). It has no knowledge of what a widget draws, and the cat
 * overlay has no knowledge of this layer, so either half can be removed
 * without touching the other:
 *
 *   cat    → `#dsh-bongo-cat-root`      (one floating sprite)
 *   dock   → `#dsh-bongo-cat-widgets`   (N independent cards)
 *
 * Both are mounted from `apply()` and share the same store, nothing else.
 *
 * Interaction rules:
 *   - the header (or any non-interactive part of the card) drags it;
 *   - the drop position is persisted through the store's coalescing writer,
 *     so a long drag costs one `config/set`, not one per pointermove;
 *   - cards are clamped into the viewport on resize without rewriting the
 *     stored seat, so shrinking the window never destroys a user's layout.
 */
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { WidgetInstance, withWidget } from '../../shared/widgets'
import type { BongoCatKey, BongoCatSettings } from '../settings'
import type { BongoCatStore } from '../store'
import { widgetDefinition } from './registry'
import './widgets.css'

const LAYER_ID = 'dsh-bongo-cat-widgets'
const DRAG_MARGIN = 8

interface Mounted {
  card: HTMLElement
  handle: { update(instance: WidgetInstance): void; destroy(): void }
  instance: WidgetInstance
}

/** Attach the dock layer; returns a disposer that removes it entirely. */
export function attachWidgetDock(
  store: BongoCatStore,
  rpc: ClientConnectionRpc,
  t: (key: BongoCatKey) => string,
  isLoopback: boolean
): () => void {
  if (document.getElementById(LAYER_ID) !== null) return () => undefined

  const layer = document.createElement('div')
  layer.id = LAYER_ID
  layer.className = 'bc-widget-layer'
  layer.dataset.role = 'bongo-cat-widgets'
  document.body.append(layer)

  const mounted = new Map<string, Mounted>()
  let topZ = 10
  let disposed = false

  const clamp = (value: number, max: number): number => Math.max(DRAG_MARGIN, Math.min(value, Math.max(DRAG_MARGIN, max)))

  const seat = (card: HTMLElement, instance: WidgetInstance): void => {
    const width = card.offsetWidth || 160
    const height = card.offsetHeight || 80
    card.style.left = `${clamp(instance.x, window.innerWidth - width - DRAG_MARGIN)}px`
    card.style.top = `${clamp(instance.y, window.innerHeight - height - DRAG_MARGIN)}px`
  }

  const persist = (instance: WidgetInstance): void => {
    const current = store.getSnapshot().value
    if (current === null || current === undefined) return
    const next = withWidget(current.widgets, instance.id, { x: instance.x, y: instance.y })
    void store.set({ widgets: next })
  }

  const makeCard = (instance: WidgetInstance): Mounted | null => {
    const definition = widgetDefinition(instance.type)
    if (definition === undefined) return null
    const card = document.createElement('section')
    card.className = 'bc-widget'
    card.dataset.widgetId = instance.id
    card.dataset.widgetType = instance.type
    card.dataset.size = instance.size

    const head = document.createElement('header')
    head.className = 'bc-widget-head'
    head.dataset.role = 'widget-drag'
    const title = document.createElement('span')
    title.className = 'bc-widget-title'
    title.textContent = t(definition.labelKey)
    const grip = document.createElement('span')
    grip.className = 'bc-widget-grip'
    grip.setAttribute('aria-hidden', 'true')
    grip.textContent = '⠿'
    head.append(title, grip)

    const body = document.createElement('div')
    body.className = 'bc-widget-body'
    card.append(head, body)
    layer.append(card)

    const handle = definition.mount(body, { instance, t, rpc, store, isLoopback })
    const record: Mounted = { card, handle, instance }
    seat(card, instance)

    let dragging: { offsetX: number; offsetY: number } | null = null

    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return
      const target = event.target as HTMLElement | null
      // Buttons and other controls inside the body keep their own gestures.
      if (target !== null && target.closest('button, a, input, select, textarea') !== null) return
      topZ += 1
      card.style.zIndex = String(topZ)
      dragging = {
        offsetX: event.clientX - card.offsetLeft,
        offsetY: event.clientY - card.offsetTop
      }
      card.dataset.dragging = 'true'
      // Pointer capture keeps the drag alive over other cards; jsdom (used by
      // the smoke tests) and older engines simply do not implement it.
      if (typeof card.setPointerCapture === 'function') card.setPointerCapture(event.pointerId)
      event.preventDefault()
    }

    const onPointerMove = (event: PointerEvent): void => {
      if (dragging === null) return
      const width = card.offsetWidth
      const height = card.offsetHeight
      const left = clamp(event.clientX - dragging.offsetX, window.innerWidth - width - DRAG_MARGIN)
      const top = clamp(event.clientY - dragging.offsetY, window.innerHeight - height - DRAG_MARGIN)
      card.style.left = `${left}px`
      card.style.top = `${top}px`
    }

    const onPointerUp = (event: PointerEvent): void => {
      if (dragging === null) return
      dragging = null
      delete card.dataset.dragging
      if (typeof card.hasPointerCapture === 'function' && card.hasPointerCapture(event.pointerId)) {
        card.releasePointerCapture(event.pointerId)
      }
      record.instance = { ...record.instance, x: Math.round(card.offsetLeft), y: Math.round(card.offsetTop) } as WidgetInstance
      persist(record.instance)
    }

    card.addEventListener('pointerdown', onPointerDown)
    card.addEventListener('pointermove', onPointerMove)
    card.addEventListener('pointerup', onPointerUp)
    card.addEventListener('pointercancel', onPointerUp)

    return record
  }

  const destroyCard = (record: Mounted): void => {
    record.handle.destroy()
    record.card.remove()
  }

  const sync = (settings: BongoCatSettings): void => {
    const wanted = new Map(settings.widgets.map((instance) => [instance.id, instance]))
    for (const [id, record] of mounted) {
      if (!wanted.has(id)) {
        destroyCard(record)
        mounted.delete(id)
      }
    }
    for (const instance of settings.widgets) {
      if (!instance.enabled) {
        const record = mounted.get(instance.id)
        if (record !== undefined) {
          destroyCard(record)
          mounted.delete(instance.id)
        }
        continue
      }
      const existing = mounted.get(instance.id)
      if (existing === undefined) {
        const record = makeCard(instance)
        if (record !== null) mounted.set(instance.id, record)
        continue
      }
      const previous = existing.instance
      existing.instance = instance
      existing.card.dataset.size = instance.size
      existing.card.style.opacity = String(instance.opacity)
      if (previous.x !== instance.x || previous.y !== instance.y) seat(existing.card, instance)
      if (previous.config !== instance.config || previous.size !== instance.size) existing.handle.update(instance)
    }
    // Array order is the stacking order; disabled entries are simply absent.
    for (const [index, instance] of settings.widgets.entries()) {
      const record = mounted.get(instance.id)
      if (record !== undefined) record.card.style.zIndex = String(10 + index)
    }
  }

  const onResize = (): void => {
    for (const record of mounted.values()) seat(record.card, record.instance)
  }

  const unsubscribe = store.subscribe(() => {
    const snapshot = store.getSnapshot()
    if (snapshot.status === 'ready' && snapshot.value !== undefined) sync(snapshot.value)
  })
  const initial = store.getSnapshot()
  if (initial.status === 'ready' && initial.value !== undefined) sync(initial.value)
  window.addEventListener('resize', onResize)

  return () => {
    if (disposed) return
    disposed = true
    unsubscribe()
    window.removeEventListener('resize', onResize)
    for (const record of mounted.values()) destroyCard(record)
    mounted.clear()
    layer.remove()
  }
}
