/**
 * Bongo Cat config store: the browser-side mirror of the host config,
 * transported over the /bongo-cat RPC channel (config/get, config/set).
 * The rc.6 settings wire allowlist does not cover third-party namespaces,
 * so the settings-scope binder cannot reach this namespace; this store is
 * the plugin-owned equivalent with a coalescing writer.
 */
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { BongoCatSettings, RpcResult } from './settings'

export interface BongoCatSnapshot {
  status: 'loading' | 'ready' | 'unavailable'
  value?: BongoCatSettings
}

export class BongoCatStore {
  private snapshot: BongoCatSnapshot = { status: 'loading' }
  private listeners = new Set<() => void>()
  private dirty: Partial<BongoCatSettings> | null = null
  private flushing = false

  constructor(private readonly rpc: ClientConnectionRpc) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): BongoCatSnapshot => this.snapshot

  private publish(snapshot: BongoCatSnapshot): void {
    this.snapshot = snapshot
    for (const listener of [...this.listeners]) listener()
  }

  /** Pull the host-resolved config once (plugin activation / after imports). */
  async load(): Promise<void> {
    const result = await this.rpc.call('/bongo-cat', 'config/get', {}) as RpcResult<BongoCatSettings>
    if (!result.ok) {
      this.publish({ status: 'unavailable' })
      return
    }
    this.publish({ status: 'ready', value: result.value })
  }

  /**
   * Coalescing writer: rapid slider writes merge; only the newest patch
   * re-flushes after the in-flight round-trip, so the host never races
   * itself and the UI never blocks on intermediate responses.
   */
  async set(patch: Partial<BongoCatSettings>): Promise<void> {
    this.dirty = { ...this.dirty, ...patch }
    if (this.flushing) return
    this.flushing = true
    try {
      while (this.dirty !== null) {
        const next = this.dirty
        this.dirty = null
        const result = await this.rpc.call('/bongo-cat', 'config/set', { patch: next }) as RpcResult<BongoCatSettings>
        if (!result.ok) throw new Error(result.error.message)
        this.publish({ status: 'ready', value: result.value })
      }
    } finally {
      this.flushing = false
    }
  }
}
