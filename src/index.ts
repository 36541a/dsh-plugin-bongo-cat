/**
 * dsh-plugin-bongo-cat — host half.
 *
 * Provides, for the Web profile composition:
 *  - a self-contained settings store at $DSH_HOME/storages/bongo-cat/
 *    settings.json (defaults and validation come from the shared
 *    contract; the browser reads and writes it through config/get and
 *    config/set). It deliberately does NOT use ctx.settings: DSH 0.2.x
 *    removed ctx.settings.register, and 0.1.x never exposed third-party
 *    namespaces on the settings wire — owning the file works on both.
 *  - the /bongo-cat channel (config/get, config/set, stats/bump,
 *    stats/reset, skins/scan, skins/import, skins/remove,
 *    sounds/import, sounds/remove, native/status, native/import,
 *    native/remove, info), mounted as a Host-webserver prefix route that
 *    speaks the generic Connection RPC envelope itself (see serveRpc).
 *  - the GET /plugins/bongo-cat/skin?v=<revision> route serving an
 *    imported skin image with revision-based cache busting,
 *  - the GET /plugins/bongo-cat/sound?v=<revision> route serving an
 *    imported .wav sound the same way,
 *  - the GET /plugins/bongo-cat/native/<frame>.png route serving the
 *    frames extracted from the user's own Steam install.
 *
 * Storage layout ($DSH_HOME/storages/bongo-cat):
 *   settings.json                 resolved settings (contract defaults + patch)
 *   skins/skin-<revision>.<ext>   the last imported skin image
 *   skins/skin.json               { revision, name, source, ext, updatedAt }
 *   sounds/sound-<revision>.<ext> the last imported sound
 *   sounds/sound.json             { revision, name, updatedAt }
 *   native/{idle,tap-left,tap-right}.png + native.json  (extractor output)
 *   pyenv/                        plugin-local venv used by the extractor
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
import type { Dirent } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve, extname, basename } from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'

// Type-only imports keep the ctx.webServer service augmentation active and
// pin the wire shapes this plugin hand-implements. Both packages exist on the
// 0.2.x line; ctx.settings is deliberately unused (0.2.0 removed its register
// API, and 0.1.x never exposed third-party namespaces on the settings wire).
import type { ConnectionRpcHandler, ConnectionRpcHandlerResult } from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'

// The settings contract is the single source of truth for keys, defaults
// and ranges (see src/shared/settings-contract.ts). The store below only
// merges + validates against it; there is no second schema.
import {
  SETTINGS_DEFAULTS,
  sanitizeSettingsPatch,
  type BongoCatSettings
} from './shared/settings-contract'
import { pruneWidgets } from './shared/widgets'
import {
  COSMETIC_SLOTS,
  type CosmeticCatalog, type CosmeticItem,
  TAPS_PER_ITEM, autoGrantItems, emptyEquipped,
  legacyItemFor, pickStarterItems, reconcileWardrobe, sanitizeWardrobe
} from './shared/cosmetics'

export const name = 'bongo-cat'

/** Bongo Cat's Steam app id (used to locate Workshop content). */
const BONGO_CAT_APPID = '1337970'

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

/**
 * Endpoints that write into the plugin's storage (file copies and deletes).
 *
 * The README promises these are reachable from this machine only. That has to
 * be enforced here: the browser half merely disables its buttons when
 * `connection.isLoopback` is false, which stops nobody with curl. Everything
 * that only edits the settings document (config/*, stats/*) stays callable —
 * it is what the floating pet itself writes.
 */
const LOOPBACK_ONLY_ENDPOINTS = new Set([
  'skins/import',
  'skins/remove',
  'sounds/import',
  'sounds/remove',
  'native/import',
  'native/remove'
])

/** True only for an address the OS reports for the local machine. */
function isLoopbackAddress(address: string | undefined): boolean {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

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

/** `POST ${CHANNEL}/${endpoint}` → endpoint, or undefined when the path is not ours. */
function endpointOf(pathname: string): string | undefined {
  if (!pathname.startsWith(`${CHANNEL}/`)) return undefined
  const endpoint = pathname.slice(CHANNEL.length + 1)
  if (endpoint.split('/').some((segment) => segment === '' || segment === '.' || segment === '..' || !ENDPOINT_SEGMENT_PATTERN.test(segment))) return undefined
  return endpoint
}

/**
 * The dispatch signature this plugin owns.
 *
 * DSH 0.2.0 widened the registry handler with a trailing `peer: PeerScope`
 * argument (`ConnectionRpcHandler`). This plugin serves its own prefix route
 * instead of registering with `ctx.connection.rpc.handle()`, so no peer is
 * ever handed to it — the transport-admission facts stay with the carrier.
 * A three-parameter function remains assignable to the 0.2.0 handler type
 * (TypeScript allows dropping trailing parameters), which is what
 * {@link HANDLER_CONTRACT} asserts at compile time.
 */
type RpcDispatch = (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<ConnectionRpcHandlerResult>

/** Collect a node request body as UTF-8 text, refusing oversized payloads. */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    req.on('data', (chunk: Buffer) => {
      if (settled) return
      size += chunk.length
      if (size > MAX_RPC_BODY_BYTES) {
        // Do not destroy the socket here: the caller still has to write 413.
        // Destruction wins the race against the response and the browser only
        // sees ECONNRESET, which reads as "server crashed" instead of "too big".
        settled = true
        rejectBody(Object.assign(new Error('request body is too large'), { code: 'body-too-large' }))
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => { if (!settled) resolveBody(Buffer.concat(chunks).toString('utf8')) })
    req.on('error', (error) => { if (!settled) rejectBody(error) })
  })
}

/** Write a server-response envelope; rpcId must echo the caller's id. */
function respond(res: ServerResponse, rpcId: string, result: HandlerResult): void {
  const text = JSON.stringify({ type: 'server-response', rpcId, result })
  res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(text)) })
  res.end(text)
}

/**
 * Stat an asset path and answer 404 unless it is a regular file.
 *
 * `existsSync` alone lets a *directory* squatting on the asset name through
 * (and, on Windows, a locked file whose content cannot be opened). Answering
 * before the read keeps the failure at the HTTP layer instead of the stream.
 *
 * @returns the file size, or undefined when the caller should stop.
 */
function assetSize(res: ServerResponse, file: string): number | undefined {
  let stat
  try {
    stat = statSync(file)
  } catch {
    stat = undefined
  }
  if (stat === undefined || !stat.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('not found')
    return undefined
  }
  return stat.size
}

/**
 * Stream one regular file into a response whose headers are already written.
 *
 * `stream.pipe(res)` never subscribes to the source's `error` event, and an
 * unhandled 'error' on a ReadStream is an *uncaught exception* — a directory on
 * the asset path, an ACL denial, or a share dropping between `statSync` and
 * `open()` used to take the whole harness process down. Answer 500 while the
 * headers are still unsent and simply close the response otherwise.
 */
function pipeFile(res: ServerResponse, file: string): void {
  const stream = createReadStream(file)
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('asset read failed')
  })
  stream.pipe(res)
}

/**
 * Serve one generic Connection RPC exchange over the node req/res pair the
 * Host webserver hands to a prefix route.
 *
 * This mirrors dsh-client-connection's own RPC carrier, so the browser half's
 * `connection.rpc.call(CHANNEL, endpoint, payload)` keeps working unchanged on
 * the 0.2.0 wire: POST `<channel>/<endpoint>` + application/json in,
 * `{type:'server-response', rpcId, result}` out, with rpcId echoed verbatim.
 */
async function serveRpc(req: IncomingMessage, res: ServerResponse, dispatch: RpcDispatch): Promise<void> {
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
  } catch (error) {
    if ((error as { code?: unknown }).code === 'body-too-large') {
      req.resume()
      res.writeHead(413, { 'Content-Type': 'text/plain', Connection: 'close' })
      res.end('request body is too large')
      return
    }
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
  if (LOOPBACK_ONLY_ENDPOINTS.has(endpoint) && !isLoopbackAddress(req.socket.remoteAddress)) {
    respond(res, rpcId, failForbidden(`endpoint "${endpoint}" is available from this machine only`))
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
type HandlerResult = ConnectionRpcHandlerResult

/** Compile-time "A is assignable to B" assertion (no runtime footprint). */
type Assignable<A extends B, B> = A

/**
 * Contract guard for DSH 0.2.0.
 *
 * The kernel's `ConnectionRpcHandler` gained a trailing `peer` argument in
 * 0.2.0; a three-parameter dispatch stays assignable to it. If a future kernel
 * line changes the shape in a way this plugin no longer satisfies (a new
 * required argument before `signal`, a different result type, a renamed
 * endpoint payload), the alias below stops compiling and `pnpm typecheck`
 * fails here instead of a user hitting it at runtime.
 */
type _RpcDispatchMatchesKernel = Assignable<RpcDispatch, ConnectionRpcHandler>

function ok<T>(value: T): HandlerResult {
  return { ok: true, value }
}

function failBadRequest(message: string): HandlerResult {
  return { ok: false, error: { code: 'bad-request', message, details: { issues: [] } } }
}

function failInternal(message: string): HandlerResult {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

function failForbidden(message: string): HandlerResult {
  return { ok: false, error: { code: 'forbidden', message, details: {} } }
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
    let entries: Dirent[]
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
        let entries: Dirent[]
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
  const nativeDir = join(dir, 'native')
  const cosmeticsDir = join(nativeDir, 'cosmetics')
  const cosmeticsCatalogPath = join(cosmeticsDir, 'catalog.json')
  const skinMetaPath = join(skinsDir, 'skin.json')
  const soundMetaPath = join(soundsDir, 'sound.json')
  mkdirSync(skinsDir, { recursive: true })
  mkdirSync(soundsDir, { recursive: true })

  /** The extracted Steam item catalogue (see tools/extract-native.py). */
  let cosmeticsCache: CosmeticCatalog | null = null
  const readCosmeticsCatalog = (): CosmeticCatalog => {
    if (cosmeticsCache !== null) return cosmeticsCache
    const raw = readJson<{ items?: unknown; stamp?: unknown; size?: unknown; rectSpace?: unknown }>(cosmeticsCatalogPath)
    const items: CosmeticItem[] = []
    if (raw !== null && Array.isArray(raw.items)) {
      for (const entry of raw.items) {
        if (typeof entry !== 'object' || entry === null) continue
        const row = entry as Record<string, unknown>
        const { id, name, slot, layer, rarity } = row
        if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) continue
        if (typeof name !== 'string' || name.length === 0) continue
        if (slot !== 'hat' && slot !== 'face' && slot !== 'back' && slot !== 'accessory') continue
        const rect = Array.isArray(row.rect) && row.rect.length === 4 && row.rect.every((value) => typeof value === 'number' && Number.isFinite(value))
          ? [row.rect[0], row.rect[1], row.rect[2], row.rect[3]] as [number, number, number, number]
          : undefined
        items.push({
          id,
          name,
          slot,
          layer: layer === 'back' ? 'back' : 'front',
          rarity: rarity === 3 ? 3 : rarity === 2 ? 2 : 1,
          ...(rect === undefined ? {} : { rect })
        })
      }
    }
    const stamp = raw !== null && typeof raw.stamp === 'string' ? raw.stamp : ''
    const size = raw !== null && Array.isArray(raw.size) && raw.size.length === 2 && raw.size.every((value) => typeof value === 'number' && Number.isFinite(value))
      ? [raw.size[0], raw.size[1]] as [number, number]
      : [777, 504] as [number, number]
    const rectSpace = raw !== null && raw.rectSpace === 'canvas' ? 'canvas' as const : 'box' as const
    cosmeticsCache = { stamp, rectSpace, size, items }
    return cosmeticsCache
  }

  /** Extracted original-artwork frames (see tools/extract-native.py). */
  const NATIVE_FRAMES = ['idle', 'tap-left', 'tap-right'] as const
  const NATIVE_CONTENT_TYPES: Record<string, string> = { '.png': 'image/png' }
  const extractorPath = fileURLToPath(new URL('../tools/extract-native.py', import.meta.url))

  /** One extraction at a time: the extractor rewrites native/ in place. */
  let nativeImporting = false

  const readNativeMeta = (): {
    available: boolean
    skin?: string
    size?: number[]
    /** Crop box of the frames inside the full canvas: [left, top, right, bottom]. */
    box?: number[]
    extractedAt?: string
    gameDir?: string
    missing?: string
  } => {
    const meta = readJson<Record<string, unknown>>(join(nativeDir, 'native.json'))
    const missing = NATIVE_FRAMES.filter((frame) => !existsSync(join(nativeDir, `${frame}.png`)))
    if (meta === null || missing.length > 0) {
      return { available: false, ...(missing.length > 0 ? { missing: missing.join(', ') } : {}) }
    }
    return {
      available: true,
      skin: typeof meta.skin === 'string' ? meta.skin : undefined,
      size: Array.isArray(meta.size) ? (meta.size as number[]) : undefined,
      box: Array.isArray(meta.box) && meta.box.length === 4 && meta.box.every((value) => typeof value === 'number')
        ? (meta.box as number[])
        : undefined,
      extractedAt: typeof meta.extractedAt === 'string' ? meta.extractedAt : undefined,
      gameDir: typeof meta.gameDir === 'string' ? meta.gameDir : undefined
    }
  }

  /** Run a command, collecting stdout/stderr; never throws. */
  const runCommand = (command: string, args: string[], timeoutMs: number): Promise<{ status: number | null; out: string }> => {
    return new Promise((resolveRun) => {
      let child: ReturnType<typeof spawn>
      // Windows raises ENOEXEC/UNKNOWN *synchronously* for a non-executable
      // image (a truncated or swapped interpreter, an antivirus block), so
      // spawn() can throw before any listener is attached. Without this catch
      // the rejection escaped the RPC handler and surfaced as a bare HTTP 500.
      try {
        child = spawn(command, args, { windowsHide: true })
      } catch (error) {
        resolveRun({ status: -1, out: String(error) })
        return
      }
      let out = ''
      const timer = setTimeout(() => { child.kill() }, timeoutMs)
      child.stdout?.on('data', (chunk: Buffer) => { out += chunk.toString('utf8') })
      child.stderr?.on('data', (chunk: Buffer) => { out += chunk.toString('utf8') })
      child.on('error', (error) => {
        clearTimeout(timer)
        resolveRun({ status: -1, out: String(error) })
      })
      child.on('close', (status) => {
        clearTimeout(timer)
        resolveRun({ status, out })
      })
    })
  }

  /** Find a Python that can import UnityPy (Pillow ships with it). */
  const VENV_DIR = join(dir, 'pyenv')
  const venvPython = process.platform === 'win32'
    ? join(VENV_DIR, 'Scripts', 'python.exe')
    : join(VENV_DIR, 'bin', 'python')

  /** Interpreter candidates, each with the args needed before `-c`/`-m`. */
  const pythonCandidates = (): Array<{ cmd: string; prefix: string[] }> => {
    const list: Array<{ cmd: string; prefix: string[] }> = []
    if (process.env.DSH_BC_PYTHON) list.push({ cmd: process.env.DSH_BC_PYTHON, prefix: [] })
    list.push({ cmd: 'python', prefix: [] }, { cmd: 'python3', prefix: [] }, { cmd: 'py', prefix: ['-3'] })

    const globDirs = (root: string | undefined, pattern: RegExp): void => {
      if (!root) return
      try {
        for (const entry of readdirSync(root)) {
          if (!pattern.test(entry)) continue
          const candidate = join(root, entry, process.platform === 'win32' ? 'python.exe' : 'bin/python3')
          if (existsSync(candidate)) list.push({ cmd: candidate, prefix: [] })
        }
      } catch { /* missing dir is fine */ }
    }
    globDirs(process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'Python') : undefined, /^Python3/i)
    globDirs(process.env.PROGRAMFILES ? join(process.env.PROGRAMFILES) : undefined, /^Python3/i)
    globDirs(join(homedir(), '.workbuddy', 'binaries', 'python', 'versions'), /^\d+\.\d+\.\d+$/i)
    return list
  }

  const probeUnityPy = async (cmd: string, prefix: string[]): Promise<boolean> => {
    const result = await runCommand(cmd, [...prefix, '-c', 'import UnityPy, PIL; print("ok")'], 20000)
    return result.status === 0 && result.out.includes('ok')
  }

  /**
   * Discard the plugin-local venv before rebuilding it. The delete itself can
   * fail — Windows keeps `python.exe` locked while a probe is still tearing
   * down, an antivirus/policy shim may refuse a bulk delete, a read-only parent
   * makes rmdir fail — and none of that may escape as an uncaught exception.
   *
   * @returns whether the directory is gone.
   */
  const discardVenv = (): boolean => {
    try {
      rmSync(VENV_DIR, { recursive: true, force: true })
      return true
    } catch {
      return false
    }
  }

  /**
   * Resolve a Python that can run the extractor, bootstrapping a plugin-local
   * venv when the interpreter lacks UnityPy. The venv lives next to the
   * plugin's data, so the user's global Python stays untouched.
   *
   * The venv is *probed*, not trusted: `existsSync(python.exe)` is true for a
   * half-built venv, a truncated interpreter, or an antivirus quarantine, and
   * the old early return made every later import fail with the same opaque
   * error until the user deleted the directory by hand. A venv that cannot
   * import UnityPy is rebuilt. The probe runs on every import (a few hundred
   * ms against an extraction that takes seconds) rather than being cached:
   * a cached "it worked once" is exactly how an interpreter swap stays
   * invisible until the process restarts.
   */
  const resolvePython = async (): Promise<{ python: string } | { error: string }> => {
    if (existsSync(venvPython)) {
      if (await probeUnityPy(venvPython, [])) return { python: venvPython }
      if (!discardVenv()) {
        return { error: `插件私有 Python 环境已损坏，且无法自动清理（${VENV_DIR}）。请手动删除该目录后重试。` }
      }
    }

    for (const { cmd, prefix } of pythonCandidates()) {
      if (await probeUnityPy(cmd, prefix)) return { python: cmd }
    }

    // No interpreter has UnityPy yet — find any working Python and build a venv.
    for (const { cmd, prefix } of pythonCandidates()) {
      const version = await runCommand(cmd, [...prefix, '-c', 'import sys; print(sys.version_info[0])'], 20000)
      if (version.status !== 0 || !version.out.includes('3')) continue

      const created = await runCommand(cmd, [...prefix, '-m', 'venv', VENV_DIR], 180000)
      if (created.status !== 0 || !existsSync(venvPython)) continue

      const pip = await runCommand(venvPython, ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', 'UnityPy'], 420000)
      if (pip.status === 0 && await probeUnityPy(venvPython, [])) return { python: venvPython }
      discardVenv()
      return { error: `安装 UnityPy 失败：${pip.out.slice(-500) || `exit ${pip.status}`}` }
    }
    return { error: '未找到 Python 3.10+。请安装 Python（勾选 Add to PATH）后重试，或用 DSH_BC_PYTHON 指定解释器。' }
  }

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

  // ── settings store (self-contained, version-proof) ────────────────
  // DSH 0.2.x removed ctx.settings.register, and 0.1.x never exposed
  // third-party namespaces on the settings wire anyway. Owning the file
  // keeps the same code path on every kernel version and makes the
  // browser's config/get + config/set the only interface.
  const settingsPath = join(dir, 'settings.json')
  let settingsCache: BongoCatSettings | null = null
  let writeChain: Promise<void> = Promise.resolve()

  /** Read on-disk settings and coerce them onto the contract defaults. */
  const loadSettings = (): BongoCatSettings => {
    let stored: Record<string, unknown> = {}
    try {
      const raw = JSON.parse(readFileSync(settingsPath, 'utf8')) as unknown
      if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) stored = raw as Record<string, unknown>
    } catch {
      // first run (no file) or a hand-edited broken file — defaults win
    }
    const next: Record<string, unknown> = { ...SETTINGS_DEFAULTS }
    for (const [key, value] of Object.entries(stored)) {
      const fallback = (SETTINGS_DEFAULTS as Record<string, unknown>)[key]
      if (fallback === undefined || typeof value !== typeof fallback) continue
      if (typeof value === 'number' && !Number.isFinite(value)) continue
      next[key] = value
    }
    // A widget type can be retired between versions; drop those instances so
    // the dock never renders a card whose definition is gone.
    next.widgets = pruneWidgets(next.widgets)
    // The wardrobe moves onto the extracted Steam catalogue the first time one
    // exists: legacy sticker ids map onto the closest real item (progress is
    // kept, never dropped), an unknown file starts from the starter picks, and
    // the result is reconciled so nothing references a missing id. Then the
    // document is normalised so a hand-edited file cannot inject junk.
    const wardrobe = sanitizeWardrobe(stored.wardrobe)
    if (wardrobe.ok) {
      const cosmetics = readCosmeticsCatalog()
      let value = wardrobe.value
      if (cosmetics.items.length > 0) {
        const known = new Set(cosmetics.items.map((item) => item.id))
        const owned: Record<string, number> = {}
        // old id → catalogue id. Mapping the *worn* ids through the same table
        // keeps an outfit intact across the migration; the old code wiped every
        // equipped slot as soon as one unknown id showed up.
        const remap = new Map<string, string>()
        for (const [oldId, count] of Object.entries(value.owned)) {
          const mapped = legacyItemFor(cosmetics.items, oldId)?.id ?? oldId
          if (!known.has(mapped)) continue
          remap.set(oldId, mapped)
          owned[mapped] = Math.min(999, (owned[mapped] ?? 0) + count)
        }
        const equipped = emptyEquipped()
        for (const slot of COSMETIC_SLOTS) {
          const worn = value.equipped[slot]
          if (worn === null) continue
          equipped[slot] = remap.get(worn) ?? worn
        }
        if (Object.keys(owned).length === 0) {
          for (const id of pickStarterItems(cosmetics.items)) owned[id] = 1
        }
        // reconcileWardrobe clears whatever the catalogue or `owned` no longer
        // backs, one slot at a time.
        value = reconcileWardrobe({ ...value, owned, equipped }, cosmetics.items)
      }
      next.wardrobe = value
    }
    // First run after the upgrade: the lifetime total starts from the balance
    // the profile already carries, so the counter never jumps backwards.
    if (typeof stored.lifetimeTaps !== 'number' && typeof next.counter === 'number') {
      next.lifetimeTaps = next.counter
    }
    // `skin` used to be a built-in art id ("classic", ...). It now holds a
    // Steam sprite prefix, so a stale value would make every re-extract fail
    // with "sprites missing for skin 'classic'". Anything the catalog does not
    // know falls back to the default cat.
    const catalog = readJson<{ skins?: Array<{ name?: unknown }> }>(join(dir, 'native', 'skins.json'))
    const known = (catalog?.skins ?? [])
      .map((item) => item.name)
      .filter((name): name is string => typeof name === 'string')
    if (known.length > 0 && !known.includes(next.skin as string)) {
      next.skin = SETTINGS_DEFAULTS.skin
    }
    return next as BongoCatSettings
  }

  const persistSettings = (next: BongoCatSettings): Promise<void> => {
    settingsCache = next
    const payload = JSON.stringify(next, null, 2)
    // One write chain: two concurrent config/set calls must not lose an update.
    // The chain itself stays resolved (a failed write must not poison every
    // later one), but the failure is carried out to *this* caller: swallowing
    // it made config/set answer ok while the file still held the old document.
    let failure: unknown = null
    writeChain = writeChain.then(() => {
      const tmp = settingsPath + '.tmp'
      writeFileSync(tmp, payload, 'utf8')
      renameSync(tmp, settingsPath)
    }).catch((error) => { failure = error })
    return writeChain.then(() => {
      if (failure !== null) throw failure instanceof Error ? failure : new Error(String(failure))
    })
  }

  const scope = {
    get: (): BongoCatSettings => {
      if (settingsCache === null) settingsCache = loadSettings()
      return settingsCache
    },
    update: async (patch: Partial<BongoCatSettings>): Promise<void> => {
      await persistSettings({ ...scope.get(), ...patch })
    }
  }

  /**
   * Settle taps that accrued while no browser page was open: the balance is
   * host-authoritative, so the automatic drop must fire here too, not only in
   * stats/bump. One pass at activation is enough — stats/bump keeps it going.
   */
  const settlePendingDrops = async (): Promise<void> => {
    try {
      const current = scope.get()
      if ((current.counter ?? 0) < TAPS_PER_ITEM) return
      const settled = autoGrantItems(current.wardrobe, current.counter, readCosmeticsCatalog().items)
      if (settled.granted.length === 0) return
      await scope.update({ counter: settled.counter, wardrobe: settled.state })
    } catch {
      // a broken wardrobe file must never keep the host from booting
    }
  }
  void settlePendingDrops()

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

    // Order matters: the bytes must be in place *before* the metadata points at
    // them. Writing meta first meant a failed rename left the record pointing at
    // a file that never appeared, so the previously working asset disappeared
    // from every route until the user re-imported (and rebumped the revision).
    try {
      writeFileSync(target + '.tmp', buffer)
      renameSync(target + '.tmp', target)
    } catch (error) {
      rmSync(target + '.tmp', { force: true })
      return failText(error)
    }
    try {
      // The metadata write is itself atomic (tmp + rename), so a crash here
      // leaves the old record — and the old revision — fully intact.
      writeFileSync(metaPath + '.tmp', JSON.stringify(meta))
      renameSync(metaPath + '.tmp', metaPath)
    } catch (error) {
      rmSync(metaPath + '.tmp', { force: true })
      rmSync(target, { force: true })
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
  // `ctx.connection.rpc.handle()`, which on the 0.1.x line resolved
  // `webServer` through the provider's own context and threw. The 0.2.0 web
  // carrier POSTs `/<channel>/<endpoint>` with a plain JSON envelope and adds
  // no admission headers, so this route speaks the same wire contract the
  // browser half's `connection.rpc.call()` expects (see serveRpc).
  const dispatch: RpcDispatch = async (endpoint, payload, signal) => {
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
          const current = scope.get()
          const lifetime = (current.lifetimeTaps ?? 0) + count
          const settled = autoGrantItems(current.wardrobe, (current.counter ?? 0) + count, readCosmeticsCatalog().items)
          await scope.update({ counter: settled.counter, lifetimeTaps: lifetime, wardrobe: settled.state })
          return ok({ counter: settled.counter, lifetimeTaps: lifetime, granted: settled.granted, wardrobe: settled.state })
        } catch (error) {
          return failInternal(String(error))
        }
      }

      case 'stats/reset': {
        try {
          await scope.update({ counter: 0, lifetimeTaps: 0 })
          return ok({ counter: 0, lifetimeTaps: 0 })
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

      case 'native/status': {
        return ok(readNativeMeta())
      }

      case 'native/catalog': {
        const catalog = readJson<{ skins?: Array<{ name?: unknown }> }>(join(nativeDir, 'skins.json'))
        const skins = (catalog?.skins ?? [])
          .map((entry) => (typeof entry?.name === 'string' ? entry.name : ''))
          .filter((name) => name.length > 0)
        return ok({
          skins,
          current: scope.get().skin,
          stamp: readNativeMeta().extractedAt ?? '',
          available: readNativeMeta().available
        })
      }

      case 'native/import': {
        if (!existsSync(extractorPath)) {
          return failInternal(`extractor not found at ${extractorPath}`)
        }
        // The extractor rewrites native/ in place; two concurrent runs would
        // interleave frames from different skins and the later writer would
        // silently win. The UI disables its buttons while busy, but the wire
        // accepts anything, so the exclusion belongs here.
        if (nativeImporting) return failBadRequest('extraction already running, try again when it finishes')
        nativeImporting = true
        try {
          const python = await resolvePython()
          if ('error' in python) {
            return failBadRequest(python.error)
          }
          const requested = (typeof payload === 'object' && payload !== null ? (payload as { skin?: unknown }).skin : undefined)
          const skin = typeof requested === 'string' && /^[A-Za-z0-9.]{1,64}$/.test(requested) ? requested : null
          const args = [extractorPath, '--out', nativeDir]
          if (skin !== null) args.push('--skin', skin)
          const result = await runCommand(python.python, args, 300000)
          if (result.status !== 0) {
            return failBadRequest(`提取失败：${result.out.slice(-600) || `exit ${result.status}`}`)
          }
          // First successful import also builds the icon catalog for the picker.
          if (!existsSync(join(nativeDir, 'skins.json'))) {
            await runCommand(python.python, [extractorPath, '--catalog', '--out', nativeDir], 300000)
          }
          if (skin !== null) await scope.update({ skin })
          const meta = readNativeMeta()
          if (!meta.available) return failInternal('提取脚本已运行，但未产出完整帧')
          return ok(meta)
        } finally {
          nativeImporting = false
          cosmeticsCache = null
        }
      }

      case 'native/remove': {
        try {
          rmSync(nativeDir, { recursive: true, force: true })
          cosmeticsCache = null
          return ok({ removed: true })
        } catch (error) {
          return failInternal(String(error))
        }
      }

      case 'cosmetics/catalog': {
        const catalog = readCosmeticsCatalog()
        return ok({ stamp: catalog.stamp, rectSpace: catalog.rectSpace, size: catalog.size, items: catalog.items })
      }

      case 'info': {
        return ok({
          skin: readSkinMeta() ?? { revision: 0 },
          sound: readSoundMeta() ?? { revision: 0 },
          native: readNativeMeta()
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
      if (stale) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('not found')
        return
      }
      const size = assetSize(res, file)
      if (size === undefined) return
      res.writeHead(200, {
        'Content-Type': IMAGE_CONTENT_TYPES[meta.ext] ?? 'application/octet-stream',
        'Content-Length': String(size),
        'Cache-Control': 'private, max-age=31536000, immutable'
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      pipeFile(res, file)
    }
  }), 'bongo-cat: skin route')

  // ── GET /plugins/bongo-cat/sound?v=<revision> ──────────────────────
  // ── GET /plugins/bongo-cat/native/<frame>.png?v=<stamp> ────────────
  // Serves the extracted original artwork (see tools/extract-native.py).
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/plugins/bongo-cat/native',
    handler: (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' })
        res.end('method not allowed')
        return
      }
      let pathname: string
      try {
        pathname = new URL(req.url ?? '/', 'http://bongo-cat.local').pathname
      } catch {
        pathname = ''
      }
      const match = /^\/plugins\/bongo-cat\/native\/([a-z-]+)\.png$/.exec(pathname)
      const iconMatch = /^\/plugins\/bongo-cat\/native\/icons\/([A-Za-z0-9.]+)\.png$/.exec(pathname)
      if (iconMatch !== null) {
        const file = join(nativeDir, 'icons', `${iconMatch[1]}.png`)
        const iconSize = assetSize(res, file)
        if (iconSize === undefined) return
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': String(iconSize),
          'Cache-Control': 'private, max-age=31536000, immutable'
        })
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        pipeFile(res, file)
        return
      }
      const frame = match === null ? '' : match[1]
      if (!(NATIVE_FRAMES as readonly string[]).includes(frame)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('not found')
        return
      }
      const file = join(nativeDir, `${frame}.png`)
      const size = assetSize(res, file)
      if (size === undefined) return
      res.writeHead(200, {
        'Content-Type': NATIVE_CONTENT_TYPES['.png'],
        'Content-Length': String(size),
        'Cache-Control': 'private, max-age=31536000, immutable'
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      pipeFile(res, file)
    }
  }), 'bongo-cat: native frame route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/plugins/bongo-cat/cosmetic',
    handler: (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain' })
        res.end('method not allowed')
        return
      }
      let pathname: string
      try {
        pathname = new URL(req.url ?? '/', 'http://bongo-cat.local').pathname
      } catch {
        pathname = ''
      }
      const prefix = '/plugins/bongo-cat/cosmetic/'
      const match = /^\/plugins\/bongo-cat\/cosmetic\/([a-z0-9][a-z0-9-]{0,63})(?:\.icon)?\.png$/.exec(pathname)
      if (match === null || !pathname.startsWith(prefix)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('not found')
        return
      }
      const file = join(cosmeticsDir, pathname.slice(prefix.length))
      const size = assetSize(res, file)
      if (size === undefined) return
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': String(size),
        'Cache-Control': 'private, max-age=31536000, immutable'
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      pipeFile(res, file)
    }
  }), 'bongo-cat: cosmetic asset route')

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
      if (stale) {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('not found')
        return
      }
      const size = assetSize(res, file)
      if (size === undefined) return
      res.writeHead(200, {
        'Content-Type': SOUND_CONTENT_TYPES[meta.ext] ?? 'application/octet-stream',
        'Content-Length': String(size),
        'Cache-Control': 'private, max-age=31536000, immutable'
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      pipeFile(res, file)
    }
  }), 'bongo-cat: sound route')
}

export const inject = ['webServer']
