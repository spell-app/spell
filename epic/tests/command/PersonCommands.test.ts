import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { PersonCommands } from "spell/epic/command/PersonCommands"
import { EpicHome } from "spell/epic/config/EpicHome"

/**
 * `epic whoami` and `epic whois`, on a scratch epic home (`$SPELL_EPIC_HOME`), a scratch git config
 * (`$GIT_CONFIG_GLOBAL`) and a small content folder:  two epics and a guide's comments.
 */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "person-commands-")))
const CONTENT = join(TEMP, "content")
const GIT_CONFIG = join(TEMP, "gitconfig")
const before = { ...process.env }
process.env.SPELL_EPIC_HOME = join(TEMP, "home")
process.env.GIT_CONFIG_GLOBAL = GIT_CONFIG
process.env.GIT_CONFIG_NOSYSTEM = "1"
afterAll(() => {
  for (const key of ["SPELL_EPIC_HOME", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM"])
    if (before[key] === undefined) delete process.env[key]
    else process.env[key] = before[key]
  rmSync(TEMP, { recursive: true, force: true })
})

/** Write `text` at `path` in the content folder. */
function page(path: string, text: string): void {
  mkdirSync(dirname(join(CONTENT, path)), { recursive: true })
  writeFileSync(join(CONTENT, path), text)
}

page(
  "epics/seo/seo.plan.html",
  `<epic-page><epic-reply from="Ana" at="2026-10-12 20:16">a</epic-reply>
<epic-reply from="Claude" at="2026-10-12 20:20">b</epic-reply>
<pre>&lt;epic-reply from="Ana" at="2026-10-30 10:00"&gt;shown, not written&lt;/epic-reply&gt;</pre></epic-page>`
)
page("epics/seo/parts/q3.html", `<epic-reply from="ana" at="2026-10-14 09:00">c</epic-reply>`)
page("epics/colours/parts/j1.html", `<epic-reply from="Ana" at="2026-10-02 08:00">d</epic-reply>`)
page(
  "guides/python-target.inbox.json5",
  `{ "comments": [{ "id": "c1", "replies": [{ "by": "Ana", "at": "2026-10-20T08:00:00.000Z", "html": "e" },
  { "by": "Claude", "at": "2026-10-21T08:00:00.000Z", "html": "f" }] }] }`
)

/** What a run printed, a line each. */
async function printed(run: () => Promise<number>): Promise<string[]> {
  const lines: string[] = []
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((text) => {
    lines.push(...String(text).trimEnd().split("\n"))
    return true
  })
  try {
    expect(await run()).toBe(0)
  } finally {
    spy.mockRestore()
  }
  return lines
}

describe("epic whois", () => {
  const commands = new PersonCommands({ content: CONTENT })

  test("each place they wrote in, newest first:  an epic by its id, a guide by its page;  escaped markup left out", () => {
    const activity = commands.activityOf("Ana")
    expect(activity).toEqual({
      name: "Ana",
      count: 4,
      last: "2026-10-20 08:00:00",
      places: [
        { place: "guides/python-target", count: 1, last: "2026-10-20 08:00:00" },
        { place: "seo", count: 2, last: "2026-10-14 09:00" },
        { place: "colours", count: 1, last: "2026-10-02 08:00" }
      ]
    })
  })

  test("prints the total, then a line per place;  nobody:  says so", async () => {
    expect(await printed(() => commands.whois(["Ana"]))).toEqual([
      "Ana:  4 replies and comments in 3 places, last on 2026-10-20",
      "  guides/python-target     1  last 2026-10-20",
      "  seo                      2  last 2026-10-14",
      "  colours                  1  last 2026-10-02"
    ])
    expect(await printed(() => commands.whois(["Zoe"]))).toEqual(["Zoe:  nothing on the epics names them yet"])
  })

  test("no name:  a usage error", async () => {
    await expect(commands.whois([])).rejects.toThrow(/whose\?/)
  })
})

describe("epic whoami", () => {
  const commands = new PersonCommands({ content: CONTENT })

  beforeEach(() => {
    rmSync(EpicHome.folder(), { recursive: true, force: true })
    writeFileSync(GIT_CONFIG, "[user]\n  name = Ana Lima\n")
  })

  test("nothing kept:  git's name, and how to keep another", async () => {
    // run outside any repo, so only the scratch config names anyone
    const cwd = process.cwd()
    process.chdir(TEMP)
    try {
      expect(await printed(() => commands.whoami([]))).toEqual([
        "Ana Lima  (git's user.name)",
        "  epic whoami <name> keeps another"
      ])
    } finally {
      process.chdir(cwd)
    }
  })

  test("with a name:  keeps it, and says the old one still on pages", async () => {
    EpicHome.keepPerson("Ana")
    const lines = await printed(() => commands.whoami(["Ana", "Silva"]))
    expect(lines).toEqual([
      `you're Ana Silva now, kept in ${EpicHome.personFile()}`,
      "  before:  Ana (kept)",
      "  4 replies and comments still name Ana:  epic whois Ana"
    ])
    expect(EpicHome.person()).toEqual({ name: "Ana Silva", source: "kept" })
    expect(await printed(() => commands.whoami([]))).toEqual([`Ana Silva  (kept in ${EpicHome.personFile()})`])
  })

  test("--json:  the person, where it's kept, and what it was", async () => {
    const json = JSON.parse((await printed(() => commands.whoami(["Bob", "--json"]))).join("\n"))
    expect(json).toMatchObject({ name: "Bob", source: "kept", file: EpicHome.personFile(), stillNamed: 0 })
  })
})
