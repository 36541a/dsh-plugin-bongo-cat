/**
 * The Bongo Cat settings section: the original Steam skin picker, position /
 * size / speed, the tap counter, sound and mood presets. Durable fields ride
 * the /bongo-cat RPC channel; the artwork itself is extracted from the user's
 * own Bongo Cat install (native/*).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import {
  WIDGET_LIMIT, WIDGET_TYPES,
  WidgetInstance, newWidget, withoutWidget
} from '../shared/widgets'
import { WIDGET_DEFINITIONS } from './widgets/registry'
import { WardrobePanel } from './cosmetics/WardrobePanel'
import { PRESETS } from './presets'
import {
  BongoCatSettings, BongoCatKey, ImportResult, NativeStatus, RpcResult, ScannedRoot,
  nativeIconUrl, skinUrl
} from './settings'
import { BongoCatSnapshot, BongoCatStore } from './store'
import styles from './BongoCatSection.module.css'

export interface BongoCatSectionInjected {
  store: BongoCatStore
  rpc: ClientConnectionRpc
  isLoopback: boolean
  t: (key: BongoCatKey) => string
}

interface BongoCatSectionProps extends BongoCatSectionInjected {
  close: () => void
}

interface Catalog {
  skins: string[]
  current: string
  stamp: string
  available: boolean
}

const POSITIONS: BongoCatSettings['position'][] = ['bottom-right', 'bottom-left', 'top-left', 'top-right']
const POSITION_KEYS: Record<BongoCatSettings['position'], BongoCatKey> = {
  'bottom-right': 'posBR',
  'bottom-left': 'posBL',
  'top-left': 'posTL',
  'top-right': 'posTR'
}

const MAX_SKIN_BYTES = 8 * 1024 * 1024
const MAX_SOUND_BYTES = 2 * 1024 * 1024

function useStore(store: BongoCatStore): BongoCatSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot)
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve(comma === -1 ? '' : result.slice(comma + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}

export function BongoCatSection(props: BongoCatSectionProps) {
  const { store, rpc, isLoopback, t } = props
  const snapshot = useStore(store)
  const settings = snapshot.value

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [roots, setRoots] = useState<ScannedRoot[] | null>(null)
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null)
  const [native, setNative] = useState<NativeStatus>({ available: false })
  const [catalog, setCatalog] = useState<Catalog>({ skins: [], current: '', stamp: '', available: false })
  const [nativeBusy, setNativeBusy] = useState(false)
  const [pendingSkin, setPendingSkin] = useState<string | null>(null)
  const [nativeError, setNativeError] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(false)
  const skinInputRef = useRef<HTMLInputElement>(null)
  const soundInputRef = useRef<HTMLInputElement>(null)

  const writable = isLoopback

  const loadNative = async (): Promise<void> => {
    const status = await rpc.call('/bongo-cat', 'native/status', {}) as RpcResult<NativeStatus>
    setNative(status.ok ? status.value : { available: false })
    const list = await rpc.call('/bongo-cat', 'native/catalog', {}) as RpcResult<Catalog>
    if (list.ok) setCatalog(list.value)
  }

  useEffect(() => {
    void loadNative()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const importNative = async (skin?: string): Promise<void> => {
    setNativeBusy(true)
    setPendingSkin(skin ?? null)
    setNativeError(null)
    try {
      const result = await rpc.call('/bongo-cat', 'native/import', skin === undefined ? {} : { skin }) as RpcResult<NativeStatus>
      if (!result.ok) throw new Error(result.error.message)
      setNative(result.value)
      await store.set({ skin: result.value.skin ?? skin ?? settings?.skin ?? 'Cat' })
      await loadNative()
      window.dispatchEvent(new Event('bongo-cat:native-changed'))
    } catch (err) {
      setNativeError(err instanceof Error ? err.message : String(err))
    } finally {
      setNativeBusy(false)
      setPendingSkin(null)
    }
  }

  const removeNative = async (): Promise<void> => {
    setNativeBusy(true)
    setNativeError(null)
    try {
      const result = await rpc.call('/bongo-cat', 'native/remove', {}) as RpcResult<{ removed: boolean }>
      if (!result.ok) throw new Error(result.error.message)
      setNative({ available: false })
      setCatalog({ skins: [], current: '', stamp: '', available: false })
      window.dispatchEvent(new Event('bongo-cat:native-changed'))
    } catch (err) {
      setNativeError(err instanceof Error ? err.message : String(err))
    } finally {
      setNativeBusy(false)
    }
  }

  const applyPreset = async (presetId: string, patch: Partial<BongoCatSettings>): Promise<void> => {
    setAppliedPreset(presetId)
    await run(async () => {
      await store.set(patch)
    })
  }

  const run = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const doScan = async (): Promise<void> => {
    setScanning(true)
    setError(null)
    try {
      const result = await rpc.call('/bongo-cat', 'skins/scan', {}) as RpcResult<{ roots: ScannedRoot[] }>
      if (!result.ok) throw new Error(result.error.message)
      setRoots(result.value.roots)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setScanning(false)
    }
  }

  const importSkinFile = async (file: File): Promise<void> => {
    if (file.size > MAX_SKIN_BYTES) {
      setError(t('tooLarge'))
      return
    }
    await run(async () => {
      const data = await readFileAsBase64(file)
      const result = await rpc.call('/bongo-cat', 'skins/import', { data, name: file.name }) as RpcResult<ImportResult>
      if (!result.ok) throw new Error(result.error.message)
      await store.set({ customSkinRevision: result.value.revision })
    })
  }

  const importSkinFromPath = async (path: string): Promise<void> => {
    await run(async () => {
      const result = await rpc.call('/bongo-cat', 'skins/import', { path }) as RpcResult<ImportResult>
      if (!result.ok) throw new Error(result.error.message)
      await store.set({ customSkinRevision: result.value.revision })
    })
  }

  const removeCustomSkin = async (): Promise<void> => {
    await run(async () => {
      const result = await rpc.call('/bongo-cat', 'skins/remove', {}) as RpcResult<{ removed: boolean }>
      if (!result.ok) throw new Error(result.error.message)
      await store.set({ customSkinRevision: 0 })
    })
  }

  const importSound = async (file: File): Promise<void> => {
    if (file.size > MAX_SOUND_BYTES) {
      setError(t('tooLarge'))
      return
    }
    await run(async () => {
      const data = await readFileAsBase64(file)
      const result = await rpc.call('/bongo-cat', 'sounds/import', { data, name: file.name }) as RpcResult<ImportResult>
      if (!result.ok) throw new Error(result.error.message)
      await store.set({ customSoundRevision: result.value.revision })
    })
  }

  const removeSound = async (): Promise<void> => {
    await run(async () => {
      const result = await rpc.call('/bongo-cat', 'sounds/remove', {}) as RpcResult<{ removed: boolean }>
      if (!result.ok) throw new Error(result.error.message)
      await store.set({ customSoundRevision: 0 })
    })
  }

  const resetCounter = async (): Promise<void> => {
    await run(async () => {
      const result = await rpc.call('/bongo-cat', 'stats/reset', {}) as RpcResult<{ counter: number }>
      if (!result.ok) throw new Error(result.error.message)
      await store.load()
    })
  }

  /**
   * Widget list edits all go through one array patch: the host validates the
   * whole list atomically, so a half-applied layout is impossible. The casts
   * are the price of a discriminated union whose members share one editor.
   */
  const patchWidgets = async (next: WidgetInstance[]): Promise<void> => {
    await store.set({ widgets: next })
  }

  const addWidgetOfType = async (type: (typeof WIDGET_TYPES)[number]): Promise<void> => {
    if (settings === undefined) return
    if (settings.widgets.length >= WIDGET_LIMIT) return
    const instance = newWidget(type, settings.widgets, { width: window.innerWidth, height: window.innerHeight })
    await patchWidgets([...settings.widgets, instance])
  }

  const changeWidget = async (id: string, mutate: (widget: WidgetInstance) => WidgetInstance): Promise<void> => {
    if (settings === undefined) return
    await patchWidgets(settings.widgets.map((widget) => (widget.id === id ? mutate(widget) : widget)))
  }

  if (settings === undefined) {
    return (
      <div className={styles.section}>
        <div className={styles.hint}>
          {snapshot.status === 'unavailable' ? t('unavailable') : t('loading')}
        </div>
      </div>
    )
  }

  const currentSkin = settings.customSkinRevision > 0 ? '' : (catalog.current || settings.skin)

  return (
    <div className={styles.section}>
      {!isLoopback && <div className={styles.warning}>{t('remoteWarning')}</div>}

      <div className={styles.hint}>{t('hint')}</div>

      <label className={styles.check}>
        <input type='checkbox' checked={settings.enabled}
          onChange={(event) => void store.set({ enabled: event.target.checked })} />
        <span>{t('enabledLabel')}</span>
      </label>

      {/* ── original Steam artwork ─────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('steamSkinsLabel')}</div>
        <div className={styles.row}>
          <span className={styles.note}>
            {native.available
              ? `✓ ${t('nativeReady')} · ${settings.skin}${native.size ? ` · ${native.size[0]}×${native.size[1]}` : ''}`
              : t('nativeMissing')}
          </span>
        </div>
        <div className={styles.row}>
          <button type='button' className={`${styles.btn} ${styles['btn-primary']}`}
            disabled={!writable || nativeBusy} onClick={() => void importNative()}>
            {native.available ? t('nativeReimport') : t('nativeImport')}
          </button>
          {native.available && (
            <button type='button' className={`${styles.btn} ${styles['btn-danger']}`}
              disabled={!writable || nativeBusy} onClick={() => void removeNative()}>
              {t('nativeRemove')}
            </button>
          )}
        </div>

        {catalog.skins.length > 0 && (
          <div className={styles['skin-grid']}>
            {catalog.skins.map((name) => (
              <button key={name} type='button' title={name}
                className={`${styles['skin-cell']} ${name === currentSkin ? styles['skin-cell-active'] : ''}`}
                disabled={!writable || nativeBusy}
                onClick={() => {
                  if (name === currentSkin && native.available) return
                  void importNative(name)
                }}>
                <img className={styles['skin-icon']} loading='lazy' alt={name}
                  src={nativeIconUrl(name, catalog.stamp)} />
                {pendingSkin === name && <span className={styles['skin-badge']}>…</span>}
              </button>
            ))}
          </div>
        )}

        <div className={styles.note}>{t('nativeHint')}</div>
        {nativeBusy && <div className={styles.hint}>{pendingSkin ? `${t('skinImporting')} ${pendingSkin}` : t('nativeBusy')}</div>}
        {nativeError !== null && <div className={styles.error}>{t('nativeFailed')}: {nativeError}</div>}
      </div>

      {/* ── mood presets ───────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('presetLabel')}</div>
        <div className={styles.row}>
          {PRESETS.map((preset) => (
            <button key={preset.id} type='button'
              className={`${styles.btn} ${appliedPreset === preset.id ? styles.active : ''}`}
              disabled={busy}
              onClick={() => void applyPreset(preset.id, preset.patch)}>
              {appliedPreset === preset.id ? `${t(preset.labelKey)} ✓` : t(preset.labelKey)}
            </button>
          ))}
        </div>
        {appliedPreset !== null && <div className={styles.note}>{t('presetApplied')}</div>}
      </div>

      {/* ── position & size ────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('positionLabel')}</div>
        <div className={styles.row}>
          {POSITIONS.map((position) => (
            <button key={position} type='button'
              className={`${styles.btn} ${settings.position === position ? styles.active : ''}`}
              onClick={() => void store.set({ position })}>
              {t(POSITION_KEYS[position])}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          <label className={styles.label}>{t('sizeLabel')}</label>
          <input className={styles.range} type='range' min='0.5' max='3' step='0.05'
            value={settings.size}
            onChange={(event) => void store.set({ size: Number(event.target.value) })} />
          <span className={styles.value}>{settings.size.toFixed(2)}×</span>
        </div>
        <div className={styles.row}>
          <label className={styles.label}>{t('speedLabel')}</label>
          <input className={styles.range} type='range' min='0.5' max='2.5' step='0.05'
            value={settings.speed}
            onChange={(event) => void store.set({ speed: Number(event.target.value) })} />
          <span className={styles.value}>{settings.speed.toFixed(2)}×</span>
        </div>
        <div className={styles.row}>
          <label className={styles.label}>{t('offsetLabel')}</label>
          <input className={styles.range} type='range' min='0' max='400' step='1'
            value={settings.offsetX}
            onChange={(event) => void store.set({ offsetX: Number(event.target.value) })} />
          <span className={styles.value}>{settings.offsetX}px</span>
        </div>
      </div>

      {/* ── counter ────────────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('counterLabel')}</div>
        <div className={styles.row}>
          <span className={styles.value}>{settings.counter.toLocaleString()}</span>
          <label className={styles.check}>
            <input type='checkbox' checked={settings.showCounter}
              onChange={(event) => void store.set({ showCounter: event.target.checked })} />
            <span>{t('counterLabel')}</span>
          </label>
          <button type='button' className={`${styles.btn} ${styles['btn-danger']}`}
            disabled={!writable} onClick={() => void resetCounter()}>
            {t('counterReset')}
          </button>
        </div>
      </div>

      {/* ── wardrobe ───────────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('wardrobeSection')}</div>
        <WardrobePanel store={store} settings={settings} t={t} writable={writable} />
      </div>

      {/* ── desktop widgets ────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('widgetSection')}</div>
        <div className={styles.note}>{t('widgetHint')}</div>

        {settings.widgets.length === 0 && <div className={styles.note}>{t('widgetEmpty')}</div>}

        {settings.widgets.map((widget) => {
          const definition = WIDGET_DEFINITIONS.find((entry) => entry.type === widget.type)
          return (
            <div key={widget.id} className={styles['widget-card']} data-widget={widget.id}>
              <div className={styles.row}>
                <label className={styles.check}>
                  <input type='checkbox' checked={widget.enabled}
                    onChange={(event) => void changeWidget(widget.id, (current) => (
                      { ...current, enabled: event.target.checked } as WidgetInstance))} />
                  <span>{definition === undefined ? widget.type : t(definition.labelKey)}</span>
                </label>
                <button type='button' className={`${styles.btn} ${styles['btn-danger']}`}
                  onClick={() => void patchWidgets(withoutWidget(settings.widgets, widget.id))}>
                  {t('widgetRemove')}
                </button>
              </div>

              {definition !== undefined && <div className={styles.note}>{t(definition.descriptionKey)}</div>}

              <div className={styles.row}>
                <label className={styles.label}>{t('widgetSize')}</label>
                <select className={styles.select} value={widget.size}
                  onChange={(event) => void changeWidget(widget.id, (current) => (
                    { ...current, size: event.target.value as WidgetInstance['size'] } as WidgetInstance))}>
                  <option value='sm'>{t('widgetSizeSm')}</option>
                  <option value='md'>{t('widgetSizeMd')}</option>
                </select>
                <label className={styles.label}>{t('widgetOpacity')}</label>
                <input className={styles.range} type='range' min='0.4' max='1' step='0.05'
                  value={widget.opacity}
                  onChange={(event) => void changeWidget(widget.id, (current) => (
                    { ...current, opacity: Number(event.target.value) } as WidgetInstance))} />
                <span className={styles.value}>{Math.round(widget.opacity * 100)}%</span>
              </div>

              {widget.type === 'clock' && (
                <div className={styles.row}>
                  <label className={styles.check}>
                    <input type='checkbox' checked={widget.config.hour12}
                      onChange={(event) => void changeWidget(widget.id, (current) => ({
                        ...current,
                        config: { ...current.config, hour12: event.target.checked }
                      } as WidgetInstance))} />
                    <span>{t('widgetHour12')}</span>
                  </label>
                  <label className={styles.check}>
                    <input type='checkbox' checked={widget.config.seconds}
                      onChange={(event) => void changeWidget(widget.id, (current) => ({
                        ...current,
                        config: { ...current.config, seconds: event.target.checked }
                      } as WidgetInstance))} />
                    <span>{t('widgetSeconds')}</span>
                  </label>
                  <label className={styles.check}>
                    <input type='checkbox' checked={widget.config.showDate}
                      onChange={(event) => void changeWidget(widget.id, (current) => ({
                        ...current,
                        config: { ...current.config, showDate: event.target.checked }
                      } as WidgetInstance))} />
                    <span>{t('widgetShowDate')}</span>
                  </label>
                </div>
              )}

              {widget.type === 'counter' && (
                <div className={styles.row}>
                  <label className={styles.label}>{t('widgetSource')}</label>
                  <select className={styles.select} value={widget.config.source}
                    onChange={(event) => void changeWidget(widget.id, (current) => ({
                      ...current,
                      config: { ...current.config, source: event.target.value as 'total' | 'session' }
                    } as WidgetInstance))}>
                    <option value='total'>{t('widgetCounterTotal')}</option>
                    <option value='session'>{t('widgetCounterSession')}</option>
                  </select>
                </div>
              )}

              {widget.type === 'focus' && (
                <div className={styles.row}>
                  <label className={styles.label}>{t('widgetMinutes')}</label>
                  <input className={styles.select} type='number' min='1' max='120' step='1'
                    value={widget.config.minutes}
                    onChange={(event) => {
                      const minutes = Math.min(120, Math.max(1, Math.round(Number(event.target.value) || 1)))
                      void changeWidget(widget.id, (current) => ({
                        ...current,
                        config: { ...current.config, minutes }
                      } as WidgetInstance))
                    }} />
                  <label className={styles.check}>
                    <input type='checkbox' checked={widget.config.chime}
                      onChange={(event) => void changeWidget(widget.id, (current) => ({
                        ...current,
                        config: { ...current.config, chime: event.target.checked }
                      } as WidgetInstance))} />
                    <span>{t('widgetChime')}</span>
                  </label>
                </div>
              )}

            </div>
          )
        })}

        <div className={styles.note}>{t('widgetAdd')}</div>
        <div className={styles.row}>
          {WIDGET_DEFINITIONS.map((definition) => (
            <button key={definition.type} type='button' className={styles.btn}
              disabled={!writable || settings.widgets.length >= WIDGET_LIMIT}
              onClick={() => void addWidgetOfType(definition.type)}>
              + {t(definition.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* ── sound ──────────────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('soundLabel')}</div>
        <label className={styles.check}>
          <input type='checkbox' checked={settings.soundEnabled}
            onChange={(event) => void store.set({ soundEnabled: event.target.checked })} />
          <span>{t('soundOnLabel')}</span>
        </label>
        <div className={styles.row}>
          <label className={styles.label}>{t('volumeLabel')}</label>
          <input className={styles.range} type='range' min='0' max='1' step='0.05'
            value={settings.volume}
            onChange={(event) => void store.set({ volume: Number(event.target.value) })} />
          <span className={styles.value}>{Math.round(settings.volume * 100)}%</span>
        </div>
        <div className={styles.row}>
          <button type='button' className={styles.btn} disabled={!writable}
            onClick={() => soundInputRef.current?.click()}>
            {t('importSoundButton')}
          </button>
          {settings.customSoundRevision > 0 && (
            <button type='button' className={`${styles.btn} ${styles['btn-danger']}`}
              disabled={!writable} onClick={() => void removeSound()}>
              {t('removeSoundButton')}
            </button>
          )}
          <input ref={soundInputRef} type='file' accept='.wav' className={styles['hidden-input']}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void importSound(file)
            }} />
        </div>
      </div>

      {/* ── custom image (optional override) ───────────────────── */}
      <div className={styles.group}>
        <button type='button' className={styles['group-toggle']}
          onClick={() => setShowCustom((value) => !value)}>
          {showCustom ? '▾' : '▸'} {t('customLabel')}
        </button>
        {showCustom && (
          <>
            <div className={styles.note}>{t('framesHint')}</div>
            <div className={styles.row}>
              <button type='button' className={`${styles.btn} ${styles['btn-primary']}`}
                disabled={!writable} onClick={() => skinInputRef.current?.click()}>
                {t('importSkinButton')}
              </button>
              {settings.customSkinRevision > 0 && (
                <button type='button' className={`${styles.btn} ${styles['btn-danger']}`}
                  disabled={!writable} onClick={() => void removeCustomSkin()}>
                  {t('removeSkinButton')}
                </button>
              )}
              <input ref={skinInputRef} type='file' accept='image/*' className={styles['hidden-input']}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void importSkinFile(file)
                }} />
            </div>
            {settings.customSkinRevision > 0 && (
              <div className={styles.row}>
                <div className={styles['preview-strip']}>
                  <img className={styles['preview-thumb']} src={skinUrl(settings.customSkinRevision)} alt='' />
                </div>
                <label className={styles.label}>{t('framesLabel')}</label>
                <input className={styles.range} type='range' min='2' max='12' step='1'
                  value={settings.customSkinFrames}
                  onChange={(event) => void store.set({ customSkinFrames: Number(event.target.value) })} />
                <span className={styles.value}>{settings.customSkinFrames}</span>
              </div>
            )}
            <div className={styles.row}>
              <button type='button' className={styles.btn} disabled={!writable || scanning}
                onClick={() => void doScan()}>
                {scanning ? t('scanning') : t('scanButton')}
              </button>
            </div>
            {roots !== null && roots.length === 0 && <div className={styles.note}>{t('scanEmpty')}</div>}
            {roots !== null && roots.length > 0 && (
              <div className={styles['scan-list']}>
                {roots.map((rootEntry) => (
                  <div key={rootEntry.path} className={styles['scan-root']}>
                    <div className={styles['scan-root-label']}>{rootEntry.label}</div>
                    <div className={styles['scan-root-path']}>{rootEntry.path}</div>
                    <div className={styles['scan-files']}>
                      {rootEntry.files.map((file) => (
                        <button key={file.path} type='button' className={styles['scan-file']}
                          disabled={!writable || busy} onClick={() => void importSkinFromPath(file.path)}>
                          {file.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {error !== null && <div className={styles.error}>{error}</div>}
    </div>
  )
}
