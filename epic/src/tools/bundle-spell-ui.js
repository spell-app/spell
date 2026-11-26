/**
 * Builds the docs pages' scripts in `_assets/`, from `epic/` (the page server runs it when they're stale:
 * `spell bundle epic-docs`).  None is committed (epic `solid-2-final` P7):  each is git-ignored, built where it's served.
 *
 *   node src/tools/bundle-spell-ui.js [--comments | --data-pages]
 *
 * The DOCS BUNDLE:  `_assets/spell-ui.entry.js` into `_assets/spell-ui/` (`main.js` and its chunks), an ES module build
 * from Spell UI's SOURCE, with Vite, on Spell UI's own settings (`baseConfig()`), as the Spell UI site's bundle is.
 * - A page names `spell-ui.js`, a few lines of classic script, committed, which imports `spell-ui/main.js`:
 *   no page was rewritten, and an older checkout's pages still load.
 * - Code-split:  every family, the runtime, the source elements' engines (highlight.js, marked, Mermaid, ELK), emoji
 *   names and the theme sheets are lazy chunks, loaded the first time a page needs them (the entry's header says how).
 * - Built into a folder of this run's (`.spell-ui-building-<pid>`), then swapped in whole:  two runs at once (the page
 *   server's, one by hand) never empty each other's (epic `epic-engine` I361).
 * - A brotli copy beside each file (`brotliCopies()`):  the kit's servers send it as it is.
 * - Exactly ONE Solid, and the kit's element layer once:  checked against what the build bundled (`checkOneCopy()`).
 * - Icons:  the SVGs in `ICONS` are read from Spell UI's `fa7-free` pack at build time and `UI.icons.register()`ed by
 *   the virtual `spell-ui:icons` module, which also `reset()`s the packs:  no page fetches an icon pack;  any other
 *   icon name draws nothing.
 * - Spell's colouring is NOT in it:  Spell UI holds nothing of spell (epic `repo-split` P2).  The kit's page server adds
 *   the app's `/element/spell-language.js` to the pages it serves, which registers `spell` with this bundle's `UI.code`.
 * - Until P7 it was ONE classic script (an IIFE) of every family, built from Spell UI's `dist/` (a `yarn build` there
 *   first), with the engines and emoji names as classic scripts of their own (`lazy/`, `emoji/`), so a page opened from
 *   `file://` worked:  pages are always served now (epic `epic-engine` P46).
 *
 * The COMMENTS' own script (epic `epic-engine` P2, T3):  `_assets/spell-comments.js`.
 *
 *   node src/tools/bundle-spell-ui.js --comments     (only it)
 *
 * - Entry `_assets/spell-comments.entry.js`:  the docs runtime's comments (`spell-doc-comments.js`) for the pages that
 *   load Spell UI's site bundle instead of this one (Epic UI's)
 * - A classic script (IIFE) with NO Spell UI and no Solid in it, and no global of its own:  it runs beside the page's
 *   Spell UI, never with a second one (`checkNoSpellUI()`)
 *
 * The REFERENCE PAGES' own scripts (epic `coherence` C12;  "data pages" until epic `data` Q104):  each
 * `_assets/<name>.entry.js` into `_assets/<name>.js` (`DATA_PAGES`:  the commands page, the core reference, the syntax
 * page)
 *
 *   node src/tools/bundle-spell-ui.js --data-pages     (only them)
 *
 * - each loads INSTEAD of `spell-ui.js`:  draws its tables, then adds `spell-ui.js` (`drawThenBoot()`)
 * - classic scripts (IIFE) with NO Spell UI and no Solid in them, as the comments' (`checkNoSpellUI()`):  the page's
 *   `spell-ui.js` draws their `<ui-*>` markup;  they bundle the helpers they import (the docs helpers, `ServerLink`,
 *   `DraftSaver` ...) instead of copying them
 * - the same paths the pages always loaded (`/_epic/assets/commands.js` ...), so no page changes
 *
 * NOT the claude.ai design bundle (Claude Design's `components/bundle.js`, with the brand's elements):  spell-brand's
 * `yarn design:bundle` since epic `repo-split` P10 (Q32).
 */

import { build } from "esbuild"
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Script } from "node:vm"
import { brotliCompressSync, gzipSync } from "node:zlib"

import { kb } from "spell/util/number.ts"
import { RealPath } from "spell/server/RealPath"
import { sourceNames } from "spell/toolchain/sourceNames"

import { packageDir } from "./packageDir.ts"

/** `src`, the folder of the docs tools (`tools/`). */
const DOCS = resolve(dirname(fileURLToPath(import.meta.url)), "..")
/** Spell UI, the `spell-ui` workspace, where Node's resolver finds it from here (`packageDir()`), by its REAL path. */
const UI_DIR = RealPath.of(resolve(packageDir("spell-ui") ?? "spell-ui (not installed)"))
/** The kit's element layer, `spell/element`, by its real path:  bundled ONCE (`checkOneCopy()`). */
const ELEMENT_DIR = packageDir("spell/element")
const ASSETS = join(DOCS, "tools/_assets")

const args = process.argv.slice(2)

/** The docs bundle's entry. */
const ENTRY = join(ASSETS, "spell-ui.entry.js")
/** The docs bundle's folder:  `main.js` and its chunks.  `spell-ui.js`, the classic script a page names, imports it. */
const MODULES = join(ASSETS, "spell-ui")
/** The docs bundle's entry module, in `MODULES`. */
const MAIN = "main.js"
/** Building ONLY the comments' own script (`--comments`). */
const COMMENTS_ONLY = args.includes("--comments")
/** The comments' own script:  its entry, and the classic script it's built into. */
const COMMENTS_ENTRY = join(ASSETS, "spell-comments.entry.js")
const COMMENTS_OUT = join(ASSETS, "spell-comments.js")
/** Building ONLY the reference pages' own scripts (`--data-pages`). */
const DATA_PAGES_ONLY = args.includes("--data-pages")
/** The reference pages' scripts, by name:  `_assets/<name>.entry.js` into `_assets/<name>.js`. */
const DATA_PAGES = ["commands", "core-reference", "spell-syntax"]

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
  "solid/check-double": ["check double"], // a section's Close all (epic `epic-engine` T158)
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
  "solid/gear": ["gear", "cog"], // a fold's gear menu (`EpicFold.renderGear()`, I166)
  "solid/square-check": ["square check", "check square"], // a gear menu's entry, on
  "regular/square": ["square outline"], // ... and off
  // a picture chooser:  a note box's (`<epic-review>`, epic `epic-engine` P51), an option's (`<epic-option-form>`)
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
  "solid/arrows-up-down": ["arrows up down"], // a Feature Set's Reorder buttons
  "solid/arrow-up": ["arrow up"], // its reorder dialog:  move up, move down, the handle to drag by
  "solid/arrow-down": ["arrow down"],
  "solid/grip-vertical": ["grip vertical"],
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
  // the formatting bar of `<ui-markdown editable>`'s box (epic `epic-engine` P61)
  "solid/bold": ["bold"],
  "solid/italic": ["italic"],
  "solid/strikethrough": ["strikethrough"],
  "solid/list-ul": ["list ul", "list"],
  "solid/list-ol": ["list ol", "ordered list"],
  "solid/eraser": ["eraser"],
  "solid/circle-play": ["circle play"],
  "solid/circle-pause": ["circle pause"], // an epic's state:  paused (`spell/epic/list/EpicState`)
  // the Servers tab's buttons (`servers-page.js`):  start, restart, stop
  "solid/play": ["play"],
  "solid/rotate-right": ["rotate right"],
  "solid/stop": ["stop"],
  // its secure link card's Turn on and Turn off (epic `epic-engine` T164)
  "solid/lock": ["lock"],
  "solid/unlock": ["unlock"],
  // an Epics card's star (`spell/epic/list/EpicCards`):  a favourite, or not;  the Favorites group's heading
  "solid/star": ["star"],
  // the epic page gear's Tidy (epic `epic-engine` T168)
  "solid/broom": ["broom"],
  // the epic page gear's Bells & Whistles (epic `epic-engine` P86, T171)
  "solid/bell": ["bell"],
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
 * spell-epic's own names (`spell/epic/links`), which the comments' and reference pages' scripts import, and the kit's
 * (`spell/util/persist` ...):  found as their source files.  esbuild adds no extension to a package's `exports`, so
 * `spell/util/class` failed.
 * - NOT Spell UI's (`spell/ui/...`):  those scripts hold none of it (`checkNoSpellUI()`).
 * - No lookahead:  esbuild runs the filter as a Go regular expression, which has none,
 *   so "anything but `ui`" is spelled out (`u` alone, `u` then not `i`, `ui` then not `/`).
 */
const SPELL_EPIC = /^spell(?:-epic)?(?:\/(?:[^u].*|u|u[^i].*|ui[^/].*))?$/

/**
 * The family folders the entry loads at once on every page (its `EVERY_PAGE`):  their modules make one chunk.
 * - Keep the two lists in step;  a family in only one still works, as a chunk of its own.
 */
const EVERY_PAGE_FAMILIES =
  /[\\/]ui[\\/]src[\\/]components[\\/](ui-section|ui-button|ui-icon|ui-label|ui-menu|ui-toolbar|ui-breadcrumbs|ui-divider|ui-dropdown|ui-popup|ui-sticky|ui-table|ui-theme-menu)[\\/]/

/** A Solid package, by its folder under `node_modules`. */
const SOLID = /^(solid-js|@solidjs\/[\w-]+)$/

if (!COMMENTS_ONLY && !DATA_PAGES_ONLY) await bundle()
if (!DATA_PAGES_ONLY) report(await bundleShared(COMMENTS_ENTRY, COMMENTS_OUT), COMMENTS_OUT)
if (!COMMENTS_ONLY)
  for (const name of DATA_PAGES) {
    const out = join(ASSETS, `${name}.js`)
    report(await bundleShared(join(ASSETS, `${name}.entry.js`), out), out)
  }

////////////////
// ## The docs bundle
////////////////

/**
 * Builds the entry into `MODULES`, with Vite on Spell UI's `baseConfig()` (decorators BEFORE Solid, Solid's JSX,
 * Lightning CSS, one Solid), then prints its sizes.
 * - Built in a folder of this run's, then swapped in whole (`buildingFolder()`).
 * - Stable names where they can be:  `main.js`;  every chunk `<name>-<hash>.js`.
 * - `base: "./"`:  chunk URLs relative to the chunk importing them, so it works under `/_epic/assets/` and under a
 *   worktree's address alike.
 */
async function bundle() {
  const [{ build: viteBuild }, { baseConfig }, { brotliCopies }] = await Promise.all([
    import("vite-plus"),
    import("spell/ui/vite.config.ts"),
    import("spell/toolchain/brotliCopies")
  ])
  const building = buildingFolder()
  rmSync(building, { recursive: true, force: true })
  const base = baseConfig()
  const started = performance.now()
  const ids = []
  try {
    await viteBuild({
      ...base,
      configFile: false,
      root: ASSETS,
      base: "./",
      publicDir: false,
      logLevel: "warn",
      plugins: [...(base.plugins ?? []), docsModules(ids), brotliCopies()],
      build: {
        outDir: building,
        emptyOutDir: true,
        sourcemap: false,
        minify: true,
        target: "esnext",
        modulePreload: { polyfill: false },
        reportCompressedSize: false,
        // Mermaid and highlight.js's languages are big lazy chunks, loaded only when used
        chunkSizeWarningLimit: 3000,
        rolldownOptions: {
          input: { main: ENTRY },
          preserveEntrySignatures: "allow-extension",
          // a family both loaded on first use and imported by another (`<ui-button>`) is common here, as on the site
          checks: { ineffectiveDynamicImport: false, pluginTimings: false },
          output: {
            // custom element class names are read by dev-time warnings and the manifest (see Spell UI's `vite.config.ts`)
            keepNames: true,
            entryFileNames: "[name].js",
            chunkFileNames: "[name]-[hash].js",
            assetFileNames: "[name]-[hash][extname]",
            // the families nearly every page draws (the entry's `EVERY_PAGE`, loaded at once), and what they share,
            // in ONE chunk:  dozens of small ones were a round trip each on a slow network
            codeSplitting: { groups: [{ name: "every-page", test: EVERY_PAGE_FAMILIES }] }
          }
        }
      }
    })
    checkOneCopy(ids)
    swapIn(building, MODULES)
  } finally {
    rmSync(building, { recursive: true, force: true })
  }
  reportFolder(MODULES, (performance.now() - started) / 1000)
}

/**
 * `building` becomes `folder`, the old one gone.
 * - Another run may swap its own in between the two steps (the page server's, one by hand):  then this one goes in
 *   again, once, over that one (the same sources, so the same files).
 */
function swapIn(building, folder) {
  for (let attempt = 0; ; attempt++) {
    rmSync(folder, { recursive: true, force: true })
    try {
      renameSync(building, folder)
      return
    } catch (error) {
      if (attempt || !["ENOTEMPTY", "EEXIST"].includes(error.code)) throw error
    }
  }
}

/**
 * Where this run builds the docs bundle before swapping it in:  `_assets/.spell-ui-building-<pid>`.
 * - its own per process, so a second run at the same time never touches it
 * - a dot folder:  never a bundle's source (`spell/server` `Bundle`'s `SKIPPED`), so it starts no rebuild
 */
function buildingFolder() {
  return join(ASSETS, `.spell-ui-building-${process.pid}`)
}

/**
 * Vite plugin of the docs bundle's own modules:
 * - `spell-ui:icons`:  the generated icon registrations (`iconsModule()`)
 * - and it collects every module the build bundled into `ids`, for `checkOneCopy()`
 */
function docsModules(ids) {
  const ICONS_ID = "\0spell-ui:icons"
  return {
    name: "spell-docs:modules",
    enforce: "pre",
    resolveId: (id) => (id === "spell-ui:icons" ? ICONS_ID : undefined),
    load: (id) => (id === ICONS_ID ? iconsModule() : undefined),
    generateBundle(_options, output) {
      for (const chunk of Object.values(output)) if (chunk.type === "chunk") ids.push(...chunk.moduleIds)
    }
  }
}

/**
 * Source of `spell-ui:icons`:  each of `ICONS`' SVG text, `UI.icons.register()`ed under each of its names.
 * - Imports `UI` from `spell/ui/core`, so it runs BEFORE any family defines (and so upgrades) its elements.
 * - Registers in the FIRST `UI.load()` callback:
 *   every element `await`s that same promise before drawing an icon, so the names are in place first.
 * - `reset()`:  drop every pack, so the default pack's index is never requested.
 */
function iconsModule() {
  const icons = Object.entries(ICONS).map(([file, names]) => {
    const path = join(ICON_PACK, `${file}.svg`)
    if (!existsSync(path)) fail(`no icon ${relative(DOCS, path)}:  check ICONS against UI's fa7-free pack`)
    return [names, readFileSync(path, "utf8")]
  })
  return [
    `import { UI } from "spell/ui/core"`,
    `const ICONS = ${JSON.stringify(icons)}`,
    `UI.load().then((ui) => {`,
    `  ui.icons.reset()`,
    `  for (const [names, svg] of ICONS) for (const name of names) ui.icons.register(name, svg)`,
    `})`
  ].join("\n")
}

////////////////
// ## The scripts beside the page's Spell UI
////////////////

/**
 * Bundles `entry` into `outfile`, a script that runs BESIDE the page's Spell UI (the comments', a reference page's), then
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

////////////////
// ## Checks
////////////////

/**
 * Fails if the docs bundle holds two copies of a Solid package (a linked package's own `node_modules`), or of a file
 * of the kit's element layer under two paths (a link's and its real one):  two Solids, two `UIComponent`s and
 * `ShadowEvents`, and every event handled twice (epic `epic-engine` I18).
 */
function checkOneCopy(ids) {
  const files = ids.filter((id) => id.startsWith("/")).map((id) => id.split("?")[0])
  const solids = new Map()
  for (const file of files) {
    const match = file.match(/^(.*\/node_modules\/((?:@[\w-]+\/)?[\w-]+))\//)
    if (!match || !SOLID.test(match[2])) continue
    solids.set(match[2], new Set([...(solids.get(match[2]) ?? []), RealPath.of(match[1])]))
  }
  for (const [name, roots] of solids) {
    if (roots.size > 1) fail(`${name} bundled ${roots.size} times:\n  ${[...roots].join("\n  ")}`)
  }
  if (!solids.has("solid-js")) fail("solid-js isn't in the docs bundle:  check its build")
  const seen = new Map()
  for (const file of new Set(files)) {
    if (!existsSync(file)) continue
    const real = RealPath.of(file)
    const other = seen.get(real)
    if (other && isInside(real, ELEMENT_DIR)) fail(`${real} bundled twice, as ${other} and ${file}`)
    seen.set(real, file)
  }
}

/**
 * Fails if `outfile` (the comments' own script, a reference page's) took in any of Spell UI, the kit's element layer or
 * Solid:  the page it runs on has its own, and two copies handle every event twice (epic `epic-engine` I18).
 */
function checkNoSpellUI(metafile, outfile) {
  const shared = Object.keys(metafile.inputs).filter(
    (input) =>
      [UI_DIR, ELEMENT_DIR].some((dir) => isInside(RealPath.of(resolve(input)), dir)) ||
      /node_modules\/(?:solid-js|@solidjs)\//.test(input)
  )
  if (shared.length) fail(`${relative(DOCS, outfile)} took in what the page shares:\n  ${shared.join("\n  ")}`)
}

/**
 * Fails if `file` needs ES module machinery a classic script doesn't have.
 * - A top-level `import` / `export`, or `import.meta`:  it won't PARSE as a classic script.
 *   Parsed, not searched, since the writers carry program text in their strings.
 * - A runtime `import()` parses fine, and fails only once it runs, so that one is searched for:
 *   - esbuild always prints it as `import(`, no space
 *   - a call, not a METHOD called `import` (spell's parser has one:  `x.import(y)`, `import(...rules) {`)
 */
function checkClassicScript(file) {
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
// ## Output
////////////////

/** Prints a script's size (raw, gzip) and any esbuild warnings. */
function report(warnings, file) {
  const code = readFileSync(file)
  console.log(`-- ${relative(DOCS, file)}  ${kb(code.length)}  (gzip ${kb(gzipSync(code).length)})`)
  for (const warning of warnings) console.warn(`!! ${warning}`)
}

/** Prints the docs bundle's sizes:  its entry module, and every script in it, brotli. */
function reportFolder(folder, seconds) {
  const scripts = readdirSync(folder).filter((name) => name.endsWith(".js"))
  const brotli = (name) => brotliCompressSync(readFileSync(join(folder, name))).length
  const main = readFileSync(join(folder, MAIN))
  const all = scripts.reduce((sum, name) => sum + statSync(join(folder, name)).size, 0)
  console.log(
    `-- ${relative(DOCS, join(folder, MAIN))}  ${kb(main.length)}  (brotli ${kb(brotli(MAIN))});  ` +
      `${scripts.length} scripts, ${kb(all)} in all;  ${seconds.toFixed(1)}s`
  )
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
