import { spawn, spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { ClaudeHome, type PluginLookup } from "spell/epic/config/ClaudeHome"
import { Superpowers } from "spell/epic/command/Superpowers"
import { WorktreeGuard } from "spell/epic/command/WorktreeGuard"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

/** The session-start hook that says it, as the plugin runs it. */
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "../../hooks/worktree-guard.mjs")

/**
 * A repo using epics, its epic folder beside it holding epic `seo`;  a worktree for that epic and one for a plain
 * `/isolate`;  and two scratch Claude Code folders, superpowers on in one, off in the other.
 */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "superpowers-")))
const MAIN = fakeMainCheckout(join(TEMP, "repo"))
const EPIC = fakeWorktree(MAIN, join(TEMP, "repo.worktrees", "seo"))
const ISOLATED = fakeWorktree(MAIN, join(TEMP, "repo.worktrees", "quick-fix"))
mkdirSync(join(MAIN, ".epic"))
writeFileSync(
  join(MAIN, ".epic", "config.json5"),
  '{ "worktreesFolder": "../repo.worktrees", "contentFolder": "../repo.epics", "installCommand": "yarn install" }'
)
mkdirSync(join(TEMP, "repo.epics", "epics", "seo"), { recursive: true })
const ON = claudeHome("on", { "superpowers@claude-plugins-official": true, "epic@spell": true })
const OFF = claudeHome("off", { "superpowers@claude-plugins-official": false })
/** superpowers' own folder, as `claude --plugin-dir` would load it:  its manifest names it. */
const PLUGIN_DIR = join(TEMP, "superpowers-checkout")
mkdirSync(join(PLUGIN_DIR, ".claude-plugin"), { recursive: true })
writeFileSync(join(PLUGIN_DIR, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "superpowers" }))
/** No managed settings file, no session command line:  only what a test names counts. */
const NOWHERE = { managed: join(TEMP, "no-managed.json"), args: [] as string[] }
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

/** A scratch Claude Code folder whose `settings.json` turns `plugins` on or off;  returns its path. */
function claudeHome(name: string, plugins: Record<string, boolean>): string {
  const home = join(TEMP, `claude-${name}`)
  mkdirSync(home)
  writeFileSync(join(home, "settings.json"), JSON.stringify({ enabledPlugins: plugins }))
  return home
}

describe("ClaudeHome.isPluginEnabled()", () => {
  test("on from any marketplace;  off, missing, or settings that won't read:  not", () => {
    expect(enabled({ home: ON })).toBe(true)
    expect(enabled({ home: OFF })).toBe(false)
    expect(enabled({ home: join(TEMP, "no-claude") })).toBe(false)
    const broken = join(TEMP, "claude-broken")
    mkdirSync(broken)
    writeFileSync(join(broken, "settings.json"), "{nope")
    expect(enabled({ home: broken })).toBe(false)
  })

  test("I318:  the project's settings, its local file, --settings and the managed file turn it on too", () => {
    const shared = project("shared", { "settings.json": { "superpowers@superpowers-marketplace": true } })
    const local = project("local", { "settings.local.json": { "superpowers@claude-plugins-official": true } })
    expect(enabled({ home: OFF, project: shared })).toBe(true)
    expect(enabled({ home: OFF, project: local })).toBe(true)
    expect(enabled({ home: OFF, project: EPIC })).toBe(false)
    const managed = settingsFile("managed", { "superpowers@acme": true })
    expect(enabled({ home: OFF, managed })).toBe(true)
    const flagged = settingsFile("flagged", { "superpowers@acme": true })
    expect(enabled({ home: OFF, args: ["claude", "--settings", flagged] })).toBe(true)
    expect(enabled({ home: OFF, args: ["claude", `--settings=${flagged}`] })).toBe(true)
  })

  test("the later layer wins, key by key:  a project's local file turns the person's off", () => {
    const off = project("turned-off", {
      "settings.local.json": { "superpowers@claude-plugins-official": false }
    })
    expect(enabled({ home: ON, project: off })).toBe(false)
    // another marketplace's key is its own
    const other = project("other-key", { "settings.local.json": { "superpowers@elsewhere": false } })
    expect(enabled({ home: ON, project: other })).toBe(true)
  })

  test("--setting-sources:  only the layers it names", () => {
    const shared = project("sources", { "settings.json": { "superpowers@acme": true } })
    expect(enabled({ home: ON, args: ["claude", "--setting-sources", "project,local"] })).toBe(false)
    expect(enabled({ home: OFF, project: shared, args: ["claude", "--setting-sources=user"] })).toBe(false)
    expect(enabled({ home: OFF, project: shared, args: ["claude", "--setting-sources", "user,project"] })).toBe(true)
  })

  test("--plugin-dir:  a plugin loaded for the session alone, by its manifest's name, else its folder's", () => {
    expect(enabled({ home: OFF, args: ["claude", "--plugin-dir", PLUGIN_DIR] })).toBe(true)
    expect(enabled({ home: OFF, args: ["claude", `--plugin-dir=${PLUGIN_DIR}`] })).toBe(true)
    const bare = join(TEMP, "plugins", "superpowers")
    mkdirSync(bare, { recursive: true })
    expect(enabled({ home: OFF, args: ["claude", "--plugin-dir", bare] })).toBe(true)
    expect(enabled({ home: OFF, args: ["claude", "--plugin-dir", join(TEMP, "plugins")] })).toBe(false)
  })

  test("the session's command line, read off its process ($CLAUDE_PID)", async () => {
    const fake = await fakeClaude(["--plugin-dir", PLUGIN_DIR])
    try {
      expect(ClaudeHome.argsOf(fake.pid!)).toContain(PLUGIN_DIR)
    } finally {
      fake.kill()
    }
    expect(ClaudeHome.argsOf(0)).toEqual([])
  })
})

describe("ClaudeHome.launchOptions()", () => {
  test("each flag, spaced or with =;  inline JSON --settings is no file;  relative folders from the start folder", () => {
    expect(
      ClaudeHome.launchOptions(
        ["claude", "--plugin-dir", "p", "--setting-sources=user,local", "--settings", '{"a":1}', "--resume=x"],
        "/start"
      )
    ).toEqual({ pluginDirs: ["/start/p"], sources: ["user", "local"] })
    expect(ClaudeHome.launchOptions(["claude", "--settings=s.json"], "/start")).toEqual({
      pluginDirs: [],
      settings: "/start/s.json"
    })
  })
})

describe("Superpowers.notice()", () => {
  test("an epic's worktree, superpowers on:  the guide's words, the install command, a line for the person", () => {
    const notice = Superpowers.notice({ cwd: EPIC }, { home: ON, ...NOWHERE })
    expect(notice?.forPerson).toMatch(/superpowers is on:  in epic seo it stands aside/)
    expect(notice?.forClaude).toMatch("## superpowers -- With superpowers installed")
    for (const skill of ["brainstorming", "writing-plans", "using-git-worktrees", "finishing-a-development-branch"])
      expect(notice?.forClaude).toMatch(skill)
    expect(notice?.forClaude).toMatch("never `npm install`")
    expect(notice?.forClaude).toMatch("`/epic done` (`epic guide done`) is the only finish")
    expect(notice?.forClaude).toMatch("This repo's install command, already run in this worktree:  `yarn install`")
    // deeper in the worktree too
    expect(Superpowers.notice({ cwd: join(EPIC, "src") }, { home: ON, ...NOWHERE })).toBeDefined()
  })

  test("nothing:  superpowers off;  a worktree with no epic;  the main checkout;  no folder", () => {
    expect(Superpowers.notice({ cwd: EPIC }, { home: OFF, ...NOWHERE })).toBeUndefined()
    expect(Superpowers.notice({ cwd: ISOLATED }, { home: ON, ...NOWHERE })).toBeUndefined()
    expect(Superpowers.notice({ cwd: MAIN }, { home: ON, ...NOWHERE })).toBeUndefined()
    expect(Superpowers.notice({}, { home: ON, ...NOWHERE })).toBeUndefined()
  })

  test("I318:  on in the worktree's project settings, or loaded with --plugin-dir:  the words too", () => {
    mkdirSync(join(EPIC, ".claude"), { recursive: true })
    writeFileSync(join(EPIC, ".claude", "settings.json"), JSON.stringify({ enabledPlugins: { "superpowers@x": true } }))
    try {
      expect(Superpowers.notice({ cwd: EPIC }, { home: OFF, ...NOWHERE })?.forClaude).toMatch("never `npm install`")
    } finally {
      rmSync(join(EPIC, ".claude"), { recursive: true, force: true })
    }
    const loaded = Superpowers.notice(
      { cwd: EPIC },
      { home: OFF, ...NOWHERE, args: ["claude", "--plugin-dir", PLUGIN_DIR] }
    )
    expect(loaded?.forPerson).toMatch(/superpowers is on/)
  })
})

describe("the words in AGENTS.md (I318)", () => {
  test("one block, written from the guide's topic, between its markers", () => {
    const block = Superpowers.agentsBlock()
    expect(block).toMatch(/^<!-- epic:superpowers:start -- written by `epic init` from `epic guide superpowers`/)
    expect(block).toMatch(/<!-- epic:superpowers:end -->\n$/)
    expect(block).toMatch("\n## With superpowers installed\n")
    expect(block).toMatch("never `npm install`")
    expect(block).toMatch("`epic init --superpowers`")
  })

  test("added after the file's own text;  replaced in place, the rest kept;  current:  untouched", () => {
    const block = Superpowers.agentsBlock()
    expect(Superpowers.withAgentsBlock("", block)).toBe(block)
    const added = Superpowers.withAgentsBlock("# Rules\n\n- one\n\n", block)
    expect(added).toBe(`# Rules\n\n- one\n\n${block}`)
    const old = added.replace("never `npm install`", "OLD WORDS") + "\n## After\n"
    const updated = Superpowers.withAgentsBlock(old, block)
    expect(updated).toBe(`# Rules\n\n- one\n\n${block}\n## After\n`)
    expect(Superpowers.withAgentsBlock(updated, block)).toBe(updated)
  })

  test("agentsStep():  written, added, updated, ok;  a dry run writes nothing", () => {
    const repo = join(TEMP, "agents-repo")
    mkdirSync(repo)
    const file = join(repo, "AGENTS.md")
    expect(Superpowers.agentsStep({ main: repo, dryRun: true })).toEqual({ file, action: "written" })
    expect(Superpowers.hasAgentsBlock(repo)).toBe(false)
    expect(Superpowers.agentsStep({ main: repo }).action).toBe("written")
    expect(Superpowers.hasAgentsBlock(repo)).toBe(true)
    expect(Superpowers.agentsStep({ main: repo }).action).toBe("ok")
    writeFileSync(file, readFileSync(file, "utf8").replace("never `npm install`", "OLD"))
    expect(Superpowers.agentsStep({ main: repo }).action).toBe("updated")
    writeFileSync(file, "# Own\n")
    expect(Superpowers.agentsStep({ main: repo }).action).toBe("added")
    expect(readFileSync(file, "utf8")).toMatch(/^# Own\n\n<!-- epic:superpowers:start/)
  })
})

describe("the epic skill", () => {
  test("the epic skill's own paragraph names the same skills as the guide's words", () => {
    const skill = readSkill()
    for (const name of SKILLS) expect(skill).toMatch(name)
  })
})

describe("WorktreeGuard.withNotice()", () => {
  const notice = { forPerson: "person line", forClaude: "claude words" }
  const guard = WorktreeGuard.output("guard line", "guard words")

  test("either alone stands;  both join, the guard's first", () => {
    expect(WorktreeGuard.withNotice(undefined, undefined)).toBeUndefined()
    expect(WorktreeGuard.withNotice(guard, undefined)).toBe(guard)
    expect(WorktreeGuard.withNotice(undefined, notice)).toEqual(WorktreeGuard.output("person line", "claude words"))
    expect(WorktreeGuard.withNotice(guard, notice)).toEqual(
      WorktreeGuard.output("guard line\nperson line", "guard words\n\nclaude words")
    )
  })
})

describe("the session-start hook", () => {
  test("says it on start, /clear and compaction in an epic's worktree with superpowers on;  nothing with it off", () => {
    for (const source of ["startup", "clear", "compact"]) {
      const run = runHook({ cwd: EPIC, source, session_id: `sp-${source}` }, ON)
      expect(run.status).toBe(0)
      expect(JSON.parse(run.stdout).hookSpecificOutput.additionalContext).toMatch("The superpowers plugin is turned on")
    }
    expect(runHook({ cwd: EPIC, source: "startup", session_id: "sp-off" }, OFF).stdout).toBe("")
  })

  test("I318:  superpowers loaded with --plugin-dir, the person's settings off:  says it, from the session's process", async () => {
    const fake = await fakeClaude(["--plugin-dir", PLUGIN_DIR])
    try {
      const run = runHook({ cwd: EPIC, source: "startup", session_id: "sp-dir" }, OFF, { CLAUDE_PID: String(fake.pid) })
      expect(JSON.parse(run.stdout).hookSpecificOutput.additionalContext).toMatch("The superpowers plugin is turned on")
    } finally {
      fake.kill()
    }
  })
})

/** Run the hook with `input`, Claude Code's folder `home`, and `env` over the tests' own. */
function runHook(input: object, home: string, env: Record<string, string> = {}) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_CONFIG_DIR: home, ...env }
  })
}

/** Is superpowers on, by `lookup`, with no managed file and no command line unless it says? */
function enabled(lookup: PluginLookup): boolean {
  return ClaudeHome.isPluginEnabled("superpowers", { ...NOWHERE, ...lookup })
}

/** A scratch project folder whose `.claude/` holds `files` (a name to its `enabledPlugins`);  returns its path. */
function project(name: string, files: Record<string, Record<string, boolean>>): string {
  const folder = join(TEMP, "projects", name)
  mkdirSync(join(folder, ".claude"), { recursive: true })
  for (const [file, plugins] of Object.entries(files))
    writeFileSync(join(folder, ".claude", file), JSON.stringify({ enabledPlugins: plugins }))
  return folder
}

/** A scratch settings file turning `plugins` on or off;  returns its path. */
function settingsFile(name: string, plugins: Record<string, boolean>): string {
  const file = join(TEMP, `${name}-settings.json`)
  writeFileSync(file, JSON.stringify({ enabledPlugins: plugins }))
  return file
}

/** A stand-in for a `claude` process started with `args`:  a node that waits, `ps` showing them;  kill it after. */
async function fakeClaude(args: string[]) {
  const child = spawn(process.execPath, ["-e", "setTimeout(() => {}, 20000)", "--", ...args], { stdio: "ignore" })
  // until `ps` shows its arguments
  for (let tries = 0; tries < 50 && !ClaudeHome.argsOf(child.pid!).includes(args.at(-1)!); tries++)
    await new Promise((done) => setTimeout(done, 20))
  return child
}

/** The epic skill's `SKILL.md`. */
function readSkill(): string {
  return readFileSync(resolve(dirname(HOOK), "../skills/epic/SKILL.md"), "utf8")
}

/** The superpowers skills the stand-aside words name, the ones to leave and the ones to use. */
const SKILLS = [
  "brainstorming",
  "writing-plans",
  "executing-plans",
  "subagent-driven-development",
  "using-git-worktrees",
  "finishing-a-development-branch",
  "test-driven-development",
  "systematic-debugging",
  "verification-before-completion"
]
