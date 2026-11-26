import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { PageServer, orgSpacesOf } from "spell/server/page"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

describe("the worktrees main's page server reaches by name, an org repo's too (epic `editor` P49, Q101)", () => {
  let folder: string
  let kit: string
  let org: string
  const before = process.env[SRV.PORTS_FILE_VARIABLE]

  beforeEach(() => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "named-worktrees-")))
    kit = fakeMainCheckout(join(folder, "spell"))
    fakeWorktree(kit, join(folder, "spell.worktrees", "editor"))
    // an org's repo:  its projects under `@acme/` at its top;  one worktree with them, one without
    org = fakeMainCheckout(join(folder, "org-spell"))
    const dashboard = fakeWorktree(org, join(folder, "org-spell.worktrees", "dashboard"))
    mkdirSync(join(dashboard, "@acme", "home"), { recursive: true })
    fakeWorktree(org, join(folder, "org-spell.worktrees", "notes"))
    process.env[SRV.PORTS_FILE_VARIABLE] = join(folder, "ports.json")
  })

  afterEach(() => {
    if (before === undefined) delete process.env[SRV.PORTS_FILE_VARIABLE]
    else process.env[SRV.PORTS_FILE_VARIABLE] = before
    rmSync(folder, { recursive: true, force: true })
  })

  it("Spell's own, then each org repo's that holds an org's projects, its page server's records the kit's", () => {
    expect(PageServer.namedWorktrees(kit, { orgRepos: [org] })).toEqual([
      { worktree: "editor", checkout: join(folder, "spell.worktrees", "editor") },
      {
        worktree: "dashboard",
        checkout: join(folder, "org-spell.worktrees", "dashboard"),
        records: kit,
        spaces: join(folder, "org-spell.worktrees", "dashboard")
      }
    ])
  })

  it("orgSpacesOf():  the checkout holding @acme/, else its spaces/ holding it, else none", () => {
    const other = join(folder, "other")
    mkdirSync(join(other, "spaces", "@acme"), { recursive: true })
    expect(orgSpacesOf(other)).toBe(join(other, "spaces"))
    expect(orgSpacesOf(join(folder, "org-spell.worktrees", "notes"))).toBeUndefined()
  })

  it("an org worktree's page server gets ports of its own in the book, the same each start;  its main checkout:  none", async () => {
    const dashboard = join(folder, "org-spell.worktrees", "dashboard")
    const booked = await PageServer.bookedPorts(kit, 4747, dashboard)
    expect(booked).toEqual({ port: expect.any(Number), editor: expect.any(Number) })
    expect(await PageServer.bookedPorts(kit, 4747, dashboard)).toEqual(booked)
    expect(new SRV.PortBook().portsOf(dashboard)).toEqual({ "page server": booked!.port, editor: booked!.editor })
    mkdirSync(join(org, "@acme"), { recursive: true })
    expect(await PageServer.bookedPorts(kit, 4747, org)).toBeUndefined()
  })

  it("HostRoutes reads an org worktree's port from the kit's record for its spaces", () => {
    const dashboard = join(folder, "org-spell.worktrees", "dashboard")
    const record = SRV.PidFile.forPageServer(kit, dashboard)
    writeFileSync(record.file, JSON.stringify({ pid: 1, port: 51234, root: kit, started: "", spaces: dashboard }))
    const names = new SRV.HostRoutes({
      worktrees: () => [{ worktree: "dashboard", checkout: dashboard, records: kit, spaces: dashboard }],
      start: async () => {},
      book: new SRV.PortBook(join(folder, "empty-book.json"))
    })
    expect(names.checkoutNamed("dashboard")).toMatchObject({ spaces: dashboard })
    expect(names.portOf(names.checkoutNamed("dashboard")!, false)).toBe(51234)
  })
})
