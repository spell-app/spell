/**
 * `PeopleColors`:  the colour each person picked, one file each in the epic folder's `people/` (epic `epic-friend`
 * P13), and `EpicConfig.colors` reading them in, the config's own winning.
 */
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { DataFile } from "spell/server/DataFile"
import { fakeMainCheckout } from "spell/server/test/checkouts"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { PeopleColors } from "spell/epic/config/PeopleColors"

const TOP = realpathSync(mkdtempSync(join(tmpdir(), "people-colors-")))
afterAll(() => rmSync(TOP, { recursive: true, force: true }))

describe("PeopleColors", () => {
  test("write() keeps a file per person, by the name's slug;  read() gives them back by name", () => {
    const content = join(TOP, "plans")
    expect(PeopleColors.read(content)).toEqual({})
    expect(PeopleColors.write(content, "Ana Lima", "green")).toBe(join(content, "people", "ana-lima.json5"))
    PeopleColors.write(content, "Bo", "#3b7dd8")
    expect(DataFile.read(join(content, "people", "ana-lima.json5"))).toEqual({ name: "Ana Lima", color: "green" })
    expect(PeopleColors.read(content)).toEqual({ "Ana Lima": "green", Bo: "#3b7dd8" })
  })

  test("read():  a file that won't parse, or names no colour, is nobody's", () => {
    const content = join(TOP, "messy")
    mkdirSync(join(content, "people"), { recursive: true })
    writeFileSync(join(content, "people", "cy.json5"), "{ name: ")
    writeFileSync(join(content, "people", "di.json5"), '{ name: "Di", color: "red; } x" }')
    writeFileSync(join(content, "people", "ed.json5"), '{ name: "Ed", color: "teal" }')
    expect(PeopleColors.read(content)).toEqual({ Ed: "teal" })
  })

  test("slugOf():  lower case, a run of anything else one -;  nothing left is someone", () => {
    expect(["Ana Lima", "José", "  Bo!! ", "!!"].map((name) => PeopleColors.slugOf(name))).toEqual([
      "ana-lima",
      "josé",
      "bo",
      "someone"
    ])
  })

  test("rename():  the file moved and the name in it changed;  a dry run changes nothing;  no file, nothing", () => {
    const content = join(TOP, "renamed")
    PeopleColors.write(content, "Ana", "green")
    const [old, now] = [join(content, "people", "ana.json5"), join(content, "people", "ana-lima.json5")]
    expect(PeopleColors.rename(content, "Ana", "Ana Lima", { dryRun: true })).toEqual([old, now])
    expect(existsSync(old)).toBe(true)
    expect(PeopleColors.rename(content, "Ana", "Ana Lima")).toEqual([old, now])
    expect(existsSync(old)).toBe(false)
    expect(PeopleColors.read(content)).toEqual({ "Ana Lima": "green" })
    // the same file name:  the name inside changed, nothing moved
    expect(PeopleColors.rename(content, "Ana Lima", "ana lima")).toEqual([now, now])
    expect(PeopleColors.read(content)).toEqual({ "ana lima": "green" })
    expect(PeopleColors.rename(content, "Nobody", "Somebody")).toBeUndefined()
  })
})

describe("EpicConfig.colors", () => {
  test("the config's own, then each person's pick from people/;  a name the config gives keeps the config's", () => {
    const main = fakeMainCheckout(join(TOP, "app"))
    mkdirSync(join(main, ".epic"), { recursive: true })
    writeFileSync(
      join(main, EpicConfig.FILE),
      '{ "contentFolder": "../app.epics", "colors": { "people": { "ana": "#2f9e6e" }, "agents": { "codex": "teal" } } }'
    )
    const content = join(TOP, "app.epics")
    PeopleColors.write(content, "Ana", "green")
    PeopleColors.write(content, "Bo", "blue")
    expect(new EpicConfig(main).colors).toEqual({
      people: { ana: "#2f9e6e", Bo: "blue" },
      agents: { codex: "teal" }
    })
  })
})
