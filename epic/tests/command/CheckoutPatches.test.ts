import { execFileSync } from "child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { CheckoutPatches } from "spell-epic/command/CheckoutPatches"
import { EpicConfig } from "spell-epic/config/EpicConfig"

/**
 * Throwaway repos:  a main checkout on `main`, with `.ignore` and a config listing patches, and a worktree `old` on a
 * branch cut BEFORE either was committed:  a worktree behind `main`.
 */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "checkout-patches-")))
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

/** The patches the main checkout's config lists:  `.ignore` copied, and a command that counts its runs. */
const PATCHES = [
  { id: "vscode-ignore", date: "2026-10-22", why: "Open File sees the child repos", copy: ".ignore" },
  { id: "count-runs", date: "2026-10-22", why: "a command run once", run: "echo ran >> runs.txt" }
]

describe("CheckoutPatches", () => {
  test("a worktree behind main gets main's file, git-excluded, and the command run once", () => {
    const { main, old } = makeRepo("behind")
    const [report] = new CheckoutPatches().patchAll([old])
    expect(report!.failed).toEqual([])
    expect(report!.applied).toEqual([
      { id: "vscode-ignore", did: ["copied .ignore from main"] },
      { id: "count-runs", did: ["ran echo ran >> runs.txt"] }
    ])
    expect(read(old, ".ignore")).toBe("!/spell-*/\n")
    expect(read(main, ".git/info/exclude")).toContain("\n/.ignore\n")
    // runs.txt is the command's own output:  everything else is clean
    expect(git(old, "status", "--porcelain")).toBe("?? runs.txt")

    // again:  nothing left, the command not run twice
    const again = new CheckoutPatches().patch(old)
    expect(again).toEqual({ checkout: old, applied: [], failed: [] })
    expect(read(old, "runs.txt")).toBe("ran\n")
    expect(CheckoutPatches.lines([again], TEMP)).toEqual(["behind/old:  nothing left"])
  })

  test("a copy that drifted from main's is copied again;  the main checkout is never copied into", () => {
    const { main, old } = makeRepo("drift")
    new CheckoutPatches().patch(old)
    writeFileSync(join(old, ".ignore"), "changed by hand\n")
    expect(new CheckoutPatches().patch(old).applied).toEqual([
      { id: "vscode-ignore", did: ["copied .ignore from main"] }
    ])
    expect(read(old, ".ignore")).toBe("!/spell-*/\n")
    expect(new CheckoutPatches().patch(main).applied).toEqual([{ id: "count-runs", did: ["ran echo ran >> runs.txt"] }])
  })

  test("a checkout that tracks the file has the patch already:  it retires by itself", () => {
    const { main, old } = makeRepo("merged")
    git(old, "merge", "--quiet", "main")
    expect(new CheckoutPatches().patch(old).applied).toEqual([{ id: "count-runs", did: ["ran echo ran >> runs.txt"] }])
    expect(read(main, ".git/info/exclude")).not.toContain("/.ignore")
  })

  test("--dry-run says what it would do, and does nothing", () => {
    const { old } = makeRepo("dry")
    const report = new CheckoutPatches({ dryRun: true }).patch(old)
    expect(report.applied).toEqual([
      { id: "vscode-ignore", did: ["would copy .ignore"] },
      { id: "count-runs", did: ["would run echo ran >> runs.txt"] }
    ])
    expect(existsSync(join(old, ".ignore"))).toBe(false)
    expect(existsSync(join(old, "runs.txt"))).toBe(false)
  })

  test("a new worktree made from main only remembers the commands as had (`markApplied()`)", () => {
    const { old } = makeRepo("fresh")
    CheckoutPatches.markApplied(old)
    expect(new CheckoutPatches().patch(old).applied).toEqual([
      { id: "vscode-ignore", did: ["copied .ignore from main"] }
    ])
    expect(existsSync(join(old, "runs.txt"))).toBe(false)
  })

  test("a failing patch is reported, and the next one still goes", () => {
    const { main, old } = makeRepo("failing")
    git(main, "rm", "--quiet", ".ignore")
    git(main, "commit", "--quiet", "-m", "no .ignore")
    const report = new CheckoutPatches().patch(old)
    expect(report.failed).toEqual([{ id: "vscode-ignore", error: "main has no .ignore to copy" }])
    expect(report.applied).toEqual([{ id: "count-runs", did: ["ran echo ran >> runs.txt"] }])
    expect(CheckoutPatches.lines([report], TEMP)).toContain(
      "failing/old:  vscode-ignore:  FAILED:  main has no .ignore to copy"
    )
  })

  test("`allCheckouts()`:  the main checkout and every worktree", () => {
    const { main, old } = makeRepo("all")
    expect(CheckoutPatches.allCheckouts(old)).toEqual([main, old])
    expect(CheckoutPatches.checkoutsAt(join(old, "src"))).toEqual([old])
  })

  test("the config's checkoutPatches are checked", () => {
    const bad = (patches: unknown) => () => EpicConfig.settingsFrom(JSON.stringify({ checkoutPatches: patches }))
    expect(EpicConfig.settingsFrom("{}").checkoutPatches).toEqual([])
    expect(bad([{ id: "x", date: "d", why: "w" }])).toThrow(/needs a "copy" or a "run"/)
    expect(bad([{ id: "x", date: "d", why: "w", copy: "../out" }])).toThrow(/a file from the repo's root/)
    expect(bad([PATCHES[0], PATCHES[0]])).toThrow(/two patches are "vscode-ignore"/)
    expect(bad([{ id: "x", copy: ".ignore" }])).toThrow(/needs a "date" and a "why"/)
  })
})

/**
 * Repo `name`:  its main checkout with `src/a.txt`, then worktree `old` on branch `old`, cut there;  then `.ignore` and
 * the config (`PATCHES`) committed on `main`.
 */
function makeRepo(name: string): { main: string; old: string } {
  const main = join(TEMP, name, "main")
  const old = join(TEMP, name, "old")
  mkdirSync(join(main, "src"), { recursive: true })
  git(main, "init", "--quiet", "-b", "main")
  git(main, "config", "user.email", "test@example.com")
  git(main, "config", "user.name", "Test")
  writeFileSync(join(main, "src/a.txt"), "A\n")
  git(main, "add", ".")
  git(main, "commit", "--quiet", "-m", "first")
  git(main, "worktree", "add", "--quiet", "-b", "old", old)
  mkdirSync(join(main, ".epic"))
  writeFileSync(join(main, ".epic/config.json5"), JSON.stringify({ checkoutPatches: PATCHES }, null, 2))
  writeFileSync(join(main, ".ignore"), "!/spell-*/\n")
  git(main, "add", ".")
  git(main, "commit", "--quiet", "-m", "patches")
  return { main, old }
}

/** `git -C dir ...args`, trimmed. */
function git(dir: string, ...args: string[]): string {
  return execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim()
}

/** The text of `file` in `dir`. */
function read(dir: string, file: string): string {
  return readFileSync(join(dir, file), "utf8")
}
