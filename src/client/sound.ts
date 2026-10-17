/**
 * Tap sound engine.
 *
 * Default: a tiny synthesized "tok" (triangle blip + noise click) built
 * with WebAudio, so the plugin ships zero audio assets. If the user
 * imports a custom .wav through the settings panel, the served asset URL
 * is used instead (played through a cloned Audio element).
 *
 * The AudioContext is created lazily on the first gesture-driven play,
 * which satisfies browser autoplay policies.
 */
export class BongoSound {
  private ctx: AudioContext | null = null
  private custom: HTMLAudioElement | null = null
  private customUrl: string | null = null
  private volume = 0.6
  private lastTok = 0

  /** Ensure (and resume) the AudioContext; call from a user gesture. */
  private ensure(): AudioContext | null {
    if (this.custom !== null) return null
    if (this.ctx === null) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      try {
        this.ctx = new Ctor()
      } catch {
        return null
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume))
    if (this.custom !== null) this.custom.volume = this.volume
  }

  /** Suspend the AudioContext while the page is hidden (power saving). */
  suspend(): void {
    if (this.ctx !== null && this.ctx.state === 'running') void this.ctx.suspend()
  }

  /** Resume after the page becomes visible again. */
  resume(): void {
    if (this.ctx !== null && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  /** Point the engine at an imported sound; pass 0 to fall back to synth. */
  setCustomUrl(url: string | null): void {
    if (url === this.customUrl) return
    this.customUrl = url
    this.custom = null
  }

  /** One tap. Rate > 1 raises the pitch (used by freak mode). */
  tok(rate = 1): void {
    if (this.customUrl !== null) {
      this.playCustom()
      return
    }
    const now = performance.now()
    if (now - this.lastTok < 40) return
    this.lastTok = now
    const ctx = this.ensure()
    if (ctx === null || this.volume <= 0) return
    const t = ctx.currentTime

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(340 * rate, t)
    osc.frequency.exponentialRampToValueAtTime(150 * rate, t + 0.07)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.5 * this.volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.1)

    // tiny noise click for the "clack"
    const frames = Math.floor(ctx.sampleRate * 0.02)
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1800
    const noiseGain = ctx.createGain()
    noiseGain.gain.setValueAtTime(0.25 * this.volume, t)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
    noise.connect(filter).connect(noiseGain).connect(ctx.destination)
    noise.start(t)
  }

  /** A softer rising blip, used when petting the cat. */
  boop(): void {
    if (this.customUrl !== null) {
      this.playCustom()
      return
    }
    const ctx = this.ensure()
    if (ctx === null || this.volume <= 0) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(420, t)
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.12)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.4 * this.volume, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.18)
  }

  private playCustom(): void {
    if (this.custom === null && this.customUrl !== null) {
      this.custom = new Audio(this.customUrl)
      this.custom.volume = this.volume
    }
    void this.custom?.play().catch(() => undefined)
  }

  dispose(): void {
    void this.ctx?.close().catch(() => undefined)
    this.ctx = null
    this.custom = null
    this.customUrl = null
  }
}
