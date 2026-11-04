/**
 * `epic airplane <verb>`:  airplane mode (epic `airplane`) --
 * Owen works on the docs with no Claude, on a plane;
 * every mark, note and request he leaves waits for `/airplane land`.
 * The `/airplane` skill (`.claude/skills/airplane/SKILL.md`) runs these.
 *
 *     epic airplane check --fix
 *     ok    page server     http://127.0.0.1:4747 (main)
 *     fixed offline pages   highlight.js pointed at the repo's copy in 138 pages
 *     ok    extension       Review:  Open Epic... installed
 *     note  waiting         3 marks in 2 epics, already waiting from before
 *
 * - `on` / `off`:  the switch (`AirplaneMode`, `~/.spell/airplane.json`)
 *   - the page server tells pages as it serves them, so a page reloaded after `on` says "queued for when you land"
 * - `status [--json]` (default):  on or off, since when
 * - `check [--fix] [--json]`:  is this laptop ready to fly?
 *   Exits 1 while anything isn't (`fixed` counts as ready).
 *   - `checkout`:  run from the MAIN checkout:  its page server is the one the side bar uses on the plane
 *   - `page server`:  running;  `--fix` starts it (`spell server start`)
 *   - `offline pages`:  no docs page loads anything from the internet (`offline.ts`);
 *     `--fix` points the highlight.js tag at the repo's copy
 *   - `extension`:  the installed VS Code extension has "Review:  Open Epic..." (built from a `main` with this epic);
 *     else run `spell app vscode` from `main`
 *   - `waiting`:  marks already waiting in the epics' inboxes, from before the flight:  a note, never a failure
 * - `inbox [--since <iso>] [--json]`:  everything Owen left, by place (`AirplaneInbox`):
 *   what `/airplane land` works through
 *   - `--since`:  when the flight began;  default the switch's `since`, while it's on
 * - Which checkout:  the one this file is in, which `epic` picks from the current folder (`EpicTools.run()`)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { parseVerbArgs, stringFlag } from "spell/epic/command/command.types"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { DataFile } from "spell/epic/data/DataFile"
import { SRV } from "spell/server"
import { PageServer, pageServerRoot } from "spell/server/page"

import { AirplaneInbox } from "./AirplaneInbox.ts"
import { AirplaneMode } from "./AirplaneMode.ts"
import { DOCS_FOLDERS, HIGHLIGHT, Offline } from "./offline.ts"
import { ROOT } from "./pages.js"

/** One line of `check`:  what was checked, how it stands, and what to do about it. */
export type FlightCheck = { name: string; status: "ok" | "fixed" | "fail" | "note"; detail: string }

/**
 * The pre-flight checks, for checkout `root`;  `fix`:  fix what can be fixed on the spot.
 * - NEVER throws:  a check that can't run fails, saying why
 */
export async function preFlight(root: string, { fix = false } = {}): Promise<FlightCheck[]> {
  const checks = [checkoutCheck(root), await serverCheck(root, fix), offlineCheck(root, fix), extensionCheck()]
  const waiting = waitingCheck(root)
  return waiting ? [...checks, waiting] : checks
}

/** The main checkout, not a worktree:  its page server is the one the side bar shows on the plane. */
function checkoutCheck(root: string): FlightCheck {
  const worktree = EpicConfig.of(root).worktreeNameOf(root) !== undefined
  return worktree
    ? { name: "checkout", status: "fail", detail: `${root} is a worktree:  run it from the main checkout` }
    : { name: "checkout", status: "ok", detail: root }
}

/**
 * The checkout's page server, running;  `fix`:  `PageServer.ensure()`, which also restarts one older than its code
 * (after the merge that brought this epic in, so pages get airplane mode).
 */
async function serverCheck(checkout: string, fix: boolean): Promise<FlightCheck> {
  const name = "page server"
  // the kit's, from any folder of it:  it starts from the kit's root only (epic `repo-split` P16)
  const root = pageServerRoot(checkout)
  try {
    if (!fix) {
      const running = await new SRV.PidFile(root).status()
      if (running) return { name, status: "ok", detail: running.base }
      return { name, status: "fail", detail: "not running:  `spell server start`" }
    }
    const server = await PageServer.ensure(root)
    return server.launched
      ? { name, status: "fixed", detail: `started:  ${server.base}` }
      : { name, status: "ok", detail: server.base }
  } catch (error) {
    return { name, status: "fail", detail: `can't check:  ${(error as Error).message}` }
  }
}

/**
 * No docs page of checkout `checkout`'s epic folder loads anything from the internet;
 * `fix`:  highlight.js pointed at the engine's copy first.
 */
function offlineCheck(checkout: string, fix: boolean): FlightCheck {
  const name = "offline pages"
  const root = EpicConfig.contentOf(checkout)
  const folders = DOCS_FOLDERS.filter((folder) => existsSync(join(root, folder)))
  const files = Offline.filesUnder(folders, { cwd: root })
  let fixed = 0
  const loads = files.flatMap((file) => {
    const text = readFileSync(file, "utf8")
    if (!fix || !text.includes(HIGHLIGHT.cdn)) return Offline.loadsIn(file, text)
    fixed++
    const local = Offline.fixHighlight(file, text, root)
    writeFileSync(file, local)
    return Offline.loadsIn(file, local)
  })
  if (loads.length) {
    const first = loads[0]!
    const where = `${first.file.slice(root.length + 1)}:${first.line}`
    return {
      name,
      status: "fail",
      detail: `${loads.length} remote loads, the first ${where}:  \`epic pages offline\``
    }
  }
  return fixed
    ? { name, status: "fixed", detail: `highlight.js pointed at the repo's copy in ${fixed} pages` }
    : { name, status: "ok", detail: `${files.length} pages, nothing remote` }
}

/**
 * An installed VS Code extension knows "Review:  Open Epic...":
 * - spell-epic's (`spellEpic.reviewView.openEpic`)
 * - or the spell language extension's, while it still has the Review tab (`spell.reviewView.openEpic`)
 */
function extensionCheck(): FlightCheck {
  const name = "extension"
  const folder = join(homedir(), ".vscode", "extensions")
  const installed = existsSync(folder)
    ? readdirSync(folder).filter((entry) => EXTENSIONS.some((prefix) => entry.startsWith(prefix)))
    : []
  const has = installed.some((entry) => {
    const manifest = join(folder, entry, "package.json")
    return existsSync(manifest) && OPEN_EPIC.test(readFileSync(manifest, "utf8"))
  })
  return has
    ? { name, status: "ok", detail: "Review:  Open Epic... installed" }
    : {
        name,
        status: "fail",
        detail: "no extension with Review:  Open Epic...:  spell-epic's `vscode/` (`yarn package`, then install it)"
      }
}

/** Marks already waiting in the epics' inboxes;  `undefined` when none. */
function waitingCheck(root: string): FlightCheck | undefined {
  const epics = join(EpicConfig.contentOf(root), "epics")
  if (!existsSync(epics)) return undefined
  const counts = readdirSync(epics).flatMap((name) => {
    const inbox = DataFile.read<{ marks?: object; now?: unknown[] }>(
      join(epics, name, `${name}.inbox${DataFile.SUFFIX}`)
    )
    if (!inbox) return []
    const count = Object.keys(inbox.marks ?? {}).length + (inbox.now?.length ?? 0)
    return count ? [count] : []
  })
  if (!counts.length) return undefined
  const marks = counts.reduce((a, b) => a + b, 0)
  return { name: "waiting", status: "note", detail: `${marks} marks in ${counts.length} epics, already waiting` }
}

/** The extension command `check` looks for in the installed extension's `package.json`. */
const OPEN_EPIC = /\b(?:spellEpic|spell)\.reviewView\.openEpic\b/

/** The extensions' folder names' starts, `<publisher>.<name>-`:  spell-epic's, then the spell language extension's. */
const EXTENSIONS = ["spell-app.spell-epic-", "spell-app.spell-language-"]

////////////////
// ## The command
////////////////

/** Run verb `verb` with `flags`;  returns the exit code. */
export async function run([verb = "status"]: string[], flags: Record<string, string | true>): Promise<number> {
  const json = !!flags.json
  switch (verb) {
    case "on":
    case "off": {
      AirplaneMode.turn(verb === "on")
      return run(["status"], flags)
    }
    case "status": {
      const state = AirplaneMode.read()
      if (json) console.log(JSON.stringify(state ?? { on: false }, null, 2))
      else console.log(state ? `airplane mode on, since ${state.since}` : "airplane mode off")
      return 0
    }
    case "check": {
      const checks = await preFlight(ROOT, { fix: !!flags.fix })
      if (json) console.log(JSON.stringify(checks, null, 2))
      else for (const check of checks) console.log(`${check.status.padEnd(6)}${check.name.padEnd(16)}${check.detail}`)
      return checks.some((check) => check.status === "fail") ? 1 : 0
    }
    case "inbox": {
      const since = stringFlag(flags.since) ?? AirplaneMode.read()?.since
      const inbox = AirplaneInbox.gather(ROOT, { since })
      if (json) console.log(JSON.stringify(inbox, null, 2))
      else if (inbox.isEmpty) console.log("nothing waiting")
      else for (const line of inbox.lines) console.log(line)
      return 0
    }
    default:
      console.error(
        "usage:  epic airplane on | off | status [--json] | check [--fix] [--json] | inbox [--since <iso>] [--json]"
      )
      return 2
  }
}

if (import.meta.main) {
  const { positional, flags } = parseVerbArgs(process.argv.slice(2))
  process.exitCode = await run(positional, flags)
}
