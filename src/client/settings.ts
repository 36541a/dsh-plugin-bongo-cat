/**
 * Shared wall-facing constants and wire types (browser half).
 *
 * The settings TYPE comes from the single-source contract
 * (src/shared/settings-contract.ts) — re-exported here so the rest of the
 * browser half keeps a single import site. Everything else in this file
 * is browser-only: dictionary keys and wire envelopes.
 */
import type { BongoCatSettings } from '../shared/settings-contract'

export type { BongoCatSettings, BongoCatPosition } from '../shared/settings-contract'
export { SETTINGS_DEFAULTS } from '../shared/settings-contract'

export const BONGO_CAT_NS = 'bongo-cat'

/** Dictionary keys of the bongo-cat namespace (single source of truth). */
export type BongoCatKey =
  | 'nav' | 'hint' | 'hintToast' | 'openSettings' | 'openSettingsHint'
  | 'enabledLabel'
  | 'steamSkinsLabel' | 'skinImporting'
  | 'nativeLabel' | 'nativeHint' | 'nativeMissing' | 'nativeMissingShort' | 'nativeReady' | 'nativeImport'
  | 'nativeReimport' | 'nativeRemove' | 'nativeBusy' | 'nativeFailed'
  | 'customLabel' | 'importSkinButton' | 'removeSkinButton' | 'framesLabel' | 'framesHint'
  | 'scanButton' | 'scanning' | 'scanEmpty'
  | 'soundLabel' | 'soundOnLabel' | 'volumeLabel'
  | 'importSoundButton' | 'removeSoundButton'
  | 'positionLabel' | 'posBR' | 'posBL' | 'posTL' | 'posTR'
  | 'offsetLabel' | 'sizeLabel' | 'speedLabel'
  | 'presetLabel' | 'presetFocus' | 'presetZen' | 'presetParty' | 'presetNight' | 'presetApplied'
  | 'counterLabel' | 'counterReset'
  | 'loading' | 'unavailable' | 'remoteWarning' | 'tooLarge' | 'busy'
  // widgets
  | 'widgetSection' | 'widgetHint' | 'widgetAdd' | 'widgetRemove' | 'widgetEmpty'
  | 'widgetSize' | 'widgetSizeSm' | 'widgetSizeMd' | 'widgetOpacity'
  | 'widgetClock' | 'widgetClockDesc' | 'widgetHour12' | 'widgetSeconds' | 'widgetShowDate'
  | 'widgetCounter' | 'widgetCounterDesc' | 'widgetCounterTotal' | 'widgetCounterSession' | 'widgetSource'
  | 'widgetFocus' | 'widgetFocusDesc' | 'widgetFocusStart' | 'widgetFocusPause' | 'widgetFocusReset'
  | 'widgetMinutes' | 'widgetChime'
  // wardrobe
  | 'wardrobeSection' | 'wardrobeHint' | 'wardrobeHat' | 'wardrobeFace' | 'wardrobeAccessory' | 'wardrobeFur'
  | 'wardrobeFilter' | 'wardrobeFilterAll' | 'wardrobeFilterOwned' | 'wardrobeFilterEquipped'
  | 'wardrobeRandom' | 'wardrobeExchange' | 'wardrobeUnequip' | 'wardrobeEmpty' | 'wardrobeLocked'
  | 'wardrobeCollected' | 'wardrobeNextDrop' | 'wardrobeReady' | 'wardrobeExchanged' | 'wardrobeNewOnes'
  | 'wardrobeNoDrop'

/** Status of the extracted original (Steam) artwork. */
export interface NativeStatus {
  available: boolean
  skin?: string
  size?: number[]
  extractedAt?: string
  gameDir?: string
  missing?: string
}

/** Cache-busted URL of an extracted native frame. */
export function nativeFrameUrl(frame: 'idle' | 'tap-left' | 'tap-right', stamp: string): string {
  return `/plugins/bongo-cat/native/${frame}.png?v=${encodeURIComponent(stamp)}`
}

/** Cache-busted URL of a Steam skin icon. */
export function nativeIconUrl(name: string, stamp: string): string {
  return `/plugins/bongo-cat/native/icons/${encodeURIComponent(name)}.png?v=${encodeURIComponent(stamp)}`
}

/** Structural mirror of the host RpcResult envelope. */
export type RpcResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string; details: Record<string, unknown> } }

/** Cache-busted URL of the imported skin image. */
export function skinUrl(revision: number): string {
  return '/plugins/bongo-cat/skin?v=' + revision
}

/** Cache-busted URL of the imported sound. */
export function soundUrl(revision: number): string {
  return '/plugins/bongo-cat/sound?v=' + revision
}

/** One image found by the host-side Bongo Cat scanner. */
export interface ScannedFile {
  name: string
  path: string
  size: number
}

/** One scanned root (game install / Workshop / AppData). */
export interface ScannedRoot {
  label: string
  path: string
  files: ScannedFile[]
}

/** Payload of a successful skins/import or sounds/import. */
export interface ImportResult {
  revision: number
  name: string
  ext: string
}
