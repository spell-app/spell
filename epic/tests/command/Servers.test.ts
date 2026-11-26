import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { fakeMainCheckout } from "spell/server/test/checkouts"
import { Servers, withoutRepo } from "spell/epic/command/Servers"

describe("epic servers:  another name for spell server (epic `epic-engine` P85)", () => {
  let folder: string
  let spellBin: string
  let main: string

  beforeEach(() => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "epic-servers-")))
    main = fakeMainCheckout(join(folder, "spell"))
    writeFileSync(
      join(folder, "repos.json5"),
      JSON.stringify({ default: "spell", repos: [{ name: "spell", checkout: main }] })
    )
    // a stand-in `spell`:  writes what it was handed and where, and exits 3
    spellBin = join(folder, "spell.mjs")
    writeFileSync(
      spellBin,
      `import { writeFileSync } from "node:fs"\n` +
        `writeFileSync(${JSON.stringify(join(folder, "ran.json"))}, ` +
        `JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }))\n` +
        `process.exit(3)\n`
    )
  })

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  /** what the stand-in was handed */
  const ran = () => JSON.parse(readFileSync(join(folder, "ran.json"), "utf8")) as { args: string[]; cwd: string }

  it("passes its words on to spell server, in the repo's main checkout, its exit code unchanged", async () => {
    const servers = new Servers({ home: folder, spellBin })
    expect(await servers.run(["restart", "editor", "--repo", "spell"], tmpdir())).toBe(3)
    expect(ran()).toEqual({ args: ["server", "restart", "editor"], cwd: main })
    expect(await servers.run(["status"], tmpdir())).toBe(3)
    expect(ran().args).toEqual(["server", "status"])
  })

  it("refuses a verb spell server's keeper verbs don't have, and a repo the hub doesn't serve", async () => {
    const servers = new Servers({ home: folder, spellBin })
    await expect(servers.run(["kill", "editor"])).rejects.toThrow(/start, stop, restart or status/)
    await expect(servers.run(["stop", "--repo", "nope"])).rejects.toThrow(/no repo named nope:  spell/)
  })

  it("withoutRepo():  --repo taken out, both spellings", () => {
    expect(withoutRepo(["start", "--repo", "spell", "editor"])).toEqual({ repo: "spell", rest: ["start", "editor"] })
    expect(withoutRepo(["start", "--repo=app"])).toEqual({ repo: "app", rest: ["start"] })
    expect(withoutRepo(["status"])).toEqual({ rest: ["status"] })
  })
})
