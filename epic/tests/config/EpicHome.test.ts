import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
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

  test("person():  nobody kept, no GitHub login:  git's user.name, its full name too", () => {
    writeFileSync(GIT_CONFIG, "[user]\n  name = Ana Lima\n")
    expect(EpicHome.person(NOWHERE)).toEqual({ name: "Ana Lima", source: "git", fullName: "Ana Lima" })
  })

  test("keepPerson():  kept in person.json5, over git's from then on", () => {
    writeFileSync(GIT_CONFIG, "[user]\n  name = Ana Lima\n")
    expect(EpicHome.keepPerson("  Ana ")).toMatchObject({ name: "Ana", source: "kept" })
    expect(EpicHome.person(NOWHERE)).toEqual({ name: "Ana", source: "kept", fullName: "Ana Lima" })
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
    expect(EpicHome.person(NOWHERE)).toEqual({ name: "Ana Lima", source: "git", fullName: "Ana Lima" })
  })
})

/** A stand-in `gh` in the scratch folder:  a script printing `login` (exit 0), or failing as a logged-out one does. */
function fakeGh(name: string, { login, fails = false }: { login?: string; fails?: boolean }): string {
  const script = join(TEMP, name)
  writeFileSync(script, fails ? "#!/bin/sh\necho 'not logged in' >&2\nexit 4\n" : `#!/bin/sh\necho ${login}\n`)
  chmodSync(script, 0o755)
  return script
}

describe("EpicHome:  the GitHub login (Owen, 2026-10-29)", () => {
  test("refreshGithub():  gh's login kept as `github`;  the short name from then on, git's the full name", () => {
    writeFileSync(GIT_CONFIG, "[user]\n  name = Ana Lima\n")
    expect(EpicHome.refreshGithub(fakeGh("gh-ana", { login: "analima" }))).toBe("analima")
    expect(JSON.parse(readFileSync(EpicHome.personFile(), "utf8"))).toEqual({ github: "analima" })
    expect(EpicHome.person(NOWHERE)).toEqual({
      name: "analima",
      source: "github",
      fullName: "Ana Lima",
      github: "analima"
    })
    EpicHome.keepPerson("Ana")
    expect(EpicHome.person(NOWHERE)).toEqual({ name: "Ana", source: "kept", fullName: "Ana Lima", github: "analima" })
  })

  test("gh missing, or logged out:  nothing looked up, the login kept before stays;  NEVER throws", () => {
    expect(EpicHome.refreshGithub(join(TEMP, "no-such-gh"))).toBeUndefined()
    expect(EpicHome.refreshGithub(fakeGh("gh-out", { fails: true }))).toBeUndefined()
    expect(EpicHome.person(NOWHERE)).toEqual({ name: undefined, source: "none" })
    EpicHome.refreshGithub(fakeGh("gh-ben", { login: "ben" }))
    expect(EpicHome.refreshGithub(fakeGh("gh-out", { fails: true }))).toBe("ben")
    expect(EpicHome.person(NOWHERE)).toMatchObject({ name: "ben", source: "github" })
  })

  test("a login gh answers with that isn't one (an error page, a blank) is never kept", () => {
    expect(EpicHome.refreshGithub(fakeGh("gh-odd", { login: "'<html> oops'" }))).toBeUndefined()
    expect(existsSync(EpicHome.personFile())).toBe(false)
  })
})

describe("EpicHome.agent():  which agent runs `epic` (epic `epic-friend` P10, Q13)", () => {
  test("each agent's mark:  Claude Code's `CLAUDECODE`, Codex's `CODEX_THREAD_ID`", () => {
    expect([
      EpicHome.agent({ CLAUDECODE: "1" }),
      EpicHome.agent({ CODEX_THREAD_ID: "0199a2b3-thread" }),
      EpicHome.agentName({ CODEX_THREAD_ID: "0199a2b3-thread" })
    ]).toEqual([
      { name: "claude", source: "mark", mark: "CLAUDECODE" },
      { name: "codex", source: "mark", mark: "CODEX_THREAD_ID" },
      "codex"
    ])
  })

  test("`SPELL_EPIC_AGENT` overrides any mark, and names an agent epic doesn't know;  lower-cased", () => {
    expect([
      EpicHome.agent({ SPELL_EPIC_AGENT: " Gemini ", CLAUDECODE: "1" }),
      EpicHome.agentName({ SPELL_EPIC_AGENT: "codex", CLAUDECODE: "1" })
    ]).toEqual([{ name: "gemini", source: "set" }, "codex"])
  })

  test("none:  `claude`, as before P10, and it says it guessed;  an empty mark counts as none", () => {
    expect([EpicHome.agent({}), EpicHome.agent({ CLAUDECODE: "", SPELL_EPIC_AGENT: " " })]).toEqual([
      { name: "claude", source: "guessed" },
      { name: "claude", source: "guessed" }
    ])
  })
})
