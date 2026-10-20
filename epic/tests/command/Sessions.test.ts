import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { Sessions } from "$/epics/command/Sessions"

/** A fake `~/.claude`, and a folder that is NOT a git checkout to list sessions from. */
const HOME = mkdtempSync(join(tmpdir(), "claude-home-"))
const REPO = realpathSync(mkdtempSync(join(tmpdir(), "repo-")))
afterAll(() => {
  rmSync(HOME, { recursive: true, force: true })
  rmSync(REPO, { recursive: true, force: true })
})

const SLUG = Sessions.projectSlug(REPO)
const WORKTREE = `${REPO}/.claude/worktrees/seo`
transcript(SLUG, "aaaa1111", [
  {
    type: "user",
    entrypoint: "claude-vscode",
    cwd: REPO,
    timestamp: "2026-10-01T10:00:00Z",
    message: { content: "fix the parser" }
  },
  { type: "ai-title", aiTitle: "Parser fix" },
  {
    type: "user",
    cwd: WORKTREE,
    timestamp: "2026-10-01T11:00:00Z",
    message: { content: "<system-reminder>x</system-reminder>" }
  }
])
transcript(`${SLUG}--claude-worktrees-seo`, "bbbb2222", [
  {
    type: "user",
    entrypoint: "cli",
    cwd: REPO,
    timestamp: "2026-10-02T10:00:00Z",
    message: { content: "<command-name>/epic</command-name><command-args>seo</command-args>" }
  },
  { type: "custom-title", customTitle: "seo" },
  {
    type: "assistant",
    message: {
      content: [{ type: "tool_use", name: "AskUserQuestion", input: { questions: [{ question: "Which?" }] } }]
    }
  }
])
transcript("-elsewhere", "cccc3333", [
  { type: "user", entrypoint: "sdk-ts", cwd: "/elsewhere", message: { content: "from the SDK" } }
])
mkdirSync(join(HOME, "sessions"), { recursive: true })
writeFileSync(
  join(HOME, "sessions", `${process.pid}.json`),
  JSON.stringify({ pid: process.pid, sessionId: "aaaa1111", status: "busy" })
)
writeFileSync(join(HOME, "sessions", "1.json"), JSON.stringify({ pid: 999_999_999, sessionId: "dead" }))

describe("saved()", () => {
  const found = new Sessions({ home: HOME }).saved({ cwd: REPO })

  test("this repo's sessions, worktree folders too, newest first", () => {
    expect(found.map((it) => it.id).sort()).toEqual(["aaaa1111", "bbbb2222"])
  })
  test("title:  custom, else Claude's, else the first prompt;  cwd:  the latest", () => {
    const [parser] = found.filter((it) => it.id === "aaaa1111")
    expect(parser).toMatchObject({ title: "Parser fix", named: false, prompt: "fix the parser", cwd: WORKTREE })
    expect(found.find((it) => it.id === "bbbb2222")).toMatchObject({ title: "seo", named: true, prompt: "/epic seo" })
  })
  test("everywhere:  every project, but never SDK / web sessions", () => {
    expect(new Sessions({ home: HOME }).saved({ cwd: REPO, everywhere: true }).map((it) => it.id)).not.toContain(
      "cccc3333"
    )
  })
})

describe("running()", () => {
  test("only records whose process is alive", () => {
    expect([...new Sessions({ home: HOME }).running().keys()]).toEqual(["aaaa1111"])
  })
})

describe("named()", () => {
  test("by title, or by having worked in that worktree", () => {
    expect(
      new Sessions({ home: HOME })
        .named("seo")
        .map((it) => it.id)
        .sort()
    ).toEqual(["aaaa1111", "bbbb2222"])
    expect(new Sessions({ home: HOME }).named("nope")).toEqual([])
  })
})

describe("promptText()", () => {
  test("slash commands, reminders, harness messages", () => {
    expect(Sessions.promptText("<command-name>/park</command-name><command-args> later \n</command-args>")).toBe(
      "/park later"
    )
    expect(Sessions.promptText("hi <system-reminder>noise</system-reminder>")).toBe("hi")
    expect(Sessions.promptText("<task-notification>x</task-notification>")).toBeNull()
    expect(Sessions.promptText("Another Claude session sent a message:\n...")).toBeNull()
    expect(Sessions.promptText("Base directory for this skill: /x")).toBeNull()
    expect(Sessions.promptText("two\n\nlines")).toBe("two\n\nlines")
  })
})

describe("digest()", () => {
  test("prompts, and a question still waiting", () => {
    const digest = new Sessions({ home: HOME }).digest("bbbb")!
    expect(digest.prompts.map((it) => it.text)).toEqual(["/epic seo"])
    expect(digest.pending).toEqual([{ question: "Which?" }])
    expect(new Sessions({ home: HOME }).digest("zzzz")).toBeUndefined()
  })
})

// epic `epic-engine` r2:  a handoff's session showed Claude Code's own title, written AFTER its custom one, while
// `epic session title` said "already ... nothing to do"
describe("title <title>:  titled only when the tab shows it", () => {
  const custom = { type: "custom-title", customTitle: "🚧 editor" }
  const ai = { type: "ai-title", aiTitle: "Claude in Chrome browser automation" }
  // outside this repo's folders:  `saved()` above never sees them
  transcript("-titles", "t-custom-ai", [custom, ai])
  transcript("-titles", "t-ai-custom", [ai, custom])
  transcript("-titles", "t-custom", [custom])
  transcript("-titles", "t-resumed", [custom, ai])

  /** `epic session title <args>` run as session `id`:  what it printed, and what it queued. */
  async function title(id: string, ...args: string[]): Promise<{ said: string; queued: string | null }> {
    const said: string[] = []
    vi.stubEnv("CLAUDE_CODE_SESSION_ID", id)
    const write = vi.spyOn(process.stdout, "write").mockImplementation((text) => said.push(String(text)) > 0)
    try {
      expect(await new Sessions({ home: HOME }).run(["title", ...args])).toBe(0)
    } finally {
      write.mockRestore()
      vi.unstubAllEnvs()
    }
    const file = join(HOME, "session-titles", id)
    return { said: said.join(""), queued: existsSync(file) ? readFileSync(file, "utf8") : null }
  }

  test("custom, then Claude's own:  not titled, so queued", async () => {
    const { said, queued } = await title("t-custom-ai", "🚧 editor")
    expect(queued).toBe("🚧 editor")
    expect(said).toMatch(/queued "🚧 editor" for t-custom \(was "Claude in Chrome browser automation"\)/)
    // queued now:  nothing more to do
    expect((await title("t-custom-ai", "🚧 editor")).said).toMatch(/already "🚧 editor" \(queued\)/)
  })
  test("Claude's own, then custom;  custom alone:  titled, nothing queued", async () => {
    for (const id of ["t-ai-custom", "t-custom"]) {
      const { said, queued } = await title(id, "🚧 editor")
      expect(said).toMatch(/is already "🚧 editor":  nothing to do/)
      expect(queued).toBeNull()
    }
  })
  test("alone:  the title, and what its tab may show", async () => {
    expect((await title("t-resumed")).said).toBe('*🚧 editor  (its tab may show "Claude in Chrome browser automation")\n')
    expect((await title("t-custom")).said).toBe("*🚧 editor\n")
  })
  test("--force (Continue after a handoff, a resume):  queued whatever the tab seems to show", async () => {
    const { said, queued } = await title("t-custom", "--force", "🚧 editor")
    expect(queued).toBe("🚧 editor")
    expect(said).toMatch(/queued "🚧 editor" for t-custom/)
  })
})

/** Write transcript `<id>.jsonl` of `entries` into project folder `slug`. */
function transcript(slug: string, id: string, entries: object[]) {
  mkdirSync(join(HOME, "projects", slug), { recursive: true })
  writeFileSync(join(HOME, "projects", slug, `${id}.jsonl`), entries.map((it) => JSON.stringify(it)).join("\n"))
}
