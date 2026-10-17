/**
 * The Bongo Cat settings section: skin gallery (built-in + imported
 * sprite strips), Steam scanner import, sound controls, position /
 * size / speed, the tap counter and the easter-egg toggles. Durable
 * fields ride the /bongo-cat RPC channel; asset bytes ride
 * skins/import and sounds/import.
 */
import { useRef, useState, useSyncExternalStore } from 'react'
import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { catPreviewSvg } from './cat-svg'
import { BUILT_IN_SKINS } from './skins'
import { PRESETS } from './presets'
import { BongoCatSettings, BongoCatKey, ImportResult, RpcResult, ScannedRoot, skinUrl } from './settings'
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
  const [importedPath, setImportedPath] = useState<string | null>(null)
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null)
  const skinInputRef = useRef<HTMLInputElement>(null)
  const soundInputRef = useRef<HTMLInputElement>(null)

  const writable = isLoopback

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

  const importSkinFile = async (file: File): Promise<void> => {
    if (file.size > MAX_SKIN_BYTES) {
      setError(t('tooLarge'))
      return
    }
    await run(async () => {
      const data = await readFileAsBase64(file)
      const result = await rpc.call('/bongo-cat', 'skins/import', { data, name: file.name }) as RpcResult<ImportResult>
      if (!result.ok) throw new Error(result.error.message)
      await store.load()
    })
  }

  const importSkinPath = async (path: string, name: string): Promise<void> => {
    await run(async () => {
      const result = await rpc.call('/bongo-cat', 'skins/import', { path, name }) as RpcResult<ImportResult>
      if (!result.ok) throw new Error(result.error.message)
      setImportedPath(name)
      await store.load()
    })
  }

  const removeSkin = async (): Promise<void> => {
    await run(async () => {
      const result = await rpc.call('/bongo-cat', 'skins/remove', {}) as RpcResult<{ removed: boolean }>
      if (!result.ok) throw new Error(result.error.message)
      await store.load()
    })
  }

  const importSoundFile = async (file: File): Promise<void> => {
    if (file.size > MAX_SOUND_BYTES) {
      setError(t('tooLarge'))
      return
    }
    await run(async () => {
      const data = await readFileAsBase64(file)
      const result = await rpc.call('/bongo-cat', 'sounds/import', { data, name: file.name }) as RpcResult<ImportResult>
      if (!result.ok) throw new Error(result.error.message)
      await store.load()
    })
  }

  const removeSound = async (): Promise<void> => {
    await run(async () => {
      const result = await rpc.call('/bongo-cat', 'sounds/remove', {}) as RpcResult<{ removed: boolean }>
      if (!result.ok) throw new Error(result.error.message)
      await store.load()
    })
  }

  const scan = async (): Promise<void> => {
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

  const resetCounter = async (): Promise<void> => {
    await run(async () => {
      const result = await rpc.call('/bongo-cat', 'stats/reset', {}) as RpcResult<{ counter: number }>
      if (!result.ok) throw new Error(result.error.message)
      await store.load()
    })
  }

  if (snapshot.status === 'loading') {
    return <div className={styles.hint}>{t('loading')}</div>
  }
  if (snapshot.status === 'unavailable' || settings === undefined) {
    return <div className={styles.hint}>{t('unavailable')}</div>
  }

  const totalFiles = roots?.reduce((sum, root) => sum + root.files.length, 0) ?? 0

  return (
    <div className={styles.section}>
      <div className={styles.hint}>{t('hint')}</div>

      <label className={styles.check}>
        <input type='checkbox' checked={settings.enabled}
          onChange={(event) => void store.set({ enabled: event.target.checked })} />
        <span>{t('enabledLabel')}</span>
      </label>

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

      {/* ── skins ─────────────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('skinLabel')}</div>
        <div className={styles['group-title']} style={{ fontWeight: 400, opacity: 0.7 }}>{t('builtinLabel')}</div>
        <div className={styles.gallery}>
          {BUILT_IN_SKINS.map((skin) => (
            <button key={skin.id} type='button'
              className={`${styles['skin-card']} ${settings.skin === skin.id ? styles.selected : ''}`}
              onClick={() => void store.set({ skin: skin.id })}>
              <span dangerouslySetInnerHTML={{ __html: catPreviewSvg(skin) }} />
              <span className={styles['skin-name']}>{skin.name}</span>
            </button>
          ))}
        </div>

        <div className={styles['group-title']} style={{ fontWeight: 400, opacity: 0.7 }}>{t('customLabel')}</div>
        {settings.customSkinRevision > 0 && (
          <div className={styles['preview-strip']}>
            <img className={styles['preview-thumb']} src={skinUrl(settings.customSkinRevision)} alt='' />
            <div className={styles.row}>
              <button type='button' className={`${styles.btn} ${styles['btn-danger']}`}
                disabled={!writable || busy} onClick={() => void removeSkin()}>
                {t('removeSkinButton')}
              </button>
            </div>
          </div>
        )}
        <div className={styles.row}>
          <input ref={skinInputRef} type='file' accept='image/png,image/webp,image/gif,image/jpeg,image/bmp'
            className={styles['hidden-input']}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              event.target.value = ''
              if (file !== null) void importSkinFile(file)
            }} />
          <button type='button' className={`${styles.btn} ${styles['btn-primary']}`}
            disabled={!writable || busy} onClick={() => skinInputRef.current?.click()}>
            {t('importSkinButton')}
          </button>
          <span className={styles.value}>{t('framesLabel')}</span>
          <input className={styles.range} type='range' min={2} max={12} step={1}
            value={settings.customSkinFrames}
            onChange={(event) => void store.set({ customSkinFrames: Number(event.target.value) })} />
          <span className={styles.value}>{settings.customSkinFrames}</span>
        </div>
        <div className={styles.note}>{t('framesHint')}</div>

        <div className={styles.row}>
          <button type='button' className={styles.btn} disabled={!writable || scanning}
            onClick={() => void scan()}>
            {scanning ? t('scanning') : t('scanButton')}
          </button>
          <span className={styles.note}>{t('scanHint')}</span>
        </div>
        {roots !== null && (
          <div className={styles['scan-list']}>
            {roots.length === 0 && <div className={styles.note}>{t('scanEmpty')}</div>}
            {roots.map((rootEntry) => (
              <div key={rootEntry.path} className={styles['scan-root']}>
                <div className={styles['scan-root-label']}>{rootEntry.label}</div>
                <div className={styles['scan-root-path']}>{rootEntry.path}</div>
                {rootEntry.files.length === 0 && <div className={styles.note}>{t('scanEmpty')}</div>}
                <div className={styles['scan-files']}>
                  {rootEntry.files.map((file) => (
                    <button key={file.path} type='button' className={styles['scan-file']}
                      disabled={!writable || busy}
                      title={`${file.path} · ${(file.size / 1024).toFixed(0)} KB`}
                      onClick={() => void importSkinPath(file.path, file.name)}>
                      <span>{importedPath === file.name ? `${file.name} ✓` : file.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {totalFiles > 0 && <div className={styles.note}>· {totalFiles}</div>}
          </div>
        )}
      </div>

      {/* ── sound ─────────────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('soundLabel')}</div>
        <label className={styles.check}>
          <input type='checkbox' checked={settings.soundEnabled}
            onChange={(event) => void store.set({ soundEnabled: event.target.checked })} />
          <span>{t('soundOnLabel')}</span>
        </label>
        <div className={styles.row}>
          <span className={styles.label}>{t('volumeLabel')}</span>
          <input className={styles.range} type='range' min={0} max={100} value={Math.round(settings.volume * 100)}
            onChange={(event) => void store.set({ volume: Number(event.target.value) / 100 })} />
          <span className={styles.value}>{Math.round(settings.volume * 100)}%</span>
        </div>
        <div className={styles.row}>
          <input ref={soundInputRef} type='file' accept='audio/wav,audio/mpeg,audio/ogg'
            className={styles['hidden-input']}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              event.target.value = ''
              if (file !== null) void importSoundFile(file)
            }} />
          <button type='button' className={styles.btn}
            disabled={!writable || busy} onClick={() => soundInputRef.current?.click()}>
            {t('importSoundButton')}
          </button>
          {settings.customSoundRevision > 0 && (
            <button type='button' className={`${styles.btn} ${styles['btn-danger']}`}
              disabled={!writable || busy} onClick={() => void removeSound()}>
              {t('removeSoundButton')}
            </button>
          )}
        </div>
        <div className={styles.note}>{settings.customSoundRevision > 0 ? '🎵 ' + settings.customSoundRevision : '🔔 '}</div>
      </div>

      {/* ── position & size ───────────────────────────────────── */}
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
          <span className={styles.label}>{t('offsetLabel')}</span>
          <input className={styles.range} type='range' min={0} max={240} value={Math.min(240, settings.offsetX)}
            onChange={(event) => void store.set({ offsetX: Number(event.target.value) })} />
          <span className={styles.value}>{settings.offsetX}px</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{t('offsetLabel')}</span>
          <input className={styles.range} type='range' min={0} max={240} value={Math.min(240, settings.offsetY)}
            onChange={(event) => void store.set({ offsetY: Number(event.target.value) })} />
          <span className={styles.value}>{settings.offsetY}px</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{t('sizeLabel')}</span>
          <input className={styles.range} type='range' min={50} max={300} value={Math.round(settings.size * 100)}
            onChange={(event) => void store.set({ size: Number(event.target.value) / 100 })} />
          <span className={styles.value}>{Math.round(settings.size * 100)}%</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{t('speedLabel')}</span>
          <input className={styles.range} type='range' min={50} max={250} value={Math.round(settings.speed * 100)}
            onChange={(event) => void store.set({ speed: Number(event.target.value) / 100 })} />
          <span className={styles.value}>{Math.round(settings.speed * 100)}%</span>
        </div>
      </div>

      {/* ── counter ───────────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('counterLabel')}</div>
        <div className={styles.row}>
          <span className={styles.label} style={{ fontSize: 20, fontWeight: 700 }}>
            🥁 {settings.counter.toLocaleString()}
          </span>
          <button type='button' className={`${styles.btn} ${styles['btn-danger']}`}
            disabled={!writable || busy} onClick={() => void resetCounter()}>
            {t('counterReset')}
          </button>
        </div>
      </div>

      {/* ── easter eggs ───────────────────────────────────────── */}
      <div className={styles.group}>
        <div className={styles['group-title']}>{t('eggsLabel')}</div>
        <label className={styles.check}>
          <input type='checkbox' checked={settings.eggFreak}
            onChange={(event) => void store.set({ eggFreak: event.target.checked })} />
          <span>{t('eggFreak')}</span>
        </label>
        <label className={styles.check}>
          <input type='checkbox' checked={settings.eggSleep}
            onChange={(event) => void store.set({ eggSleep: event.target.checked })} />
          <span>{t('eggSleep')}</span>
        </label>
        <label className={styles.check}>
          <input type='checkbox' checked={settings.eggPet}
            onChange={(event) => void store.set({ eggPet: event.target.checked })} />
          <span>{t('eggPet')}</span>
        </label>
        <label className={styles.check}>
          <input type='checkbox' checked={settings.eggNight}
            onChange={(event) => void store.set({ eggNight: event.target.checked })} />
          <span>{t('eggNight')}</span>
        </label>
      </div>

      {!isLoopback && <div className={styles.warning}>{t('remoteWarning')}</div>}
      {error !== null && <div className={styles.error}>{error}</div>}
      {busy && <div className={styles.hint}>{t('busy')}</div>}
    </div>
  )
}
