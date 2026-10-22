/**
 * `counter` widget — the tap counter as a standalone card.
 *
 * Two sources, deliberately different in nature:
 *   - `total`   reads the persisted counter from the store (the same number
 *               the host bumps), so several counter cards always agree;
 *   - `session` counts input since this card mounted, which is useful while
 *               the cat only persists a lifetime total.
 *
 * The widget never writes: bumping is the cat's job. A display that also
 * bumped would double-count against the host.
 */
import type { CounterWidgetConfig } from '../../shared/widgets'
import type { WidgetContext, WidgetDefinition, WidgetHandle } from './registry'

export const counterWidget: WidgetDefinition = {
  type: 'counter',
  labelKey: 'widgetCounter',
  descriptionKey: 'widgetCounterDesc',
  mount(host: HTMLElement, ctx: WidgetContext): WidgetHandle {
    const root = document.createElement('div')
    root.className = 'bc-widget-counter'
    const value = document.createElement('div')
    value.className = 'bc-widget-counter-value'
    const label = document.createElement('div')
    label.className = 'bc-widget-counter-label'
    root.append(value, label)
    host.append(root)

    let config = ctx.instance.config as CounterWidgetConfig
    let session = 0

    const format = (count: number): string => count.toLocaleString()
    const paint = (): void => {
      const snapshot = ctx.store.getSnapshot().value
      const total = snapshot?.lifetimeTaps ?? snapshot?.counter ?? 0
      const count = config.source === 'session' ? session : total
      value.textContent = format(count)
      label.textContent = config.source === 'session' ? ctx.t('widgetCounterSession') : ctx.t('widgetCounterTotal')
      root.dataset.source = config.source
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Shift' || event.key === 'CapsLock') return
      session += 1
      if (config.source === 'session') paint()
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (event.button !== 0) return
      session += 1
      if (config.source === 'session') paint()
    }

    const unsubscribe = ctx.store.subscribe(paint)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    paint()

    return {
      update(instance) {
        config = instance.config as CounterWidgetConfig
        paint()
      },
      destroy() {
        unsubscribe()
        document.removeEventListener('keydown', onKeyDown, true)
        document.removeEventListener('pointerdown', onPointerDown, true)
        root.remove()
      }
    }
  }
}
