/**
 * Widget schema — shared by both halves.
 *
 * A widget is a *board*: an instance record (where it sits, how big, whether
 * it is on) plus a small per-type config bag. Both halves need the exact same
 * rules, so they live here rather than being duplicated:
 *   - host: `config/set` validates a `widgets` patch with `sanitizeWidgets`;
 *   - browser: the dock trusts that every instance it renders is already valid,
 *     and the settings panel builds patches with `withWidget`/`newWidget`.
 *
 * Adding a widget type means: add the type here (+ its config interface and
 * sanitizer), then add a definition under `src/client/widgets/`. The dock,
 * the settings panel and the host validator pick it up with no further edits.
 *
 * HARD CONSTRAINT (browser safety): no value imports outside this folder —
 * this file is bundled into the browser half.
 */

/** Widget kinds shipped by this plugin. */
export const WIDGET_TYPES = ['clock', 'counter', 'focus', 'steam'] as const
export type WidgetType = (typeof WIDGET_TYPES)[number]

/** Two sizes keep the board readable without a resize handle. */
export const WIDGET_SIZES = ['sm', 'md'] as const
export type WidgetSize = (typeof WIDGET_SIZES)[number]

/** Upper bound on simultaneously mounted widgets (also caps the patch size). */
export const WIDGET_LIMIT = 12

/** `clock` — local time. */
export interface ClockWidgetConfig {
  /** 24h by default; 12h shows an AM/PM suffix. */
  hour12: boolean
  seconds: boolean
  showDate: boolean
}

/** `counter` — tap statistics fed by the existing counter. */
export interface CounterWidgetConfig {
  /** `total` reads the persisted counter, `session` only this page load. */
  source: 'total' | 'session'
}

/** `focus` — one-shot countdown. */
export interface FocusWidgetConfig {
  minutes: number
  /** Play the plugin's synthesized tap sound when the countdown ends. */
  chime: boolean
}

/** `steam` — installed Steam games as launch buttons. */
export interface SteamWidgetConfig {
  /** How many games to list (most recently played first). */
  limit: number
  showPlaytime: boolean
}

export type WidgetConfigOf = {
  clock: ClockWidgetConfig
  counter: CounterWidgetConfig
  focus: FocusWidgetConfig
  steam: SteamWidgetConfig
}

interface WidgetInstanceBase<T extends WidgetType> {
  /** Stable slug, unique inside the namespace (e.g. `clock`, `clock-2`). */
  id: string
  type: T
  enabled: boolean
  /** Viewport coordinates of the card's top-left corner, in CSS pixels. */
  x: number
  y: number
  size: WidgetSize
  /** 0.4 – 1; the card is meant to sit *under* reading, not over it. */
  opacity: number
  config: WidgetConfigOf[T]
}

export type WidgetInstance =
  | WidgetInstanceBase<'clock'>
  | WidgetInstanceBase<'counter'>
  | WidgetInstanceBase<'focus'>
  | WidgetInstanceBase<'steam'>

/** Per-type defaults, used when an instance is created and when a key is missing. */
export const WIDGET_CONFIG_DEFAULTS: { [K in WidgetType]: WidgetConfigOf[K] } = {
  clock: { hour12: false, seconds: true, showDate: true },
  counter: { source: 'total' },
  focus: { minutes: 25, chime: true },
  steam: { limit: 4, showPlaytime: true }
}

/** Human label keys live in the dictionary, not here (see `WIDGET_LABEL_KEYS`). */
export const WIDGET_LABEL_KEYS: { [K in WidgetType]: string } = {
  clock: 'widgetClock',
  counter: 'widgetCounter',
  focus: 'widgetFocus',
  steam: 'widgetSteam'
}

const ID_PATTERN = /^[a-z][a-z0-9-]{0,31}$/
const MAX_COORD = 20000

const clampNumber = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value * 100) / 100))
}

const boolOr = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback)

const asRecord = (value: unknown): Record<string, unknown> =>
  (typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {})

/**
 * Normalise one instance's config bag.
 *
 * Unlike a top-level settings patch (which fails loudly on anything unknown),
 * a config bag is *forward compatible by design*: keys this build does not
 * know are dropped, missing keys fall back to the type default, and out-of-range
 * numbers clamp. That keeps a profile written by a newer build readable by an
 * older one instead of blocking the whole settings document.
 */
export function sanitizeWidgetConfig(type: WidgetType, raw: unknown): WidgetConfigOf[WidgetType] {
  const input = asRecord(raw)
  switch (type) {
    case 'clock': {
      const defaults = WIDGET_CONFIG_DEFAULTS.clock
      return {
        hour12: boolOr(input.hour12, defaults.hour12),
        seconds: boolOr(input.seconds, defaults.seconds),
        showDate: boolOr(input.showDate, defaults.showDate)
      }
    }
    case 'counter': {
      const defaults = WIDGET_CONFIG_DEFAULTS.counter
      return { source: input.source === 'session' ? 'session' : defaults.source }
    }
    case 'focus': {
      const defaults = WIDGET_CONFIG_DEFAULTS.focus
      return {
        minutes: Math.round(clampNumber(input.minutes, defaults.minutes, 1, 120)),
        chime: boolOr(input.chime, defaults.chime)
      }
    }
    case 'steam': {
      const defaults = WIDGET_CONFIG_DEFAULTS.steam
      return {
        limit: Math.round(clampNumber(input.limit, defaults.limit, 1, 8)),
        showPlaytime: boolOr(input.showPlaytime, defaults.showPlaytime)
      }
    }
  }
}

export type WidgetsResult =
  | { ok: true; value: WidgetInstance[] }
  | { ok: false; error: string }

/**
 * Validate a whole `widgets` array (the value of the settings field).
 *
 * @param value - Raw client input; must be an array.
 * @returns The normalised instances, or a message naming the offending index.
 */
export function sanitizeWidgets(value: unknown): WidgetsResult {
  if (!Array.isArray(value)) return { ok: false, error: 'widgets must be an array' }
  if (value.length > WIDGET_LIMIT) return { ok: false, error: `widgets supports at most ${WIDGET_LIMIT} instances` }
  const seen = new Set<string>()
  const clean: WidgetInstance[] = []
  for (const [index, entry] of value.entries()) {
    const item = asRecord(entry)
    const id = item.id
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      return { ok: false, error: `widgets[${index}].id must match ${ID_PATTERN}` }
    }
    if (seen.has(id)) return { ok: false, error: `widgets[${index}].id ${JSON.stringify(id)} is duplicated` }
    seen.add(id)
    const type = item.type
    if (typeof type !== 'string' || !(WIDGET_TYPES as readonly string[]).includes(type)) {
      return { ok: false, error: `widgets[${index}].type must be one of ${WIDGET_TYPES.join(', ')}` }
    }
    if (typeof item.enabled !== 'boolean') return { ok: false, error: `widgets[${index}].enabled must be a boolean` }
    const size = item.size
    if (typeof size !== 'string' || !(WIDGET_SIZES as readonly string[]).includes(size)) {
      return { ok: false, error: `widgets[${index}].size must be one of ${WIDGET_SIZES.join(', ')}` }
    }
    const x = item.x
    const y = item.y
    if (typeof x !== 'number' || !Number.isFinite(x) || Math.abs(x) > MAX_COORD) {
      return { ok: false, error: `widgets[${index}].x must be a finite number` }
    }
    if (typeof y !== 'number' || !Number.isFinite(y) || Math.abs(y) > MAX_COORD) {
      return { ok: false, error: `widgets[${index}].y must be a finite number` }
    }
    if (typeof item.opacity !== 'number' || !Number.isFinite(item.opacity) || item.opacity < 0.4 || item.opacity > 1) {
      return { ok: false, error: `widgets[${index}].opacity must be a number in [0.4, 1]` }
    }
    const config = sanitizeWidgetConfig(type as WidgetType, item.config)
    clean.push({
      id,
      type: type as WidgetType,
      enabled: item.enabled,
      x: Math.round(x),
      y: Math.round(y),
      size: size as WidgetSize,
      opacity: Math.round(item.opacity * 100) / 100,
      config
    } as WidgetInstance)
  }
  return { ok: true, value: clean }
}

/** Next free instance id for `type` (`clock`, `clock-2`, `clock-3`, …). */
export function nextWidgetId(type: WidgetType, existing: readonly WidgetInstance[]): string {
  const used = new Set(existing.map((widget) => widget.id))
  if (!used.has(type)) return type
  for (let index = 2; index <= WIDGET_LIMIT + 1; index += 1) {
    const candidate = `${type}-${index}`
    if (!used.has(candidate)) return candidate
  }
  return `${type}-${Date.now().toString(36)}`
}

/**
 * Build a new instance. The default seat is a diagonal staircase from the
 * bottom-left corner so freshly added cards never stack exactly on top of
 * each other.
 */
export function newWidget(type: WidgetType, existing: readonly WidgetInstance[], viewport: { width: number; height: number }): WidgetInstance {
  const step = existing.length % 6
  const baseX = 24 + step * 12
  const baseY = Math.max(24, viewport.height - 150 - step * 90)
  return {
    id: nextWidgetId(type, existing),
    type,
    enabled: true,
    x: baseX,
    y: baseY,
    size: 'sm',
    opacity: 1,
    config: { ...WIDGET_CONFIG_DEFAULTS[type] }
  } as WidgetInstance
}

/** Replace one instance by id, keeping array order (order is the z-stack). */
export function withWidget(list: readonly WidgetInstance[], id: string, patch: Partial<WidgetInstance>): WidgetInstance[] {
  return list.map((widget) => (widget.id === id ? { ...widget, ...patch } as WidgetInstance : widget))
}

/** Drop an instance by id. */
export function withoutWidget(list: readonly WidgetInstance[], id: string): WidgetInstance[] {
  return list.filter((widget) => widget.id !== id)
}
