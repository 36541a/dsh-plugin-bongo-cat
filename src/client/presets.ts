/**
 * Mood presets — one-tap configuration snapshots.
 *
 * Borrowed from dsh-wallpaper-engine's preset system (their ADR-0011
 * "preset full snapshot"), simplified to the cat's scale: a preset is a
 * FULL patch of the relevant settings keys, applied through a single
 * config/set. Because the host sanitizes the whole patch atomically,
 * a preset either lands completely or not at all — no half-applied moods.
 *
 * Presets are client-side constants on purpose: they are curated defaults,
 * not user data, so they do not need host storage or sharing machinery.
 * User-saved presets (export/import JSON) are a possible future addition.
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
    patch: {
      size: 0.9, speed: 0.8, soundEnabled: false, showCounter: false,
      eggFreak: false, eggSleep: true, eggPet: true, eggNight: true
    }
  },
  {
    id: 'zen',
    labelKey: 'presetZen',
    patch: {
      size: 1.1, speed: 0.6, soundEnabled: true, volume: 0.3,
      showCounter: true, eggFreak: false, eggSleep: true, eggPet: true, eggNight: true
    }
  },
  {
    id: 'party',
    labelKey: 'presetParty',
    patch: {
      size: 1.6, speed: 1.6, soundEnabled: true, volume: 0.9,
      showCounter: true, eggFreak: true, eggPet: true, eggSleep: false, eggNight: false
    }
  },
  {
    id: 'night',
    labelKey: 'presetNight',
    patch: {
      skin: 'midnight', size: 1.0, speed: 0.8, soundEnabled: true, volume: 0.4,
      showCounter: true, eggFreak: false, eggSleep: true, eggPet: true, eggNight: true
    }
  }
]
