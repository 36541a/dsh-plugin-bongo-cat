/**
 * Opening DSH's settings panel from the floating cat.
 *
 * There is no public client service for this: the settings shell owns the
 * dialog's open state, and the only seat that receives `openSettings` is
 * `settings.launcher` — a single-occupant slot already taken by the account
 * menu. What every composition *does* render is the trigger button, with the
 * standard ARIA contract `button[aria-haspopup="dialog"][aria-expanded]`.
 * Clicking it is exactly what a user does, so it stays correct across shells
 * that keep the dialog internal.
 *
 * After the panel is up we click our own nav entry so the cat's page is the
 * one that opened. That click is best-effort: a first-run onboarding step can
 * cover the nav, and the user simply lands on Settings — still the behaviour
 * asked for.
 */

const TRIGGER_SELECTOR = 'button[aria-haspopup="dialog"][aria-expanded]'

/** Click the settings nav entry whose label is `label`; false if absent. */
function selectSection(label: string): boolean {
  const dialog = document.querySelector('[role="dialog"]')
  if (dialog === null) return false
  const entry = [...dialog.querySelectorAll('button')]
    .find((button) => (button.textContent ?? '').trim() === label)
  if (entry === undefined) return false
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
  // retry a few times — but stop at the first success: a second click would
  // re-open a page the user may have already navigated away from.
  const schedule = [80, 220, 480, 800]
  const attempt = (index: number): void => {
    if (selectSection(label)) return
    if (index + 1 >= schedule.length) return
    window.setTimeout(() => attempt(index + 1), schedule[index + 1] - schedule[index])
  }
  window.setTimeout(() => attempt(0), schedule[0])
  return true
}
