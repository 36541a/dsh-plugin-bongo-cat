/**
 * Cosmetics renderer — turns a wardrobe into the overlay layer that sits on
 * top of the cat, plus the fur filter for the artwork itself.
 *
 * The layer lives *inside* the cat stage so it follows the cat when it is
 * dragged, resized or re-anchored, and it is `pointer-events: none` so the
 * drag and double-click gestures still reach the stage.
 *
 * Overlay geometry is data (the `rect` each catalogue item carries, expressed
 * against the native frame canvas), not CSS: rendering stretches the overlay
 * to the stage box, which lines it up with the artwork exactly because every
 * PNG was cropped with the same box as the native frames.
 */
import { COSMETIC_SLOTS, type WardrobeState, type CosmeticCatalog, furFilter } from '../../shared/cosmetics'
import './cosmetics.css'

/** Layer ids, also the smoke tests' handle on the stickers. */
export const DECOR_ROLE = 'bongo-cat-decor'
export const DECOR_BACK_ROLE = 'bongo-cat-decor-back'

/** Overlay PNG served by the host's cosmetic asset route. */
function cosmeticUrl(id: string, stamp: string): string {
  return `/plugins/bongo-cat/cosmetic/${encodeURIComponent(id)}.png?v=${encodeURIComponent(stamp)}`
}

/** Icon PNG (small square) served by the same route. */
export function cosmeticIconUrl(id: string, stamp: string): string {
  return `/plugins/bongo-cat/cosmetic/${encodeURIComponent(id)}.icon.png?v=${encodeURIComponent(stamp)}`
}

/**
 * Build the inner markup for the decoration layer.
 *
 * Values interpolated here all come from the extracted catalogue (ids and
 * numbers written by us), never from settings input, so there is no injection
 * surface: `wardrobe` has already been sanitised against that catalogue.
 */
export function cosmeticMarkup(wardrobe: WardrobeState, catalog: CosmeticCatalog, layer: 'front' | 'back' = 'front'): string {
  const byId = new Map(catalog.items.map((item) => [item.id, item]))
  const [stageWidth, stageHeight] = catalog.size.length === 2 ? catalog.size : [1, 1]
  const parts: string[] = []
  for (const slot of COSMETIC_SLOTS) {
    const id = wardrobe.equipped[slot]
    if (id === null) continue
    const item = byId.get(id)
    if (item === undefined) continue
    if ((item.layer ?? 'front') !== layer) continue
    const [x, y, width, height] = item.rect ?? [0, 0, stageWidth, stageHeight]
    const style = [
      `left:${(x / stageWidth * 100).toFixed(3)}%`,
      `top:${(y / stageHeight * 100).toFixed(3)}%`,
      `width:${(width / stageWidth * 100).toFixed(3)}%`,
      `height:${(height / stageHeight * 100).toFixed(3)}%`
    ].join(';')
    parts.push(
      `<img class="bc-decor-item" data-slot="${slot}" data-item="${item.id}" style="${style}"`
      + ` src="${cosmeticUrl(item.id, catalog.stamp)}" alt="" draggable="false">`
    )
  }
  return parts.join('')
}

/** CSS filter for the artwork; empty string means "leave it untouched". */
export function artworkFilter(wardrobe: WardrobeState): string {
  return furFilter(wardrobe.fur)
}
