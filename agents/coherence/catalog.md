# The catalog:  what Spell already has

Before writing a mechanism, look here:  the ones Spell already has, and when to use each.
The coherence agent reads it too, for every sweep and plan review (epic `coherence`).

- One entry per mechanism, in four parts:
  - **It is:**  the name, and where it lives
  - **Use it when:**  the job it does, in the words a plan would use
  - **Flag:**  what a copy looks like, as a search (`rg -n '<pattern>'` over the repos' `src/`)
  - **Copies:**  the copies known today, still to move onto it
    - `--`:  none known yet.  A flag finds more than its copies:  the first sweep reads what each one finds.
  - **Score:**  the search `spell coherence score` counts copies by, exact where the **Flag:** is broad
    (epic `coherence` P15;  [README-cli.md](../../README-cli.md), "Scoring coherence"):

    ```text
    - **Score:**  `<regex>` · in `<path>` · home `<path>`, `<path>` · not `<path>`, `<path>`
    ```

    - the search:  git's Perl regex (`git grep -P`), one code line at a time;  comment lines never count
    - `in`:  only those paths;  `home`:  the mechanism's own files, never a copy, and what its users use;
      `not`:  paths left out (a glob may say `**`);  every path from the kit's root, a file or a folder
    - also left out:  the paths an entry's "Fine:" lines name, and every path under "Fine as it is"
    - it may wrap:  its next lines, indented, starting `·`
    - each one is checked by reading its hits once:  it finds copies only.  No **Score:**, no count:  "Logging"
      has none (`console.log()` is noise for a score), nor an entry without a **Flag:**
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
- **Score:**  `\b(const|let) (char|c|ch)\b(: string)? = (this\.)?(text|source|subject|line|input)(\[|\.charAt\()|\(\(char = (this\.)?\w+\.charAt\(|return this\.subject\.charAt`
  · home `spell-parser/src/parser/tokenizer/` · not `spell-parser/src/spell/SpellxTokenizer.ts`
- **Copies:**
  - `spell-parser/src/markdown/inlines/InlineParser.ts`:  markdown's inlines, by regex, beside `MarkdownTokenizer`
  - `spell-parser/src/spell/rules/JSX/MarkdownBlock.ts`:  its own fence and code-span scanner
- **History:**  elemental-spell's `.spellx` reader was 1,270 lines by hand (its P3) until its P6 moved it onto a
  tokenizer subclass and rules.

### Walking a rule's syntax

- **It is:**  `rule.childRules` (every rule inside it) and `P.leadingRules(rule, { parser, followGroups })` (what it
  can start with):  `spell-parser/parser`
- **Use it when:**  any question about a rule's shape:  its first words, its keywords, every rule inside it.
- **Flag:**  `instanceof P\.(Sequence|Choice|Repeat)` in a new walk
- **Score:**  `\b\w+\.rules\.(forEach|flatMap)\([a-z]\w*\)|\b(visit|walk)\(\w+\.rules\)`
  · home `spell-parser/src/parser/rules/`
- **Copies:**  `--`  (P13 moved the translator, the parser's statement words and the language server onto it)

### A text position and its offset

- **It is:**  `P.getLineStarts()`, `P.positionForOffset()`, `P.offsetForPosition()`:  `spell-parser/parser`
- **Flag:**  `lineStarts\.push|indexOf\("\\n"`
- **Score:**  `lineStarts\.push|\b[lL]ineStarts\w* = \[0\]|slice\(0, [\w.]+\)\.split\("\\n"\)\.length`
  · home `spell-parser/src/parser/tokenizer/tokenizer.types.ts`
- **Copies:**  `--`

### Comments in code

- **It is:**  oxc's parser for JavaScript and TypeScript (as `spell-parser/src/spell/node/spellSyntax.ts` uses it), spell's
  own tokenizer for spell;  only Python keeps a small scanner
- **Flag:**  a new character-by-character comment or string scanner

### A JSON5 file

- **It is:**  `readJSON5File()` to read, `json5Edited()` to write keeping its comments:  `spell/util/node/json5`;
  `DataFile` (`spell/server`) for a data file several writers share
- **Use it when:**  reading or writing any `.json5` file in node:  settings, data, `repos.json5`.
- **Flag:**  `JSON5\.parse\(\s*readFileSync`
- **Score:**  `JSON5\.parse\(\s*readFileSync` · home `src/util/node/json5.ts`
- **Copies:**
  - `src/server/contentFolder.ts` (`contentFolderOf()`)
  - `src/server/page/settings.ts`
  - `src/toolchain/declarations.ts`:  its own `readJson5()`
  - `spell-app/scripts/examples-readme.ts`
  - `spell-app/src/spaces/test/fixtures.ts`
  - `spell-epic/src/demo/check-test-run.mjs`
  - `spell-app/src/spaces/server/node/projects/file-utils.ts`:  its `loadJSONFile()`
  - NOTE: `contentFolderOf()` and the toolchain load before `spell/util` can (plain `node`):  check whether they can
    import it before moving them.

### A word that's close to a known one

- **It is:**  `suggest(word, candidates)` (and `levenshtein()` under it):  `spell/util`, `src/util/string.ts`
- **Use it when:**  "did you mean ...?" for an unknown name, attribute or word.
- **Flag:**  `function (levenshtein|editDistance|distance)\(|[Dd]id you mean`
- **Score:**  `function (levenshtein|editDistance|distance)\(` · home `src/util/string.ts`
- **Copies:**  `--`

## Files, folders and processes (node)

### Watching files

- **It is:**  `LiveReload` (`spell/server`):  watches folders, waits for quiet (`debounce`, 250 ms), ignores dot files,
  `node_modules`, lock and editor temp files, and tells each listener which file changed
- **Use it when:**  anything must react to a file changing on disk.
- **Flag:**  `\bwatch\(` imported from `node:fs`
- **Score:**  `import \{[^}]*\bwatch\b[^}]*\} from "(node:)?fs|\bfs\.watch\(` · home `src/server/LiveReload.ts`
- **Copies:**  each its own raw `watch()`, without the debounce or the ignore list
  - `src/server/runs/CommandRun.ts`
  - `spell-epic/src/list/RunningEpics.ts`
  - `spell-app/src/spaces/server/node/storage/DiskStorage.ts`
  - `spell-app/src/cli/commands/watchCommand.tsx`
  - `src/server/page/BundleBuild.ts` (the score's first run found it)
  - The shared piece doesn't stand alone yet:  `LiveReload` is a watcher AND a websocket server.  The watcher half,
    split out, is what the copies would use ("Wanted", below).

### One writer at a time

- **It is:**  `FileLock` (`spell/server`;  `spell/server/FileLock` from plain `node`);  `runOnce()` skips the work
  when another run holds the lock, rather than waiting
- **Use it when:**  several processes (sessions, agents, the page server) may write one file.
- **Flag:**  `\.lock["'\x60]|writeFileSync\(.*\.lock`
- **Score:**  `openSync\([^)]*"wx"\)` · home `src/server/FileLock.ts`
- **Copies:**  `--`
  - spell-epic's three (`withLocks`, `withLock`, and `lock`, which two runs could both take) use it since epic
    `coherence` P7:  plain `node` loads it now.

### A process that's running, or gone

- **It is:**  `PidFile`, `isProcessAlive()`, `newestChange()` (`spell/server`)
- **Use it when:**  recording a background process to find, stop or restart it later.
- **Flag:**  `process\.kill\(\w+, 0\)`
- **Score:**  `process\.kill\(\w+, 0\)` · home `src/server/PidFile.ts`
- **Copies:**  three in spell-epic, kept, each saying why:  they load in plain `node`, which can't load `PidFile`
  (it imports the server's barrel)
  - `spell-epic/src/window.mjs`, `spell-epic/src/command/CheckoutServers.ts`, `spell-epic/src/tools/AskListeners.ts`
  - `RunningEpics` and `Sessions` use the kit's since epic `coherence` P7.
  - Fine:  `spell-epic/src/tool/InboxPoller.mjs` keeps its own:  it loads node's built-ins only, to stay small.

### A free port, a server that stops cleanly

- **It is:**  `freePort()`, `isFree()`, `listenPreferred()` (`spell/server`, `src/server/ports.ts`);  `untilInterrupted()`
- **Use it when:**  starting any local web server.
- **Flag:**  `\.listen\(0|address\(\)\.port`
- **Score:**  `\.listen\(0\b` · home `src/server/ports.ts`
- **Copies:**  `--`

### A path a request asked for

- **It is:**  `resolveInside()`, `fileInside()`, `isInside()` (`spell/server`, `src/server/safePath.ts`)
- **Use it when:**  turning a URL or a user's path into a file, never outside its root.
- **Flag:**  `path\.join\(root, req|startsWith\(root\)`
- **Score:**  `path\.join\(root, req|join\(\w*[rR]oot\w*, decodeURIComponent` · home `src/server/safePath.ts`
- **Copies:**  `--`

### Opening a browser

- **It is:**  `openBrowser()`, `openInNewWindow()`, `openInChromeTab()`, `noBrowser()` (`spell/server`, `src/server/open.ts`)
- **Use it when:**  a command shows a page.
- **Flag:**  `spawn\(["']open["']|exec\(["']open |osascript`
- **Score:**  `spawn(Sync)?\("open", \[(url|\x60https?:)|"xdg-open"` · home `src/server/open.ts`
- **Copies:**  `--`
  - `openInChromeTab(url, key, { front })`:  `front` brings Chrome forward, for a link a person clicked.
    spell-epic's `openUrlInChrome()` is a wrapper over it since epic `coherence` P7, printing what it did.

### Running git, finding a checkout, a real path

- **It is:**  `Git` (`spell/server`, `src/server/Git.ts`):  `run()` (never throws), `out()`, `lines()`, `mustRun()`
  (a `GitError`), `mainRoot()`;  `checkoutOf()` (`src/server/checkout.ts`) for a checkout and its main checkout,
  with no git run;  `RealPath` (`src/server/RealPath.ts`) for comparing paths through links
  - Each by its own name from plain `node` (`spell/server/Git` ...), and from the `spell` command (no linkedom).
  - spell-epic's own part, `EpicCheckout`:  the caller's checkout (`nearest()`), the code's (`CODE_ROOT`),
    `mustGit()` for a verb's message.
- **Use it when:**  any tool runs git, or asks which checkout a path is in.
- **Flag:**  `spawnSync\("git"|execFileSync\("git"|"--git-common-dir"|show-toplevel|realpathSync`
- **Score:**  `\b(spawnSync|execFileSync|execSync|spawn)\("git"|"--git-common-dir"|--show-toplevel|=== realpathSync\(|realpathSync\(\w+\) ===`
  · home `src/server/Git.ts`, `src/server/checkout.ts`, `src/server/RealPath.ts`
- **Copies:**  `--`
  - Moved from spell-epic in epic `coherence` P7, with about 20 git runners, 10 checkout finders and 9 real-path
    helpers across spell-epic and the kit.
  - Fine:  a test's own scratch repo (`spawnSync("git", ...)` in a test);  `spell-epic/src/tool/InboxPoller.mjs`.

### The shared content folder

- **It is:**  `contentFolderOf(root)` (`spell/server/contentFolder`)
- **Use it when:**  finding the epic pages, guides or logs from any checkout.
- **Flag:**  `spell\.epics|spell-app\.epics` written as a path
- **Score:**  `["'\x60](\.\./)*spell(-app)?\.epics["'\x60/]` · home `src/server/contentFolder.ts`
- **Copies:**  `--`

## Command lines

### A command

- **It is:**  a verb of `spell` (each repo's `src/cli/commands.ts`), or of `epic` (spell-epic's `EpicProgram`):
  commander, with help, flags and the commands page's check
- **Use it when:**  any new tool a person or a skill runs.
  Where it goes and what it's called:  the commands guide, in the shared content folder's guides.
- **Flag:**  `function parseArgs\(|argv\.indexOf\(["']--`
- **Score:**  `function parseArgs\(|argv\.indexOf\(["']--`
  · home `src/cli/`, `spell-epic/src/cli/`
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
- **Score:**  `\b(response|answer|res)\.ok\b(?!\()|\(await fetch\([^)]*\)\)\.ok` · home `src/util/spell/$fetch.ts`
  · not `spell-ui/src/`
- **Copies:**
  - the epic pages:  about a dozen reads checking `response.ok` themselves (sweep 1, epic-pages #1)
  - `--` in the app since epic `coherence` P14:  its runner and `editor.ts` ask `$fetch()` for `cache: "no-cache"`
  - NOT Spell UI:  `$fetch()` brings lodash and query-string into its bundles;  it has `fetchOk()` / `fetchText()`
    instead ("In Spell UI", below)

### Remembering a preference

- **It is:**  `PrefStore` (`spell/util`, `persist/`), with a place to keep it:  the browser's storage, the page
  server, a database
- **Use it when:**  any UI state a person would want kept:  a fold, a pick, a size, a filter.
- **Flag:**  `localStorage\.(get|set)Item`
- **Score:**  `localStorage\.(get|set)Item` · home `src/util/persist/`
- **Copies:**  `--`  (about a dozen users already;  the docs pages' runtime keeps its fold memory on top of it:
  see "Showing and hiding")
- **The light / dark choice:**  `ColorScheme` beside it (`src/util/persist/ColorScheme.ts`;  epic `coherence` P12):
  one key for every Spell site, its old keys moved once, `ui-light` / `ui-dark` and inline `color-scheme`,
  following the OS and other tabs;  and the one dark-mode query, `DARK_QUERY`
  - its users:  the kit's site header, Spell UI's `ThemePreference` (which keeps the theme beside it) and its
    runtime's `UI.browser.isDark`, the editor's code colours (`CodeThemes`)
  - **Flag:**  `prefers-color-scheme: dark` in code, `ui-dark` toggled by hand
  - **Copies:**  the inline `<head>` script, written into every docs page and template:  it must run before
    first paint, with no module;  `ThemePreference.HEAD_SCRIPT` is its source

### Timing

- **It is:**  `after(seconds, fn)`, `every(seconds, fn)`, `soon()`, `beforeNextPaint()`, `afterSolidUpdate()`
  (`spell/element`, `src/element/timing.ts`):  the name says WHEN, each can be cancelled
- **Use it when:**  anything later or repeated, in a page or on a server.
  Spell UI's lint already fails a raw timer in a component.
- **Flag:**  `setInterval\(|setTimeout\(`
- **Score:**  `\b(setInterval|setTimeout)\(` · home `src/element/timing.ts`
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
- **Score:**  `import \{[^}]*\bbuild\b[^}]*\} from "esbuild"|\b(vite|esbuild)\.build\(` · home `src/server/Bundle.ts`
- **Copies:**  `--`

### Pages linking each other

- **It is:**  `Linker` (`spell/server`):  link targets;  `formatHTML()` for the files it writes
- **Use it when:**  writing a page that links others, or fixing links after a move.
- **Copies:**  `--`

### A headless page check

- **It is:**  `BrowserPage` (`spell/element-tools/BrowserPage`, plain `node` too):  a page in headless Chromium,
  its problems reported as they happen (`onProblem`), settled (`settle()`:  every pack tag defined);
  the `globalThis.__name` helper `tsx` needs, in one place
- **Use it when:**  a tool checks or pictures a page.
- **Flag:**  `chromium\.launch|on\("pageerror"|globalThis\.__name`
- **Score:**  `chromium\.launch|on\("pageerror"|globalThis\.__name` · home `src/element-tools/BrowserPage.ts`
- **Copies:**  `--`
  - Its users since epic `coherence` P7:  Spell UI's site check, screenshots, HMR test, visual tests and README
    pictures;  spell-epic's `browserPage.js`, `check-spell.js`, `designer-shots.js` and demo checks;  the brand's
    design check and comparison;  the kit's publish check;  the app's examples script.
  - Fine:  the kit's `scripts/favicon.ts` (renders an image, checks no page).

### The page server, from an epic page

- **It is:**  `ServerLink` (`spell-epic/src/review/ServerLink.ts`):  the page's token, a stale token's retry,
  and every read, write and poll
  - `isServed()`, `canRead()`, `get()` (on `$fetch()`), `post()`, `forPage()`
  - the static `watch(window, files, refresh, { every, polls })`, with a path test:
    polling while the page is visible, and hearing the page server's file events
- **Use it when:**  an epic element, form or docs page reads or writes through the page server.
- **Flag:**  `SPELL_SERVER\?\.token|protocol !== "file:"`
- **Score:**  `SPELL_SERVER\?\.token|protocol !== "file:"` · home `spell-epic/src/review/ServerLink.ts`
- **Copies:**  `--` since epic `coherence` P9;  only the parked `goals-live.js` keeps its own

## Errors and logging

### A thrown error with its context

- **It is:**  `CustomError`, `UIError`, the `ResponseError` family (`spell/util`);  `getDier()` for a method with
  several failure points
- **Use it when:**  WWOD §5:  typed errors, never `{ ok: false }` unions.
- **Flag:**  `ok: false`
- **Score:**  `\{ ok: false, error\b` · home `src/util/spell/CustomError.ts`
- **Copies:**  `--`

### A caller's callback, run safely;  a class's errors, named

- **It is:**  `safelyCall()` (a predicate:  warned, never thrown), `safelyCallAll()` (cleanups:  every one run),
  `makeErrorWrapper(className)` (a class decorator:  each method's error carries the method and its arguments),
  `setDebugGlobal()` (objects at the devtools console):  `spell/util`, `src/util/spell/safely.ts`
- **Use it when:**  WWOD §5 and §19:  running code you don't own;  naming where an error came from;  inspecting
  state while debugging, instead of `console.log()`.
- **Flag:**  `catch \{\s*\}|catch \(\w+\) \{\s*\}|window\.\w+ = `
- **Score:**  `catch \{\s*\}|catch \(\w+\) \{\s*\}|^\s*window\.(?!name\b)\w+ = ` · home `src/util/spell/safely.ts`
  · not `spell-epic/src/demo/`, `spell-ui/src/tools/`
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

- **It is:**  `RovingTabindex` (`spell-ui/src/runtime/RovingTabindex.ts`):
  `UI.focus.roving()` attached for an element's life (menus, tabs), `UI.focus.arrowKey()` for one key press from a
  JSX `onKeyDown`;  `tabindex: "left alone"` when the items' tab stops are the caller's (the accordion's titles)
- **Use it when:**  arrows, Home and End move through items:  a tab list, a radio group, a rating, swatches.
- **Flag:**  `Key\.(arrow\w+|home|end)\b`
- **Score:**  `(case |=== )(\w+\.)?Key\.(arrow\w+|home|end)\b` · home `spell-ui/src/runtime/RovingTabindex.ts`
  · not `spell-ui/src/components/ui-calendar/`, `spell-ui/src/components/ui-icon-picker/`, `spell-ui/src/components/ui-dropdown/`, `spell-ui/src/components/ui-search/`, `spell-ui/src/components/ui-slider/`
- **Copies:**  `--` since epic `coherence` P10 (the accordion, markdown's tab list, the radio group, the rating, the
  theme editor's swatches)
  - Fine:  `UICalendar`'s grid and the icon picker's, on purpose:  they step by rows of a grid.
  - Fine:  the dropdown's and the search's arrows move a highlight, not focus ("The highlighted option", below);
    the slider's change its value.
  - Not swept yet:  the docs' search and the theme menu (`UIDocsSearch`, `UIThemeMenu`), the brand's `BrandColorSet`.

### The highlighted option of a list

- **It is:**  `F.HighlightedOption` (`spell-ui/src/elements/HighlightedOption.ts`):  the ONE highlighted option a
  control's list shows (`aria-activedescendant`), stepping as `MenuOptions.nextEnabledIndexIn()`
- **Use it when:**  a control opens a list whose arrows move a highlight while focus stays in the field:
  the dropdown, the search, the icon picker.
- **Flag:**  `highlightedIndex|activedescendant`
- **Score:**  `\bhighlightedIndex\b` · home `spell-ui/src/elements/HighlightedOption.ts`
- **Copies:**  `--` since epic `coherence` P10;  not swept yet:  the docs' search (`UIDocsSearch`)

### Loading once per key

- **It is:**  `LoadOnce` (`spell-ui/util`, `spell-ui/src/util/LoadOnce.ts`):  `get(key, load)`, every caller the same
  promise;  a failure `kept`, `forgotten`, or `forgotten offline`
- **Use it when:**  a family's import, a pack's script, a language, an icon's SVG, a source file:  anything loaded once
  per page.
- **Flag:**  `Map<string, Promise`
- **Score:**  `Map<string, Promise` · home `spell-ui/src/util/LoadOnce.ts`
  · not `src/util/persist/PrefStore.ts`, `spell-ui/src/components/ui-components/ComponentPacks.ts`, `spell-epic/src/review/ReviewClient.ts`, `spell-app/src/spaces/server/node/prefs/SpacePrefs.ts`, `spell-app/src/spaces/server/node/routes/ProjectBuild.ts`
- **Copies:**  `--` since epic `coherence` P10 (Sources, IconPacks, ComponentPacks, RootLoader's two, EmojiData,
  CodeHighlighter)
  - Fine:  `ComponentPacks.defining` (what's running now, not a load), spell-epic's `ReviewClient.asking`,
    the kit's `PrefStore` (writes in flight)

### Fetching in Spell UI

- **It is:**  `fetchOk()` / `fetchText()` (`spell-ui/src/runtime/runtime.types.ts`):  an OK answer, else the
  caller's own typed error (`SourceError`, `ApiError` ...)
- **Use it when:**  Spell UI's runtime fetches;  everywhere else, `$fetch()` (above).
- **Flag:**  `response\.ok` in `spell-ui/src`
- **Score:**  `response\.ok` · in `spell-ui/src` · home `spell-ui/src/runtime/runtime.types.ts`
- **Copies:**  `--` since epic `coherence` P10 (`Api`, `AppStylesheet`, `Sources`, `IconPacks`)

### A fallback's events

- **It is:**  `NativeFallback.send()` (`spell-ui/src/elements/NativeFallback.ts`):  a native fallback's event, named in
  the page's language and cancelable, as the component's own `send()`
- **Flag:**  `new CustomEvent` in a `*.fallback.ts`
- **Score:**  `new CustomEvent` · in `**.fallback.ts` · home `spell-ui/src/elements/NativeFallback.ts`
- **Copies:**  `--` since epic `coherence` P10 (Spell UI's nine fallbacks, the brand's two)

### A form control's attributes

- **It is:**  `UIT.FormControlAttributes` / `UIT.FormControlStates` (`spell-ui/src/components/components.types.ts`):
  `name`, `required`, `readonly`, `placeholder`;  the `readonly` and `invalid` states;  ONE shape each
- **Use it when:**  a vocabulary of a control with a value:  take them by name, its own `description` where it says
  more.
- **Flag:**  `name: "readonly"` in a vocabulary
- **Score:**  `name: "readonly"` · home `spell-ui/src/components/components.types.ts`
  · not `spell-ui/src/components/ui-form/`, `spell-ui/src/components/ui-property-editor/`
- **Copies:**  the brand's two controls (`BrandColorPicker.en.ts`, `BrandComposer.en.ts`);  `<ui-field>`'s and the
  property editor's `readonly` are their own (a group's, reaching each field)

### A keyboard shortcut

- **It is:**  `UI.keyboard` (`spell-ui/src/runtime/Keyboard.ts`) and `Chord` (`spell-ui/src/runtime/Chord.ts`):
  one registry, scopes per overlay, `Mod` for Command on a Mac and Control elsewhere
- **Use it when:**  any key combination a page or component answers.
- **Flag:**  `(metaKey|ctrlKey) &&`
- **Score:**  `(?<!!)\b\w+\.(metaKey|ctrlKey) &&`
  · home `spell-ui/src/runtime/Keyboard.ts`, `spell-ui/src/runtime/Chord.ts`
- **Copies:**  six (sweep 0, the elemental-spell dry run):  the editor's hotkeys, the docs search, the epic toolbar and
  comments, the live client, a details pane

### An animation in or out

- **It is:**  `UIComponent.onVisibleChange()` (`src/element/UIComponent.tsx`):  animates as an element shows or hides
- **Use it when:**  an overlay or a toast comes and goes.
- **Copies:**  `--`:  the six overlays animate here, and open and close through their `Disclosure`
  ("A disclosure:  open and closed", below;  epic `coherence` P8)

### The next frame

- **It is:**  `nextFrame(count)` (`spell/util`, `src/util/dom.ts`):  after one frame, or `count` (epic `coherence` P11)
- **Flag:**  `new Promise\(\(resolve\) => requestAnimationFrame`
- **Score:**  `new Promise\(\(resolve\) => requestAnimationFrame` · home `src/util/dom.ts`
- **Copies:**  `--` since P11 (Spell UI's site sections and visual fixture, the docs pages' `nextFrames()`, the comments'
  `nextFrame()`)
  - Left:  `PerfRun`'s own, on purpose:  it has no imports (served as plain JS)

### The section being read;  landing on a link

- **It is:**  `TocIndex` (`spell-ui/src/docs-components/ui-docs-toc/TocIndex.ts`):  `current()`, `reached()`, `decode()`,
  `slug()`;  and `HashLanding` beside it (epic `coherence` P11):  landing on a `#hash` below the stuck titles
  - a landing:  the page ready, its pane shown and folds opened, the scroll to its line, once more as it settles unless
    the reader moved;  one per document, a newer landing stops an older one
  - a page with stuck bars of its own lands its hashes itself, by its rules (`use()`):  the site's `SiteSections`, the
    epic pages' runtime;  `<ui-docs-toc>` and `<ui-docs-api>` then leave them to it, so the page scrolls once
- **Use it when:**  following the scroll, turning an address's `#hash` into a section, or landing a link.
- **Flag:**  `scrollIntoView\(|hasReaderMoved`
- **Score:**  `hasReaderMoved|decodeURIComponent\((\w+\.)*location\.hash`
  · home `spell-ui/src/docs-components/ui-docs-toc/TocIndex.ts`, `spell-ui/src/docs-components/ui-docs-toc/HashLanding.ts`
- **Copies:**  `--` since P11 (Spell UI's toc, site sections and API tables;  the docs pages' runtime)
  - Left:  the comments' toolbar (`spell-comments.entry.js` `currentSection()`):  it bundles no Spell UI
  - Left:  the site sections' sticking, in the site (the finding's "later":  into Spell UI's own code)

### Copying, with VS Code's side bar

- **It is:**  `copyText()` (`spell/util`, `src/util/dom.ts`):  the browser's clipboard call, else the old
  `execCommand("copy")` VS Code's side bar still allows;  and Spell UI's `E.ClipboardCopy`
  (`spell-ui/src/elements/ClipboardCopy.ts`) for a copy button:  the copy, then "Copied" for a moment
- **Flag:**  `navigator\.clipboard\.writeText`
- **Score:**  `navigator\.clipboard\.writeText` · home `src/util/dom.ts`, `spell-ui/src/elements/ClipboardCopy.ts`
- **Copies:**  `--` since epic `coherence` P10 (Spell UI's code block and theme editor, the brand's colour picker and
  swatch, the epic pages' `Clipboard`)
  - Left:  the parked goals page (`goals-live.js`), read only

### A toast

- **It is:**  `UI.toast({ message })` (`spell-ui/src/components/ui-toast/ToastStack.ts`):  bottom right, with its
  type's icon, by default (epic `coherence` P10)
- **Flag:**  `position: "bottom right"|showIcon: true`
- **Score:**  `position: "bottom right"|showIcon: true` · home `spell-ui/src/components/ui-toast/ToastStack.ts`
- **Copies:**  `--`;  left:  the parked goals page (`goals-live.js`)

### A file a script writes, kept current

- **It is:**  `writeOrCheck()`, `spliceGenerated()` (`spell/element-tools/generatedFiles`, `src/element-tools/generatedFiles.ts`;
  epic `coherence` P11, from Spell UI's)
- **Use it when:**  a script writes a file, or a block of one, that `--check` must find unchanged.
- **Flag:**  `stale:  .*yarn|readOrEmpty`
- **Score:**  `stale:  .*yarn|readOrEmpty` · home `src/element-tools/generatedFiles.ts`
- **Copies:**  `--` since P11 (spell-epic's and the brand's site data, the app's site data, examples README and
  grammar, the kit's `mermaid:pretty`)

### A page bundle's build

- **It is:**  the kit's `Bundle` (`spell/server`, `src/server/Bundle.ts`):  `clearOutput()`, `linkIconPacks()`,
  `sizeReport()`, a build script's steps (epic `coherence` P11)
- **Use it when:**  a script builds a bundle the page server serves.
- **Copies:**  `--` since P11 (Spell UI's site bundle, the brand's build)

### A component set's data

- **It is:**  Spell UI's `SiteDataBuilder` (`spell-ui/src/tools/SiteDataBuilder.ts`), its `set` and `forSet()`
  (epic `coherence` P11):  a set's own groups as the topics, its own side-column links, its pages one flat folder
- **Copies:**  `--` since P11 (the brand's, Epic UI's and App UI's data)

### A theme's values

- **It is:**  a theme file, `<name>.theme.json5`, its values in the theme tree's nested groups (`themeTree`,
  `spell-ui/src/styles/styles.en.ts`), and `ThemeFile` (`spell-ui/src/styles/ThemeFile.ts`), which checks it and
  writes its sheet (epic `debut` P18);  `yarn gen:styles` writes every one
- **Use it when:**  making or changing a theme, reading a theme's values (`ThemeFile.values()`), or listing the names
  a theme may set (the tree, `theme.schema.json`):  never by reading a theme's CSS.
- **Copies:**  `--` (the theme editor writes its own sheet until it moves onto theme data, epic `debut` P22)

## In spell-epic and the parser

### A growing text box

- **It is:**  `<epic-text-box>` (spell-epic):  grows with its text, to a third of the window or its `max-height`;
  `type="note"` for a box another element reads itself (`value`)
- **Flag:**  `field-sizing|growField`
- **Score:**  `field-sizing|function growField` · in `spell-epic/src/`
  · home `spell-epic/src/components/epic-text-box/`
- **Copies:**  since epic `coherence` P14 `<epic-agents>`' redirect note and `<epic-new-item>`'s note are text boxes;
  left:
  - `<epic-review>`'s note, `<epic-run-row>`'s and `<epic-choice-row>`'s one-line answers:  their own keys, focus and
    looks, which the text box doesn't take yet
  - the docs helpers' `growField()`, the syntax page's boxes (`syntax-choices.css`)

### A draft that saves itself

- **It is:**  `DraftSaver` (`spell-epic/src/answers/DraftSaver.ts`), handed the save call, the wait and the key:
  saves as you type, says "saved 14:04", retries a failed save every 3s
- **Flag:**  `draft saved|saveDraft`
- **Score:**  `\bdraftTimer\b|setTimeout\(\(\) => (this\.)?saveDraft` · home `spell-epic/src/answers/DraftSaver.ts`
- **Copies:**  `--` since epic `coherence` P9 (the seven forms)

### The same program in two forms

- **It is:**  the translator (`spell-parser/src/spell/translate/Translator.ts`), rule by rule over the match tree;
  `ShapeCheck` (`spell-parser/src/spell/translate/ShapeCheck.ts`) to compare what two forms compile to
- **Use it when:**  writing spell out in another language or form, or testing two forms say the same.

## Small helpers (`spell/util`, epic `coherence` P6)

Generic files:  Spell UI imports them one by one, so they reach any page.

### Text

- **It is:**  `slug(text, { as: "id" | "github" })` (an id drops accents and apostrophes;  a heading anchor keeps
  accented letters, as GitHub does), `withoutAccents(text, { keep })`, `escapeRegExp()`, `escapeHTML()`, `dedent()`,
  `indented()`:  `src/util/string.ts`
- **Flag:**  `normalize\("NFD"\)|\\\$&|&amp;|toLowerCase\(\)\.replace\(/\[\^`
- **Score:**  `\{\}\(\)\|\[\\\]\\\\\]/g|\.replace\(/&/g, "&amp;"\)|replaceAll\("&", "&amp;"\)|normalize\("NFD"\)|toLowerCase\(\)\.replace\(/\[\^`
  · home `src/util/string.ts`
- **Copies:**  left on purpose:  the parser's CommonMark `escapeHTML` (it leaves `'` alone, as the spec tests check);
  TocIndex's apostrophe rule (its ids are saved);  `InboxPoller.mjs` (node's built-ins only)

### Numbers

- **It is:**  `clamp()`, `kb()` (one unit:  KB of 1024):  `src/util/number.ts`
- **Flag:**  `Math\.min\(.*Math\.max\(|/ 1024`
- **Score:**  `Math\.min\(.*Math\.max\(|Math\.max\(.*Math\.min\(|/ 1024\b` · home `src/util/number.ts`

### Local dates and times

- **It is:**  `localDate()`, `clockTime()`, `localMinutes()`, `localTime()` ...:  `src/util/time.ts`, standalone, so
  plain `node` loads it by its name with `.ts`
- **Use it when:**  any date or time a person reads, or a file is named by.  NEVER `toISOString().slice(0, 10)` for a
  local date:  it's UTC, tomorrow in the evening west of Greenwich.
- **Flag:**  `toISOString\(\)\.slice\(0, ?10\)|padStart\(2, "0"\)`
- **Score:**  `toISOString\(\)\.slice\(0, ?(10|16|19)\)` · home `src/util/time.ts`
  - `padStart(2, "0")` is left out:  it finds hex colours and counters as often as times
- **Copies:**  fine:  spell-app's people days, saved as UTC midnight on purpose
  - Fine:  `spell-app/src/spaces/server/node/people/PeopleStore.ts`

### Colour

- **It is:**  OKLCH and sRGB, hex, gamut clipping, luminance, contrast:  `src/util/color.ts`
- **Flag:**  `0\.4122214708|0\.2126`
- **Score:**  `0\.4122214708|0\.2126` · home `src/util/color.ts`

## Showing and hiding

### A disclosure:  open and closed

- **It is:**  `Disclosure` (the kit's `spell/element`, `src/element/Disclosure.ts`;  epic `coherence` P8):
  one open state, a guarded request (`request()`, `toggle()`, `open()`, `close()`), the component's cancelable
  `ui-opening` / `ui-closing` and then `ui-opened` / `ui-closed` (`sendAfter()`), `aria-expanded` (`ariaExpanded`),
  `hidden="until-found"` (`hidden`) and find-in-page opening it (`revealOnMatch`, `adopt()`)
  - a component holds one as a field, handed what differs:  where the state lives (a member, `kept`, its own),
    the event detail, what opening resets;  its public names stay its own (`collapsed`, `visible`, `open`)
  - on it:  Spell UI's `PopoverPanel` (`spell-ui/src/elements/PopoverPanel.ts`):  the popover, its `UI.overlays`
    entry and its anchor, written inline, for the dropdown, calendar, search and icon picker
  - on it:  spell-epic's `Fold` (`spell-epic/src/components/epic-item/Fold.tsx`):  a box an epic element folds by
    itself, and THE fold button (`fold.button()`):  every card's band and every panel's title;
    fold-all and open-all (`foldAllUnder()`, `expandAllUnder()`) close and open each block's
- **Use it when:**  anything that opens and closes.  The words:  [words.md](words.md), "open / close".
- **Flag:**  `requestChange\("is(Open|Visible|Collapsed)|"ui-opening"|beforematch|aria-expanded=\{this\.is`
- **Score:**  `requestChange\("is(Open|Visible|Collapsed)"|addEventListener\("beforematch"|aria-expanded=\{this\.isOpen`
  · home `src/element/Disclosure.ts`
- **Copies:**  taking it today:  the four popovers, the six overlays (the dialog's two, dimmer, popup, sidebar,
  nag, toast), `<ui-section>`, `<ui-docs-example>`, spell-epic's `EpicFold`, `EpicItem` and `Fold`.  Left:
  - `spell-ui/src/components/ui-accordion/UIAccordion.tsx`:  many panels in one `open` (`"0 2"`), on `<details>`,
    which keeps its own `aria-expanded` and find-in-page;  an exclusive open closes another in the same change
  - `<ui-nag>`'s `ui-opening`:  sent as it has slid in, not as a request
  - spell-epic's `EpicChange`, `EpicThread`, `EpicNewItem`, `EpicPageNoteHead`:  buttons that open more than a fold
    (a chip, a thread's head, the new-item form, a note's head);  their tooltips wait on elemental-spell's Q74
  - `spell-epic/src/tools/_assets/spell-doc-runtime.js`:  `setCollapsed()` (silent restores, by the elements' own
    `collapsed` / `open`, which their `Disclosure` follows), `setFolded()` (the saga pages' plain headings:  no
    element to hold one), `addFoldAll()`
  - `spell-ui/site/_src/SiteSections.ts`:  remembers folds (`PrefStore`), as it does

## Wanted

Mechanisms with several copies and no shared one yet:  each a fix for a later phase, or for the epic that owns the
code (epic `coherence`, Q4 and Q5).

- **A file watcher:**  `LiveReload`'s watching half (debounce, ignore list), on its own, for the four raw watchers.
- **Polling while the page is visible:**  `pollWhileVisible(fn, seconds)`, on `every()`, for any page.
  - The epic pages' copies use `ServerLink.watch()` (above) since epic `coherence` P9.
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
