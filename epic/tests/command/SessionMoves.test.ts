/**
 * `SessionMoves`:  whether a promised move to another window will happen, and what's said when it didn't
 * (epic `epic-engine` P26, request r20).
 * - Claude Code's folder and spell-epic's registry are temp ones;  the plugin's folder is a made-up one too.
 * - The prompt hook (`hooks/prompt-gate.mjs`) is run as Claude Code runs it, for the missed move.
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { afterAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { SessionMoves } from "spell/epic/command/SessionMoves"

const top = mkdtempSync(join(tmpdir(), "session-moves-"))
const home = join(top, "claude")
const registry = join(top, "registry")
/** the plugin's folder, `epic/`:  its name, and the end-of-turn hook in it;  its marketplace at the repo's root */
const engine = join(top, "epic")
mkdirSync(join(engine, ".claude-plugin"), { recursive: true })
mkdirSync(join(engine, "hooks"))
mkdirSync(join(top, ".claude-plugin"))
writeFileSync(join(engine, ".claude-plugin", "plugin.json"), '{ "name": "epic" }')
writeFileSync(join(top, ".claude-plugin", "marketplace.json"), '{ "name": "spell" }')
writeFileSync(join(engine, "hooks", "handoff.mjs"), "")

const SESSION = "948c5133-c416-417e-b919-de8b08200bed"
const HOOK = resolve(import.meta.dirname, "../../hooks/prompt-gate.mjs")

/** A `SessionMoves` on the temp folders. */
function moves(): SessionMoves {
  return new SessionMoves({ registry, home, engine })
}

/** Claude Code's plugin lists, as `claude plugin marketplace add <folder>` and `install` leave them. */
function pluginListsAt(folder: string, { installPath = folder, enabled = true } = {}): void {
  const marketplace = { source: { source: "directory", path: folder } }
  mkdirSync(join(home, "plugins"), { recursive: true })
  const settings = {
    enabledPlugins: { "epic@spell": enabled },
    extraKnownMarketplaces: { spell: marketplace }
  }
  writeFileSync(join(home, "settings.json"), JSON.stringify(settings))
  const known = { spell: { ...marketplace, installLocation: folder } }
  writeFileSync(join(home, "plugins", "known_marketplaces.json"), JSON.stringify(known))
  const installed = { version: 2, plugins: { "epic@spell": [{ installPath }] } }
  writeFileSync(join(home, "plugins", "installed_plugins.json"), JSON.stringify(installed))
}

/** A move of `SESSION` recorded, as `epic window handoff elemental-spell` writes it. */
function recordMove(): string {
  const file = moves().handoffFile(SESSION)
  mkdirSync(moves().handoffs, { recursive: true })
  writeFileSync(file, JSON.stringify({ sessionId: SESSION, to: "/w/ongoing/elemental-spell.code-workspace" }))
  return file
}

beforeEach(() => {
  rmSync(home, { recursive: true, force: true })
  rmSync(registry, { recursive: true, force: true })
  mkdirSync(home)
})

afterAll(() => rmSync(top, { recursive: true, force: true }))

describe("pluginNames()", () => {
  test("epic@spell:  the plugin's name from its manifest, the marketplace's from the repo's root;  else the defaults", () => {
    expect(moves().pluginNames()).toEqual({ plugin: "epic", marketplace: "spell" })
    const bare = join(top, "bare", "epic")
    mkdirSync(bare, { recursive: true })
    expect(new SessionMoves({ registry, home, engine: bare }).pluginNames()).toEqual({
      plugin: "epic",
      marketplace: "spell"
    })
  })

  test("the real plugin:  epic@spell", () => {
    expect(new SessionMoves({ registry, home }).pluginNames()).toEqual({ plugin: "epic", marketplace: "spell" })
  })
})

describe("hookProblem():  will the end-of-turn hook run?", () => {
  test("the plugin's lists naming a folder that's there, and the session marked:  no problem", () => {
    pluginListsAt(engine)
    moves().sawHooks(SESSION)
    expect(moves().pluginProblem()).toBeNull()
    expect(moves().hookProblem(SESSION)).toBeNull()
    // no lists at all (`claude --plugin-dir`):  nothing says it won't
    rmSync(join(home, "plugins"), { recursive: true })
    rmSync(join(home, "settings.json"))
    expect(moves().hookProblem(SESSION)).toBeNull()
  })

  test("r20:  the marketplace at a folder that's gone, in either list:  said, with the install step that fixes it", () => {
    const gone = join(top, "spell-app", "spell-epic")
    pluginListsAt(gone)
    moves().sawHooks(SESSION)
    const problem = moves().hookProblem(SESSION)!
    expect(problem).toBe(`Claude Code looks for the plugin's marketplace in ${gone}, which is gone (settings.json)`)
    expect(moves().fixFor(problem)).toMatch(/run `epic plugin install`.*then \/reload-plugins/)
    // only the second list left stale
    pluginListsAt(engine)
    const known = { spell: { installLocation: gone } }
    writeFileSync(join(home, "plugins", "known_marketplaces.json"), JSON.stringify(known))
    expect(moves().pluginProblem()).toMatch(/which is gone \(known_marketplaces\.json\)/)
  })

  test("the hooks' folder without the hook, the plugin off, a list that won't parse:  each said", () => {
    const empty = join(top, "copy")
    mkdirSync(empty, { recursive: true })
    pluginListsAt(engine, { installPath: empty })
    expect(moves().pluginProblem()).toMatch(/hooks run from .*copy, which has no hooks\/handoff\.mjs/)
    pluginListsAt(engine, { enabled: false })
    expect(moves().pluginProblem()).toMatch(/turned off/)
    writeFileSync(join(home, "settings.json"), "{ not json")
    expect(moves().pluginProblem()).toMatch(/can't be read/)
  })

  test("a session whose prompt hook never marked it:  its hooks aren't loaded;  a month-old mark goes", () => {
    pluginListsAt(engine)
    const problem = moves().hookProblem(SESSION)!
    expect(problem).toMatch(/this session's hooks haven't run/)
    expect(moves().fixFor(problem)).toMatch(/\/reload-plugins/)
    // the mark ages out once a month has gone by, at the next mark
    moves().sawHooks(SESSION)
    const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    utimesSync(join(moves().seen, SESSION), old, old)
    moves().sawHooks("00000000-0000-0000-0000-000000000000")
    expect(existsSync(join(moves().seen, SESSION))).toBe(false)
  })
})

describe("missedMove():  a promised move that didn't happen", () => {
  test("the turn over and the record still waiting:  said once, the record cleared, a line in its log", () => {
    pluginListsAt(engine)
    const file = recordMove()
    // the hook can still run, and the turn may be the record's own:  nothing said
    expect(moves().missedMove(SESSION)).toBeNull()
    expect(existsSync(file)).toBe(true)
    const missed = moves().missedMove(SESSION, { turnEnded: true })!
    expect(missed.name).toBe("elemental-spell")
    expect(missed.message).toMatch(/was to move to ⎇ elemental-spell's window when its last turn ended, and didn't/)
    expect(missed.message).toMatch(/`epic window launch elemental-spell`/)
    expect(existsSync(file)).toBe(false)
    expect(existsSync(join(moves().handoffs, `${SESSION}.missed.json`))).toBe(true)
    expect(readFileSync(join(moves().handoffs, `${SESSION}.log`), "utf8")).toMatch(
      /missed:  the move to elemental-spell/
    )
    expect(moves().missedMove(SESSION, { turnEnded: true })).toBeNull()
  })

  test("the hook can't run:  missed whenever it's asked, with the fix", () => {
    pluginListsAt(join(top, "gone"))
    recordMove()
    const missed = moves().missedMove(SESSION)!
    expect(missed.problem).toMatch(/which is gone/)
    expect(missed.message).toMatch(/Fix:  run `epic plugin install`/)
  })

  test("withMissed():  added after what the prompt hook says;  a blocked prompt left as it is", () => {
    const missed = { name: "x", problem: null, message: "MISSED" }
    expect(SessionMoves.withMissed(null, missed)).toEqual({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: "MISSED" },
      systemMessage: "MISSED"
    })
    const renamed = { hookSpecificOutput: { hookEventName: "UserPromptSubmit" as const, sessionTitle: "🚧 x" } }
    expect(SessionMoves.withMissed(renamed, missed)).toEqual({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", sessionTitle: "🚧 x", additionalContext: "MISSED" },
      systemMessage: "MISSED"
    })
    const blocked = { decision: "block" as const, reason: "no" }
    expect(SessionMoves.withMissed(blocked, missed)).toBe(blocked)
    expect(SessionMoves.withMissed(renamed, null)).toBe(renamed)
  })

  test("the prompt hook:  marks the session, and says the move left waiting at the next prompt", () => {
    recordMove()
    const input = JSON.stringify({ prompt: "carry on", cwd: top, session_id: SESSION })
    const env = {
      ...process.env,
      CLAUDE_CONFIG_DIR: home,
      SPELL_EPIC_WINDOWS_DIR: registry,
      SPELL_WINDOWS_DIR: registry
    }
    const run = spawnSync(process.execPath, [HOOK], { input, encoding: "utf8", env })
    expect(run.status).toBe(0)
    const answer = JSON.parse(run.stdout)
    expect(answer.systemMessage).toMatch(/was to move to ⎇ elemental-spell's window .* and didn't/)
    expect(answer.hookSpecificOutput.additionalContext).toBe(answer.systemMessage)
    expect(existsSync(join(registry, "hooks-seen", SESSION))).toBe(true)
    expect(existsSync(moves().handoffFile(SESSION))).toBe(false)
  })
})
