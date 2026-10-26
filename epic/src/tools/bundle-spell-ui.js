/**
 * Builds spell-ui from its CURRENT working tree (spell-ui, the workspace Node's resolver finds:  `UI_DIR`),
 * then bundles `_assets/spell-ui.entry.js` into `_assets/spell-ui.js`:  ONE minified classic script (IIFE),
 * because docs open from `file://`, where browsers refuse ES modules.
 *
 *   node tools/bundle-spell-ui.js [--skip-ui-build]
 *
 * - `--skip-ui-build`:  reuse its `dist/` as is.
 * - `SPELL_UI_DIR` overrides where UI lives.
 * - UI build:  `yarn build` (`tsc && vite build`).
 *   If `tsc` fails on in-progress work, falls back to `vite build` alone, and says so.
 * - Exactly ONE Solid:  every `solid-js` / `@solidjs/*` import resolves from UI's root,
 *   so a linked package can't pick up its own `node_modules` copy.
 *   Checked against the metafile.
 * - No `import()` / `import.meta` may survive:
 *   - string-literal `import()`s (the runtime chunk, emoji data, Temporal polyfill) are inlined
 *   - `supported: { "dynamic-import": false }` turns any computed `import()` (an icon pack's `pack.js`)
 *     into a rejected promise
 * - Icons:  a classic script on `file://` can't load UI's icon packs.
 *   - So the SVGs in `ICONS` are read from UI's `fa7-free` pack at build time,
 *     and `UI.icons.register()`ed by the virtual `spell-ui:icons` module.
 *   - That module also `reset()`s the packs, so the default one is never requested.
 *   - Any other icon name draws nothing.
 * - Emoji names stay LAZY:
 *   UI's emoji data chunks (`dist/emoji/<set>/<letter>-<hash>.js`, both name sets) are NOT inlined.
 *   - Each is written as a classic script, `_assets/emoji/<set>/<letter>.js`,
 *     which a `<script>` tag loads on first use of a name in that chunk
 *     (`spell-ui:emoji` sets `EmojiData.chunkLoader`).
 *   - A page with no `<ui-emoji>` loads none.
 * - The source elements' ENGINES stay lazy the same way (`LAZY`):
 *   - `<ui-code>`'s highlight.js (with all its languages)
 *   - `<ui-markdown>`'s marked (and DOMPurify, only for `sanitized`)
 *   - NOT spell's colouring:  Spell UI holds nothing of spell (epic `repo-split` P2).  spell-app's page server adds
 *     `/element/spell-language.js` to the pages it serves, which registers `spell` with this bundle's `UI.code`;
 *     elsewhere (the epic server, `file://`) spell code shows plain (`repo-split` Q23 A).
 *
 *   - Each is built from UI's SOURCE into a classic script, `_assets/lazy/<name>.js`.
 *   - Their `dist/` chunks are stubbed out of the bundle,
 *     and `spell-ui:lazy` points UI's loader hooks (`CodeHighlighter.engineLoader` ...) at the scripts.
 *   - A page that shows no code loads none.
 *
 * The COMMENTS' own script (epic `epic-engine` P2, T3):  `_assets/spell-comments.js`, built after `spell-ui.js`.
 *
 *   node tools/bundle-spell-ui.js --comments     (only it:  it needs no UI build)
 *
 * - Entry `_assets/spell-comments.entry.js`:  the docs runtime's comments (`spell-doc-comments.js`) for the pages that
 *   load Spell UI's site bundle instead of this one (Epic UI's)
 * - A classic script (IIFE) with NO Spell UI and no Solid in it, and no global of its own:  it runs beside the page's
 *   Spell UI, never with a second one (`checkNoSpellUI()`)
 *
 * The DATA PAGES' own scripts (epic `coherence` C12), built after the comments':  each `_assets/<name>.entry.js` into
 * `_assets/<name>.js` (`DATA_PAGES`:  the commands page, the core reference, the syntax page)
 *
 *   node tools/bundle-spell-ui.js --data-pages     (only them:  they need no UI build)
 *
 * - each loads INSTEAD of `spell-ui.js`:  draws its tables, then adds `spell-ui.js` (`drawThenBoot()`)
 * - classic scripts (IIFE) with NO Spell UI and no Solid in them, as the comments' (`checkNoSpellUI()`):  the page's
 *   `spell-ui.js` draws their `<ui-*>` markup;  they bundle the helpers they import (the docs helpers, `ServerLink`,
 *   `DraftSaver` ...) instead of copying them
 * - the same paths the pages always loaded (`/_epic/assets/commands.js` ...), so no page changes
 *
 * NOT the claude.ai design bundle (Claude Design's `components/bundle.js`, with the brand's elements):  spell-brand's
 * `yarn design:bundle` since epic `repo-split` P10 (Q32), whose resolver and checks are a copy of these.
 */

import { build } from "esbuild"
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Script } from "node:vm"
import { gzipSync } from "node:zlib"

import { kb } from "spell/util/number.ts"
import { RealPath } from "spell/server/RealPath"
import { sourceNames } from "spell/toolchain/sourceNames"

import { packageDir } from "./packageDir.ts"

/** `src`, the folder of the docs tools (`tools/`). */
const DOCS = resolve(dirname(fileURLToPath(import.meta.url)), "..")
/**
 * Spell UI, the `spell-ui` package:  spell-ui, where Node's resolver finds it from here (a workspace of the top
 * `spell` install, epic `epic-engine` P10;  `packageDir()`), unless `SPELL_UI_DIR` says otherwise;  by its REAL path.
 * - esbuild resolves UI's own imports (`dist/` chunk to chunk) to real paths:  had the entry's `spell-ui/*` gone
 *   through a link, the bundle held TWO of UI's modules (`core.js` ...), so two of `spell-element`'s
 *   `ShadowEvents`, and a `<ui-button>`'s page `onClick` ran twice (epic `epic-engine` I18:  Do Now called itself off)
 */
const UI_DIR = RealPath.of(resolve(process.env.SPELL_UI_DIR ?? packageDir("spell-ui") ?? "spell-ui (not installed)"))
/** spell-element, the `spell/element` package, by its real path:  its source must never be bundled. */
const ELEMENT_DIR = packageDir("spell/element")
const ASSETS = join(DOCS, "tools/_assets")

const args = process.argv.slice(2)

const ENTRY = join(ASSETS, "spell-ui.entry.js")
const OUTFILE = join(ASSETS, "spell-ui.js")
/** Building ONLY the comments' own script (`--comments`). */
const COMMENTS_ONLY = args.includes("--comments")
/** The comments' own script:  its entry, and the classic script it's built into. */
const COMMENTS_ENTRY = join(ASSETS, "spell-comments.entry.js")
const COMMENTS_OUT = join(ASSETS, "spell-comments.js")
/** Building ONLY the data pages' own scripts (`--data-pages`). */
const DATA_PAGES_ONLY = args.includes("--data-pages")
/** The data pages' scripts, by name:  `_assets/<name>.entry.js` into `_assets/<name>.js`. */
const DATA_PAGES = ["commands", "core-reference", "spell-syntax"]
/**
 * What the runtime takes from UI's SOURCE, never `dist/` (`spellUiResolver()`):  the doc-only families' leaves (no lib
 * entry holds them) and the pure types file they read.
 */
const UI_SOURCE_ONLY = /^spell-ui\/(docs-components\/.+|components\/components\.types)$/
/** Page behaviour, the RUNTIME's file;  bundled as an empty module while it doesn't exist yet. */
const PAGE_RUNTIME = join(ASSETS, "spell-doc-runtime.js")

/** UI's Font Awesome pack, where `ICONS`' files are read from. */
const ICON_PACK = join(UI_DIR, "src/icons/icon-packs/fa7-free")

/**
 * Icons bundled into the script, as `<style>/<file name>` => the names to register it under.
 * - Names are what `<ui-icon name>` / an `icon` attribute say:  widgets' own (`search`, `close` ...) and the docs'.
 * - ~0.3-0.6 KB each:  add what a widget or doc needs, don't bundle the pack.
 */
const ICONS = {
  // widgets
  "solid/magnifying-glass": ["magnifying glass", "search"], // `<ui-input icon="search">`, `<ui-search>`
  "solid/xmark": ["xmark", "close", "remove"], // `<ui-message dismissible>`, `<ui-label removable>`, modal / toast
  "solid/circle-info": ["circle info", "info circle", "info"],
  "solid/triangle-exclamation": ["triangle exclamation", "warning sign", "warning"],
  "solid/circle-exclamation": ["circle exclamation", "warning circle"],
  "solid/circle-xmark": ["circle xmark", "times circle"],
  "solid/check": ["check", "checkmark"],
  "solid/chevron-down": ["chevron down"],
  "solid/chevron-right": ["chevron right"],
  "solid/chevron-up": ["chevron up"], // a plan item's fold button (`spell-doc-runtime.js` `wireItemFolds()`)
  "solid/link": ["link"],
  "solid/copy": ["copy"],
  "solid/bars": ["bars"],
  // spell-ui-site.html sections
  "solid/table-columns": ["table columns"],
  "solid/sun": ["sun"],
  "solid/moon": ["moon"], // dark mode
  // the theme menu in the site header (`<ui-theme-menu>`, epic `debut` P17):  its light scheme;  palette, moon, adjust
  // and check are listed for other uses
  "regular/sun": ["sun outline"],
  // an epic page's bedtime label (`<epic-page bedtime>`):  a /bedtime run is on
  "solid/bed": ["bed"],
  // status:  not done / in progress / done (epic pages)
  "regular/circle": ["circle outline"],
  "solid/circle-half-stroke": ["circle half stroke", "adjust"],
  "solid/circle-check": ["circle check", "check circle"],
  // plan-doc sections and markers
  "solid/pen-to-square": ["pen to square", "edit"],
  "solid/circle-question": ["circle question", "question circle"],
  "solid/bug": ["bug"],
  "solid/list-check": ["list check"],
  "solid/gavel": ["gavel"],
  "solid/lightbulb": ["lightbulb"],
  "solid/map": ["map"],
  "solid/layer-group": ["layer group"],
  "solid/clock-rotate-left": ["clock rotate left", "history"],
  // page meta lists (durable / plan templates)
  "solid/user": ["user"],
  "solid/flag": ["flag"],
  "solid/flask": ["flask"],
  "solid/code-branch": ["code branch"],
  "solid/folder": ["folder"],
  // a test run's screenshot picker (`<epic-test-run>`, epic `epic-engine` I75)
  "regular/file-image": ["file image"],
  "solid/calendar": ["calendar"],
  // the pony (`brand/pony.html`, epic `claude-design`)
  "solid/horse": ["horse"],
  "solid/comment": ["comment"],
  // a guide comment (`spell-doc-runtime.js`, "Guide comments"):  beside each block, on each comment
  "solid/bullhorn": ["bullhorn"],
  "solid/circle-notch": ["circle notch", "notched circle"], // a thread's "Claude: thinking…", turning
  // trade-offs (durable template)
  "solid/thumbs-up": ["thumbs up"],
  "solid/thumbs-down": ["thumbs down"],
  // master plan (`goals/` at the repo root):  one per topic
  "solid/heart": ["heart"],
  "solid/bullseye": ["bullseye"],
  "solid/users": ["users"],
  "solid/palette": ["palette"],
  "solid/feather": ["feather"],
  "solid/window-maximize": ["window maximize"],
  "solid/wand-magic-sparkles": ["wand magic sparkles", "magic"],
  "solid/desktop": ["desktop"],
  "solid/puzzle-piece": ["puzzle piece", "puzzle"],
  "solid/book-open": ["book open"],
  // an epic page's "Guide:" line (and a guide's "Epic page:" line is `map`)
  "solid/book": ["book"],
  "solid/cubes": ["cubes"],
  "solid/globe": ["globe"],
  "solid/language": ["language"],
  "solid/laptop-code": ["laptop code"],
  "solid/terminal": ["terminal"],
  // master plan:  page furniture -- horizons, dialog, notes for agents
  "solid/seedling": ["seedling"],
  "solid/tree": ["tree"],
  "solid/mountain-sun": ["mountain sun"],
  "solid/compass": ["compass"],
  "solid/route": ["route"],
  "solid/comments": ["comments"],
  "solid/rocket": ["rocket"],
  "solid/robot": ["robot"],
  "solid/hat-wizard": ["hat wizard"],
  "solid/scroll": ["scroll"],
  "solid/arrow-right": ["arrow right"],
  "solid/flag-checkered": ["flag checkered"],
  "solid/eye": ["eye"],
  // contents buttons (every page):  expand / collapse every section, fold / unfold code
  "solid/angles-down": ["angles down"],
  "solid/angles-up": ["angles up"],
  "solid/code": ["code"],
  // a wide-layout table's expand button (`spell-doc-runtime.js` `wireTableWidths()`):  wider, back into the column
  "solid/arrows-left-right": ["arrows left right"],
  "solid/arrows-left-right-to-line": ["arrows left right to line"],
  // the Epics page's sort buttons (`spell-doc-runtime.js` `wireEpicSort()`):  A to Z, by date
  "solid/arrow-down-a-z": ["arrow down a z"],
  "solid/clock": ["clock"],
  // master plan:  live pages (thoughts, Claude sessions, setup)
  "regular/comment-dots": ["comment dots"],
  // review notes:  an item Owen wrote in (outline:  a draft;  solid `comment`:  sent), and Edit on a sent note
  "regular/comment": ["comment outline"],
  // review note box (epic `windows-and-review` P2):  Later (revisit soon), and the note's Saved mark
  "regular/clock": ["clock outline"],
  "regular/floppy-disk": ["floppy disk outline"],
  "solid/arrows-rotate": ["arrows rotate", "refresh"],
  "solid/up-right-from-square": ["up right from square", "external alternate"],
  "solid/right-to-bracket": ["right to bracket", "sign in"],
  "solid/download": ["download"],
  "solid/paper-plane": ["paper plane"], // the header's Send;  a todo's "do it in the next phase" (epics)
  // new items from an epic page's page (epics `<epic-new-item>`):  the `+`;  a waiting card's Edit and Remove
  "solid/plus": ["plus"],
  "solid/pen": ["pen"],
  "solid/trash-can": ["trash can"],
  "solid/rotate-left": ["rotate left", "undo alternate"], // Undo, in the toast after a comment's deleted
  "solid/plug": ["plug"],
  "solid/circle-play": ["circle play"],
  "solid/circle-pause": ["circle pause"], // an epic's state:  paused (`spell-epic/list/EpicState`)
  // an Epics card's star (`spell-epic/list/EpicCards`):  a favourite, or not;  the Favorites group's heading
  "solid/star": ["star"],
  "regular/star": ["star outline"],
  // epic pages' review (epic `review-review`):
  // section icons, the item action menu and filter, the page header's send / files / git buttons
  "solid/file-circle-question": ["file circle question"],
  "solid/filter": ["filter"],
  "solid/ellipsis": ["ellipsis", "ellipsis horizontal"],
  "regular/circle-check": ["circle check outline", "check circle outline"],
  "regular/paper-plane": ["paper plane outline"],
  "regular/circle-right": ["circle right"],
  "regular/folder": ["folder outline"],
  "../fa7-brands/brands/git-alt": ["git", "git alt"] // the brands pack, beside `ICON_PACK`
}

/**
 * spell-epic's own names (`spell-epic/links`), which the docs runtime imports, and the kit's (`spell/util/persist`,
 * which the epic pages' stores import since epic `prefs-and-undo`, and its files import each other by):  found as
 * their source files.  esbuild adds no extension to a package's `exports`, so `spell/util/class` failed.
 */
const SPELL_EPIC = /^spell(?:-epic)?(?:\/.*)?$/

/** Bare specifiers that MUST resolve from UI's root:  Solid, all subpaths. */
const SOLID = /^(solid-js|@solidjs\/[\w-]+)(\/.*)?$/

/** UI's emoji name data:  `<set>/<letter>.json`, written out as lazy classic scripts (`writeEmojiChunks()`). */
const EMOJI_DATA = join(UI_DIR, "src/components/ui-emoji/data")

/** Where the emoji chunk scripts go, and their URL relative to the bundle. */
const EMOJI_OUT = join(ASSETS, "emoji")

/** An emoji data chunk of UI's `dist/` (`emoji/cldr/a-UMC54g9e.js`), as imported by the emoji family. */
const EMOJI_CHUNK = /(?:^|\/)emoji\/[\w-]+\/\w+-[\w-]+\.js$/

/** Where the lazy engine scripts go, and their URL relative to the bundle. */
const LAZY_OUT = join(ASSETS, "lazy")

/**
 * The source elements' engines, each a lazy classic script `lazy/<name>.js` defining `global`:
 * - `source`:  UI SOURCE file it's built from (it MUST import nothing of UI's by value)
 * - `chunk`:  its chunk in UI's `dist/`, stubbed out of the bundle
 * - `hook`:  how `spell-ui:lazy` installs it
 */
const LAZY = [
  {
    name: "code-engine",
    global: "__spellCodeEngine",
    source: join(UI_DIR, "src/components/ui-code/CodeEngine.ts"),
    chunk: /(?:^|\/)CodeEngine-[\w-]+\.js$/,
    hook: `CodeHighlighter.engineLoader = () => lazy("code-engine", "__spellCodeEngine")`
  },
  {
    name: "markdown-engine",
    global: "__spellMarkdownEngine",
    source: join(UI_DIR, "src/components/ui-markdown/MarkdownEngine.ts"),
    chunk: /(?:^|\/)MarkdownEngine-[\w-]+\.js$/,
    hook: `MarkdownRenderer.engineLoader = () => lazy("markdown-engine", "__spellMarkdownEngine")`
  },
  {
    name: "markdown-sanitizer",
    global: "__spellMarkdownSanitizer",
    source: join(UI_DIR, "src/components/ui-markdown/MarkdownSanitizer.ts"),
    chunk: /(?:^|\/)MarkdownSanitizer-[\w-]+\.js$/,
    hook: `MarkdownRenderer.sanitizerLoader = () => lazy("markdown-sanitizer", "__spellMarkdownSanitizer")`
  }
]

if (!COMMENTS_ONLY && !DATA_PAGES_ONLY) {
  if (!args.includes("--skip-ui-build")) buildUI()
  writeEmojiChunks()
  await writeLazyScripts()
  const warnings = await bundle()
  report(warnings)
}
if (!DATA_PAGES_ONLY) report(await bundleComments(), COMMENTS_OUT)
if (!COMMENTS_ONLY)
  for (const name of DATA_PAGES) {
    const out = join(ASSETS, `${name}.js`)
    report(await bundleShared(join(ASSETS, `${name}.entry.js`), out), out)
  }

////////////////
// ## UI build
////////////////

/**
 * Builds UI from its working tree -- "latest UI" is whatever is checked out there.
 * - `yarn build` type-checks first;  in-progress UI work may not, so fall back to `vite build` rather than fail.
 */
function buildUI() {
  if (!existsSync(join(UI_DIR, "package.json"))) fail(`no UI checkout at ${UI_DIR} (set SPELL_UI_DIR)`)
  if (run("yarn", ["build"], "build spell-ui (tsc + vite)", { allowFailure: true })) return
  console.warn("!! UI's tsc failed:  building with `vite build` alone (the bundle may carry type errors)")
  run("yarn", ["vite", "build"], "build spell-ui (vite only)")
}

/**
 * Runs `command` in UI's folder (or `cwd`), quietly;  prints its output only if it fails.
 * - Returns whether it succeeded;  exits unless `allowFailure`.
 */
function run(command, commandArgs, label, { allowFailure = false, cwd = UI_DIR } = {}) {
  console.log(`-- ${label}`)
  const result = spawnSync(command, commandArgs, { cwd, encoding: "utf8", shell: false })
  if (result.status === 0) return true
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ?? ""}`.trim()
  console.error(output.split("\n").slice(-40).join("\n"))
  if (!allowFailure) fail(`${command} ${commandArgs.join(" ")} failed in ${cwd}`)
  return false
}

////////////////
// ## Bundle
////////////////

/**
 * Bundles the entry into `OUTFILE`, then checks the output is safe for a classic script on `file://`.
 * - Returns esbuild's warnings, as text.
 */
async function bundle() {
  const dist = join(UI_DIR, "dist/index.js")
  if (!existsSync(dist)) fail(`${relative(DOCS, dist)} is missing:  run without --skip-ui-build`)
  mkdirSync(dirname(OUTFILE), { recursive: true })
  const result = await build({
    entryPoints: [ENTRY],
    outfile: OUTFILE,
    bundle: true,
    format: "iife",
    globalName: "SpellUI",
    platform: "browser",
    // UI targets current browsers only (anchor positioning, `light-dark()`):  lower nothing but `import()`
    target: "esnext",
    supported: { "dynamic-import": false },
    // `BuiltInPacks.base` is only read to load a pack, and `spell-ui:icons` drops them all first
    define: { "import.meta.url": "undefined" },
    minify: true,
    legalComments: "eof",
    metafile: true,
    logLevel: "silent",
    // the docs runtime's own imports of spell-epic (`spell-epic/links` ...), as their source files
    plugins: [spellUiResolver(), sourceNames(SPELL_EPIC)]
  })
  checkOneSolid(result.metafile)
  checkEachFileOnce(result.metafile)
  checkNoElementSource(result.metafile)
  checkClassicScript()
  return result.warnings.map((warning) => `${warning.location?.file ?? ""}: ${warning.text}`)
}

/** Bundles the comments' own script, `COMMENTS_ENTRY` into `COMMENTS_OUT` (`bundleShared()`). */
async function bundleComments() {
  return bundleShared(COMMENTS_ENTRY, COMMENTS_OUT)
}

/**
 * Bundles `entry` into `outfile`, a script that runs BESIDE the page's Spell UI (the comments', a data page's), then
 * checks it has no Spell UI or Solid in it and runs as a classic script.
 * - no `globalName`:  `window.SpellUI` stays the page's
 * - Returns esbuild's warnings, as text.
 */
async function bundleShared(entry, outfile) {
  const result = await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "esnext",
    supported: { "dynamic-import": false },
    minify: true,
    legalComments: "eof",
    metafile: true,
    logLevel: "silent",
    plugins: [sourceNames(SPELL_EPIC)]
  })
  checkNoSpellUI(result.metafile, outfile)
  checkClassicScript(outfile)
  return result.warnings.map((warning) => `${warning.location?.file ?? ""}: ${warning.text}`)
}

/**
 * esbuild plugin wiring the entry to UI:
 * - `spell-ui` ~== `dist/index.js`, `spell-ui/<entry>` ~== `dist/<entry>.js`,
 *   `spell-ui/components/ui-code` ~== `dist/ui-code.js`
 *   (mirrors UI's published `exports`, its `package.json`'s `publishConfig`)
 * - Solid imports resolve from UI's root (`SOLID`), whoever imports them
 * - `spell-ui:icons`:  the generated icon registrations (`iconsModule()`)
 * - the page runtime:  an empty module until its file exists
 * - the doc-only families' plain-DOM leaves the runtime lands links with (`TocIndex`, `HashLanding`;  epic `coherence`
 *   P11), and the pure types they read:  from UI's SOURCE (`UI_SOURCE_ONLY`), as UI's lib build never holds
 *   `src/docs-components/`;  what they import of `spell-ui/util` is `dist/core.js`'s, the page's one copy
 */
function spellUiResolver() {
  return {
    name: "spell-ui-resolver",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^spell-ui:icons$/ }, () => ({ path: "icons", namespace: "spell-ui" }))
      pluginBuild.onResolve({ filter: /^spell-ui:emoji$/ }, () => ({ path: "emoji", namespace: "spell-ui" }))
      pluginBuild.onResolve({ filter: /^spell-ui:lazy$/ }, () => ({ path: "lazy", namespace: "spell-ui" }))
      // the engines' `dist/` chunks:  never inlined (`spell-ui:lazy` loads them as scripts);  an empty stand-in
      for (const { chunk } of LAZY) {
        pluginBuild.onResolve({ filter: chunk }, () => ({ path: "lazy-chunk", namespace: "spell-ui" }))
      }
      // UI's emoji data chunks:  never inlined (`EmojiData.chunkLoader` loads them as scripts);  an empty stand-in
      pluginBuild.onResolve({ filter: EMOJI_CHUNK }, () => ({ path: "emoji-chunk", namespace: "spell-ui" }))
      pluginBuild.onLoad({ filter: /.*/, namespace: "spell-ui" }, (loaded) => {
        if (loaded.path === "icons") return { contents: iconsModule(), resolveDir: ASSETS, loader: "js" }
        if (loaded.path === "emoji") return { contents: emojiModule(), resolveDir: ASSETS, loader: "js" }
        if (loaded.path === "emoji-chunk") return { contents: "export default {}", loader: "js" }
        if (loaded.path === "lazy") return { contents: lazyModule(), resolveDir: ASSETS, loader: "js" }
        if (loaded.path === "lazy-chunk") return { contents: "export {}", loader: "js" }
        return { contents: "", loader: "js" }
      })
      pluginBuild.onResolve({ filter: UI_SOURCE_ONLY }, ({ path }) => ({
        path: join(UI_DIR, "src", `${path.slice("spell-ui/".length)}.ts`)
      }))
      // every file of UI's `dist/` HAS side effects (each family defines its tags as it's imported):  its
      // `package.json`'s `sideEffects` names only its `src/` files, so esbuild dropped the families `dist/` files import
      // by relative path, and their tags stayed pending (epic `epic-engine` P29)
      pluginBuild.onResolve({ filter: /^spell-ui(\/.*)?$/ }, ({ path }) => ({
        path: uiDistPath(path),
        sideEffects: true
      }))
      pluginBuild.onResolve({ filter: /^\.\.?\// }, ({ path, importer, resolveDir }) => {
        const file = resolve(resolveDir, path)
        const inDist = importer.startsWith(join(UI_DIR, "dist")) && file.endsWith(".js") && existsSync(file)
        return inDist ? { path: file, sideEffects: true } : undefined
      })
      pluginBuild.onResolve({ filter: SOLID }, async ({ path, kind, pluginData }) => {
        if (pluginData?.fromUiRoot) return undefined
        const resolved = await pluginBuild.resolve(path, { kind, resolveDir: UI_DIR, pluginData: { fromUiRoot: true } })
        return resolved.errors.length ? { errors: resolved.errors } : { path: resolved.path }
      })
      pluginBuild.onResolve({ filter: /spell-doc-runtime\.js$/ }, ({ path, resolveDir }) => {
        const file = resolve(resolveDir, path)
        if (file === PAGE_RUNTIME && !existsSync(file)) {
          console.warn(`!! ${relative(DOCS, file)} doesn't exist yet:  bundled as an empty module`)
          return { path: "page-runtime", namespace: "spell-ui" }
        }
        return undefined
      })
    }
  }
}

/**
 * File in UI's `dist/` for a `spell-ui[/...]` specifier:  a family's folder (`components/ui-code`) is its own file
 * (`dist/ui-code.js`), as UI's published `exports` have it.
 */
function uiDistPath(specifier) {
  const sub = specifier
    .slice("spell-ui".length)
    .replace(/^\//, "")
    .replace(/^components\/(ui-[a-z-]+)$/, "$1")
    // `spell-ui/util` is all in `core` (`src/core.ts` re-exports it), and has no file of its own
    .replace(/^util$/, "core")
  if (!sub) return join(UI_DIR, "dist/index.js")
  return join(UI_DIR, "dist", `${sub}.js`)
}

/**
 * Source of `spell-ui:icons`:  each of `ICONS`' SVG text, `UI.icons.register()`ed under each of its names.
 * - Imports `UI` from `spell-ui/core` -- the same module `index.js` uses --
 *   so this runs BEFORE any family defines (and so upgrades) its elements.
 * - Registers in the FIRST `UI.load()` callback:
 *   every element `await`s that same promise before drawing an icon, so the names are in place first.
 * - `reset()`:  drop every pack, so the default pack's index is never requested (it can't load from `file://`).
 */
function iconsModule() {
  const icons = Object.entries(ICONS).map(([file, names]) => {
    const path = join(ICON_PACK, `${file}.svg`)
    if (!existsSync(path)) fail(`no icon ${relative(DOCS, path)}:  check ICONS against UI's fa7-free pack`)
    return [names, readFileSync(path, "utf8")]
  })
  return [
    `import { UI } from "spell-ui/core"`,
    `const ICONS = ${JSON.stringify(icons)}`,
    `UI.load().then((ui) => {`,
    `  ui.icons.reset()`,
    `  for (const [names, svg] of ICONS) for (const name of names) ui.icons.register(name, svg)`,
    `})`
  ].join("\n")
}

/**
 * Source of `bundleUrl(dir)`, shared by `spell-ui:emoji` and `spell-ui:lazy`:
 * the folder `dir` next to the bundle, or `null` where there's no URL to resolve against.
 * - NEVER throws while the bundle loads (epic `claude-design`, P1).
 *   An INLINED copy (a claude.ai design system's preview inlines it):
 *   - has `document.currentScript.src === ""`, so `??` wouldn't fall back
 *   - and its frame's `location.href` is `about:srcdoc`, which no relative URL resolves against
 * - `null`:  `new URL(x, null)` throws inside the loaders' promise executors, so a lazy script rejects instead
 * - a function, not a `const`:  the build runs from the top of this file, before a `const` down here is set
 */
function baseUrlSource() {
  return [
    `function bundleUrl(dir) {`,
    `  try {`,
    `    return new URL(dir, document.currentScript?.src || location.href)`,
    `  } catch {`,
    `    return null`,
    `  }`,
    `}`
  ].join("\n")
}

/**
 * Source of `spell-ui:emoji`:
 * `EmojiData.chunkLoader` loads a name chunk as the classic script `emoji/<set>/<letter>.js` next to the bundle,
 * which hands its names to `__spellEmojiChunk()`.
 * - The bundle's own URL (`document.currentScript`, read while it runs) locates the scripts, at any page depth.
 */
function emojiModule() {
  return [
    `import { EmojiData } from "spell-ui/components/ui-emoji"`,
    baseUrlSource(),
    `const base = bundleUrl("emoji/")`,
    `const waiting = new Map()`,
    `globalThis.__spellEmojiChunk = (set, chunk, names) => waiting.get(set + "/" + chunk)?.(names)`,
    `EmojiData.chunkLoader = (set, chunk) =>`,
    `  new Promise((resolve, reject) => {`,
    `    const id = set + "/" + chunk`,
    `    const script = document.createElement("script")`,
    `    waiting.set(id, (names) => { waiting.delete(id); resolve(names) })`,
    `    script.src = new URL(id + ".js", base).href`,
    `    script.onload = () => script.remove()`,
    `    script.onerror = () => { waiting.delete(id); script.remove(); reject(new Error("no emoji chunk " + id)) }`,
    `    document.head.append(script)`,
    `  })`
  ].join("\n")
}

/**
 * Writes every emoji name chunk of UI's data (`<set>/<letter>.json`) as `_assets/emoji/<set>/<letter>.js`:
 * a classic script handing its names to `__spellEmojiChunk()`.
 * The folder is emptied first, so a dropped chunk doesn't linger.
 */
function writeEmojiChunks() {
  rmSync(EMOJI_OUT, { recursive: true, force: true })
  let files = 0
  for (const set of readdirSync(EMOJI_DATA)) {
    mkdirSync(join(EMOJI_OUT, set), { recursive: true })
    for (const file of readdirSync(join(EMOJI_DATA, set)).filter((name) => name.endsWith(".json"))) {
      const chunk = file.slice(0, -".json".length)
      const names = JSON.parse(readFileSync(join(EMOJI_DATA, set, file), "utf8"))
      const body = `__spellEmojiChunk(${JSON.stringify(set)}, ${JSON.stringify(chunk)}, ${JSON.stringify(names, null, 2)})\n`
      writeFileSync(
        join(EMOJI_OUT, set, `${chunk}.js`),
        `// generated by tools/bundle-spell-ui.js:  edit UI's data\n${body}`
      )
      files++
    }
  }
  console.log(`-- _assets/emoji/  ${files} lazy name chunks`)
}

////////////////
// ## Checks
////////////////

/** Fails if two copies of a Solid package made it into the bundle, e.g. from a linked package's own `node_modules`. */
function checkOneSolid(metafile) {
  const copies = new Map()
  for (const input of Object.keys(metafile.inputs)) {
    const match = input.match(/node_modules\/((?:@[\w-]+\/)?[\w-]+)\//)
    if (!match || !SOLID.test(match[1])) continue
    const root = input.slice(0, match.index + match[0].length)
    copies.set(match[1], new Set([...(copies.get(match[1]) ?? []), root]))
  }
  for (const [name, roots] of copies) {
    if (roots.size > 1) fail(`${name} bundled ${roots.size} times:\n  ${[...roots].join("\n  ")}`)
  }
  if (!copies.has("solid-js")) fail("solid-js isn't in the bundle:  check the resolver")
}

/**
 * Fails if spell-element's SOURCE made it into the bundle:  a second copy beside the one Spell UI's `dist/core.js`
 * carries, so two `UIComponent`s and two `ShadowEvents` (epic `epic-engine` P9).
 */
function checkNoElementSource(metafile) {
  const sources = Object.keys(metafile.inputs).filter((input) => isInside(RealPath.of(resolve(input)), ELEMENT_DIR))
  if (sources.length) fail(`spell-element bundled from its source, a second copy:\n  ${sources.join("\n  ")}`)
}

/**
 * Fails if `outfile` (the comments' own script, a data page's) took in any of Spell UI, spell-element or Solid:  the
 * page it runs on has its own,
 * and two copies handle every event twice (epic `epic-engine` I18).
 */
function checkNoSpellUI(metafile, outfile = COMMENTS_OUT) {
  const shared = Object.keys(metafile.inputs).filter(
    (input) =>
      [UI_DIR, ELEMENT_DIR].some((dir) => isInside(RealPath.of(resolve(input)), dir)) ||
      /node_modules\/(?:solid-js|@solidjs)\//.test(input)
  )
  if (shared.length) fail(`${relative(DOCS, outfile)} took in what the page shares:\n  ${shared.join("\n  ")}`)
}

/**
 * Fails if one file made it into the bundle under two paths (a link's and its real one):  two module instances, so two
 * of UI's `UIComponent`, `ShadowEvents` ... (epic `epic-engine` I18).
 */
function checkEachFileOnce(metafile) {
  const seen = new Map()
  for (const input of Object.keys(metafile.inputs)) {
    if (input.includes(":")) continue
    const real = RealPath.of(resolve(input))
    const other = seen.get(real)
    if (other) fail(`${real} bundled twice, as ${other} and ${input}:  resolve both through its real path`)
    seen.set(real, input)
  }
}

/**
 * Fails if the output still needs ES module machinery a classic script on `file://` doesn't have.
 * - A top-level `import` / `export`, or `import.meta`:  it won't PARSE as a classic script.
 *   Parsed, not searched, since the writers carry program text in their strings
 *   (the Python writer's `import os`, the page contract's `export function adopt`).
 * - A runtime `import()` parses fine, and fails only once it runs, so that one is searched for:
 *   - esbuild always prints it as `import(`, no space
 *     (so a regex in the Python writer, `/^from spell_core import (.*)$/`, isn't one)
 *   - a call, not a METHOD called `import` (spell's parser has one:  `x.import(y)`, `import(...rules) {`)
 */
function checkClassicScript(file = OUTFILE) {
  const code = readFileSync(file, "utf8")
  const problems = []
  try {
    new Script(code, { filename: file })
  } catch (error) {
    problems.push(`a module-only form (${error.message})`)
  }
  if (/(?<![.\w$])import\((?![^)]*\)\s*\{)/.test(code)) problems.push("a runtime import()")
  if (problems.length) fail(`${relative(DOCS, file)} still has ${problems.join(", ")}`)
}

////////////////
// ## Lazy engines
////////////////

/**
 * Builds each of `LAZY` from UI's source into `_assets/lazy/<name>.js`:
 * a classic script (IIFE) defining its `global` as the module's exports, every `import()` inside it inlined.
 * - Sizes are printed;  each is checked like the bundle (no `import()` / `import.meta` may survive).
 */
async function writeLazyScripts() {
  rmSync(LAZY_OUT, { recursive: true, force: true })
  mkdirSync(LAZY_OUT, { recursive: true })
  for (const { name, global, source } of LAZY) {
    const outfile = join(LAZY_OUT, `${name}.js`)
    await build({
      entryPoints: [source],
      outfile,
      bundle: true,
      format: "iife",
      globalName: global,
      platform: "browser",
      target: "esnext",
      supported: { "dynamic-import": false },
      minify: true,
      keepNames: true,
      legalComments: "eof",
      // Spell UI's own names in its source (`spell-ui/runtime/runtime.types`, each engine's `SourceError`), found as
      // their files;  its `tsconfig.json` for the rest (JSX, decorators)
      tsconfig: join(UI_DIR, "tsconfig.json"),
      plugins: [sourceNames()],
      logLevel: "silent"
    })
    checkClassicScript(outfile)
    const code = readFileSync(outfile)
    console.log(`-- ${relative(DOCS, outfile)}  ${kb(code.length)}  (gzip ${kb(gzipSync(code).length)})`)
  }
}

/**
 * Source of `spell-ui:lazy`:  points UI's engine loaders at `lazy/<name>.js`,
 * loaded once as a classic script next to the bundle, resolving with the global it defines.
 * - The bundle's own URL (`document.currentScript`, read while it runs) locates the scripts, at any page depth.
 */
function lazyModule() {
  return [
    `import { CodeHighlighter } from "spell-ui/components/ui-code"`,
    `import { MarkdownRenderer } from "spell-ui/components/ui-markdown"`,
    baseUrlSource(),
    `const base = bundleUrl("lazy/")`,
    `const loading = new Map()`,
    `function lazy(name, global) {`,
    `  if (!loading.has(name)) {`,
    `    loading.set(name, new Promise((resolve, reject) => {`,
    `      const script = document.createElement("script")`,
    `      script.src = new URL(name + ".js", base).href`,
    `      script.onload = () => (globalThis[global] ? resolve(globalThis[global]) : reject(new Error(name + " defined nothing")))`,
    `      script.onerror = () => { loading.delete(name); script.remove(); reject(new Error("no lazy script " + name)) }`,
    `      document.head.append(script)`,
    `    }))`,
    `  }`,
    `  return loading.get(name)`,
    `}`,
    ...LAZY.map(({ hook }) => hook)
  ].join("\n")
}

////////////////
// ## Output
////////////////

/** Prints a bundle's size (raw, gzip) and any esbuild warnings:  `file`, by default the main one. */
function report(warnings, file = OUTFILE) {
  const code = readFileSync(file)
  console.log(`-- ${relative(DOCS, file)}  ${kb(code.length)}  (gzip ${kb(gzipSync(code).length)})`)
  for (const warning of warnings) console.warn(`!! ${warning}`)
}

/** Prints `message` and exits with an error. */
function fail(message) {
  console.error(`!! ${message}`)
  process.exit(1)
}

/** Is `path` in folder `dir` (both real paths)?  Never when there's no `dir`. */
function isInside(path, dir) {
  return dir !== undefined && (path === dir || path.startsWith(`${dir}/`))
}
