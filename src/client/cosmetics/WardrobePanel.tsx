/**
 * The wardrobe panel: category tabs, the item grid, the colour wheel and the
 * tool row (filter / dice / take everything off).
 *
 * Items come from the host's extracted Steam catalogue (fetched once, then on
 * every native-asset change); the drop is automatic on the host side, so this
 * panel is read-only about the economy: a progress bar shows how far the tap
 * balance is from the next automatic grant.
 *
 * Every edit is one `wardrobe` patch, i.e. one atomic write of the whole
 * document — the same rule the widget board follows. That makes "equip while
 * a drop lands" a last-writer-wins merge of a complete state rather than
 * two half-patches racing each other.
 */
import { useEffect, useState } from 'react'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import type { BongoCatSettings, BongoCatKey, RpcResult } from '../settings'
import type { BongoCatStore } from '../store'
import {
  type CosmeticCatalog, type CosmeticItem, type WardrobeState, type WardrobeTab,
  FUR_COLORS, TAPS_PER_ITEM,
  collectedCount, equipItem, itemsForTab, randomizeOutfit,
  tapsUntilNextItem, unequipAll, withFilter
} from '../../shared/cosmetics'
import { cosmeticIconUrl } from './render'
import { updateWardrobe } from './writer'
import styles from './wardrobe.module.css'

export interface WardrobePanelProps {
  store: BongoCatStore
  settings: BongoCatSettings
  rpc: ClientConnectionRpc
  t: (key: BongoCatKey) => string
  writable: boolean
}

const TAB_KEYS: Record<WardrobeTab, BongoCatKey> = {
  hat: 'wardrobeHat',
  face: 'wardrobeFace',
  back: 'wardrobeBack',
  accessory: 'wardrobeAccessory',
  fur: 'wardrobeFur'
}

const FILTER_KEYS = {
  all: 'wardrobeFilterAll',
  owned: 'wardrobeFilterOwned',
  equipped: 'wardrobeFilterEquipped'
} as const

const TABS: WardrobeTab[] = ['hat', 'face', 'back', 'accessory', 'fur']

/** Five-pointed star row; the rarity is data, the glyph is not. */
function stars(rarity: number): string {
  return '★'.repeat(rarity)
}

export function WardrobePanel({ store, settings, rpc, t, writable }: WardrobePanelProps) {
  const [tab, setTab] = useState<WardrobeTab>('hat')
  const [note, setNote] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<CosmeticCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const wardrobe: WardrobeState = settings.wardrobe

  // The tap total only moves through stats/bump, so the snapshot lags behind
  // whatever accrued while the panel was closed. Opening it re-reads that one
  // field, which is what keeps the progress bar honest.
  useEffect(() => {
    void store.refreshCounter()
  }, [store])

  // The catalogue lives on the host (extracted from the game install). It is
  // loaded once and re-read whenever the original assets change underneath us.
  useEffect(() => {
    let alive = true
    const load = async (): Promise<void> => {
      const result = await rpc.call('/bongo-cat', 'cosmetics/catalog', {}) as RpcResult<CosmeticCatalog>
      if (!alive) return
      setCatalog(result.ok ? result.value : null)
      setLoading(false)
    }
    void load()
    const onNativeChanged = (): void => { void load() }
    window.addEventListener('bongo-cat:native-changed', onNativeChanged)
    return () => {
      alive = false
      window.removeEventListener('bongo-cat:native-changed', onNativeChanged)
    }
  }, [rpc])

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

  const items = catalog === null ? [] : itemsForTab(catalog.items, tab)
  const shown = items.filter(visible)
  const equippedCount = Object.values(wardrobe.equipped).filter((id) => id !== null).length
  const nextItem = tapsUntilNextItem(settings.counter)
  const progress = Math.round((TAPS_PER_ITEM - nextItem) / TAPS_PER_ITEM * 100)
  const total = catalog === null ? 0 : catalog.items.length
  const stamp = catalog?.stamp ?? ''

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
      ) : catalog === null ? (
        <div className={styles.empty}>{loading ? t('loading') : t('wardrobeNoAssets')}</div>
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
                title={`${item.name} · ${t(TAB_KEYS[item.slot])} · ${stars(item.rarity)}${owned > 0 ? ` ×${owned}` : ` · ${t('wardrobeLocked')}`}`}
                onClick={() => void commit((current) => equipItem(catalog.items, current, item.id))}
              >
                <img
                  className={styles.icon}
                  src={cosmeticIconUrl(item.id, stamp)}
                  alt={item.name}
                  loading='lazy'
                  draggable={false}
                />
                <span className={styles.stars}>{stars(item.rarity)}</span>
                {owned > 1 && <span className={styles.count}>×{owned}</span>}
                {worn && <span className={styles.check}>✓</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className={styles.progress} data-role='wardrobe-progress' aria-hidden='true'>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

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
          disabled={!writable || catalog === null}
          onClick={() => {
            const list = catalog?.items ?? []
            void commit((current) => randomizeOutfit(list, current))
          }}
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
        {note ?? `${t('wardrobeCollected')} ${collectedCount(wardrobe)}/${total} · ${nextItem === 0 ? t('wardrobeReady') : `${t('wardrobeNextDrop')} ${nextItem}`}`}
      </div>
      <div className={styles.hint}>{t('wardrobeHint')}</div>
    </div>
  )
}
