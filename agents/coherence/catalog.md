# The catalog:  what Spell already has

Before writing a mechanism, look here:  the ones Spell already has, and when to use each.
The coherence agent reads it too, for every sweep and plan review (epic `coherence`).

- One entry per mechanism, in four parts:
  - **It is:**  the name, and where it lives
  - **Use it when:**  the job it does, in the words a plan would use
  - **Flag:**  what a copy looks like, as a search (`rg -n '<pattern>'` over the repos' `src/`)
  - **Copies:**  the copies known today, still to move onto it
    - `--`:  none known yet.  A flag finds more than its copies:  the first sweep reads what each one finds.
- Ask the code map for more than this list holds:  `spell map uses <name>`, `spell map explain <name>`
  ([README-cli.md](../../README-cli.md), "Asking the map").
- A mechanism that doesn't exist YET, but should (several copies, no shared one):  under "Wanted", with its copies.
- Grown by each sweep, and by Owen's verdicts on its findings.
  - Sweep 1 (2026-10-25):  its five reports, with every place, are in the coherence epic's folder of the shared
    content, `details/sweep-1/`;  its findings are issues on that epic's page.
  A copy that's fine as it is goes under "Fine as it is", with why, so no sweep flags it again.
- The words:  [words.md](words.md).

## Areas

What `/coherence sweep` reads, an agent each.

| Area | Folders |
| --- | --- |
| `ui-components` | `spell-ui/src/components/`, `spell-ui/src/elements/`, `spell-ui/src/runtime/`, `spell-ui/src/styles/` |
| `ui-docs-tools` | `spell-ui/src/docs-components/`, `spell-ui/src/tools/`, `spell-ui/site/`, `spell-ui/scripts/` |
| `epic-pages` | `spell-epic/src/components/`, `spell-epic/src/tools/_assets/` (hand-written only), `spell-epic/src/answers/`, `spell-epic/src/review/` |
| `epic-tools-kit` | `spell-epic/src/` (the rest), `spell-epic/hooks/`, the kit's `src/`, `tools/`, `scripts/` |
| `parser-app` | `spell-parser/src/`, `spell-app/src/`, `spell-brand/src/`, `spell-brand/scripts/` |

## Reading text

### A new syntax

- **It is:**  a `P.Tokenizer` subclass, plus rules:  `spell-parser/parser`
- **Use it when:**  reading any language or format of our own:  tags, a file format, a mini-language.
  - The tokenizer is meant to be subclassed:  `MarkdownTokenizer`, `RulexTokenizer` and `SpellxTokenizer` each are,
    in about 40 lines;  the rules then read the tokens, with completion, hover and errors for free.
  - Who already does:  `spell map uses Tokenizer`
- **Flag:**  `text\[pos\]|charAt\(pos|while \(pos < `  -- a new file walking text by index
- **Copies:**
  - `spell-parser/src/markdown/inlines/InlineParser.ts`:  markdown's inlines, by regex, beside `MarkdownTokenizer`
  - `spell-parser/src/spell/rules/JSX/MarkdownBlock.ts`:  its own fence and code-span scanner
  - `spell-parser/src/spell/node/spellSyntax.ts` (`commentsBlanked()`):  a comment stripper, by character
- **History:**  elemental-spell's `.spellx` reader was 1,270 lines by hand (its P3) until its P6 moved it onto a
  tokenizer subclass and rules.

### A JSON5 file

- **It is:**  `readJSON5File()` to read, `json5Edited()` to write keeping its comments:  `spell/util/node/json5`;
  `DataFile` (`spell/server`) for a data file several writers share
- **Use it when:**  reading or writing any `.json5` file in node:  settings, data, `repos.json5`.
- **Flag:**  `JSON5\.parse\(\s*readFileSync`
- **Copies:**
  - `src/server/contentFolder.ts` (`contentFolderOf()`)
  - `src/server/page/settings.ts`
  - `src/toolchain/declarations.ts`:  its own `readJson5()`
  - `spell-app/scripts/examples-readme.ts`
  - `spell-app/src/spaces/test/fixtures.ts`
  - `spell-epic/src/demo/check-test-run.mjs`
  - NOTE: `contentFolderOf()` and the toolchain load before `spell/util` can (plain `node`):  check whether they can
    import it before moving them.

### A word that's close to a known one

- **It is:**  `suggest(word, candidates)` (and `levenshtein()` under it):  `spell/util`, `src/util/string.ts`
- **Use it when:**  "did you mean ...?" for an unknown name, attribute or word.
- **Flag:**  `function (levenshtein|editDistance|distance)\(|[Dd]id you mean`
- **Copies:**  `--`

## Files, folders and processes (node)

### Watching files

- **It is:**  `LiveReload` (`spell/server`):  watches folders, waits for quiet (`debounce`, 250 ms), ignores dot files,
  `node_modules`, lock and editor temp files, and tells each listener which file changed
- **Use it when:**  anything must react to a file changing on disk.
- **Flag:**  `\bwatch\(` imported from `node:fs`
- **Copies:**  each its own raw `watch()`, without the debounce or the ignore list
  - `src/server/runs/CommandRun.ts`
  - `spell-epic/src/list/RunningEpics.ts`
  - `spell-app/src/spaces/server/node/storage/DiskStorage.ts`
  - `spell-app/src/cli/commands/watchCommand.tsx`
  - The shared piece doesn't stand alone yet:  `LiveReload` is a watcher AND a websocket server.  The watcher half,
    split out, is what the copies would use ("Wanted", below).

### One writer at a time

- **It is:**  `FileLock` (`spell/server`)
- **Use it when:**  several processes (sessions, agents, the page server) may write one file.
- **Flag:**  `\.lock["'\x60]|writeFileSync\(.*\.lock`
- **Copies:**  three in spell-epic (`withLocks`, `withLock`, `lock`), one of which two runs can both take
  - Why they exist:  `FileLock` imports the server's barrel, so plain `node` can't load it.

### A process that's running, or gone

- **It is:**  `PidFile`, `isProcessAlive()`, `newestChange()` (`spell/server`)
- **Use it when:**  recording a background process to find, stop or restart it later.
- **Flag:**  `process\.kill\(\w+, 0\)`
- **Copies:**  five `isProcessAlive()` in spell-epic, word for word
  - Fine:  `spell-epic/src/tool/InboxPoller.mjs` keeps its own:  it loads node's built-ins only, to stay small.

### A free port, a server that stops cleanly

- **It is:**  `freePort()`, `isFree()`, `listenPreferred()` (`spell/server`, `src/server/ports.ts`);  `untilInterrupted()`
- **Use it when:**  starting any local web server.
- **Flag:**  `\.listen\(0|address\(\)\.port`
- **Copies:**  `--`

### A path a request asked for

- **It is:**  `resolveInside()`, `fileInside()`, `isInside()` (`spell/server`, `src/server/safePath.ts`)
- **Use it when:**  turning a URL or a user's path into a file, never outside its root.
- **Flag:**  `path\.join\(root, req|startsWith\(root\)`
- **Copies:**  `--`

### Opening a browser

- **It is:**  `openBrowser()`, `openInNewWindow()`, `openInChromeTab()`, `noBrowser()` (`spell/server`, `src/server/open.ts`)
- **Use it when:**  a command shows a page.
- **Flag:**  `spawn\(["']open["']|exec\(["']open |osascript`
- **Copies:**  `spell-epic/src/tools/pages.js` (`openUrlInChrome`), `openInChromeTab()` line for line, plus `front`

### The shared content folder

- **It is:**  `contentFolderOf(root)` (`spell/server/contentFolder`)
- **Use it when:**  finding the epic pages, guides or logs from any checkout.
- **Flag:**  `spell\.epics|spell-app\.epics` written as a path
- **Copies:**  `--`

## Command lines

### A command

- **It is:**  a verb of `spell` (each repo's `src/cli/commands.ts`), or of `epic` (spell-epic's `EpicProgram`):
  commander, with help, flags and the commands page's check
- **Use it when:**  any new tool a person or a skill runs.
  Where it goes and what it's called:  the commands guide, in the shared content folder's guides.
- **Flag:**  `function parseArgs\(|argv\.indexOf\(["']--`
- **Copies:**  six hand-written `parseArgs()`
  - `spell-epic/src/tool/PlanDocCommands.ts`
  - `spell-epic/src/tools/design.js`, `spell-epic/src/tools/details.js`, `spell-epic/src/tools/new-page.js`,
    `spell-epic/src/tools/pages.js`
  - `spell-epic/src/window.mjs`
  - `spell-brand/scripts/compare.ts`
  - six more flag readers (sweep 1):  spell-epic's `parseVerbArgs` and `flagsOf`, `check-spell.js`, the kit's
    `tools/content-links.ts`, `scripts/favicon.ts`, `tools/repos.ts`
  - beside them, node's own `parseArgs` in Spell UI's tools (`spell-ui/src/tools/cli.ts` ...):  fine for a
    package-local tool

## Pages and the network

### Fetching

- **It is:**  `$fetch()` (`spell/util`):  throws a `ResponseError` subclass for every failure (`NotFoundError` ...)
- **Use it when:**  any request from a page or a client.  Callers never check `response.ok`.
- **Flag:**  `response\.ok|\.ok\)` after a `fetch(`
- **Copies:**
  - the epic pages:  about a dozen reads checking `response.ok` themselves (sweep 1, epic-pages #1)
  - the app's runner:  four, asking for `cache: "no-cache"`, which `$fetch()` has no option for yet
  - NOT Spell UI:  `$fetch()` brings lodash and query-string into its bundles;  it keeps its own small fetches

### Remembering a preference

- **It is:**  `PrefStore` (`spell/util`, `persist/`), with a place to keep it:  the browser's storage, the page
  server, a database
- **Use it when:**  any UI state a person would want kept:  a fold, a pick, a size, a filter.
- **Flag:**  `localStorage\.(get|set)Item`
- **Copies:**  `--`  (about a dozen users already;  the docs pages' runtime keeps its fold memory on top of it:
  see "Showing and hiding")

### Timing

- **It is:**  `after(seconds, fn)`, `every(seconds, fn)`, `soon()`, `beforeNextPaint()`, `afterSolidUpdate()`
  (`spell/element`, `src/element/timing.ts`):  the name says WHEN, each can be cancelled
- **Use it when:**  anything later or repeated, in a page or on a server.
  Spell UI's lint already fails a raw timer in a component.
- **Flag:**  `setInterval\(|setTimeout\(`
- **Copies:**  raw timers, outside Spell UI's components
  - `spell-epic/src/answers/AnswerForm.ts`, `spell-epic/src/answers/RunForm.ts`,
    `spell-epic/src/answers/ChoicesForm.ts`
  - `spell-epic/src/review/ServerLink.ts`, `spell-epic/src/review/SendCountdown.ts`
  - `spell-epic/src/tools/AskListeners.ts`, `spell-epic/src/tools/_assets/spell-doc-comments.js`
  - sweep 1 found about 30 more:  the docs pages' runtime and comments, Spell UI's site, the app's runner and
    editor, the parser's command line (sleeps:  `await after(0.25)` instead)

### Building a bundle on demand

- **It is:**  `Bundle` (`spell/server`):  built when stale, never committed
- **Use it when:**  any script or stylesheet the page server serves from sources.
- **Flag:**  `from ["'](esbuild|vite|vite-plus)["']` outside a config:  a build of its own
- **Copies:**  `--`

### Pages linking each other

- **It is:**  `Linker` (`spell/server`):  link targets;  `formatHTML()` for the files it writes
- **Use it when:**  writing a page that links others, or fixing links after a move.
- **Copies:**  `--`

### The page server, from an epic page

- **It is:**  `ServerLink` (`spell-epic/src/review/ServerLink.ts`):  the page's token, a stale token's retry,
  and `watch()`:  polling while the page is visible, and hearing the page server's file events
- **Use it when:**  an epic element or form reads or writes through the page server.
- **Flag:**  `SPELL_SERVER\?\.token|protocol !== "file:"`
- **Copies:**  three writes, about a dozen reads, about ten "is this page served?" tests (sweep 1, epic-pages #1, #6)

## Errors and logging

### A thrown error with its context

- **It is:**  `CustomError`, `UIError`, the `ResponseError` family (`spell/util`);  `getDier()` for a method with
  several failure points
- **Use it when:**  WWOD §5:  typed errors, never `{ ok: false }` unions.
- **Flag:**  `ok: false`
- **Copies:**  `--`

### A caller's callback, run safely;  a class's errors, named

- **It is:**  `safelyCall()` (a predicate:  warned, never thrown), `safelyCallAll()` (cleanups:  every one run),
  `makeErrorWrapper(className)` (a class decorator:  each method's error carries the method and its arguments),
  `setDebugGlobal()` (objects at the devtools console):  `spell/util`, `src/util/spell/safely.ts`
- **Use it when:**  WWOD §5 and §19:  running code you don't own;  naming where an error came from;  inspecting
  state while debugging, instead of `console.log()`.
- **Flag:**  `catch \{\s*\}|catch \(\w+\) \{\s*\}|window\.\w+ = `
- **Copies:**  `--`
- **History:**  WWOD named all four for months before any existed (epic `coherence` I2).

### Logging

- **It is:**  `Logger` (`spell/util`)
- **Use it when:**  WWOD §19:  any logging a person can turn on.
- **Flag:**  `console\.(log|debug)\(`
- **Copies:**  `--`

## In Spell UI

What a component, or a page built on Spell UI, reaches for first.

### Arrow keys through a list

- **It is:**  `RovingTabindex` (`spell-ui/src/runtime/RovingTabindex.ts`), through `UI.focus.roving()`
- **Use it when:**  arrows, Home and End move through items:  a tab list, a radio group, a rating, swatches.
- **Flag:**  `Key\.(arrow\w+|home|end)\b`
- **Copies:**  five (the accordion, markdown's tab list, the radio group, the rating, the theme editor's swatches)
  - Fine:  `UICalendar`'s grid, on purpose, as its docs say.

### A keyboard shortcut

- **It is:**  `UI.keyboard` (`spell-ui/src/runtime/Keyboard.ts`) and `Chord` (`spell-ui/src/runtime/Chord.ts`):
  one registry, scopes per overlay, `Mod` for Command on a Mac and Control elsewhere
- **Use it when:**  any key combination a page or component answers.
- **Flag:**  `(metaKey|ctrlKey) &&`
- **Copies:**  six (sweep 0, the elemental-spell dry run):  the editor's hotkeys, the docs search, the epic toolbar and
  comments, the live client, a details pane

### An animation in or out

- **It is:**  `UIComponent.onVisibleChange()` (`src/element/UIComponent.tsx`):  animates as an element shows or hides
- **Use it when:**  an overlay or a toast comes and goes.
- **Copies:**  six overlays write their own (sweep 1, ui-components #4):  "Wanted:  A disclosure"

### The next frame

- **It is:**  `nextFrame()` (`spell/util`, `src/util/dom.ts`)
- **Copies:**  three in Spell UI's site and tools

### The section being read;  landing on a link

- **It is:**  `TocIndex` (`spell-ui/src/docs-components/ui-docs-toc/TocIndex.ts`):  `current()`, `decode()`, `slug()`
- **Use it when:**  following the scroll, or turning an address's `#hash` into a section.
- **Copies:**  the docs pages' runtime and the comments' entry (sweep 1, epic-pages #4;  ui-docs-tools #3)

### A file a script writes, kept current

- **It is:**  `writeOrCheck()`, `spliceGenerated()` (`spell-ui/src/tools/generatedFiles.ts`)
- **Use it when:**  a script writes a file, or a block of one, that `--check` must find unchanged.
- **Copies:**  five, in spell-epic, the brand, the app and the kit (sweep 1, ui-docs-tools #7):  to move into the kit

## In spell-epic and the parser

### Git, from spell-epic

- **It is:**  `Git` (`spell-epic/src/command/Git.ts`);  the kit's `checkoutOf()` (`src/server/checkout.ts`) for a
  checkout and its main checkout;  `RealPath` (`spell-epic/src/config/RealPath.ts`)
- **Flag:**  `spawnSync\("git"|"--git-common-dir"|realpathSync`
- **Copies:**  about 20 git runners, 10 checkout finders, 9 real-path helpers (sweep 1, epic-tools-kit #2-4)

### Clipboard, with VS Code's side bar

- **It is:**  `Clipboard` (`spell-epic/src/components/epic-page/Clipboard.ts`):  falls back where the side bar refuses
  the clipboard
- **Flag:**  `navigator\.clipboard\.writeText`
- **Copies:**  four bare ones, in Spell UI and the brand:  it should move down into Spell UI

### A growing text box

- **It is:**  `<epic-text-box>` (spell-epic):  grows with its text, to a third of the window
- **Flag:**  `field-sizing|growField`
- **Copies:**  six (sweep 1, epic-pages #7)

### The same program in two forms

- **It is:**  the translator (`spell-parser/src/spell/translate/Translator.ts`), rule by rule over the match tree;
  `ShapeCheck` (`spell-parser/src/spell/translate/ShapeCheck.ts`) to compare what two forms compile to
- **Use it when:**  writing spell out in another language or form, or testing two forms say the same.

## Showing and hiding

### A fold:  open and closed

- **It is:**  not ONE yet.  The parts that exist:
  - `<ui-section>` (Spell UI):  a titled fold, `collapsed`, `ui-opening` / `ui-opened`, find-in-page opens it
  - `Fold` (`spell-epic/src/components/epic-item/Fold.tsx`):  a box an epic element folds by itself, `hidden="until-found"`,
    fold-all and open-all
- **Use it when:**  anything that opens and closes.  The words:  [words.md](words.md), "open / close".
- **Flag:**  `collapsed|isCollapsed|setCollapsed|setFolded|foldAllUnder`
- **Copies:**  about six, each its own state, event names and `aria-expanded`:
  - `spell-ui/src/components/ui-accordion/UIAccordion.tsx` (a `<details>`)
  - `spell-ui/src/components/ui-section/UISection.tsx` (`collapsed`, the opposite of `open`)
  - `spell-ui/src/docs-components/ui-docs-example/UIDocsExample.tsx`
  - `spell-epic/src/components/epic-section/EpicFold.tsx`, `spell-epic/src/components/epic-item/EpicItem.tsx`,
    `spell-epic/src/components/epic-item/Fold.tsx`
  - `spell-epic/src/tools/_assets/spell-doc-runtime.js`:  `setCollapsed()`, `setFolded()`, `addFoldAll()`
  - `spell-ui/site/_src/SiteSections.ts`:  remembers folds
  - "Wanted", below.

## Wanted

Mechanisms with several copies and no shared one yet:  each a fix for a later phase, or for the epic that owns the
code (epic `coherence`, Q4 and Q5).

- **A disclosure:**  one open / closed state, its event pair (`opening` / `opened`, `closing` / `closed`),
  `aria-expanded`, and find-in-page opening it;  each fold above takes it, and fold-all / open-all are built on it.
  - sweep 1 added:  four popover panels in Spell UI (dropdown, calendar, search, icon picker), six overlays'
    animations, ten fold buttons in the epic pages
- **Small string helpers,** in `spell/util`:  a slug from a title (8 copies, 4 rules), `escapeRegExp` (16),
  `escapeHTML` (7), `withoutAccents` (9), `dedent` / `indented` (9), a size in KB (7, in two units), `clamp` (14).
  Generic ones, so Spell UI may import them file by file.
- **A local time stamp:**  15 copies in spell-epic and the kit;  three write the UTC date (tomorrow, in the evening).
- **Colour maths:**  OKLCH, sRGB, contrast:  four copies (Spell UI's styles and tools, the brand, the kit's A11y).
- **A headless page check:**  open a page in chromium, collect its errors, wait for it to settle:  15 copies.
- **A draft that saves itself:**  seven in the epic pages.
- **Loading once per key:**  `Map<key, Promise>`, eight in Spell UI, four ways of handling a failure.
- **A file watcher:**  `LiveReload`'s watching half (debounce, ignore list), on its own, for the four raw watchers.
- **Polling while the page is visible:**  `pollWhileVisible(fn, seconds)`, on `every()`, for any page.
  - The epic pages already have one:  `ServerLink.watch()` (above);  their copies should use it first.
- **Waiting until something is true** (node):  `waitUntil(read, { timeout, every })`:
  `spell-epic/src/tools/details.js` (`waitForAnswer`), `spell-epic/src/tools/agents.ts` (`waitForRedirects`) and
  `spell-epic/src/demo/check-test-run.mjs` (`waitFor`);  sweep 1 added eight more, the kit's `PidFile` and
  `spell server` among them:  so its home is the kit.

## Fine as it is

Copies a sweep found and Owen kept, with why:  a later sweep skips them.

- `spell-parser/src/markdown/blocks/BlockScanner.ts`:  markdown's block structure is a state machine, not a grammar;
  it asks rulex's line rules what each line is.
- Spell UI's marked and the parser's markdown:  two engines on purpose (the parser's markdown `AGENTS.md`).
- `spell-app/src/app/solid/InspectorSource.ts`:  reads tags by hand on purpose:  "no parser, a best guess".
- `spell-epic/bin/`, its hooks:  each stands alone, so a few lines of boilerplate repeat.

## See also

- [words.md](words.md):  one word for each idea
- [WWOD](../wwod/WWOD.md), §2 › "DRY":  the rule this list serves
