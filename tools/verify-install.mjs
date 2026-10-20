#!/usr/bin/env node
/**
 * Post-install verifier: prove the plugin is live in a running `dsh web`.
 *
 * The install itself is silent — the CLI only reports pnpm output. What a
 * user needs to know is whether the two halves actually reached the app:
 *
 *   host    — the /bongo-cat RPC channel answers config/get and info
 *   client  — the boot graph rosters this package, and the combo bundle
 *             carries its __ModuleLoader__ registration
 *   profile — the package is a bundle layer (dsh.profile.bundles), so it
 *             activates again on the next boot with no manual wiring
 *
 * Usage:
 *   dsh web --no-open                    # prints a URL with ?token=…
 *   node tools/verify-install.mjs "http://127.0.0.1:9000/?token=…"
 *
 * Exit code 0 = all checks passed. No dependencies, no writes.
 */
const target = process.argv[2]
if (target === undefined) {
  console.error('usage: node tools/verify-install.mjs "<the dsh web URL, including ?token=…>"')
  process.exit(2)
}

const PLUGIN = 'dsh-plugin-bongo-cat'
const CHANNEL = '/bongo-cat'
const url = new URL(target)
const token = url.searchParams.get('token')

const cookies = new Map()
const remember = (response) => {
  for (const raw of response.headers.getSetCookie?.() ?? []) {
    const pair = raw.split(';', 1)[0]
    const eq = pair.indexOf('=')
    if (eq > 0) cookies.set(pair.slice(0, eq), pair.slice(eq + 1))
  }
}
const cookieHeader = () => [...cookies].map(([name, value]) => `${name}=${value}`).join('; ')

const request = async (path, init = {}) => {
  const response = await fetch(new URL(path, url.origin + url.pathname.replace(/\/$/, '')), {
    ...init,
    headers: {
      ...(cookies.size > 0 ? { cookie: cookieHeader() } : {}),
      ...(init.headers ?? {})
    }
  })
  remember(response)
  return response
}

const results = []
const check = (ok, label, detail = '') => {
  results.push({ ok, label, detail })
  console.log(`${ok ? '  ok  ' : 'FAIL  '}${label}${detail === '' ? '' : ` — ${detail}`}`)
}

/* -- 1. browser-token exchange ------------------------------------- */
if (token !== null) {
  const exchange = await request(`/?token=${encodeURIComponent(token)}`, { redirect: 'manual' })
  check(exchange.status === 303 || exchange.status === 200, 'token exchange accepted', `HTTP ${exchange.status}`)
  check(cookies.size > 0, 'session cookie issued')
}

const index = await request('/', { headers: { accept: 'text/html' } })
const html = await index.text()
check(index.status === 200, 'index served', `HTTP ${index.status}`)

/* -- 2. boot graph -------------------------------------------------- */
const boot = /globalThis\["__DSH_BOOT__"\]\s*=\s*(\{[\s\S]*?\})\s*<\/script>/.exec(html)
check(boot !== null, 'boot graph injected')
if (boot !== null) {
  const graph = JSON.parse(boot[1])
  const row = (graph.entries ?? []).find((entry) => entry.id === PLUGIN)
  check(row !== undefined, `${PLUGIN} is rostered in the client graph`)
  const batch = (graph.batches ?? []).find((item) => (item.entries ?? []).includes(PLUGIN))
  check(batch !== undefined, 'row belongs to an initial-load batch', batch?.phase ?? 'none')
  if (batch !== undefined) {
    const combo = await request(`/${batch.url.replace(/&amp;/g, '&')}`)
    const body = await combo.text()
    check(combo.status === 200, 'combo bundle served', `HTTP ${combo.status}, ${body.length} bytes`)
    check(body.includes(`id: "${PLUGIN}"`), 'combo bundle registers the plugin module')
  }
}

/* -- 3. host half --------------------------------------------------- */
const rpc = async (endpoint, payload = {}) => {
  const response = await fetch(new URL(`${CHANNEL}/${endpoint}`, url.origin), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: `verify-${endpoint}`, method: endpoint, payload })
  })
  return { status: response.status, text: await response.text() }
}

const info = await rpc('info')
check(info.status === 200 && info.text.includes('"ok":true'), 'GET-equivalent /bongo-cat/info answers', `HTTP ${info.status}`)

const config = await rpc('config/get')
const parsed = (() => {
  try {
    return JSON.parse(config.text)
  } catch {
    return null
  }
})()
check(parsed?.result?.ok === true && typeof parsed.result.value?.enabled === 'boolean',
  '/bongo-cat/config/get returns resolved settings')

/* -- 4. asset routes (404 without imported assets is correct) ------- */
const skin = await request('/plugins/bongo-cat/skin?v=0')
check([200, 404].includes(skin.status), '/plugins/bongo-cat/skin route is mounted', `HTTP ${skin.status}`)
const sound = await request('/plugins/bongo-cat/sound?v=0')
check([200, 404].includes(sound.status), '/plugins/bongo-cat/sound route is mounted', `HTTP ${sound.status}`)

const failed = results.filter((result) => !result.ok).length
console.log(`\n${results.length - failed} passed, ${failed} failed`)
if (failed === 0) {
  console.log('Open the URL above, then Settings → 邦哥猫: the section and the floating cat should both be there.')
}
process.exit(failed === 0 ? 0 : 1)
