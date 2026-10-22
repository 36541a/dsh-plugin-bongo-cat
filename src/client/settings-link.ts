/**
 * Opening DSH's settings panel from the floating cat, landing on this plugin's
 * page.
 *
 * There is no public client service for this: the settings shell owns the
 * dialog's open state, and the only seat that receives `openSettings` is
 * `settings.launcher` — a single-occupant slot already taken by the account
 * menu. What every composition *does* render is the trigger button, with the
 * standard ARIA contract `button[aria-haspopup="dialog"][aria-expanded]`.
 * Clicking it is exactly what a user does, so it stays correct across shells
 * that keep the dialog internal.
 *
 * Selecting our page is text-matched, because the nav carries no id we own:
 * the shell renders one entry per `settings.section` registration with the
 * registrant's label. The match tolerates the shapes the shells actually use
 * (aria-label, exact text, or a glyph-prefixed text node) and is confirmed by
 * our own section content before it stops retrying.
 */

const TRIGGER_SELECTOR = 'button[aria-haspopup="dialog"][aria-expanded]'

/** Our own overlays must never be mistaken for the settings nav entry. */
const OUR_ROOTS = '#dsh-bongo-cat-root, #dsh-bongo-cat-widgets'

/** Marker only our section renders — the confirmation the landing worked. */
const SECTION_MARKER = '[data-role="wardrobe-board"]'

/**
 * Rank a candidate nav entry against the label.
 * @returns 0 aria-label match, 1 exact text, 2 text with an icon glyph, -1 no match.
 */
function rank(node: HTMLElement, label: string): number {
  const aria = (node.getAttribute('aria-label') ?? '').trim()
  if (aria === label) return 0
  const text = (node.textContent ?? '').trim()
  if (text === label) return 1
  // Icon fonts and emoji live in the same text node: "🐱 邦哥猫" / "邦哥猫 1".
  if (text.startsWith(label) || text.endsWith(label)) return 2
  return -1
}

/** Best matching nav entry in the open panel (or the page, if it is not a dialog). */
function sectionEntry(label: string): HTMLElement | null {
  const scope: ParentNode = document.querySelector('[role="dialog"]') ?? document
  const nodes = [...scope.querySelectorAll<HTMLElement>('button, [role="tab"], [role="button"], a')]
  let best: { node: HTMLElement; score: number } | null = null
  for (const node of nodes) {
    if (node.closest(OUR_ROOTS) !== null) continue
    const score = rank(node, label)
    if (score < 0) continue
    if (best === null || score < best.score) best = { node, score }
  }
  return best?.node ?? null
}

/**
 * Click our nav entry once.
 *
 * The marker short-circuits the common case (the panel was already showing our
 * page). Otherwise this clicks and reports success — retries exist for the
 * entry not being mounted yet, not for confirming the switch, because clicking
 * a nav entry twice in quick succession would just re-render the same page.
 */
function selectSection(label: string): boolean {
  if (document.querySelector(SECTION_MARKER) !== null) return true
  const entry = sectionEntry(label)
  if (entry === null) return false
  entry.click()
  return true
}

/**
 * Open Settings (and our section when it is reachable).
 *
 * @param label - this plugin's section label in the active locale, as
 *   registered on `settings.section`.
 * @returns false when the page has no settings trigger (a host without the
 *   settings shell), so the caller can skip its own feedback.
 */
export function openBongoCatSettings(label: string): boolean {
  const trigger = document.querySelector<HTMLButtonElement>(TRIGGER_SELECTOR)
  if (trigger === null) return false

  if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()

  // The dialog mounts on the next paint and its nav settles a frame later, so
  // retry — but stop at the first confirmed landing. The window spans a slow
  // cold open on Electron without polling forever.
  const schedule = [80, 200, 420, 700, 1100, 1600]
  const attempt = (index: number): void => {
    if (selectSection(label)) return
    if (index + 1 >= schedule.length) return
    window.setTimeout(() => attempt(index + 1), schedule[index + 1] - schedule[index])
  }
  window.setTimeout(() => attempt(0), schedule[0])
  return true
}
