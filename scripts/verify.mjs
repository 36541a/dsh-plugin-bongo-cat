#!/usr/bin/env node
/**
 * Two-tier guard runner (borrowed from dsh-wallpaper-engine's ADR-0004:
 * guards are tiered by WHAT A FAILURE MEANS, not by how important the
 * check feels).
 *
 *   hard tier — `node scripts/verify.mjs` (npm run verify)
 *     A failure here means USERS WILL HIT IT: stale build artifacts,
 *     contract drift between host and browser halves, or a broken
 *     interaction path. Non-zero exit; CI runs this and blocks PRs.
 *
 *   soft tier — `node scripts/verify.mjs soft` (npm run verify:soft)
 *     A failure here means repo hygiene is off: a missing publish file,
 *     an i18n key used but not declared, a missing changelog entry.
 *     It prints ✓/✗ and ALWAYS exits 0 (the real exit code is printed
 *     and exported as DSH_BC_SOFT_EXIT for scripts that care).
 *
 * D3 (from the reference): a check that cannot run in this environment
 * must fail loudly or be explicitly skipped WITH a named reason —
 * silent skips are lost coverage.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const VERIFY_DIR = path.join(ROOT, '.verify')
const mode = process.argv[2] === 'soft' ? 'soft' : 'hard'

let hardFailures = 0
let softFailures = 0
const notes = []

const ok = (label) => console.log(`  ok  ${label}`)
const hardFail = (label, extra = '') => {
  hardFailures += 1
  console.log(`FAIL  ${label}${extra ? ` — ${extra}` : ''}`)
}
const softFail = (label, extra = '') => {
  softFailures += 1
  console.log(`  ✗   ${label}${extra ? ` — ${extra}` : ''}`)
}
const softOk = (label) => console.log(`  ✓   ${label}`)

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* hard tier                                                           */
/* ------------------------------------------------------------------ */

function checkBuildFreshness() {
  const artifacts = [path.join(ROOT, 'lib', 'index.js'), path.join(ROOT, 'lib', 'client.js')]
  if (artifacts.some((f) => !existsSync(f))) {
    hardFail('build artifacts present (lib/index.js, lib/client.js)', 'run pnpm build first')
    return
  }
  const sources = [
    ...walk(path.join(ROOT, 'src')),
    path.join(ROOT, 'scripts', 'build.mjs')
  ]
  const artifactMtime = Math.min(...artifacts.map((f) => statSync(f).mtimeMs))
  const stale = sources.filter((f) => statSync(f).mtimeMs > artifactMtime)
  if (stale.length > 0) {
    hardFail('build artifacts up to date',
      `${stale.length} source file(s) newer than lib/ — run pnpm build (e.g. ${path.relative(ROOT, stale[0])})`)
    return
  }
  ok('build artifacts up to date')
}

function runSmoke(name) {
  const result = spawnSync(process.execPath, [path.join(VERIFY_DIR, name)], {
    cwd: VERIFY_DIR,
    stdio: 'inherit'
  })
  if (result.status !== 0) {
    hardFail(`${name} assertions`)
    return
  }
  ok(`${name} assertions`)
}

function checkContractDrift() {
  // Build the probe first: `.verify/lib/` is gitignored, so a clean checkout
  // (CI) has no probe until something builds it. The smoke tests do that on
  // import, but this check runs before them.
  const built = spawnSync(process.execPath, [path.join(VERIFY_DIR, 'build-contract.mjs')], {
    cwd: VERIFY_DIR,
    stdio: 'inherit'
  })
  if (built.status !== 0) {
    hardFail('contract probe builds', 'esbuild failed on src/shared/settings-contract.ts')
    return
  }
  const probe = path.join(VERIFY_DIR, 'lib', 'contract.js')
  if (!existsSync(probe)) {
    hardFail('contract probe built', 'build-contract.mjs reported success but produced nothing')
    return
  }
  ok('contract probe builds (drift assertions live in host-smoke)')
}

/**
 * CSS-module key guard. `.module.css` exports a name map; JS accesses it by
 * key. A key that does not exist in the stylesheet silently degrades to
 * `undefined` (or, worse, the raw literal via a fallback helper) — the
 * element then has no styling / no animation at all, with zero errors.
 * This caught a real bug: cat.ts asked for `styles.root` while the sheet
 * declared `.bc-root`.
 */
function checkStyleKeys() {
  const pairs = [
    ['src/client/cat.ts', 'src/client/cat.module.css'],
    ['src/client/BongoCatSection.tsx', 'src/client/BongoCatSection.module.css'],
    ['src/client/cosmetics/WardrobePanel.tsx', 'src/client/cosmetics/wardrobe.module.css']
  ]
  const problems = []
  for (const [tsFile, cssFile] of pairs) {
    const ts = readFileSync(path.join(ROOT, tsFile), 'utf8')
    const css = readFileSync(path.join(ROOT, cssFile), 'utf8')
    const declared = new Set([...css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((m) => m[1]))
    const used = new Set([
      ...[...ts.matchAll(/styles\.([A-Za-z0-9_]+)/g)].map((m) => m[1]),
      ...[...ts.matchAll(/styles\['([^']+)'\]/g)].map((m) => m[1]),
      ...[...ts.matchAll(/\bcls\('([^']+)'\)/g)].map((m) => m[1])
    ])
    for (const key of used) {
      if (!declared.has(key)) problems.push(`${path.basename(tsFile)} → ${key}`)
    }
  }
  if (problems.length > 0) {
    hardFail('css-module keys exist', `missing in stylesheet: ${problems.join(', ')}`)
    return
  }
  ok('css-module keys exist (styles.* / cls() all declared)')
}

/* ------------------------------------------------------------------ */
/* soft tier                                                           */
/* ------------------------------------------------------------------ */

function checkPublishSurface() {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const missing = (pkg.files ?? []).filter((entry) => !existsSync(path.join(ROOT, entry)))
  if (missing.length > 0) softFail('publish surface complete', `missing: ${missing.join(', ')}`)
  else softOk('publish surface complete')
}

function checkI18nKeys() {
  const settingsSrc = readFileSync(path.join(ROOT, 'src', 'client', 'settings.ts'), 'utf8')
  const unionBlock = /export type BongoCatKey =\s*([\s\S]*?)\n\n/.exec(settingsSrc)
  if (unionBlock === null) {
    softFail('i18n: BongoCatKey union found')
    return
  }
  const declared = new Set([...unionBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]))

  const consumers = ['BongoCatSection.tsx', 'cat.ts', 'index.tsx']
    .map((f) => readFileSync(path.join(ROOT, 'src', 'client', f), 'utf8'))
    .join('\n')
  const used = new Set([...consumers.matchAll(/\bt\('([^']+)'\)/g)].map((m) => m[1]))
  const undeclared = [...used].filter((key) => !declared.has(key))
  if (undeclared.length > 0) {
    softFail('i18n: used keys are declared', `undeclared: ${undeclared.join(', ')}`)
    return
  }

  // both dictionaries must cover the full union
  const indexSrc = readFileSync(path.join(ROOT, 'src', 'client', 'index.tsx'), 'utf8')
  const dictBlock = (name) => {
    const match = new RegExp(`const ${name}: Record<BongoCatKey, string> = \\{([\\s\\S]*?)\\n\\}`).exec(indexSrc)
    return match === null ? '' : match[1]
  }
  const gaps = []
  for (const dict of ['zh', 'en']) {
    const block = dictBlock(dict)
    for (const key of declared) {
      if (!new RegExp(`\\b${key}:`).test(block)) gaps.push(`${dict}.${key}`)
    }
  }
  if (gaps.length > 0) softFail('i18n: dictionaries complete', `gaps: ${gaps.join(', ')}`)
  else softOk(`i18n: ${declared.size} keys declared, used keys covered, zh/en complete`)
}

function checkChangelog() {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const changelog = readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8')
  if (!changelog.includes(`## ${pkg.version}`)) {
    softFail('changelog has an entry for the current version', `no "## ${pkg.version}" section`)
    return
  }
  softOk(`changelog covers ${pkg.version}`)
}

/* ------------------------------------------------------------------ */
/* run                                                                 */
/* ------------------------------------------------------------------ */

if (mode === 'hard') {
  console.log('— hard tier (user-facing failures) —')
  checkBuildFreshness()
  checkContractDrift()
  checkStyleKeys()
  runSmoke('manifest-smoke.mjs')
  runSmoke('host-smoke.mjs')
  runSmoke('client-smoke.mjs')

  console.log(`\nhard tier: ${hardFailures === 0 ? 'GREEN' : `${hardFailures} FAILURE(S)`}`)
  process.exit(hardFailures === 0 ? 0 : 1)
}

console.log('— soft tier (repo hygiene; never blocks) —')
checkPublishSurface()
checkI18nKeys()
checkChangelog()
notes.push(`soft exit code: ${softFailures}`)
console.log(`\nsoft tier: ${softFailures === 0 ? 'GREEN' : `${softFailures} ISSUE(S)`} (non-blocking)`)
console.log(notes.join('\n'))
process.exit(0)
