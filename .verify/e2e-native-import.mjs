/**
 * Manual end-to-end check for native/import: bootstraps a plugin-local
 * venv (pip install UnityPy) and runs the extractor against the real Steam
 * install. Needs network + an installed Bongo Cat, so it is NOT part of
 * `pnpm verify`.
 *
 * Run:  node .verify/e2e-native-import.mjs
 */
import { EventEmitter } from 'node:events'
import { Writable } from 'node:stream'
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DSH_HOME = mkdtempSync(join(tmpdir(), 'dsh-bongo-e2e-'))
process.env.DSH_HOME = DSH_HOME
console.log('DSH_HOME =', DSH_HOME)

// Mirror the real package layout: lib/index.js expects ../tools beside it.
mkdirSync(join(HERE, 'lib'), { recursive: true })
copyFileSync(join(HERE, '..', 'lib', 'index.js'), join(HERE, 'lib', 'index.js'))
cpSync(join(HERE, '..', 'tools'), join(HERE, 'tools'), { recursive: true })
const { apply } = await import('./lib/index.js')

const routes = []
apply({
  webServer: { register: (route) => { routes.push(route) } },
  effect: (fn) => fn(),
  on: () => () => {},
  get: () => ({})
})

function callRpc(method, payload) {
  return new Promise((resolve, reject) => {
    const route = routes.find((r) => r.kind === 'prefix' && r.path === '/bongo-cat')
    const req = new EventEmitter()
    req.method = 'POST'
    req.url = '/bongo-cat/' + method
    req.headers = { 'content-type': 'application/json' }
    req.destroy = () => {}
    const chunks = []
    let head = null
    const res = new Writable({
      write(chunk, _enc, cb) { chunks.push(Buffer.from(chunk)); cb() },
      final(cb) {
        const body = Buffer.concat(chunks).toString('utf8')
        try { resolve({ head, json: JSON.parse(body) }) } catch { resolve({ head, raw: body }) }
        cb()
      }
    })
    res.writeHead = (code, headers) => { head = { code, headers } }
    const originalEnd = res.end.bind(res)
    res.end = (text) => {
      if (typeof text === 'string' && text.length > 0) res.write(text)
      originalEnd()
    }
    try {
      route.handler(req, res)
    } catch (error) {
      reject(error)
      return
    }
    const body = JSON.stringify({ type: 'client-request', rpcId: 'e2e', method, payload })
    process.nextTick(() => {
      req.emit('data', Buffer.from(body))
      req.emit('end')
    })
  })
}

const started = Date.now()
const { head, json } = await callRpc('native/import', {})
console.log('status', head?.code, 'took', Math.round((Date.now() - started) / 1000) + 's')
console.log(JSON.stringify(json)?.slice(0, 600))

const nativeDir = join(DSH_HOME, 'storages', 'bongo-cat', 'native')
console.log('frames:', existsSync(nativeDir) ? readdirSync(nativeDir).join(', ') : '(none)')
const venv = join(DSH_HOME, 'storages', 'bongo-cat', 'pyenv')
console.log('venv:', existsSync(venv) ? 'created' : 'absent')
process.exit(json?.ok === true ? 0 : 1)
