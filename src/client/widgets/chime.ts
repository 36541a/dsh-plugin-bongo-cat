/**
 * One shared WebAudio chime for widgets.
 *
 * Module-level so ten focus widgets still own a single AudioContext (browsers
 * cap them, and the cat's own engine already holds one). Every call is
 * best-effort: jsdom, a blocked autoplay policy or a missing AudioContext all
 * degrade to silence instead of throwing into the widget.
 */
let context: AudioContext | null = null

const ensure = (): AudioContext | null => {
  if (context !== null) return context
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    context = new Ctor()
  } catch {
    return null
  }
  return context
}

/** Two short blips — distinct from the cat's single tap sound. */
export function chime(volume = 0.5): void {
  const ctx = ensure()
  if (ctx === null) return
  if (ctx.state === 'suspended') void ctx.resume()
  const start = ctx.currentTime
  for (const [index, frequency] of [880, 1320].entries()) {
    const at = start + index * 0.18
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, at)
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(Math.min(0.35, Math.max(0.05, volume * 0.35)), at + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16)
    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start(at)
    oscillator.stop(at + 0.18)
  }
}

/** Release the context when no widget needs it (called by the dock on dispose). */
export function closeChime(): void {
  if (context === null) return
  void context.close().catch(() => undefined)
  context = null
}
