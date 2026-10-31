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
    (epic `coherence` P15;  [README/cli.md](../../README/cli.md), "Scoring coherence"):

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
  ([README/cli.md](../../README/cli.md), "Asking the map").
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
| `ui-components` | `ui/src/components/`, `ui/src/elements/`, `ui/src/runtime/`, `ui/src/styles/` |
| `ui-docs-tools` | `ui/src/docs-components/`, `ui/src/tools/`, `ui/site/`, `ui/scripts/` |
| `epic-pages` | `epic/src/components/`, `epic/src/tools/_assets/` (hand-written only), `epic/src/answers/`, `epic/src/review/` |
| `epic-tools-kit` | `epic/src/` (the rest), `epic/hooks/`, the kit's `src/`, `tools/`, `scripts/` |
| `parser-app` | `parser/src/`, `app/src/`, `spell-brand/src/`, `spell-brand/scripts/` |
| `ui-shared` | `ui/src/`'s other folders:  `cli/`, `icons/`, `property/`, `util/`, `vocabulary/`, its top-level files |
| `vscode` | the two VS Code extensions:  `app/vscode/`, `epic/vscode/` |

The surfaces:  what people and agents USE, not code (sweep 2, Owen, 2026-10-26:
"did your coherence sweep include our CLI command surface?  What about agent files?").

| Area | What |
| --- | --- |
| `commands` | every `spell` command, `epic` verb and yarn script, and the skills that run them:  one job one way, one verb and one flag per idea ([the commands guide](../../spell.epics/guides/dev/commands/commands.md)) |
| `agent-files` | every `AGENTS.md` and `CLAUDE.md`, WWOD and its spokes, the skills, the agent definitions and their procedures, the epic templates:  a rule in ONE place, steps referenced not copied, one word per idea |

## Reading text

### A new syntax

- **It is:**  a `P.Tokenizer` subclass, plus rules:  `spell/parser/parser`
- **Use it when:**  reading any language or format of our own:  tags, a file format, a mini-language.
  - The tokenizer is meant to be subclassed:  `MarkdownTokenizer`, `RulexTokenizer` and `SpellxTokenizer` each are,
    in about 40 lines;  the rules then read the tokens, with completion, hover and errors for free.
  - Who already does:  `spell map uses Tokenizer`
- **Flag:**  `text\[pos\]|charAt\(pos|while \(pos < `  -- a new file walking text by index
- **Score:**  `\b(const|let) (char|c|ch)\b(: string)? = (this\.)?(text|source|subject|line|input)(\[|\.charAt\()|\(\(char = (this\.)?\w+\.charAt\(|return this\.subject\.charAt`
  · home `parser/src/parser/tokenizer/` · not `parser/src/spell/SpellxTokenizer.ts`
- **Copies:**
  - `parser/src/markdown/inlines/InlineParser.ts`:  markdown's inlines, by regex, beside `MarkdownTokenizer`
  - `parser/src/spell/rules/JSX/MarkdownBlock.ts`:  its own fence and code-span scanner
- **History:**  elemental-spell's `.spellml` reader was 1,270 lines by hand (its P3) until its P6 moved it onto a
  tokenizer subclass and rules.

### A CSV file

- **It is:**  `parseCsv()` (`spell/util/places/csv`):  quoted fields, doubled quotes, any line end, text only, no dependency
- **Use it when:**  reading CSV anywhere in the repos.  What the columns mean is `SheetTable`'s (`spell/util/places`).
- **Flag:**  `split\(","\)` over a line of a file
- **Copies:**  `--`
- **Fine:**  it's itself a small copy of "A new syntax", above, on purpose (epic `data` P7):
  util sits under the parser, so it can't reach `P.Tokenizer`, and this is the one format it needs.

### Walking a rule's syntax

- **It is:**  `rule.childRules` (every rule inside it) and `P.leadingRules(rule, { parser, followGroups })` (what it
  can start with):  `spell/parser/parser`
- **Use it when:**  any question about a rule's shape:  its first words, its keywords, every rule inside it.
- **Flag:**  `instanceof P\.(Sequence|Choice|Repeat)` in a new walk
- **Score:**  `\b\w+\.rules\.(forEach|flatMap)\([a-z]\w*\)|\b(visit|walk)\(\w+\.rules\)`
  · home `parser/src/parser/rules/`
- **Copies:**  `--`  (P13 moved the translator, the parser's statement words and the language server onto it)

### A text position and its offset

- **It is:**  `P.getLineStarts()`, `P.positionForOffset()`, `P.offsetForPosition()`:  `spell/parser/parser`
- **Flag:**  `lineStarts\.push|indexOf\("\\n"`
- **Score:**  `lineStarts\.push|\b[lL]ineStarts\w* = \[0\]|slice\(0, [\w.]+\)\.split\("\\n"\)\.length`
  · home `parser/src/parser/tokenizer/tokenizer.types.ts`
- **Copies:**  (epic `coherence` P16 moved spellx's writer onto it)
  - `parser/src/spell/languages/packs.ts`, `parser/src/spell/node/spellSyntax.ts`:
    a line by `slice(0, at).split("\n")`, once a match;  they move with the TypeScript reader (sweep 2's parser-app #1)

### A phrase's end, a brace's close, in spell text

- **It is:**  `P.Tokenizer`'s two scans:  `findPhraseEnd(text, start, end, { stop, lineEnds })`, the first `>` or `:`
  outside strings and brackets;  `findMatchingDelimiter("{", "}", ...)`, where a brace closes:  `spell/parser/parser`
- **Use it when:**  finding where a tag's phrase, a line's body colon or a hole ends, in spell or spellx text.
  - Strings are skipped as the tokenizer reads them (spell's:  only `"`), so a quoted `}` or `>` never ends one.
- **Flag:**  `inString|let depth = 0` in a new scan of spell text
- **Copies:**  `--`  (epic `coherence` P16 moved spellx's tokenizer, view and writer onto them)

### A retired word

- **It is:**  a word the language no longer takes, listed in a language's `retiredWords` / `retiredTypeWords` / `retiredRuleWords`:
  it still reads, as a parse error naming its replacement (`""`:  simply gone), which `spell lint --fix` writes
  (`SpellType.noteRetiredLiterals()`, `retiredWordErrorsIn()`, `spell/parser/spell`;  `fixRetiredWords()`, spell-app's `lintCommand.ts`)
- **Use it when:**  taking a word out of the language:  no rewrite command of its own.
- **Flag:**  a new `spell upgrade`, or a script rewriting spell source by text
- **Copies:**  `--`  (epic `language` P13 nearly built a second one, for lack of this entry)

### Comments in code

- **It is:**  oxc's parser for JavaScript and TypeScript (as `parser/src/spell/node/spellSyntax.ts` uses it), spell's
  own tokenizer for spell;  only Python keeps a small scanner
- **Flag:**  a new character-by-character comment or string scanner

### Lines of code

- **It is:**  `codeLines(text, extension)` (`spell/element-tools/codeLines`, `src/element-tools/codeLines.ts`;  epic
  `coherence` P23):  the lines of a file that hold code, blank and comment-only lines left out, the comments by the
  file's extension (HTML's, CSS's, Python's, JavaScript's)
- **Use it when:**  any report counts a file's lines of code, so two reports never give it two sizes.
- **Flag:**  `\.trim\(\)` per line beside `"/\*"` or `<!--` in a counter
- **Copies:**  Spell UI's `LocCount` (`yarn report`) on it since P23.  Left:
  - `epic/src/command/LinesOfCode.ts` (`countsOf()`, `epic loc`):  its own regexes, which also take a `/*` in a
    string for a comment;  in spell-epic's commands, P20's folder while P23 ran, so its swap waits

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
  - `app/scripts/examples-readme.ts`
  - `app/src/spaces/test/fixtures.ts`
  - `epic/src/demo/check-test-run.mjs`
  - `app/src/spaces/server/node/projects/file-utils.ts`:  its `loadJSONFile()`
  - NOTE: `contentFolderOf()` and the toolchain load before `spell/util` can (plain `node`):  check whether they can
    import it before moving them.

### A word that's close to a known one

- **It is:**  `suggest(word, candidates)` (and `levenshtein()` under it):  `spell/util`, `src/util/string.ts`
- **Use it when:**  "did you mean ...?" for an unknown name, attribute or word.
- **Flag:**  `function (levenshtein|editDistance|distance)\(|[Dd]id you mean`
- **Score:**  `function (levenshtein|editDistance|distance)\(` · home `src/util/string.ts`
- **Copies:**  `--`  (epic `coherence` P16 moved spellx's unknown words and attributes onto it)

## Files, folders and processes (node)

### Watching files

- **It is:**  `LiveReload` (`spell/server`):  watches folders, waits for quiet (`debounce`, 250 ms), ignores dot files,
  `node_modules`, lock and editor temp files, and tells each listener which file changed
- **Use it when:**  anything must react to a file changing on disk.
- **Flag:**  `\bwatch\(` imported from `node:fs`
- **Score:**  `import \{[^}]*\bwatch\b[^}]*\} from "(node:)?fs|\bfs\.watch\(` · home `src/server/LiveReload.ts`
- **Copies:**  each its own raw `watch()`, without the debounce or the ignore list
  - `src/server/runs/CommandRun.ts`
  - `epic/src/list/RunningEpics.ts`
  - `app/src/spaces/server/node/storage/DiskStorage.ts`
  - `app/src/cli/commands/watchCommand.tsx`
  - `src/server/page/BundleBuild.ts` (the score's first run found it)
  - `ChunkFiles` (`spell/server/places`, epic `data` P5) is ON it, as a small subclass told each path:  no raw `watch()`.
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

- **It is:**  `PidFile`, `isProcessAlive()`, `newestChange()` (`spell/server`);  `serverAt(base)`, what any server
  says of itself at `/api/server` (epic `coherence` P24)
- **Use it when:**  recording a background process to find, stop or restart it later.
- **Flag:**  `process\.kill\(\w+, 0\)`
- **Score:**  `process\.kill\(\w+, 0\)` · home `src/server/PidFile.ts`
- **Copies:**  three in spell-epic, kept, each saying why:  they load in plain `node`, which can't load `PidFile`
  (it imports the server's barrel)
  - `epic/src/window.mjs`, `epic/src/command/CheckoutServers.ts`, `epic/src/tools/AskListeners.ts`
  - `RunningEpics` and `Sessions` use the kit's since epic `coherence` P7:  they hand it to `ClaudeHome.liveSessions()`
    since P20, which plain `node` loads and so takes the check from its caller (the window script hands its own).
  - Fine:  `epic/src/tool/InboxPoller.mjs` keeps its own:  it loads node's built-ins only, to stay small.
  - spell-epic's VS Code extension on `isProcessAlive()` and `serverAt()` since P24;  the same read of
    `/api/server` left in the kit's `src/server/mainServer.ts` (`liveInfo()`) and spell-epic's
    `epic/src/server/EpicServer.ts` (`epicServerOn()`)

### A free port, a server that stops cleanly

- **It is:**  `freePort()`, `isFree()`, `listenPreferred()` (`spell/server`, `src/server/ports.ts`);  `untilInterrupted()`
- **Use it when:**  starting any local web server.
- **Flag:**  `\.listen\(0|address\(\)\.port`
- **Score:**  `\.listen\(0\b` · home `src/server/ports.ts`
- **Copies:**  `--`

### A server's requests and answers

- **It is:**  `Router`, `toListener()` (its answer when nothing answers, or a handler fails), `HttpError` (a status,
  answered as `{ error }`), `readBody()` / `parseBodies()`:  `spell/server`, each by its file where a bundle must stay
  lean (`spell/server/Router` ...)
- **Use it when:**  any HTTP server, the smallest too:  its failures answered as every Spell server's are.
- **Flag:**  `writeHead\(|createServer\(\((req|request)\b`
- **Copies:**  `--`:  spell-epic's extension's window bridge on them since epic `coherence` P24

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
    helpers across spell-epic and the kit;  Spell UI's design export (`DesignExport.readGit()`) since P23.
  - Fine:  a test's own scratch repo (`spawnSync("git", ...)` in a test);  `epic/src/tool/InboxPoller.mjs`.
  - spell-app's VS Code extension asks `checkoutOf()` whether a window's checkout is a worktree since epic
    `coherence` P24 (its `.git` FILE alone took a submodule for one)

### The epic folder

- **It is:**  `contentFolderOf(root)` (`spell/server/contentFolder`)
- **Use it when:**  finding the epic pages, guides or logs from any checkout.
- **Flag:**  `spell\.epics|spell-app\.epics` written as a path
- **Score:**  `["'\x60](\.\./)*spell(-app)?\.epics["'\x60/]` · home `src/server/contentFolder.ts`
- **Copies:**  `--`

### Claude Code's folder:  its sessions and transcripts

- **It is:**  `ClaudeHome` (`epic/src/config/ClaudeHome.ts`;  epic `coherence` P20):  where it is (`home()`:
  `$CLAUDE_CONFIG_DIR`, Claude Code's own variable, which a test sets too, else `~/.claude`), its running sessions
  (`liveSessions()`), every transcript and one session's (`transcripts()`, `transcriptOf()`);  and `Transcript` beside
  it (`epic/src/config/Transcript.ts`), one transcript read one way:  a line (`parseLine()`), a message's blocks
  (`blocksOf()`), its titles, the end first (`titles()`), its end (`tail()`), the question waiting
  (`pendingQuestion()`)
  - plain `node` loads both (the hooks, the window script)
- **Use it when:**  anything reads Claude Code's sessions, transcripts or queued titles.
- **Flag:**  `homedir\(\), "\.claude"|SPELL_CLAUDE_HOME|CLAUDE_CONFIG_DIR`
- **Score:**  `homedir\(\), "\.claude"|SPELL_CLAUDE_HOME|SPELL_SESSION_TITLES_DIR|process\.env\.CLAUDE_CONFIG_DIR`
  · in `epic/src/` · home `epic/src/config/ClaudeHome.ts`
- **Copies:**  `--` since P20 (`Sessions`, `SessionFolders`, `RunningEpics`, the window script, `ReviewBackfill`, the
  prompt gate and the handoff hook, which named it by three variables, and could disagree).  Left:
  - four rules for what Owen typed, each its own job:  `Sessions.promptText()`, `ActiveTime`'s gaps,
    `ReviewBackfill`'s `NOT_OWEN`, `Requests.promptBlocks()`
  - `ReviewBackfill.sessionsOf()`:  its own walk of an epic's sessions, beside `Sessions.named()` and its index

## Command lines

### A command

- **It is:**  a verb of `spell` (each repo's `src/cli/commands.ts`), or of `epic` (spell-epic's `EpicProgram`):
  commander, with help, flags and the commands page's check
  - `epic`'s on the kit's base since epic `coherence` P20 (`spell/cli`:  `runCommand()`, `rawArgsAfter()`, `runChild()`,
    `CliError`):  each verb's flags listed in its help, any other refused (`epicGroups.ts`, `EpicProgram.checkFlags()`)
  - and its tools read their command lines ONE way:  `parseVerbArgs()`, `stringFlag()`, a wait's `duration()`
    (`epic/src/command/command.types.ts`, which plain `node` loads)
- **Use it when:**  any new tool a person or a skill runs.
  Where it goes and what it's called:  the commands guide, in the epic folder's guides.
- **Flag:**  `function parseArgs\(|argv\.indexOf\(["']--`
- **Score:**  `function parseArgs\(|argv\.indexOf\(["']--`
  · home `src/cli/`, `epic/src/cli/`
- **Copies:**
  - `spell-brand/scripts/compare.ts`
  - the kit's `tools/content-links.ts`, `scripts/favicon.ts`, `tools/repos.ts`;  spell-epic's demo checks'
    `flagValue()`
  - P20 moved spell-epic's onto `parseVerbArgs()`:  six hand-written `parseArgs()` (`PlanDocCommands`, `design.js`,
    `details.js`, `new-page.js`, `pages.js`, the window script), `flagsOf()`, `check-spell.js`
  - beside them, node's own `parseArgs` in Spell UI's tools (`ui/src/tools/cli.ts` ...):  fine for a
    package-local tool

## Pages and the network

### Fetching

- **It is:**  `$fetch()` (`spell/util`):  throws a `ResponseError` subclass for every failure (`NotFoundError` ...)
- **Use it when:**  any request from a page or a client.  Callers never check `response.ok`.
- **Flag:**  `response\.ok|\.ok\)` after a `fetch(`
- **Score:**  `\b(response|answer|res)\.ok\b(?!\()|\(await fetch\([^)]*\)\)\.ok` · home `src/util/spell/$fetch.ts`
  · not `ui/src/`, `src/server/liveClient.ts`
- **Copies:**
  - Fine:  `src/server/liveClient.ts`, served to pages as one function's text:  it imports nothing
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
  (`spell/util/timing`, `src/util/timing.ts`;  re-exported by `spell/element`):  the name says WHEN, each can be
  cancelled;  and waiting:  `waitUntil(read, { timeout, every })` (until something is true), `within(promise, seconds)`
  (a wait with a time limit)
  - util's since epic `coherence` P19 (`spell/element`'s before):  imports nothing, so the kit's server and command
    line, the parser's core and plain `node` may use it
- **Use it when:**  anything later or repeated, or a wait, in a page or on a server.
  Spell UI's lint already fails a raw timer in a component.
- **Flag:**  `setInterval\(|setTimeout\(`
- **Score:**  `\b(setInterval|setTimeout)\(|from "node:timers/promises"|Atomics\.wait\(` · home `src/util/timing.ts`
  · not `src/server/liveClient.ts`
- **Copies:**  raw timers, outside Spell UI's components
  - Fine:  `src/server/liveClient.ts`, served to pages as one function's text:  it imports nothing
  - Fine:  `epic/src/tool/InboxPoller.mjs`:  node's built-ins only, to stay small
  - the node waits and timers sweep 2 found (epic-tools-kit #3, parser-app #2), left for after epic `repo-split` P20:
    the kit's `PidFile`, `FileLock`, `LiveReload`, `CommandRun`, `BundleBuild`, `spell server`'s editor wait,
    `TaskList` (`run.ts`'s drain is `within()`'s since P20);  spell-epic's `details.js`, `comments.ts`, `agents.ts`,
    `Parking`, `InboxCommands` (their times read by `duration()` since P20, their waits still by hand), the window
    script, `showRoutes`, `CheckoutServers`, the demo checks;  spell-app's `serveCommand.ts`, `runTarget.ts`
  - `epic/src/answers/AnswerForm.ts`, `epic/src/answers/RunForm.ts`,
    `epic/src/answers/ChoicesForm.ts`
  - `epic/src/review/ServerLink.ts`, `epic/src/review/SendCountdown.ts`
  - `epic/src/tools/AskListeners.ts`, `epic/src/tools/_assets/spell-doc-comments.js`
  - sweep 1 found about 30 more:  the docs pages' runtime and comments, Spell UI's site, the app's runner and
    editor, the parser's command line (sleeps:  `await after(0.25)` instead)
  - the VS Code extensions:  spell-epic's views wait for their page server on `waitUntil()` since epic `coherence`
    P24;  left:  spell-app's three debounces (`extension.ts`, `ElementsHelp.ts`, `RunnerPanel.ts`, sweep 2's
    quiet wait) and the window bridge's close-window delay (`WindowBridge.ts`)

### Once, however often asked

- **It is:**  `Queued` (`spell/util/timing`, `src/util/timing.ts`;  `E.Queued` through `spell/element`;  epic
  `coherence` P21):  `new Queued({ when, run })`, then `ask()` as often as you like:  the work runs ONCE, at the moment
  `when` names (`afterSolidUpdate`, `beforeNextPaint`, `soon`);  `cancel()` in a cleanup
- **Use it when:**  several events in one turn ask for the same work:  a measurer, a fitter, a re-reader.
- **Flag:**  `[qQ]ueued = (true|false)|cancelQueued|ScheduledFrame`
- **Score:**  `this\.\w*[qQ]ueued\w* = true|this\.cancel\w*(Queued|Scheduled)\w* = ` · home `src/util/timing.ts`
- **Copies:**  `--` in Spell UI and the brand since P21 (the tabs, the menu, a menu's thumb and title fit, the toc, the
  visibility watch, the brand's checklist).  Left:
  - `epic/src/components/epic-page/EpicPage.tsx` (`isLayoutQueued`):  the epic pages' (P22)

### Building a bundle on demand

- **It is:**  `Bundle` (`spell/server`):  built when stale, never committed
- **Use it when:**  any script or stylesheet the page server serves from sources.
- **Flag:**  `from ["'](esbuild|vite|vite-plus)["']` outside a config:  a build of its own
- **Score:**  `import \{[^}]*\bbuild\b[^}]*\} from "esbuild"|\b(vite|esbuild)\.build\(` · home `src/server/Bundle.ts`
- **Copies:**  `--`

### A VS Code extension's build

- **It is:**  `buildExtension({ folder, external, constants, tsconfig, logOverride })` (`spell/toolchain/buildExtension`,
  `src/toolchain/buildExtension.ts`;  epic `coherence` P24):  an extension's entry bundled into one CommonJS file
  for node 20, `vscode` left out, every name found by `sourceNames()`;  then LOADED once with `vscode` stubbed, so a
  crash as it loads fails the build
- **Use it when:**  building a VS Code extension;  its `build.mjs` keeps its own steps around it.
- **Flag:**  `external: \["vscode"`
- **Copies:**  `--` since P24:  `app/vscode/build.mjs` and `epic/vscode/build.mjs` (only spell-epic's
  checked that its bundle loads)
  - Fine:  `src/toolchain/buildExtension.ts` imports esbuild's `build()`, which "Building a bundle on demand"'s Score
    counts:  it IS this mechanism's home

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
    design check and comparison;  the kit's publish check;  the app's examples script;  Spell UI's smoke pages
    (`SmokeRunner`) since P23.
  - Fine:  the kit's `scripts/favicon.ts` (renders an image, checks no page).

### The page server, from an epic page

- **It is:**  `ServerLink` (`epic/src/review/ServerLink.ts`):  the page's token, a stale token's retry,
  and every read, write and poll
  - `isServed()`, `canRead()`, `get()` (on `$fetch()`, JSON or its text), `post()`, `forPage()`
  - a data page's file (the commands page's, the core reference's, the syntax page's):  `getFile()`, by its name now or
    its old one, `.json` for `.json5` (`dataFileNames()`:  the ONE old-name rule, reading and watching alike);
    its `file://` notice is `drawThenBoot()`'s, in the docs helpers (epic `coherence` P22)
  - the static `watch(window, files, refresh, { every, polls })`, with a path test:
    polling while the page is visible, and hearing the page server's file events
- **Use it when:**  an epic element, form or docs page reads or writes through the page server.
- **Flag:**  `SPELL_SERVER\?\.token|protocol !== "file:"`
- **Score:**  `SPELL_SERVER\?\.token|protocol !== "file:"` · home `epic/src/review/ServerLink.ts`
- **Copies:**  `--` since epic `coherence` P9 (the data pages' reads since P22);  only the parked `goals-live.js` keeps
  its own

### A page's store the elements follow

- **It is:**  `PageStore` (`epic/src/review/PageStore.ts`;  epic `coherence` P22):  plain code holding what a
  page's form or client knows, its `version` and `subscribe()`, `changed()` telling every element that follows it;
  one per page and class (`onePerPage()`, a test's own handed over with `adopt()`)
  - on it:  `ReviewClient`, `AgentsClient`, `SendCountdown`, `AnswerForm`, `ChoicesForm`, `RunForm`
  - an element follows one with two lines:  `@E.state accessor version`, then
    `store.subscribe(() => (this.version = store.version))`
- **Use it when:**  a page's elements follow one object's changes:  a form, a client of the page server.
- **Flag:**  `listeners = new Set<\(\) => void>\(\)|static adopt\(`
- **Score:**  `listeners = new Set<\(\) => void>\(\)|static adopt\(` · in `epic/src/`
  · home `epic/src/review/PageStore.ts`
- **Copies:**  `--` since P22 (the six stores)

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
  · not `epic/src/demo/`, `ui/src/tools/`
- **Copies:**  `--`
  - left (epic `coherence` P24):  spell-app's extension's `ElementsHelp.safely()`:  the kit's `Logger` is a class
    VS Code's output channel isn't, and that channel prints an error as its message alone, without its stack
- **History:**  WWOD named all four for months before any existed (epic `coherence` I2).

### Logging

- **It is:**  `Logger` (`spell/util`)
- **Use it when:**  WWOD §19:  any logging a person can turn on.
- **Flag:**  `console\.(log|debug)\(`
- **Copies:**  `--`

## In Spell UI

What a component, or a page built on Spell UI, reaches for first.

### Arrow keys through a list

- **It is:**  `RovingTabindex` (`ui/src/runtime/RovingTabindex.ts`):
  `UI.focus.roving()` attached for an element's life (menus, tabs), `UI.focus.arrowKey()` for one key press from a
  JSX `onKeyDown`;  `tabindex: "left alone"` when the items' tab stops are the caller's (the accordion's titles)
- **Use it when:**  arrows, Home and End move through items:  a tab list, a radio group, a rating, swatches.
- **Flag:**  `Key\.(arrow\w+|home|end)\b`
- **Score:**  `(case |=== )(\w+\.)?Key\.(arrow\w+|home|end)\b` · home `ui/src/runtime/RovingTabindex.ts`
  · not `ui/src/components/ui-calendar/`, `ui/src/components/ui-icon-picker/`, `ui/src/components/ui-dropdown/`, `ui/src/components/ui-search/`, `ui/src/components/ui-slider/`
- **Copies:**  `--` since epic `coherence` P10 (the accordion, markdown's tab list, the radio group, the rating, the
  theme editor's swatches)
  - Fine:  `UICalendar`'s grid and the icon picker's, on purpose:  they step by rows of a grid.
  - Fine:  the dropdown's and the search's arrows move a highlight, not focus ("The highlighted option", below);
    the slider's change its value.
  - Taking it since epic `coherence` P17:  the theme menu's scheme control and list
    (`ui/src/components/ui-theme-menu/`), a shrinkable menu's overflow menu (`UIMenu`).
  - Taking it since epic `coherence` P21:  the brand's `BrandColorSet` (Enter / Space stay its own).
  - Not swept yet:  the docs' search (`UIDocsSearch`).

### The highlighted option of a list

- **It is:**  `F.HighlightedOption` (`ui/src/elements/HighlightedOption.ts`):  the ONE highlighted option a
  control's list shows (`aria-activedescendant`), stepping as `MenuOptions.nextEnabledIndexIn()`
- **Use it when:**  a control opens a list whose arrows move a highlight while focus stays in the field:
  the dropdown, the search, the icon picker.
- **Flag:**  `highlightedIndex|activedescendant`
- **Score:**  `\bhighlightedIndex\b` · home `ui/src/elements/HighlightedOption.ts`
- **Copies:**  `--` since epic `coherence` P10;  not swept yet:  the docs' search (`UIDocsSearch`)

### Loading once per key

- **It is:**  `LoadOnce` (`spell/util/LoadOnce`, `src/util/LoadOnce.ts`;  Spell UI's `spell/ui/util` re-exports it):  `get(key, load)`, every caller the same
  promise;  a failure `kept`, `forgotten`, or `forgotten offline`
- **Use it when:**  a family's import, a pack's script, a language, an icon's SVG, a source file:  anything loaded once
  per page.
- **Flag:**  `Map<string, Promise`
- **Score:**  `Map<string, Promise` · home `src/util/LoadOnce.ts`
  · not `src/util/persist/PrefStore.ts`, `ui/src/components/ui-components/ComponentPacks.ts`, `epic/src/review/ReviewClient.ts`, `app/src/spaces/server/node/prefs/SpacePrefs.ts`, `app/src/spaces/server/node/routes/ProjectBuild.ts`
- **Copies:**  `--` since epic `coherence` P10 (Sources, IconPacks, ComponentPacks, RootLoader's two, EmojiData,
  CodeHighlighter)
  - Fine:  `ComponentPacks.defining` (what's running now, not a load), spell-epic's `ReviewClient.asking`,
    the kit's `PrefStore` (writes in flight)
  - Beside it:  `LoadOnce.abortable()`, one caller's wait ending early while the shared load runs on
    (`Sources`, `PlaceReads`)

### Polling while the page is visible

- **It is:**  `pollWhileVisible(seconds, fn)` (`src/util/polling.ts`):  on `every()`, skipped while the page is hidden,
  once on coming back, never two looks at a time
- **Use it when:**  anything on a page or place asks again and again, whether something changed.
- **Flag:**  `visibilityState` inside an `every(` or a `setInterval(`
- **Copies:**  `--` since epic `data` P4 (the notebook's file poll);  the epic pages' use `ServerLink.watch()` (above)

### A websocket that comes back

- **It is:**  `ReconnectingSocket` (`spell/util/ReconnectingSocket`, epic `data` P8):  opens, and tries again as it closes, 1s then
  doubling to 10s;  `send()` says whether it went
- **Use it when:**  a page keeps a socket open to anything.
- **Flag:**  `new WebSocket\(`
- **Score:**  `new WebSocket\(` · in `src/`, `ui/src/`, `epic/src/`, `app/src/` · home `src/util/ReconnectingSocket.ts` · not `src/server/liveClient.ts`
- **Copies:**  `--`:  `ThemePreference` on it since P8
- **Fine:**  `src/server/liveClient.ts`, served to pages as one function's text:  it imports nothing.
  `parser/src/core/page.ts` (`connectPage()`) opens once:  a program's page has no reconnect yet.

### Everyone's changes, in one order

- **It is:**  `Referee` (`spell/server/places`), `LiveRoomPlace` (`spell/util/places`), both on `RoomCopy`;  epic `data` P8
- **Use it when:**  several people change one thing, and their screens should come back together.
- **Copies:**  `--`
- **Fine:**  `StateMirror` (`parser/src/core/state.ts`):  counted ids and whole things, one way, for a program that runs elsewhere.

### What a program reads from its places

- **It is:**  `P.ReadGathering` (`parser/src/parser/writers/ReadGathering.ts`, epic `data` P12), and on it `core`'s `firstReads` and `select`
- **Use it when:**  anything needs to know, before a program runs, which fields or places its code reaches.
- **Flag:**  a second walk of a project's tree by property name

### Lists asked in the same moment, in one request

- **It is:**  `PlaceBatch` (`src/util/places/PlaceBatch.ts`, epic `data` P12), and `Place.listMany()`
- **Use it when:**  a place whose way of asking can hold several lists.
- **Fine:**  `PlaceReads`, one request for readers of the SAME list:  the two stack.

### Something else behind a place's name, for now

- **It is:**  `Places.useInstead()` / `backToDeclared()` (`spell/util/places`), and on them `useSample()` (`spell/util/places/SamplePlace`);  epic `data` P9
- **Use it when:**  designing against other data, with the line that declares the place untouched.
- **Copies:**  `--`
- **Fine:**  `Places.swap()`:  only where the next read goes, for a place replaced for good.

### What a value was worked out from

- **It is:**  `sourcesReadBy()` (`spell/util/reactive`), with `cellsOf()` to say whose a cell is;  epic `data` P9
- **Use it when:**  asking what a value depends on, once.  To react to it:  `observe()`, or a `Derived`.
- **Copies:**  `--`

### A place in a list

- **It is:**  `positionBetween()`, `ListPosition`, `rowsInPlace()` (`spell/util/places/positions`, epic `data` P8):  a parent and a fraction, one field
- **Use it when:**  people reorder a saved list:  no array to fight over.
- **Flag:**  `splice\(` of a saved list, an `order` or `index` field written by hand
- **Copies:**  `--`

### How long to wait before asking again

- **It is:**  `retryAfter(response, mostMs)` and `backoffFor(attempt, { jitterMs, mostMs })` (`spell/util/retrying`,
  `src/util/retrying.ts`;  lifted from `claudeRunners` by epic `data` P7)
- **Use it when:**  a server said "not now":  they only work out the wait, and waiting is the caller's.
- **Flag:**  `retry-after`, `2 \*\* \(?attempt`
- **Score:**  `get\("retry-after"\)` · home `src/util/retrying.ts`
- **Copies:**  `--`

### Keeping to a service's request limit

- **It is:**  `RateQueue` (`spell/server/places`, `src/server/places/RateQueue.ts`, epic `data` P7):  one queue per NAMED
  limit, in order, spaced over a sliding window;  on a 429 everything waits as it says, and the request goes round again
- **Use it when:**  a place or a tool reaches a service with a limit:  Sheets' now, Airtable's next.
- **Flag:**  `status === 429`
- **Copies:**  `--`
- **Fine:**  `parser/src/cli/claudeRunners.ts`:  one caller at a time, retrying 429s and 529s, with no limit to space out to

### Requests with URL templates and real aborts

- **It is:**  `Api` (`spell/util/Api`, on `fetchOk()`):  URL templates, combined abort signals, a newer request replacing
  an older one;  no lodash.
- **Use it when:**  Spell UI's `UI.api`, and any place that reaches a server (`WebPlace`, epic `data` P4).
- **Copies:**  beside `$fetch()`, until that can sit on it.

### Fetching in Spell UI

- **It is:**  `fetchOk()` / `fetchText()` (`src/util/fetching.ts`;  Spell UI's runtime re-exports them):  an OK answer,
  else the caller's own typed error (`SourceError`, `ApiError` ...)
- **Use it when:**  Spell UI's runtime fetches;  everywhere else, `$fetch()` (above).
- **Flag:**  `response\.ok` in `ui/src`
- **Score:**  `response\.ok` · in `ui/src` · home `src/util/fetching.ts`
- **Copies:**  `--` since epic `coherence` P10 (`Api`, `AppStylesheet`, `Sources`, `IconPacks`);  the docs site's
  `SiteData.request()` since P23

### A fallback's events

- **It is:**  `NativeFallback.send()` (`ui/src/elements/NativeFallback.ts`):  a native fallback's event, named in
  the page's language and cancelable, as the component's own `send()`
- **Flag:**  `new CustomEvent` in a `*.fallback.ts`
- **Score:**  `new CustomEvent` · in `**.fallback.ts` · home `ui/src/elements/NativeFallback.ts`
- **Copies:**  `--` since epic `coherence` P10 (Spell UI's nine fallbacks, the brand's two)

### A fallback's form value and validity

- **It is:**  `NativeFallback.syncForm({ value, control })` (`ui/src/elements/NativeFallback.ts`;  epic `coherence`
  P17):  the form value (none without a `name`, a `FormData` for several) and the native control's validity, anchored
  on it;  the fallback's `sync()` hands it its own, run once attached and on each change.
  `nameFromPlaceholder()` names a control by `placeholder`.
- **Use it when:**  a form control's native fallback reports to its form.
- **Flag:**  `setFormValue\(|setValidity\(` in a `*.fallback.ts`
- **Score:**  `\.(setFormValue|setValidity)\(` · in `**.fallback.ts` · home `ui/src/elements/NativeFallback.ts`
  · not `ui/src/components/ui-button/UIButton.fallback.ts`
- **Copies:**  `--` since P17 (Spell UI's nine fallbacks, the brand's two;  the button's submit value is its own)

### A form control's attributes

- **It is:**  `UIT.FormControlAttributes` / `UIT.FormControlStates` (`ui/src/components/components.types.ts`):
  `name`, `required`, `readonly`, `placeholder`;  the `readonly` and `invalid` states;  ONE shape each
- **Use it when:**  a vocabulary of a control with a value:  take them by name, its own `description` where it says
  more.
- **Flag:**  `name: "readonly"` in a vocabulary
- **Score:**  `name: "readonly"` · home `ui/src/components/components.types.ts`
  · not `ui/src/components/ui-form/`, `ui/src/components/ui-property-editor/`
- **Copies:**  the brand's two controls (`BrandColorPicker.en.ts`, `BrandComposer.en.ts`);  `<ui-field>`'s and the
  property editor's `readonly` are their own (a group's, reaching each field)
  - Left (P21 tried):  a pack's vocabulary is bundled into its pack, which may import only what a page shares
    (`PACK_MODULES`, the kit's `src/element-tools/packModules.ts`), and `components.types` isn't one;
    `spell/ui/core`'s `UIT` can't load in node, where the pack's catalog and docs data read the vocabularies

### A keyboard shortcut

- **It is:**  `UI.keyboard` (`ui/src/runtime/Keyboard.ts`) and `Chord` (`ui/src/runtime/Chord.ts`):
  one registry, scopes per overlay, `Mod` for Command on a Mac and Control elsewhere
  - `Chord` is Spell UI's ONE reading of a shortcut (epic `coherence` P21):  `<ui-keys>` and `<ui-action>` draw what
    it reads (`UI.keyboard.chord(text, { isApple })`:  its modifiers in the order written, then its key), from ONE set
    of key caps, `UIKeys.capsOf()`, their words translated (`keyCapTexts`)
- **Use it when:**  any key combination a page or component answers.
- **Flag:**  `(metaKey|ctrlKey) &&`
- **Score:**  `(?<!!)\b\w+\.(metaKey|ctrlKey) &&`
  · home `ui/src/runtime/Keyboard.ts`, `ui/src/runtime/Chord.ts`
- **Copies:**  six (sweep 0, the elemental-spell dry run):  the editor's hotkeys, the docs search, the epic toolbar and
  comments, the live client, a details pane
  - Left:  spell's own reading, `shortcutMatches()` (`parser/src/core/acting.ts`):  spell's core can't import
    Spell UI, so a grammar both share would live in the kit (sweep 2, ui-components #3)

### An animation in or out

- **It is:**  `UIComponent.onVisibleChange()` (`src/element/UIComponent.tsx`):  animates as an element shows or hides
- **Use it when:**  an overlay or a toast comes and goes.
- **Copies:**  `--`:  the six overlays animate here, and open and close through their `Disclosure`
  ("A disclosure:  open and closed", below;  epic `coherence` P8)

### A box's close button

- **It is:**  `E.CloseButton` (`ui/src/elements/CloseButton.tsx`;  epic `coherence` P21):  THE close button of a
  box that closes, its icon and its name, drawn while it can close (`draw()`)
- **Use it when:**  a box that closes shows a close button:  a message, a toast, a nag, a dialog.
- **Flag:**  `class=\{UIT\.CLOSE_CLASS\}`
- **Score:**  `class=\{UIT\.CLOSE_CLASS\}` · in `ui/src/` · home `ui/src/elements/CloseButton.tsx`
- **Copies:**  `--` since P21 (the message, the toast, the nag, the dialog)

### An element's own link

- **It is:**  `UIComponent.linkTo` and `linkTarget` (the kit's `spell/element`;  epic `coherence` P21):  where its own
  `<a>` goes, its `link` (the family's own or the shared one) unless it's disabled, and its `target`
- **Use it when:**  a family draws its own `<a>` for `link`:  its `href` and `target`.
- **Flag:**  `href=\{this\.(link|disabled|isDisabled)`
- **Score:**  `href=\{(this\.(isD|d)isabled \? undefined : )?this\.link\}|target=\{this\.(sharedTarget|target)\}`
  · home `src/element/UIComponent.tsx`
- **Copies:**  `--` since P21 (text, link, button, label, card, step, item, breadcrumb, image, header;  the parts'
  author, title and detail)

### An element's own `:host` rule

- **It is:**  `UIComponent`'s `hostLayout` hook (the kit's `spell/element`;  epic `coherence` P21):  a getter of
  declarations, written into ONE sheet adopted into the shadow root, never the page's `style`
- **Use it when:**  an element's own layout follows its attributes:  a stack's gap, a cell's span, a root's size.
- **Flag:**  `<style>\{this\.|:host \{ \$\{`
- **Score:**  `<style>\{this\.hostLayout\}</style>|:host \{ \$\{` · home `src/element/UIComponent.tsx`
- **Copies:**  `--` since P21 (stack, cell, terms;  the root's sheet, `RootBox`, is its declarations now)

### Joining a container:  `parent`

- **It is:**  `ParentLink` (the kit's `spell/element`, `src/element/ParentLink.ts`;  Spell UI's until epic `coherence`
  P21):  `parent="<id>"` moves the element into the container with that id;  `UIComponent` follows it for every tag
  whose vocabulary declares `parent`
- **Use it when:**  an element written apart on the page belongs in a container:  a tab, a step, a section.
- **Flag:**  `new E\.ParentLink\(`
- **Score:**  `new E\.ParentLink\(` · home `src/element/UIComponent.tsx`, `src/element/ParentLink.ts`
- **Copies:**  `--` since P21 (the tab's, step's and section's own)

### A click on a control of its own

- **It is:**  `OwnControls.isClicked(event, { upTo, before })` (the kit's `spell/element`, `src/element/OwnControls.ts`;
  epic `coherence` P21):  ONE list of what counts as a control inside an element, ONE walk of the click's path
  - beside it, the dialog's and the toast's approve / deny walk:  `UIT.ModalActions`
    (`ui/src/components/components.types.ts`)
- **Use it when:**  a click on an element acts, unless it landed on a button, link or field inside:  a linked element,
  a folding title, a toast that closes on a click.
- **Flag:**  `"a\[href\], button, input`
- **Score:**  `"a\[href\], button, input|TITLE_CONTROLS|const CLICKABLE =` · home `src/element/OwnControls.ts`
- **Copies:**  `--` in Spell UI since P21 (`UIComponent`'s link click, the accordion's and section's titles, the toast).
  Left:
  - `epic/src/components/epic-item/Fold.tsx` (`CONTROLS`, a line's actions slot too):  the epic pages' (P22)

### A row that scrolls sideways

- **It is:**  `scrollEnds(row)` and `scrollByRow(row, direction)` (`spell/util`, `src/util/dom.ts`;  epic `coherence`
  P21):  which ends can still scroll, and a step of most of the row, at once under reduced motion
- **Use it when:**  a row's `‹` / `›` keys:  Spell UI's `<ui-toolbar>`, the kit's site header.
- **Flag:**  `scrollLeft \+ [\w.]*clientWidth <`
- **Score:**  `scrollLeft \+ [\w.]*clientWidth <|clientWidth \* (PAGE_SHARE|SCROLL_SHARE)` · home `src/util/dom.ts`
- **Copies:**  `--` since P21 (the toolbar, the site header)

### The next frame

- **It is:**  `nextFrame(count)` (`spell/util`, `src/util/dom.ts`):  after one frame, or `count` (epic `coherence` P11)
- **Flag:**  `new Promise\(\(resolve\) => requestAnimationFrame`
- **Score:**  `new Promise\(\(resolve\) => requestAnimationFrame` · home `src/util/dom.ts`
- **Copies:**  `--` since P11 (Spell UI's site sections and visual fixture, the docs pages' `nextFrames()`, the comments'
  `nextFrame()`)
  - Left:  `PerfRun`'s own, on purpose:  it has no imports (served as plain JS)

### The section being read;  landing on a link

- **It is:**  `TocIndex` (`ui/src/components/ui-toc/TocIndex.ts`):  `current()`, `reached()`, `decode()`,
  `slug()`;  and `HashLanding` beside it (epic `coherence` P11):  landing on a `#hash` below the stuck titles
  - a landing:  the page ready, its pane shown and folds opened, the scroll to its line, once more as it settles unless
    the reader moved;  one per document, a newer landing stops an older one
  - a page with stuck bars of its own lands its hashes itself, by its rules (`use()`):  the site's `SiteSections`, the
    epic pages' runtime;  `<ui-toc>` and `<ui-docs-api>` then leave them to it, so the page scrolls once
- **Use it when:**  following the scroll, turning an address's `#hash` into a section, or landing a link.
- **Flag:**  `scrollIntoView\(|hasReaderMoved`
- **Score:**  `hasReaderMoved|decodeURIComponent\((\w+\.)*location\.hash`
  · home `ui/src/components/ui-toc/TocIndex.ts`, `ui/src/components/ui-toc/HashLanding.ts`
- **Copies:**  `--` since P11 (Spell UI's toc, site sections and API tables;  the docs pages' runtime);  the API
  tables' own hash decoding (`idForHash()`) on `decode()` since P23
  - Fine:  `epic/src/components/epic-section/EpicFold.tsx`, `epic/src/components/epic-item/EpicItem.tsx`:
    since P18 they only open for a link (a page whose lander doesn't know epic folds), never scroll
  - Left:  the comments' toolbar (`spell-comments.entry.js` `currentSection()`):  it bundles no Spell UI
  - the runtime's `EPIC_LAND_GAP` is its own since P22, no mirror:  `EpicFold`'s `LAND_GAP` went in P18
  - Left:  the site sections' sticking, in the site (the finding's "later":  into Spell UI's own code)

### Copying, with VS Code's side bar

- **It is:**  `copyText()` (`spell/util`, `src/util/dom.ts`):  the browser's clipboard call, else the old
  `execCommand("copy")` VS Code's side bar still allows;  and Spell UI's `E.ClipboardCopy`
  (`ui/src/elements/ClipboardCopy.ts`) for a copy button:  the copy, then "Copied" for a moment
- **Flag:**  `navigator\.clipboard\.writeText`
- **Score:**  `navigator\.clipboard\.writeText` · home `src/util/dom.ts`, `ui/src/elements/ClipboardCopy.ts`
- **Copies:**  `--` since epic `coherence` P10 (Spell UI's code block and theme editor, the brand's colour picker and
  swatch, the epic pages' `Clipboard`);  Copy my answers (`<epic-choices-bar>`) on `ClipboardCopy` since P18
  - Left:  the parked goals page (`goals-live.js`), read only

### A toast

- **It is:**  `UI.toast({ message })` (`ui/src/components/ui-toast/ToastStack.ts`):  bottom right, with its
  type's icon, by default (epic `coherence` P10)
- **Flag:**  `position: "bottom right"|showIcon: true`
- **Score:**  `position: "bottom right"|showIcon: true` · home `ui/src/components/ui-toast/ToastStack.ts`
- **Copies:**  `--`;  left:  the parked goals page (`goals-live.js`)

### A file a script writes, kept current

- **It is:**  `writeOrCheck()`, `spliceGenerated()` (`spell/element-tools/generatedFiles`, `src/element-tools/generatedFiles.ts`;
  epic `coherence` P11, from Spell UI's)
  - formatted first, in memory, as `yarn format` would:  `SRV.formatHTML(file, text)` (`spell/server`), which reads
    any file's extension (`.ts`, `.css`, `.json`);  Spell UI's generators through `formatted()`
    (`ui/src/tools/generatedFiles.ts`;  P23), never a `vp fmt` run afterwards
- **Use it when:**  a script writes a file, or a block of one, that `--check` must find unchanged.
- **Flag:**  `stale:  .*yarn|readOrEmpty|"vp", "fmt"`
- **Score:**  `stale:  .*yarn|readOrEmpty|"vp", "fmt"` · home `src/element-tools/generatedFiles.ts`
- **Copies:**  `--` since P11 (spell-epic's and the brand's site data, the app's site data, examples README and
  grammar, the kit's `mermaid:pretty`);  Spell UI's `gen:root`, `gen:styles` and the status report's tables since
  P23, each with `--check`.  Left:
  - Spell UI's Theming playgrounds (`site-kitchen.ts`, `PlaygroundWriter`):  a regex over each
    `<ui-docs-tokens playground>`, as an empty one gets its markers on its first fill, and its family names the block
  - `epic/src/tools/pages.js` (`tidy()`):  `yarn vp fmt` as a child;  P20's folder

### A page bundle's build

- **It is:**  the kit's `Bundle` (`spell/server`, `src/server/Bundle.ts`):  `clearOutput()`, `linkIconPacks()`,
  `sizeReport()`, a build script's steps (epic `coherence` P11)
- **Use it when:**  a script builds a bundle the page server serves.
- **Copies:**  `--` since P11 (Spell UI's site bundle, the brand's build)

### A component set's data

- **It is:**  Spell UI's `SiteDataBuilder` (`ui/src/tools/SiteDataBuilder.ts`), its `set` and `forSet()`
  (epic `coherence` P11):  a set's own groups as the topics, its own side-column links, its pages one flat folder
- **Copies:**  `--` since P11 (the brand's, Epic UI's and App UI's data)

### A docs element's site data

- **It is:**  `SiteDataLoad` (`ui/src/docs-components/SiteDataLoad.ts`;  epic `coherence` P23):  a docs element's
  field, `readonly data = new SiteDataLoad()`:  the site's data once it's in (`value`), why it didn't come (`error`),
  `isLoading`, `loaded`;  reactive, as the element's own members are
- **Use it when:**  a docs widget shows something from the site's data (`components.json5`, `SiteData.load()`).
- **Flag:**  `SiteData\.load\(\)\.then`
- **Score:**  `SiteData\.load\(\)\.then` · home `ui/src/docs-components/SiteDataLoad.ts`
- **Copies:**  `--` since P23 (`<ui-docs-api>`, `<ui-docs-tokens>`, `<ui-docs-nav>`)
  - Fine:  `<ui-docs-search>`:  it loads on first use, the search's own file with the data

### A family's examples

- **It is:**  `FamilyExamples` (`ui/src/tools/FamilyExamples.ts`;  epic `coherence` P23):  a family's element
  example files, its main one first (`files()`), and each file's sections (`sections()`:  its `<h4>` the title, its
  class, its body dedented, comments left out)
- **Use it when:**  a tool shows a family's examples:  the kitchen sink and its Theming playgrounds, the design export.
- **Flag:**  `examples/elements` read by a tool
- **Copies:**  `--` since P23 (`site-kitchen.ts`, `DesignComponents`)
  - Fine:  `DesignBrand`:  the brand's examples are its docs pages', not example files

### A sheet's tokens

- **It is:**  `ComponentTokens.declarations(css, prefix)` (`ui/src/styles/ComponentTokens.ts`):  every custom
  property a sheet declares, with its rule's selector and whether it's nested;  `FoundationTokens.rootDeclarations()`
  the ones on `:root` itself (`ui/src/tools/FoundationTokens.ts`;  epic `coherence` P23)
- **Use it when:**  a tool reads a sheet's tokens:  the site's token tables, the design export's `tokens.json`, the
  theming codemod.
- **Flag:**  a character scanner over CSS for `--` names
- **Copies:**  `--` since P23 (the design export's own scanner went)

### Spell UI's folder, the site's pages, the page server

- **It is:**  `SPELL_UI_ROOT` and `sitePages()` (`ui/src/tools/tools.types.ts`), `ensurePageServer()`
  (`ui/src/tools/pageServer.ts`;  epic `coherence` P23)
- **Use it when:**  a Spell UI script or tool needs the repo's folder, the docs site's pages, or the page server
  running.
- **Flag:**  `new URL\("\.\.(/\.\.)*/?", import\.meta\.url\)|import\.meta\.dirname, "\.\."`
- **Score:**  `fileURLToPath\(new URL\("\.\.(/\.\.)*/?", import\.meta\.url\)\)|import\.meta\.dirname, "\.\.`
  · in `ui/src/tools` · home `ui/src/tools/tools.types.ts`
- **Copies:**  `--` since P23 (17 copies of the folder, four page listers, two server starts)

### A theme's values

- **It is:**  a theme file, `<name>.theme.json5`, its values in the theme tree's nested groups (`themeTree`,
  `ui/src/styles/styles.en.ts`), and `ThemeFile` (`ui/src/styles/ThemeFile.ts`), which checks it and
  writes its sheet (epic `debut` P18);  `yarn gen:styles` writes every one
- **Use it when:**  making or changing a theme, reading a theme's values (`ThemeFile.values()`), or listing the names
  a theme may set (the tree, `theme.schema.json`):  never by reading a theme's CSS.
- **Copies:**  `--` (the theme editor writes its own sheet until it moves onto theme data, epic `debut` P22)

## In spell-epic and the parser

### An item's id, and its letter

- **It is:**  `ItemLetters` (each section's letter), with `ITEM_ID` and `isItemId()` beside it
  (`epic/src/definitions/definitions.types.ts`;  epic `coherence` P20):  a letter or two and a number, any case
  (`J3`, a comment's `c3`, an Overview part's `o2`);  the tool's `KINDS` and `epic`'s kinds take their letters from it
- **Use it when:**  reading an id someone typed or a page holds, or naming a kind by its letter.
- **Flag:**  `\[a-z\]\{1,2\}\\d\+|\[qcitvd\]`
- **Score:**  `(ITEM_ID|ITEM_REF)\s*=\s*/|\[qcitvd\]` · in `epic/src/`
  · home `epic/src/definitions/definitions.types.ts`
- **Copies:**  `--` since P20 (`PlanDoc`, `PhaseTakes`, `ReviewInbox`, `ToReviewMarks`, `epicArgs`;  `ReviewBackfill`'s
  letters, which missed J and M).  Left:
  - `epic/src/tools/_assets/spell-doc-toolbar.js`:  a section label's leading id, in the docs runtime (P22's folder)
  - Fine:  `epic/src/tool/migrations/ItemRenames.ts`:  one letter on purpose, the old ids it renames

### A growing text box

- **It is:**  Spell UI's `<ui-textarea grow>` (`ui/src/components/ui-input/UITextarea.tsx`;  epic `ui-gaps`
  P14):  grows with its text, to a third of the window or `max-rows`;  and on it spell-epic's `<epic-text-box>`, for a
  note or a comment (`type="note"` for a box another element reads itself, `value`)
  - a ONE-LINE answer box, a line that wraps and grows:  `keepOneLine()` on its input, `stopNewLine()` on its keys
    (`epic/src/answers/answers.types.ts`;  epic `coherence` P22):  the choice rows', the run rows', the syntax
    page's class names
- **Flag:**  `field-sizing|growField`
- **Score:**  `field-sizing|function growField` · in `epic/src/`
  · home `epic/src/components/epic-text-box/`, `ui/src/components/ui-input/`
- **Copies:**  `<epic-agents>`' redirect note and `<epic-new-item>`'s note since epic `coherence` P14;
  `<epic-review>`'s note and the choice rows since epic `ui-gaps` P14;  the run rows and the syntax page's feedback
  since P22.  Left:
  - the docs helpers' `growField()`:  the comments' fields, native on purpose (made by the comments' code, kept
    through every redraw), and the runtime's New epic box (an HTML string)
  - the syntax page's boxes (`syntax-choices.css`):  native on purpose, 750 of them, each a `<ui-textarea>` would draw
    a shadow root

### Saving in the background

- **It is:**  `SaveQueue` (`src/util/places/SaveQueue.ts`), handed the save call and the wait:
  saves in order, one at a time, retries every 3s, sends as the page goes away, keeps a browser copy (`BrowserCopy`),
  and words where it stands
- **Flag:**  `retry.*save|save.*retry|keepalive`
- **Score:**  `setTimeout\(\(\) => (void )?(this\.)?save\(` · home `src/util/places/SaveQueue.ts`
- **Copies:**  `--` since epic `data` P3:  `DraftSaver` and `PendingChanges` are both on it

### A list, with bodies on demand

- **It is:**  `ChunkedPlace` (`src/util/places/ChunkedPlace.ts`), handed a `ChunkFormat` and a `ChunkStore`:  summaries with no
  body read, each body when it's read;  writes the body first and the list last (`ChunkFiles`, for a tool writing straight off)
- **Use it when:**  a long list ships as a skeleton, and each thing's body comes when it's opened.
- **Copies:**  `--` since epic `data` P6:  epic pages read through it (`EpicPageFormat`), and write their files through `ChunkFiles`.
  `LoadableBody` stays:  it's what draws a body, and any other section's still comes through `UI.sources`.

### A draft that saves itself

- **It is:**  `DraftSaver` (`epic/src/answers/DraftSaver.ts`), on `SaveQueue`, handed the save call, the wait and the key:
  saves as you type, says "saved 14:04", retries a failed save every 3s
- **Flag:**  `draft saved|saveDraft`
- **Score:**  `\bdraftTimer\b|setTimeout\(\(\) => (this\.)?saveDraft` · home `epic/src/answers/DraftSaver.ts`
- **Copies:**  `--` since epic `coherence` P9 (the seven forms)

### A block's actions row

- **It is:**  `<epic-actions>` (`epic/src/components/epic-actions/`), made by the docs helpers'
  `addBlockAction()` just before a block with no title row:  the bullhorn, then a table's expand button, over the
  block's top right corner;  every page's since epic `coherence` P22 (an epic page's alone since epic `epic-engine` P45)
- **Use it when:**  a docs-page feature puts a control on a block:  a paragraph, a table, a list.
- **Flag:**  `spell-block-actions|spell-block-buttons`
- **Copies:**  `--` since P22 (the plain `div.spell-block-actions` went)

### A page's tables, watched

- **It is:**  the docs runtime's `eachTable(main, { added, gone, keeps, redraw })`
  (`epic/src/tools/_assets/spell-doc-runtime.js`;  epic `coherence` P22):  each table's box handed over once,
  now and as a part's body or a live update adds tables;  a redraw batched to a frame (`redrawSoon()`)
- **Use it when:**  a docs-page feature works on every table:  the expand button, a two-column table's wrap, the stuck
  header row.
- **Flag:**  `new MutationObserver\(\(\) => requestAnimationFrame\(`
- **Copies:**  `--` since P22 (the three table features)

### The same program in two forms

- **It is:**  the translator (`parser/src/spell/translate/Translator.ts`), rule by rule over the match tree;
  `ShapeCheck` (`parser/src/spell/translate/ShapeCheck.ts`) to compare what two forms compile to
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
  - the docs pages' heading ids on `slug()` since epic `coherence` P22 (the runtime's `headingSlug()`, cut at 48), and
    the toolbar's access letters on `withoutAccents()`
  - spell-epic's VS Code extension's `escapeAttribute()` on `escapeHTML()` since P24
  - Fine:  `epic/src/tools/_assets/spell-doc-toolbar.js`:  its `titleWithKey()` takes a title apart (`NFD`) to
    mark the letter in place, it folds nothing

### Numbers

- **It is:**  `clamp()`, `kb()` (one unit:  KB of 1024):  `src/util/number.ts`
- **Flag:**  `Math\.min\(.*Math\.max\(|/ 1024`
- **Score:**  `Math\.min\(.*Math\.max\(|Math\.max\(.*Math\.min\(|/ 1024\b` · home `src/util/number.ts`
- **Copies:**  the comment pane's two on `clamp()` since epic `coherence` P18;  the docs pages' toolbar, runtime
  (paging) and comments entry since P22.  Left:
  - the runtime's two-column tables (`fitTwoColumns()`):  `Math.max(0, Math.min(...))`, its floor winning when the
    room is narrower than the second column's least, which `clamp()` would turn around

### Local dates and times

- **It is:**  `localDate()`, `clockTime()`, `localMinutes()`, `localTime()` ...:  `src/util/time.ts`, standalone, so
  plain `node` loads it by its name with `.ts`
- **Use it when:**  any date or time a person reads, or a file is named by.  NEVER `toISOString().slice(0, 10)` for a
  local date:  it's UTC, tomorrow in the evening west of Greenwich.
- **Flag:**  `toISOString\(\)\.slice\(0, ?10\)|padStart\(2, "0"\)`
- **Score:**  `toISOString\(\)\.slice\(0, ?(10|16|19)\)` · home `src/util/time.ts`
  - `padStart(2, "0")` is left out:  it finds hex colours and counters as often as times
- **Copies:**  fine:  spell-app's people days, saved as UTC midnight on purpose
  - Fine:  `app/src/spaces/server/node/people/PeopleStore.ts`

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
  - on it:  Spell UI's `PopoverPanel` (`ui/src/elements/PopoverPanel.ts`):  the popover, its `UI.overlays`
    entry and its anchor, written inline, for the dropdown, calendar, search and icon picker, and a shrinkable menu's
    overflow menu (in `spell/ui/core` since P17:  a menu has no value)
  - on it:  spell-epic's `Fold` (`epic/src/components/epic-item/Fold.tsx`):  a box an epic element folds by
    itself, and THE fold button (`fold.button()`):  every card's band and every panel's title;
    fold-all and open-all (`foldAllUnder()`, `expandAllUnder()`) close and open each block's
    - an open state of an element's own takes it too, handed as an `Opener` (`Fold.button()`, `Fold.band()`):
      an item's line, a reviewed option's header (epic `coherence` P22)
- **Use it when:**  anything that opens and closes.  The words:  [words.md](words.md), "open / close".
- **Flag:**  `requestChange\("is(Open|Visible|Collapsed)|"ui-opening"|beforematch|aria-expanded=\{this\.is`
- **Score:**  `requestChange\("is(Open|Visible|Collapsed)"|addEventListener\("beforematch"|aria-expanded=\{this\.isOpen`
  · home `src/element/Disclosure.ts`
- **Copies:**  taking it today:  the five popovers (the menu's overflow since P17), the six overlays (the dialog's two,
  dimmer, popup, sidebar, nag, toast), `<ui-section>`, `<ui-example>`, `<ui-zoom>` (P17), `<ui-message>` (P21),
  spell-epic's `EpicFold`, `EpicItem` and `Fold`.  Left:
  - `ui/src/components/ui-accordion/UIAccordion.tsx`:  many panels in one `open` (`"0 2"`), on `<details>`,
    which keeps its own `aria-expanded` and find-in-page;  an exclusive open closes another in the same change
  - `<ui-nag>`'s `ui-opening`:  sent as it has slid in, not as a request
  - spell-epic's `EpicChange`, `EpicThread`, `EpicNewItem`, `EpicPageNoteHead`:  buttons that open more than a fold
    (a chip, a thread's head, the new-item form, a note's head);  their tooltips wait on elemental-spell's Q74
  - `epic/src/tools/_assets/spell-doc-runtime.js`:  `setCollapsed()` (silent restores, by the elements' own
    `collapsed` / `open`, which their `Disclosure` follows), `setFolded()` (the saga pages' plain headings:  no
    element to hold one), `addFoldAll()`
  - `spell/ui/site/_src/SiteSections.ts`:  remembers folds (`PrefStore`), as it does

## Wanted

Mechanisms with several copies and no shared one yet:  each a fix for a later phase, or for the epic that owns the
code (epic `coherence`, Q4 and Q5).

- **A file watcher:**  `LiveReload`'s watching half (debounce, ignore list), on its own, for the four raw watchers.

## Fine as it is

Copies a sweep found and Owen kept, with why:  a later sweep skips them.

- `parser/src/markdown/blocks/BlockScanner.ts`:  markdown's block structure is a state machine, not a grammar;
  it asks rulex's line rules what each line is.
- Spell UI's marked and the parser's markdown:  two engines on purpose (the parser's markdown `AGENTS.md`).
- `epic/bin/`, its hooks:  each stands alone, so a few lines of boilerplate repeat.

## See also

- [words.md](words.md):  one word for each idea
- [WWOD](../wwod/WWOD.md), §2 › "DRY":  the rule this list serves
