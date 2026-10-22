import { execFileSync } from "node:child_process"
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { Git } from "spell-epic/command/Git"
import { RepoInit } from "spell-epic/command/RepoInit"
import { EpicConfig } from "spell-epic/config/EpicConfig"

/** A throwaway repo `try` on branch `trunk`:  a README, nothing set up for epics yet. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "repo-init-")))
const MAIN = join(TEMP, "try")
const CONTENT = join(TEMP, "try.epics")
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

mkdirSync(MAIN)
git(MAIN, "init", "-q", "-b", "trunk")
writeFileSync(join(MAIN, "README.md"), "# try\n")
git(MAIN, "add", "-A")
git(MAIN, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "first")

describe("epic init", () => {
  test("--dry-run:  says what it would do, and writes nothing", () => {
    const report = new RepoInit({ main: MAIN }).init({ dryRun: true })
    expect(report.config.action).toBe("written")
    expect(report.content).toEqual({ folder: CONTENT, action: "created", made: ["epics", "sagas", "guides", "pages"] })
    expect(report.links.map((link) => link.action)).toEqual(Array(4).fill("would link (missing)"))
    expect(existsSync(join(MAIN, EpicConfig.FILE))).toBe(false)
    expect(existsSync(CONTENT)).toBe(false)
    expect(existsSync(join(MAIN, ".gitignore"))).toBe(false)
    expect(RepoInit.lines(report).at(-1)).toBe("dry run:  nothing changed")
  })

  test("the config for THIS repo:  beside it, its branch, no install command, its name", () => {
    new RepoInit({ main: MAIN }).init()
    const config = new EpicConfig(MAIN)
    expect(config.contentFolder).toBe(CONTENT)
    expect(config.worktreesFolder).toBe(join(TEMP, "try.worktrees"))
    expect(config.baseBranch).toBe("trunk")
    expect(config.installCommand).toBe("")
    expect(config.installOnCreate).toBe(false)
    expect(config.windows).toEqual({ default: "try", repoName: "try", contentName: "try.epics", worktreeOnly: true })
    expect(config.linkSessionFolders).toBe(true)
    expect(config.sharedFolders).toEqual(["epics", "sagas", "guides", "pages"])
    // the window files in the content repo (epic-eject P13)
    expect(config.newWindowsFolder).toBe(join(CONTENT, "windows"))
    // every key, each with its comment
    const text = readFileSync(config.file, "utf8")
    expect(text).toMatch(/\/\/ the branch worktrees start from and merge into\n {2}"baseBranch": "trunk",/)
  })

  test("the content repo, its own git repo with a kept folder each, linked in and ignored", () => {
    expect(Git.run(["log", "--format=%s"], CONTENT).out).toBe("Shared content:  empty")
    for (const folder of ["epics", "sagas", "guides", "pages"]) {
      expect(existsSync(join(CONTENT, folder, ".gitkeep"))).toBe(true)
      expect(lstatSync(join(MAIN, folder)).isSymbolicLink()).toBe(true)
      expect(realpathSync(join(MAIN, folder))).toBe(join(CONTENT, folder))
    }
    expect(readFileSync(join(MAIN, ".gitignore"), "utf8")).toMatch(
      /^# shared:start .*\n\/epics\n\/sagas\n\/guides\n\/pages\n# shared:end\n$/
    )
    // the window files:  in the content repo, ignored there (epic-eject P13)
    expect(readFileSync(join(CONTENT, ".gitignore"), "utf8")).toMatch(/^\/windows\/$/m)
    // nothing but the two files to commit:  the links are ignored
    expect(Git.run(["status", "--porcelain"], MAIN).out.split("\n").sort()).toEqual(["?? .epic/", "?? .gitignore"])
    expect(readFileSync(join(CONTENT, "README.md"), "utf8")).not.toMatch(/spell-app/)
  })

  test("run again:  every step is done, nothing changes;  a repo's own .gitignore lines are kept", () => {
    const ignore = join(MAIN, ".gitignore")
    writeFileSync(ignore, `node_modules/\n\n${readFileSync(ignore, "utf8")}`)
    const before = readFileSync(join(MAIN, EpicConfig.FILE), "utf8")
    const report = new RepoInit({ main: MAIN }).init()
    expect(report.config.action).toBe("kept")
    expect(report.content.action).toBe("exists")
    expect(report.links.map((link) => link.action)).toEqual(Array(4).fill("ok"))
    expect(report.gitignore.action).toBe("ok")
    expect(readFileSync(join(MAIN, EpicConfig.FILE), "utf8")).toBe(before)
    expect(readFileSync(ignore, "utf8")).toMatch(/^node_modules\/\n\n# shared:start/)
    expect(RepoInit.lines(report).at(-1)).toBe("set up already")
  })

  test("a content folder missing one of its folders:  added, and linked", () => {
    rmSync(join(CONTENT, "guides"), { recursive: true })
    const report = new RepoInit({ main: MAIN }).init()
    expect(report.content).toEqual({ folder: CONTENT, action: "added", made: ["guides"] })
    expect(existsSync(join(MAIN, "guides"))).toBe(true)
  })

  test("a repo set up this way is a checkout the epic verbs work on, from any folder in it", () => {
    mkdirSync(join(MAIN, "src"), { recursive: true })
    expect(Git.isEpicCheckout(MAIN)).toBe(true)
    expect(Git.nearestCheckout({ from: join(MAIN, "src") })).toBe(MAIN)
    expect(Git.isEpicCheckout(TEMP)).toBe(false)
  })
})

describe("RepoInit's statics", () => {
  test("the install command, from the lock file;  none without one", () => {
    const dir = join(TEMP, "locks")
    mkdirSync(dir)
    expect(RepoInit.installCommandOf(dir)).toBe("")
    writeFileSync(join(dir, "package.json"), "{}")
    expect(RepoInit.installCommandOf(dir)).toBe("npm install")
    writeFileSync(join(dir, "pnpm-lock.yaml"), "")
    expect(RepoInit.installCommandOf(dir)).toBe("pnpm install")
    writeFileSync(join(dir, "yarn.lock"), "")
    expect(RepoInit.installCommandOf(dir)).toBe("yarn install")
    expect(RepoInit.settingsFor(dir).installOnCreate).toBe(true)
  })

  test("the config's text reads back as the settings it was written from", () => {
    const settings = RepoInit.settingsFor(MAIN)
    expect(EpicConfig.settingsFrom(RepoInit.configText(settings))).toEqual(settings)
  })

  test("the .gitignore block:  added after what's there, replaced when its lines change", () => {
    expect(RepoInit.withIgnoreBlock("", ["/epics"], "../x.epics")).toMatch(
      /^# shared:start .*\n\/epics\n# shared:end\n$/
    )
    const once = RepoInit.withIgnoreBlock("dist/", ["/epics"], "../x.epics")
    expect(once).toMatch(/^dist\/\n\n# shared:start/)
    const twice = RepoInit.withIgnoreBlock(once, ["/epics", "/sagas"], "../x.epics")
    expect(twice).toMatch(/^dist\/\n\n# shared:start .*\n\/epics\n\/sagas\n# shared:end\n$/)
    expect(RepoInit.withIgnoreBlock(twice, ["/epics", "/sagas"], "../x.epics")).toBe(twice)
  })

  test("the .gitignore block:  nothing to ignore and no block yet adds none (a repo that links nothing in)", () => {
    expect(RepoInit.withIgnoreBlock("dist/\n", [], "../x.epics")).toBe("dist/\n")
  })
})

/** `git <args>` in `cwd`. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" })
}
