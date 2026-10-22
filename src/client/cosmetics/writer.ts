/**
 * Serialised wardrobe writes.
 *
 * Two writers touch `wardrobe`: the panel (equip, colour, filter, claim) and
 * the cat (a drop lands on a tap). A tap is also a pointerdown on whatever
 * the user clicked, so "click a tile to equip it" and "this click earned a
 * drop" happen in the same event — and because `config/set` carries the whole
 * wardrobe, whichever patch reached the host second used to clobber the other
 * (the equip silently vanished).
 *
 * The fix is a per-store promise chain: every mutation re-reads the freshest
 * published state *after* the previous write resolved, so patches are applied
 * in order to the state they actually saw. The store's own coalescer still
 * merges unrelated fields.
 */
import type { BongoCatStore } from '../store'
import type { WardrobeState } from '../../shared/cosmetics'

const chains = new WeakMap<BongoCatStore, Promise<void>>()

/**
 * Queue one read-modify-write of the wardrobe.
 *
 * @param store - the plugin store (one chain per instance).
 * @param mutate - pure function from the current wardrobe to the next one.
 * @returns A promise for *this* write; rejects if the host refused it.
 */
export function updateWardrobe(
  store: BongoCatStore,
  mutate: (current: WardrobeState) => WardrobeState
): Promise<void> {
  const previous = chains.get(store) ?? Promise.resolve()
  // `catch` on the predecessor only: an earlier failure must not poison the
  // queue, but this write's own failure has to reach the caller.
  const run = previous.catch(() => undefined).then(async () => {
    const snapshot = store.getSnapshot()
    if (snapshot.status !== 'ready' || snapshot.value === undefined) return
    await store.set({ wardrobe: mutate(snapshot.value.wardrobe) })
  })
  chains.set(store, run.catch(() => undefined))
  return run
}
