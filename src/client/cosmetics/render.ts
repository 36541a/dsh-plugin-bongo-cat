/**
 * Cosmetics renderer — turns a wardrobe into the sticker layer that sits on
 * top of the cat, plus the fur filter for the artwork itself.
 *
 * The layer lives *inside* the cat stage so it follows the cat when it is
 * dragged, resized or re-anchored, and it is `pointer-events: none` so the
 * drag and double-click gestures still reach the stage.
 *
 * Sticker geometry is data (`x`/`y`/`w` on each item), not CSS: adding an item
 * must never require touching a stylesheet.
 */
import { COSMETIC_SLOTS, type WardrobeState, furFilter, itemById } from '../../shared/cosmetics'
import './cosmetics.css'

/** Layer ids, also the smoke tests' handle on the stickers. */
export const DECOR_ROLE = 'bongo-cat-decor'
export const DECOR_BACK_ROLE = 'bongo-cat-decor-back'

/**
 * Build the inner markup for the decoration layer.
 *
 * Values interpolated here all come from the local catalogue (numbers and
 * ids written by us), never from settings input, so there is no injection
 * surface: `wardrobe` has already been sanitised against that catalogue.
 */
export function cosmeticMarkup(wardrobe: WardrobeState, layer: 'front' | 'back' = 'front'): string {
  const parts: string[] = []
  for (const slot of COSMETIC_SLOTS) {
    const id = wardrobe.equipped[slot]
    if (id === null) continue
    const item = itemById(id)
    if (item === undefined) continue
    if ((item.layer ?? 'front') !== layer) continue
    parts.push(
      `<span class="bc-decor-item" data-slot="${slot}" data-item="${item.id}"`
      + ` style="left:${item.x}%;top:${item.y}%;width:${item.w}%">`
      + `<svg viewBox="0 0 100 100" aria-hidden="true">${item.art}</svg></span>`
    )
  }
  return parts.join('')
}

/** CSS filter for the artwork; empty string means "leave it untouched". */
export function artworkFilter(wardrobe: WardrobeState): string {
  return furFilter(wardrobe.fur)
}
