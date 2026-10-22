/**
 * dsh-plugin-bongo-cat build: esbuild produces both halves.
 *
 *  - lib/index.js  (host): bundled ESM node plugin. It has no runtime
 *    dependencies of its own (settings live in a JSON file), so nothing
 *    needs to stay external; the external list is kept for the cordis
 *    service modules that may be value-imported later.
 *  - lib/client.js (browser): CommonJS body wrapped in the web module
 *    protocol the shell's module loader consumes:
 *
 *      window.__ModuleLoader__.load({ id, factory: (require) => {
 *        var module = { exports: {} }; var exports = module.exports;
 *        ...bundled cjs...
 *        return module.exports;
 *      }});
 *
 *    Externals are the shell's shared platform modules (the seed table the
 *    0.2.0 web shell passes as `staticModules`, plus the packages declared in
 *    `dsh.client.inject`). CSS modules are compiled and injected with the same
 *    `<style data-plugin-css>` convention the official client packages use, so
 *    the loader's claimStyles() tracks them.
 */
import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN_ID = 'dsh-plugin-bongo-cat'
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

/** Shared browser platform modules seeded by the DSH 0.2.0 web shell. */
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit'
]

/**
 * Packages declared in `dsh.client.inject` — the graph edges the 0.2.0
 * client-modules rosters on this row's behalf. Keep this list identical to
 * package.json's `dsh.client.inject`: the build and the manifest describing
 * two different graphs is exactly the drift that lands as a blank settings
 * page.
 */
const CLIENT_INJECT = [
  '@deepseek-ai/dsh-client-connection',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-slots'
]

const CLIENT_EXTERNALS = [...new Set([...PLATFORM_MODULES, ...CLIENT_INJECT])]

/* ------------------------------------------------------------------ */
/* CSS modules                                                        */
/* ------------------------------------------------------------------ */

function hashClass(name) {
  let h = 5381
  for (let i = 0; i < name.length; i++) h = ((h * 33) ^ name.charCodeAt(i)) >>> 0
  return h.toString(36)
}

/** Compile one .module.css source: scope class names, keep everything else. */
function transformCssModule(source, filePath) {
  const classes = new Map()
  // Hoist url(...) segments so dots inside them are never rewritten.
  const urls = []
  const withUrlPlaceholders = source.replace(/url\([^)]*\)/g, (m) => {
    urls.push(m)
    return '\u0000URL' + (urls.length - 1) + '\u0000'
  })
  const css = withUrlPlaceholders.replace(/\.([A-Za-z_][A-Za-z0-9_-]*)/g, (m, name) => {
    let hashed = classes.get(name)
    if (hashed === undefined) {
      hashed = '_bc_' + name + '_' + hashClass(name + ':' + filePath)
      classes.set(name, hashed)
    }
    return '.' + hashed
  // The \u0000 placeholders are deliberate (control chars never appear in CSS).
  // eslint-disable-next-line no-control-regex
  }).replace(/\u0000URL(\d+)\u0000/g, (_, i) => urls[Number(i)])
  const map = {}
  for (const [name, hashed] of classes) map[name] = hashed
  return { css, map }
}

const cssModulePlugin = {
  name: 'bongo-cat-css-modules',
  setup(build) {
    build.onLoad({ filter: /\.module\.css$/ }, async (args) => {
      const source = await readFile(args.path, 'utf8')
      const { css, map } = transformCssModule(source, args.path)
      const tagId = PLUGIN_ID + '/' + path.relative(ROOT, args.path).replaceAll('\\', '/')
      const contents = [
        'var css = ' + JSON.stringify(css) + ';',
        'var tagId = ' + JSON.stringify(tagId) + ';',
        'if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {',
        '  var tag = document.createElement("style");',
        '  tag.dataset.plugin = ' + JSON.stringify(PLUGIN_ID) + ';',
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        'export default ' + JSON.stringify(map) + ';'
      ].join('\n')
      return { contents, loader: 'js' }
    })
  }
}

/* ------------------------------------------------------------------ */
/* Global CSS (not scoped)                                            */
/* ------------------------------------------------------------------ */

/**
 * Plain `.css` imports are injected verbatim under their own style tag.
 *
 * Widgets build their DOM with literal class names (`bc-widget`, …) because
 * each widget is its own module and threading a class map through the
 * registry would buy nothing: widget classes are a private, namespaced
 * contract between one widget file and one stylesheet. CSS modules stay the
 * rule for React components, where class names do cross module boundaries.
 */
const globalCssPlugin = {
  name: 'bongo-cat-global-css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      if (args.path.endsWith('.module.css')) return null
      const css = await readFile(args.path, 'utf8')
      const tagId = PLUGIN_ID + '/' + path.relative(ROOT, args.path).replaceAll('\\', '/')
      const contents = [
        'var tagId = ' + JSON.stringify(tagId) + ';',
        'if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {',
        '  var tag = document.createElement("style");',
        '  tag.dataset.plugin = ' + JSON.stringify(PLUGIN_ID) + ';',
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = ' + JSON.stringify(css) + ';',
        '  document.head.appendChild(tag);',
        '}',
        'export default {};'
      ].join('\n')
      return { contents, loader: 'js' }
    })
  }
}

/* ------------------------------------------------------------------ */
/* Build                                                              */
/* ------------------------------------------------------------------ */

await mkdir(path.join(ROOT, 'lib'), { recursive: true })

// Host half: plain ESM node bundle. The plugin carries no runtime
// dependencies; cordis service modules stay external if ever imported.
await build({
  entryPoints: [path.join(ROOT, 'src/index.ts')],
  outfile: path.join(ROOT, 'lib/index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['@deepseek-ai/cordis', '@deepseek-ai/cosmokit'],
  logLevel: 'info'
})

// Client half: cjs body wrapped in the module-loader protocol.
const client = await build({
  entryPoints: [path.join(ROOT, 'src/client/index.tsx')],
  bundle: true,
  write: false,
  platform: 'browser',
  format: 'cjs',
  jsx: 'automatic',
  target: ['chrome110', 'firefox110', 'safari16'],
  external: CLIENT_EXTERNALS,
  plugins: [cssModulePlugin, globalCssPlugin],
  logLevel: 'info'
})

const body = client.outputFiles[0].text
const wrapped = [
  'window.__ModuleLoader__.load({',
  '  id: ' + JSON.stringify(PLUGIN_ID) + ',',
  '  factory: (require) => {',
  '    var module = { exports: {} };',
  '    var exports = module.exports;',
  body,
  '    return module.exports;',
  '  }',
  '});',
  ''
].join('\n')
await writeFile(path.join(ROOT, 'lib/client.js'), wrapped, 'utf8')

console.log('built lib/index.js and lib/client.js')
