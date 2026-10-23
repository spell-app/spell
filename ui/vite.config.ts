import { defineConfig, type Plugin, type UserConfig } from "vite-plus"
import dts, { type PluginOptions } from "vite-plugin-dts"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

// `.ts` written:  other repos' Vite configs import this one (`spell-ui/vite.config.ts`), and plain node loads it there,
// which adds no extension (the packages' `"./*.ts"` exports)
import { elementBaseConfig } from "spell/element-tools/elementConfig.ts"
import { hotElements } from "spell/element-tools/HotElements.ts"
import { fmtConfig, packageLint } from "spell/toolchain/lint"
import { environment } from "spell-ui/tools/environment.ts"

/** Absolute path of `src/`. */
const SRC = fileURLToPath(new URL("./src", import.meta.url))

/** Absolute path of `src/components/`:  the families. */
const COMPONENTS_DIR = fileURLToPath(new URL("./src/components", import.meta.url))

/**
 * The folders of the kit's `util` and `element`, which ship inside Spell UI's `dist/` (`declarations()`):
 * found by their npm names, so the declarations build doesn't depend on where the kit sits.
 */
const UTIL_SRC = path.dirname(createRequire(import.meta.url).resolve("spell/util/index.ts"))
const ELEMENT_SRC = path.dirname(createRequire(import.meta.url).resolve("spell/element/index.ts"))

/**
 * The declarations program's root:  the folder holding this repo, `UTIL_SRC` and `ELEMENT_SRC`
 * (`~/www/spell`, the kit, with the repos inside it).
 */
const DECLARATIONS_ROOT = commonFolder([path.resolve("."), UTIL_SRC, ELEMENT_SRC])

/** Where `vite-plugin-dts` writes this repo's own files, under `dist/`:  its path from `DECLARATIONS_ROOT`. */
const UI_WRITTEN = `${slashed(path.relative(DECLARATIONS_ROOT, path.resolve(".")))}/`

/** Component families, one lib entry each (`src/components/ui-<name>/index.ts`), so each can be loaded and sized alone. */
export const COMPONENTS = [
  "ui-button",
  "ui-dropdown",
  "ui-icon",
  "ui-label",
  "ui-parts",
  "ui-divider",
  "ui-segment",
  "ui-container",
  "ui-grid",
  "ui-image",
  "ui-text",
  "ui-flag",
  "ui-loader",
  "ui-placeholder",
  "ui-message",
  "ui-breadcrumb",
  "ui-input",
  "ui-checkbox",
  "ui-form",
  "ui-item",
  "ui-list",
  "ui-menu",
  "ui-table",
  "ui-popup",
  "ui-modal",
  "ui-transition",
  "ui-dimmer",
  "ui-flyout",
  "ui-sidebar",
  "ui-shape",
  "ui-card",
  "ui-items",
  "ui-feed",
  "ui-comment",
  "ui-statistic",
  "ui-step",
  "ui-rail",
  "ui-reveal",
  "ui-ad",
  "ui-emoji",
  "ui-select",
  "ui-search",
  "ui-progress",
  "ui-rating",
  "ui-slider",
  "ui-accordion",
  "ui-tab",
  "ui-toast",
  "ui-nag",
  "ui-sticky",
  "ui-visibility",
  "ui-embed",
  "ui-calendar",
  "ui-root",
  "ui-components",
  "ui-section",
  "ui-panel",
  "ui-property-editor",
  "ui-include",
  "ui-code",
  "ui-markdown",
  "ui-tree-diagram"
] as const

/**
 * Shared entries, in load order:  every family imports `core`;  only families with a form VALUE import `forms`.
 * - `name` => source file;  `yarn measure` attributes each module to one of them (`src/tools/package.config.ts`).
 */
export const SHARED_ENTRIES = { core: `${SRC}/core.ts`, forms: `${SRC}/forms.ts` } as const

/**
 * Library entries, by output name:
 * - `core`, `forms` -- the shared entries (`SHARED_ENTRIES`);  no family inlines them
 * - one per family
 * - `index` -- every family, for pages that want them all
 * - `api` -- the `E` / `V` namespaces, for apps only (`src/api.ts`)
 */
export const ENTRIES: Record<string, string> = {
  ...SHARED_ENTRIES,
  ...Object.fromEntries(COMPONENTS.map((name) => [name, `${COMPONENTS_DIR}/${name}/index.ts`])),
  styles: `${SRC}/styles/index.ts`,
  index: `${SRC}/index.ts`,
  api: `${SRC}/api.ts`
}

/**
 * Solid's packages, subpaths included (`solid-js/web`, `@solidjs/web`, `@solidjs/signals`):
 * PEER dependencies, never bundled.  The app (or an import map, see `yarn vendor`) supplies ONE copy,
 * so the app's owners, context and signals reach the components.
 * - The custom-element layer (`DOMElement`, `UIComponent`) is `ui`'s own code, bundled (epic `spell-element`).
 */
export const SOLID_EXTERNAL = /^solid-js(\/|$)|^@solidjs\//

/**
 * Config shared by the library build / dev server (below), `vitest.config.ts` and the docs site:
 * plugins, aliases, dedupe, Lightning CSS.
 * - The kit's element build settings (`elementBaseConfig()`, `spell/element-tools/elementConfig`), which every
 *   component pack's script is built on too (epic `repo-split` P10):  the decorator pre-pass BEFORE Solid's plugin,
 *   ONE Solid, Lightning CSS on the platform floor (`CSS_TARGETS`).
 *   - No aliases:  every file is imported by its package name (`spell-ui/components/ui-button/UIButton`), which Vite
 *     resolves through each package's `exports`.
 * - A FUNCTION, so every caller gets its own plugin instances.
 * - `SPELL_UI_SOLID_PROD=1` (`environment.isSolidProduction`, `src/tools/environment.ts`):
 *   Solid's PRODUCTION runtime under `vite dev` (no dev diagnostics, no performance tracks),
 *   for timing `src/tools/demo/perf.html`.
 * - `optimizeDeps`:  `axe-core`, `temporal-polyfill` (only a Temporal-less page imports it), highlight.js, marked and
 *   DOMPurify (only the lazy `CodeEngine` / `MarkdownEngine` import them) pre-bundled up front, so the first test run
 *   doesn't reload mid-run.
 */
export function baseConfig() {
  const production = environment.isSolidProduction ? { dev: false, performanceTracks: false } : {}
  return {
    ...elementBaseConfig({ solid: production }),
    optimizeDeps: {
      include: [
        "axe-core",
        "temporal-polyfill",
        "highlight.js/lib/core",
        "highlight.js/lib/languages/*",
        "marked",
        "dompurify"
      ]
    }
  } satisfies UserConfig
}

/**
 * Library build of `spell-ui`, and the dev server (`yarn dev`:  `src/tools/demo/`).
 * - ESM only:  every consumer we target (bundlers, `<script type="module">`, frameworks) speaks it.
 * - `solid-js` and `@solidjs/web` are external (`SOLID_EXTERNAL`);
 *   the `UIRuntime` and icon packs are separate files (`emitIconPacks()`).
 * - `preserveEntrySignatures: "allow-extension"`:  lets `core.js` / `button.js` ... hold their own code and export
 *   what siblings need, instead of Vite's lib-mode default (`strict`), which turns every entry into a facade over
 *   a hashed chunk.
 * - `css.transformer: "lightningcss"` so component CSS gets nesting / `@custom-media` lowering with the same engine
 *   that minifies it.  NOTE: postcss is never used.
 * - `vite-plugin-dts` emits `.d.ts` for consumers, laid out like `exports` says (`declarations()`).
 * - Also `vp lint` / `vp fmt`:  the toolchain's settings (`spell/toolchain/lint`), as Spell UI's OWN package's
 *   (`packageLint({ name: "ui" })`, the `spell-ui/*` rules in its component folders):  spell-ui is a flat repo, so this
 *   is its root block too, the one the editor and `vp check` read (epic `repo-split` I13;  spell-app's root block
 *   covered it before).
 */
export default defineConfig(() => {
  const base = baseConfig()
  return {
    fmt: { ...fmtConfig, ignorePatterns: [...fmtConfig.ignorePatterns, ...FMT_IGNORE] },
    lint: packageLint({ name: "ui", ignorePatterns: LINT_IGNORE }),
    ...base,
    plugins: [...base.plugins, hotElementsPlugin(), emitIconPacks(), dts(declarations())],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: true,
      lib: { entry: ENTRIES, formats: ["es"] },
      // the build's CSS MINIFY reads `cssTarget`, not `css.lightningcss.targets`:  left at Vite's default (older
      // Safari) it lowered `light-dark()` into `--lightningcss-light` variables fixed at `:root`, so `.ui-dark` /
      // `<ui-root theme="dark">` changed nothing in `dist/` (dev and tests were fine).  Same browsers as the kit's
      // `CSS_TARGETS` (`spell/element-tools/elementConfig`).
      cssTarget: ["chrome125", "safari26", "firefox147"],
      rolldownOptions: {
        external: (id: string) => SOLID_EXTERNAL.test(id),
        preserveEntrySignatures: "allow-extension",
        output: {
          // MUST stay on:  custom element class names are read by the manifest and dev-time warnings --
          // see `vite.decorators.ts`.
          keepNames: true,
          chunkFileNames: emojiChunkNames
        }
      }
    }
  } satisfies UserConfig
})

/**
 * What `vp lint` skips, from this folder:  built, vendored and generated trees (the toolchain's `rootLintIgnore`, as
 * they sit in a flat repo).
 */
const LINT_IGNORE = [
  "build",
  "dist",
  ".cache",
  ".vitest",
  "vendor",
  "coverage",
  "src/icons/icon-packs",
  "src/icons/data",
  "src/components/ui-emoji/data",
  "site/dist",
  "site/_assets",
  "src/tools/frameworks/solid/dist",
  "results"
]

/** What `vp fmt` skips besides the toolchain's list:  the hand-laid-out docs pages and the site's built bundle. */
const FMT_IGNORE = ["docs/**", "site/_assets/**"]

/**
 * Chunk file names:  an emoji data chunk (`src/components/ui-emoji/data/<set>/<letter>.json`)
 * goes to `emoji/<set>/<letter>-[hash].js`, so the two name sets' chunks are told apart:
 * - by a reader of `dist/`
 * - by the docs' single-file bundler, which loads them lazily instead of inlining them
 *   (`spell-epic/src/tools/bundle-spell-ui.js`)
 */
function emojiChunkNames(chunk: { facadeModuleId: string | null; moduleIds: readonly string[] }): string {
  const data = EMOJI_DATA.exec(chunk.facadeModuleId ?? chunk.moduleIds[0] ?? "")
  return data ? `emoji/${data[1]}/${data[2]}-[hash].js` : "[name]-[hash].js"
}

/** An emoji data module's id:  its set and chunk letter. */
const EMOJI_DATA = /\/components\/ui-emoji\/data\/([\w-]+)\/(\w+)\.json$/

/**
 * `vite-plugin-dts` options for the published declarations:
 * `dist/index.d.ts`, `dist/core.d.ts`, `dist/components/ui-<name>/index.d.ts` ... --
 * the paths `package.json` `exports` names.
 * - `src/` imports `spell/util` (`UTIL_SRC`) and `spell/element` (`ELEMENT_SRC`), the kit's.
 *   - So the program's root is the folder holding all three (`DECLARATIONS_ROOT`;  `compilerOptions.rootDir`, else
 *     TS6059).
 *   - Spell UI's `src/` is included (but its node tools, its `spell` commands and its test helpers), with the kit's
 *     two folders.
 * - Then `beforeWriteFile` moves what the plugin wrote (the folders as they sit under `DECLARATIONS_ROOT`):
 *   - `dist/spell-ui/src/**` up to `dist/**`:  the families land in `dist/components/**`
 *   - `dist/src/util/**` (the kit's `util/`) to `dist/_util/**` (not `dist/util/`:  that's Spell UI's `src/util/`)
 *   - `dist/src/element/**` (the kit's `element/`) to `dist/_spell-element/**`
 * - It also rewrites every import of a file that ships in `dist/` to a relative one (a `declare module`
 *   augmentation's too):  Spell UI's own (`spell-ui/core`, `spell-ui/components/ui-parts/UIParts`), and the kit's
 *   `spell/util/...` and `spell/element/...`.
 *   - `pathsToAliases: false`:
 *     the plugin's own rewrite measures from the layout BEFORE the move, and gets `../spell-ui/src/...`.
 * - `?inline` CSS imports (`styles/index.ts`) become `declare const x: string`:  only `vite/client` types them.
 * - Why not `bundleTypes`:  it rolls each entry up on its own, so a class like `UIComponent` is copied into every entry
 *   that reaches it, and a class with private members is a DIFFERENT type in each copy.
 *   Per-file declarations keep one `UIComponent` for `spell-ui/core` and `spell-ui/ui-button` alike.
 * - `util` and `spell-element` are not published on their own, so their declarations ship inside `spell-ui`
 *   (`util`'s GENERIC ones only).
 *   NOT `util/spell/` or `util`'s barrel (which flattens it in):
 *   `exclude` lists them, and `src/util/index.ts` imports file by file.
 * - MUST end with no `spell-ui/...`, `spell/util` or `spell/element` in `dist/**.d.ts`, and no path
 *   outside `dist/`;  `yarn smoke` checks (`DeclarationCheck`).
 */
export function declarations(): PluginOptions {
  return {
    include: ["src", fromHere(UTIL_SRC), fromHere(ELEMENT_SRC)],
    exclude: [
      // node code, and the tests' helpers:  never in a build
      "src/tools/**",
      "src/cli/**",
      "src/test-helpers/**",
      // visual-test hooks:  they import `src/test-helpers/test.types.ts`, whose `vitest` augmentations this program
      // can't resolve
      "src/components/**/*.visual.ts",
      `${fromHere(UTIL_SRC)}/spell/**`,
      `${fromHere(UTIL_SRC)}/index.ts`,
      // dev-only, never in a build
      `${fromHere(ELEMENT_SRC)}/HotDefinitions.ts`
    ],
    entryRoot: DECLARATIONS_ROOT,
    compilerOptions: { rootDir: DECLARATIONS_ROOT, paths: declarationPaths() },
    pathsToAliases: false,
    beforeWriteFile: rewriteDeclaration
  }
}

/**
 * `declarations()`'s module paths:  the kit's `util` and `element` by their npm names, each to its SOURCE, by
 * absolute path.
 * - Through `node_modules` they'd be read by their built declarations (the kit's `exports`, `types`), a LIBRARY's
 *   files to TypeScript, which writes no declarations for those:  `dist/_util/` and `dist/_spell-element/` would be
 *   empty (`yarn smoke` catches it).
 * - Spell UI's own name needs none:  `customConditions` (`tsconfig.json`) reads its source.
 */
function declarationPaths(): Record<string, string[]> {
  return {
    "spell/util": [`${UTIL_SRC}/index.ts`],
    "spell/util/*": [`${UTIL_SRC}/*`],
    "spell/element": [`${ELEMENT_SRC}/index.ts`],
    "spell/element/*": [`${ELEMENT_SRC}/*`]
  }
}

/**
 * `declarations()`'s `beforeWriteFile`:  where a `.d.ts` goes in `dist/`, and its imports made to match.
 * - Returns `false` (skip) for anything outside Spell UI's `src/` and the kit's `util/` and `element/`.
 * - Only import / export STATEMENTS are rewritten (`from "..."`, `import("...")`, `declare module "..."`):
 *   doc comments may mention package names.
 * - A specifier is resolved against the SOURCE tree, then expressed in `dist/` terms.
 *   A folder becomes `<folder>/index`:
 *   `dist/styles.js` (a lib entry) sits beside `dist/styles/`, and TypeScript would pick the `.js`.
 * - `import sheet from "./x.css?inline"` (`styles/index.ts`) is typed by `vite/client`, which a consumer may not
 *   have:  the sheets are plain strings.
 */
function rewriteDeclaration(filePath: string, content: string) {
  const dist = path.resolve("dist")
  const uiSrc = path.resolve("src")
  const written = path.relative(dist, filePath).split(path.sep).join("/")
  // a package outside this one, by the `dist/` folder its declarations go to
  const outside = OUTSIDE.find(({ written: prefix }) => written.startsWith(prefix))
  const moved = written.startsWith(`${UI_WRITTEN}src/`)
    ? written.slice(`${UI_WRITTEN}src/`.length)
    : outside && `${outside.folder}/${written.slice(outside.written.length)}`
  if (!moved) return false
  const fromDir = path.posix.dirname(moved)
  const sourceDir = outside
    ? path.join(outside.src, path.dirname(moved.slice(outside.folder.length + 1)))
    : path.join(uiSrc, path.dirname(moved))

  const code = content
    .replace(
      /(from |import\(|declare module )(["'])(spell-ui(?:\/[^"']*)?|spell\/(?:util|element)(?:\/[^"']*)?|\.\.?\/[^"']*)\2/g,
      (_, start, quote, specifier: string) => {
        const named = SHIPPED.find(({ name }) => specifier === name || specifier.startsWith(`${name}/`))
        const source = specifier.startsWith(".")
          ? path.resolve(sourceDir, specifier)
          : path.join(named!.src, specifier.slice(named!.name.length) || "index")
        const file = existsSync(source) && statSync(source).isDirectory() ? path.join(source, "index") : source
        const home = OUTSIDE.find(({ src }) => file.startsWith(`${src}${path.sep}`))
        const target = home ? `${home.folder}/${path.relative(home.src, file)}` : path.relative(uiSrc, file)
        const relativeTarget = path.posix.relative(fromDir, target.split(path.sep).join("/"))
        return `${start}${quote}${relativeTarget.startsWith(".") ? relativeTarget : `./${relativeTarget}`}${quote}`
      }
    )
    .replace(/^import \{ default as (\w+) \} from ["'][^"']+\?inline["'];?$/gm, "declare const $1: string;")
  return { filePath: path.join(dist, moved), content: code }
}

/**
 * The kit's folders whose declarations ship inside `spell-ui`, each into a `dist/` folder of its own
 * (`rewriteDeclaration()`).
 * - `src`:  their source folder
 * - `written`:  where `vite-plugin-dts` writes their declarations, in `dist/`
 * - `folder`:  where they go instead
 */
const OUTSIDE = [
  { src: UTIL_SRC, written: `${slashed(path.relative(DECLARATIONS_ROOT, UTIL_SRC))}/`, folder: "_util" },
  { src: ELEMENT_SRC, written: `${slashed(path.relative(DECLARATIONS_ROOT, ELEMENT_SRC))}/`, folder: "_spell-element" }
]

/** The package names whose files ship in `dist/`, each with its source folder:  Spell UI's own, and the kit's two. */
const SHIPPED = [
  { name: "spell-ui", src: path.resolve("src") },
  { name: "spell/util", src: UTIL_SRC },
  { name: "spell/element", src: ELEMENT_SRC }
]

/** The deepest folder holding every one of `folders`. */
function commonFolder(folders: readonly string[]): string {
  const [first = [], ...rest] = folders.map((folder) => folder.split(path.sep))
  let length = 0
  while (length < first.length && rest.every((parts) => parts[length] === first[length])) length++
  return first.slice(0, length).join(path.sep) || path.sep
}

/** A folder's path from this repo's root, `/`-separated:  for `vite-plugin-dts`'s `include` / `exclude` globs. */
function fromHere(folder: string): string {
  return slashed(path.relative(".", folder))
}

/** A path with `/` between its parts, whatever the platform. */
function slashed(file: string): string {
  return file.split(path.sep).join("/")
}

/**
 * Hot module replacement for the components in `yarn dev`
 * (the kit's `HotElements`, `spell/element-tools/HotElements`;
 * `apply: "serve"`, so builds are untouched, and NOT in `vitest.config.ts`).
 * - `HotDefinitions` (`spell/element`'s) is injected by FILE PATH, resolved from its package's `exports`.
 */
function hotElementsPlugin(): Plugin {
  // HACK: `HotElements.ts` types its plugin with `vite`'s `Plugin`, this config with `vite-plus`'s:
  // the same version, but a second declaration TypeScript won't unify
  return hotElements(createRequire(import.meta.url).resolve("spell/element/HotDefinitions.ts")) as unknown as Plugin
}

/**
 * Copies the built-in icon packs, `src/icons/icon-packs/**` (SVGs + each `pack.js`), to `<dir>/**` in the build output,
 * next to the chunks, where `BuiltInPacks` looks via `import.meta.url` (`notes/icons.md`, "Shipping icons").
 * - Library build:  `BuiltInPacks` lives in `dist/core.js` (the `core` entry re-exports `spell-ui/icons`), so `dist/icon-packs/`.
 * - Docs site:  not this plugin:  `site/_assets/icon-packs` is a symlink to the source folder (`scripts/site-bundle.ts`).
 * - Copied as ASSETS, never bundled:  the runtime imports each `pack.js` by URL, on demand.
 * - Client builds only:  a server / prerender build needs no icon files.
 */
export function emitIconPacks(dir = "icon-packs"): Plugin {
  const root = fileURLToPath(new URL("./src/icons/icon-packs", import.meta.url))
  return {
    name: "spell-emit-icon-packs",
    apply: "build",
    generateBundle() {
      if (this.environment.name !== "client") return
      for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile() || !ICON_PACK_FILE.test(entry.name)) continue
        const file = path.join(entry.parentPath, entry.name)
        this.emitFile({ type: "asset", fileName: `${dir}/${path.relative(root, file)}`, source: readFileSync(file) })
      }
    }
  }
}

/** Files of an icon pack:  its SVGs and its `pack.js` index. */
const ICON_PACK_FILE = /\.(svg|js)$/
