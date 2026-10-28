/**
 * Wardrobe schema — the cat's dress-up layer, shared by both halves.
 *
 * The reference is the Steam game's own item picker: category tabs, a grid of
 * items with rarity stars, a tick on the equipped one, a count badge for
 * duplicates, and a colour wheel. Only the *rules* live here (what exists,
 * what is owned, what is worn, how the automatic drops are rolled); the panel
 * and the overlay rendering are browser-side, and the item catalogue itself
 * comes from the host (extracted from the installed game).
 *
 * Splitting it this way keeps one invariant: `config/set` on the host and the
 * panel in the browser can never disagree about which id is legal, which slot
 * it belongs to, or what a missing field means.
 *
 * HARD CONSTRAINT (browser safety): no value imports outside this folder —
 * this file is bundled into the browser half (and, for validation, the host).
 */

/** Slots an item can occupy. A slot holds at most one item. */
export const COSMETIC_SLOTS = ['hat', 'face', 'back', 'accessory'] as const
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number]

export const WARDROBE_FILTERS = ['all', 'owned', 'equipped'] as const
export type WardrobeFilter = (typeof WARDROBE_FILTERS)[number]

/** Panel tabs: the four slots plus the colour wheel. */
export const WARDROBE_TABS = ['hat', 'face', 'back', 'accessory', 'fur'] as const
export type WardrobeTab = (typeof WARDROBE_TABS)[number]

/** 1 = common, 2 = rare, 3 = legendary (the star row on the tile). */
export const RARITIES = [1, 2, 3] as const
export type Rarity = (typeof RARITIES)[number]

export interface CosmeticItem {
  id: string
  /** The in-game item name, shown on the tile. */
  name: string
  slot: CosmeticSlot
  /**
   * Which side of the artwork the overlay is drawn on.
   *
   * Front (default) sits on top of the cat. `back` pieces (wings, capes) are
   * painted underneath the transparent PNG, so only the parts that stick out
   * past the silhouette are visible.
   */
  layer?: 'front' | 'back'
  rarity: Rarity
  /** [x, y, width, height] inside the native frame canvas, in pixels. */
  rect?: [number, number, number, number]
}

/** What the host serves for `cosmetics/catalog`. */
export interface CosmeticCatalog {
  /** Extraction stamp; also the cache-buster on overlay/icon URLs. */
  stamp: string
  /**
   * The coordinate space `rect` lives in:
   *  - `canvas` (v2): pixels on the full 340×250 artboard, mapped onto the
   *    stage through the frame's crop box — the catalogue survives a skin
   *    change, because only the crop box moves;
   *  - absent/`box` (v1): already relative to the frame box.
   */
  rectSpace?: 'canvas' | 'box'
  /** The artboard the rects are measured against. */
  size: [number, number]
  items: CosmeticItem[]
}

export interface FurColor {
  id: string
  filter: string
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

export interface WardrobeEquipped {
  hat: string | null
  face: string | null
  back: string | null
  accessory: string | null
}

/** Kept for profiles that still carry the old unit; new writes use taps1000. */
export type WardrobeLedger = 'taps120' | 'taps1000'

export interface WardrobeState {
  equipped: WardrobeEquipped
  fur: string
  /** id → copy count; 999 caps a single id. */
  owned: Record<string, number>
  /** How many items the automatic drops have granted in total. */
  claimed: number
  ledger: WardrobeLedger
  filter: WardrobeFilter
}

export function emptyEquipped(): WardrobeEquipped {
  return { hat: null, face: null, back: null, accessory: null }
}

export const WARDROBE_DEFAULTS: WardrobeState = {
  equipped: emptyEquipped(),
  fur: 'original',
  owned: {},
  claimed: 0,
  ledger: 'taps1000',
  filter: 'all'
}

/** Every 1000 taps is one automatic drop, debited on grant. */
export const TAPS_PER_ITEM = 1e3

/** Ceiling per automatic settlement, so one huge bump cannot flood the grid. */
export const MAX_GRANT_PER_CALL = 10

const ITEM_WEIGHT: Record<Rarity, number> = { 1: 8, 2: 4, 3: 1 }

const ITEM_ID = /^[a-z0-9][a-z0-9-]{0,63}$/

// ── browser-side helpers: read the catalogue ────────────────────

export const itemMapOf = (catalog: readonly CosmeticItem[]): Map<string, CosmeticItem> =>
  new Map(catalog.map((item) => [item.id, item]))

export function itemById(catalog: readonly CosmeticItem[], id: string): CosmeticItem | undefined {
  return itemMapOf(catalog).get(id)
}

export function itemsForTab(catalog: readonly CosmeticItem[], tab: WardrobeTab): readonly CosmeticItem[] {
  return tab === 'fur' ? [] : catalog.filter((item) => item.slot === tab)
}

/** CSS filter for the artwork; empty string means "leave it untouched". */
export function furFilter(id: string): string {
  return FUR_COLORS.find((color) => color.id === id)?.filter ?? ''
}

export function collectedCount(state: WardrobeState): number {
  return Object.keys(state.owned).length
}

/**
 * Taps still needed before the balance reaches the next automatic grant.
 *
 * 0 means the balance already sits on a multiple of TAPS_PER_ITEM, i.e. a drop
 * is due as soon as the host settles it — the old code reported a full
 * TAPS_PER_ITEM here, so a profile stuck at 1000 (no catalogue imported yet)
 * showed "next drop in 1000" forever.
 */
export function tapsUntilNextItem(counter: number): number {
  const balance = Math.max(0, Math.floor(counter))
  if (balance === 0) return TAPS_PER_ITEM
  const remainder = balance % TAPS_PER_ITEM
  return remainder === 0 ? 0 : TAPS_PER_ITEM - remainder
}

/** Toggle one item on its slot; no-op when it is not owned. */
export function equipItem(
  catalog: readonly CosmeticItem[],
  state: WardrobeState,
  id: string
): WardrobeState {
  const item = itemById(catalog, id)
  if (item === undefined || (state.owned[id] ?? 0) === 0) return state
  const current = state.equipped[item.slot]
  return { ...state, equipped: { ...state.equipped, [item.slot]: current === id ? null : id } }
}

/** Dice: pick one owned item per slot, keeping the current pick when empty. */
export function randomizeOutfit(
  catalog: readonly CosmeticItem[],
  state: WardrobeState,
  random: () => number = Math.random
): WardrobeState {
  const equipped = { ...state.equipped }
  for (const slot of COSMETIC_SLOTS) {
    const pool = catalog.filter((item) => item.slot === slot && (state.owned[item.id] ?? 0) > 0)
    equipped[slot] = pool.length === 0 ? null : pool[Math.floor(random() * pool.length) % pool.length].id
  }
  return { ...state, equipped }
}

export function unequipAll(state: WardrobeState): WardrobeState {
  return { ...state, equipped: emptyEquipped() }
}

export function withFilter(state: WardrobeState, filter: WardrobeFilter): WardrobeState {
  return { ...state, filter }
}

// ── host-side helpers: validate, migrate and settle the economy ──

export type WardrobeResult =
  | { ok: true; value: WardrobeState }
  | { ok: false; error: string }

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

/**
 * Structural validation, forward-compatible on content: unknown ids are
 * dropped, unequipped slots stay empty, an unknown fur colour or filter
 * falls back to the default and counts are clamped to 999.
 */
export function sanitizeWardrobe(value: unknown): WardrobeResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'wardrobe must be an object' }
  }
  const input = asRecord(value)
  const ownedIn = asRecord(input.owned)
  const owned: Record<string, number> = {}
  for (const [id, raw] of Object.entries(ownedIn)) {
    if (!ITEM_ID.test(id)) continue
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue
    const count = Math.min(999, Math.max(0, Math.round(raw)))
    if (count > 0) owned[id] = count
  }
  const equippedIn = asRecord(input.equipped)
  const equipped = emptyEquipped()
  for (const slot of COSMETIC_SLOTS) {
    const candidate = equippedIn[slot]
    if (typeof candidate !== 'string' || !ITEM_ID.test(candidate)) continue
    if ((owned[candidate] ?? 0) > 0) equipped[slot] = candidate
  }
  const fur =
    typeof input.fur === 'string' && FUR_COLORS.some((color) => color.id === input.fur)
      ? input.fur
      : WARDROBE_DEFAULTS.fur
  const claimed =
    typeof input.claimed === 'number' && Number.isFinite(input.claimed)
      ? Math.min(1e9, Math.max(0, Math.round(input.claimed)))
      : WARDROBE_DEFAULTS.claimed
  const filter = WARDROBE_FILTERS.includes(String(input.filter) as WardrobeFilter) ? (input.filter as WardrobeFilter) : WARDROBE_DEFAULTS.filter
  const ledger = input.ledger === 'taps120' ? 'taps120' : WARDROBE_DEFAULTS.ledger
  return { ok: true, value: { equipped, fur, owned, claimed, ledger, filter } }
}

/**
 * Drop anything the current catalogue does not know (ids vanish between
 * re-extractions), and clear equipped slots that no longer resolve.
 */
export function reconcileWardrobe(state: WardrobeState, catalog: readonly CosmeticItem[]): WardrobeState {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  const owned: Record<string, number> = {}
  for (const [id, count] of Object.entries(state.owned)) {
    if (byId.has(id)) owned[id] = count
  }
  const equipped = emptyEquipped()
  for (const slot of COSMETIC_SLOTS) {
    const id = state.equipped[slot]
    if (id === null) continue
    const item = byId.get(id)
    if (item !== undefined && item.slot === slot && (owned[id] ?? 0) > 0) equipped[slot] = id
  }
  return { ...state, owned, equipped }
}

/** 0.9.x hand-drawn sticker ids → the Steam item keyword they map to. */
const LEGACY_KEYWORDS: Record<string, string> = {
  beanie: 'beanie',
  cap: 'cap',
  party: 'party',
  bow: 'bow',
  tophat: 'tophat',
  santa: 'santa',
  flower: 'flower',
  headphone: 'headphone',
  crown: 'crown',
  horns: 'horn',
  blush: 'blush',
  glasses: 'glasses',
  sweat: 'sweat',
  anger: 'anger',
  note: 'note',
  shades: 'glasses',
  'star-eyes': 'star',
  hearts: 'heart',
  scarf: 'scarf',
  bowtie: 'bow',
  bell: 'bell',
  badge: 'badge',
  necklace: 'necklace',
  bag: 'bag',
  medal: 'medal',
  wings: 'wing'
}

const LEGACY_SLOTS: Record<string, CosmeticSlot> = {
  beanie: 'hat',
  cap: 'hat',
  party: 'hat',
  bow: 'hat',
  tophat: 'hat',
  santa: 'hat',
  flower: 'hat',
  headphone: 'hat',
  crown: 'hat',
  horns: 'hat',
  blush: 'face',
  glasses: 'face',
  sweat: 'face',
  anger: 'face',
  note: 'face',
  shades: 'face',
  'star-eyes': 'face',
  hearts: 'face',
  scarf: 'accessory',
  bowtie: 'accessory',
  bell: 'accessory',
  badge: 'accessory',
  necklace: 'accessory',
  bag: 'accessory',
  medal: 'accessory',
  wings: 'back'
}

/** Per-slot name keywords used when the direct keyword has no match. */
const SLOT_FALLBACK_KEYWORDS: Record<CosmeticSlot, string[]> = {
  hat: ['hat', 'cap', 'crown', 'beret', 'headband', 'helmet'],
  face: ['glasses', 'blush', 'goggles', 'nose'],
  accessory: ['bow', 'ribbon', 'bell', 'bandana', 'tie', 'collar'],
  back: ['wing', 'cape', 'shell', 'backpack', 'tail']
}

/**
 * Map a 0.9.x sticker id onto the closest real item: by name keyword first,
 * then by the old slot, preferring plain-rarity items whose name mentions the
 * slot's characteristic words. Progress is kept rather than dropped.
 */
export function legacyItemFor(catalog: readonly CosmeticItem[], oldId: string): CosmeticItem | undefined {
  const keyword = LEGACY_KEYWORDS[oldId]
  if (keyword !== undefined) {
    const matches = catalog.filter((item) => item.name.toLowerCase().includes(keyword))
    if (matches.length > 0) {
      return [...matches].sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name))[0]
    }
  }
  const slot = LEGACY_SLOTS[oldId]
  if (slot === undefined) return undefined
  const pool = catalog.filter((item) => item.slot === slot)
  if (pool.length === 0) return undefined
  const names = SLOT_FALLBACK_KEYWORDS[slot]
  const preferred = pool.filter((item) => names.some((name2) => item.name.toLowerCase().includes(name2)))
  const ranked = (preferred.length > 0 ? preferred : pool).sort((a, b) => Number(b.rarity === 1) - Number(a.rarity === 1) || a.name.length - b.name.length || a.name.localeCompare(b.name))
  return ranked[0]
}

/**
 * A fresh profile starts with one item per front-layer slot so the grid is
 * never empty; falls back to the first three catalogue entries when the
 * heuristics find nothing.
 */
export function pickStarterItems(catalog: readonly CosmeticItem[]): string[] {
  const picked: string[] = []
  const used = new Set<string>()
  const preference: CosmeticSlot[] = ['hat', 'face', 'accessory']
  for (const slot of preference) {
    const pool = catalog
      .filter((item) => item.slot === slot && item.rarity === 1 && (item.layer ?? 'front') === 'front')
      .sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name))
    const choice = pool.find((item) => !used.has(item.id))
    if (choice !== undefined) {
      picked.push(choice.id)
      used.add(choice.id)
    }
  }
  if (picked.length === 0) {
    for (const item of catalog.slice(0, 3)) picked.push(item.id)
  }
  return picked
}

/**
 * Deterministic weighted pick, seeded by the grant index — replaying the same
 * tap history rolls the same items (Knuth multiplicative hash + SplitMix
 * finaliser).
 */
export function rollFromPool(pool: readonly CosmeticItem[], index: number): string {
  if (pool.length === 0) return ''
  const seed = Math.max(0, index) % 1e5 * 2654435761 % 4294967296
  let state = seed >>> 0
  state = (state + 1831565813) >>> 0
  let t = state
  t = Math.imul(t ^ t >>> 15, t | 1)
  t ^= t + Math.imul(t ^ t >>> 7, t | 61)
  const roll = ((t ^ t >>> 14) >>> 0) / 4294967296
  const total = pool.reduce((sum, item) => sum + ITEM_WEIGHT[item.rarity], 0)
  if (total <= 0) return pool[0].id
  let ticket = roll * total
  for (const item of pool) {
    ticket -= ITEM_WEIGHT[item.rarity]
    if (ticket <= 0) return item.id
  }
  return pool[pool.length - 1].id
}

export interface GrantEntry {
  id: string
  isNew: boolean
}

export interface AutoGrantResult {
  /** The tap balance after debiting every granted item. */
  counter: number
  granted: GrantEntry[]
  state: WardrobeState
}

/**
 * The automatic drop: spend the balance from the top, unowned items first
 * (once everything is owned, duplicates roll), at most `max` items per call.
 * Returns the debited balance even when nothing was granted.
 */
export function autoGrantItems(
  state: WardrobeState,
  counter: number,
  catalog: readonly CosmeticItem[],
  max: number = MAX_GRANT_PER_CALL
): AutoGrantResult {
  let balance = Math.max(0, Math.floor(counter))
  if (catalog.length === 0) return { counter: balance, granted: [], state }
  const owned = { ...state.owned }
  const granted: GrantEntry[] = []
  while (balance >= TAPS_PER_ITEM && granted.length < max) {
    const unowned = catalog.filter((item) => (owned[item.id] ?? 0) === 0)
    const pool = unowned.length > 0 ? unowned : catalog
    const id = rollFromPool(pool, state.claimed + granted.length)
    if (id === '') break
    const isNew = (owned[id] ?? 0) === 0
    owned[id] = Math.min(999, (owned[id] ?? 0) + 1)
    granted.push({ id, isNew })
    balance -= TAPS_PER_ITEM
  }
  if (granted.length === 0) return { counter: balance, granted, state }
  return {
    counter: balance,
    granted,
    state: { ...state, owned, claimed: state.claimed + granted.length }
  }
}
