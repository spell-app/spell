import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { fakeMainCheckout } from "spell/server/test/checkouts"
import { KeeperList } from "spell/server/keeper"
import { HUB_NAME, SpellKeeper } from "spell/epic/server/SpellKeeper"
import type { Repo } from "spell/epic/server/server.types"

describe("SpellKeeper:  the hub hands its repos to Spell's server keeper (epic `epic-engine` P85)", () => {
  let folder: string
  let list: KeeperList
  let kit: Repo
  let work: Repo

  beforeEach(() => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "spell-keeper-")))
    list = new KeeperList({ home: join(folder, "keeper") })
    kit = repo("spell", { isDefault: true })
    work = repo("work")
    // a work project's proxy server, in its epic settings
    mkdirSync(join(work.checkout, ".epic"), { recursive: true })
    writeFileSync(
      join(work.checkout, ".epic", "config.json5"),
      JSON.stringify({ servers: [{ name: "proxy", check: "8080", start: "make proxy", what: "the API proxy" }] })
    )
  })

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  /** a main checkout named `name` */
  const repo = (name: string, more: Partial<Repo> = {}): Repo => {
    const checkout = fakeMainCheckout(join(folder, name))
    return { name, checkout, content: join(folder, `${name}.epics`), prefix: `/r/${name}/`, isDefault: false, ...more }
  }

  it("register():  each repo a checkout, each repo's own server, and the hub as the default repo's", () => {
    const keeper = new SpellKeeper({ list })
    expect(keeper.register([kit, work], { hub: 4848 })).toBe(4)
    expect(list.checkouts).toEqual([
      { name: "spell", checkout: kit.checkout },
      { name: "work", checkout: work.checkout }
    ])
    expect(list.serversOf(work.checkout)).toEqual([
      expect.objectContaining({ name: "proxy", check: "8080", start: "make proxy", checkout: work.checkout })
    ])
    expect(list.serversOf(kit.checkout)).toEqual([
      expect.objectContaining({ name: HUB_NAME, check: "http://127.0.0.1:4848/api/server" })
    ])
    expect(list.serversOf(kit.checkout)[0]?.start).toMatch(/hub ensure$/)
  })

  it("register():  a checkout that's gone is left out", () => {
    const gone = { ...work, name: "gone", checkout: join(folder, "gone") }
    expect(new SpellKeeper({ list }).register([gone])).toBe(0)
    expect(list.exists).toBe(false)
  })

  it("register() again:  nothing new, nothing changed;  a changed server is written over", () => {
    const keeper = new SpellKeeper({ list })
    keeper.register([kit, work])
    expect(keeper.register([kit, work])).toBe(0)
    writeFileSync(
      join(work.checkout, ".epic", "config.json5"),
      JSON.stringify({ servers: [{ name: "proxy", check: "9090" }] })
    )
    expect(keeper.register([kit, work])).toBe(1)
    expect(list.serversOf(work.checkout).map((server) => server.check)).toEqual(["9090"])
  })

  it("settingsStamp():  the newest change of the repos' epic settings;  none:  0", () => {
    expect(SpellKeeper.settingsStamp([kit])).toBe(0)
    expect(SpellKeeper.settingsStamp([kit, work])).toBeGreaterThan(0)
  })
})
