/**
 * Opening DSH's settings panel from the floating cat, landing on this plugin's
 * page.
 *
 * There is no public client service for this, so the panel is opened through
 * whichever handle the running shell exposes, in order of preference:
 *
 *  1. the React fiber tree — the launcher button's fiber (or an ancestor)
 *     usually carries an `openSettings` prop; calling it is the closest thing
 *     to the public API and opens the panel without any synthetic clicking;
 *  2. the dialog trigger button, `button[aria-haspopup="dialog"]`, clicked
 *     exactly like a user would;
 *  3. the account-menu launcher (`aria-haspopup="menu"`), whose menu carries a
 *     "设置 / Settings" entry — opened, then clicked from the retry loop.
 *
 * Selecting our page is text-matched, because the nav carries no id we own:
 * the shell renders one entry per `settings.section` registration with the
 * registrant's label. The match tolerates the shapes the shells actually use
 * (aria-label, exact text, or a glyph-prefixed text node) and is confirmed by
 * our own section content before it stops retrying.
 */

const DIALOG_TRIGGER_SELECTOR = 'button[aria-haspopup="dialog"][aria-expanded]'
const LAUNCHER_SELECTOR = 'button[aria-haspopup="menu"][aria-expanded]'
const SETTINGS_PANEL_SELECTOR = '[data-shortcut-modal="settings"]'

/** Our own overlays must never be mistaken for the settings nav entry. */
const OUR_ROOTS = '#dsh-bongo-cat-root, #dsh-bongo-cat-widgets'

/** Marker only our section renders — the confirmation the landing worked. */
const SECTION_MARKER = '[data-role="wardrobe-board"]'

/** How the account menu spells its settings entry across locales. */
const MENU_SETTINGS_LABELS = ['设置', 'Settings', '設定', 'Preferences']

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

/** React attaches these keys to every host element it renders. */
const FIBER_KEY_PREFIXES = ['__reactFiber$', '__reactInternalInstance$']

/** Find the React fiber behind a DOM node, or null outside a React tree. */
function reactFiberOf(node: HTMLElement): object | null {
  const record = node as unknown as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!FIBER_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue
    const value = record[key]
    return typeof value === 'object' && value !== null ? (value as object) : null
  }
  return null
}

/**
 * Walk the fiber tree from the launcher buttons looking for an
 * `openSettings` prop and call it. Returns false when no reachable fiber
 * carries one.
 */
function openThroughLauncher(): boolean {
  const launchers = [...document.querySelectorAll<HTMLElement>(LAUNCHER_SELECTOR)]
  for (const launcher of launchers) {
    let fiber = reactFiberOf(launcher) as { memoizedProps?: unknown; return?: unknown } | null
    for (let depth = 0; fiber !== null && depth < 40; depth += 1) {
      const props = fiber.memoizedProps as { openSettings?: unknown } | null | undefined
      if (props !== null && props !== undefined && typeof props.openSettings === 'function') {
        try {
          ;(props.openSettings as () => void)()
          return true
        } catch {
          break
        }
      }
      fiber = (fiber.return as typeof fiber) ?? null
    }
  }
  return false
}

/** Click the account-menu launcher open; true when a launcher exists. */
function openLauncherMenu(): boolean {
  const launcher = document.querySelector<HTMLButtonElement>(LAUNCHER_SELECTOR)
  if (launcher === null) return false
  if (launcher.getAttribute('aria-expanded') !== 'true') launcher.click()
  return true
}

/** Click the settings entry inside an open account menu. */
function clickMenuSettings(): boolean {
  for (const item of document.querySelectorAll<HTMLElement>('[role="menuitem"]')) {
    if (item.closest(OUR_ROOTS) !== null) continue
    const text = (item.textContent ?? '').trim()
    if (!MENU_SETTINGS_LABELS.some((label) => text === label || text.startsWith(label))) continue
    item.click()
    return true
  }
  return false
}

/**
 * Open Settings (and our section when it is reachable).
 *
 * @param label - this plugin's section label in the active locale, as
 *   registered on `settings.section`.
 * @returns false when no settings handle exists at all (a host without the
 *   settings shell), so the caller can skip its own feedback.
 */
export function openBongoCatSettings(label: string): boolean {
  const panelOpen = (): boolean => document.querySelector(SETTINGS_PANEL_SELECTOR) !== null
  let menuOpened = false
  if (!panelOpen()) {
    let opened = openThroughLauncher()
    if (!opened) {
      const trigger = document.querySelector<HTMLButtonElement>(DIALOG_TRIGGER_SELECTOR)
      if (trigger !== null) {
        if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click()
        opened = true
      }
    }
    if (!opened) {
      menuOpened = openLauncherMenu()
      if (!menuOpened) return false
    }
  }

  // The dialog mounts on the next paint and its nav settles a frame later, so
  // retry — but stop at the first confirmed landing. The window spans a slow
  // cold open on Electron without polling forever. While a menu path is in
  // flight, each tick also looks for the menu's settings entry and clicks it.
  const schedule = [80, 200, 420, 700, 1100, 1600, 2200]
  const attempt = (index: number): void => {
    if (menuOpened && !panelOpen()) clickMenuSettings()
    if (selectSection(label)) return
    if (index + 1 >= schedule.length) return
    window.setTimeout(() => attempt(index + 1), schedule[index + 1] - schedule[index])
  }
  window.setTimeout(() => attempt(0), schedule[0])
  return true
}
