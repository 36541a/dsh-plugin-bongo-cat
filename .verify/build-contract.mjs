/**
 * Build the settings-contract probe for the smoke tests.
 *
 * The contract (src/shared/settings-contract.ts) is TypeScript; the smoke
 * tests are plain node scripts, so this bundles the contract to
 * .verify/lib/contract.js. Both smoke tests import this module first,
 * which makes the build a side effect — the probe is always fresh.
 *
 * The probe exists so the tests can assert the anti-drift invariant from
 * ADR-0002: the host schema defaults must deep-equal the contract
 * defaults, and the sanitizer must behave, on every run.
 */
import { build } from 'esbuild'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, '.verify', 'lib', 'contract.js')

await mkdir(path.dirname(OUT), { recursive: true })
await build({
  entryPoints: [path.join(ROOT, 'src', 'shared', 'settings-contract.ts')],
  outfile: OUT,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  logLevel: 'error'
})
