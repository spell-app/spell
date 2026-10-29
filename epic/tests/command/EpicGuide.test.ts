/**
 * Tests of `epic guide` (`EpicGuide`, epic `epic-friend` P11):  the epic workflow for any agent, printed from the epic
 * skill's own `guide.md`.
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, test, vi } from "vite-plus/test"

import { EpicProgram } from "spell/epic/cli/EpicProgram"
import { EpicGuide } from "spell/epic/command/EpicGuide"

/** The topics the guide must have:  the loop's steps, and the Claude-only tools the next phase's skills point at. */
const TOPICS = ["workflow", "find", "plan", "build", "review", "turn", "done", "claude-only-tools"]

const guide = new EpicGuide()

/** What `epic guide <args>` prints. */
async function printed(args: string[]): Promise<string> {
  const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
  try {
    expect(await guide.run(args)).toBe(0)
    return out.mock.calls.map(([text]) => String(text)).join("")
  } finally {
    out.mockRestore()
  }
}

describe("EpicGuide", () => {
  test("its topics, in order, each with a title", () => {
    expect(guide.topics.map((topic) => topic.id)).toEqual(TOPICS)
    for (const topic of guide.topics) expect(topic.title).not.toBe("")
  })

  test("epic guide:  the lead, the loop, then every other topic listed", async () => {
    const text = await printed([])
    expect(text).toMatch(/^# Working an epic, with any agent\n/)
    expect(text).toContain("## workflow -- The loop, start to finish")
    expect(text).toContain("5. End EVERY turn with `epic turn end`")
    for (const id of TOPICS.slice(1)) expect(text).toMatch(new RegExp(`\\n  ${id} +\\S`))
    expect(text).not.toContain("## build")
  })

  test("epic guide <topic>:  that topic alone;  claude-only-tools is the table of plain fallbacks", async () => {
    const text = await printed(["claude-only-tools"])
    expect(text).toMatch(/^## claude-only-tools -- /)
    expect(text).toContain("| the question modal (`AskUserQuestion`) |")
    expect(text).toContain("`epic inbox wait <epic>`")
    expect(text).not.toContain("## turn")
    expect(await printed(["TURN"])).toContain("epic turn end")
  })

  test("--list, --path, --root;  an unknown topic is refused, naming the topics", async () => {
    expect((await printed(["--list"])).trim().split("\n")).toHaveLength(TOPICS.length)
    expect(await printed(["--path"])).toMatch(/skills\/epic\/guide\.md\n$/)
    // the plugin's folder, for a skill's ${CLAUDE_PLUGIN_ROOT} (epic `epic-friend` P12):  it holds the skills
    const root = (await printed(["--root"])).trim()
    expect(existsSync(join(root, "skills", "epic", "guide.md"))).toBe(true)
    expect(existsSync(join(root, ".codex-plugin", "plugin.json"))).toBe(true)
    await expect(guide.run(["bogus"])).rejects.toThrow(/no such topic.*workflow, find/)
  })

  test("ONE copy:  the epic skill links the guide beside it", () => {
    const skill = readFileSync(guide.file.replace(/guide\.md$/, "SKILL.md"), "utf8")
    expect(skill).toContain("[guide.md](guide.md)")
  })

  test("every `epic <verb>` it tells an agent to run is a real verb", () => {
    const program = new EpicProgram()
    const verbs = new Map(program.epic.commands.map((verb) => [verb.name(), verb]))
    const said = readFileSync(guide.file, "utf8").matchAll(/(?:^|`|\n\s*)epic ([a-z-]+)(?: ([a-z-]+))?/g)
    const unknown: string[] = []
    for (const [, verb, sub] of said) {
      const found = verbs.get(verb!)
      if (!found) unknown.push(verb!)
      // a group's verb:  `epic inbox wait`, `epic turn end`, `epic ask create`
      else if (sub && found.commands.length && !found.commands.some((each) => each.name() === sub))
        unknown.push(`${verb} ${sub}`)
    }
    expect(unknown).toEqual([])
  })
})
