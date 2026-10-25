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
  A copy that's fine as it is goes under "Fine as it is", with why, so no sweep flags it again.
- The words:  [words.md](words.md).

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
- **Copies:**  `--`

### A process that's running, or gone

- **It is:**  `PidFile`, `isProcessAlive()`, `newestChange()` (`spell/server`)
- **Use it when:**  recording a background process to find, stop or restart it later.
- **Flag:**  `process\.kill\(\w+, 0\)`
- **Copies:**  `--`

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
- **Flag:**  `spawn\(["']open["']|exec\(["']open `
- **Copies:**  `--`

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
  - beside them, node's own `parseArgs` in Spell UI's tools (`spell-ui/src/tools/cli.ts` ...):  fine for a
    package-local tool

## Pages and the network

### Fetching

- **It is:**  `$fetch()` (`spell/util`):  throws a `ResponseError` subclass for every failure (`NotFoundError` ...)
- **Use it when:**  any request from a page or a client.  Callers never check `response.ok`.
- **Flag:**  `response\.ok|\.ok\)` after a `fetch(`
- **Copies:**  `--`

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

### Building a bundle on demand

- **It is:**  `Bundle` (`spell/server`):  built when stale, never committed
- **Use it when:**  any script or stylesheet the page server serves from sources.
- **Flag:**  `from ["'](esbuild|vite|vite-plus)["']` outside a config:  a build of its own
- **Copies:**  `--`

### Pages linking each other

- **It is:**  `Linker` (`spell/server`):  link targets;  `formatHTML()` for the files it writes
- **Use it when:**  writing a page that links others, or fixing links after a move.
- **Copies:**  `--`

## Errors and logging

### A thrown error with its context

- **It is:**  `CustomError`, `UIError`, the `ResponseError` family (`spell/util`);  `getDier()` for a method with
  several failure points
- **Use it when:**  WWOD §5:  typed errors, never `{ ok: false }` unions.
- **Flag:**  `ok: false`
- **Copies:**  `--`

### Logging

- **It is:**  `Logger` (`spell/util`)
- **Use it when:**  WWOD §19:  any logging a person can turn on.
- **Flag:**  `console\.(log|debug)\(`
- **Copies:**  `--`

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
- **A file watcher:**  `LiveReload`'s watching half (debounce, ignore list), on its own, for the four raw watchers.
- **Polling while the page is visible:**  `pollWhileVisible(fn, seconds)`, on `every()`:  the epic forms each
  write it by hand, with `visibilitychange`.
- **Waiting until something is true** (node):  `waitUntil(read, { timeout, every })`:
  `spell-epic/src/tools/details.js` (`waitForAnswer`), `spell-epic/src/tools/agents.ts` (`waitForRedirects`) and
  `spell-epic/src/demo/check-test-run.mjs` (`waitFor`).

## Fine as it is

Copies a sweep found and Owen kept, with why:  a later sweep skips them.

- `spell-parser/src/markdown/blocks/BlockScanner.ts`:  markdown's block structure is a state machine, not a grammar;
  it asks rulex's line rules what each line is.

## See also

- [words.md](words.md):  one word for each idea
- [WWOD](../wwod/WWOD.md), §2 › "DRY":  the rule this list serves
