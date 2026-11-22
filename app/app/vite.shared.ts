import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import solid from "@solidjs/vite-plugin"
import type { Plugin, PluginOption, ProxyOptions, UserConfig } from "vite"

import { standardDecorators } from "spell/toolchain/decorators"
import { packageVersion } from "spell/toolchain/packageVersion"
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
    cssBuildTarget()
  ]
  if (builtInFiles) plugins.push(builtInFilesBesideTheirCode())
  return {
    plugins,
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

/** Prefix of the external ids `sharedSolid()` gives `SHARED_SOLID`'s files, until `output.paths` writes them out. */
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
 * Specifiers another bundle takes from `SHARED_SOLID`'s files.
 * - Only those our code imports:
 *   `solid-js/internal` (from `@solidjs/web`) and `@solidjs/signals` (from `solid-js`) stay INSIDE `spell-solid.js`.
 * - `spell/ui/core` and `spell/ui/components/ui-root` are in `spell-solid.js`, not `spell-ui.js`:
 *   `<spell-viewer>` and `<spell-editor>` define themselves on them as their scripts run, before the rest of `ui` loads.
 * - The code and markdown families come through `spell-solid-shared.js`'s partner, `spell-ui-shared.js`
 *   (`SHARED_FAMILIES`, `DRAWN_FAMILIES`).
 * - Each through `spell-solid-shared.js`:  the page's copy when it has one (`SHARED_SPECIFIERS`).
 * - `@solidjs/h` (compiled spell's, in `spell-runtime.js`) has only a default export:
 *   `sharedSolid()` imports it through a module of its own (`SHARED_H`).
 */
const FROM_SHARED_SOLID = new Map<string, string>([
  ["solid-js", SHARED_SOLID.shared],
  ["@solidjs/web", SHARED_SOLID.shared],
  ["@solidjs/h", SHARED_SOLID.shared],
  // spell-element, which `<spell-viewer>` and `<spell-editor>` are written on:  `spell/ui/core` carries all of it, and
  // its `E` holds every name spell-element's does, so it comes BEFORE `spell/ui/core` (a page's module,
  // `spell-solid-shared.js`)
  ["spell/element", SHARED_SOLID.shared],
  ["spell/ui/core", SHARED_SOLID.shared],
  ["spell/ui/components/ui-root", SHARED_SOLID.shared],
  ["spell/ui", SHARED_SOLID.ui],
  // the families `<spell-code>` and `<spell-markdown>` extend, and those spell's markdown engine draws with
  ...[...Object.keys(SHARED_FAMILIES), ...DRAWN_FAMILIES].map((id) => [id, SHARED_SOLID.families] as const)
])

/**
 * The specifiers `spell-solid-shared.js` takes from the page when the page has them all:
 * keys of `globalThis.SpellUI.packModules`, the docs bundle's (`epic/src/tools/_assets/spell-ui.entry.js`).
 */
export const SHARED_SPECIFIERS = [...FROM_SHARED_SOLID]
  .filter(([, file]) => file === SHARED_SOLID.shared)
  .map(([id]) => id)

/** Solid's hyperscript, `h()`:  what compiled spell draws with, through `core`'s export (epic `output-targets` P20). */
const H_PACKAGE = "@solidjs/h"

/**
 * Shared specifiers with only a DEFAULT export, by the name `spell-solid.js` and `spell-solid-shared.js` export it as:
 * `@solidjs/h`'s `h`.
 * - The page's `SpellUI.packModules` holds the module as it is (`{ default: h }`), as a component pack imports it:
 *   `spell-solid-shared.js` renames it.
 */
export const SHARED_DEFAULTS: Readonly<Record<string, string>> = { [H_PACKAGE]: "h" }

/** Virtual module `sharedSolid()` resolves `H_PACKAGE` to:  `spell-solid-shared.js`'s `h`, as a default export. */
const SHARED_H = "\0spell-shared-h"

/**
 * `ui`'s plain DATA, tables with no Solid in them:  bundled where it's used, as any plain module is.
 * - its generated tables (`spell/ui/vocabulary/partsOfSpeech.generated`, which the bubbly look reads)
 * - the built-in sounds' names (`spell/ui/sounds`, which the language service lists;  epic `mockup` P28):
 *   where their FILES are is the page's runtime's to say (`UI.sounds`), never this copy's
 */
const UI_DATA = /^spell\/ui\/(.+\.generated|sounds)$/

/**
 * `spell/element`'s leaves that hold no state a page must share,
 * so each build bundles its own copy, as any plain module is.
 * - Today one:  `drawnWindow`, every long list's drawing, which the parser's core draws with.
 * - It imports only Solid and util's generic files, which come from the shared files as usual.
 */
const BUNDLED_ELEMENT_LEAVES = new Set(["spell/element/drawnWindow"])

/**
 * Spell UI's leaves that are plain DOM, with no element and no state a page must share:  bundled, as `UI_DATA` is.
 * - `DroppedFiles`, the uploader's reading of a desktop drop, which a view that takes files reads too (epic `language` P67).
 * - The theme tree, which a site's own theme is checked and built with (`SiteThemes`, I36):  `ThemeTokens` reads every
 *   theme and palette file (a lazy chunk each), `ThemeFile` works one out, `styles.en` is the tree itself.
 * - `SpellUIGuide`, where the Spell UI site is (epic `editor` P43):  spell's project groups name its project.  No imports.
 */
const BUNDLED_UI_LEAVES = new Set([
  "spell/ui/util/SpellUIGuide",
  "spell/ui/components/ui-uploader/DroppedFiles",
  "spell/ui/components/ui-theme-editor/ThemeTokens",
  "spell/ui/styles/ThemeFile",
  "spell/ui/styles/styles.en"
])

/** Any other import from Solid's or `ui`'s packages:  `sharedSolid()` refuses it, as the shared files may lack it. */
const SOLID_FAMILY = /^(solid-js|@solidjs\/[^/]+|spell\/ui|spell\/element)(\/|$)/

/**
 * For a build that takes Solid and `spell-ui` from `SHARED_SOLID`'s files beside it, instead of bundling its own:
 * `vite.element.config.ts`, `vite.editor.config.ts`, `vite.runner.config.ts`, `vite.code.config.ts`.
 * - Such an import resolves to an EXTERNAL id, which `output.paths` writes as `./spell-solid-shared.js` /
 *   `./spell-ui.js`:  relative.
 *   So every chunk that imports one MUST sit at the output folder's top level (ours do:  fixed names, no folders).
 * - Static and dynamic imports alike:  `import("spell/ui")` becomes `import("./spell-ui.js")`, still on demand.
 * - Side-effect imports too:  `import "spell/ui/components/ui-table"` becomes `import "./spell-ui-shared.js"`.
 * - Looked up by the import name itself, the key of the maps above and of a page's `SpellUI.packModules`
 *   (`SHARED_SPECIFIERS`;  epic `repo-split` P14, Q45).
 * - `ui`'s generated data (`UI_DATA`) is bundled, as it holds no Solid;  so are `BUNDLED_ELEMENT_LEAVES` and `BUNDLED_UI_LEAVES`.
 * - Any other Solid / `ui` specifier (`solid-js/store`, `spell/ui/runtime`) is a build ERROR:
 *   add it to `FROM_SHARED_SOLID` and to what `vite.solid.config.ts` exports, or the shared files won't have its names.
 * - Type-only imports (`@solidjs/web/types/jsx.js`) are gone before this runs.
 * - `enforce: "pre"`:  before Vite's resolver, which would resolve `spell/ui/core` to its source.
 */
export function sharedSolid(): Plugin {
  return {
    name: "spell-shared-solid",
    apply: "build",
    enforce: "pre",
    resolveId(source) {
      if (source === H_PACKAGE) return SHARED_H
      // by its import name, the key a page's `packModules` offers it under too
      const file = FROM_SHARED_SOLID.get(source)
      if (file) return { id: `${SHARED_ID}${file}`, external: true }
      if (source.startsWith(SHARED_ID)) return { id: source, external: true }
      if (UI_DATA.test(source) || BUNDLED_ELEMENT_LEAVES.has(source) || BUNDLED_UI_LEAVES.has(source)) return null
      if (SOLID_FAMILY.test(source)) {
        this.error(`"${source}" can't come from ${Object.values(SHARED_SOLID).join(" / ")}:  see sharedSolid()`)
      }
      return null
    },
    // `@solidjs/h` has only a DEFAULT export, which `spell-solid-shared.js` re-exports as `h`
    load: (id) => (id === SHARED_H ? `export { h as default } from "${SHARED_ID}${SHARED_SOLID.shared}"` : null),
    outputOptions(options) {
      return { ...options, paths: (id: string) => (id.startsWith(SHARED_ID) ? `./${id.slice(SHARED_ID.length)}` : id) }
    }
  }
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
 */
function compiledSpell(): Plugin {
  let canFallBack = false
  return {
    name: "spell-app:compiled-spell",
    enforce: "pre",
    configResolved(config) {
      canFallBack = config.command === "serve" && !process.env.VITEST
    },
    load(id) {
      const file = id.split("?")[0]!
      if (!/\.spell(?:ml)?$/.test(file) || !file.includes(LAYOUT_FOLDER)) return null
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
