import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

import { Processes } from "spell/server/Processes"
import { RealPath } from "spell/server/RealPath"
import { CLI } from "spell/cli"
import { EpicHome } from "spell/epic/config/EpicHome"

import { EXIT, EpicCommandError, parseVerbArgs } from "./command.types"
import { PluginInstall, type PluginInstallReport } from "./PluginInstall"

/****************
 * ### `Upgrade`
 * `epic upgrade [--dry-run] [--json]`:  the epic plugin brought up to the newest `spell` on npm's `next` tag,
 * for people who started with `npx spell@next epic init`.
 *
 * What it does, in order:
 * 1. Asks npm for the newest `spell@next` (`npm view spell@next version`), and says it beside the version running now.
 * 2. Stops, "up to date", when they're the same AND this copy is already in our own folder (below).
 * 3. Otherwise installs that version into our own folder, `<epic home>/versions/<version>/`
 *    (`npm install --prefix <folder> spell@<version>`), unless it's there already.
 * 4. Runs the plugin install against it (`PluginInstall`, as `epic plugin install --kit` would):
 *    Claude Code's plugin cache, the skills in `~/.claude/skills/` and `~/.local/bin/epic` now lead to the new copy.
 * 5. Says to type `/reload-plugins` in each open Claude Code session;  a new session gets it by itself.
 *
 * - Why our own folder, not `npm install -g`:
 *   - `-g` writes into node's own folder:  often needs `sudo`, and each node version (nvm, fnm, Homebrew) has its own,
 *     so switching node would lose it
 *   - a global `spell` may be the person's own, for other work:  this never touches it
 *   - one folder per version:  the old copy stays until the new one is in place, so a failed upgrade leaves the
 *     plugin working
 * - It also moves an install off npm's download cache:  `npx spell@next epic init` links the plugin into npx's cache,
 *   which npm may clear (`npm cache clean`, or by itself), breaking every link;  run here at the same version, it
 *   copies that version into our folder and links it there.
 *   - TODO:  `epic init` from npx could do the same itself (`RepoInit.pluginStep()`);  it costs a second npm install
 *     at init, so it's left for now
 * - In Spell's own checkout (the plugin running in place from the kit's `epic/`, `PluginInstall.isPublished()` false):
 *   it says so, points at `git pull` / `epic worktree merge-main`, and changes nothing.
 * - Old version folders are kept:  TODO:  remove all but the last two
 * - `--dry-run`:  asks npm, says what it would do, installs and writes nothing;  `--json`:  the report as JSON
 * - Throws `EpicCommandError` when npm can't be asked, or the install fails.
 * - Testable without npm or the network:  npm and the plugin install are constructor options.
 ****************/
export class Upgrade {
  /** the `spell` running now:  the published package's folder, or the kit's checkout */
  readonly kit: string
  /** where each version is installed, a folder each:  `<epic home>/versions` */
  readonly versions: string
  /** npm's dist-tag to follow:  `next` */
  readonly tag: string
  /** runs `npm <args>`:  its exit status and output */
  readonly npm: (args: string[]) => NpmRun
  /** the plugin install, for a `spell` package's folder */
  readonly installer: (kit: string) => { install(options: { dryRun?: boolean }): PluginInstallReport }
  /** prints a line as it goes (the slow npm install) */
  readonly say: (line: string) => void

  constructor({
    kit = PluginInstall.mainKit(),
    versions = EpicHome.subfolder("versions"),
    tag = "next",
    npm = (args) => Processes.run("npm", args),
    installer = (folder) => new PluginInstall({ kit: folder }),
    say = (line) => CLI.out(line)
  }: UpgradeProps = {}) {
    this.kit = kit
    this.versions = versions
    this.tag = tag
    this.npm = npm
    this.installer = installer
    this.say = say
  }

  /** Run `epic upgrade [--dry-run] [--json]`;  resolves to the exit code. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["dryRun", "json"])
    if (positional.length) throw new EpicCommandError(`epic upgrade takes no '${positional[0]}'`, EXIT.USAGE)
    const json = flags.json === true
    const report = this.upgrade({ dryRun: flags.dryRun === true, quiet: json })
    if (json) CLI.out(JSON.stringify(report, null, 2))
    else for (const line of Upgrade.lines(report)) CLI.out(line)
    return EXIT.OK
  }

  /**
   * Upgrade (the class's steps);  what it did, or would with `dryRun`.
   * - `quiet`:  no progress line before the npm install (`--json`)
   * - SIDE EFFECT (not `dryRun`):  installs a version with npm, and writes Claude Code's plugin files and links
   * - throws `EpicCommandError` when npm can't be asked, or its install fails
   */
  upgrade({ dryRun = false, quiet = false }: { dryRun?: boolean; quiet?: boolean } = {}): UpgradeReport {
    const current = Upgrade.versionOf(this.kit)
    const base = { current, tag: this.tag, from: this.kit, dryRun }
    if (!PluginInstall.isPublished(this.kit)) return { ...base, state: "checkout", changes: [] }

    const newest = this.newest()
    const folder = join(this.versions, newest)
    const target = join(folder, "node_modules", "spell")
    const inOurFolder = RealPath.isIn(this.kit, this.versions)
    if (newest === current && inOurFolder) return { ...base, newest, state: "up to date", changes: [] }

    const state = newest === current ? "moved" : "upgraded"
    const download = !existsSync(join(target, "package.json"))
    if (download && !dryRun) this.install(newest, folder, { quiet })
    // a dry run with nothing downloaded yet:  the plugin install can't look at what isn't there
    const changes = download && dryRun ? [] : this.installer(target).install({ dryRun }).changes
    return { ...base, newest, state, folder: target, download, changes }
  }

  /** The newest `spell` on npm's tag:  `npm view spell@<tag> version`.  Throws `EpicCommandError` when npm can't say. */
  newest(): string {
    const run = this.npm(["view", `${PACKAGE}@${this.tag}`, "version"])
    const version = run.status === 0 ? run.stdout.trim().split(/\s+/).pop() : undefined
    if (!version || !VERSION.test(version))
      throw new EpicCommandError(
        `epic upgrade:  couldn't ask npm for the newest ${PACKAGE}@${this.tag}` +
          `${run.stderr?.trim() ? `:  ${run.stderr.trim().split("\n")[0]}` : ""}.\n` +
          "Check that you're online and that npm works (npm view spell version), then try again.",
        EXIT.ERRORS
      )
    return version
  }

  /**
   * `spell@<version>` installed into `folder` (`npm install --prefix`).
   * - SIDE EFFECT:  makes `folder`;  prints a line first unless `quiet`
   * - throws `EpicCommandError` when npm fails, with npm's last lines
   */
  private install(version: string, folder: string, { quiet }: { quiet: boolean }): void {
    if (!quiet) this.say(`Downloading spell ${version} into ${shortPath(folder)} ...`)
    mkdirSync(folder, { recursive: true })
    const run = this.npm(["install", "--prefix", folder, `${PACKAGE}@${version}`, "--no-audit", "--no-fund"])
    if (run.status !== 0 || !existsSync(join(folder, "node_modules", PACKAGE, "package.json")))
      throw new EpicCommandError(
        `epic upgrade:  npm couldn't install ${PACKAGE} ${version} into ${folder}.\n` +
          `${(run.stderr ?? "").trim().split("\n").slice(-5).join("\n")}\n` +
          "Nothing else was changed:  epic still runs the version it had.",
        EXIT.ERRORS
      )
  }

  /** The version in `kit`'s `package.json`;  `unknown` when it can't be read. */
  static versionOf(kit: string): string {
    try {
      return (JSON.parse(readFileSync(join(kit, "package.json"), "utf8")) as { version?: string }).version ?? "unknown"
    } catch {
      return "unknown"
    }
  }

  /** What `report` says, a line each, for people. */
  static lines(report: UpgradeReport): string[] {
    const { current, newest, tag, dryRun } = report
    if (report.state === "checkout")
      return [
        `epic runs from Spell's own checkout (${report.from}), so there's nothing to download.`,
        "To get the newest:  git pull on main, or epic worktree merge-main in a worktree.",
        "Nothing was changed."
      ]
    if (report.state === "up to date") return [`epic is up to date:  spell ${current} is the newest on npm (${tag}).`]
    const where = shortPath(dirname(dirname(report.folder ?? "")))
    const lines =
      report.state === "moved"
        ? [
            `You have the newest spell, ${newest}.`,
            "It runs from npm's download cache, which npm can clear at any time.",
            `${dryRun ? "Would keep" : "Kept"} a copy of its own in ${where} instead.`
          ]
        : dryRun
          ? [
              `A newer spell is out:  ${newest} (you have ${current}).`,
              `Would ${report.download ? "download it into" : "use the copy in"} ${where}.`
            ]
          : [`Updated spell from ${current} to ${newest}, the newest.`, `The new version is in ${where}.`]
    if (dryRun)
      return [
        ...lines,
        report.download
          ? "Would then point Claude Code and the epic command at it."
          : `Would make ${report.changes.length} change${report.changes.length === 1 ? "" : "s"} to point Claude Code at it:`,
        ...(report.download ? [] : report.changes.map((change) => `  ${change}`)),
        "Nothing was changed (a dry run)."
      ]
    return [
      ...lines,
      "Claude Code now uses it, and so does the epic command in your terminal.",
      "",
      "One more step:  in each Claude Code window that's open, type /reload-plugins and press Enter.",
      "Windows you open from now on use it by themselves."
    ]
  }
}

/** `Upgrade`'s constructor options;  every one has a default. */
export type UpgradeProps = {
  /** the `spell` running now;  default `PluginInstall.mainKit()` */
  kit?: string
  /** where versions are installed;  default `<epic home>/versions` */
  versions?: string
  /** npm's dist-tag;  default `next` */
  tag?: string
  /** runs npm;  default the real one (`Processes.run()`), a test hands in a stand-in */
  npm?: (args: string[]) => NpmRun
  /** the plugin install for a folder;  default `new PluginInstall({ kit })`, a test hands in one on scratch folders */
  installer?: (kit: string) => { install(options: { dryRun?: boolean }): PluginInstallReport }
  /** prints a progress line;  default `CLI.out()` */
  say?: (line: string) => void
}

/** What an npm run gave back:  `spawnSync()`'s parts this reads. */
export type NpmRun = { status: number | null; stdout: string; stderr: string }

/** What `upgrade()` did, or would do. */
export type UpgradeReport = {
  /**
   * - `checkout`:  Spell's own checkout, nothing done
   * - `up to date`:  the newest, in our own folder
   * - `moved`:  the newest, moved off npm's download cache into our own folder
   * - `upgraded`:  a newer version installed and linked
   */
  state: "checkout" | "up to date" | "moved" | "upgraded"
  /** the version running now */
  current: string
  /** the newest on npm's tag;  none for a checkout */
  newest?: string
  /** npm's dist-tag followed:  `next` */
  tag: string
  /** the folder running now */
  from: string
  /** the new copy's folder:  `<versions>/<version>/node_modules/spell` */
  folder?: string
  /** whether npm had to download it (it wasn't in our folder yet) */
  download?: boolean
  /** each change the plugin install made, or would */
  changes: string[]
  /** nothing was written */
  dryRun: boolean
}

/** `path` as people read it:  `~/...` inside the home folder. */
function shortPath(path: string): string {
  const home = homedir()
  return path.startsWith(home + "/") ? "~" + path.slice(home.length) : path
}

/** The npm package it follows. */
const PACKAGE = "spell"

/** A version npm prints:  `0.8.13`, `0.9.0-next.2`. */
const VERSION = /^\d+\.\d+\.\d+[\w.+-]*$/
