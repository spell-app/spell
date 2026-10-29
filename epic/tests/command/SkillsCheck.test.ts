/**
 * Tests of `epic skills check` (`SkillsCheck`, epic `epic-friend` P12):  the plugin's ONE copy of each skill holds for
 * Claude Code and Codex alike.
 * - over the REAL skills:  this is what keeps them true, run by `yarn review`
 * - and over made-up skills in a scratch folder:  each kind of problem found
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { SkillsCheck, LIST_BUDGET, NEAR } from "spell/epic/command/SkillsCheck"

/** The five skills that stay Claude Code's (Q15 C, J29). */
const CLAUDE_ONLY = ["bedtime", "bg", "comment", "session", "title"]

const top = mkdtempSync(join(tmpdir(), "skills-check-"))
afterAll(() => rmSync(top, { recursive: true, force: true }))

/** A made-up skill `name` in folder `folder`:  its body, and its Codex settings file when given. */
function skill(folder: string, name: string, body: string, settings?: string): void {
  mkdirSync(join(folder, name, "agents"), { recursive: true })
  writeFileSync(
    join(folder, name, "SKILL.md"),
    `---\nname: ${name}\ndescription: Do ${name}.\n---\n\n# /${name}\n\n${body}`
  )
  if (settings) writeFileSync(join(folder, name, "agents", "openai.yaml"), settings)
}

/** `count` filler lines. */
const filler = (count: number) => Array.from({ length: count }, (_, at) => `- step ${at}`).join("\n")

describe("the real skills", () => {
  const report = new SkillsCheck().check()

  test("all 20 pass:  15 for both agents, the 5 Claude-only ones each with its Codex settings file", () => {
    expect(report.problems).toEqual([])
    expect(report.skills).toHaveLength(20)
    expect(report.skills.filter((each) => each.agents === "claude").map((each) => each.name)).toEqual(CLAUDE_ONLY)
    expect(report.budget.used).toBeLessThanOrEqual(LIST_BUDGET)
  })

  test("each Claude-only skill's openai.yaml turns off Codex picking it, and its first line says what to do", () => {
    for (const name of CLAUDE_ONLY) {
      const folder = join(report.folder, name)
      expect(readFileSync(join(folder, "agents", "openai.yaml"), "utf8")).toMatch(
        /^policy:\n {2}allow_implicit_invocation: false$/m
      )
      expect(readFileSync(join(folder, "SKILL.md"), "utf8")).toMatch(/\n# \/\w+\n\nIn Codex:  Claude Code only/)
    }
  })

  test("epic skills check prints the counts, and exits 0", async () => {
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    try {
      expect(await new SkillsCheck().run(["check"])).toBe(0)
      expect(out.mock.calls.map(([text]) => String(text)).join("")).toMatch(
        /^skills check:  20 skills, 15 for Claude Code and Codex, 5 Claude Code only \(bedtime, bg, comment, session, title\);.*all good\n$/
      )
    } finally {
      out.mockRestore()
    }
  })
})

describe("made-up skills", () => {
  test("a bare question-modal step fails;  an In Codex: line within reach passes;  one too far off fails", () => {
    const folder = join(top, "modal")
    skill(folder, "bare", "1. AskUserQuestion, yes / no:  go on?\n")
    skill(folder, "near", "1. AskUserQuestion, yes / no:  go on?\n   - In Codex:  ask in the chat, yes or no.\n")
    skill(folder, "far", `1. AskUserQuestion:  go on?\n${filler(NEAR + 1)}\n- In Codex:  ask in the chat.\n`)
    const { problems } = new SkillsCheck({ folder }).check()
    expect(problems).toEqual([
      { skill: "bare", line: 8, message: `names AskUserQuestion with no "In Codex:" line within ${NEAR} lines` },
      { skill: "far", line: 8, message: `names AskUserQuestion with no "In Codex:" line within ${NEAR} lines` }
    ])
  })

  test("each Claude-only tool is found:  the agent tool, background shells, worktree moves, messages, plan mode", () => {
    const { problems } = SkillsCheck.problemsIn(
      "tools",
      "---\nname: tools\ndescription: x\n---\n" +
        "an `Agent` call\nBash `run_in_background: true`\n`EnterWorktree`\n`SendMessage` to it\nin plan mode\n" +
        "${CLAUDE_PLUGIN_ROOT}/x.md\n"
    )
    expect(problems.map((problem) => problem.message.split(" with ")[0])).toEqual([
      "names the Agent tool",
      "names run_in_background",
      "names EnterWorktree",
      "names SendMessage",
      "names plan mode",
      "names ${CLAUDE_PLUGIN_ROOT}"
    ])
  })

  test("a Claude-only skill needs its openai.yaml;  the yaml needs the note;  its steps aren't checked", () => {
    const folder = join(top, "claude-only")
    const note = "In Codex:  Claude Code only;  do it by hand.\n\n- AskUserQuestion, then `Agent`\n"
    skill(folder, "kept", note, "policy:\n  allow_implicit_invocation: false\n")
    skill(folder, "noyaml", note)
    skill(folder, "nonote", "- In Codex:  nothing to do\n", "policy:\n  allow_implicit_invocation: false\n")
    const { problems, skills } = new SkillsCheck({ folder }).check()
    expect(skills.map((each) => [each.name, each.agents])).toEqual([
      ["kept", "claude"],
      ["nonote", "both"],
      ["noyaml", "claude"]
    ])
    expect(problems.map((problem) => `${problem.skill}:  ${problem.message.slice(0, 28)}`)).toEqual([
      `nonote:  turns off Codex's picking it`,
      "noyaml:  is Claude Code only, but has"
    ])
  })

  test("a wrong name, a description past the format's limit, and the list over Codex's budget", () => {
    const long = "x".repeat(1100)
    const { problems } = SkillsCheck.problemsIn("mine", `---\nname: other\ndescription: ${long}\n---\nbody\n`)
    expect(problems.map((problem) => problem.message)).toEqual([
      "its front matter's name is 'other', not its folder's 'mine'",
      "its description is 1100 characters, over the skill format's 1024"
    ])
    const folder = join(top, "budget")
    for (let at = 0; at < 9; at++) {
      mkdirSync(join(folder, `s${at}`), { recursive: true })
      writeFileSync(join(folder, `s${at}`, "SKILL.md"), `---\nname: s${at}\ndescription: ${"y".repeat(1000)}\n---\n`)
    }
    expect(new SkillsCheck({ folder }).check().problems).toEqual([
      expect.objectContaining({ skill: "*", message: expect.stringMatching(/9018 characters, over its 8000/) })
    ])
  })

  test("run() exits 1 with a problem, listing it;  an unknown verb is refused", async () => {
    const folder = join(top, "modal")
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    try {
      expect(await new SkillsCheck({ folder }).run(["check"])).toBe(1)
      expect(out.mock.calls.map(([text]) => String(text)).join("")).toContain(
        `  skills/bare/SKILL.md:8  names AskUserQuestion with no "In Codex:" line within ${NEAR} lines`
      )
    } finally {
      out.mockRestore()
    }
    await expect(new SkillsCheck({ folder }).run(["lint"])).rejects.toThrow(/epic skills check/)
  })
})

describe("the Codex manifest", () => {
  test("points at the same skills folder Claude Code's plugin reads, and is versioned with it", () => {
    const engine = join(new SkillsCheck().folder, "..")
    const codex = JSON.parse(readFileSync(join(engine, ".codex-plugin", "plugin.json"), "utf8"))
    const claude = JSON.parse(readFileSync(join(engine, ".claude-plugin", "plugin.json"), "utf8"))
    expect(join(engine, codex.skills)).toBe(`${new SkillsCheck().folder}/`)
    expect(codex).toMatchObject({ name: claude.name, version: claude.version, hooks: "./hooks/codex-hooks.json" })
  })
})
