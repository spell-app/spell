import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

import { kitFileAt } from "spell/cli/projectBin"

/****************
 * ### `MachineTools`
 * What `spell local on` switches for the whole MACHINE, not one project (epic `repo-split` T72, reversing J230):
 * Claude Code's epic plugin (its hooks and monitor), its skills in `~/.claude/skills/`, and the VS Code extension.
 * - Switched by the checkout's own `epic plugin install` (`PluginInstall`, in the `epic/` folder), run as a program:
 *   `spell/cli` imports no big folder.
 *   - `on`:  `epic plugin install --kit <checkout> --no-bin`;  the extension too, when the editor's is another
 *     version
 *   - `off`:  `epic plugin install --kit <the project's node_modules/spell> --no-bin --no-extension`, run by the
 *     checkout's `epic`, which does what `yarn spell epic plugin install` would
 *   - `--no-bin`:  `spell local`'s `PathLink` keeps the `PATH`'s `epic` itself
 *   - `--no-extension` going back:  an older extension is never put back over a newer one (J:  no clean way down)
 * - `off` only undoes what `on` did, and only once no other project still runs a checkout:  `on` records each
 *   project in `~/.spell/local-plugin.json` when it changed something, or the plugin already followed because of it
 * - NEVER runs anything in a test:  tests hand in `run`;  the real one refuses under Vitest
 ****************/
export class MachineTools {
  /** the home folder:  `~/.spell/local-plugin.json` */
  readonly home: string
  /** runs a checkout's `epic` with `args`, from folder `cwd` */
  readonly run: EpicRunner

  constructor({ home = homedir(), run = runEpicBin }: MachineToolsOptions = {}) {
    this.home = home
    this.run = run
  }

  /** `spell local`'s record of the plugin switch:  `~/.spell/local-plugin.json`. */
  get recordFile(): string {
    return join(this.home, ".spell", "local-plugin.json")
  }

  /**
   * `spell local on` in `project`:  Claude Code's epic plugin, its skills and the editor's extension switched to
   * `kit`'s;  what changed.
   * - NEVER throws:  a failure is the result's `problem`, in words
   */
  switchOn(project: string, kit: string): MachineSwitch {
    const bin = join(kit, EPIC_BIN)
    if (!existsSync(bin)) return { outcome: "failed", changes: [], problem: `${kit} has no ${EPIC_BIN}` }
    const ran = this.install(kit, ["--kit", kit, "--no-bin"])
    if (ran.problem) return { outcome: "failed", changes: [], problem: ran.problem }
    const record = this.record()
    if (ran.changes.length || record) {
      const projects = [...new Set([...(record?.projects ?? []), project])]
      this.writeRecord({ kit, projects })
    }
    const vsix = existsSync(join(kit, VSIX)) ? undefined : join(kit, VSIX)
    return { outcome: ran.changes.length ? "switched" : "kept", changes: ran.changes, missingExtension: vsix }
  }

  /**
   * `spell local off` in `project`:  the plugin and its skills back to `project`'s npm install, once no other project
   * runs a checkout, and only when `spell local on` switched them;  what changed.
   * - NEVER throws:  a failure is the result's `problem`, in words
   */
  switchOff(project: string): MachineSwitch {
    const record = this.record()
    if (!record) return { outcome: "not-ours", changes: [] }
    const others = record.projects.filter((other) => other !== project && !!kitFileAt(other))
    if (others.length) {
      this.writeRecord({ ...record, projects: others })
      return { outcome: "in-use", changes: [], projects: others }
    }
    const npm = join(project, "node_modules", "spell")
    if (!existsSync(join(npm, "epic", ".claude-plugin", "plugin.json")))
      return { outcome: "no-install", changes: [], problem: `${npm} has no epic plugin` }
    if (!existsSync(join(record.kit, EPIC_BIN))) {
      return { outcome: "failed", changes: [], problem: `${record.kit} has no ${EPIC_BIN} any more` }
    }
    const ran = this.install(record.kit, ["--kit", npm, "--no-bin", "--no-extension"])
    if (ran.problem) return { outcome: "failed", changes: [], problem: ran.problem }
    this.writeRecord(undefined)
    return { outcome: "switched", changes: ran.changes }
  }

  /**
   * The record, its projects pruned of any that no longer run a checkout;  `undefined` when `on` switched nothing.
   * - NEVER throws:  an unreadable record is none
   */
  record(): MachineRecord | undefined {
    try {
      const record = JSON.parse(readFileSync(this.recordFile, "utf8")) as MachineRecord
      return { ...record, projects: record.projects.filter((project) => !!kitFileAt(project)) }
    } catch {
      return undefined
    }
  }

  /** Run `kit`'s `epic plugin install <args> --json`:  its changes, or why it failed. */
  private install(kit: string, args: string[]): { changes: string[]; problem?: string } {
    const ran = this.run(join(kit, EPIC_BIN), ["plugin", "install", ...args, "--json"], kit)
    if (ran.status !== 0) {
      const why = (ran.stderr || ran.stdout).trim().split("\n").at(-1) ?? ""
      return { changes: [], problem: `epic plugin install failed${why ? `:  ${why}` : ""}` }
    }
    try {
      return { changes: (JSON.parse(ran.stdout) as { changes?: string[] }).changes ?? [] }
    } catch {
      return { changes: [], problem: "epic plugin install said something unexpected" }
    }
  }

  /** Write the record;  `undefined` removes it. */
  private writeRecord(record: MachineRecord | undefined): void {
    if (!record) return rmSync(this.recordFile, { force: true })
    mkdirSync(dirname(this.recordFile), { recursive: true })
    writeFileSync(this.recordFile, JSON.stringify(record, null, 2) + "\n")
  }
}

////////////////
// ## Types
////////////////

/** A checkout's `epic` bin, from its root. */
export const EPIC_BIN = "epic/bin/epic"

/** The VS Code extension's package in a checkout, built by `yarn vscode:package` in its `epic/`. */
export const VSIX = "epic/vscode/spell-epic.vsix"

/** Runs `bin` (an `epic`) with `args` from `cwd`:  its exit status and output. */
export type EpicRunner = (
  bin: string,
  args: string[],
  cwd: string
) => { status: number; stdout: string; stderr: string }

/** `new MachineTools()`'s options:  tests pass their own. */
export type MachineToolsOptions = {
  /** default:  `os.homedir()` */
  home?: string
  /** default:  node runs the bin, its output kept */
  run?: EpicRunner
}

/** What `switchOn()` / `switchOff()` did. */
export type MachineSwitch = {
  /**
   * - `switched`:  something changed (`changes`)
   * - `kept`:  it ran the checkout's already
   * - `in-use`:  left, for `projects`
   * - `not-ours`:  `spell local on` never switched it, so `off` leaves it
   * - `no-install`, `failed`:  nothing changed;  `problem` says why
   */
  outcome: "switched" | "kept" | "in-use" | "not-ours" | "no-install" | "failed"
  /** `epic plugin install`'s lines, one per change */
  changes: string[]
  /** `in-use`:  the other projects still running a checkout */
  projects?: string[]
  /** why nothing changed, in words */
  problem?: string
  /** `on`:  the extension package the checkout hasn't built yet, so the editor keeps its own */
  missingExtension?: string
}

/** `spell local`'s record of the plugin switch. */
export type MachineRecord = {
  /** the checkout `on` switched to */
  kit: string
  /** the projects that ran `on`, full paths */
  projects: string[]
}

/**
 * The real runner:  node runs `bin`.
 * - refuses under Vitest (a failure, so `spell local` says it and carries on):  a test that forgot its own runner, or
 *   runs the real `spell` as a program, would rewrite the machine's Claude Code and VS Code
 */
function runEpicBin(bin: string, args: string[], cwd: string) {
  if (process.env.VITEST) return { status: 1, stdout: "", stderr: "a test runs no real epic:  hand in `run`" }
  const ran = spawnSync(process.execPath, [bin, ...args], { cwd, encoding: "utf8" })
  return { status: ran.status ?? 1, stdout: ran.stdout ?? "", stderr: ran.stderr ?? "" }
}
