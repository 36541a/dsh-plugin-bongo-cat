/**
 * dsh-plugin-bongo-cat — host half.
 *
 * Provides, for the Web profile composition:
 *  - a user-settings namespace 'bongo-cat' (schema + live apply; the
 *    namespace itself is not exposed on the settings wire API — the
 *    rc.6 allowlist covers only built-in namespaces — so the browser
 *    reads and writes it through this channel's config/get and
 *    config/set endpoints),
 *  - the /bongo-cat channel (config/get, config/set, stats/bump,
 *    stats/reset, skins/scan, skins/import, skins/remove,
 *    sounds/import, sounds/remove, info), mounted as a Host-webserver
 *    prefix route that speaks the generic Connection RPC envelope
 *    itself (see serveRpc for why),
 *  - the GET /plugins/bongo-cat/skin?v=<revision> route serving an
 *    imported skin image with revision-based cache busting,
 *  - the GET /plugins/bongo-cat/sound?v=<revision> route serving an
 *    imported .wav sound the same way.
 *
 * Storage layout ($DSH_HOME/storages/bongo-cat):
 *   skins/skin-<revision>.<ext>   the last imported skin image
 *   skins/skin.json               { revision, name, source, ext, updatedAt }
 *   sounds/sound-<revision>.<ext> the last imported sound
 *   sounds/sound.json             { revision, name, updatedAt }
 *
 * Revisions are server-authoritative and monotonic, so a stale URL can
 * never show a mismatched asset.
 *
 * Bongo Cat (Steam app 1337970) discovery: the scanner reads the Steam
 * install path from the Windows registry, expands every Steam library
 * from steamapps/libraryfolders.vdf, and looks for
 *   <library>/steamapps/common/BongoCat*            (game install)
 *   <library>/steamapps/workshop/content/1337970    (Workshop items)
 * plus %APPDATA%/BongoCat. Imported files are copied into the plugin's
 * own storage; the game installation itself is never modified.
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, extname, basename } from 'node:path'
import { execFileSync } from 'node:child_process'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'

// Type-only imports keep the Context service augmentations active:
//   ctx.settings  (@deepseek-ai/dsh-settings)
//   ctx.webServer (@deepseek-ai/dsh-host-webserver)
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'

// The settings contract is the single source of truth for keys, defaults
// and ranges (see src/shared/settings-contract.ts). The schema builder
// lives HERE, not in the contract, because the contract is imported by
// the browser half and must stay free of value imports.
import {
  NS as CONTRACT_NS,
  SETTINGS_FIELDS,
  WRITABLE_FIELDS,
  sanitizeSettingsPatch,
  type FieldMeta
} from './shared/settings-contract'

export const name = 'bongo-cat'

/** Settings namespace key (lowercase kebab-case). */
const NS = CONTRACT_NS as SettingsNamespace

/** Bongo Cat's Steam app id (used to locate Workshop content). */
const BONGO_CAT_APPID = '1337970'

/**
 * Build the schemastery settings schema from the contract. Defaults come
 * from the contract; runtime validation is sanitizeSettingsPatch (wired
 * into config/set below), so the two can never drift.
 */
function buildSettingsSchema(): z.Schema {
  const shape: Record<string, z.Schema> = {}
  for (const [key, meta] of Object.entries(SETTINGS_FIELDS)) {
    const m = meta as FieldMeta
    switch (m.kind) {
      case 'boolean':
        shape[key] = z.boolean().default(m.default as boolean)
        break
      case 'string':
        shape[key] = z.string().default(m.default as string)
        break
      case 'natural':
        shape[key] = z.natural().default(m.default as number)
        break
      case 'number':
        shape[key] = z.number().default(m.default as number)
        break
      case 'position':
        shape[key] = z.union(['bottom-right', 'bottom-left', 'top-left', 'top-right']).default(m.default as string)
        break
    }
  }
  return z.object(shape)
}

const BongoCatSchema = buildSettingsSchema()

/** Asset metadata next to a stored file. */
interface AssetMeta {
  revision: number
  name: string
  source?: string
  ext: string
  updatedAt: string
}

/** A candidate image found by the Bongo Cat scanner. */
interface ScannedFile {
  name: string
  path: string
  size: number
}

/** A scanned root (game install, Workshop folder, AppData, …). */
interface ScannedRoot {
  label: string
  path: string
  files: ScannedFile[]
}

/** Channel path; the browser half calls `connection.rpc.call(CHANNEL, …)`. */
const CHANNEL = '/bongo-cat'

/** Endpoint segment rule, copied from dsh-client-connection's wire contract. */
const ENDPOINT_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/

/** Cap on one RPC request body; uploads are base64, so ~4/3 of the file. */
const MAX_RPC_BODY_BYTES = 24_000_000

const MAX_IMPORT_BYTES = 8_000_000
const MAX_SOUND_BYTES = 2_000_000
const MAX_SCAN_FILES_PER_ROOT = 300
const SCAN_DEPTH = 3

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'])
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp'
}
const SOUND_CONTENT_TYPES: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
}

/** Fields the browser may change through config/set (from the contract). */
const CONFIG_FIELDS: readonly string[] = WRITABLE_FIELDS

const POSITIONS = new Set(['bottom-right', 'bottom-left', 'top-left', 'top-right'])

/** `POST ${CHANNEL}/${endpoint}` → endpoint, or undefined when the path is not ours. */
function endpointOf(pathname: string): string | undefined {
  if (!pathname.startsWith(`${CHANNEL}/`)) return undefined
  const endpoint = pathname.slice(CHANNEL.length + 1)
  if (endpoint.split('/').some((segment) => segment === '' || segment === '.' || segment === '..' || !ENDPOINT_SEGMENT_PATTERN.test(segment))) return undefined
  return endpoint
}

/** Collect a node request body as UTF-8 text, refusing oversized payloads. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_RPC_BODY_BYTES) {
        rejectBody(new Error('request body is too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
    req.on('error', rejectBody)
  })
}

/** Write a server-response envelope; rpcId must echo the caller's id. */
function respond(res: ServerResponse, rpcId: string, result: HandlerResult): void {
  const text = JSON.stringify({ type: 'server-response', rpcId, result })
  res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(text)) })
  res.end(text)
}

/**
 * Serve one generic Connection RPC exchange over the node req/res pair the
 * Host webserver hands to a prefix route.
 *
 * This mirrors dsh-client-connection's own `rpcFetchHandler`, so the browser
 * half's `connection.rpc.call(CHANNEL, endpoint, payload)` keeps working
 * unchanged: POST + application/json in, `{type:'server-response', rpcId,
 * result}` out, with rpcId echoed verbatim.
 */
async function serveRpc(req: IncomingMessage, res: ServerResponse, dispatch: ConnectionRpcHandler): Promise<void> {
  let pathname: string
  try {
    pathname = new URL(req.url ?? '/', 'http://bongo-cat.local').pathname
  } catch {
    pathname = ''
  }
  const endpoint = endpointOf(pathname)
  if (req.method !== 'POST' || endpoint === undefined) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('not found')
    return
  }
  const contentType = String(req.headers['content-type'] ?? '').split(';', 1)[0]?.trim().toLowerCase()
  if (contentType !== 'application/json') {
    res.writeHead(415, { 'Content-Type': 'text/plain' })
    res.end('content type must be application/json')
    return
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(await readBody(req))
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('body is not JSON')
    return
  }

  const message = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>
  const rpcId = typeof message.rpcId === 'string' ? message.rpcId : 'invalid-request'
  if (message.type !== 'client-request' || typeof message.rpcId !== 'string' || typeof message.method !== 'string') {
    respond(res, rpcId, failBadRequest('invalid client-request message'))
    return
  }
  if (message.method !== endpoint) {
    respond(res, rpcId, failBadRequest(`method ${JSON.stringify(message.method)} does not match endpoint ${JSON.stringify(endpoint)}`))
    return
  }

  const controller = new AbortController()
  const onAborted = () => controller.abort()
  req.on('aborted', onAborted)
  try {
    respond(res, rpcId, await dispatch(endpoint, message.payload, controller.signal))
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end(`handler failure: ${String(error)}`)
  } finally {
    req.off('aborted', onAborted)
  }
}

/** Result shape the connection RPC transport expects (its own RpcResult copy). */
type HandlerResult = Awaited<ReturnType<ConnectionRpcHandler>>

function ok<T>(value: T): HandlerResult {
  return { ok: true, value }
}

function failBadRequest(message: string): HandlerResult {
  return { ok: false, error: { code: 'bad-request', message, details: { issues: [] } } }
}

function failInternal(message: string): HandlerResult {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

/** Resolve $DSH_HOME the same way the harness does; default ~/.dsh. */
function dataDir(): string {
  const env = process.env.DSH_HOME?.trim()
  const home = env ? resolve(env) : join(homedir(), '.dsh')
  return join(home, 'storages', 'bongo-cat')
}

/* ------------------------------------------------------------------ */
/* Steam / Bongo Cat discovery                                        */
/* ------------------------------------------------------------------ */

/** Steam install roots from the registry, with common fallbacks. */
function steamRootCandidates(): string[] {
  const roots: string[] = []
  if (process.platform === 'win32') {
    try {
      const out = execFileSync('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath'], {
        encoding: 'utf8',
        timeout: 4000,
        windowsHide: true
      })
      const match = out.match(/SteamPath\s+REG_SZ\s+(.+)/i)
      if (match) roots.push(match[1].trim().replace(/\//g, '\\'))
    } catch {
      // registry unavailable — fall through to the defaults below
    }
  }
  roots.push(
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
    'D:\\Steam',
    'D:\\SteamLibrary',
    'E:\\Steam',
    join(homedir(), '.steam', 'steam')
  )
  return [...new Set(roots.filter((root) => existsSync(root)))]
}

/** Every Steam library: the default one plus all registered library folders. */
function steamLibraries(steam: string): string[] {
  const libraries = [join(steam, 'steamapps')]
  try {
    const text = readFileSync(join(steam, 'steamapps', 'libraryfolders.vdf'), 'utf8')
    for (const match of text.matchAll(/"path"\s+"([^"]+)"/g)) {
      libraries.push(join(match[1].replace(/\\\\/g, '\\'), 'steamapps'))
    }
  } catch {
    // no vdf (or unreadable) — the default library is all we have
  }
  return [...new Set(libraries.filter((lib) => existsSync(lib)))]
}

/** Collect image files under a root, breadth-limited, largest-first-safe. */
function collectImages(root: string, depth = 0): ScannedFile[] {
  const files: ScannedFile[] = []
  const walk = (dir: string, level: number): void => {
    if (files.length >= MAX_SCAN_FILES_PER_ROOT || level > SCAN_DEPTH) return
    let entries: ReturnType<typeof readdirSync>
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (files.length >= MAX_SCAN_FILES_PER_ROOT) return
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full, level + 1)
        continue
      }
      if (!entry.isFile()) continue
      const ext = extname(entry.name).toLowerCase()
      if (!IMAGE_EXTENSIONS.has(ext)) continue
      try {
        const size = statSync(full).size
        if (size > MAX_IMPORT_BYTES) continue
        files.push({ name: entry.name, path: full, size })
      } catch {
        // vanished between readdir and stat — skip
      }
    }
  }
  walk(root, 0)
  return files.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Locate Bongo Cat content on this machine: the game install in any Steam
 * library, its Workshop folder (app 1337970), and the AppData user folder.
 * Everything is read-only; nothing is ever written outside our storage.
 */
function scanBongoCat(): ScannedRoot[] {
  const roots: ScannedRoot[] = []
  const seen = new Set<string>()

  const push = (label: string, path: string): void => {
    if (seen.has(path) || !existsSync(path)) return
    seen.add(path)
    roots.push({ label, path, files: collectImages(path) })
  }

  for (const steam of steamRootCandidates()) {
    for (const library of steamLibraries(steam)) {
      const common = join(library, 'common')
      if (existsSync(common)) {
        let entries: ReturnType<typeof readdirSync>
        try {
          entries = readdirSync(common, { withFileTypes: true })
        } catch {
          entries = []
        }
        for (const entry of entries) {
          if (entry.isDirectory() && /bongo\s*cat/i.test(entry.name)) {
            push(`Steam 游戏目录 · ${entry.name}`, join(common, entry.name))
          }
        }
      }
      push('Steam 创意工坊 · 1337970', join(library, 'workshop', 'content', BONGO_CAT_APPID))
    }
  }

  const appData = process.env.APPDATA?.trim()
  if (appData) {
    push('用户数据 · %APPDATA%\\BongoCat', join(appData, 'BongoCat'))
    push('用户数据 · %APPDATA%\\BongoCat\\skins', join(appData, 'BongoCat', 'skins'))
  }

  return roots
}

/** True when `path` lives inside one of the scanned Bongo Cat roots. */
function isInsideScannedRoot(path: string): boolean {
  const target = resolve(path)
  return scanBongoCat().some((root) => {
    const base = resolve(root.path)
    return target === base || target.startsWith(base + '\\') || target.startsWith(base + '/')
  })
}

/* ------------------------------------------------------------------ */
/* Plugin                                                             */
/* ------------------------------------------------------------------ */

export function apply(ctx: Context) {
  const dir = dataDir()
  const skinsDir = join(dir, 'skins')
  const soundsDir = join(dir, 'sounds')
  const skinMetaPath = join(skinsDir, 'skin.json')
  const soundMetaPath = join(soundsDir, 'sound.json')
  mkdirSync(skinsDir, { recursive: true })
  mkdirSync(soundsDir, { recursive: true })

  const readJson = <T,>(path: string): T | null => {
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as T
    } catch {
      return null
    }
  }

  const readSkinMeta = (): AssetMeta | null => {
    const meta = readJson<Partial<AssetMeta>>(skinMetaPath)
    if (typeof meta?.revision !== 'number' || !Number.isInteger(meta.revision)) return null
    return meta as AssetMeta
  }

  const readSoundMeta = (): AssetMeta | null => {
    const meta = readJson<Partial<AssetMeta>>(soundMetaPath)
    if (typeof meta?.revision !== 'number' || !Number.isInteger(meta.revision)) return null
    return meta as AssetMeta
  }

  // ── settings namespace ─────────────────────────────────────────────
  // Registered for schema validation, defaults, and persistence in the
  // user settings document. The rc.6 settings WIRE allowlist does not
  // cover third-party namespaces, so the browser half reads and writes
  // it through the /bongo-cat channel below.
  const scope = ctx.settings.register(NS, BongoCatSchema, { applies: 'live' })

  /** Persist an imported asset atomically and return its new revision. */
  const importAsset = (kind: 'skin' | 'sound', sourcePath: string | null, base64: string | null, name: string): AssetMeta | string => {
    const assetDir = kind === 'skin' ? skinsDir : soundsDir
    const metaPath = kind === 'skin' ? skinMetaPath : soundMetaPath
    const maxBytes = kind === 'skin' ? MAX_IMPORT_BYTES : MAX_SOUND_BYTES
    const allowed = kind === 'skin' ? IMAGE_EXTENSIONS : new Set(Object.keys(SOUND_CONTENT_TYPES))

    let buffer: Buffer
    let ext: string
    let source: string | undefined
    if (sourcePath !== null) {
      if (!isInsideScannedRoot(sourcePath)) return 'path is outside the scanned Bongo Cat roots'
      ext = extname(sourcePath).toLowerCase()
      if (!allowed.has(ext)) return `unsupported ${kind} extension: ${ext}`
      try {
        if (!statSync(sourcePath).isFile()) return 'path is not a file'
        buffer = readFileSync(sourcePath)
      } catch (error) {
        return `cannot read file: ${String(error)}`
      }
      source = sourcePath
    } else {
      if (typeof base64 !== 'string' || base64.length === 0 || base64.length > maxBytes * 2) return `data must be a non-empty base64 string under ${maxBytes} bytes`
      buffer = Buffer.from(base64, 'base64')
      ext = extname(name || '').toLowerCase()
      if (!allowed.has(ext)) ext = kind === 'skin' ? '.png' : '.wav'
    }
    if (buffer.length === 0 || buffer.length > maxBytes) return `${kind} is empty or over ${maxBytes} bytes`
    if (basename(name || '').length > 120) return 'name is too long'

    const previous = kind === 'skin' ? readSkinMeta() : readSoundMeta()
    const revision = (previous?.revision ?? 0) + 1
    const target = join(assetDir, `${kind}-${revision}${ext}`)
    const meta: AssetMeta = { revision, name: basename(name || `${kind}-${revision}${ext}`), source, ext, updatedAt: new Date().toISOString() }
    try {
      writeFileSync(target + '.tmp', buffer)
      writeFileSync(metaPath, JSON.stringify(meta))
      renameSync(target + '.tmp', target)
    } catch (error) {
      rmSync(target + '.tmp', { force: true })
      return failText(error)
    }
    return meta
  }

  const failText = (error: unknown): string => `write failed: ${String(error)}`

  const removeAsset = (kind: 'skin' | 'sound'): void => {
    const meta = kind === 'skin' ? readSkinMeta() : readSoundMeta()
    const assetDir = kind === 'skin' ? skinsDir : soundsDir
    if (meta) rmSync(join(assetDir, `${kind}-${meta.revision}${meta.ext}`), { force: true })
    rmSync(kind === 'skin' ? skinMetaPath : soundMetaPath, { force: true })
  }

  // ── /bongo-cat channel ─────────────────────────────────────────────
  // Served as a plain Host-webserver prefix route instead of through
  // `ctx.connection.rpc.handle()`, mirroring dsh-plugin-wallpaper: that
  // registry resolves `webServer` through the provider's own context and
  // throws under dsh rc.6. The wire contract the browser half consumes is
  // unchanged; serveRpc implements it.
  const dispatch: ConnectionRpcHandler = async (endpoint, payload, signal) => {
    if (signal?.aborted) return failInternal('aborted')

    switch (endpoint) {
      case 'config/get': {
        return ok(scope.get())
      }

      case 'config/set': {
        if (typeof payload !== 'object' || payload === null) return failBadRequest('payload must be an object')
        const { patch } = payload as { patch?: unknown }
        // The contract sanitizer rejects unknown fields, host-authoritative
        // fields and out-of-range values — loudly, never silently.
        const sanitized = sanitizeSettingsPatch(patch)
        if (!sanitized.ok) return failBadRequest(sanitized.error)
        try {
          await scope.update(sanitized.value)
          return ok(scope.get())
        } catch (error) {
          return failBadRequest(String(error))
        }
      }

      case 'stats/bump': {
        if (typeof payload !== 'object' || payload === null) return failBadRequest('payload must be an object')
        const { count } = payload as { count?: unknown }
        if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 10000) {
          return failBadRequest('count must be an integer in [1, 10000]')
        }
        try {
          const next = (scope.get().counter ?? 0) + count
          await scope.update({ counter: next })
          return ok({ counter: next })
        } catch (error) {
          return failInternal(String(error))
        }
      }

      case 'stats/reset': {
        try {
          await scope.update({ counter: 0 })
          return ok({ counter: 0 })
        } catch (error) {
          return failInternal(String(error))
        }
      }

      case 'skins/scan': {
        try {
          return ok({ roots: scanBongoCat() })
        } catch (error) {
          return failInternal(String(error))
        }
      }

      case 'skins/import': {
        if (typeof payload !== 'object' || payload === null) return failBadRequest('payload must be an object')
        const { path: filePath, data, name } = payload as { path?: unknown; data?: unknown; name?: unknown }
        if (typeof filePath !== 'string' && typeof data !== 'string') return failBadRequest('either path or data is required')
        if (typeof name !== 'string' || name.length === 0) return failBadRequest('name is required')
        const meta = importAsset('skin', typeof filePath === 'string' ? filePath : null, typeof data === 'string' ? data : null, name)
        if (typeof meta === 'string') return failBadRequest(meta)
        try {
          await scope.update({ customSkinRevision: meta.revision })
          return ok({ revision: meta.revision, name: meta.name, ext: meta.ext })
        } catch (error) {
          return failInternal(String(error))
        }
      }

      case 'skins/remove': {
        try {
          removeAsset('skin')
          await scope.update({ customSkinRevision: 0 })
          return ok({ removed: true })
        } catch (error) {
          return failInternal(String(error))
        }
      }

      case 'sounds/import': {
        if (typeof payload !== 'object' || payload === null) return failBadRequest('payload must be an object')
        const { data, name } = payload as { data?: unknown; name?: unknown }
        if (typeof data !== 'string') return failBadRequest('data (base64) is required')
        if (typeof name !== 'string' || name.length === 0) return failBadRequest('name is required')
        const meta = importAsset('sound', null, data, name)
        if (typeof meta === 'string') return failBadRequest(meta)
        try {
          await scope.update({ customSoundRevision: meta.revision })
          return ok({ revision: meta.revision, name: meta.name, ext: meta.ext })
        } catch (error) {
          return failInternal(String(error))
        }
      }

      case 'sounds/remove': {
        try {
          removeAsset('sound')
          await scope.update({ customSoundRevision: 0 })
          return ok({ removed: true })
        } catch (error) {
          return failInternal(String(error))
        }
      }

      case 'info': {
        return ok({
          skin: readSkinMeta() ?? { revision: 0 },
          sound: readSoundMeta() ?? { revision: 0 }
        })
      }

      default:
        return failBadRequest('unknown bongo-cat endpoint "' + endpoint + '"')
    }
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: CHANNEL,
    handler: (req, res) => { void serveRpc(req, res, dispatch) }
  }), 'bongo-cat: rpc channel')

  // ── GET /plugins/bongo-cat/skin?v=<revision> ───────────────────────
  // Serves the imported skin image keyed by revision (immutable caching;
  // stale revisions 404). The browser half builds the URL from the
  // revision stored in the settings namespace.
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/plugins/bongo-cat/skin',
    handler: (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' })
        res.end('method not allowed')
        return
      }
      let revision: number
      try {
        revision = Number(new URL(req.url ?? '/', 'http://bongo-cat.local').searchParams.get('v'))
      } catch {
        revision = Number.NaN
      }
      const meta = readSkinMeta()
      const stale = meta === null || meta.revision === 0
        || !Number.isInteger(revision) || revision !== meta.revision
      const file = meta === null ? '' : join(skinsDir, `skin-${meta.revision}${meta.ext}`)
      if (stale || !existsSync(file)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('not found')
        return
      }
      const size = statSync(file).size
      res.writeHead(200, {
        'Content-Type': IMAGE_CONTENT_TYPES[meta.ext] ?? 'application/octet-stream',
        'Content-Length': String(size),
        'Cache-Control': 'private, max-age=31536000, immutable'
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      createReadStream(file).pipe(res)
    }
  }), 'bongo-cat: skin route')

  // ── GET /plugins/bongo-cat/sound?v=<revision> ──────────────────────
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/plugins/bongo-cat/sound',
    handler: (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' })
        res.end('method not allowed')
        return
      }
      let revision: number
      try {
        revision = Number(new URL(req.url ?? '/', 'http://bongo-cat.local').searchParams.get('v'))
      } catch {
        revision = Number.NaN
      }
      const meta = readSoundMeta()
      const stale = meta === null || meta.revision === 0
        || !Number.isInteger(revision) || revision !== meta.revision
      const file = meta === null ? '' : join(soundsDir, `sound-${meta.revision}${meta.ext}`)
      if (stale || !existsSync(file)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('not found')
        return
      }
      const size = statSync(file).size
      res.writeHead(200, {
        'Content-Type': SOUND_CONTENT_TYPES[meta.ext] ?? 'application/octet-stream',
        'Content-Length': String(size),
        'Cache-Control': 'private, max-age=31536000, immutable'
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      createReadStream(file).pipe(res)
    }
  }), 'bongo-cat: sound route')
}

export const inject = ['settings', 'webServer']
