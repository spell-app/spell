/**
 * `EpicRepo`:  which repo an epic is worked in (epic `epic-engine` I47), and everything that reads it, on two
 * throwaway repos sharing one content folder, as spell-app and spell-epic do:
 * - the worktree hook (`hooks/worktree.mjs`), run as Claude Code runs it:  refuses the other repo's epic
 * - the prompt gate (`PromptGate`):  a note for Claude, a line for Owen, no rename
 * - the session-start guard (`WorktreeGuard`):  a stray worktree
 * - `epic worktree path`, `epic window launch|open|close` (`EpicProgram.windowOptions()`), `epic list --json`
 * - Saved prompts and Claude Code's folder are temp ones:  never `~/.spell/prompts` or the real `~/.claude`.
 */
import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { EpicProgram } from "spell-epic/cli/EpicProgram"
import { PromptGate } from "spell-epic/command/PromptGate"
import { WorktreeGuard } from "spell-epic/command/WorktreeGuard"
import { Worktrees } from "spell-epic/command/Worktrees"
import { EpicRepo } from "spell-epic/config/EpicRepo"
import { PlanDocFiles } from "spell-epic/tool/PlanDocFiles"

/** The worktree hook, as the plugin runs it. */
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "../../hooks/worktree.mjs")

/** Two repos, `app` and `engine`, their worktrees beside each, ONE content folder `shared`. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "epic-repo-")))
const APP = join(TEMP, "app")
const ENGINE = join(TEMP, "engine")
const SHARED = join(TEMP, "shared")
const CLAUDE = join(TEMP, "claude")
const PROMPTS = join(TEMP, "prompts")
process.env.SPELL_PROMPTS_DIR = PROMPTS
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

for (const [main, url] of [
  [APP, "git@github.com:o/app.git"],
  [ENGINE, "https://github.com/o/engine"]
] as const) {
  mkdirSync(join(main, ".epic"), { recursive: true })
  const config = {
    contentFolder: "../shared",
    worktreesFolder: `../${main.split("/").pop()}.worktrees`,
    installCommand: "",
    sharedFolders: []
  }
  writeFileSync(join(main, ".epic", "config.json5"), JSON.stringify(config))
  git(main, "init", "-q", "-b", "main")
  git(main, "remote", "add", "origin", url)
  git(main, "add", "-A")
  git(main, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "first")
}

/** Epic `name`'s page in the shared content folder, its `<epic-page>` given `attributes`. */
function page(name: string, attributes: Record<string, string>): string {
  const dir = join(SHARED, "epics", name)
  mkdirSync(dir, { recursive: true })
  const attrs = Object.entries(attributes)
    .map(([key, value]) => ` ${key}="${value}"`)
    .join("")
  const file = join(dir, `${name}.plan.html`)
  writeFileSync(
    file,
    `<!doctype html><html><body><epic-page epic="${name}" title="${name}"${attrs}></epic-page></body></html>\n`
  )
  return file
}

// the engine's epic, started in its main checkout;  the app's, started in a worktree since removed;
// one known by its GitHub page alone;  a future one, with neither
page("engine-work", { branch: "main", worktree: ENGINE, repo: "https://github.com/o/engine" })
page("app-work", { branch: "app-work", worktree: join(TEMP, "app.worktrees", "app-work") })
page("by-url", { repo: "https://github.com/o/engine/" })
page("someday", { future: "" })

/** Run the worktree hook's `create` for `name`, from `cwd`. */
function create(name: string, cwd: string) {
  const run = spawnSync(process.execPath, [HOOK, "create"], {
    input: JSON.stringify({ name, cwd }),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_CONFIG_DIR: CLAUDE }
  })
  return { status: run.status, stdout: run.stdout.trim(), stderr: run.stderr }
}

describe("EpicRepo", () => {
  test("by the page's worktree:  its main checkout, there or gone", () => {
    expect(EpicRepo.of("engine-work", APP)).toMatchObject({
      own: false,
      here: APP,
      checkout: ENGINE,
      worktree: join(TEMP, "engine.worktrees", "engine-work"),
      made: false
    })
    expect(EpicRepo.of("engine-work", ENGINE)?.own).toBe(true)
    expect(EpicRepo.of("app-work", APP)?.own).toBe(true)
    expect(EpicRepo.of("app-work", ENGINE)).toMatchObject({ own: false, checkout: APP })
  })

  test("by its GitHub page alone:  the checkout beside this one whose origin it is", () => {
    expect(EpicRepo.of("by-url", APP)).toMatchObject({
      own: false,
      checkout: ENGINE,
      url: "https://github.com/o/engine/"
    })
    expect(EpicRepo.of("by-url", ENGINE)?.own).toBe(true)
  })

  test("can't tell, or no epic:  says nothing", () => {
    expect(EpicRepo.of("someday", APP)).toBeUndefined()
    expect(EpicRepo.of("nope", APP)).toBeUndefined()
    expect(EpicRepo.elsewhere("engine-work", ENGINE)).toBeUndefined()
    expect(EpicRepo.elsewhere("engine-work", APP)?.checkout).toBe(ENGINE)
  })

  test("sameUrl():  ssh, https, `.git` and a trailing slash are one repo", () => {
    expect(EpicRepo.sameUrl("git@github.com:o/r.git", "https://github.com/O/r/")).toBe(true)
    expect(EpicRepo.sameUrl("https://github.com/o/r", "https://github.com/o/s")).toBe(false)
    expect(EpicRepo.sameUrl(null, "https://github.com/o/r")).toBe(false)
  })

  test("mainOfPath():  a worktree folder gone, nested or beside the repo", () => {
    expect(EpicRepo.mainOfPath(join(APP, ".claude", "worktrees", "gone"))).toBe(APP)
    expect(EpicRepo.mainOfPath(join(TEMP, "app.worktrees", "gone"))).toBe(APP)
    expect(EpicRepo.mainOfPath(join(TEMP, "nowhere", "gone"))).toBeNull()
  })

  test("mainOfPath():  a LEFTOVER worktree folder, its `.git` file naming a gone gitdir, isn't a checkout (P16)", () => {
    const leftover = join(TEMP, "app.worktrees", "leftover")
    mkdirSync(leftover, { recursive: true })
    writeFileSync(join(leftover, ".git"), `gitdir: ${join(TEMP, "gone", ".git", "worktrees", "leftover")}\n`)
    expect(EpicRepo.mainOfPath(leftover)).toBe(APP)
  })

  test("refusal():  where it's worked, and the launch", () => {
    const line = EpicRepo.refusal(EpicRepo.of("engine-work", APP)!)
    expect(line).toMatch(`Epic engine-work is worked in engine (${ENGINE}), not this repo (app)`)
    expect(line).toMatch("`epic window launch engine-work`")
  })
})

describe("the worktree hook", () => {
  test("refuses another repo's epic, one line, nothing made", () => {
    const refused = create("engine-work", APP)
    expect(refused.status).toBe(1)
    expect(refused.stdout).toBe("")
    expect(refused.stderr).toMatch(/worktree hook:  Epic engine-work is worked in engine/)
    expect(refused.stderr).toMatch("epic window launch engine-work")
    expect(existsSync(join(TEMP, "app.worktrees", "engine-work"))).toBe(false)
  })

  test("makes it in its own repo;  then, from there, says how to enter it;  the app's own epics and others as before", () => {
    const made = create("engine-work", ENGINE)
    expect(made.status).toBe(0)
    expect(made.stdout).toBe(join(TEMP, "engine.worktrees", "engine-work"))
    expect(create("engine-work", APP).stderr).toMatch(`EnterWorktree, name "engine-work"`)
    expect(create("app-work", APP).status).toBe(0)
    expect(create("not-an-epic", APP).status).toBe(0)
    expect(create("someday", APP).status).toBe(0)
  })

  test("a stray made before is refused, not reused", () => {
    git(APP, "worktree", "add", "-q", "-b", "by-url", join(TEMP, "app.worktrees", "by-url"))
    const refused = create("by-url", APP)
    expect(refused.status).toBe(1)
    expect(refused.stderr).not.toMatch(/reusing/)
  })
})

describe("the prompt gate", () => {
  test("another repo's epic:  through, NOT renamed, a note for Claude and a line for Owen", () => {
    const answer = PromptGate.gate({ prompt: "/epic resume engine-work", cwd: APP }, null) as {
      hookSpecificOutput: { sessionTitle?: string; additionalContext: string }
      systemMessage: string
    }
    expect(answer.hookSpecificOutput.sessionTitle).toBeUndefined()
    expect(answer.hookSpecificOutput.additionalContext).toMatch("must NOT run here")
    expect(answer.hookSpecificOutput.additionalContext).toMatch(
      'epic window launch engine-work --prompt "/epic resume engine-work"'
    )
    expect(answer.systemMessage).toMatch(`⎇ engine-work is worked in ${ENGINE}`)
  })

  test("`/epic <name> text`:  the text saved for its own window;  `/isolate` and `/unpark` too", () => {
    const answer = PromptGate.gate({ prompt: "/epic engine-work fix the thing", cwd: APP }, null) as {
      hookSpecificOutput: { additionalContext: string }
    }
    expect(answer.hookSpecificOutput.additionalContext).toMatch("Its text is saved in")
    expect(existsSync(join(PROMPTS, "engine-work.md"))).toBe(true)
    for (const prompt of ["/isolate engine-work", "/unpark engine-work"]) {
      expect(JSON.stringify(PromptGate.gate({ prompt, cwd: APP }, null))).toMatch("must NOT run here")
    }
  })

  test("its own repo's, or no epic:  renamed as before", () => {
    expect(PromptGate.gate({ prompt: "/epic resume engine-work", cwd: ENGINE }, null)).toEqual({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", sessionTitle: "🚧 engine-work" }
    })
    expect(PromptGate.gate({ prompt: "/isolate not-an-epic", cwd: APP }, null)).toMatchObject({
      hookSpecificOutput: { sessionTitle: "🚧 not-an-epic" }
    })
  })
})

describe("the session-start guard", () => {
  test("a session in a stray worktree:  edit nothing, leave it, offer the launch", () => {
    const stray = join(TEMP, "app.worktrees", "by-url")
    const output = WorktreeGuard.check({ cwd: stray, source: "startup" })
    expect(output?.systemMessage).toMatch(/⎇ by-url:  this worktree is a stray, in the wrong repo \(app\)/)
    expect(output?.hookSpecificOutput.additionalContext).toMatch("edit NOTHING")
    expect(output?.hookSpecificOutput.additionalContext).toMatch("never EnterWorktree it")
  })

  test("the epic's own worktree:  as before, nothing said (epic `epic-engine` P12:  recorded, never told to enter)", () => {
    const own = join(TEMP, "engine.worktrees", "engine-work")
    expect(WorktreeGuard.check({ cwd: own, source: "startup" })).toBeUndefined()
  })
})

describe("the commands", () => {
  test("`epic worktree path <name>`:  the epic's own repo's worktree", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    const said = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    try {
      await new Worktrees({ main: APP }).run(["path", "engine-work"])
      await new Worktrees({ main: APP }).run(["path", "app-work"])
      expect(write.mock.calls.map(([text]) => String(text).trim())).toEqual([
        join(TEMP, "engine.worktrees", "engine-work"),
        join(TEMP, "app.worktrees", "app-work")
      ])
      expect(String(said.mock.calls[0]?.[0])).toMatch("epic engine-work is engine's")
    } finally {
      write.mockRestore()
      said.mockRestore()
    }
  })

  test("`epic window launch|open|close <name>`:  run in the epic's own repo", () => {
    const said = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    try {
      expect(EpicProgram.windowOptions(["launch", "engine-work", "--prompt", "/epic resume x"], APP)).toEqual({
        cwd: ENGINE
      })
      expect(EpicProgram.windowOptions(["open", "--color", "red", "engine-work"], APP)).toEqual({ cwd: ENGINE })
      expect(EpicProgram.windowOptions(["launch", "engine-work"], ENGINE)).toEqual({})
      expect(EpicProgram.windowOptions(["which"], APP)).toEqual({})
      expect(EpicProgram.windowOptions(["launch", "app-work"], APP)).toEqual({})
    } finally {
      said.mockRestore()
    }
  })

  test("`epic list --json`:  another repo's epic has its `repo`, and its `checkout` there", () => {
    const listed = new Map(new PlanDocFiles({ root: APP }).listEpics().map((epic) => [epic.name, epic]))
    expect(listed.get("engine-work")).toMatchObject({ repo: ENGINE, checkout: "../engine.worktrees/engine-work" })
    expect(listed.get("app-work")?.repo).toBeUndefined()
    expect(listed.get("app-work")?.checkout).toBe("../app.worktrees/app-work")
  })
})

/** `git <args>` in `cwd`. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}
