/**
 * Wardrobe schema — the cat's dress-up layer, shared by both halves.
 *
 * The reference is the Steam game's own item picker: category tabs, a grid of
 * stickers with rarity stars, a tick on the equipped one, a count badge for
 * duplicates, and a colour wheel. Only the *rules* live here (what exists,
 * what is owned, what is worn, how drops are rolled); the drawings and the
 * panel are browser-side.
 *
 * Splitting it this way keeps one invariant: `config/set` on the host and the
 * panel in the browser can never disagree about which id is legal, which slot
 * it belongs to, or what a missing field means.
 *
 * HARD CONSTRAINT (browser safety): no value imports outside this folder —
 * this file is bundled into the browser half (and, for validation, the host).
 */

/** Slots a sticker can occupy. A slot holds at most one item. */
export const COSMETIC_SLOTS = ['hat', 'face', 'accessory'] as const
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number]

/** Panel tabs: the three slots plus the colour wheel. */
export const WARDROBE_TABS = ['hat', 'face', 'accessory', 'fur'] as const
export type WardrobeTab = (typeof WARDROBE_TABS)[number]

/** 1 = common, 2 = rare, 3 = legendary (the star row on the tile). */
export const RARITIES = [1, 2, 3] as const
export type Rarity = (typeof RARITIES)[number]

export interface CosmeticItem {
  id: string
  slot: CosmeticSlot
  rarity: Rarity
  /**
   * Which side of the artwork the sticker is drawn on.
   *
   * Front (default) is the sticker metaphor — a hat sits on the head. `back`
   * exists for pieces that must read as *behind* the cat (wings, a cape):
   * they are painted underneath the transparent PNG, so only the parts that
   * stick out past the silhouette are visible.
   */
  layer?: 'front' | 'back'
  /** Sticker centre, as a percentage of the cat stage box. */
  x: number
  y: number
  /** Sticker width, as a percentage of the stage width. */
  w: number
  /** Inner SVG markup drawn on a 0 0 100 100 canvas. */
  art: string
}

/**
 * The catalogue.
 *
 * Anchors are percentages of the stage box, measured against the stock
 * "Cat" artwork (a wide loaf: head on the left, paws at the bottom). Skins
 * with a different silhouette still get a recognisable result, and the
 * coordinates are the one thing a contributor tunes after adding art.
 */
export const COSMETIC_ITEMS: readonly CosmeticItem[] = [
  // ── hats ──────────────────────────────────────────────────────
  {
    id: 'beanie', slot: 'hat', rarity: 1, x: 50, y: 6, w: 30,
    art: `<path d="M22 66 A28 34 0 0 1 78 66 Z" fill="#7ec8e3" stroke="#3f6f80" stroke-width="3.5" stroke-linejoin="round"/>
<rect x="18" y="62" width="64" height="14" rx="7" fill="#a9dced" stroke="#3f6f80" stroke-width="3.5"/>
<circle cx="50" cy="26" r="8" fill="#fff6fa" stroke="#3f6f80" stroke-width="3.5"/>
<path d="M36 44 L40 62 M50 40 L50 62 M64 44 L60 62" stroke="#3f6f80" stroke-width="2" opacity="0.35"/>`
  },
  {
    id: 'cap', slot: 'hat', rarity: 1, x: 50, y: 7, w: 32,
    art: `<path d="M24 62 A26 26 0 0 1 76 62 Z" fill="#5aa9e6" stroke="#2f5f85" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M72 62 Q96 62 96 72 L28 72 Z" fill="#3f8fd0" stroke="#2f5f85" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="50" cy="44" r="5" fill="#dff0ff" stroke="#2f5f85" stroke-width="2.5"/>`
  },
  {
    id: 'party', slot: 'hat', rarity: 1, x: 50, y: 2, w: 26,
    art: `<path d="M50 6 L74 80 L26 80 Z" fill="#ff8fa3" stroke="#4a3540" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M39 48 L61 48 M33 64 L67 64" stroke="#fff3f5" stroke-width="6" stroke-linecap="round"/>
<circle cx="50" cy="8" r="7" fill="#ffd166" stroke="#4a3540" stroke-width="3"/>`
  },
  {
    id: 'bow', slot: 'hat', rarity: 1, x: 50, y: 5, w: 22,
    art: `<path d="M50 52 L22 34 Q12 52 22 70 Z" fill="#ff9fb2" stroke="#7d3b4d" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M50 52 L78 34 Q88 52 78 70 Z" fill="#ff9fb2" stroke="#7d3b4d" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="50" cy="52" r="9" fill="#ffc2cf" stroke="#7d3b4d" stroke-width="3.5"/>`
  },
  {
    id: 'tophat', slot: 'hat', rarity: 2, x: 50, y: 1, w: 26,
    art: `<rect x="28" y="26" width="44" height="42" rx="4" fill="#3a3440" stroke="#22202a" stroke-width="3.5"/>
<rect x="28" y="54" width="44" height="9" fill="#e5484d"/>
<ellipse cx="50" cy="72" rx="34" ry="9" fill="#3a3440" stroke="#22202a" stroke-width="3.5"/>`
  },
  {
    id: 'santa', slot: 'hat', rarity: 2, x: 50, y: 3, w: 32,
    art: `<path d="M28 72 Q40 8 74 34 Q66 56 42 72 Z" fill="#e5484d" stroke="#8c2b2f" stroke-width="3.5" stroke-linejoin="round"/>
<rect x="20" y="66" width="58" height="14" rx="7" fill="#fff6f7" stroke="#cfc3c8" stroke-width="3"/>
<circle cx="78" cy="32" r="8" fill="#fff6f7" stroke="#cfc3c8" stroke-width="3"/>`
  },
  {
    id: 'flower', slot: 'hat', rarity: 2, x: 50, y: 6, w: 20,
    art: `<g fill="#ffd166" stroke="#b8860b" stroke-width="2.5">
  <circle cx="50" cy="24" r="11"/><circle cx="72" cy="42" r="11"/><circle cx="64" cy="68" r="11"/>
  <circle cx="36" cy="68" r="11"/><circle cx="28" cy="42" r="11"/>
</g>
<circle cx="50" cy="48" r="10" fill="#fff1c9" stroke="#b8860b" stroke-width="2.5"/>`
  },
  {
    id: 'headphone', slot: 'hat', rarity: 2, x: 50, y: 8, w: 36,
    art: `<path d="M18 56 A32 32 0 0 1 82 56" fill="none" stroke="#4a4a58" stroke-width="8" stroke-linecap="round"/>
<rect x="8" y="50" width="18" height="30" rx="9" fill="#6c6c7a" stroke="#33333d" stroke-width="3.5"/>
<rect x="74" y="50" width="18" height="30" rx="9" fill="#6c6c7a" stroke="#33333d" stroke-width="3.5"/>`
  },
  {
    id: 'crown', slot: 'hat', rarity: 3, x: 50, y: 6, w: 26,
    art: `<path d="M20 70 L20 30 L37 45 L50 20 L63 45 L80 30 L80 70 Z" fill="#ffd166" stroke="#a57c14" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="50" cy="54" r="5" fill="#e5484d"/>
<circle cx="32" cy="58" r="3.5" fill="#4aa3e0"/>
<circle cx="68" cy="58" r="3.5" fill="#4aa3e0"/>`
  },
  {
    id: 'horns', slot: 'hat', rarity: 3, x: 50, y: 4, w: 30,
    art: `<path d="M30 62 Q22 32 36 18 Q42 40 42 62 Z" fill="#b39ddb" stroke="#6b529b" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M70 62 Q78 32 64 18 Q58 40 58 62 Z" fill="#b39ddb" stroke="#6b529b" stroke-width="3.5" stroke-linejoin="round"/>`
  },

  // ── face ──────────────────────────────────────────────────────
  {
    id: 'blush', slot: 'face', rarity: 1, x: 34, y: 45, w: 34,
    art: `<ellipse cx="18" cy="56" rx="13" ry="8" fill="#ff9fb2" opacity="0.7"/>
<ellipse cx="82" cy="56" rx="13" ry="8" fill="#ff9fb2" opacity="0.7"/>`
  },
  {
    id: 'glasses', slot: 'face', rarity: 1, x: 33, y: 43, w: 34,
    art: `<circle cx="33" cy="50" r="15" fill="rgba(255,255,255,0.16)" stroke="#3a2c33" stroke-width="3.5"/>
<circle cx="67" cy="50" r="15" fill="rgba(255,255,255,0.16)" stroke="#3a2c33" stroke-width="3.5"/>
<path d="M48 50 H52" stroke="#3a2c33" stroke-width="3.5"/>
<path d="M18 46 L6 42 M82 46 L94 42" stroke="#3a2c33" stroke-width="3.5" stroke-linecap="round"/>`
  },
  {
    id: 'sweat', slot: 'face', rarity: 1, x: 52, y: 32, w: 16,
    art: `<path d="M50 20 Q72 52 50 66 Q28 52 50 20 Z" fill="#9ad9f0" stroke="#4a90ad" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M42 50 Q46 56 50 50" stroke="#4a90ad" stroke-width="3" fill="none" stroke-linecap="round"/>`
  },
  {
    id: 'anger', slot: 'face', rarity: 1, x: 53, y: 31, w: 18,
    art: `<g stroke="#e5484d" stroke-width="6" stroke-linecap="round" fill="none">
  <path d="M32 26 L58 52"/><path d="M58 26 L32 52"/>
  <path d="M45 14 L45 22"/><path d="M45 56 L45 64"/>
</g>`
  },
  {
    id: 'note', slot: 'face', rarity: 1, x: 58, y: 30, w: 20,
    art: `<path d="M38 22 L38 60" stroke="#5aa9e6" stroke-width="6" stroke-linecap="round"/>
<ellipse cx="30" cy="62" rx="10" ry="8" fill="#5aa9e6"/>
<path d="M38 22 Q56 28 50 44" fill="none" stroke="#5aa9e6" stroke-width="6" stroke-linecap="round"/>`
  },
  {
    id: 'shades', slot: 'face', rarity: 2, x: 33, y: 43, w: 36,
    art: `<rect x="12" y="40" width="32" height="20" rx="8" fill="#26222b"/>
<rect x="56" y="40" width="32" height="20" rx="8" fill="#26222b"/>
<path d="M44 46 H56" stroke="#26222b" stroke-width="5"/>
<path d="M16 44 L24 56" stroke="#6b6672" stroke-width="3" opacity="0.8"/>`
  },
  {
    id: 'star-eyes', slot: 'face', rarity: 2, x: 33, y: 43, w: 32,
    art: `<path d="M33 34 L37.1 44.3 L48.2 45 L39.7 52.2 L42.4 63 L33 57 L23.6 63 L26.3 52.2 L17.8 45 L28.9 44.3 Z" fill="#ffd166" stroke="#b8860b" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M67 34 L71.1 44.3 L82.2 45 L73.7 52.2 L76.4 63 L67 57 L57.6 63 L60.3 52.2 L51.8 45 L62.9 44.3 Z" fill="#ffd166" stroke="#b8860b" stroke-width="2.5" stroke-linejoin="round"/>`
  },
  {
    id: 'hearts', slot: 'face', rarity: 2, x: 33, y: 43, w: 32,
    art: `<path d="M33 64 C18 52 20 38 29 38 C32 38 33 41 33 43 C33 41 34 38 37 38 C46 38 48 52 33 64 Z" fill="#ff6b81" stroke="#b23c4d" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M67 64 C52 52 54 38 63 38 C66 38 67 41 67 43 C67 41 68 38 71 38 C80 38 82 52 67 64 Z" fill="#ff6b81" stroke="#b23c4d" stroke-width="2.5" stroke-linejoin="round"/>`
  },

  // ── accessories ───────────────────────────────────────────────
  {
    id: 'scarf', slot: 'accessory', rarity: 1, x: 51, y: 56, w: 46,
    art: `<path d="M20 40 Q50 64 80 40 L82 58 Q50 78 18 58 Z" fill="#e5484d" stroke="#8c2b2f" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M62 66 L60 94 L76 94 L72 66 Z" fill="#d33b3f" stroke="#8c2b2f" stroke-width="3.5" stroke-linejoin="round"/>`
  },
  {
    id: 'bowtie', slot: 'accessory', rarity: 1, x: 50, y: 58, w: 22,
    art: `<path d="M50 50 L24 36 Q16 50 24 64 Z" fill="#4a6cf7" stroke="#2f4bb5" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M50 50 L76 36 Q84 50 76 64 Z" fill="#4a6cf7" stroke="#2f4bb5" stroke-width="3.5" stroke-linejoin="round"/>
<circle cx="50" cy="50" r="8" fill="#7d97ff" stroke="#2f4bb5" stroke-width="3.5"/>`
  },
  {
    id: 'bell', slot: 'accessory', rarity: 1, x: 50, y: 60, w: 28,
    art: `<path d="M18 34 Q50 64 82 34" fill="none" stroke="#c9a227" stroke-width="6" stroke-linecap="round"/>
<circle cx="50" cy="54" r="12" fill="#ffd166" stroke="#a57c14" stroke-width="3.5"/>
<path d="M42 54 H58" stroke="#a57c14" stroke-width="3"/>
<circle cx="50" cy="62" r="2.5" fill="#a57c14"/>`
  },
  {
    id: 'badge', slot: 'accessory', rarity: 1, x: 28, y: 62, w: 16,
    art: `<circle cx="50" cy="50" r="26" fill="#ffd166" stroke="#a57c14" stroke-width="3.5"/>
<path d="M50 34 l4.7 10.2 11.3 1.3 -8.3 7.8 2.1 11.1 -9.8 -5.5 -9.8 5.5 2.1 -11.1 -8.3 -7.8 11.3 -1.3 Z" fill="#fff8e1" stroke="#a57c14" stroke-width="2"/>`
  },
  {
    id: 'necklace', slot: 'accessory', rarity: 2, x: 48, y: 62, w: 40,
    art: `<path d="M20 34 Q50 72 80 34" fill="none" stroke="#c8cedd" stroke-width="3.5"/>
<path d="M50 62 L58 72 L50 82 L42 72 Z" fill="#7ce0d3" stroke="#2f8a80" stroke-width="3.5" stroke-linejoin="round"/>`
  },
  {
    id: 'bag', slot: 'accessory', rarity: 2, x: 66, y: 64, w: 22,
    art: `<path d="M18 10 Q50 30 44 60" fill="none" stroke="#8b5a2b" stroke-width="5" stroke-linecap="round"/>
<rect x="30" y="54" width="48" height="38" rx="8" fill="#c98a4b" stroke="#7a4f24" stroke-width="3.5"/>
<rect x="30" y="64" width="48" height="8" fill="#a86f38"/>
<circle cx="54" cy="68" r="3" fill="#ffd166" stroke="#7a4f24" stroke-width="2"/>`
  },
  {
    id: 'medal', slot: 'accessory', rarity: 2, x: 32, y: 60, w: 18,
    art: `<path d="M38 6 L50 40 L62 6" fill="none" stroke="#e5484d" stroke-width="8"/>
<circle cx="50" cy="58" r="24" fill="#ffd166" stroke="#a57c14" stroke-width="3.5"/>
<path d="M50 44 l4 8 9 1 -6.5 6 1.5 9 -8 -4.2 -8 4.2 1.5 -9 -6.5 -6 9 -1 Z" fill="#fff8e1"/>`
  },
  {
    id: 'wings', slot: 'accessory', rarity: 3, x: 50, y: 50, w: 96, layer: 'back',
    art: `<path d="M28 54 Q4 44 4 18 Q24 26 34 44 Z" fill="#f4f7ff" stroke="#93a6c8" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M72 54 Q96 44 96 18 Q76 26 66 44 Z" fill="#f4f7ff" stroke="#93a6c8" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M14 34 Q22 40 26 48 M86 34 Q78 40 74 48" stroke="#93a6c8" stroke-width="2.5" fill="none"/>`
  }
]

/** Fur colours: a CSS filter over the artwork plus the swatch fill. */
export interface FurColor {
  id: string
  /** Filter applied to the artwork; empty means "leave it alone". */
  filter: string
  /** Swatch fill in the panel. */
  swatch: string
}

export const FUR_COLORS: readonly FurColor[] = [
  { id: 'original', filter: '', swatch: '#f7f2ec' },
  { id: 'cream', filter: 'sepia(0.3) saturate(1.4) brightness(1.06)', swatch: '#f5e3c0' },
  { id: 'ginger', filter: 'sepia(0.6) saturate(2.8) hue-rotate(-16deg) brightness(0.98)', swatch: '#e8935a' },
  { id: 'cocoa', filter: 'sepia(0.75) saturate(2.2) hue-rotate(-30deg) brightness(0.8)', swatch: '#8a5a3b' },
  { id: 'ash', filter: 'grayscale(0.92) brightness(1.06)', swatch: '#c3c6cf' },
  { id: 'night', filter: 'grayscale(1) brightness(0.52) contrast(1.15)', swatch: '#4a4d57' },
  { id: 'rose', filter: 'sepia(0.45) saturate(3) hue-rotate(295deg)', swatch: '#f2a7c3' },
  { id: 'sky', filter: 'sepia(0.45) saturate(2.6) hue-rotate(170deg)', swatch: '#93c9e8' },
  { id: 'mint', filter: 'sepia(0.45) saturate(2.2) hue-rotate(115deg)', swatch: '#9fd8b6' },
  { id: 'lilac', filter: 'sepia(0.45) saturate(2.5) hue-rotate(230deg)', swatch: '#c0a9e6' }
]

/** Grid filter of the panel (mirrors the game's funnel button). */
export const WARDROBE_FILTERS = ['all', 'owned', 'equipped'] as const
export type WardrobeFilter = (typeof WARDROBE_FILTERS)[number]

export interface WardrobeEquipped {
  hat: string | null
  face: string | null
  accessory: string | null
}

/**
 * Which rule the `claimed` cursor is denominated in.
 *
 * 0.9.3 shipped the jump from "one drop per 120 taps" to "one exchange per
 * 1000 taps" without re-basing the cursor, so a profile that had already
 * collected N drops carried a debt of N exchanges (its `claimed` exceeded
 * `floor(taps / 1000)` forever). The tag makes the two ledgers distinguishable
 * so `migrateWardrobeCursor` can convert exactly once.
 */
export type WardrobeLedger = 'taps120' | 'taps1000'

export interface WardrobeState {
  equipped: WardrobeEquipped
  /** Fur colour id; `original` is the untouched artwork. */
  fur: string
  /** Item id → owned count (≥ 1). Duplicates show as a badge. */
  owned: Record<string, number>
  /** How many exchanges have been spent; the tap ledger's cursor. */
  claimed: number
  /** Unit of `claimed`. Missing on documents written before 0.9.4. */
  ledger: WardrobeLedger
  filter: WardrobeFilter
}

/**
 * Starter kit: three commons so the wardrobe is not an empty grid on first
 * run, and so "equip" can be tried without grinding for drops.
 */
export const STARTER_ITEMS = ['beanie', 'blush', 'scarf'] as const

export const WARDROBE_DEFAULTS: WardrobeState = {
  equipped: { hat: null, face: null, accessory: null },
  fur: 'original',
  owned: { beanie: 1, blush: 1, scarf: 1 },
  claimed: 0,
  ledger: 'taps1000',
  filter: 'all'
}

/** One exchange per N taps — the game's own "play to unlock" pacing. */
export const TAPS_PER_EXCHANGE = 1000

/** What `claimed` counted in the 0.9.0-0.9.3 ledger. Migration only. */
const LEGACY_TAPS_PER_DROP = 120

/** A single exchange call never grants more than this (a long-idle profile). */
export const MAX_EXCHANGE_PER_CALL = 10

const ITEM_WEIGHT: Record<Rarity, number> = { 1: 8, 2: 4, 3: 1 }

const itemMap = new Map(COSMETIC_ITEMS.map((item) => [item.id, item]))

/** Look an item up by id (undefined for ids from a newer build). */
export function itemById(id: string): CosmeticItem | undefined {
  return itemMap.get(id)
}

/** Items of one slot (or every item when the tab is `fur`). */
export function itemsForTab(tab: WardrobeTab): readonly CosmeticItem[] {
  return tab === 'fur' ? [] : COSMETIC_ITEMS.filter((item) => item.slot === tab)
}

/** Resolve the CSS filter for a fur id (empty string = untouched). */
export function furFilter(id: string): string {
  return FUR_COLORS.find((color) => color.id === id)?.filter ?? ''
}

const asRecord = (value: unknown): Record<string, unknown> =>
  (typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {})

export type WardrobeResult =
  | { ok: true; value: WardrobeState }
  | { ok: false; error: string }

/**
 * Normalise a wardrobe document.
 *
 * Same split as widgets: the *shape* is enforced (it must be an object), the
 * *contents* are forward compatible — an id this build does not know is
 * dropped, an unknown fur falls back to the original artwork, a count clamps.
 * A profile written by a newer build therefore stays loadable, which matters
 * here because `owned` grows over time.
 */
export function sanitizeWardrobe(value: unknown): WardrobeResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'wardrobe must be an object' }
  }
  const input = asRecord(value)

  const ownedIn = asRecord(input.owned)
  const owned: Record<string, number> = {}
  for (const [id, raw] of Object.entries(ownedIn)) {
    if (itemById(id) === undefined) continue
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue
    const count = Math.min(999, Math.max(0, Math.round(raw)))
    if (count > 0) owned[id] = count
  }

  const equippedIn = asRecord(input.equipped)
  const equipped: WardrobeEquipped = { hat: null, face: null, accessory: null }
  for (const slot of COSMETIC_SLOTS) {
    const candidate = equippedIn[slot]
    if (typeof candidate !== 'string') continue
    const item = itemById(candidate)
    // Wearing something you do not own is impossible: the drop that granted it
    // may have been removed by a downgrade, so the slot simply empties.
    if (item !== undefined && item.slot === slot && (owned[item.id] ?? 0) > 0) {
      equipped[slot] = item.id
    }
  }

  const fur = typeof input.fur === 'string' && FUR_COLORS.some((color) => color.id === input.fur)
    ? input.fur
    : WARDROBE_DEFAULTS.fur

  const claimed = typeof input.claimed === 'number' && Number.isFinite(input.claimed)
    ? Math.min(1_000_000_000, Math.max(0, Math.round(input.claimed)))
    : WARDROBE_DEFAULTS.claimed

  const filter = (WARDROBE_FILTERS as readonly string[]).includes(String(input.filter))
    ? input.filter as WardrobeFilter
    : WARDROBE_DEFAULTS.filter

  // Opaque tag: the sanitizer never re-bases the cursor. A 0.9.3 client writing
  // a wardrobe without the field must not be mistaken for a legacy document
  // (that would convert its cursor a second time).
  const ledger = input.ledger === 'taps120' ? 'taps120' : WARDROBE_DEFAULTS.ledger

  return { ok: true, value: { equipped, fur, owned, claimed, ledger, filter } }
}

/**
 * Re-base a stored cursor onto the 1000-tap ledger, once.
 *
 * Called by the host when it reads `settings.json`, which is the only place
 * that can tell "this file predates the tag" from "a current client sent a
 * wardrobe without one". The conversion keeps the *work* the user already did
 * rather than the *items* they happened to roll: N drops at 120 taps each is
 * worth `floor(N * 120 / 1000)` exchanges, so a profile is never handed retro
 * grants and never inherits a debt it cannot see.
 */
export function migrateWardrobeCursor(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value
  const input = value as Record<string, unknown>
  // Anything already on the current ledger is left untouched. A missing tag is
  // legacy by construction: this runs on the file the host just read, and every
  // document written by 0.9.4+ carries the tag.
  if (input.ledger === 'taps1000') return value
  const claimed = typeof input.claimed === 'number' && Number.isFinite(input.claimed)
    ? Math.max(0, Math.round(input.claimed))
    : 0
  return {
    ...input,
    claimed: Math.floor((claimed * LEGACY_TAPS_PER_DROP) / TAPS_PER_EXCHANGE),
    ledger: 'taps1000'
  }
}

/** How many items the wardrobe holds (used by the panel's progress line). */
export function collectedCount(state: WardrobeState): number {
  return Object.keys(state.owned).length
}

/** Exchanges earned but not spent, capped for one call. */
export function pendingExchanges(state: WardrobeState, totalTaps: number, max = MAX_EXCHANGE_PER_CALL): number {
  const due = Math.floor(Math.max(0, totalTaps) / TAPS_PER_EXCHANGE) - state.claimed
  return Math.max(0, Math.min(due, max))
}

/**
 * Taps until the next exchange; 0 when one is ready.
 *
 * Derived from the cursor, not from `taps % 1000`: if `claimed` ever runs ahead
 * of `floor(taps / 1000)` (a migrated or hand-edited profile), the modulo form
 * promised an exchange every 1000 taps that never arrived. This one always
 * names the tap at which the count actually changes.
 */
export function tapsUntilNextExchange(state: WardrobeState, totalTaps: number): number {
  const taps = Math.floor(Math.max(0, totalTaps))
  if (Math.floor(taps / TAPS_PER_EXCHANGE) > state.claimed) return 0
  return Math.max(1, (state.claimed + 1) * TAPS_PER_EXCHANGE - taps)
}

/**
 * Deterministic roll for exchange `index`.
 *
 * Seeded by the exchange's ordinal, not by a running PRNG: replaying a profile
 * (same `claimed`, same taps) always yields the same items, so an exchange is
 * idempotent and a test can assert exact contents. Weights favour commons.
 */
export function rollItem(index: number): string {
  const seed = ((index % 100_000) * 2_654_435_761) % 4_294_967_296
  let state = seed >>> 0
  state = (state + 0x6d2b79f5) >>> 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const roll = ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296

  const total = COSMETIC_ITEMS.reduce((sum, item) => sum + ITEM_WEIGHT[item.rarity], 0)
  let ticket = roll * total
  for (const item of COSMETIC_ITEMS) {
    ticket -= ITEM_WEIGHT[item.rarity]
    if (ticket <= 0) return item.id
  }
  return COSMETIC_ITEMS[COSMETIC_ITEMS.length - 1].id
}

export interface ExchangeGain {
  id: string
  /** First copy (the panel can call it out). */
  isNew: boolean
}

export interface ExchangeResult {
  state: WardrobeState
  gained: ExchangeGain[]
  /** Exchanges still owed after this call (the panel offers another one). */
  remaining: number
}

/**
 * Spend every exchange the tap count has earned, up to `max`.
 *
 * Exchanges are deliberate: nothing is granted while the user types. The panel
 * calls this when they press the exchange button, which is why the ledger
 * (`claimed`) is spent here rather than on a tap.
 */
export function exchangeItems(state: WardrobeState, totalTaps: number, max = MAX_EXCHANGE_PER_CALL): ExchangeResult {
  const due = Math.floor(Math.max(0, totalTaps) / TAPS_PER_EXCHANGE) - state.claimed
  if (due <= 0) return { state, gained: [], remaining: 0 }
  const count = Math.min(due, max)
  const owned = { ...state.owned }
  const gained: ExchangeGain[] = []
  for (let offset = 0; offset < count; offset += 1) {
    const id = rollItem(state.claimed + offset)
    const isNew = (owned[id] ?? 0) === 0
    owned[id] = Math.min(999, (owned[id] ?? 0) + 1)
    gained.push({ id, isNew })
  }
  return {
    state: { ...state, owned, claimed: state.claimed + count },
    gained,
    remaining: due - count
  }
}

/**
 * Wear or remove an item. Clicking the worn one takes it off again, which is
 * the interaction the game's grid uses.
 */
export function equipItem(state: WardrobeState, id: string): WardrobeState {
  const item = itemById(id)
  if (item === undefined || (state.owned[id] ?? 0) === 0) return state
  const current = state.equipped[item.slot]
  return { ...state, equipped: { ...state.equipped, [item.slot]: current === id ? null : id } }
}

/** Pick one owned item per slot at random (the dice button). */
export function randomizeOutfit(state: WardrobeState, random: () => number = Math.random): WardrobeState {
  const equipped = { ...state.equipped }
  for (const slot of COSMETIC_SLOTS) {
    const pool = COSMETIC_ITEMS.filter((item) => item.slot === slot && (state.owned[item.id] ?? 0) > 0)
    // An empty slot is a valid outcome: a starter wardrobe may have no hats.
    equipped[slot] = pool.length === 0 ? null : pool[Math.floor(random() * pool.length) % pool.length].id
  }
  return { ...state, equipped }
}

/** Take everything off (keeps the fur colour). */
export function unequipAll(state: WardrobeState): WardrobeState {
  return { ...state, equipped: { hat: null, face: null, accessory: null } }
}

/** Set the grid filter (persisted with the rest of the wardrobe). */
export function withFilter(state: WardrobeState, filter: WardrobeFilter): WardrobeState {
  return { ...state, filter }
}
