import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

describe("CheckoutUse:  a worktree marked in use, so the keeper never stops its servers as unused (epic `epic-engine` I459)", () => {
  let folder: string
  let main: string
  let worktree: string

  beforeEach(() => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "checkout-use-")))
    vi.stubEnv(SRV.KEEPER_HOME_VARIABLE, join(folder, "home"))
    main = fakeMainCheckout(join(folder, "kit"))
    worktree = fakeWorktree(main, join(folder, "worktrees", "seo"))
    mkdirSync(join(worktree, "epic"), { recursive: true })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    rmSync(folder, { recursive: true, force: true })
  })

  it("a mark from a folder inside the worktree names its root, until it's undone", () => {
    const done = SRV.CheckoutUse.hold(join(worktree, "epic"), "epic turns:  yarn test")
    expect(SRV.CheckoutUse.isInUse(worktree)).toBe(true)
    expect(SRV.CheckoutUse.isInUse(main)).toBe(false)
    expect(SRV.CheckoutUse.marks()).toMatchObject([
      { checkout: worktree, why: "epic turns:  yarn test", pid: process.pid }
    ])
    done()
    expect(SRV.CheckoutUse.isInUse(worktree)).toBe(false)
    expect(readdirSync(SRV.CheckoutUse.folder())).toEqual([])
  })

  it("a mark whose process is gone, or whose beat is stale, doesn't count", () => {
    mkdirSync(SRV.CheckoutUse.folder(), { recursive: true })
    const seen = new Date().toISOString()
    writeFileSync(
      join(SRV.CheckoutUse.folder(), "1.json"),
      JSON.stringify({ checkout: worktree, why: "x", pid: 999_999_9, seen })
    )
    const old = new Date(Date.now() - 10 * 60_000).toISOString()
    writeFileSync(
      join(SRV.CheckoutUse.folder(), "2.json"),
      JSON.stringify({ checkout: worktree, why: "x", pid: process.pid, seen: old })
    )
    expect(SRV.CheckoutUse.isInUse(worktree)).toBe(false)
  })

  it("a path in no checkout marks nothing", () => {
    const outside = join(folder, "plain")
    mkdirSync(outside)
    SRV.CheckoutUse.hold(outside, "x")()
    expect(existsSync(SRV.CheckoutUse.folder())).toBe(false)
  })
})
