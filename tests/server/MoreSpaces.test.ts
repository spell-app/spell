import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"

/** The more spaces file (`SRV.switchSpaces()`):  a made-up org, `@acme`, in temp folders. */
const temp = realpathSync(mkdtempSync(join(tmpdir(), "more-spaces-")))
afterAll(() => rmSync(temp, { recursive: true, force: true }))

/** a spaces folder holding `orgs` (each an org's folder), made */
function spaces(name: string, ...orgs: string[]): string {
  const dir = join(temp, name, "spaces")
  for (const org of orgs) mkdirSync(join(dir, `@${org}`, "tools"), { recursive: true })
  mkdirSync(dir, { recursive: true })
  return dir
}

const main = spaces("acme-app", "acme")
const fix = spaces("acme-app.worktrees/fix", "acme")
const both = spaces("both", "acme", "beta")
const beta = spaces("beta-app", "beta")

describe("SRV.switchSpaces():  one spaces folder per org", () => {
  test("a folder in place of the one serving its orgs;  the file says what it is, comments and all", () => {
    const file = join(temp, "one.json5")
    expect(SRV.switchSpaces(main, { file })).toEqual(["acme"])
    expect(SRV.switchSpaces(beta, { file })).toEqual(["beta"])
    expect(SRV.switchSpaces(fix, { file })).toEqual(["acme"])
    expect(SRV.moreSpacesInFile(file)).toEqual([beta, fix])
    expect(readFileSync(file, "utf8")).toMatch(/^\/\/ More spaces folders/)
    expect(SRV.servedSpaces(SRV.moreSpacesInFile(file))).toEqual([
      { dir: beta, orgs: ["beta"] },
      { dir: fix, orgs: ["acme"] }
    ])
  })

  test("`org`:  that org alone, the folder that served it keeping its others", () => {
    const file = join(temp, "two.json5")
    SRV.switchSpaces(both, { file })
    expect(SRV.switchSpaces(fix, { file, org: "@acme" })).toEqual(["acme"])
    expect(SRV.moreSpacesInFile(file)).toEqual([{ folder: both, orgs: ["beta"] }, { folder: fix, orgs: ["acme"] }])
    expect(SRV.servedSpaces(SRV.moreSpacesInFile(file))).toEqual([
      { dir: both, orgs: ["beta"] },
      { dir: fix, orgs: ["acme"] }
    ])
  })

  test("refused:  a folder that isn't there, holds no org's folder, or not the org asked for;  @spell isn't one", () => {
    const file = join(temp, "three.json5")
    expect(() => SRV.switchSpaces(join(temp, "nowhere"), { file })).toThrow(TypeError)
    expect(() => SRV.switchSpaces(spaces("empty"), { file })).toThrow(/no org's folder/)
    expect(() => SRV.switchSpaces(spaces("own", "spell"), { file })).toThrow(/no org's folder/)
    expect(() => SRV.switchSpaces(main, { file, org: "beta" })).toThrow(/no @beta\//)
  })

  test("the file:  a `~` is home;  a folder written by hand that won't read is none", () => {
    expect(SRV.homeExpanded("~/x")).toMatch(/\/x$/)
    const file = join(temp, "broken.json5")
    writeFileSync(file, "{ spaces: ")
    const error = console.error
    console.error = () => {}
    try {
      expect(SRV.moreSpacesInFile(file)).toEqual([])
    } finally {
      console.error = error
    }
  })
})
