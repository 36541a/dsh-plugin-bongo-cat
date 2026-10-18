/**
 * Mood presets — one-tap configuration snapshots.
 *
 * A preset is a FULL patch of the cat's behaviour keys, applied through a
 * single config/set. Because the host sanitizes the whole patch atomically,
 * a preset either lands completely or not at all.
 *
 * They deliberately do not touch `skin`: switching skins means re-extracting
 * frames from the game, which the picker handles explicitly.
 */
import type { BongoCatSettings, BongoCatKey } from './settings'

export interface BongoPreset {
  id: string
  labelKey: BongoCatKey
  patch: Partial<BongoCatSettings>
}

export const PRESETS: BongoPreset[] = [
  {
    id: 'focus',
    labelKey: 'presetFocus',
    patch: { size: 0.9, speed: 0.8, soundEnabled: false, showCounter: false }
  },
  {
    id: 'zen',
    labelKey: 'presetZen',
    patch: { size: 1.1, speed: 0.6, soundEnabled: true, volume: 0.3, showCounter: true }
  },
  {
    id: 'party',
    labelKey: 'presetParty',
    patch: { size: 1.6, speed: 1.8, soundEnabled: true, volume: 0.9, showCounter: true }
  },
  {
    id: 'night',
    labelKey: 'presetNight',
    patch: { size: 1.0, speed: 0.8, soundEnabled: true, volume: 0.35, showCounter: true }
  }
]
