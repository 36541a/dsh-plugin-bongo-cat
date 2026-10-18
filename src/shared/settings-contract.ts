/**
 * Settings contract — the single source of truth for the bongo-cat
 * settings namespace (borrowed from dsh-wallpaper-engine's ADR-0002:
 * "settings single source of truth").
 *
 * One file defines keys, defaults, ranges and enums. BOTH halves derive
 * from it:
 *   - host (src/index.ts) builds the schemastery schema from these
 *     defaults and validates config/set patches with sanitizeSettingsPatch;
 *   - browser (src/client/settings.ts) re-exports the derived
 *     BongoCatSettings type; the store's coalescing writer speaks the
 *     same shapes.
 *
 * Why this exists: the previous shape had a hand-written schema on the
 * host, a hand-written interface on the client, and a hand-written
 * sanitizer on the host. Whitelist-style duplication drifts silently —
 * a field added on one side only is dropped on the other, and the user
 * symptom is "my setting does not stick" with no error anywhere.
 *
 * HARD CONSTRAINT (the reference project's browser-safety rule, and the
 * reason buildSettingsSchema lives in src/index.ts instead of here):
 * this file is imported by the BROWSER half, so it must be free of
 * VALUE imports — no node builtins, no @deepseek-ai packages, no
 * top-level side effects. Type-only imports are fine (erased at build).
 * If you need schemastery here, the design is wrong.
 *
 * Adding a field: add it here. The host schema, the client type, the
 * settings panel and the sanitizer all follow automatically. Do NOT
 * hand-write a parallel list anywhere else.
 */
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'

/** Anchor corner of the floating cat. */
export const POSITIONS = ['bottom-right', 'bottom-left', 'top-left', 'top-right'] as const
export type BongoCatPosition = (typeof POSITIONS)[number]

/** Field kinds the contract knows how to describe and validate. */
export type FieldKind = 'boolean' | 'string' | 'natural' | 'number' | 'position' | 'enum'

export interface FieldMeta {
  kind: FieldKind
  default: boolean | string | number
  /** inclusive lower bound (natural / number) */
  min?: number
  /** inclusive upper bound (natural / number) */
  max?: number
  /** allowed values for kind 'enum' */
  values?: readonly string[]
  /** false ⇒ only mutable through dedicated endpoints (e.g. counter via stats/*) */
  writable?: boolean
}

/**
 * The contract itself. Every key the namespace accepts, with its kind,
 * default and bounds. `writable: false` marks host-authoritative fields
 * that config/set must refuse (they have dedicated endpoints).
 */
export const SETTINGS_FIELDS = {
  /** Master switch; the browser half renders nothing while false. */
  enabled: { kind: 'boolean', default: true },
  /**
   * Which cat to draw:
   *   auto   — the original Steam artwork when it has been extracted, else the built-in SVG cat
   *   native — the original Steam artwork (falls back to SVG when missing)
   *   svg    — always the built-in SVG cat
   */
  renderer: { kind: 'enum', values: ['auto', 'native', 'svg'], default: 'auto' },
  /** Built-in skin id (see src/client/skins.ts). */
  skin: { kind: 'string', default: 'classic' },
  /** Server-side revision of the imported custom skin image; 0 = none. */
  customSkinRevision: { kind: 'natural', default: 0, max: 1_000_000_000 },
  /** Frame count of the imported sprite-strip skin (horizontal strip). */
  customSkinFrames: { kind: 'natural', default: 4, min: 2, max: 12 },
  /** Cat scale multiplier. */
  size: { kind: 'number', default: 1.2, min: 0.5, max: 3 },
  /** Anchor corner of the floating cat. */
  position: { kind: 'position', default: 'bottom-right' },
  /** Distance in px from the anchored corner. */
  offsetX: { kind: 'natural', default: 28, max: 4000 },
  offsetY: { kind: 'natural', default: 28, max: 4000 },
  /** Animation speed multiplier. */
  speed: { kind: 'number', default: 1, min: 0.5, max: 2.5 },
  /** Synthesized (or imported) tap sound on/off. */
  soundEnabled: { kind: 'boolean', default: true },
  /** Sound volume, 0..1. */
  volume: { kind: 'number', default: 0.6, min: 0, max: 1 },
  /** Server-side revision of the imported custom sound; 0 = none. */
  customSoundRevision: { kind: 'natural', default: 0, max: 1_000_000_000 },
  /** Show the tap counter badge. */
  showCounter: { kind: 'boolean', default: true },
  /** Total taps, persisted here and bumped through stats/bump. */
  counter: { kind: 'natural', default: 0, writable: false },
  /** One-shot first-run hint already shown. */
  hintSeen: { kind: 'boolean', default: false },
  /** Easter egg: burst typing triggers freak mode. */
  eggFreak: { kind: 'boolean', default: true },
  /** Easter egg: idle for a while and the cat dozes off. */
  eggSleep: { kind: 'boolean', default: true },
  /** Easter egg: clicking the cat pets it. */
  eggPet: { kind: 'boolean', default: true },
  /** Easter egg: late-night sleepy palette. */
  eggNight: { kind: 'boolean', default: true }
} as const satisfies Record<string, FieldMeta>

export type SettingsKey = keyof typeof SETTINGS_FIELDS

/** Fields config/set may write (everything not marked writable:false). */
export const WRITABLE_FIELDS: SettingsKey[] = Object.entries(SETTINGS_FIELDS)
  .filter(([, meta]) => meta.writable !== false)
  .map(([key]) => key as SettingsKey)

/** Resolved settings shape, derived from the contract (no hand-written interface). */
type DefaultOf<M extends FieldMeta> =
  M extends { kind: 'boolean' } ? boolean
    : M extends { kind: 'position' } ? BongoCatPosition
      : M extends { kind: 'string' | 'enum' } ? string
        : number
export type BongoCatSettings = { [K in SettingsKey]: DefaultOf<(typeof SETTINGS_FIELDS)[K]> }

/** Defaults object, derived from the contract. */
export const SETTINGS_DEFAULTS: BongoCatSettings = Object.fromEntries(
  Object.entries(SETTINGS_FIELDS).map(([key, meta]) => [key, meta.default])
) as BongoCatSettings

export type SanitizeResult =
  | { ok: true; value: Partial<BongoCatSettings> }
  | { ok: false; error: string }

/** The settings namespace key (lowercase kebab-case). */
export const NS = 'bongo-cat' as SettingsNamespace

/**
 * Validate a client-supplied config patch against the contract.
 * Unknown fields and host-authoritative fields are REJECTED (fail loudly),
 * never silently dropped — a dropped field is a "setting does not stick"
 * bug with no error anywhere.
 */
export function sanitizeSettingsPatch(patch: unknown): SanitizeResult {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
    return { ok: false, error: 'patch must be an object' }
  }
  const input = patch as Record<string, unknown>
  const clean: Record<string, unknown> = {}

  for (const key of Object.keys(input)) {
    const meta = (SETTINGS_FIELDS as Record<string, FieldMeta | undefined>)[key]
    if (meta === undefined || meta.writable === false) {
      return { ok: false, error: `field ${JSON.stringify(key)} is not writable` }
    }
    const value = input[key]
    const fail = (message: string): SanitizeResult => ({ ok: false, error: message })

    switch (meta.kind) {
      case 'boolean':
        if (typeof value !== 'boolean') return fail(`${key} must be a boolean`)
        clean[key] = value
        break
      case 'string':
        if (typeof value !== 'string' || !/^[a-z0-9-]{1,32}$/.test(value)) {
          return fail(`${key} must match /^[a-z0-9-]{1,32}$/`)
        }
        clean[key] = value
        break
      case 'natural': {
        const min = meta.min ?? 0
        const max = meta.max ?? Number.MAX_SAFE_INTEGER
        if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
          return fail(`${key} must be an integer in [${min}, ${max}]`)
        }
        clean[key] = value
        break
      }
      case 'number': {
        const min = meta.min ?? -Number.MAX_VALUE
        const max = meta.max ?? Number.MAX_VALUE
        if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
          return fail(`${key} must be a number in [${min}, ${max}]`)
        }
        clean[key] = Math.round(value * 100) / 100
        break
      }
      case 'position':
        if (typeof value !== 'string' || !(POSITIONS as readonly string[]).includes(value)) {
          return fail(`${key} must be one of ${POSITIONS.join(', ')}`)
        }
        clean[key] = value
        break
      case 'enum': {
        const values = meta.values ?? []
        if (typeof value !== 'string' || !values.includes(value)) {
          return fail(`${key} must be one of ${values.join(', ')}`)
        }
        clean[key] = value
        break
      }
    }
  }
  return { ok: true, value: clean as Partial<BongoCatSettings> }
}
