/**
 * `focus` widget — a one-shot countdown.
 *
 * Runs off wall-clock deadlines (`Date.now()`) rather than counting ticks, so
 * a throttled background tab or a sleeping laptop still reports the right
 * remaining time when it wakes up. All state is local to the card: nothing is
 * persisted, because a countdown that survives a reload is a different (and
 * much larger) feature than a desktop widget.
 */
import type { FocusWidgetConfig } from '../../shared/widgets'
import { chime } from './chime'
import type { WidgetContext, WidgetDefinition, WidgetHandle } from './registry'

const format = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export const focusWidget: WidgetDefinition = {
  type: 'focus',
  labelKey: 'widgetFocus',
  descriptionKey: 'widgetFocusDesc',
  mount(host: HTMLElement, ctx: WidgetContext): WidgetHandle {
    const root = document.createElement('div')
    root.className = 'bc-widget-focus'
    const time = document.createElement('div')
    time.className = 'bc-widget-focus-time'
    time.dataset.role = 'focus-time'
    const bar = document.createElement('div')
    bar.className = 'bc-widget-focus-bar'
    const fill = document.createElement('div')
    fill.className = 'bc-widget-focus-fill'
    bar.append(fill)
    const controls = document.createElement('div')
    controls.className = 'bc-widget-focus-actions'
    const toggle = document.createElement('button')
    toggle.type = 'button'
    toggle.className = 'bc-widget-button'
    toggle.dataset.role = 'focus-toggle'
    const reset = document.createElement('button')
    reset.type = 'button'
    reset.className = 'bc-widget-button bc-widget-button-ghost'
    reset.dataset.role = 'focus-reset'
    reset.textContent = ctx.t('widgetFocusReset')
    controls.append(toggle, reset)
    root.append(time, bar, controls)
    host.append(root)

    let config = ctx.instance.config as FocusWidgetConfig
    let remaining = config.minutes * 60_000
    let total = remaining
    let deadline: number | null = null
    let ticker: number | null = null

    const stopTicker = (): void => {
      if (ticker !== null) window.clearInterval(ticker)
      ticker = null
    }

    const paint = (): void => {
      if (deadline !== null) remaining = Math.max(0, deadline - Date.now())
      time.textContent = format(remaining)
      const ratio = total === 0 ? 0 : Math.max(0, Math.min(1, remaining / total))
      fill.style.width = `${Math.round(ratio * 100)}%`
      root.dataset.state = deadline === null ? (remaining < total ? 'paused' : 'idle') : 'running'
      toggle.textContent = deadline === null ? ctx.t('widgetFocusStart') : ctx.t('widgetFocusPause')
    }

    const complete = (): void => {
      deadline = null
      remaining = 0
      stopTicker()
      paint()
      if (config.chime) chime(0.6)
      // Leave the 00:00 card up for a moment, then rearm.
      window.setTimeout(() => {
        remaining = total
        paint()
      }, 5000)
    }

    const tick = (): void => {
      if (deadline === null) return
      remaining = Math.max(0, deadline - Date.now())
      if (remaining === 0) complete()
      else paint()
    }

    const start = (): void => {
      if (remaining === 0) remaining = total
      deadline = Date.now() + remaining
      stopTicker()
      ticker = window.setInterval(tick, 250)
      paint()
    }

    const pause = (): void => {
      if (deadline === null) return
      remaining = Math.max(0, deadline - Date.now())
      deadline = null
      stopTicker()
      paint()
    }

    const onToggle = (): void => { if (deadline === null) start(); else pause() }
    const onReset = (): void => {
      deadline = null
      stopTicker()
      remaining = total
      paint()
    }

    toggle.addEventListener('click', onToggle)
    reset.addEventListener('click', onReset)
    paint()

    return {
      update(instance) {
        const next = instance.config as FocusWidgetConfig
        const rearm = next.minutes !== config.minutes
        config = next
        if (rearm) {
          total = config.minutes * 60_000
          if (deadline === null) remaining = total
          paint()
        }
      },
      destroy() {
        stopTicker()
        toggle.removeEventListener('click', onToggle)
        reset.removeEventListener('click', onReset)
        root.remove()
      }
    }
  }
}
