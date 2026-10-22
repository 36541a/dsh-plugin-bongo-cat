/**
 * The wardrobe panel: category tabs, the sticker grid, the colour wheel and
 * the tool row (filter / dice / claim / take everything off).
 *
 * Every edit is one `wardrobe` patch, i.e. one atomic write of the whole
 * document — the same rule the widget board follows. That makes "equip while
 * a drop lands" a last-writer-wins merge of a complete state rather than two
 * half-patches racing each other.
 */
import { useState } from 'react'
import type { BongoCatSettings, BongoCatKey } from '../settings'
import type { BongoCatStore } from '../store'
import {
  type CosmeticItem, type WardrobeState, type WardrobeTab,
  COSMETIC_ITEMS, FUR_COLORS, MAX_CLAIM_PER_CALL,
  claimDrops, collectedCount, equipItem, itemsForTab, randomizeOutfit,
  tapsUntilNextDrop, unequipAll, withFilter
} from '../../shared/cosmetics'
import { updateWardrobe } from './writer'
import styles from './wardrobe.module.css'

export interface WardrobePanelProps {
  store: BongoCatStore
  settings: BongoCatSettings
  t: (key: BongoCatKey) => string
  writable: boolean
}

const TAB_KEYS: Record<WardrobeTab, BongoCatKey> = {
  hat: 'wardrobeHat',
  face: 'wardrobeFace',
  accessory: 'wardrobeAccessory',
  fur: 'wardrobeFur'
}

const FILTER_KEYS = {
  all: 'wardrobeFilterAll',
  owned: 'wardrobeFilterOwned',
  equipped: 'wardrobeFilterEquipped'
} as const

const TABS: WardrobeTab[] = ['hat', 'face', 'accessory', 'fur']

/** Five-pointed star row; the rarity is data, the glyph is not. */
function stars(rarity: number): string {
  return '★'.repeat(rarity)
}

function ItemArt({ item }: { item: CosmeticItem }) {
  return (
    <span className={styles.art}>
      <svg viewBox='0 0 100 100' aria-hidden='true' dangerouslySetInnerHTML={{ __html: item.art }} />
    </span>
  )
}

export function WardrobePanel({ store, settings, t, writable }: WardrobePanelProps) {
  const [tab, setTab] = useState<WardrobeTab>('hat')
  const [note, setNote] = useState<string | null>(null)
  const wardrobe: WardrobeState = settings.wardrobe

  /**
   * Every edit is a *function* of the current wardrobe, applied through the
   * serialised writer. Passing a snapshot would let a drop that lands on the
   * same click overwrite the edit (both patch the whole field).
   */
  const commit = async (mutate: (current: WardrobeState) => WardrobeState): Promise<void> => {
    try {
      await updateWardrobe(store, mutate)
      setNote(null)
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error))
    }
  }

  const ownedCount = (id: string): number => wardrobe.owned[id] ?? 0

  const visible = (item: CosmeticItem): boolean => {
    if (wardrobe.filter === 'owned' && ownedCount(item.id) === 0) return false
    if (wardrobe.filter === 'equipped' && wardrobe.equipped[item.slot] !== item.id) return false
    return true
  }

  /**
   * Claim: pull the host's persisted tap total first. The panel is usually
   * opened long after the page loaded, so the store's `counter` is stale by
   * however many taps happened since — a fresh `config/get` is what makes the
   * button agree with the cat's own ledger.
   */
  const claim = async (): Promise<void> => {
    try {
      await store.load()
      const fresh = store.getSnapshot()
      if (fresh.status !== 'ready' || fresh.value === undefined) {
        setNote(t('unavailable'))
        return
      }
      // The result is captured inside the mutator so it describes the state
      // the write actually applied to, not a snapshot taken before the queue.
      const fallbackCounter = fresh.value.counter
      let gained = 0
      let firstTime = 0
      await updateWardrobe(store, (current) => {
        const counter = store.getSnapshot().value?.counter ?? fallbackCounter
        const result = claimDrops(current, counter, MAX_CLAIM_PER_CALL)
        gained = result.gained.length
        firstTime = result.gained.filter((gain) => gain.isNew).length
        return result.state
      })
      setNote(gained === 0
        ? t('wardrobeNoDrop')
        : `${t('wardrobeClaimed')} ${gained} · ${t('wardrobeNewOnes')} ${firstTime}`)
    } catch (error) {
      setNote(error instanceof Error ? error.message : String(error))
    }
  }

  const items = itemsForTab(tab)
  const shown = items.filter(visible)
  const equippedCount = Object.values(wardrobe.equipped).filter((id) => id !== null).length
  const nextDrop = tapsUntilNextDrop(wardrobe, settings.counter)

  return (
    <div className={styles.board} data-role='wardrobe-board'>
      <div className={styles.tabs} role='tablist'>
        {TABS.map((entry) => (
          <button
            key={entry}
            type='button'
            role='tab'
            aria-selected={tab === entry}
            className={styles.tab}
            data-active={tab === entry}
            data-tab={entry}
            onClick={() => setTab(entry)}
          >
            {t(TAB_KEYS[entry])}
          </button>
        ))}
      </div>

      {tab === 'fur' ? (
        <div className={styles.swatches}>
          {FUR_COLORS.filter((color) => wardrobe.filter !== 'equipped' || color.id === wardrobe.fur).map((color) => (
            <button
              key={color.id}
              type='button'
              className={styles.swatch}
              data-color={color.id}
              data-active={wardrobe.fur === color.id}
              aria-pressed={wardrobe.fur === color.id}
              disabled={!writable}
              title={color.id}
              style={{ backgroundColor: color.swatch }}
              onClick={() => void commit((current) => ({ ...current, fur: color.id }))}
            >
              {wardrobe.fur === color.id && <span className={styles.check}>✓</span>}
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.grid} role='list'>
          {shown.length === 0 && <div className={styles.empty}>{t('wardrobeEmpty')}</div>}
          {shown.map((item) => {
            const owned = ownedCount(item.id)
            const worn = wardrobe.equipped[item.slot] === item.id
            return (
              <button
                key={item.id}
                type='button'
                role='listitem'
                className={styles.cell}
                data-item={item.id}
                data-slot={item.slot}
                data-owned={owned > 0}
                data-equipped={worn}
                aria-pressed={worn}
                disabled={!writable}
                title={`${t(TAB_KEYS[item.slot])} · ${stars(item.rarity)}${owned > 0 ? ` ×${owned}` : ` · ${t('wardrobeLocked')}`}`}
                onClick={() => void commit((current) => equipItem(current, item.id))}
              >
                <ItemArt item={item} />
                <span className={styles.stars}>{stars(item.rarity)}</span>
                {owned > 1 && <span className={styles.count}>×{owned}</span>}
                {worn && <span className={styles.check}>✓</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className={styles.tools}>
        <button
          type='button'
          className={styles.tool}
          data-role='wardrobe-filter'
          title={t('wardrobeFilter')}
          aria-label={t('wardrobeFilter')}
          onClick={() => {
            const order = ['all', 'owned', 'equipped'] as const
            const index = order.indexOf(wardrobe.filter)
            void commit((current) => withFilter(current, order[(index + 1) % order.length]))
          }}
        >
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M3 4h18l-7 9v6l-4-2v-4z' fill='currentColor' />
          </svg>
          <span>{t(FILTER_KEYS[wardrobe.filter])}</span>
        </button>

        <button
          type='button'
          className={styles.tool}
          data-role='wardrobe-random'
          title={t('wardrobeRandom')}
          aria-label={t('wardrobeRandom')}
          disabled={!writable}
          onClick={() => void commit((current) => randomizeOutfit(current))}
        >
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <rect x='3' y='3' width='18' height='18' rx='4' fill='none' stroke='currentColor' strokeWidth='2' />
            <circle cx='8.5' cy='8.5' r='1.6' fill='currentColor' />
            <circle cx='15.5' cy='15.5' r='1.6' fill='currentColor' />
            <circle cx='12' cy='12' r='1.6' fill='currentColor' />
          </svg>
        </button>

        <button
          type='button'
          className={styles.tool}
          data-role='wardrobe-claim'
          title={t('wardrobeClaim')}
          aria-label={t('wardrobeClaim')}
          disabled={!writable}
          onClick={() => void claim()}
        >
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M20 12a8 8 0 1 1-2.3-5.6' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' />
            <path d='M20 4v5h-5' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </button>

        <button
          type='button'
          className={styles.tool}
          data-role='wardrobe-unequip'
          title={t('wardrobeUnequip')}
          aria-label={t('wardrobeUnequip')}
          disabled={!writable || equippedCount === 0}
          onClick={() => void commit((current) => unequipAll(current))}
        >
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
        </button>
      </div>

      <div className={styles.note} data-role='wardrobe-status'>
        {note ?? `${t('wardrobeCollected')} ${collectedCount(wardrobe)}/${COSMETIC_ITEMS.length}`
          + ` · ${nextDrop === 0 ? t('wardrobeReady') : `${t('wardrobeNextDrop')} ${nextDrop}`}`}
      </div>
      <div className={styles.hint}>{t('wardrobeHint')}</div>
    </div>
  )
}
