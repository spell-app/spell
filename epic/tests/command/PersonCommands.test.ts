import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { NameSweep } from "spell/epic/command/NameSweep"
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
        "Ana Lima",
        "  git's user.name;  epic whoami <name> keeps another",
        // the tests name their agent (`tests/setup/epicHome.ts`)
        "  agent:  claude (SPELL_EPIC_AGENT)"
      ])
    } finally {
      process.chdir(cwd)
    }
  })

  test("the person in one line:  the short name, then the full name and the GitHub login (Owen, 2026-10-29)", () => {
    const github = { fullName: "Owen Williams", github: "owenoak" }
    expect([
      PersonCommands.whoLine({ name: "owenoak", source: "github", ...github }),
      PersonCommands.whoLine({ name: "Owen", source: "kept", ...github }),
      PersonCommands.whoLine({ name: "Ana Lima", source: "git", fullName: "Ana Lima" }),
      PersonCommands.whoLine({ name: "Ana", source: "kept" })
    ]).toEqual([
      "owenoak  (Owen Williams, github: owenoak)",
      "Owen  (Owen Williams, github: owenoak)",
      "Ana Lima",
      "Ana"
    ])
  })

  test("with a name:  keeps it, and says the old one still on pages", async () => {
    EpicHome.keepPerson("Ana")
    const lines = await printed(() => commands.whoami(["Ana", "Silva"]))
    expect(lines).toEqual([
      `you're Ana Silva now, kept in ${EpicHome.personFile()}`,
      "  before:  Ana (kept)",
      "  4 replies and comments still name Ana:  epic whoami --rename Ana Silva rewrites them"
    ])
    expect(EpicHome.person()).toMatchObject({ name: "Ana Silva", source: "kept" })
    expect(await printed(() => commands.whoami([]))).toEqual([
      "Ana Silva  (Ana Lima)",
      `  kept in ${EpicHome.personFile()}`,
      "  agent:  claude (SPELL_EPIC_AGENT)"
    ])
  })

  test("the agent under the person (epic `epic-friend` P10):  by its mark, named, or a guess that says so", () => {
    expect([
      PersonCommands.agentLine(EpicHome.agent({ CODEX_THREAD_ID: "t1" })),
      PersonCommands.agentLine(EpicHome.agent({ SPELL_EPIC_AGENT: "gemini" })),
      PersonCommands.agentLine(EpicHome.agent({}))
    ]).toEqual([
      "  agent:  codex (Codex's mark, CODEX_THREAD_ID)",
      "  agent:  gemini (SPELL_EPIC_AGENT)",
      "  agent:  claude (a guess:  no agent's mark found;  SPELL_EPIC_AGENT=<name> names it)"
    ])
  })

  test("--json:  the person, where it's kept, and what it was", async () => {
    const json = JSON.parse((await printed(() => commands.whoami(["Bob", "--json"]))).join("\n"))
    expect(json).toMatchObject({
      name: "Bob",
      source: "kept",
      file: EpicHome.personFile(),
      stillNamed: 0,
      agent: { name: "claude", source: "set" }
    })
  })
})

////////////////
// ## The rename sweep
////////////////

/** A content folder of its own for the sweep, made fresh:  Ana's page, its part and log, an inbox. */
const SWEPT = join(TEMP, "swept")

/** The files `sweptFolder()` writes, by path. */
const SWEPT_FILES: Record<string, string> = {
  "epics/seo/seo.plan.html":
    '<epic-page><epic-reply from="Ana" at="2026-10-12 20:16"><p>Ana thinks so.</p></epic-reply>' +
    '<epic-reply from="Ana" agent="claude" at="2026-11-02 09:00">b</epic-reply>' +
    '<epic-reply from="Anabel" at="2026-10-12 20:20">c</epic-reply>' +
    '<epic-status from="ana" at="2026-11-02 09:00">d</epic-status>' +
    '<pre>&lt;epic-reply from="Ana"&gt;shown&lt;/epic-reply&gt;</pre></epic-page>',
  "epics/seo/parts/q3.html": "<p><b>Ana:</b>  why?</p><p>Failed in Ana's test run.</p><p>Ask Ana about it.</p>",
  "epics/seo/parts/log.html":
    "<epic-event>Q3 Ana picked B:  Bananas</epic-event><epic-event>M3 passed (Ana's run)</epic-event>" +
    "<epic-event>T2 not urgent (Ana, from its id chip)</epic-event><epic-event>Ana's plan renamed</epic-event>",
  "guides/python-target.inbox.json5":
    '{ "comments": { "c1": { "text": "Ana?", "by": "Ana", "replies": [{ "by": "Ana", "agent": "claude" },\n' +
    '  { by: "Anabel" }] } } }'
}

/** Write the sweep's content folder afresh. */
function sweptFolder(): void {
  rmSync(SWEPT, { recursive: true, force: true })
  for (const [path, text] of Object.entries(SWEPT_FILES)) {
    mkdirSync(dirname(join(SWEPT, path)), { recursive: true })
    writeFileSync(join(SWEPT, path), text)
  }
}

/** File `path` of the sweep's folder, as it is now. */
function swept(path: string): string {
  return readFileSync(join(SWEPT, path), "utf8")
}

describe("NameSweep", () => {
  test("renames the author in markup, the writers' phrases and data;  running text, Anabel and shown markup left", () => {
    sweptFolder()
    const result = new NameSweep({ content: SWEPT }).run("Ana", "Ana Lima")
    expect(result).toEqual({
      from: "Ana",
      to: "Ana Lima",
      dryRun: false,
      count: 10,
      files: [
        { path: "epics/seo/parts/log.html", count: 3 },
        { path: "epics/seo/parts/q3.html", count: 2 },
        { path: "epics/seo/seo.plan.html", count: 3 },
        { path: "guides/python-target.inbox.json5", count: 2 }
      ],
      moved: []
    })
    expect(swept("epics/seo/seo.plan.html")).toBe(
      '<epic-page><epic-reply from="Ana Lima" at="2026-10-12 20:16"><p>Ana thinks so.</p></epic-reply>' +
        '<epic-reply from="Ana Lima" agent="claude" at="2026-11-02 09:00">b</epic-reply>' +
        '<epic-reply from="Anabel" at="2026-10-12 20:20">c</epic-reply>' +
        '<epic-status from="Ana Lima" at="2026-11-02 09:00">d</epic-status>' +
        '<pre>&lt;epic-reply from="Ana"&gt;shown&lt;/epic-reply&gt;</pre></epic-page>'
    )
    expect(swept("epics/seo/parts/q3.html")).toBe(
      "<p><b>Ana Lima:</b>  why?</p><p>Failed in Ana Lima's test run.</p><p>Ask Ana about it.</p>"
    )
    expect(swept("epics/seo/parts/log.html")).toBe(
      "<epic-event>Q3 Ana Lima picked B:  Bananas</epic-event><epic-event>M3 passed (Ana Lima's run)</epic-event>" +
        "<epic-event>T2 not urgent (Ana Lima, from its id chip)</epic-event><epic-event>Ana's plan renamed</epic-event>"
    )
    expect(swept("guides/python-target.inbox.json5")).toBe(
      '{ "comments": { "c1": { "text": "Ana?", "by": "Ana Lima", "replies": [{ "by": "Ana Lima", "agent": "claude" },\n' +
        '  { by: "Anabel" }] } } }'
    )
    // a second run finds nothing
    expect(new NameSweep({ content: SWEPT }).run("Ana", "Ana Lima").count).toBe(0)
  })

  test("a dry run counts the same, and writes nothing", () => {
    sweptFolder()
    const result = new NameSweep({ content: SWEPT }).run("Ana", "Ana Lima", { dryRun: true })
    expect([result.dryRun, result.count, result.files.length]).toEqual([true, 10, 4])
    for (const [path, text] of Object.entries(SWEPT_FILES)) expect(swept(path)).toBe(text)
  })
})

describe("epic whoami --rename", () => {
  const commands = new PersonCommands({ content: SWEPT })

  beforeEach(() => {
    rmSync(EpicHome.folder(), { recursive: true, force: true })
    writeFileSync(GIT_CONFIG, "[user]\n  name = Ana Lima\n")
    sweptFolder()
    EpicHome.keepPerson("Ana")
  })

  test("--dry-run:  says what it would change, file by file;  keeps nothing, writes nothing", async () => {
    expect(await printed(() => commands.whoami(["--rename", "Ana", "Lima", "--dry-run"]))).toEqual([
      "would rename Ana as Ana Lima in 10 places, 4 files  (dry run:  nothing written, name not kept)",
      "  epics/seo/parts/log.html             3",
      "  epics/seo/parts/q3.html              2",
      "  epics/seo/seo.plan.html              3",
      "  guides/python-target.inbox.json5     2"
    ])
    expect(EpicHome.person().name).toBe("Ana")
    expect(swept("epics/seo/parts/q3.html")).toBe(SWEPT_FILES["epics/seo/parts/q3.html"])
  })

  test("keeps the new name and rewrites the old one;  again:  nothing to rename", async () => {
    const lines = await printed(() => commands.whoami(["--rename", "Ana", "Lima"]))
    expect(lines[0]).toBe("renamed Ana as Ana Lima in 10 places, 4 files;  you're Ana Lima now")
    expect(EpicHome.person()).toMatchObject({ name: "Ana Lima", source: "kept" })
    expect(swept("epics/seo/parts/q3.html")).toContain("<b>Ana Lima:</b>")
    expect(await printed(() => commands.whoami(["--rename", "Ana", "Lima"]))).toEqual([
      "you're Ana Lima already:  nothing to rename"
    ])
  })

  test("--rename with no name:  a usage error", async () => {
    await expect(commands.whoami(["--rename"])).rejects.toThrow(/to what\?/)
  })
})
