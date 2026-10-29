import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { EpicHome } from "spell/epic/config/EpicHome"

/**
 * `EpicHome`, on a scratch home folder (`$SPELL_EPIC_HOME`) and a scratch git config of the person's own
 * (`$GIT_CONFIG_GLOBAL`):  no test reads or writes the machine's.
 */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "epic-home-")))
const HOME = join(TEMP, "home")
const GIT_CONFIG = join(TEMP, "gitconfig")
/** a folder in no git repo, so only the scratch config names anyone */
const NOWHERE = join(TEMP, "nowhere")
mkdirSync(NOWHERE)
const before = { ...process.env }
process.env.SPELL_EPIC_HOME = HOME
process.env.GIT_CONFIG_GLOBAL = GIT_CONFIG
process.env.GIT_CONFIG_NOSYSTEM = "1"
afterAll(() => {
  for (const key of ["SPELL_EPIC_HOME", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM"])
    if (before[key] === undefined) delete process.env[key]
    else process.env[key] = before[key]
  rmSync(TEMP, { recursive: true, force: true })
})

beforeEach(() => {
  rmSync(HOME, { recursive: true, force: true })
  writeFileSync(GIT_CONFIG, "")
})

describe("EpicHome", () => {
  test("folder():  $SPELL_EPIC_HOME, else ~/.spell-epic;  subfolder() inside it", () => {
    expect(EpicHome.folder()).toBe(HOME)
    expect(EpicHome.subfolder("asks")).toBe(join(HOME, "asks"))
    delete process.env.SPELL_EPIC_HOME
    try {
      expect(EpicHome.folder()).toBe(join(homedir(), ".spell-epic"))
    } finally {
      process.env.SPELL_EPIC_HOME = HOME
    }
  })

  test("person():  nobody kept, no git name:  none", () => {
    expect(EpicHome.person(NOWHERE)).toEqual({ name: undefined, source: "none" })
  })

  test("person():  nobody kept:  git's user.name", () => {
    writeFileSync(GIT_CONFIG, "[user]\n  name = Ana Lima\n")
    expect(EpicHome.person(NOWHERE)).toEqual({ name: "Ana Lima", source: "git" })
  })

  test("keepPerson():  kept in person.json5, over git's from then on", () => {
    writeFileSync(GIT_CONFIG, "[user]\n  name = Ana Lima\n")
    expect(EpicHome.keepPerson("  Ana ")).toEqual({ name: "Ana", source: "kept" })
    expect(EpicHome.person(NOWHERE)).toEqual({ name: "Ana", source: "kept" })
    expect(JSON.parse(readFileSync(join(HOME, "person.json5"), "utf8"))).toEqual({ name: "Ana" })
  })

  test("keepPerson():  a comment added by hand stays;  an empty name throws", () => {
    EpicHome.keepPerson("Ana")
    const file = EpicHome.personFile()
    writeFileSync(file, `// who I am\n${readFileSync(file, "utf8")}`)
    EpicHome.keepPerson("Bob")
    expect(readFileSync(file, "utf8")).toMatch(/^\/\/ who I am\n/)
    expect(EpicHome.person(NOWHERE).name).toBe("Bob")
    expect(() => EpicHome.keepPerson("  ")).toThrow(TypeError)
  })

  test("a person file that won't read counts as none kept", () => {
    writeFileSync(GIT_CONFIG, "[user]\n  name = Ana Lima\n")
    mkdirSync(HOME, { recursive: true })
    writeFileSync(EpicHome.personFile(), "{ not json5")
    expect(EpicHome.person(NOWHERE)).toEqual({ name: "Ana Lima", source: "git" })
  })
})
