/**
 * Manifest / module-graph smoke test for dsh-plugin-bongo-cat.
 *
 * DSH 0.2.0 reads a package's install surface in three places, and each one
 * fails silently-ish when it is wrong:
 *
 *   1. `dsh.bundle.patch`      — the profile launcher loads this patch layer;
 *                                without it the package installs as a plain
 *                                dependency and never activates.
 *   2. `exports["./client"]`   — client-modules resolves the browser bundle
 *                                through this export and throws at boot when
 *                                it is missing.
 *   3. `dsh.client.inject`     — package-name edges rostered into the boot
 *                                graph. A name that no installed package
 *                                provides (0.1.x's dsh-client-runtime is the
 *                                canonical example) is a graph row pointing
 *                                at nothing.
 *
 * On top of that, the built client bundle may only `require()` modules the
 * 0.2.0 module table can resolve: the shell's seed table plus the packages
 * this plugin injects. Anything else throws at materialization time, in the
 * browser, after the page has already booted.
 *
 * Run:  node .verify/manifest-smoke.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

let passed = 0
let failed = 0

const check = (ok, label, detail = '') => {
  if (ok) {
    passed += 1
    console.log(`  ok  ${label}`)
    return
  }
  failed += 1
  console.log(`FAIL  ${label}${detail === '' ? '' : ` — ${detail}`}`)
}

/* ------------------------------------------------------------------ */
/* 1. bundle layer                                                    */
/* ------------------------------------------------------------------ */

check(pkg.dsh?.manifestVersion === 1, 'dsh.manifestVersion is 1', `got ${JSON.stringify(pkg.dsh?.manifestVersion)}`)

const patchRel = pkg.dsh?.bundle?.patch
check(typeof patchRel === 'string' && patchRel.length > 0, 'dsh.bundle.patch is declared', String(patchRel))
check(typeof patchRel === 'string' && existsSync(join(ROOT, patchRel)), 'the declared patch file exists', String(patchRel))

if (typeof patchRel === 'string' && existsSync(join(ROOT, patchRel))) {
  const patch = readFileSync(join(ROOT, patchRel), 'utf8')
  // The launcher applies this file as a loader patch list; the entry we need
  // is an insert row whose module specifier is this package.
  check(/^-\s+insert:/m.test(patch), 'patch declares an insert list')
  check(patch.includes(`name: '${pkg.name}'`) || patch.includes(`name: "${pkg.name}"`), 'patch inserts this package name')
}

/* ------------------------------------------------------------------ */
/* 2. client bundle export                                            */
/* ------------------------------------------------------------------ */

const clientExport = pkg.exports?.['./client']
const clientRel = typeof clientExport === 'string'
  ? clientExport
  : (typeof clientExport === 'object' && typeof clientExport?.default === 'string' ? clientExport.default : undefined)
check(clientRel !== undefined, 'exports["./client"] is a string or {default}', JSON.stringify(clientExport))
check(clientRel !== undefined && existsSync(join(ROOT, clientRel)), 'the exported client bundle exists', String(clientRel))
check(Array.isArray(pkg.files) && clientRel !== undefined && pkg.files.includes(clientRel.replace(/^\.\//, '')),
  'the client bundle ships in package.files')

/* ------------------------------------------------------------------ */
/* 3. dsh.client declaration                                          */
/* ------------------------------------------------------------------ */

check(pkg.dsh?.client?.platform === 'web', 'dsh.client.platform is "web"', String(pkg.dsh?.client?.platform))
check(typeof pkg.dsh?.client?.immediately === 'boolean', 'dsh.client.immediately is a boolean')

const inject = pkg.dsh?.client?.inject
check(Array.isArray(inject) && inject.every((name) => typeof name === 'string' && name.length > 0),
  'dsh.client.inject is a package-name list', JSON.stringify(inject))

// Every injected package must exist: the client-modules roster reads these as
// graph edges, and a ghost name (a package deleted on the 0.2.0 line) is a row
// pointing at nothing.
for (const name of Array.isArray(inject) ? inject : []) {
  const manifest = join(ROOT, 'node_modules', name, 'package.json')
  check(existsSync(manifest), `injected package ${name} is installed`)
}

/* ------------------------------------------------------------------ */
/* 4. module-table purity of the built bundle                          */
/* ------------------------------------------------------------------ */

/** Module table seed of the DSH 0.2.0 web shell (staticModules). */
const SEED_MODULES = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit'
])

if (clientRel !== undefined && existsSync(join(ROOT, clientRel))) {
  const bundle = readFileSync(join(ROOT, clientRel), 'utf8')
  check(bundle.includes('window.__ModuleLoader__.load({'), 'client bundle uses the __ModuleLoader__ registration protocol')
  check(bundle.includes(`id: "${pkg.name}"`), 'client bundle registers under the package name', pkg.name)

  const required = new Set([...bundle.matchAll(/\brequire\("([^"]+)"\)/g)].map((match) => match[1]))
  const resolvable = new Set([...SEED_MODULES, ...(Array.isArray(inject) ? inject : [])])
  const unresolvable = [...required].filter((spec) => !resolvable.has(spec) && !resolvable.has(spec.replace(/\/client$/, '')))
  check(unresolvable.length === 0, 'every require() resolves through the 0.2.0 module table',
    unresolvable.length === 0 ? '' : unresolvable.join(', '))
  console.log(`       requires: ${required.size === 0 ? '(none)' : [...required].sort().join(', ')}`)
}

/* ------------------------------------------------------------------ */
/* 5. compatibility declaration                                        */
/* ------------------------------------------------------------------ */

// `engines` is informational to the launcher, but it is the only machine
// readable statement of which kernel lines this build was verified against:
// 0.2.0-rc.2 is the primary target, 0.1.1-rc.2 boots the same bundle. This is
// a smoke check, not a semver solver — it asserts the declared interval still
// starts at or below 0.2.0 and still pins an upper bound of 0.3.0, so the
// range can neither lock out the target line nor silently widen to 0.3+.
const dshEngine = pkg.engines?.dsh
check(typeof dshEngine === 'string' && dshEngine.length > 0, 'engines.dsh declares the supported kernel line', String(dshEngine))
const engineFloor = /^>=([^\s]+)\s+<(\d+\.\d+\.\d+)$/.exec(dshEngine ?? '')
check(engineFloor !== null && engineFloor[2] === '0.3.0' && engineFloor[1] <= '0.2.0',
  'engines.dsh admits the verified 0.1.1/0.2.x lines and stops at 0.3.0', String(dshEngine))

// Both halves are self-contained (host: node: builtins only, browser: seed
// modules only), so a peerDependency would never be satisfied by a profile —
// pnpm reports "missing peer" on a perfectly working install. `dsh.client`
// inject covers the graph edges; nothing needs a peer.
const peers = Object.keys(pkg.peerDependencies ?? {})
check(peers.length === 0, 'no peerDependencies (the profile cannot satisfy them)', peers.join(', '))

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
