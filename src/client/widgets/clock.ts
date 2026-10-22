/**
 * `clock` widget — local time, optionally with seconds and date.
 *
 * Owns a 1 s interval that only runs while the card is visible: the timer is
 * suspended with the document (same power-saving rule the cat follows) and
 * dropped on destroy, so mounting N clocks costs N timers, not N×2.
 */
import type { ClockWidgetConfig } from '../../shared/widgets'
import type { WidgetDefinition, WidgetContext, WidgetHandle } from './registry'

const pad = (value: number): string => String(value).padStart(2, '0')

const formatDate = (date: Date, locale: string): string =>
  date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' })

const formatTime = (date: Date, config: ClockWidgetConfig): string => {
  const hours24 = date.getHours()
  const hours = config.hour12 ? ((hours24 + 11) % 12) + 1 : hours24
  const parts = [`${config.hour12 ? hours : pad(hours)}:${pad(date.getMinutes())}`]
  if (config.seconds) parts.push(`:${pad(date.getSeconds())}`)
  if (config.hour12) parts.push(hours24 < 12 ? ' AM' : ' PM')
  return parts.join('')
}

export const clockWidget: WidgetDefinition = {
  type: 'clock',
  labelKey: 'widgetClock',
  descriptionKey: 'widgetClockDesc',
  mount(host: HTMLElement, ctx: WidgetContext): WidgetHandle {
    const root = document.createElement('div')
    root.className = 'bc-widget-clock'
    const time = document.createElement('div')
    time.className = 'bc-widget-clock-time'
    const date = document.createElement('div')
    date.className = 'bc-widget-clock-date'
    root.append(time, date)
    host.append(root)

    const locale = document.documentElement.lang || navigator.language || 'zh-CN'
    let config = ctx.instance.config as ClockWidgetConfig
    let timer: number | null = null

    const paint = (): void => {
      const now = new Date()
      time.textContent = formatTime(now, config)
      date.textContent = config.showDate ? formatDate(now, locale) : ''
      date.hidden = !config.showDate
      // A 1 s tick is plenty; without seconds the minute changes on the
      // wall clock anyway, but a 1 s cadence keeps DST/clock jumps honest.
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(paint, 1000)
    }

    const stop = (): void => {
      if (timer !== null) window.clearTimeout(timer)
      timer = null
    }

    const onVisibility = (): void => {
      if (document.hidden) stop()
      else paint()
    }

    document.addEventListener('visibilitychange', onVisibility)
    paint()

    return {
      update(instance) {
        config = instance.config as ClockWidgetConfig
        paint()
      },
      destroy() {
        document.removeEventListener('visibilitychange', onVisibility)
        stop()
        root.remove()
      }
    }
  }
}
