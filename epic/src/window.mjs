#!/usr/bin/env node
/**
 * `epic window <command>`:  the VS Code windows Owen works in, one per package.
 *
 * ## Window files
 * - Where:  the windows folder, by default the content folder's `windows/`, `../spell-app.epics/windows`:
 *   each machine's own, git-ignored there.
 *   - set by `windowsFolder` in the repo's `.epic/config.json5` (epic `epic-eject` P13)
 *   - Before P13 they were in spell-app, `workspaces/`, tracked and marked `skip-worktree`:
 *     `move` carries them over once (`moveWindowFiles()`), each folder path rewritten for the new place.
 *   - Their folder paths are relative to the FILE:  every writer computes them from the windows folder.
 * - `<windowsFolder>/<pkg>.code-workspace`:
 *   open a package's window from it (`code <windowsFolder>/ui.code-workspace`).
 * - Its FIRST folder is the repo root, the whole branch;  then the shared content repo.
 *   - Why the root first:  the Claude Code panel lists only the sessions saved under a window's first folder,
 *     so every window lists every session.
 *   - No package folder since 2026-10-06 (Owen:  "just check out the full branch").
 * - Its own colour theme, so windows are told apart at a glance (instead of VS Code profiles).
 * - Each file shows ONCE in Explorer and Quick Open (`filesExclude()`):
 *   `.claude/worktrees/` hidden, and the shared links shown only under the `spell-app-dev` folder.
 *   - generated files, icons and screenshots stay out of Quick Open and Find
 *     through the root's `.vscode/settings.json` (`search.exclude`)
 * - The folders and names come from the repo's `.epic/config.json5` (`EpicConfig`, `CONFIG`):
 *   - the content repo (`contentFolder`)
 *   - the worktrees' folder (`worktreesFolder`)
 *   - the window files' folder (`windowsFolder`)
 *   - the window names (`windows`)
 *   - The names in this header are their defaults.
 * - A saved workspace can gain and lose folders (a worktree, while a session works in it) without restarting
 *   extensions;  a one-folder window can't, and its Claude panel restarts.
 *   - NEVER add one any more:  VS Code writes the folder into the window file, where it outlives the worktree
 * - The whole repo's window file is written when it's missing (`ensureRepoWindow()`, by `open`, `launch` and `init`;
 *   epic `epic-engine` I15):  spell-epic's, in its own git-ignored `workspaces/` (its `windowsFolder`)
 * - The repo's own settings, in every window file (`windows.settings` in its config;  epic `intellisense` P4):
 *   the WINDOW-scoped ones a folder's `.vscode/settings.json` can't give in a window of several folders,
 *   e.g. which TypeScript the editor runs, or a window-wide theme setting
 *   - no repo names any today (epic `intellisense` P7 moved the kit's TypeScript settings out):
 *     the feature stays, for the next window setting a repo needs
 *   - written as a file is made, and into the ones that exist by `init`
 * - `git.detectWorktrees` on:  Source Control lists every worktree as its own repo, changes and diffs included,
 *   so a session that STAYS in its window when it isolates (below) is still reviewable there.
 *   - every package window lists every worktree;  takes a window reload
 *
 * ## The window a session runs in
 * - spell-epic's VS Code extension (`vscode/src/WindowBridge.ts`) runs a small server in EVERY window,
 *   and writes `~/.spell-epic/windows/<pid>.json` (`{ pid, port, token, workspaceFile, folders }`),
 *   `pid` being the window's extension host.
 *   - The spell language extension's bridge (spell-app's `packages/vscode`, until it drops it)
 *     writes the same into `~/.spell/windows/`:
 *     read too, after spell-epic's (`Window.registries`), so a window with either one works.
 * - A Claude Code session is a child of that extension host,
 *   so `Window.current()` walks up this process's parent pids to the first one with a registry file.
 *   - not a session (a terminal's shell is a child of VS Code's pty host, not the extension host):
 *     the window with `process.cwd()` in one of its folders after the first
 * - Then `Window.request(op, body)` asks THAT window, not the focused one (which is what a `vscode://` URI gets).
 * - `import { Window } from "<relative path>/src/window.mjs"`:  the CLI runs only when this file is run.
 * - Tests:  `node --test tests/window.test.mjs`.
 *   `SPELL_EPIC_WINDOWS_DIR` and `SPELL_WINDOWS_DIR` override the registry folders.
 *
 * ## A worktree's window
 * - `/isolate` and `/epic` open a worktree in a NEW window (`open <name>`).
 * - Then the session MOVES there (`handoff <name>`):
 *   when its turn ends, the worktree's window opens it in an editor tab (never the sidebar),
 *   and the old window closes its tab.
 *   - So `/isolate` ends its turn RIGHT AFTER `handoff`, and does the rest (`yarn install` ...) in the new window.
 *   - `--prompt <text>`:  typed into the new tab's input, so Owen only presses enter to carry on.
 * - On leaving (`/isolate done`), it does NOT move back:  it stays in the worktree's window, which Owen closes
 *   (`close <name>` closes it and deletes its file).
 *   `handoff <name> --back` still moves a session back to its package's window,
 *   but no skill uses it any more (Owen, 2026-10-03:  "just confusing things").
 *   - A session can't move processes:  the new tab RESUMES it (same session id),
 *     and closing the old tab ends the old `claude` process.
 *   - The resumed session goes back into its worktree by itself (Claude records `worktree-state` in the transcript),
 *     but ONLY one that entered with `EnterWorktree`, never one started in the worktree's folder
 *     (epic `epic-eject` I3).
 *     The new tab starts in the worktree's window, whose first folder is the worktree, so it's there anyway;
 *     the session-start guard (`hooks/worktree-guard.mjs`) records a session started there,
 *     and sends one reopened elsewhere back.
 *   - Why wait for the turn to end:
 *     until then the old process is still writing the transcript, and the new tab would load it half-written.
 *   - The repo's `Stop` hook (`.claude/hooks/handoff.mjs`) starts `resume`, detached,
 *     since closing the old tab kills the hook's own `claude`.
 *   - The old tab is found by its label, the session's title:  its `/rename` title (the prompt hook,
 *     `.claude/hooks/prompt-gate.mjs`, sets it on `/isolate <name>`), else Claude's own.
 *     No single match (two sessions with one title):  it stays open, idle;  close it by hand.
 *   - Log:  `<registry>/handoffs/<session id>.log`.
 * - Docs shown while the move is pending (`show`, `epic open`) wait for it, then show in the window the
 *   session moved to:  the window it's leaving is about to close its tab.
 * - Its file:  `<windowsFolder>/ongoing/<name>.code-workspace`, beside the package windows' files.
 * - A MULTI-REPO top (`EpicConfig.top`, epic `epic-engine` P10:  `~/www/spell`, `"repos"` in its config):
 *   the TOP's config throughout, from any child repo or worktree.
 *   - Folder 1 of every window:  the main top checkout, its files hidden in an epic's window.
 *   - Then `⎇ <name>`, the epic's worktree of the top (each child repo's inside it).
 *   - Then the content folder.
 *   - `windows.worktreeOnly` in the top's config drops folder 1.
 * - A worktree BESIDE the repo (`worktreesFolder` outside it, or `windows.worktreeOnly`;  epic `epic-eject` P8):
 *   a worktree-only window, `⎇ <name>` then the content folder.
 *   - no main checkout, no `.spell-main` marker, no hiding
 *   - its Claude panel lists every session through the worktree's linked session folder (`linkSessionFolders`)
 * - The old layout, while worktrees nested in the checkout are left (`.claude/worktrees`):
 *   - Folders:  the MAIN repo root first, as in every window, so its Claude panel lists every session;
 *     then the worktree's root, `⎇ <name>`.
 *     No package folder:  Owen (2026-10-03).
 *   - the main root's files are hidden (`files.exclude` `*` beside its `.spell-main` marker):
 *     the worktree's folder has the same ones.
 *     The main root stays first for the Claude panel, and keeps its Source Control.
 * - The package it's for (theme, `handoff --back`'s target) is kept in the file's own `spell.package`.
 * - Its look (epic `windows-and-review` P5):
 *   `open <name> --color <look>` (`/epic <name> -<look>`), else the look of the window it's opened from;
 *   a window file from before (or a window without one):
 *   the package window's theme, the title bar tinted the worktree's own colour (`tint()`).
 *
 * ## Looks
 * - A LOOK is the whole window in Tomorrow Night Blue's colours, its blues turned to another hue
 *   (`LOOKS`:  red, orange, amber, green, teal, cyan, blue, indigo, purple, pink, brown, grey):
 *   `workbench.colorTheme` set to it, the re-hued colours scoped to it in `workbench.colorCustomizations`;
 *   the rest of Owen's own colours stay.
 * - `color <look>` (`/epic color <look>`) gives the window this session runs in a look:
 *   - written into its window file, which VS Code applies at once,
 *     with no reload and its extensions (the Claude panel) untouched
 *     (tested on a throwaway window:  Q11 of `windows-and-review`)
 *   - only a window opened from a `.code-workspace` file
 *
 * ## Staying put
 * - Instead of moving, a session may STAY in its window:  same tab, only its folder is the worktree.
 *   Owen picks, each time, in `/isolate`'s, `/epic`'s or `/unpark`'s modal;  `should-stay` recommends one and says why.
 * - Its changes show in Source Control (`git.detectWorktrees`), not in Explorer.
 * - The window says so at once (`stay <name>`, epic `windows-and-review` P5):
 *   titled `⎇ <name>`, its title bar tinted the worktree's colour;
 *   what that replaced is kept in the file's `spell.stay`, and `stay --end` (`/isolate done`) puts it back.
 *   Before, the window kept its old title (`docs-sidebar` while the session worked in `quick-open`).
 * - Fine when it's the window's ONLY session.
 *   Else the others share its doc preview (one doc at a time) and its Source Control,
 *   and a second worktree there is easy to mix up with the first.
 * - Later, it can still move:  `open <name>`, `handoff <name>`.
 *
 * ## Commands
 * - `init`:  write the window file of every package that lacks one, and bring the others up to date:
 *   folders, `files.exclude` and the repo's own settings
 *   (a worktree's window:  `files.exclude` and the repo's settings);  themes and other settings are Owen's, kept
 * - `move [--dry-run]`:  carry the window files from the old folder, `workspaces/` in the main checkout, to the
 *   windows folder, once (`moveWindowFiles()`);  never deletes the old ones
 * - `which`:  this session's window:  pid, workspace file, folders;  a warning when it was opened through a link (I38)
 * - `add <path> [--name <name>]`:  add a folder (a worktree) to the window
 *   - needs a window opened from its `.code-workspace` (else the change would restart its extensions,
 *     Claude panel included)
 * - `remove <path>`:  remove that folder again;  never the window's first
 * - `show <file> [--hash <id>] [--review]`:  show an `.html` doc in the window's doc preview, at id `<id>`
 *   - the doc preview:  the right side bar's "Epic Docs" tab;  `--review`:  its "Review" tab
 *   - while a `handoff` is pending:  in the window this session is moving to, once it has
 * - `open <name> [--pkg <pkg>] [--color <look>]`:  write worktree `<name>`'s window file and open it in a new window
 *   - `<pkg>` (a package, or any `<windowsFolder>/<pkg>.code-workspace`) defaults to this session's window's package,
 *     else `spell-app` (the whole repo's window)
 *   - its look:  `--pkg`'s window's when named, else this session's window's
 * - `close <name>`:  close that window, delete the file
 * - `launch <name> [--pkg <pkg>] [--color <look>] [--prompt <text>] [--move]`:
 *   wake epic `<name>`, `<text>` typed in (default `/epic <name>`).
 *   - this session stays where it is:
 *     `/epic <name>` typed in another epic's session (the `/epic` skill's "From another worktree"), `/send`
 *   - `--move`:  this session goes there instead, as its turn ends (`handoff`), when nothing of the epic runs:
 *     a session started only to type `/epic <name>`
 *   - which, by `launchPlan()` (epic `epic-eject` P10):
 *     - one of its sessions is running:  typed into it, in its window
 *     - none, but its window is open:  a NEW session there;  the window's file and look untouched
 *     - neither:  make worktree `<name>` if needed, `open` it, and start a NEW session in it
 *       (`<pkg>` default `spell-app`;  its look `--color`'s, else `<pkg>`'s, tinted:  never this window's)
 *     - several running, or its one session in a terminal:  nothing;  exits 1, saying so
 * - `handoff <name> [--back] [--prompt <text>]`:  move this session to worktree `<name>`'s window when its turn ends
 *   - `--back`:  from it to its package's window, closing it after
 *   - `--prompt`:  typed into the new tab
 *   - needs `$CLAUDE_CODE_SESSION_ID` (Claude sets it in a session's commands)
 * - `resume <record> [--title <title>]...`:  the move itself, run by the `Stop` hook:
 *   `<record>` the handoff's file (deleted once read), each `<title>` a label the session's tab may show,
 *   tried in order
 * - `color [<look>]`:  give this session's window a look (`LOOKS`);  no look:  list them
 * - `stay <name>` / `stay --end`:  title and tint this session's window for worktree `<name>` it stays in / put back
 * - `should-stay [--epic] [--json]`:  should this session stay in its window when it isolates, or move?
 *   Prints `recommend stay|window`, then a `- <reason>` line each
 * - No window (the extension isn't installed, or the window wasn't reloaded since):  exits 1, saying so.
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { EpicConfig } from "spell-epic/config/EpicConfig.ts"
import { RealPath } from "spell-epic/config/RealPath.ts"
import { SessionFolders } from "spell-epic/config/SessionFolders.ts"

/** The engine, spell-epic:  the folder this script's `scripts/` is in, with the plugin's `hooks/` beside it. */
const ENGINE = dirname(dirname(fileURLToPath(import.meta.url)))

/** Whether `envCheckout()` has said its `EPIC_CHECKOUT` is stale:  once per process. */
let staleSaid = false

/**
 * The repo root the windows are for:  a worktree's own, when run from one.
 * - `EPIC_CHECKOUT` when set (`envCheckout()`):  `epic window` runs ONE copy of this script (its own) for the caller's
 *   checkout, and says which (`EpicTools.run()`, epic `epic-eject` P5);  the hooks set it to their session's checkout
 * - else the git checkout the current folder is in:  the engine is a repo of its own, never the one worked on (P6)
 */
const ROOT = envCheckout() ?? checkoutAround(process.cwd())

/**
 * `EPIC_CHECKOUT`, the checkout the `epic` command hands its tools (the docs tools' `pages.js` and this script take it
 * as their root), resolved;  `undefined` when it isn't set, or names no folder.
 * - No folder:  a STALE one, inherited (epic `epic-engine` P9:  repo-split's window carried the long-gone
 *   `spell-app.worktrees/epic-eject`, which `code` had handed it, so `check-spell.js` there served pages from a
 *   content folder that didn't exist).  Said on stderr, once, and left out.
 * - Why it leaked:  VS Code gives a window the environment of the `code` command that opened it, so every Claude
 *   session in it had it;  `codeEnv()` now leaves it out.
 */
export function envCheckout(env = process.env) {
  if (!env.EPIC_CHECKOUT) return undefined
  const checkout = resolve(env.EPIC_CHECKOUT)
  if (existsSync(checkout)) return checkout
  if (!staleSaid) console.error(`EPIC_CHECKOUT ${checkout} doesn't exist:  left out (a stale one, inherited)`)
  staleSaid = true
  return undefined
}

/**
 * The engine's own per-run settings, never handed to a VS Code window (`codeEnv()`):
 * the checkout the `epic` command's tools work on, their `tsx` config, and yarn's starting folder.
 */
const ENGINE_ENV = ["EPIC_CHECKOUT", "TSX_TSCONFIG_PATH", "INIT_CWD"]

/**
 * The environment for a `code` command:  this process's, without the engine's own settings (`ENGINE_ENV`).
 * - VS Code gives the window `code` opens the command's environment, so every Claude session in that window
 *   inherits it
 *   - with `EPIC_CHECKOUT`, its docs tools worked on the checkout that OPENED the window,
 *     long after it was gone (epic `epic-engine` P9)
 */
export function codeEnv(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !ENGINE_ENV.includes(key)))
}

/** The nearest folder at or above `dir` holding `.git` (a checkout, or a worktree);  `dir` itself if none. */
function checkoutAround(dir) {
  for (let at = resolve(dir); ; at = dirname(at)) {
    if (existsSync(join(at, ".git"))) return at
    if (dirname(at) === at) return resolve(dir)
  }
}

/**
 * The repo's `.epic/config.json5`, the MAIN checkout's:  its folders and window names.
 * - a MULTI-REPO top's child repo (`EpicConfig.top`, epic `epic-engine` P10):  the TOP's.  Folder 1 of every window
 *   is the main TOP checkout (`~/www/spell`), every session saved under it;  an epic's window is that, its files
 *   hidden, then the epic's worktree of the top (every repo's inside it), then the content folder
 */
const CONFIG = topConfig(EpicConfig.of(ROOT))

/** `config`'s multi-repo top's config, when it has one (`EpicConfig.top`);  else `config`. */
export function topConfig(config) {
  return config.top ?? config
}

/** The MAIN checkout's root, even when run from a worktree:  the repo root every package window shows. */
const MAIN_ROOT = CONFIG.main

/**
 * The window files' folder (`windowsFolder`, `EpicConfig.windowsFolder`):  package windows in it, worktree windows
 * in its `ongoing/` (`WORKTREE_WINDOWS`)
 */
const WINDOWS = CONFIG.windowsFolder

/** The worktrees' window files' folder:  `<windowsFolder>/ongoing`. */
const WORKTREE_WINDOWS = CONFIG.worktreeWindowsFolder

/** Each package's starting theme:  VS Code's built-ins, all different.  Owen picks real ones in the files. */
const THEMES = {
  app: "Abyss",
  cli: "Kimbie Dark",
  core: "Monokai",
  docs: "Monokai Dimmed",
  lsp: "Red",
  parser: "Solarized Dark",
  spell: "Quiet Light",
  ui: "Tomorrow Night Blue",
  util: "Default Dark Modern",
  vscode: "Default Light Modern"
}

/** A package that isn't in `THEMES`. */
const FALLBACK_THEME = "Default Dark+"

/**
 * `open`'s window file when this session's window isn't a package's:
 * `<windowsFolder>/<default>.code-workspace`, the whole repo's (`windows.default`, `spell-app`).
 */
const DEFAULT_WINDOW = CONFIG.windows.default

/** The MAIN checkout's marker file (git-ignored):  worktree windows hide what's beside it (`filesExclude()`). */
const MAIN_MARKER = ".spell-main"

/** How long a window gets to answer a request, in msec:  `show-doc` may start a server first. */
const REQUEST_TIMEOUT = 10_000

/** How long `resume` waits for a worktree's window to start, in msec. */
const WINDOW_START_TIMEOUT = 60_000

/** A Claude Code session id:  a uuid. */
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/****************
 * ### `Window`
 * The window files, and the window a session runs in.
 ****************/
export class Window {
  /** Package names:  the folders of `packages/` with a `package.json`;  none in a repo without `packages/`. */
  static get packages() {
    const packages = join(ROOT, "packages")
    if (!existsSync(packages)) return []
    return readdirSync(packages, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(packages, entry.name, "package.json")))
      .map((entry) => entry.name)
      .sort()
  }

  /** `<windowsFolder>/<pkg>.code-workspace`:  a package's window file, or the whole repo's. */
  static file(pkg) {
    return CONFIG.windowFile(pkg)
  }

  /**
   * The window file's contents for `pkg`:  the WHOLE branch (the repo root), then the shared content repo.
   * - one file per package still, each with its own theme;
   *   no package folder any more (Owen, 2026-10-06:  "just check out the full branch")
   */
  static workspace(pkg) {
    return {
      folders: Window.packageFolders(),
      settings: {
        "workbench.colorTheme": THEMES[pkg] ?? FALLBACK_THEME,
        "git.detectWorktrees": true,
        "files.exclude": Window.filesExclude(),
        ...CONFIG.windows.settings
      }
    }
  }

  /**
   * A package window's folders, relative to the windows folder:  the MAIN repo root, then the shared content repo.
   * - the main checkout's, whichever checkout runs this:  one windows folder for the repo (before epic `epic-eject`
   *   P13, a worktree's `init` wrote its branch's own copies, pointing at the worktree)
   */
  static packageFolders() {
    return [{ path: relative(WINDOWS, MAIN_ROOT), name: CONFIG.windows.repoName }, ...Window.sharedFolder(WINDOWS)]
  }

  /**
   * A window's `files.exclude`, so Explorer and Quick Open show each file ONCE.
   * - it applies to every folder of the window, each pattern relative to the folder
   * - a `when` hides an entry only beside a sibling of that name
   *
   * What it hides:
   * - `.claude/worktrees`:  a worktree is its own folder (a worktree window), or its own repo in Source Control
   *   - each worktrees folder inside the checkout (`worktreesPatterns`),
   *     the old place included while worktrees are left there
   * - the shared links (`epics`, `guides` ...) in a CHECKOUT:
   *   their files show once, under the `spell-app-dev` folder (`windows.contentName`), at the real path edits need
   *   (root `AGENTS.md`, "Shared content")
   *   - a checkout:  beside its `package.json`;  in a repo without one, beside its `.epic` folder,
   *     which every checkout of a repo `epic init` set up has (`checkoutMarker()`)
   * - `worktree`:  also everything in the MAIN checkout's folder,
   *   beside its `.spell-main` marker (`ensureMainMarker()`):  the worktree's folder has the same files
   *   - the main root stays the first folder, for the Claude panel, and keeps its Source Control
   *   - the OLD layout only:  a worktree-only window has no main root to hide (`worktreeWorkspace()`)
   */
  static filesExclude({ worktree = false } = {}) {
    return {
      ...Object.fromEntries(CONFIG.worktreesPatterns.map((pattern) => [pattern, true])),
      ...(worktree && { "*": { when: MAIN_MARKER } }),
      ...Object.fromEntries(sharedLinks().map((link) => [link, { when: checkoutMarker() }]))
    }
  }

  /** Write the MAIN checkout's `.spell-main` marker if it's missing (git-ignored):  see `filesExclude()`. */
  static ensureMainMarker() {
    const marker = join(MAIN_ROOT, MAIN_MARKER)
    if (existsSync(marker)) return
    writeFileSync(
      marker,
      "The MAIN checkout's marker:  worktree windows hide this folder's files (`files.exclude`, spell-epic's src/window.mjs\n" +
        "`filesExclude()`), so Quick Open and Explorer show each file once, from the worktree.  Never in a worktree.\n"
    )
  }

  /**
   * `init`:  write the missing window files, and bring existing ones up to date;  returns the paths written.
   * - a package window:  its folders (`packageFolders()`), `files.exclude` and the repo's own settings
   *   (`windows.settings`);  its theme and every other setting are Owen's, kept
   * - the whole repo's window, `windows.default` (`spell-app`), when it isn't a package's:
   *   written when missing (`ensureRepoWindow()`)
   * - a worktree's window (`<windowsFolder>/ongoing/`):  its `files.exclude` and the repo's own settings,
   *   and the content folder when it lacks it,
   *   a folder that's gone (an old content folder) dropped (`withContentFolder()`)
   * - an existing file VS Code can't read as JSON (comments) is left alone
   * - NOTE:  a package window that changes folders while open re-reads its workspace;  its Claude panel may reload
   */
  static init() {
    // the marker serves the old layout's windows only:  none are made once new worktrees go beside the repo
    if (CONFIG.worktreesPattern) Window.ensureMainMarker()
    const written = []
    const repoWindow = Window.ensureRepoWindow()
    if (repoWindow) written.push(relative(MAIN_ROOT, repoWindow))
    for (const pkg of Window.packages) {
      const file = Window.file(pkg)
      if (!existsSync(file)) {
        mkdirSync(WINDOWS, { recursive: true })
        writeFileSync(file, `${JSON.stringify(Window.workspace(pkg), null, 2)}\n`)
        written.push(relative(MAIN_ROOT, file))
        continue
      }
      const refreshed = refresh(file, (workspace) => {
        workspace.folders = Window.packageFolders()
        workspace.settings = {
          ...workspace.settings,
          "files.exclude": Window.filesExclude(),
          ...CONFIG.windows.settings
        }
      })
      if (refreshed) written.push(relative(MAIN_ROOT, file))
    }
    const ongoing = WORKTREE_WINDOWS
    for (const name of existsSync(ongoing) ? readdirSync(ongoing) : []) {
      if (!name.endsWith(".code-workspace")) continue
      const file = join(ongoing, name)
      const old = !CONFIG.worktreeOnlyWindow(name.replace(/\.code-workspace$/, ""))
      const refreshed = refresh(file, (workspace) => {
        workspace.folders = Window.withContentFolder(workspace.folders ?? [], ongoing)
        workspace.settings = {
          ...workspace.settings,
          "files.exclude": Window.filesExclude({ worktree: old }),
          ...CONFIG.windows.settings
        }
      })
      if (refreshed) written.push(relative(MAIN_ROOT, file))
    }
    return written
  }

  /**
   * The whole repo's window file, `<windowsFolder>/<windows.default>.code-workspace`, written when it's missing and
   * isn't a package's;  returns its path when written, else `null`.
   * - so a repo with no `packages/` (spell-epic, one `epic init` set up) has a window for `open` and `launch` to
   *   start from, without an `epic window init` first (epic `epic-engine` I15)
   * - its folders:  the MAIN repo root, then the content folder (`packageFolders()`)
   */
  static ensureRepoWindow() {
    const file = Window.file(DEFAULT_WINDOW)
    if (Window.packages.includes(DEFAULT_WINDOW) || existsSync(file)) return null
    mkdirSync(dirname(file), { recursive: true })
    const workspace = Window.workspace(DEFAULT_WINDOW)
    writeFileSync(file, `${JSON.stringify(workspace, null, 2)}\n`)
    return file
  }

  /**
   * A worktree window's `folders` with the content folder in them:  right after the worktree's own (`⎇ <name>`),
   * when it isn't there yet (`fromDir`:  where the window file is, its paths relative to it).
   * - for a window file written while the content folder was missing, or by older code:  `init` puts it back
   * - unchanged when it's there (wherever, any spelling of it), or when there's no content folder
   * - a folder that ISN'T there is dropped first, unless it's the worktree's own (`⎇ <name>`) or the repo root
   *   (`windows.repoName`):  an old content folder (epic `epic-engine` I59), e.g. `../../../spell-app.epics` after
   *   spell-epic moved to `~/www/spell/` and its content folder to `spell.epics`
   */
  static withContentFolder(folders, fromDir) {
    const kept = folders.filter(
      (folder) =>
        folder.name?.startsWith("⎇ ") ||
        folder.name === CONFIG.windows.repoName ||
        existsSync(resolve(fromDir, folder.path ?? ""))
    )
    const [content] = Window.sharedFolder(fromDir)
    if (!content || kept.some((folder) => RealPath.same(resolve(fromDir, folder.path), resolve(fromDir, content.path))))
      return kept
    const at = kept.findIndex((folder) => folder.name?.startsWith("⎇ "))
    return at < 0 ? [...kept, content] : [...kept.slice(0, at + 1), content, ...kept.slice(at + 1)]
  }

  /**
   * The shared content repo (epic `shared-content`) as a window folder,
   * `[{ path, name }]` with `path` relative to `fromDir` (where the window file is);  `[]` when it doesn't exist.
   * - its own Source Control entry (the auto commits) and search
   * - permanent, so unlike a worktree it belongs in every window
   * - its own `.vscode/settings.json` hides its `packages/` (the old-path links)
   * - where:  `contentFolder` in the repo's `.epic/config.json5`;  named `windows.contentName`
   */
  static sharedFolder(fromDir) {
    const shared = CONFIG.contentFolder
    return existsSync(shared) ? [{ path: relative(fromDir, shared), name: CONFIG.windows.contentName }] : []
  }

  ////////////////
  // ## Moving the window files out of the repo
  ////////////////

  /**
   * `move`:  carry the window files from the old folder, `workspaces/` in the main checkout, to the windows folder
   * (`EpicConfig.newWindowsFolder`;  epic `epic-eject` P13);  returns `moveWindowFiles()`'s report.
   * - nothing to do when the old folder isn't there, or IS the windows folder (spell-epic's `workspaces/`)
   */
  static move({ dryRun = false } = {}) {
    const from = CONFIG.oldWindowsFolder
    const to = CONFIG.newWindowsFolder
    if (!existsSync(from) || real(from) === real(to)) return { from, to, files: [] }
    return { from, to, files: moveWindowFiles(from, to, { dryRun }) }
  }

  /** `move [--dry-run]`, printed:  a line per file, its folder paths' rewrites under it;  resolves to the exit code. */
  static moveCommand({ dryRun = false } = {}) {
    const { from, to, files } = Window.move({ dryRun })
    if (!files.length) {
      console.log(`no window files to move from ${from} to ${to}`)
      return 0
    }
    console.log(`${dryRun ? "would move" : "moving"} the window files from ${from} to ${to}:`)
    for (const { file, action, folders } of files) {
      console.log(`  ${file}  ${action}`)
      for (const [old, now] of folders) if (old !== now) console.log(`      ${old}  ->  ${now}`)
    }
    const counts = Object.entries(Object.groupBy(files, ({ action }) => action))
    console.log(counts.map(([action, each]) => `${each.length} ${action}`).join(", "))
    if (!dryRun) console.log(`the old files are still in ${from}:  delete them once every window is reopened`)
    return 0
  }

  ////////////////
  // ## A worktree's window
  ////////////////

  /** `<windowsFolder>/ongoing/<name>.code-workspace`. */
  static worktreeFile(name) {
    return CONFIG.worktreeWindowFile(name)
  }

  /**
   * The window file of worktree `name`, opened from `pkg`'s window.
   * - folder paths are relative to `<windowsFolder>/ongoing/`, where the file goes
   * - `spell.package`:  `pkg`, for `handoff --back`;  VS Code ignores a top-level key it doesn't know
   * - its folders, by `EpicConfig.worktreeOnlyWindow()` (epic `epic-eject` P8, O3):
   *   - a worktree beside the repo (or `windows.worktreeOnly`):  `⎇ <name>` then the content folder, nothing else
   *     - each file once, one repo in Source Control
   *     - its Claude panel lists every session through the worktree's linked session folder (`linkSessionFolders`)
   *     - a new tab's session starts IN the worktree:
   *       the session-start guard (`hooks/worktree-guard.mjs`) records it there, so a reopen finds its way back (I3)
   *   - a multi-repo top's epic worktree (`~/www/spell.worktrees/<name>`, `windows.worktreeOnly` off):
   *     `⎇ <name>` first, then the main top checkout, then the content folder (epic `epic-engine` P12)
   *     - the worktree first, so a new tab's session starts in it, never asked to `EnterWorktree`
   *       (which Claude Code asks Owen about outside `.claude/worktrees/`:  r11)
   *     - the Claude panel still lists every session, through the worktree's linked session folder
   *       (`linkSessionFolders`)
   *     - the main top came first before P12 (J83):  a window written then keeps that order
   *       (`init` never reorders an open window's folders:
   *       a new first folder restarts its extensions, the Claude panel's sessions with them)
   *   - the old layout, a worktree nested in the checkout:
   *     the main root first (for the Claude panel), then `⎇ <name>`, then the content folder;  entering it asks nothing
   *   - either way, the main root's files hidden (`filesExclude({ worktree: true })`):  the worktree has the same ones
   * - the repo's own settings (`windows.settings`;  epic `intellisense` P4)
   * - its look (epic `windows-and-review` P5, Q1):  `color`, a look's name (`LOOKS`);  else `from`'s,
   *   the window file of the window it's opened from (its theme and colours, a staying session's tint left out);
   *   else `pkg`'s theme, the title bar tinted the worktree's own colour (`tint()`)
   */
  static worktreeWorkspace(pkg, name, { color = null, from = null } = {}) {
    const only = CONFIG.worktreeOnlyWindow(name)
    const settings = {
      "workbench.colorTheme": Window.theme(pkg),
      "files.exclude": Window.filesExclude({ worktree: !only }),
      ...CONFIG.windows.settings
    }
    if (color) withLook(settings, color)
    else if (from?.settings?.["workbench.colorTheme"]) {
      const source = JSON.parse(JSON.stringify(from))
      withoutStay(source)
      settings["workbench.colorTheme"] = source.settings["workbench.colorTheme"]
      if (source.settings["workbench.colorCustomizations"])
        settings["workbench.colorCustomizations"] = source.settings["workbench.colorCustomizations"]
    } else settings["workbench.colorCustomizations"] = tint(name)
    const ongoing = WORKTREE_WINDOWS
    const worktree = { path: relative(ongoing, CONFIG.worktreeFolder(name)), name: `⎇ ${name}` }
    const repo = only ? [] : [{ path: relative(ongoing, MAIN_ROOT), name: CONFIG.windows.repoName }]
    // a worktree outside the main checkout FIRST, so a new tab's session starts in it, and nothing has to
    // EnterWorktree (epic `epic-engine` P12, r11:  Claude Code asks before entering one outside `.claude/worktrees/`)
    const first = CONFIG.isOutside(CONFIG.worktreeFolder(name))
    return {
      folders: [...(first ? [worktree, ...repo] : [...repo, worktree]), ...Window.sharedFolder(ongoing)],
      settings,
      spell: { package: pkg }
    }
  }

  /**
   * Change the window file of the window this session runs in:  `change(workspace)` edits it in place (`refresh()`).
   * - VS Code takes a settings change at once:  no reload, its extensions (the Claude panel) untouched
   *   (Q11 of `windows-and-review`, tested on a throwaway window).
   * - Returns `{ file, written, stale }`;  throws without a window file.
   * - A window still open from its old file, gone since `epic window move`:  its new file is changed,
   *   and `stale` is true, since the window shows it only once reopened from there (`currentFile()`)
   */
  static editCurrent(change) {
    const { file, stale } = Window.currentFile()
    if (!file) throw new Error("this window wasn't opened from a .code-workspace file:  nothing to write its look into")
    return { file, written: refresh(file, change), stale }
  }

  /**
   * The window file of the window this session runs in:  `{ file, stale }`, `file` `null` when there's none.
   * - `stale`:  the window was opened from its old place, `workspaces/` (before epic `epic-eject` P13),
   *   that file is gone, and `file` is its moved copy in the windows folder (`movedWindowFile()`)
   */
  static currentFile() {
    const opened = Window.current()?.workspaceFile ?? null
    const file = opened && movedWindowFile(opened, CONFIG.oldWindowsFolder, CONFIG.windowsFolder)
    return { file, stale: Boolean(file) && file !== opened }
  }

  /** `color <look>`:  give this session's window look `name` (`LOOKS`);  returns `editCurrent()`'s `{ file, stale }`. */
  static color(name) {
    look(name)
    return Window.editCurrent((workspace) => withLook((workspace.settings ??= {}), name))
  }

  /** `stay <name>` / `stay --end`:  retitle and tint this session's window for worktree `name` / put it back. */
  static stay(name, { end = false } = {}) {
    let changed = false
    const { file, stale } = Window.editCurrent((workspace) => {
      changed = end ? withoutStay(workspace) : Boolean(withStay(workspace, name))
    })
    return { file, changed, stale }
  }

  /** `pkg`'s theme:  from its window file (Owen may have changed it), else `THEMES`. */
  static theme(pkg) {
    try {
      const file = Window.file(pkg)
      const theme = JSON.parse(readFileSync(file, "utf8")).settings?.["workbench.colorTheme"]
      if (theme) return theme
    } catch {
      // missing, or JSONC VS Code's own parser would take:  the starting theme
    }
    return THEMES[pkg] ?? FALLBACK_THEME
  }

  /**
   * `open`:  (re)write worktree `name`'s window file and open it with `code`;  returns `{ file, colors }`.
   * - `noOpen` (`open <name> --no-open`):  write the file only, its colours in it, and never run `code`
   *   - for a window opened later by hand, and a check that changes nothing on the screen (epic `epic-eject` P9)
   * - already open:  VS Code focuses that window
   * - `pkg` the whole repo's window (`windows.default`) and its file missing:  written first (`ensureRepoWindow()`)
   * - its colours (`workbench.colorCustomizations`) are NOT in the file yet:
   *   - a window starting up draws the theme's colours VS Code cached from the last window that had them,
   *     and only a CHANGE to the setting makes it read them
   *     (P5 of `windows-and-review`:  a probe opened green came up in an older probe's purple)
   *   - `colors` go in once the window is up (`applyColors()`), a live change
   */
  static open(name, pkg, { color = null, fromCurrent = true, noOpen = false } = {}) {
    if (!existsSync(CONFIG.worktreeFolder(name))) throw new Error(`no worktree ${name}`)
    // the whole repo's window file is written when missing:  a repo's first `open` or `launch` needs no `init`
    if (pkg === DEFAULT_WINDOW) Window.ensureRepoWindow()
    // a package, or any other window file (`spell-app`:  the whole repo's)
    if (!Window.packages.includes(pkg) && !existsSync(Window.file(pkg))) throw new Error(`no package ${pkg}`)
    if (color) look(color)
    const file = Window.worktreeFile(name)
    mkdirSync(dirname(file), { recursive: true })
    if (!CONFIG.worktreeOnlyWindow(name)) Window.ensureMainMarker()
    const from = fromCurrent ? Window.currentWorkspace() : null
    const workspace = Window.worktreeWorkspace(pkg, name, { color, from })
    const colors = workspace.settings["workbench.colorCustomizations"] ?? null
    // opened later by hand:  the colours go in now, nothing to wait for
    if (noOpen) {
      writeFileSync(file, `${JSON.stringify(workspace, null, 2)}\n`)
      return { file, colors: null }
    }
    delete workspace.settings["workbench.colorCustomizations"]
    writeFileSync(file, `${JSON.stringify(workspace, null, 2)}\n`)
    // by its real path:  VS Code resolves the file's relative folders from the path it's opened by, links not followed
    const run = spawnSync("code", [real(file)], { encoding: "utf8", env: codeEnv() })
    if (run.status !== 0) throw new Error(`\`code ${file}\` failed:  ${run.stderr || run.error?.message}`)
    return { file, colors }
  }

  /**
   * Write `colors` into window file `file` once its window is up (its registry entry,
   * `WINDOW_START_TIMEOUT` at most, then a moment for its settings to load):
   * a live change, which the window applies (`open()`).  Resolves to whether the window was seen;
   * the colours are written either way.
   */
  static async applyColors(file, colors, { wait = 1500 } = {}) {
    const deadline = Date.now() + WINDOW_START_TIMEOUT
    let seen = false
    while (!(seen = Boolean(Window.windowOf(file))) && Date.now() < deadline) await delay(500)
    if (seen) await delay(wait)
    refresh(file, (workspace) => {
      workspace.settings ??= {}
      workspace.settings["workbench.colorCustomizations"] = colors
    })
    return seen
  }

  /** The window file of the window this session runs in, parsed;  `null` when there's none (or it's JSONC). */
  static currentWorkspace() {
    try {
      const { file } = Window.currentFile()
      return file ? JSON.parse(readFileSync(file, "utf8")) : null
    } catch {
      return null
    }
  }

  /**
   * `close`:  close worktree `name`'s window, if open, and delete its file;  returns whether a window closed.
   * - finds the window by its registry entry's `workspaceFile`
   */
  static async close(name) {
    const file = Window.worktreeFile(name)
    const window = Window.worktreeWindow(name)
    if (window) await Window.request("close-window", {}, window)
    rmSync(file, { force: true })
    return Boolean(window)
  }

  /**
   * `launch`:  wake epic `name`'s session, or start one, `prompt` typed in (not sent:  Owen presses Enter);
   * resolves to `launchPlan()`'s answer, plus `file`, the epic's window file.
   * - for `/epic <name>` typed in ANOTHER epic's session (Owen, 2026-10-07), and `/send` waking an epic:
   *   the session running this stays where it is
   * - what it does (`launchPlan()`;  epic `epic-eject` P10, Owen's r2:  "you changed color on me in this VSC window"):
   *   - a session of the epic is running:  `prompt` typed into it, in its window;  nothing opened, nothing written
   *   - none, but the epic's window is open:  a NEW session there;  its window file and look untouched
   *   - neither:  make worktree `name` if needed (the `WorktreeCreate` hook's own `create`, from the MAIN checkout),
   *     write its window file, open it, and start a NEW session there
   *     - its look:  `color`, else `pkg`'s window's theme, the title bar tinted `name`'s own colour;
   *       never the look of the window it's launched from, another epic's
   * - several of the epic's sessions running, or its one session in a terminal:  nothing done, `action` says why
   * - `move` (`launch --move`:  a session's id, `$CLAUDE_CODE_SESSION_ID`):  THIS session goes to the epic's window,
   *   rather than a new one starting there (epic `epic-engine` I72;  Owen, 2026-10-22, on `/epic solid-17` typed in a
   *   fresh tab of epic-engine's window:  the tab stayed there, beside the new window's session)
   *   - for a session started only to type `/epic <name>`:  the prompt hook says when (`PromptGate`'s `launchNote()`)
   *   - its worktree and window file made as above, then `handoff()`:  the `Stop` hook moves it as its turn ends, its
   *     tab here closed, `prompt` typed in there;  `action` `move`
   *   - one of the epic's sessions running:  woken as above, and this session stays
   * - a new session starts in the window's first folder, the worktree (`worktreeWorkspace()`):  the session-start
   *   guard records it there, so a reopen comes back (epic `epic-eject` I3), with no `EnterWorktree` (epic `epic-engine`
   *   P12);  in a window written before P12 it starts in the main root, and `/epic <name>` enters the worktree
   */
  static async launch(name, pkg, { color = null, prompt = null, move = null } = {}) {
    const file = Window.worktreeFile(name)
    const open = Window.windowOf(file)
    // moving:  this session is the one going there, never one of the epic's to wake
    const sessions = Window.epicSessions(name, open).filter((session) => !move || session.sessionId !== move)
    const plan = launchPlan({ windowOpen: Boolean(open), sessions })
    const typed = prompt ? { prompt } : {}
    if (plan.wake) await Window.request("open-session", { sessionId: plan.wake.sessionId, ...typed }, plan.wake.window)
    if (plan.start && !plan.open && !move) await Window.request("open-session", typed, open)
    if (!plan.open && !(move && plan.start)) return { ...plan, file }
    if (plan.open) {
      // the engine's own hook, the one the plugin runs (`hooks/hooks.json`)
      const hook = join(ENGINE, "hooks", "worktree.mjs")
      const input = JSON.stringify({ name, cwd: MAIN_ROOT })
      const made = spawnSync(process.execPath, [hook, "create"], { input, encoding: "utf8" })
      if (made.status !== 0) throw new Error(`worktree ${name} not made:  ${made.stderr.trim()}`)
    }
    if (move) {
      // its window file written (colours in it:  nobody waits for the window here), the move left to the `Stop` hook
      if (plan.open) Window.open(name, pkg, { color, fromCurrent: false, noOpen: true })
      Window.handoff(name, move, { prompt })
      return { ...plan, action: "move", file }
    }
    const { colors } = Window.open(name, pkg, { color, fromCurrent: false })
    const window = await Window.waitFor(file)
    if (colors) await Window.applyColors(file, colors)
    await Window.request("open-session", typed, window)
    return { ...plan, file }
  }

  /**
   * The live Claude Code sessions of epic `name`, for `launchPlan()`:
   * `{ sessionId, title, self, inWindow, window }` each.
   * - a session of the epic:  titled for it (`titledFor()`), or working in its worktree
   * - `self`:  the session running this (`$CLAUDE_CODE_SESSION_ID`)
   * - `inWindow`:  it runs in window `open` (a registry entry, or `null`), the epic's
   * - `window`:  the registry entry of the window it runs in, the nearest of its ancestors with one;
   *   `null` for a session in a terminal, or a window without the bridge
   */
  static epicSessions(name, open, { self = process.env.CLAUDE_CODE_SESSION_ID } = {}) {
    const worktree = real(CONFIG.worktreeFolder(name))
    const entries = Window.entries()
    const processes = processTable()
    return liveSessions()
      .filter(({ title, cwd }) => {
        const at = cwd ? real(cwd) : ""
        return titledFor(title, name) || at === worktree || at.startsWith(worktree + sep)
      })
      .map(({ pid, sessionId, title }) => ({
        sessionId,
        title,
        self: Boolean(self) && sessionId === self,
        inWindow: Boolean(open) && isAncestor(open.pid, pid, processes),
        window: windowAbove(pid, entries, processes)
      }))
  }

  /** The registry entry of the window opened from `file`, once it's up;  throws after `WINDOW_START_TIMEOUT`. */
  static async waitFor(file) {
    const deadline = Date.now() + WINDOW_START_TIMEOUT
    let window = Window.windowOf(file)
    while (!window && Date.now() < deadline) {
      await delay(500)
      window = Window.windowOf(file)
    }
    if (!window) throw new Error(`${file} didn't open within ${WINDOW_START_TIMEOUT / 1000}s`)
    return window
  }

  /** The registry entry of worktree `name`'s window, or `null` when it isn't open. */
  static worktreeWindow(name) {
    return Window.windowOf(Window.worktreeFile(name))
  }

  /** The registry entry of the window opened from workspace file `file`, or `null` when none is. */
  static windowOf(file) {
    file = real(file)
    for (const entry of Window.entries().values()) {
      if (entry.workspaceFile && real(entry.workspaceFile) === file) return entry
    }
    return null
  }

  ////////////////
  // ## Handing a session to a worktree's window
  ////////////////

  /** `<registry>/handoffs`:  pending moves (`<session id>.json`) and their logs (`<session id>.log`). */
  static get handoffs() {
    return join(Window.registry, "handoffs")
  }

  /** The pending move of session `sessionId`:  `<registry>/handoffs/<session id>.json`. */
  static handoffFile(sessionId) {
    return join(Window.handoffs, `${sessionId}.json`)
  }

  /**
   * `handoff`:  record that session `sessionId` moves to another window when its turn ends;
   * returns the record, or `null` when it can't move back (see below).
   * - to worktree `name`'s window;  then this window closes the session's TAB
   * - `back`:  from worktree `name`'s window to its package's window;
   *   then the worktree's window CLOSES and its file goes
   *   - not in that window (an older session, or the move there failed):  `null`, nothing to move
   * - the record ~== `{ sessionId, to, from, close, remove, show, prompt }`:
   *   - `to`:  the target window's file
   *   - `from`:  this window's pid
   *   - `close`:  `"tab"` or `"window"`
   *   - `remove`:  a file to delete after
   *   - `show`:  a doc to show there, `{ file, hash?, view? }` (`Window.show()` sets it)
   *   - `prompt`:  text typed into the new tab (or `null`)
   */
  static handoff(name, sessionId, { back = false, prompt = null } = {}) {
    if (!SESSION_ID.test(sessionId ?? "")) throw new Error("no session:  $CLAUDE_CODE_SESSION_ID isn't set")
    const file = Window.worktreeFile(name)
    if (!existsSync(file)) throw new Error(`no window file for ${name}:  \`open ${name}\` first`)
    const from = Window.current()
    let handoff = { sessionId, to: file, from: from?.pid ?? null, close: "tab", remove: null, show: null, prompt }
    if (back) {
      if (!from?.workspaceFile || real(from.workspaceFile) !== real(file)) return null
      const pkg = worktreePackage(file)
      const to = Window.file(pkg)
      handoff = { sessionId, to, from: from.pid, close: "window", remove: file, show: null, prompt }
    }
    mkdirSync(Window.handoffs, { recursive: true, mode: 0o700 })
    writeFileSync(Window.handoffFile(sessionId), `${JSON.stringify(handoff, null, 2)}\n`, { mode: 0o600 })
    return handoff
  }

  /**
   * `resume`:  carry out `handoff` (a record);  returns what happened.
   * - `titles`:  the labels the session's tab may show (one string or several, in order)
   * - opens window `to` (`code`, which just focuses it when open) and waits up to `WINDOW_START_TIMEOUT` for it
   * - opens the session there (its `prompt` typed in), then its `show` doc beside it, then closes its tab
   *   (`close: "tab"`, by `titles`) or the whole window (`"window"`) in window `from`
   * - `from` gone, or no title for a tab:  closes nothing;  `matches`:  how many tabs showed each title
   * - the doc failing to show never stops the move:  `shown` is `false` (no doc:  `undefined`)
   */
  static async resume(handoff, titles) {
    const { sessionId, to, from, close, remove, show, prompt } = handoff
    titles = [titles ?? []].flat().filter(Boolean)
    if (!SESSION_ID.test(sessionId ?? "")) throw new Error(`bad session id '${sessionId}'`)
    if (!Window.windowOf(to)) spawnSync("code", [real(to)], { encoding: "utf8", env: codeEnv() })
    const window = await Window.waitFor(to)
    await Window.request("open-session", prompt ? { sessionId, prompt } : { sessionId }, window)
    let shown
    if (show) {
      shown = await Window.request("show-doc", show, window).then(
        () => true,
        () => false
      )
    }
    const old = from ? Window.entries().get(Number(from)) : undefined
    let closed = false
    let matches
    if (old && close === "window") {
      await Window.request("close-window", {}, old)
      closed = true
    } else if (old && titles.length) {
      ;({ closed, matches } = await Window.request("close-session-tab", { titles }, old))
    }
    if (remove) rmSync(remove, { force: true })
    return { opened: true, closed, matches, shown }
  }

  /**
   * Show `file` (an `.html` doc) in this session's window's doc preview, at id `hash` if given;
   * resolves to `{ window }` (the registry entry it showed in) or `{ later }` (the window file it will show in).
   * - `view`:  the side bar tab, `"docs"` ("Epic Docs", the default) or `"review"` ("Review");
   *   sent only when given, so an extension from before the tabs still shows the doc
   * - `query`:  the page's query, without its `?`:  `test=1` (a test run, `epic test`);
   *   sent only when given, and an extension from before it shows the page without it
   * - a `handoff` pending for `sessionId`:  NOT here, where the session's tab is about to close,
   *   but in the window it moves to, once it has (`resume`)
   *   - the handoff keeps ONE doc, so the last asked for wins, whichever tab
   * - throws as `request()` does:  no window, or it failed
   */
  static async show(file, { hash, query, view, sessionId = process.env.CLAUDE_CODE_SESSION_ID } = {}) {
    const show = { file, ...(hash && { hash }), ...(query && { query }), ...(view && { view }) }
    const pending = SESSION_ID.test(sessionId ?? "") ? Window.handoffFile(sessionId) : null
    if (pending && existsSync(pending)) {
      const handoff = { ...JSON.parse(readFileSync(pending, "utf8")), show }
      writeFileSync(pending, `${JSON.stringify(handoff, null, 2)}\n`, { mode: 0o600 })
      return { later: handoff.to }
    }
    const window = Window.current()
    await Window.request("show-doc", show, window)
    return { window }
  }

  /**
   * Whether this process runs in VS Code:
   * a session in the Claude Code extension, or anything in VS Code's integrated terminal.
   * - NOT whether a VS Code window is open:  a CLI session in another terminal is "not in VS Code", even with the
   *   repo open in a window, so its docs go to the browser
   */
  static get inVSCode() {
    return process.env.CLAUDE_CODE_ENTRYPOINT === "claude-vscode" || process.env.TERM_PROGRAM === "vscode"
  }

  /**
   * The package of `window` (a registry entry):  its workspace file's `<windowsFolder>/<pkg>.code-workspace`;
   * else `null` (a worktree's window, or none)
   * - or `workspaces/<pkg>.code-workspace`:  a window still open from its file's place before epic `epic-eject` P13
   */
  static packageOf(window) {
    const file = window?.workspaceFile
    if (!file?.endsWith(".code-workspace")) return null
    if (real(dirname(file)) === real(WINDOWS)) return basename(file, ".code-workspace")
    return file.match(/workspaces[\\/]([^\\/]+)\.code-workspace$/)?.[1] ?? null
  }

  ////////////////
  // ## Staying put
  ////////////////

  /**
   * `should-stay`:  the live facts for `stayAdvice()`, and its answer.
   * - `epic`:  for `/epic`, whose epic page takes the window's doc preview
   */
  static shouldStay({ epic = false } = {}) {
    const window = Window.current()
    const processes = window ? processTable() : new Map()
    const sessions = window ? claudeSessions(processes, window.pid) : []
    const self = sessions.find((pid) => isAncestor(pid, process.pid, processes)) ?? null
    const others = sessions.filter((pid) => pid !== self)
    const cwds = cwdsOf(others)
    return stayAdvice({ window, others: others.map((pid) => ({ pid, cwd: cwds.get(pid) ?? null })), epic })
  }

  ////////////////
  // ## The window a session runs in
  ////////////////

  /**
   * spell-epic's registry folder, where its extension's bridges write (and the handoffs go):
   * `$SPELL_EPIC_WINDOWS_DIR`, else `~/.spell-epic/windows`.  Read on every call, for tests.
   */
  static get registry() {
    return process.env.SPELL_EPIC_WINDOWS_DIR || join(homedir(), ".spell-epic", "windows")
  }

  /**
   * Every registry folder read, spell-epic's first:  then the spell language extension's, `$SPELL_WINDOWS_DIR`, else
   * `~/.spell/windows` (its bridge, while it still has one:  epic `epic-eject` P7)
   */
  static get registries() {
    return [Window.registry, process.env.SPELL_WINDOWS_DIR || join(homedir(), ".spell", "windows")]
  }

  /**
   * Every LIVE window's registry entry, by pid;  dead windows' files (a crash) are skipped, not deleted.
   * - a window both extensions' bridges run in:  spell-epic's entry (`registries`, first found)
   */
  static entries() {
    const entries = new Map()
    for (const dir of Window.registries) {
      if (!existsSync(dir)) continue
      for (const name of readdirSync(dir)) {
        if (!/^\d+\.json$/.test(name)) continue
        try {
          const entry = JSON.parse(readFileSync(join(dir, name), "utf8"))
          if (Number.isInteger(entry.pid) && isAlive(entry.pid) && !entries.has(entry.pid))
            entries.set(entry.pid, entry)
        } catch {
          // half-written or not ours:  skip it
        }
      }
    }
    return entries
  }

  /**
   * The registry entry of the window this process runs in, or `null`.
   * - first:  the nearest ANCESTOR process with an entry (a session's window's extension host)
   * - else:  the window with `process.cwd()` inside one of its folders after the first
   *   - the first is the repo root, in a package window and an old-layout worktree window
   *   - the deepest such folder wins
   *   - a worktree-only window's first folder is its worktree, so it counts
   */
  static current() {
    const entries = Window.entries()
    if (!entries.size) return null
    const parents = parentPids()
    const seen = new Set()
    for (let pid = process.pid; pid > 1 && !seen.has(pid); pid = parents.get(pid) ?? 0) {
      if (entries.has(pid)) return entries.get(pid)
      seen.add(pid)
    }
    const cwd = real(process.cwd())
    let best = null
    let bestLength = -1
    for (const entry of entries.values()) {
      // the first folder counts only when it's a worktree's (a worktree-only window):  else it's the repo root
      const folders = (entry.folders ?? []).filter((folder, at) => at > 0 || worktreeOf(folder) !== null).map(real)
      for (const folder of folders) {
        const inside = cwd === folder || cwd.startsWith(folder + sep)
        if (inside && folder.length > bestLength) [best, bestLength] = [entry, folder.length]
      }
    }
    return best
  }

  /**
   * Ask `window` (default:  ours) to run `op` with `body`;  resolves to its reply (`{ ok: true, ... }`).
   * - throws an `Error` saying what went wrong:  no window, no answer, or the op's own `error`
   */
  static async request(op, body = {}, window = Window.current()) {
    if (!window) {
      throw new Error("no window:  the spell-epic extension's bridge isn't running in this session's VS Code window")
    }
    let response
    try {
      response = await fetch(`http://127.0.0.1:${window.port}/${op}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${window.token}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT)
      })
    } catch (error) {
      throw new Error(
        `window ${window.pid} didn't answer on port ${window.port} (${error.cause?.code ?? error.message})`
      )
    }
    const reply = await response.json().catch(() => ({}))
    if (!response.ok || !reply.ok) {
      throw new Error(`window ${window.pid} \`${op}\` failed:  ${reply.error ?? `http ${response.status}`}`)
    }
    return reply
  }

  /** `epic window <argv>`:  run one command;  resolves to the exit code. */
  static async main(argv) {
    const { positional, flags } = parseArgs(argv)
    const [command, target] = positional
    if (command === "init") {
      const written = Window.init()
      console.log(written.length ? `wrote ${written.join(", ")}` : "every window file is up to date")
      return 0
    }
    if (command === "move") return Window.moveCommand({ dryRun: flags["dry-run"] === true })
    const bare = ["which", "should-stay", "reload", "color"].includes(command) || (command === "stay" && flags.end)
    if (!COMMANDS.includes(command) || (!bare && !target)) {
      console.error(USAGE)
      return 1
    }
    if (command === "color" || command === "stay") return Window.lookCommand(command, target, flags)
    if (command === "should-stay") {
      const advice = Window.shouldStay({ epic: Boolean(flags.epic) })
      if (flags.json) console.log(JSON.stringify(advice, null, 2))
      else console.log([`recommend ${advice.recommend}`, ...advice.reasons.map((reason) => `- ${reason}`)].join("\n"))
      return 0
    }
    if (["open", "launch", "close", "handoff", "resume"].includes(command))
      return Window.worktreeCommand(command, target, flags)
    const window = Window.current()
    if (!window) {
      console.error("no window:  the spell-epic extension's bridge isn't running in this session's VS Code window")
      console.error("  (install spell-epic's VS Code extension, vscode/spell-epic.vsix, then reload the window)")
      return 1
    }
    if (command === "which") {
      console.log(`pid        ${window.pid}`)
      console.log(`workspace  ${window.workspaceFile ?? "(none:  not opened from a .code-workspace)"}`)
      console.log(`folders    ${window.folders.join("\n           ")}`)
      const opened = window.workspaceFile
      if (opened && real(opened) !== resolve(opened)) {
        console.log(`warning    opened through a link:  its relative folders resolve from there, not from the file`)
        console.log(`           (the Claude panel then lists another folder's sessions;  epic \`repo-split\` I38)`)
        console.log(`           reopen ${real(opened)}`)
      }
      return 0
    }
    if (command === "reload") {
      // the bridge's op keeps its name, `reload-view`:  an installed extension answers to it
      const view = flags.review ? "review" : "docs"
      try {
        const { url } = await Window.request("reload-view", { view }, window)
        console.log(
          url ? `rebuilt the ${view} view at ${url}` : `the ${view} view hasn't been shown yet:  nothing to rebuild`
        )
        return 0
      } catch (error) {
        console.error(error.message)
        if (/unknown op/.test(error.message))
          console.error(
            "  (this window's extension predates the view reload:  install it again, then reload the window)"
          )
        return 1
      }
    }
    const path = resolve(target)
    try {
      if (command === "add") {
        const { added } = await Window.request("add-folder", flags.name ? { path, name: flags.name } : { path }, window)
        console.log(added ? `added ${path} to window ${window.pid}` : `${path} is already in window ${window.pid}`)
      } else if (command === "remove") {
        const { removed } = await Window.request("remove-folder", { path }, window)
        console.log(removed ? `removed ${path} from window ${window.pid}` : `${path} isn't in window ${window.pid}`)
      } else {
        const hash = typeof flags.hash === "string" ? flags.hash : undefined
        const { later } = await Window.show(path, { hash, view: flags.review ? "review" : undefined })
        console.log(
          later
            ? `${path} shows in ${relative(MAIN_ROOT, later)}'s window once this session moves there`
            : `showing ${path} in window ${window.pid}`
        )
      }
      return 0
    } catch (error) {
      console.error(error.message)
      return 1
    }
  }

  /**
   * `color [<look>]` / `stay <name> | --end`:  this session's window's look and title;  returns the exit code.
   * - `color` alone lists the looks
   */
  static lookCommand(command, target, flags) {
    try {
      if (command === "color" && !target) {
        console.log(`looks:  ${Object.keys(LOOKS).join(", ")}  (Tomorrow Night Blue's look, in that hue)`)
        return 0
      }
      if (command === "color") {
        const { file, stale } = Window.color(target)
        console.log(`${relative(MAIN_ROOT, file)}:  look ${target.toLowerCase()}`)
        if (stale) console.log(staleLine(file))
        return 0
      }
      const { file, changed, stale } = Window.stay(target, { end: Boolean(flags.end) })
      const what = flags.end
        ? changed
          ? "title and title bar put back"
          : "wasn't retitled:  nothing to put back"
        : `titled ⎇ ${target}`
      console.log(`${relative(MAIN_ROOT, file)}:  ${what}`)
      if (stale) console.log(staleLine(file))
      return 0
    } catch (error) {
      console.error(error.message)
      return 1
    }
  }

  /**
   * `open` / `close` / `handoff` worktree `name`'s window, or `resume` a handoff;  resolves to the exit code.
   * - `resume`'s `name` is the handoff record's file:  read, then deleted
   */
  static async worktreeCommand(command, name, flags) {
    try {
      if (command === "handoff") {
        const prompt = typeof flags.prompt === "string" ? flags.prompt : null
        const handoff = Window.handoff(name, process.env.CLAUDE_CODE_SESSION_ID, { back: Boolean(flags.back), prompt })
        if (!handoff) {
          const closed = await Window.close(name)
          console.log(
            `this session isn't in ${name}'s window, so stays put;  ${closed ? "closed" : "no"} window of ${name}`
          )
          return 0
        }
        console.log(`this session moves to ${relative(MAIN_ROOT, handoff.to)}'s window when this turn ends`)
        if (!handoff.from) console.log("  (this session's window not found:  its old tab stays open)")
        return 0
      }
      if (command === "resume") {
        const handoff = JSON.parse(readFileSync(name, "utf8"))
        rmSync(name, { force: true })
        const { closed, matches, shown } = await Window.resume(handoff, flags.title)
        console.log(`${new Date().toISOString()}  opened session ${handoff.sessionId} in ${handoff.to}`)
        if (shown !== undefined) console.log(`  ${shown ? "showed" : "couldn't show"} ${handoff.show.file}`)
        if (!closed)
          console.log(`  left its old ${handoff.close} open (tabs per title:  ${JSON.stringify(matches ?? {})})`)
        return 0
      }
      if (command === "launch") {
        const pkg = flags.pkg ?? DEFAULT_WINDOW
        const color = typeof flags.color === "string" ? flags.color : null
        const prompt = typeof flags.prompt === "string" ? flags.prompt : `/epic ${name}`
        const move = flags.move ? process.env.CLAUDE_CODE_SESSION_ID : null
        if (flags.move && !SESSION_ID.test(move ?? "")) throw new Error("--move:  $CLAUDE_CODE_SESSION_ID isn't set")
        const launched = await Window.launch(name, pkg, { color, prompt, move })
        console.log(launchedLine(name, prompt, launched))
        return ["several", "no-window"].includes(launched.action) ? 1 : 0
      }
      if (command === "close") {
        const closed = await Window.close(name)
        console.log(closed ? `closed the window of ${name}` : `no window of ${name} open;  its file is gone`)
        return 0
      }
      // not a package window (a worktree's ...):  the whole repo's window, never a question (Owen, 2026-10-07)
      const pkg = flags.pkg ?? Window.packageOf(Window.current()) ?? DEFAULT_WINDOW
      const color = typeof flags.color === "string" ? flags.color : null
      // `--pkg` named:  that window's look, not this one's
      const noOpen = flags["no-open"] === true
      const { file, colors } = Window.open(name, pkg, { color, fromCurrent: !flags.pkg, noOpen })
      console.log(noOpen ? `wrote ${file}  (not opened:  \`code ${file}\` opens it)` : `opened ${file}`)
      if (colors && !(await Window.applyColors(file, colors)))
        console.log("  (its window didn't show up in time:  colours written anyway;  a change to them applies them)")
      return 0
    } catch (error) {
      console.error(error.message)
      return 1
    }
  }
}

/** Every command. */
const COMMANDS = [
  "init",
  "move",
  "which",
  "add",
  "remove",
  "show",
  "reload",
  "open",
  "launch",
  "close",
  "handoff",
  "resume",
  "should-stay",
  "color",
  "stay"
]

/** Usage, printed for a bad command. */
const USAGE = `usage:  epic window <command>
  init                         write each package's missing <windowsFolder>/<pkg>.code-workspace, and bring
                               every window file up to date (folders, files.exclude, the repo's windows.settings;
                               theme kept)
  move [--dry-run]             carry the window files from workspaces/ (the main checkout's, before epic-eject
                               P13) to the windows folder, folder paths rewritten;  never deletes the old ones
  which                        this session's VS Code window:  pid, workspace file, folders
  add <path> [--name <name>]   add a folder (a worktree) to the window
  remove <path>                remove it again
  show <file> [--hash <id>] [--review]
                               show an .html doc in the window's doc preview (right side bar's
                               "Epic Docs" tab;  --review:  its "Review" tab), at id <id>
                               (moving:  in the window this session moves to)
  reload [--review]            rebuild the "Epic Docs" view (--review:  "Review") from scratch, a new
                               frame at the page it shows:  for a view gone wrong (clicks lost ...)
  open <name> [--pkg <pkg>] [--color <look>] [--no-open]
                               open worktree <name> in a new window (default package:  this window's;
                               default look:  this window's);  --no-open:  write its window file only
  launch <name> [--pkg <pkg>] [--color <look>] [--prompt <text>] [--move]
                               wake epic <name>, <text> typed in (default:  /epic <name>):  into its
                               running session;  else a NEW session in its open window (look untouched);
                               else make worktree <name> if needed, open its window, a NEW session there;
                               this session stays put;  --move:  this session goes there instead
  color [<look>]               give this window a look:  Tomorrow Night Blue's, in a hue (no look:  list them)
  stay <name> | --end          a session staying here for worktree <name>:  title the window ⎇ <name>, tint its
                               title bar  /  put both back
  close <name>                 close that window, delete its file
  handoff <name> [--back] [--prompt <text>]
                               move this session to <name>'s window when this turn ends
                               (--back:  from it to its package's window, then close it;
                               --prompt:  typed into the new tab)
  resume <record> [--title <title>]...
                               the move itself (the Stop hook runs it)
  should-stay [--epic] [--json]
                               stay in this window when isolating, or move?  recommend stay|window, and why`

/**
 * The package worktree window file `file` was opened from:  its `spell.package`.
 * - an older file (before 2026-10-03) has none:  its second folder, `<name>/packages/<pkg>`
 */
function worktreePackage(file) {
  const workspace = JSON.parse(readFileSync(file, "utf8"))
  const folder = workspace.folders?.[1]?.path ?? ""
  const pkg = workspace.spell?.package ?? folder.match(/packages[\\/]([^\\/]+)$/)?.[1]
  if (!pkg) throw new Error(`${file}:  no package`)
  return pkg
}

/**
 * The shared links' names:  the main checkout's `package.json` `"shared": { "links" }`, else the config's
 * `sharedFolders` (a repo `epic init` set up has no `package.json` block).
 */
function sharedLinks() {
  try {
    return JSON.parse(readFileSync(join(MAIN_ROOT, "package.json"), "utf8")).shared?.links ?? CONFIG.sharedFolders
  } catch {
    return CONFIG.sharedFolders
  }
}

/**
 * The file beside which a window folder is a CHECKOUT, for `files.exclude`'s `when`:
 * - `package.json` in a repo that has one at its root (spell-app)
 * - else `.epic`, which every checkout of a repo `epic init` set up has
 */
function checkoutMarker() {
  return existsSync(join(MAIN_ROOT, "package.json")) ? "package.json" : ".epic"
}

/**
 * Bring window file `file` up to date:  `change(workspace)` edits it in place.
 * - written back only when that changed something;  returns whether it was written
 * - JSONC (comments):  VS Code reads it, we don't;  left alone, `false`
 */
function refresh(file, change) {
  let text
  let workspace
  try {
    text = readFileSync(file, "utf8")
    workspace = JSON.parse(text)
  } catch {
    return false
  }
  change(workspace)
  const fresh = `${JSON.stringify(workspace, null, 2)}\n`
  if (fresh === text) return false
  writeFileSync(file, fresh)
  return true
}

/**
 * Copy every window file in folder `from` and its `ongoing/` to the same place in folder `to`, each folder path
 * rewritten for its new place (`movedWorkspace()`);  returns a report per file (`dryRun`:  what it would do).
 * - `{ file, action, folders }` each:
 *   - `file`:  its path in the folder (`ui.code-workspace`, `ongoing/seo.code-workspace`)
 *   - `action`:  `moved` (`would move`);  `up to date`, the same text there;
 *     `kept`, ANOTHER text there (written since:  never overwritten)
 *   - `folders`:  `[old, new]` per folder path
 * - NEVER deletes or changes a file in `from`:  run again, it's `up to date`
 * - plain function, no config:  the tests run it on temp folders
 */
export function moveWindowFiles(from, to, { dryRun = false } = {}) {
  const report = []
  for (const sub of ["", EpicConfig.WORKTREE_WINDOWS]) {
    const dir = join(from, sub)
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith(".code-workspace")) continue
      const file = sub ? `${sub}/${name}` : name
      const text = readFileSync(join(dir, name), "utf8")
      const { text: moved, folders } = movedWorkspace(text, dir, join(to, sub))
      const target = join(to, sub, name)
      const there = existsSync(target) ? readFileSync(target, "utf8") : null
      const action = there === moved ? "up to date" : there !== null ? "kept" : dryRun ? "would move" : "moved"
      if (action === "moved") {
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, moved)
      }
      report.push({ file, action, folders })
    }
  }
  return report
}

/**
 * Window file text `text`, from folder `fromDir`, as it reads in folder `toDir`:  `{ text, folders }`.
 * - each relative `"path"` in its `"folders"` list resolved from `fromDir`, then made relative to `toDir`;
 *   an absolute one kept
 * - everything else kept byte for byte:  only those strings change (Owen's theme, colours, comments, layout)
 * - `folders`:  `[old, new]` per folder path
 */
export function movedWorkspace(text, fromDir, toDir) {
  const folders = []
  const list = /"folders"\s*:\s*\[/.exec(text)
  if (!list) return { text, folders }
  const start = list.index + list[0].length
  const end = closingBracket(text, start)
  const rewritten = text.slice(start, end).replace(/("path"\s*:\s*)("(?:[^"\\]|\\.)*")/g, (_, key, literal) => {
    const old = JSON.parse(literal)
    const now = isAbsolute(old) ? old : relative(toDir, resolve(fromDir, old)) || "."
    folders.push([old, now])
    return `${key}${JSON.stringify(now)}`
  })
  return { text: text.slice(0, start) + rewritten + text.slice(end), folders }
}

/**
 * Window file `file`, or its moved copy:  `file` under `oldFolder` (`workspaces/`, before epic `epic-eject` P13)
 * and gone, and the same path under `newFolder` there;  else `file` itself.
 * - a window opened before `epic window move` still names its old file, until it's reopened
 */
export function movedWindowFile(file, oldFolder, newFolder) {
  if (existsSync(file)) return file
  const within = relative(resolve(oldFolder), resolve(file))
  if (!within || within.startsWith("..") || isAbsolute(within)) return file
  const moved = join(newFolder, within)
  return existsSync(moved) ? moved : file
}

/** The line saying a window open from its old file shows a change only once reopened from `file`. */
function staleLine(file) {
  return `  (this window is still open from its old file, gone since \`epic window move\`:  \`code ${file}\` reopens it, and shows this)`
}

/** Where the `[` list whose text starts at `start` ends:  its `]`, strings skipped;  the text's end if none. */
function closingBracket(text, start) {
  let depth = 1
  for (let at = start; at < text.length; at++) {
    const char = text[at]
    if (char === '"') {
      for (at++; at < text.length && text[at] !== '"'; at++) if (text[at] === "\\") at++
    } else if (char === "[") depth++
    else if (char === "]" && --depth === 0) return at
  }
  return text.length
}

/** Whether a process `pid` exists:  signal 0 checks without signalling;  EPERM means it exists, someone else's. */
function isAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === "EPERM"
  }
}

/**
 * Title-bar colours for worktree `name`:  a hue of its own (a hash of the name), dark enough for white text;
 * dimmer while the window isn't focused.
 */
export function tint(name) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)) >>> 0
  const hue = hash % 360
  return {
    "titleBar.activeBackground": hslHex(hue, 60, 32),
    "titleBar.inactiveBackground": hslHex(hue, 35, 24),
    "titleBar.activeForeground": "#ffffff",
    "titleBar.inactiveForeground": "#ffffffaa"
  }
}

/**
 * The named LOOKS a window can take (epic `windows-and-review` P5, Q1:  Owen, 2026-10-06):
 * the WHOLE window in Tomorrow Night Blue's look, its blues turned to the look's hue.
 * - `hue` in degrees;  `saturation`:  how much of the theme's colour it keeps (1, all).
 * - `blue` is the theme itself.
 */
export const LOOKS = {
  red: { hue: 356 },
  orange: { hue: 24 },
  amber: { hue: 42 },
  green: { hue: 140 },
  teal: { hue: 172 },
  cyan: { hue: 190 },
  blue: { hue: 213 },
  indigo: { hue: 236 },
  purple: { hue: 272 },
  pink: { hue: 322 },
  brown: { hue: 26, saturation: 0.45 },
  grey: { hue: 213, saturation: 0.08 }
}

/** The theme every look is made from. */
const LOOK_THEME = "Tomorrow Night Blue"

/**
 * Tomorrow Night Blue's own window colours that carry its blue (VS Code's built-in
 * `extensions/theme-tomorrow-night-blue/themes/tomorrow-night-blue-color-theme.json`):  a look re-hues each.
 * Its greys, whites and the terminal's colours stay as they are.
 */
const LOOK_COLORS = {
  focusBorder: "#bbdaff",
  "input.background": "#001733",
  "dropdown.background": "#001733",
  "list.highlightForeground": "#bbdaff",
  "pickerGroup.foreground": "#bbdaff",
  "editor.background": "#002451",
  "editor.selectionBackground": "#003f8e",
  "minimap.selectionHighlight": "#003f8e",
  "editor.lineHighlightBackground": "#00346e",
  "editorWhitespace.foreground": "#404f7d",
  "editorWidget.background": "#001c40",
  "editorHoverWidget.background": "#001c40",
  "editorGroup.border": "#404f7d",
  "editorGroupHeader.tabsBackground": "#001733",
  "editorGroup.dropBackground": "#25375daa",
  "peekViewResult.background": "#001c40",
  "tab.inactiveBackground": "#001c40",
  "debugToolBar.background": "#001c40",
  "titleBar.activeBackground": "#001126",
  "titleBar.inactiveBackground": "#0e1926",
  "statusBar.background": "#001126",
  "statusBar.inactiveBackground": "#0e1926",
  "statusBar.noFolderBackground": "#001126",
  "statusBar.debuggingBackground": "#001126",
  "activityBar.background": "#001733",
  "progressBar.background": "#bbdaffcc",
  "badge.background": "#bbdaffcc",
  "badge.foreground": "#001733",
  "panelSection.border": "#404f7d",
  "sideBar.background": "#001c40",
  "sideBarSectionHeader.border": "#404f7d",
  "panel.background": "#002451",
  "terminal.background": "#002451"
}

/** The title-bar keys a staying session's tint sets (`tint()`), and `stay --end` puts back. */
const TINT_KEYS = Object.keys(tint(""))

/**
 * Look `name`'s settings:  `{ theme, colors }`, the colours for `workbench.colorCustomizations["[<theme>]"]`;
 * throws for a name not in `LOOKS`, listing them.
 */
export function look(name) {
  const chosen = LOOKS[String(name).toLowerCase()]
  if (!chosen) throw new Error(`no look "${name}":  ${Object.keys(LOOKS).join(", ")}`)
  const colors = {}
  for (const [key, hex] of Object.entries(LOOK_COLORS)) colors[key] = rehue(hex, chosen.hue, chosen.saturation ?? 1)
  return { theme: LOOK_THEME, colors }
}

/**
 * Give window settings `settings` look `name` (in place):  the theme, and the look's colours scoped to it;
 * a global colour the look sets goes (it would fight the look), the rest of Owen's own colours stay.
 * Returns `settings`.
 */
export function withLook(settings, name) {
  const { theme, colors } = look(name)
  const custom = { ...(settings["workbench.colorCustomizations"] ?? {}) }
  for (const key of Object.keys(colors)) delete custom[key]
  custom[`[${theme}]`] = { ...(custom[`[${theme}]`] ?? {}), ...colors }
  settings["workbench.colorTheme"] = theme
  settings["workbench.colorCustomizations"] = custom
  return settings
}

/**
 * A session STAYS in window file `workspace` (parsed) while it works in worktree `name`
 * (in place;  epic `windows-and-review` P5):  the window's title reads `⎇ <name>`,
 * its title bar tinted the worktree's colour (`tint()`), scoped to its theme so it shows over a look.
 * What it replaces is kept in `spell.stay`, for `withoutStay()`;
 * staying again (another worktree) keeps the first one's.  Returns `workspace`.
 */
export function withStay(workspace, name) {
  const settings = (workspace.settings ??= {})
  const scope = `[${settings["workbench.colorTheme"] ?? FALLBACK_THEME}]`
  const custom = { ...(settings["workbench.colorCustomizations"] ?? {}) }
  const scoped = { ...(custom[scope] ?? {}) }
  workspace.spell ??= {}
  workspace.spell.stay ??= {
    title: settings["window.title"] ?? null,
    scope,
    colors: Object.fromEntries(TINT_KEYS.map((key) => [key, scoped[key] ?? null]))
  }
  workspace.spell.stay.name = name
  settings["window.title"] = `\${dirty}\${activeEditorShort}\${separator}⎇ ${name}\${separator}\${appName}`
  custom[scope] = { ...scoped, ...tint(name) }
  settings["workbench.colorCustomizations"] = custom
  return workspace
}

/** The stay `withStay()` began, undone (in place):  the title and title bar as they were.  Returns whether it was. */
export function withoutStay(workspace) {
  const stay = workspace.spell?.stay
  if (!stay) return false
  const settings = (workspace.settings ??= {})
  if (stay.title === null) delete settings["window.title"]
  else settings["window.title"] = stay.title
  const custom = { ...(settings["workbench.colorCustomizations"] ?? {}) }
  const scoped = { ...(custom[stay.scope] ?? {}) }
  for (const [key, value] of Object.entries(stay.colors)) {
    if (value === null) delete scoped[key]
    else scoped[key] = value
  }
  if (Object.keys(scoped).length) custom[stay.scope] = scoped
  else delete custom[stay.scope]
  if (Object.keys(custom).length) settings["workbench.colorCustomizations"] = custom
  else delete settings["workbench.colorCustomizations"]
  delete workspace.spell.stay
  if (!Object.keys(workspace.spell).length) delete workspace.spell
  return true
}

/**
 * `#rrggbb` or `#rrggbbaa` with its hue set to `hue` and its saturation scaled by `saturation`;
 * lightness and alpha kept.
 */
function rehue(hex, hue, saturation) {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
  const alpha = hex.length === 9 ? hex.slice(7) : ""
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  const delta = max - min
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1))
  return `${hslHex(hue, Math.min(100, s * saturation * 100), lightness * 100)}${alpha}`
}

/** HSL (degrees, percents) -> `#rrggbb`. */
function hslHex(hue, saturation, lightness) {
  const s = saturation / 100
  const l = lightness / 100
  const a = s * Math.min(l, 1 - l)
  return `#${channel(0)}${channel(8)}${channel(4)}`

  /** One channel, as two hex digits:  `n` 0 red, 8 green, 4 blue. */
  function channel(n) {
    const k = (n + hue / 30) % 12
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0")
  }
}

/** Resolve after `ms` milliseconds. */
function delay(ms) {
  return new Promise((done) => setTimeout(done, ms))
}

/** Every process's parent pid, by pid:  ONE `ps` call (empty if `ps` fails). */
function parentPids() {
  return new Map([...processTable()].map(([pid, { ppid }]) => [pid, ppid]))
}

/**
 * Every process, by pid:  `{ ppid, command }`, from ONE `ps` call, or from `text` (its output, for tests);
 * empty if `ps` fails.
 * - `command`:  the executable's path, spaces and all
 */
export function processTable(text) {
  const processes = new Map()
  if (text === undefined) {
    const run = spawnSync("ps", ["-axo", "pid=,ppid=,comm="], { encoding: "utf8" })
    if (run.status !== 0) return processes
    text = run.stdout
  }
  for (const line of text.split("\n")) {
    const match = /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line)
    if (match) processes.set(Number(match[1]), { ppid: Number(match[2]), command: match[3].trim() })
  }
  return processes
}

/**
 * The pids of the Claude Code sessions in the window whose extension host is `hostPid`:  its `claude` children.
 * - one per session, in a tab or the side bar.  NOT a `claude` in the window's terminal:
 *   that's a child of the pty host.
 */
export function claudeSessions(processes, hostPid) {
  return [...processes]
    .filter(([, { ppid, command }]) => ppid === hostPid && /(^|\/)claude$/.test(command))
    .map(([pid]) => pid)
}

/**
 * What `launch` does for an epic (epic `epic-eject` P10, Owen's r2):  pure, from what's open and running.
 * - `windowOpen`:  whether the epic's window is open
 * - `sessions`:  the epic's live sessions, as `Window.epicSessions()` gives them
 * - returns `{ action, rewrite, open, start, wake, sessions }`:
 *   - `action`, one of:
 *     - `own`:  the session running this IS the epic's:  nothing to wake
 *     - `wake`:  type the prompt into `wake`, the epic's one running session, in its window
 *     - `several`:  several of its sessions run (`sessions`):  guessing could type into the wrong one
 *     - `no-window`:  its one session has no window bridge (a terminal):  type it there by hand
 *     - `start`:  a NEW session in the epic's open window
 *     - `open`:  write the window file, open it, a NEW session in it
 *   - `rewrite`:  write the epic's window file, a fresh look (only for `open`)
 *   - `open`:  open it with `code` (only for `open`)
 *   - `start`:  start a new session in the epic's window
 *   - `wake`:  the session to type into, else `null`
 * - the epic's window's own sessions first:
 *   one elsewhere (it stayed in a main window) counts only when it has none
 * - an open window is never rewritten:  a live change to its file recolours it under Owen
 */
export function launchPlan({ windowOpen, sessions }) {
  const nothing = { rewrite: false, open: false, start: false, wake: null, sessions: [] }
  if (sessions.some((session) => session.self)) return { ...nothing, action: "own" }
  const inWindow = sessions.filter((session) => session.inWindow)
  const running = inWindow.length ? inWindow : sessions
  if (running.length > 1) return { ...nothing, action: "several", sessions: running }
  const [session] = running
  if (session && !session.window) return { ...nothing, action: "no-window", sessions: running }
  if (session) return { ...nothing, action: "wake", wake: session, sessions: running }
  if (windowOpen) return { ...nothing, action: "start", start: true }
  return { ...nothing, action: "open", rewrite: true, open: true, start: true }
}

/** What `launch` did for epic `name` (`Window.launch()`'s answer, `launched`), in one line. */
function launchedLine(name, prompt, { action, file, sessions }) {
  const titles = sessions.map(({ title, sessionId }) => title || sessionId.slice(0, 8)).join(", ")
  switch (action) {
    case "own":
      return `this session is ${name}'s own:  nothing to wake`
    case "wake":
      return `${titles} is running:  ${prompt} typed into it, in its window (nothing opened or recoloured)`
    case "several":
      return `${sessions.length} sessions of ${name} are running (${titles}):  nothing typed;  type ${prompt} in one`
    case "no-window":
      return `${titles} is running, but not in a VS Code window with the bridge:  type ${prompt} there`
    case "start":
      return `${name}'s window is open:  a new session there, ${prompt} typed in (its look untouched)`
    case "move":
      return `this session moves to ${name}'s window when this turn ends, ${prompt} typed in;  its tab here closes`
    default:
      return `opened ${relative(MAIN_ROOT, file)}, a new session there:  ${prompt}`
  }
}

/**
 * Every live Claude Code session:  `{ pid, sessionId, title, cwd }` each, from Claude's own registry,
 * `sessions/<pid>.json` in `$SPELL_CLAUDE_HOME`, else `~/.claude`;  a record whose process is gone is skipped.
 * - `title`:  the title its tab shows, icon and all (`🚧 seo`);  `""` when it has none
 *   - its record's `name`, or its transcript's title when Claude Code made that up for a resumed session
 *     (`SessionFolders.recordTitle()`;  epic `epic-engine` I50, I51)
 * - the same records `RunningEpics.liveSessions()` reads, in `spell-epic`
 */
function liveSessions() {
  const home = process.env.SPELL_CLAUDE_HOME || join(homedir(), ".claude")
  const folder = join(home, "sessions")
  if (!existsSync(folder)) return []
  const sessions = []
  for (const name of readdirSync(folder)) {
    if (!name.endsWith(".json")) continue
    try {
      const record = JSON.parse(readFileSync(join(folder, name), "utf8"))
      if (!Number.isInteger(record.pid) || !record.sessionId || !isAlive(record.pid)) continue
      const title = SessionFolders.recordTitle(record, home)
      sessions.push({ pid: record.pid, sessionId: record.sessionId, title, cwd: record.cwd ?? "" })
    } catch {
      // half-written, or not a session's:  skip it
    }
  }
  return sessions
}

/**
 * Whether session title `title` names epic `name`:
 * without its icon it IS the name (`🚧 seo`), or holds it as a whole word (`seo review`;  never `seo-pages`).
 * - the same rule as `titleNames()` in `spell-epic` (`RunningEpics`), which this plain script can't import
 */
export function titledFor(title, name) {
  const bare = title
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim()
    .toLowerCase()
  const epic = name.toLowerCase()
  if (!epic || !bare) return false
  if (bare === epic) return true
  const escaped = epic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^a-z0-9_-])${escaped}($|[^a-z0-9_-])`, "u").test(bare)
}

/** The registry entry of the window process `pid` runs in:  the nearest of it and its ancestors with one, else `null`. */
function windowAbove(pid, entries, processes) {
  const seen = new Set()
  for (; pid > 1 && !seen.has(pid); pid = processes.get(pid)?.ppid ?? 0) {
    if (entries.has(pid)) return entries.get(pid)
    seen.add(pid)
  }
  return null
}

/** Whether `ancestor` is `pid` or one of its ancestors in `processes`. */
function isAncestor(ancestor, pid, processes) {
  const seen = new Set()
  for (; pid > 1 && !seen.has(pid); pid = processes.get(pid)?.ppid ?? 0) {
    if (pid === ancestor) return true
    seen.add(pid)
  }
  return false
}

/** Each of `pids`' working folder, by pid:  ONE `lsof` call;  missing when `lsof` can't tell. */
function cwdsOf(pids) {
  if (!pids.length) return new Map()
  const run = spawnSync("lsof", ["-a", "-d", "cwd", "-p", pids.join(","), "-Fpn"], { encoding: "utf8" })
  return parseLsof(run.stdout ?? "")
}

/**
 * `lsof -Fpn` output -> each pid's file, by pid:  `p<pid>` starts a process, `n<path>` is its file.
 * - other lines (`fcwd` ...) skipped
 */
export function parseLsof(text) {
  const cwds = new Map()
  let pid = 0
  for (const line of text.split("\n")) {
    if (line.startsWith("p")) pid = Number(line.slice(1))
    else if (line.startsWith("n") && pid) cwds.set(pid, line.slice(1))
  }
  return cwds
}

/** The worktree `cwd` is in (`.../.claude/worktrees/<name>/...`:  `EpicConfig.worktreeNameOf()`), else `null`. */
export function worktreeOf(cwd) {
  return CONFIG.worktreeNameOf(cwd) ?? null
}

/**
 * Should a session isolating itself STAY in its window, or move to a worktree's window of its own?
 * - `window`:  its registry entry (`null`:  no bridge here)
 * - `others`:  the window's OTHER sessions, `{ pid, cwd }` each (`cwd` `null` when unknown)
 * - `epic`:  for `/epic`:  its epic page takes the window's doc preview
 * - returns `{ recommend, others, reasons }`:
 *   - `recommend`:  `"stay"` or `"window"`
 *   - `others`:  `{ pid, worktree }` each (`worktree` `null`:  in the main checkout)
 *   - `reasons`:  sentences for the modal
 */
export function stayAdvice({ window, others = [], epic = false }) {
  const listed = others.map(({ pid, cwd }) => ({ pid, worktree: worktreeOf(cwd) }))
  if (!window) {
    const reasons = ["no window bridge in this session's window:  a new window can't be opened from here anyway"]
    return { recommend: "stay", others: listed, reasons }
  }
  if (!listed.length) {
    const reasons = ["this session is the window's only one:  staying touches nothing else"]
    if (epic) reasons.push("the epic page shows in this window's side bar")
    return { recommend: "stay", others: listed, reasons }
  }
  const where = listed.map(({ worktree }) => (worktree ? `worktree \`${worktree}\`` : "the main checkout"))
  const reasons = [
    `${listed.length > 1 ? `${listed.length} other sessions share` : "another session shares"} this window ` +
      `(${where.join(", ")})`
  ]
  const worktrees = listed.filter(({ worktree }) => worktree)
  if (worktrees.length) {
    reasons.push("another worktree's changes are already in this window's Source Control:  easy to mix the two up")
  }
  reasons.push(
    epic
      ? "the side bar's doc preview shows one doc:  the epic page and the other sessions' docs would replace each other"
      : "they share its doc preview (one doc at a time)"
  )
  return { recommend: "window", others: listed, reasons }
}

/** `path` with symlinks resolved (`/tmp` -> `/private/tmp`), as `process.cwd()` reports it (`RealPath.of()`). */
function real(path) {
  return RealPath.of(path)
}

/**
 * `--key value` flags, plus everything else in order.
 * - a flag given twice is an array (`--title a --title b`)
 * - NOTE:  a value can't start with `--`
 */
function parseArgs(argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const match = argv[i].match(/^--([\w-]+)$/)
    if (!match) {
      positional.push(argv[i])
      continue
    }
    // a bare flag (`--back`) before another flag takes no value
    const value = i + 1 < argv.length && !argv[i + 1].startsWith("--") ? argv[++i] : true
    const key = match[1]
    flags[key] = key in flags ? [flags[key], value].flat() : value
  }
  return { positional, flags }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await Window.main(process.argv.slice(2))
}
