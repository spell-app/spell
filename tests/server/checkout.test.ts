import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

/** A main checkout with a worktree in it, and one beside it. */
const TOP = mkdtempSync(join(tmpdir(), "srv-checkout-"))
const MAIN = fakeMainCheckout(join(TOP, "repo"))
const INSIDE = fakeWorktree(MAIN, join(MAIN, ".claude", "worktrees", "seo"))
const BESIDE = fakeWorktree(MAIN, join(TOP, "repo.worktrees", "vite"))
afterAll(() => rmSync(TOP, { recursive: true, force: true }))

describe("SRV.checkoutOf()", () => {
  test("the main checkout is its own main, from any folder in it, there or not", () => {
    expect(SRV.checkoutOf(MAIN)).toEqual({ root: MAIN, main: MAIN })
    expect(SRV.checkoutOf(join(MAIN, "packages", "ui", "not-there.ts"))).toEqual({ root: MAIN, main: MAIN })
  })

  test("a worktree's main is the checkout its git shares, WHEREVER its folder is", () => {
    expect(SRV.checkoutOf(join(INSIDE, "epics", "seo"))).toEqual({ root: INSIDE, main: MAIN, worktree: "seo" })
    expect(SRV.checkoutOf(BESIDE)).toEqual({ root: BESIDE, main: MAIN, worktree: "vite" })
  })

  test("a BROKEN worktree (its git folder gone) is still its main checkout's, saying so;  a stray `.git` file isn't", () => {
    // epic `epic-engine` P26, request r20:  solid-17's `.git` named `<main>/.git/worktrees/solid-17`, pruned
    const broken = fakeWorktree(MAIN, join(TOP, "repo.worktrees", "solid-17"))
    const gone = join(MAIN, ".git", "worktrees", "solid-17")
    rmSync(gone, { recursive: true })
    expect(SRV.checkoutOf(join(broken, "src"))).toEqual({
      root: broken,
      main: MAIN,
      worktree: "solid-17",
      missingGitDir: gone
    })
    // its main checkout gone too:  nothing to belong to, a checkout of its own
    const stray = join(TOP, "stray")
    mkdirSync(stray, { recursive: true })
    writeFileSync(join(stray, ".git"), `gitdir: ${join(TOP, "gone", ".git", "worktrees", "stray")}\n`)
    expect(SRV.checkoutOf(stray)).toEqual({ root: stray, main: stray })
  })

  test("a `.git` file with no common dir (a submodule's) is a checkout of its own;  outside git:  `undefined`", () => {
    const submodule = join(MAIN, "vendor", "lib")
    mkdirSync(join(MAIN, ".git", "modules", "lib"), { recursive: true })
    mkdirSync(submodule, { recursive: true })
    writeFileSync(join(submodule, ".git"), `gitdir: ${join(MAIN, ".git", "modules", "lib")}\n`)
    expect(SRV.checkoutOf(join(submodule, "a.js"))).toEqual({ root: submodule, main: submodule })
    expect(SRV.checkoutOf(join(TOP, "elsewhere"))).toBeUndefined()
  })
})
