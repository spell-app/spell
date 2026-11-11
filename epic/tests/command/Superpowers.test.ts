import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { ClaudeHome } from "spell/epic/config/ClaudeHome"
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
    expect(ClaudeHome.isPluginEnabled("superpowers", ON)).toBe(true)
    expect(ClaudeHome.isPluginEnabled("superpowers", OFF)).toBe(false)
    expect(ClaudeHome.isPluginEnabled("superpowers", join(TEMP, "no-claude"))).toBe(false)
    const broken = join(TEMP, "claude-broken")
    mkdirSync(broken)
    writeFileSync(join(broken, "settings.json"), "{nope")
    expect(ClaudeHome.isPluginEnabled("superpowers", broken)).toBe(false)
  })
})

describe("Superpowers.notice()", () => {
  test("an epic's worktree, superpowers on:  the guide's words, the install command, a line for the person", () => {
    const notice = Superpowers.notice({ cwd: EPIC }, { home: ON })
    expect(notice?.forPerson).toMatch(/superpowers is on:  in epic seo it stands aside/)
    expect(notice?.forClaude).toMatch("## superpowers -- With superpowers installed")
    for (const skill of ["brainstorming", "writing-plans", "using-git-worktrees", "finishing-a-development-branch"])
      expect(notice?.forClaude).toMatch(skill)
    expect(notice?.forClaude).toMatch("never `npm install`")
    expect(notice?.forClaude).toMatch("`/epic done` (`epic guide done`) is the only finish")
    expect(notice?.forClaude).toMatch("This repo's install command, already run in this worktree:  `yarn install`")
    // deeper in the worktree too
    expect(Superpowers.notice({ cwd: join(EPIC, "src") }, { home: ON })).toBeDefined()
  })

  test("nothing:  superpowers off;  a worktree with no epic;  the main checkout;  no folder", () => {
    expect(Superpowers.notice({ cwd: EPIC }, { home: OFF })).toBeUndefined()
    expect(Superpowers.notice({ cwd: ISOLATED }, { home: ON })).toBeUndefined()
    expect(Superpowers.notice({ cwd: MAIN }, { home: ON })).toBeUndefined()
    expect(Superpowers.notice({}, { home: ON })).toBeUndefined()
  })

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
})

/** Run the hook with `input`, Claude Code's folder `home`. */
function runHook(input: object, home: string) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(input),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_CONFIG_DIR: home }
  })
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
