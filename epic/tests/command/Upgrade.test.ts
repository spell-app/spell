/**
 * `Upgrade`:  `epic upgrade`, the epic plugin brought up to the newest `spell@next`.
 * - npm is a stand-in:  no network, no real install;  its "install" writes a `package.json` where npm would.
 * - the plugin install is a stand-in too, keeping which folder it was handed:  `PluginInstall` has its own test.
 * - every folder a scratch one:  NEVER the machine's `~/.claude`, `~/.local/bin` or epic home.
 */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, expect, test } from "vite-plus/test"

import { EpicCommandError } from "spell/epic/command/command.types"
import { Upgrade, type NpmRun } from "spell/epic/command/Upgrade"

const top = realpathSync(mkdtempSync(join(tmpdir(), "epic-upgrade-")))
const versions = join(top, "versions")

afterAll(() => rmSync(top, { recursive: true, force: true }))

/** A `spell` package's folder at `version`:  the published one (no marketplace file), or a checkout. */
function kitAt(folder: string, version: string, { checkout = false } = {}): string {
  mkdirSync(join(folder, ".claude-plugin"), { recursive: true })
  writeFileSync(join(folder, "package.json"), JSON.stringify({ name: "spell", version }))
  if (checkout) writeFileSync(join(folder, ".claude-plugin", "marketplace.json"), '{ "name": "spell" }')
  return folder
}

/** An upgrade of `kit`, npm saying `newest` is on `next`;  what npm and the plugin install were asked, and said. */
function upgrader(kit: string, newest: string, { viewFails = false, installFails = false } = {}) {
  const npmCalls: string[][] = []
  const installedFrom: string[] = []
  const said: string[] = []
  const npm = (args: string[]): NpmRun => {
    npmCalls.push(args)
    if (args[0] === "view")
      return viewFails
        ? { status: 1, stdout: "", stderr: "npm error code ENOTFOUND\nnpm error network" }
        : { status: 0, stdout: `${newest}\n`, stderr: "" }
    if (installFails) return { status: 1, stdout: "", stderr: "npm error code E404" }
    // `npm install --prefix <folder> spell@<version>`
    kitAt(join(args[2]!, "node_modules", "spell"), args[3]!.split("@")[1]!)
    return { status: 0, stdout: "", stderr: "" }
  }
  const installer = (folder: string) => ({
    install: ({ dryRun = false }: { dryRun?: boolean }) => {
      installedFrom.push(folder)
      return { plugin: "epic@spell", version: "0.8.0", from: folder, dryRun, changes: [`cache:  links to ${folder}`] }
    }
  })
  const upgrade = new Upgrade({ kit, versions, npm, installer, say: (line) => void said.push(line) })
  return { upgrade, npmCalls, installedFrom, said }
}

test("a newer version:  installed into its own folder, the plugin pointed at it, /reload-plugins said", () => {
  const kit = kitAt(join(top, "npx-cache", "spell"), "0.8.12")
  const { upgrade, npmCalls, installedFrom, said } = upgrader(kit, "0.8.13")
  const report = upgrade.upgrade()
  const folder = join(versions, "0.8.13", "node_modules", "spell")
  expect(report).toMatchObject({ state: "upgraded", current: "0.8.12", newest: "0.8.13", folder, download: true })
  expect(npmCalls).toEqual([
    ["view", "spell@next", "version"],
    ["install", "--prefix", join(versions, "0.8.13"), "spell@0.8.13", "--no-audit", "--no-fund"]
  ])
  expect(installedFrom).toEqual([folder])
  expect(said).toEqual([`Downloading spell 0.8.13 into ${join(versions, "0.8.13")} ...`])
  const lines = Upgrade.lines(report)
  expect(lines[0]).toBe("Updated spell from 0.8.12 to 0.8.13, the newest.")
  expect(lines.at(-2)).toMatch(/type \/reload-plugins/)
})

test("the newest, already in our folder:  up to date, npm asked only for the version, nothing installed", () => {
  const kit = kitAt(join(versions, "0.8.13", "node_modules", "spell"), "0.8.13")
  const { upgrade, npmCalls, installedFrom } = upgrader(kit, "0.8.13")
  const report = upgrade.upgrade()
  expect(report.state).toBe("up to date")
  expect(npmCalls).toEqual([["view", "spell@next", "version"]])
  expect(installedFrom).toEqual([])
  expect(Upgrade.lines(report)).toEqual(["epic is up to date:  spell 0.8.13 is the newest on npm (next)."])
})

test("the newest, run from npx's cache:  moved into our folder, which has it already, so no download", () => {
  const kit = kitAt(join(top, "npx-cache-2", "spell"), "0.8.13")
  const { upgrade, npmCalls, installedFrom } = upgrader(kit, "0.8.13")
  const report = upgrade.upgrade()
  expect(report).toMatchObject({ state: "moved", download: false })
  expect(npmCalls).toHaveLength(1)
  expect(installedFrom).toEqual([join(versions, "0.8.13", "node_modules", "spell")])
  expect(Upgrade.lines(report)[1]).toMatch(/npm's download cache/)
})

test("--dry-run:  asks npm, installs nothing and changes nothing", () => {
  const kit = kitAt(join(top, "npx-cache-3", "spell"), "0.8.13")
  const { upgrade, npmCalls, installedFrom } = upgrader(kit, "0.9.0")
  const report = upgrade.upgrade({ dryRun: true })
  expect(report).toMatchObject({ state: "upgraded", dryRun: true, download: true, changes: [] })
  expect(npmCalls).toEqual([["view", "spell@next", "version"]])
  expect(installedFrom).toEqual([])
  expect(Upgrade.lines(report)).toEqual([
    "A newer spell is out:  0.9.0 (you have 0.8.13).",
    `Would download it into ${join(versions, "0.9.0")}.`,
    "Would then point Claude Code and the epic command at it.",
    "Nothing was changed (a dry run)."
  ])
})

test("Spell's own checkout:  says to git pull, never asks npm", () => {
  const kit = kitAt(join(top, "checkout"), "0.8.12", { checkout: true })
  const { upgrade, npmCalls, installedFrom } = upgrader(kit, "0.8.13")
  const report = upgrade.upgrade()
  expect(report.state).toBe("checkout")
  expect(npmCalls).toEqual([])
  expect(installedFrom).toEqual([])
  expect(Upgrade.lines(report).join("\n")).toMatch(/git pull on main, or epic worktree merge-main/)
})

test("npm can't be asked, or can't install:  an error saying so;  the plugin left alone", () => {
  const kit = kitAt(join(top, "npx-cache-4", "spell"), "0.8.12")
  const offline = upgrader(kit, "0.8.13", { viewFails: true })
  expect(() => offline.upgrade.upgrade()).toThrow(EpicCommandError)
  expect(() => offline.upgrade.upgrade()).toThrow(/couldn't ask npm.*ENOTFOUND/)
  const refused = upgrader(kit, "0.9.1", { installFails: true })
  expect(() => refused.upgrade.upgrade()).toThrow(/npm couldn't install spell 0.9.1[\s\S]*E404[\s\S]*still runs/)
  expect(refused.installedFrom).toEqual([])
})
