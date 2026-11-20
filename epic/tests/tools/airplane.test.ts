import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, it, vi } from "vite-plus/test"

import { preFlight } from "spell/epic/tools/airplane.ts"
import { HIGHLIGHT } from "spell/epic/tools/offline.ts"

// The made-up checkout is in a temporary folder, no kit:  `pageServerRoot()` would fall back to the kit this code runs
// from, whose page server may well be running (from-console I27).  Its own folder instead:  never a server there.
vi.mock("spell/server/page", async (importOriginal) => ({
  ...(await importOriginal<typeof import("spell/server/page")>()),
  pageServerRoot: (from: string) => from
}))

describe("epic airplane check:  preFlight()", () => {
  const root = mkdtempSync(join(tmpdir(), "airplane-check-"))
  const page = join(root, "guides", "page.html")
  mkdirSync(join(root, "guides"))
  mkdirSync(join(root, "epics", "demo"), { recursive: true })
  writeFileSync(page, `<script src="${HIGHLIGHT.cdn}"></script>\n`)
  writeFileSync(
    join(root, "epics", "demo", "demo.inbox.json"),
    JSON.stringify({ marks: { q1: {}, i2: {} }, now: [{}] })
  )

  afterAll(() => rmSync(root, { recursive: true, force: true }))

  /** the check called `name`, from `checks` */
  const named = (checks: Awaited<ReturnType<typeof preFlight>>, name: string) =>
    checks.find((check) => check.name === name)

  it("fails what isn't ready, and notes marks already waiting", async () => {
    const checks = await preFlight(root)
    expect(named(checks, "checkout")?.status).toBe("ok")
    expect(named(checks, "page server")?.status).toBe("fail")
    expect(named(checks, "offline pages")).toMatchObject({ status: "fail", detail: /1 remote loads/ })
    expect(named(checks, "waiting")).toMatchObject({ status: "note", detail: "3 marks in 1 epics, already waiting" })
  })

  it("fails a worktree:  the side bar uses the main checkout's page server", async () => {
    const worktree = join(root, ".claude", "worktrees", "x")
    mkdirSync(worktree, { recursive: true })
    expect(named(await preFlight(worktree), "checkout")?.status).toBe("fail")
  })
})
