import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import solid from "@solidjs/vite-plugin"
import type { Plugin, PluginOption, ProxyOptions, UserConfig } from "vite"

import { standardDecorators } from "spell/toolchain/decorators"
import { packageVersion } from "spell/toolchain/packageVersion"
import { brotliCopies } from "spell/toolchain/brotliCopies"
import { ruleTestsOutOfBuilds } from "spell/toolchain/stripRuleTests"
import { CSS_TARGETS, DEV_SERVER_SETTINGS, SOLID_DEDUPE, cssBuildTarget } from "spell/element-tools/elementConfig"
import { emitIconPacks, emitSoundLibrary } from "spell/ui/vite.config.ts"
import {
  PAGE_SERVER_PREFIXES,
  SERVER_TOKEN_HEADER,
  TOKEN_PREFIXES,
  WEBSOCKET_PREFIXES
} from "spell/app/spaces/server/node/routes/editorPaths"

/**
 * Config every `vite*.config.ts` and `vitest.config.ts` here shares.
 * - Every `.tsx` is Solid:  the app, `spell-ui`'s source, and what compiled spell draws with
 *   (`core`'s `drawing.ts`, epic `output-targets` P10).  React left with P11.
 */

/**
 * `node_modules`, which the Solid plugin leaves alone --
 * except packages shipping Solid JSX SOURCE (their `solid` export condition), which it must compile:
 * `@solidjs/router` (`dist/*.jsx`).
 */
const NOT_SOLID_SOURCE = /\/node_modules\/(?!@solidjs\/router\/)/

/**
 * The top repo `spell`, whose `yarn.lock` is the ONE install for every repo (epic `repo-split` P7):  the nearest folder
 * up holding one.
 * - Vite serves files only inside its workspace (`server.fs.allow`), which is spell-app's own root:  Spell UI's test
 *   setup (`spell/ui/test-helpers/setup.ts`), its source and every other repo's live beside spell-app, under this one.
 */
export const TOP_REPO = (() => {
  for (let dir = import.meta.dirname; ; dir = path.dirname(dir)) {
    if (existsSync(path.join(dir, "yarn.lock"))) return dir
    if (path.dirname(dir) === dir) return path.resolve(import.meta.dirname, "..")
  }
})()

/**
 * Plugins, dedupe and CSS for one config.
 * - A FUNCTION, so every config gets its own plugin instances:
 *   the Solid plugin picks client or server posture from the config it's created in
 *   (`vitest`:  node, so `@solidjs/web`'s server build, `renderToString`).
 * - `ruleTestsOutOfBuilds()` first:  a BUILD ships each grammar rule with its first example only, not its tests.
 * - `standardDecorators()` BEFORE the Solid plugin:  both are `enforce: "pre"`,
 *   and the Solid compiler must see decorator-free code.
 * - `compiledSpell()`:  every config, so a test or a build that reaches `<FileTabs>` reads its `.spell`.
 * - `brotliCopies()`:  a BUILD writes a brotli copy beside each text file it writes (`x.js.br`), which the kit's
 *   servers send as is to a browser that takes brotli (epic `solid-2-final` P2)
 * - `builtInFiles`:  a BUILD that bundles `spell-ui` emits its built-in icon packs and sounds
 *   beside the chunks that load them (`builtInFilesBesideTheirCode()`).
 *   Omit for `vitest`, and for builds that import `ui` from `spell-ui.js`.
 * - Lightning CSS with the kit's `CSS_TARGETS`, and every build's CSS minify with the same browsers
 *   (`cssBuildTarget()`), as Spell UI's own:  Vite's default targets lower `light-dark()` and break `ui-dark`
 *   subtrees and shadow roots (see `spell/element-tools/elementConfig`).
 */
export function appConfig({ builtInFiles }: { builtInFiles?: boolean } = {}) {
  const plugins: PluginOption[] = [
    ruleTestsOutOfBuilds(),
    standardDecorators(),
    packageVersion(import.meta.dirname),
    solid({ exclude: [NOT_SOLID_SOURCE] }),
    compiledSpell(),
    cssBuildTarget(),
    brotliCopies()
  ]
  if (builtInFiles) plugins.push(builtInFilesBesideTheirCode())
  return {
    plugins,
    // the editor's language worker (`languageWorker.ts`, epic `solid-2-final` P18):  the parser, built as the page's is
    worker: {
      format: "es" as const,
      plugins: () => [ruleTestsOutOfBuilds(), standardDecorators(), packageVersion(import.meta.dirname)],
      // MUST stay on, as the page's:  rules register under their class name (`Rule.instantiate()`)
      rollupOptions: { output: { keepNames: true } }
    },
    // every import a package name, found through `package.json`s' `exports` (epic `repo-split` P14):  no aliases
    resolve: { dedupe: SOLID_DEDUPE },
    // every repo's files, beside spell-app (`TOP_REPO`)
    server: { ...DEV_SERVER_SETTINGS, fs: { allow: [TOP_REPO] } },
    css: {
      transformer: "lightningcss",
      lightningcss: {
        targets: CSS_TARGETS,
        drafts: { customMedia: true },
        // drop a rule Lightning CSS can't parse, with a warning, as a browser drops it,
        // rather than failing the whole sheet
        errorRecovery: true
      }
    }
  } satisfies UserConfig
}

////////////////
// ## The page server, behind the editor
////////////////

/**
 * The editor's dev server passing the page server's paths on to it:  the API, a project's files, the elements' bundles,
 * the component sets' and epics' pages (`vite.config.ts`'s `server.proxy`).
 * - `target`:  the page server, by IP:  `localhost` may be ::1 first, where it doesn't listen (`EditorServer`)
 * - `token`:  the page server's write token, which `EditorServer` hands vite as `SPELL_SERVER_TOKEN`
 *   - `tokenFile`:  the page server's token file (`SPELL_SERVER_TOKEN_FILE`), read again as each request goes on
 *     (`currentToken()`):  a page server started after vite has a new token, and vite outlives a restart
 *     (epic `epic-engine` I329);  `token` is the fallback while the file has none
 *   - added to every request to a project data folder (`/api/places/...`) as the proxy sends it on,
 *     so a program run in the editor reads and writes its places as a page the page server served does
 *     (epic `language` T68:  without it, every request there answered 403, "bad token")
 *   - NEVER handed to the page:  vite listens on every address, and the token stays on this machine's side of it
 *   - the page server's guard still checks the `Origin`:  it takes the editor's own (`EditorServer`), no other site's
 *   - only there:  the rest of the API takes no token, and the token's other doors (an invite) stay shut to the editor
 * - Every one with `changeOrigin`:  the page server checks its own `Host`.
 * - The live channel's websocket too (`/api`'s `ws`):  it tells the editor the person's theme changed.
 * - Which paths:  `PAGE_SERVER_PREFIXES`, the list the built editor's own server passes on too (`EditorServer`).
 */
export function pageServerProxy({
  target,
  token,
  tokenFile
}: {
  target: string
  token?: string
  tokenFile?: string
}): Record<string, ProxyOptions> {
  const passed = { target, changeOrigin: true }
  const tokenNow = () => (tokenFile && currentToken(tokenFile)) || token
  const addToken: ProxyOptions["configure"] = (proxy) => {
    const withToken = (request: { setHeader(name: string, value: string): void }) => {
      const now = tokenNow()
      if (now) request.setHeader(SERVER_TOKEN_HEADER, now)
    }
    // a request, and a websocket's opening request:  a live room's (`/api/rooms`)
    proxy.on("proxyReq", withToken)
    proxy.on("proxyReqWs", withToken)
  }
  // in order:  vite takes the first entry a path starts with (`/api/places` before `/api`)
  return Object.fromEntries(
    PAGE_SERVER_PREFIXES.map((prefix) => [
      prefix,
      {
        ...passed,
        ...(WEBSOCKET_PREFIXES.includes(prefix) && { ws: true }),
        ...((token || tokenFile) && TOKEN_PREFIXES.includes(prefix) && { configure: addToken })
      }
    ])
  )
}

/**
 * The write token in the page server's token file (`PidFile.tokenFile`:  `{ pid, token }`), read again only when the
 * file changed;  `undefined` while there's none.
 * - NEVER throws
 */
function currentToken(tokenFile: string): string | undefined {
  try {
    const changed = statSync(tokenFile).mtimeMs
    if (changed !== tokenRead.changed) {
      tokenRead.token = (JSON.parse(readFileSync(tokenFile, "utf8")) as { token?: string }).token
      tokenRead.changed = changed
    }
    return tokenRead.token
  } catch {
    return undefined
  }
}

/** What `currentToken()` read last, and the file's change time then. */
const tokenRead: { token?: string; changed?: number } = {}

////////////////
// ## One Solid per page
////////////////

/**
 * Files of the shared Solid build, `vite.solid.config.ts`:
 * every other bundle of ours imports Solid and `spell-ui` from these, beside it,
 * so a page with `<spell-viewer>`s AND a `<spell-editor>` loads ONE copy of each.
 * - `solid`:  `solid-js`, `@solidjs/web` (`@solidjs/signals` under them),
 *   `spell-ui`'s element core, `spell/ui/core`, and its root family, `spell/ui/components/ui-root`, each whole:
 *   `<spell-viewer>` and `<spell-editor>` are Spell UI components (`UIComponent`), defined as their scripts run,
 *   and `<spell-viewer>` is a root (`UIRoot`);
 *   and `@solidjs/h` (as `h`), which compiled spell draws with (`spell-runtime.js`)
 * - `shared`:  what the other bundles import instead of `solid`, written by `vite.solid.config.ts`:
 *   the same names, taken from the PAGE when it has them (a docs page's `SpellUI.packModules`), else from `solid`
 * - `ui`:  `spell-ui`'s barrel, `spell-ui`, which the app imports LAZILY (`loadUI.ts`);
 *   its own lazy chunks are in `ui/`
 * - `families`:  what `<spell-code>`, `<spell-markdown>` and `<spell-reference-page>` import instead of Spell UI's
 *   families (`SHARED_FAMILIES`, `DRAWN_FAMILIES`),
 *   written by `vite.solid.config.ts`:  the PAGE's when it has Spell UI of its own, else `ui`'s
 * - Why:  two Solids (or two `UIComponent`s) on one page fail SILENTLY (`solid-2.md`, "One Solid per page").
 *   Pinned by `element.build.test.ts`.
 */
export const SHARED_SOLID = {
  solid: "spell-solid.js",
  shared: "spell-solid-shared.js",
  ui: "spell-ui.js",
  families: "spell-ui-shared.js"
} as const

/** Prefix of the external ids `sharedFiles()` gives `SHARED_SOLID`'s files, until `output.paths` writes them out. */
const SHARED_ID = "spell-shared-solid:"

/**
 * Spell UI's families that `<spell-code>` and `<spell-markdown>` (`vite.code.config.ts`) EXTEND, and the names
 * `spell-ui-shared.js` (`SHARED_SOLID.families`) exports of each.
 * - The page's own when it has Spell UI of its own:  its `SpellUI.packModules` MUST then name them (the docs bundle's,
 *   the component sets' `SitePacks.ts`), as it names the core (`SHARED_SPECIFIERS`).
 * - Else `spell-ui.js`'s:  the `spell-ui` barrel exports every one (`vite.solid.config.ts` checks).
 */
export const SHARED_FAMILIES: Readonly<Record<string, readonly string[]>> = {
  "spell/ui/components/ui-code": ["UICode", "DOMCodeElement", "CodeHighlighter", "CodeLines"],
  "spell/ui/components/ui-markdown": ["UIMarkdown", "DOMMarkdownElement", "MarkdownRenderer"]
}

/**
 * Spell UI's families the app's elements DRAW with:  spell's markdown engine's (`<spell-markdown>`'s barrel imports
 * them for that), and `<spell-reference-page>`'s folds, labels, tables and buttons (epic `data` P53):
 * side effects only, so `spell-ui-shared.js` exports nothing of them.
 * - Where the page has Spell UI of its own, its bundle defines every family (the docs bundle;  a set's page before a
 *   pack's `define()`);  else `spell-ui.js` does, as `spell-ui-shared.js` imports it.
 */
const DRAWN_FAMILIES = [
  "ui-button",
  "ui-checkbox",
  "ui-divider",
  "ui-label",
  "ui-list",
  "ui-parts",
  "ui-section",
  "ui-segment",
  "ui-table"
].map((family) => `spell/ui/components/${family}`)

/**
 * WHAT OUR BUILDS SHARE, the ONE table (epic `solid-2-final` P19):  each import name, and the file beside a build it
 * comes from instead of being bundled into it, or `"bundled"` where every build keeps its own copy.
 * - `sharedFiles()` reads it, the one rule for every build that shares (below).
 * - `spell-solid-shared.js`:  Solid, `spell/element`, Spell UI's element core and its root family, from the page's
 *   copy when it has one (`SHARED_SPECIFIERS`), else `spell-solid.js`'s.
 *   - Only those our code imports:  `solid-js/internal` (from `@solidjs/web`) and `@solidjs/signals` (from `solid-js`)
 *     stay INSIDE `spell-solid.js`.
 *   - `spell/ui/core` and `spell/ui/components/ui-root` are in `spell-solid.js`, not `spell-ui.js`:
 *     `<spell-viewer>` and `<spell-editor>` define themselves on them as their scripts run, before the rest of `ui` loads.
 *   - `spell/element` BEFORE `spell/ui/core`:  `spell/ui/core` carries all of it, and its `E` holds every name
 *     spell-element's does.
 *   - `@solidjs/h` (compiled spell's, in `spell-runtime.js`) has only a default export:
 *     `sharedFiles()` imports it through a module of its own (`SHARED_H`).
 * - `spell-ui.js`:  `spell-ui`'s barrel, which the app imports LAZILY (`loadUI.ts`).
 * - `spell-ui-shared.js`:  the families `<spell-code>` and `<spell-markdown>` extend (`SHARED_FAMILIES`), and those
 *   spell's markdown engine draws with (`DRAWN_FAMILIES`).
 * - `spell-grammar.js`:  spell's grammar, the parser's barrel and spell's, for `<spell-viewer>`'s build only
 *   (`sharedFiles({ grammar: true })`, epic `solid-2-final` P11):  `vite.code.config.ts` builds it once
 *   (`src/app/spellGrammar.ts`), for `<spell-code>`'s colours and a layout's spell (`LayoutSpell.js`).
 *   - Only `LayoutSpell`'s imports of it are values, and the runner loads it lazily, so nothing up front loads the
 *     grammar (`element.build.test.ts` checks).
 *   - A deep import (`spell/parser/spell/SpellUrls`) stays bundled:  the viewer's up-front pieces use a few,
 *     and a second copy of each is a few small modules.
 * - `"bundled"`:  plain modules that hold no state a page must share, so each build keeps its own copy:
 *   - `ui`'s generated tables (`spell/ui/vocabulary/partsOfSpeech.generated`, which the bubbly look reads)
 *   - the built-in sounds' names (`spell/ui/sounds`, which the language service lists;  epic `mockup` P28):
 *     where their FILES are is the page's runtime's to say (`UI.sounds`), never this copy's
 *   - `drawnWindow`, every long list's drawing, which the parser's core draws with:
 *     it imports only Solid and util's generic files, which come from the shared files as usual
 *   - `SkeletonText` and `SkeletonShapes`:  a skeleton's text read, and the shapes it's drawn with, pure data
 *   - `DroppedFiles`, the uploader's reading of a desktop drop, which a view that takes files reads too
 *     (epic `language` P67)
 *   - the theme tree, which a site's own theme is checked and built with (`SiteThemes`, I36):  `ThemeTokens` reads
 *     every theme and palette file (a lazy chunk each), `ThemeFile` works one out, `styles.en` is the tree itself
 *   - `SpellUIGuide`, where the Spell UI site is (epic `editor` P43):  spell's project groups name its project
 * - Any other Solid / `ui` / `spell/element` name (`solid-js/store`, `spell/ui/runtime`) is a build ERROR
 *   (`SOLID_FAMILY`):  add it here, and to what `vite.solid.config.ts` exports, or the shared files won't have its names.
 */
const WHAT_BUILDS_SHARE: readonly SharedRow[] = [
  {
    from: SHARED_SOLID.shared,
    names: ["solid-js", "@solidjs/web", "@solidjs/h", "spell/element", "spell/ui/core", "spell/ui/components/ui-root"]
  },
  { from: SHARED_SOLID.ui, names: ["spell/ui"] },
  { from: SHARED_SOLID.families, names: [...Object.keys(SHARED_FAMILIES), ...DRAWN_FAMILIES] },
  { from: "spell-grammar.js", names: ["spell/parser/parser", "spell/parser/spell"], only: "grammar" },
  {
    from: "bundled",
    names: [
      /^spell\/ui\/(.+\.generated|sounds)$/,
      "spell/element/drawnWindow",
      "spell/element/SkeletonText",
      "spell/element/SkeletonShapes",
      "spell/ui/util/SpellUIGuide",
      "spell/ui/components/ui-uploader/DroppedFiles",
      "spell/ui/components/ui-theme-editor/ThemeTokens",
      "spell/ui/styles/ThemeFile",
      "spell/ui/styles/styles.en"
    ]
  }
]

/** One row of `WHAT_BUILDS_SHARE`. */
type SharedRow = {
  /** the file beside the build these come from, or `"bundled"`:  each build its own copy */
  from: string
  /** their import names, or a pattern of them */
  names: readonly (string | RegExp)[]
  /** shared only by a build that asks for it (`sharedFiles({ grammar: true })`);  every other bundles them */
  only?: "grammar"
}

/**
 * The specifiers `spell-solid-shared.js` takes from the page when the page has them all:
 * keys of `globalThis.SpellUI.packModules`, the docs bundle's (`epic/src/tools/_assets/spell-ui.entry.js`).
 */
export const SHARED_SPECIFIERS = WHAT_BUILDS_SHARE.filter(({ from }) => from === SHARED_SOLID.shared).flatMap(
  ({ names }) => names as string[]
)

/** Solid's hyperscript, `h()`:  what compiled spell draws with, through `core`'s export (epic `output-targets` P20). */
const H_PACKAGE = "@solidjs/h"

/**
 * Shared specifiers with only a DEFAULT export, by the name `spell-solid.js` and `spell-solid-shared.js` export it as:
 * `@solidjs/h`'s `h`.
 * - The page's `SpellUI.packModules` holds the module as it is (`{ default: h }`), as a component pack imports it:
 *   `spell-solid-shared.js` renames it.
 */
export const SHARED_DEFAULTS: Readonly<Record<string, string>> = { [H_PACKAGE]: "h" }

/** Virtual module `sharedFiles()` resolves `H_PACKAGE` to:  `spell-solid-shared.js`'s `h`, as a default export. */
const SHARED_H = "\0spell-shared-h"

/** Any other import from Solid's or `ui`'s packages:  `sharedFiles()` refuses it, as the shared files may lack it. */
const SOLID_FAMILY = /^(solid-js|@solidjs\/[^/]+|spell\/ui|spell\/element)(\/|$)/

/**
 * Where `source` comes from in a build, by `WHAT_BUILDS_SHARE`:  a shared file's name, `"bundled"`, or `undefined` for a
 * name the table doesn't have.
 * - `grammar`:  the build shares the grammar too;  else that row's names are bundled.
 */
function sharedFileFor(source: string, { grammar }: SharedFilesOptions): string | undefined {
  for (const { from, names, only } of WHAT_BUILDS_SHARE) {
    if (!names.some((name) => (typeof name === "string" ? name === source : name.test(source)))) continue
    return only === "grammar" && !grammar ? "bundled" : from
  }
  return undefined
}

/**
 * The ONE rule for a build that takes what `WHAT_BUILDS_SHARE` names from the files beside it, instead of bundling its
 * own:  `vite.element.config.ts`, `vite.runner.config.ts`, `vite.code.config.ts` (`<spell-editor>` too),
 * `vite.page.config.ts`.
 * - Such an import resolves to an EXTERNAL id, which `output.paths` writes as `./spell-solid-shared.js` ...:  relative.
 *   So every chunk that imports one MUST sit at the output folder's top level (ours do:  fixed names, no folders).
 * - Static and dynamic imports alike:  `import("spell/ui")` becomes `import("./spell-ui.js")`, still on demand.
 * - Side-effect imports too:  `import "spell/ui/components/ui-table"` becomes `import "./spell-ui-shared.js"`.
 * - Looked up by the import name itself, the key of the table and of a page's `SpellUI.packModules`
 *   (`SHARED_SPECIFIERS`;  epic `repo-split` P14, Q45).
 * - Any other Solid / `ui` specifier is a build ERROR (`SOLID_FAMILY`).
 * - Type-only imports (`@solidjs/web/types/jsx.js`) are gone before this runs.
 * - `enforce: "pre"`:  before Vite's resolver, which would resolve `spell/ui/core` to its source.
 */
export function sharedFiles(options: SharedFilesOptions = {}): Plugin {
  return {
    name: "spell-shared-files",
    apply: "build",
    enforce: "pre",
    resolveId(source) {
      if (source === H_PACKAGE) return SHARED_H
      if (source.startsWith(SHARED_ID)) return { id: source, external: true }
      const file = sharedFileFor(source, options)
      if (file === "bundled") return null
      if (file) return { id: `${SHARED_ID}${file}`, external: true }
      if (SOLID_FAMILY.test(source)) {
        this.error(`"${source}" can't come from ${Object.values(SHARED_SOLID).join(" / ")}:  see WHAT_BUILDS_SHARE`)
      }
      return null
    },
    // `@solidjs/h` has only a DEFAULT export, which `spell-solid-shared.js` re-exports as `h`
    load: (id) => (id === SHARED_H ? `export { h as default } from "${SHARED_ID}${SHARED_SOLID.shared}"` : null),
    outputOptions(outputOptions) {
      return {
        ...outputOptions,
        paths: (id: string) => (id.startsWith(SHARED_ID) ? `./${id.slice(SHARED_ID.length)}` : id)
      }
    }
  }
}

/** `sharedFiles(options)`. */
export type SharedFilesOptions = {
  /** take spell's grammar from `spell-grammar.js` too (`<spell-viewer>`'s build);  default:  bundle it */
  grammar?: boolean
}

////////////////
// ## Built-in files:  icon packs and sounds
////////////////

/**
 * Spell UI's built-in files, each set beside the module that looks for it (`import.meta.url`).
 * - `BuiltInPacks` => `icon-packs/` (`emitIconPacks()`)
 * - `BuiltInSounds` => `sound-library/` (`emitSoundLibrary()`), Spell's built-in sounds
 */
const BUILT_IN_FILES = [
  { module: /\/ui\/src\/icons\/BuiltInPacks\.ts$/, name: "BuiltInPacks", dir: "icon-packs", emit: emitIconPacks },
  {
    module: /\/ui\/src\/sounds\/BuiltInSounds\.ts$/,
    name: "BuiltInSounds",
    dir: "sound-library",
    emit: emitSoundLibrary
  }
]

/**
 * `spell-ui`'s built-in icon packs and sounds, each emitted beside whichever chunk holds the module that looks for
 * them (`BUILT_IN_FILES`).
 * `ui`'s `emitIconPacks()` and `emitSoundLibrary()` do the copying.
 * - FOUND in the bundle, not configured:  which chunk holds it is the bundler's call
 *   (`assets/UIRuntime-<hash>.js` in the app, `spell-ui.js` in `vite.solid.config.ts`).
 *   Files in the wrong folder fail quietly:  blank icons, silent sounds.
 * - A build error when no chunk holds one:  a build that asks for them and doesn't bundle `ui` is misconfigured.
 * - All three icon packs, ~2.3 MB in ~2,170 files (the "8.7 MB" is `du`'s, in 4 kB disk blocks).
 *   - The app's icons need `fa7-free` (the default pack, always fetched) and `fomantic`,
 *     whose names point INTO both Font Awesome folders (448 brands).
 *   - So leaving `fa7-brands` out would save ~0.2 MB, with a filter `emitIconPacks()` doesn't have.
 * - The sounds:  139 files, 1.5 MB (epic `mockup` P28).
 */
function builtInFilesBesideTheirCode(): Plugin {
  return {
    name: "spell-built-in-files-beside-their-code",
    apply: "build",
    generateBundle(options, bundle, isWrite) {
      if (this.environment.name !== "client") return
      for (const { module, name, dir, emit } of BUILT_IN_FILES) {
        const chunk = Object.values(bundle).find(
          (file) => file.type === "chunk" && file.moduleIds.some((id) => module.test(id))
        )
        if (!chunk) return this.error(`\`builtInFiles\`:  no chunk holds \`spell-ui\`'s \`${name}\``)
        const folder = path.posix.join(path.posix.dirname(chunk.fileName), dir)
        // `as unknown`:  spell-ui has its own `vite` in its `node_modules` (I59), so its `Plugin` type is a different one
        const plugin = emit(folder) as unknown as { generateBundle(this: unknown, ...args: unknown[]): void }
        plugin.generateBundle.call(this, options, bundle, isWrite)
      }
    }
  }
}

/** The editor's own Spell, the group `@spell/editor`:  any other `.spell` is a program's, read as text (a test's `?raw`). */
const LAYOUT_FOLDER = "/spaces/@spell/editor/"

/** Is `file` (a path, its query gone) a Spell file of the editor's own Spell (`LAYOUT_FOLDER`)? */
function isEditorSpell(file: string): boolean {
  return /\.spell(?:ml)?$/.test(file) && file.includes(LAYOUT_FOLDER)
}

/** Where the editor's own Spell keeps its last good compile:  the app's `build/`, never committed, one file per project. */
const LAST_GOOD_FOLDER = "app/build/editor-pieces"

/**
 * A `.spell` file of the editor's own Spell (the group `@spell/editor`;  one project since epic `editor` P29,
 * `spell-editor`), imported, is its project's compiled javascript, as text (`layoutSpell.ts`).
 * - Its folder is a project of its own:  this runs `spell compile <folder> --stdout`.
 * - Compiled in a process of its own, as the preview build compiles, so no config loads the parser.
 * - Text, not a module:  it can only run on a copy of the runtime, which isn't in this bundle.
 * - Each good compile is kept (`LAST_GOOD_FOLDER`), so a broken edit can't lock you out of the editor (epic `editor` P22):
 *   - the dev server:  Spell that doesn't compile falls back to its last good compile, and the module tells the
 *     editor why (`layoutPieceBroken()`), which says so in plain words
 *   - a build, or a test, or a project never compiled before:  it stops, saying why, so nothing broken ships
 * - The file changing on disk (a Publish, or an edit by hand) RELOADS the editor's page, never a hot update:
 *   a hot update put the new Spell on the copy's runtime while the old menus were still drawn, and drew them half
 *   one, half the other (epic `editor` I329).  An edit in the editor is your draft, so it never changes this file.
 */
function compiledSpell(): Plugin {
  let canFallBack = false
  return {
    name: "spell-app:compiled-spell",
    enforce: "pre",
    configResolved(config) {
      canFallBack = config.command === "serve" && !process.env.VITEST
    },
    handleHotUpdate({ file, server }) {
      if (!isEditorSpell(file)) return
      server.ws.send({ type: "full-reload" })
      return []
    },
    load(id) {
      const file = id.split("?")[0]!
      if (!isEditorSpell(file)) return null
      this.addWatchFile(file)
      const bin = path.join(TOP_REPO, "bin/spell.mjs")
      const { status, stdout, stderr } = spawnSync(process.execPath, [bin, "compile", path.dirname(file), "--stdout"], {
        encoding: "utf8"
      })
      const piece = path.basename(path.dirname(file))
      const lastGood = path.join(TOP_REPO, LAST_GOOD_FOLDER, `${piece}.js`)
      if (status === 0) {
        mkdirSync(path.dirname(lastGood), { recursive: true })
        writeFileSync(lastGood, stdout)
        return `export default ${JSON.stringify(stdout)}`
      }
      if (!canFallBack || !existsSync(lastGood)) return this.error(`${file} doesn't compile:\n${stderr}`)
      this.warn(`${file} doesn't compile, so the editor runs its last good compile:\n${stderr}`)
      return [
        `import { layoutPieceBroken } from "spell/app/app/layout/layoutSpell"`,
        `layoutPieceBroken(${JSON.stringify(piece)}, ${JSON.stringify(stderr.trim())})`,
        `export default ${JSON.stringify(readFileSync(lastGood, "utf8"))}`
      ].join("\n")
    }
  }
}
