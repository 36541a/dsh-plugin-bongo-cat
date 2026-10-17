/**
 * dsh-plugin-bongo-cat build: esbuild produces both halves.
 *
 *  - lib/index.js  (host): bundled ESM node plugin; only @deepseek-ai
 *    packages we value-import are external (schemastery stays a real
 *    dependency, matching the published-plugin convention).
 *  - lib/client.js (browser): CommonJS body wrapped in the web module
 *    protocol the shell's module loader consumes:
 *
 *      window.__ModuleLoader__.load({ id, factory: (require) => {
 *        var module = { exports: {} }; var exports = module.exports;
 *        ...bundled cjs...
 *        return module.exports;
 *      }});
 *
 *    Externals are the shell's shared platform modules (PLATFORM_MODULES
 *    seed table, see @deepseek-ai/dsh-client-web/src/platform.ts) plus the
 *    packages declared in dsh.client.inject. CSS modules are compiled and
 *    injected with the same <style data-plugin-css> convention the official
 *    client packages use, so the loader's claimStyles() tracks them.
 */
import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PLUGIN_ID = 'dsh-plugin-bongo-cat'
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

/** Shared browser platform modules (seed table). */
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form'
]

/** Packages declared in dsh.client.inject (graph edges at boot). */
const CLIENT_INJECT = [
  '@deepseek-ai/dsh-client-runtime',
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
/* Build                                                              */
/* ------------------------------------------------------------------ */

await mkdir(path.join(ROOT, 'lib'), { recursive: true })

// Host half: plain ESM node bundle. schemastery stays external (real
// runtime dependency); cordis and every dsh service type is types-only.
await build({
  entryPoints: [path.join(ROOT, 'src/index.ts')],
  outfile: path.join(ROOT, 'lib/index.js'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['@deepseek-ai/schemastery', '@deepseek-ai/cosmokit'],
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
  plugins: [cssModulePlugin],
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
