import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, join } from "path"
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import { wwodInit } from "spell/cli/commands/wwodCommand"
import {
  agentRuleChangeLines,
  BLOCK_END,
  BLOCK_START,
  currentAgentRules,
  planAgentRules,
  rulesFolderFor,
  usesSolid,
  writeAgentRules
} from "spell/cli/commands/wwodInit"

/** Where an installed `spell` keeps its rules. */
const FOLDER = "node_modules/spell/agents"

/** A throwaway project, made fresh for each test:  `spell` installed, so its rules are there. */
let project: string

beforeEach(() => {
  project = realpathSync(mkdtempSync(join(tmpdir(), "wwod-init-")))
  put("package.json", JSON.stringify({ name: "acme" }))
  put(`${FOLDER}/wwod/WWOD.md`, "# WWOD\n")
  put(`${FOLDER}/wwod/code-is-the-spec.md`, "# §21\n")
  put(`${FOLDER}/solid/solid-2.md`, "# Solid 2\n")
})
afterEach(() => {
  vi.restoreAllMocks()
  rmSync(project, { recursive: true, force: true })
})

describe("rulesFolderFor()", () => {
  test("an installed spell's;  the kit's own `agents/`;  none without spell", () => {
    expect(rulesFolderFor(project)).toBe(FOLDER)
    put("package.json", JSON.stringify({ name: "spell" }))
    put("agents/wwod/WWOD.md", "# WWOD\n")
    expect(rulesFolderFor(project)).toBe("agents")
    rmSync(join(project, "node_modules"), { recursive: true })
    put("package.json", JSON.stringify({ name: "acme" }))
    expect(rulesFolderFor(project)).toBeUndefined()
  })
})

describe("usesSolid()", () => {
  test("solid-js in any dependencies", () => {
    expect(usesSolid(project)).toBe(false)
    put("package.json", JSON.stringify({ devDependencies: { "solid-js": "2.0.0" } }))
    expect(usesSolid(project)).toBe(true)
  })
})

describe("planAgentRules()", () => {
  test("no CLAUDE.md:  created, with the block;  AGENTS.md left out when there's none", () => {
    const changes = planAgentRules(project, picks("wwod", "solid"), FOLDER)
    expect(changes).toEqual([
      {
        file: "CLAUDE.md",
        created: true,
        changed: true,
        added: ["wwod", "solid"],
        removed: [],
        text: [BLOCK_START, `@${FOLDER}/wwod/WWOD.md`, `@${FOLDER}/solid/solid-2.md`, BLOCK_END, ""].join("\n"),
        notes: []
      }
    ])
  })

  test("with AGENTS.md:  a new CLAUDE.md loads it first;  AGENTS.md's block goes after its title", () => {
    put("AGENTS.md", "# Acme\n\nOur rules.\n")
    writeAgentRules(project, planAgentRules(project, picks("wwod"), FOLDER))
    expect(read("CLAUDE.md")).toBe(`@AGENTS.md\n\n${BLOCK_START}\n@${FOLDER}/wwod/WWOD.md\n${BLOCK_END}\n`)
    expect(read("AGENTS.md")).toBe(
      [
        "# Acme",
        "",
        BLOCK_START,
        `**ALWAYS, before any code:  READ \`${FOLDER}/wwod/WWOD.md\`, the house style (WWOD).**`,
        BLOCK_END,
        "",
        "Our rules.",
        ""
      ].join("\n")
    )
  })

  test("run again:  already right;  then a rule added and one removed, in the same block", () => {
    put("AGENTS.md", "# Acme\n")
    writeAgentRules(project, planAgentRules(project, picks("wwod", "solid"), FOLDER))
    const again = planAgentRules(project, picks("wwod", "solid"), FOLDER)
    expect(again.map(({ changed }) => changed)).toEqual([false, false])
    expect(agentRuleChangeLines(again)).toEqual(["CLAUDE.md:  already right", "AGENTS.md:  already right"])
    const swapped = planAgentRules(project, picks("wwod", "code-is-the-spec"), FOLDER)
    expect(agentRuleChangeLines(swapped, { dryRun: true })).toEqual([
      "CLAUDE.md:  would add §21, the code is the spec;  would remove the Solid 2 rules",
      "AGENTS.md:  would add §21, the code is the spec;  would remove the Solid 2 rules"
    ])
    writeAgentRules(project, swapped)
    expect(read("CLAUDE.md").split(BLOCK_START)).toHaveLength(2)
    expect(read("CLAUDE.md")).toContain(`@${FOLDER}/wwod/code-is-the-spec.md\n${BLOCK_END}`)
    expect(read("CLAUDE.md")).not.toContain("solid-2.md")
  })

  test("nothing picked:  the blocks go, and the file around them stays", () => {
    put("CLAUDE.md", "# Notes\n")
    put("AGENTS.md", "# Acme\n\nOur rules.\n")
    writeAgentRules(project, planAgentRules(project, picks("wwod"), FOLDER))
    writeAgentRules(project, planAgentRules(project, picks(), FOLDER))
    expect(read("CLAUDE.md")).toBe("# Notes\n")
    expect(read("AGENTS.md")).toBe("# Acme\n\nOur rules.\n")
  })

  test("a hand-written @-line in CLAUDE.md:  kept when wanted, not repeated;  removed when not", () => {
    put("CLAUDE.md", `@AGENTS.md\n\n@${FOLDER}/wwod/WWOD.md\n\n@${FOLDER}/wwod/code-is-the-spec.md\n\nMore.\n`)
    expect(currentAgentRules(project, FOLDER)).toEqual({ wwod: true, solid: false, "code-is-the-spec": true })
    expect(planAgentRules(project, picks("wwod", "code-is-the-spec"), FOLDER)[0]!.changed).toBe(false)
    const [claude] = planAgentRules(project, picks("wwod", "solid"), FOLDER)
    expect(claude).toMatchObject({ added: ["solid"], removed: ["code-is-the-spec"] })
    expect(claude!.text).toBe(
      `@AGENTS.md\n\n@${FOLDER}/wwod/WWOD.md\n\nMore.\n\n${BLOCK_START}\n@${FOLDER}/solid/solid-2.md\n${BLOCK_END}\n`
    )
  })

  test("AGENTS.md naming a rule by hand:  not repeated when wanted;  a note when not", () => {
    put("AGENTS.md", `# Acme\n\nREAD \`${FOLDER}/solid/solid-2.md\` first.\n`)
    const [, agents] = planAgentRules(project, picks("wwod"), FOLDER)
    expect(agents!.text).not.toContain("IN FULL")
    expect(agents!.notes).toEqual(["still names the Solid 2 rules outside the block:  remove that line by hand"])
  })
})

describe("wwodInit()", () => {
  test("--yes in a new project:  WWOD, Solid when it uses solid-js, never §21", async () => {
    put("package.json", JSON.stringify({ dependencies: { "solid-js": "2.0.0" } }))
    const printed = quietly()
    expect(await wwodInit({ yes: true }, project)).toBe(CLI.EXIT.OK)
    expect(printed()).toEqual(["CLAUDE.md:  created;  added WWOD, the Solid 2 rules"])
    expect(currentAgentRules(project, FOLDER)).toEqual({ wwod: true, solid: true, "code-is-the-spec": false })
  })

  test("flags win;  the rest keep what the project has;  --dry-run writes nothing", async () => {
    quietly()
    await wwodInit({ yes: true, solid: true }, project)
    await wwodInit({ yes: true, codeIsTheSpec: true, dryRun: true }, project)
    expect(currentAgentRules(project, FOLDER)).toEqual({ wwod: true, solid: true, "code-is-the-spec": false })
    await wwodInit({ yes: true, codeIsTheSpec: true }, project)
    expect(currentAgentRules(project, FOLDER)).toEqual({ wwod: true, solid: true, "code-is-the-spec": true })
    await wwodInit({ yes: true, wwod: false }, project)
    expect(currentAgentRules(project, FOLDER)).toEqual({ wwod: false, solid: true, "code-is-the-spec": false })
  })

  test("no terminal, no --yes:  asks nothing, takes the suggestions", async () => {
    quietly()
    await wwodInit({}, project)
    expect(currentAgentRules(project, FOLDER)).toEqual({ wwod: true, solid: false, "code-is-the-spec": false })
  })

  test("spell not installed:  a CliError saying what to install", async () => {
    rmSync(join(project, "node_modules"), { recursive: true })
    await expect(wwodInit({ yes: true }, project)).rejects.toThrow(/npm install --save-dev spell@next/)
    expect(existsSync(join(project, "CLAUDE.md"))).toBe(false)
  })
})

////////////////
// ## Helpers
////////////////

/** Picks with just `ids` on. */
function picks(...ids: string[]) {
  return {
    wwod: ids.includes("wwod"),
    solid: ids.includes("solid"),
    "code-is-the-spec": ids.includes("code-is-the-spec")
  }
}

/** Write `text` to `path` in the project, making its folders. */
function put(path: string, text: string): void {
  mkdirSync(dirname(join(project, path)), { recursive: true })
  writeFileSync(join(project, path), text)
}

/** The project's file at `path`. */
function read(path: string): string {
  return readFileSync(join(project, path), "utf8")
}

/** Keep `CLI.out()` off the test's output;  what it printed, line by line. */
function quietly(): () => string[] {
  const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
  return () => write.mock.calls.map(([text]) => String(text).replace(/\n$/, ""))
}
