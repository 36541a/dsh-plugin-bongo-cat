/**
 * Widget registry — the extension point.
 *
 * A definition owns exactly one concern: how to paint one type of card into a
 * host element and how to keep it in sync with its instance record. It knows
 * nothing about the dock, the cat, or the settings panel, so a widget can be
 * mounted by anything that can hand it a `WidgetContext`.
 */
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import type { WidgetInstance, WidgetType } from '../../shared/widgets'
import type { BongoCatKey } from '../settings'
import type { BongoCatStore } from '../store'
import { clockWidget } from './clock'
import { counterWidget } from './counter'
import { focusWidget } from './focus'
import { steamWidget } from './steam'

/** Everything a widget may reach. Deliberately narrow: no dock, no cat. */
export interface WidgetContext {
  readonly instance: WidgetInstance
  readonly t: (key: BongoCatKey) => string
  readonly rpc: ClientConnectionRpc
  readonly store: BongoCatStore
  /** False when the page was opened from another machine (launch is local-only). */
  readonly isLoopback: boolean
}

/** Lifecycle handed back by `mount`. */
export interface WidgetHandle {
  /** The instance changed (config, size, position) — repaint in place. */
  update(instance: WidgetInstance): void
  /** Remove listeners/timers and detach everything this widget created. */
  destroy(): void
}

export interface WidgetDefinition {
  readonly type: WidgetType
  /** Dictionary key for the card title and the settings list. */
  readonly labelKey: BongoCatKey
  /** Dictionary key for the one-line description in the settings panel. */
  readonly descriptionKey: BongoCatKey
  mount(host: HTMLElement, ctx: WidgetContext): WidgetHandle
}

export const WIDGET_DEFINITIONS: readonly WidgetDefinition[] = [
  clockWidget,
  counterWidget,
  focusWidget,
  steamWidget
]

const BY_TYPE = new Map<WidgetType, WidgetDefinition>(WIDGET_DEFINITIONS.map((widget) => [widget.type, widget]))

/** Look up a definition; undefined for a type this build does not ship. */
export function widgetDefinition(type: WidgetType): WidgetDefinition | undefined {
  return BY_TYPE.get(type)
}
