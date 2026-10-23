import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { commandNames, commandSources, commandsCommand, pageNames } from "spell/cli/commands/commandsCommand"

/** A fake kit and home folder, written once for every test. */
const ROOT = mkdtempSync(join(tmpdir(), "commands-kit-"))
const HOME = mkdtempSync(join(tmpdir(), "commands-home-"))
afterAll(() => {
  rmSync(ROOT, { recursive: true, force: true })
  rmSync(HOME, { recursive: true, force: true })
})

// what marks a kit (`CLI.findCheckout(CLI.KIT_MARKER)`), and lists its child repos
write(ROOT, "repos.json5", "{ repos: [{ name: 'spell-parser' }, { name: 'spell-ui' }, { name: 'spell-epic' }] }")
write(ROOT, "package.json", {
  name: "spell",
  spell: { commands: "./cli/commands.ts" },
  scripts: { "/////// SECTION": "", ts: "tsc", server: "node server.mjs" }
})
write(
  ROOT,
  "cli/commands.ts",
  'const server = spell\n  .command("server")\nserver.command("start")\nspell.command("pony")\n'
)
write(ROOT, "spell-parser/package.json", {
  name: "spell-parser",
  spell: { commands: "./cli/commands.ts" },
  scripts: { test: "x" }
})
write(ROOT, "spell-parser/cli/commands.ts", 'spell\n  .command("compile")\n')
write(ROOT, "spell-ui/package.json", { name: "spell-ui" })
write(ROOT, "spell-ui/site/package.json", { scripts: { dev: "astro dev" } })
// the `epic` command's verbs and the plugin's skills:  spell-epic's
write(ROOT, "spell-epic/package.json", { name: "spell-epic" })
write(
  ROOT,
  "spell-epic/src/cli/EpicProgram.ts",
  'epic\n  .command("send")\nconst inbox = epic.command("inbox")\ninbox.command("watch")\n'
)
write(ROOT, "spell-epic/skills/epic/SKILL.md", "---\nname: epic\n---")
write(ROOT, ".claude/skills/isolate/SKILL.md", "---\nname: isolate\n---")
write(ROOT, ".claude/skills/solid-2/SKILL.md", "---\nname: solid-2\n---")
write(HOME, ".claude/skills/session/SKILL.md", "---\nname: session\n---")
write(HOME, ".claude/skills/graphify/SKILL.md", "---\nname: graphify\n---")

describe("commandSources()", () => {
  const names = commandSources(ROOT, { userSkills: ["session"], ignore: ["/solid-2"] }, HOME).map((it) => it.name)

  test("every command, by surface then name, in the page's name form", () => {
    expect(names).toEqual([
      "epic inbox",
      "epic send",
      "spell compile",
      "spell pony",
      "spell server",
      "spell server start",
      "/epic",
      "/isolate",
      "/session",
      "root server",
      "root ts",
      "spell-parser test",
      "ui-site dev"
    ])
  })
  test("skips section labels, ignored commands and user skills not asked for", () => {
    expect(names).not.toContain("root /////// SECTION")
    expect(names).not.toContain("/solid-2")
    expect(names).not.toContain("/graphify")
  })
})

describe("commandNames()", () => {
  test("a group's own commands go under its name, however deep;  another receiver's are left out", () => {
    const text = [
      'const app = spell.command("app")',
      'app.command("create")',
      'const vscode = app\n  .command("vscode")',
      'vscode.command("build")',
      'other.command("nope")'
    ].join("\n")
    expect(commandNames(text, "spell", true)).toEqual([
      "spell app",
      "spell app create",
      "spell app vscode",
      "spell app vscode build"
    ])
    expect(commandNames(text, "spell", false)).toEqual(["spell app"])
  })
})

describe("pageNames()", () => {
  test("every name in any surface's cell, one or many", () => {
    const names = pageNames({
      families: [{ rows: [{ cli: { names: "spell compile" }, yarn: { names: ["root ts", "spell-parser test"] } }, {}] }]
    })
    expect([...names].sort()).toEqual(["root ts", "spell compile", "spell-parser test"])
  })
})

describe("the commands page's data (epic `epic-workflow` P21)", () => {
  /** `spell commands list --json` in kit `ROOT`:  what it printed, parsed. */
  async function listed(): Promise<{ commands: { name: string; named: boolean }[] }> {
    const printed: string[] = []
    const out = vi.spyOn(process.stdout, "write").mockImplementation((text) => {
      printed.push(String(text))
      return true
    })
    const cwd = process.cwd()
    process.chdir(ROOT)
    try {
      expect(await commandsCommand("list", { json: true })).toBe(0)
    } finally {
      process.chdir(cwd)
      out.mockRestore()
    }
    return JSON.parse(printed.join(""))
  }

  test("its old commands.json still read;  commands.json5 first, comments and all", async () => {
    const page = { families: [{ rows: [{ cli: { names: "spell compile" } }] }] }
    write(ROOT, "guides/dev/commands/commands.json", page)
    expect((await listed()).commands.find((it) => it.name === "spell compile")?.named).toBe(true)
    write(ROOT, "guides/dev/commands/commands.json5", `// Owen:  the rows\n${JSON.stringify({ families: [] })}`)
    expect((await listed()).commands.find((it) => it.name === "spell compile")?.named).toBe(false)
  })

  // epic `epic-eject` P12:  no `guides` link at the checkout's root
  test("read from the shared content folder, not the checkout", async () => {
    const content = mkdtempSync(join(tmpdir(), "commands-content-"))
    const page = { families: [{ rows: [{ cli: { names: "spell compile" } }] }] }
    write(content, "guides/dev/commands/commands.json5", page)
    vi.stubEnv("SPELL_SHARED_DIR", content)
    try {
      expect((await listed()).commands.find((it) => it.name === "spell compile")?.named).toBe(true)
    } finally {
      vi.unstubAllEnvs()
      rmSync(content, { recursive: true, force: true })
    }
  })
})

/** Write `content` (an object as JSON) to `path` under `root`, making its folders. */
function write(root: string, path: string, content: string | object) {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), typeof content === "string" ? content : JSON.stringify(content))
}
