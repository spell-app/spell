import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { ClaudeHome } from "spell/epic/config/ClaudeHome"

/** A throwaway Claude Code folder:  never the real `~/.claude`. */
const HOME = realpathSync(mkdtempSync(join(tmpdir(), "claude-home-")))
afterAll(() => rmSync(HOME, { recursive: true, force: true }))

describe("ClaudeHome", () => {
  // epic `coherence` P20:  three variables named it, and the readers could disagree
  test("home():  $CLAUDE_CONFIG_DIR when set, else ~/.claude;  every reader's one rule", () => {
    const before = process.env.CLAUDE_CONFIG_DIR
    process.env.CLAUDE_CONFIG_DIR = HOME
    try {
      expect(ClaudeHome.home()).toBe(HOME)
      expect(ClaudeHome.projects()).toBe(join(HOME, "projects"))
      expect(ClaudeHome.titlesFolder()).toBe(join(HOME, "session-titles"))
      delete process.env.CLAUDE_CONFIG_DIR
      expect(ClaudeHome.home()).toMatch(/\/\.claude$/)
    } finally {
      if (before === undefined) delete process.env.CLAUDE_CONFIG_DIR
      else process.env.CLAUDE_CONFIG_DIR = before
    }
  })

  test("projectFolders():  each real folder once, a linked worktree's skipped;  a link to an unlisted folder kept", () => {
    const projects = join(HOME, "listing")
    mkdirSync(join(projects, "-main"), { recursive: true })
    mkdirSync(join(projects, "-other"), { recursive: true })
    symlinkSync(join(projects, "-main"), join(projects, "-main-worktrees-seo"))
    mkdirSync(join(HOME, "outside"), { recursive: true })
    symlinkSync(join(HOME, "outside"), join(projects, "-moved"))
    symlinkSync(join(HOME, "nowhere"), join(projects, "-dangling"))
    writeFileSync(join(projects, "notes.txt"), "not a folder")
    expect(ClaudeHome.projectFolders(projects)).toEqual(["-main", "-moved", "-other"])
    expect(ClaudeHome.projectFolders(join(HOME, "missing"))).toEqual([])
  })

  test("transcripts(), transcriptOf():  every transcript once;  one session's newest copy", () => {
    const home = join(HOME, "transcripts")
    const write = (folder: string, id: string, at: number) => {
      mkdirSync(join(home, "projects", folder), { recursive: true })
      const file = join(home, "projects", folder, `${id}.jsonl`)
      writeFileSync(file, "{}\n")
      utimesSync(file, at, at)
    }
    write("-a", "s1", 1000)
    write("-b", "s1", 2000)
    write("-b", "s2", 1000)
    expect(ClaudeHome.transcriptOf("s1", home)).toBe(join(home, "projects", "-b", "s1.jsonl"))
    expect(ClaudeHome.transcriptOf("none", home)).toBeUndefined()
    expect(ClaudeHome.transcripts(home).sort()).toEqual(
      [
        join(home, "projects", "-a", "s1.jsonl"),
        join(home, "projects", "-b", "s1.jsonl"),
        join(home, "projects", "-b", "s2.jsonl")
      ].sort()
    )
  })

  test("liveSessions():  the registry's records whose process runs;  a half-written one, or one with no id, skipped", () => {
    const home = join(HOME, "live")
    mkdirSync(join(home, "sessions"), { recursive: true })
    const record = (pid: number, entry: object) =>
      writeFileSync(join(home, "sessions", `${pid}.json`), JSON.stringify({ pid, ...entry }))
    record(1, { sessionId: "running", name: "🚧 seo", cwd: "/repo" })
    record(2, { sessionId: "gone" })
    record(3, {})
    writeFileSync(join(home, "sessions", "4.json"), '{"pid":4,"sessionId"')
    const live = ClaudeHome.liveSessions({ home, isAlive: (pid) => pid !== 2 })
    expect(live).toEqual([{ pid: 1, sessionId: "running", name: "🚧 seo", cwd: "/repo" }])
    expect(ClaudeHome.liveSessions({ home: join(HOME, "missing"), isAlive: () => true })).toEqual([])
  })
})
