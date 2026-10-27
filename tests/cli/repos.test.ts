import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { CLI } from "spell/cli"

/**
 * A made-up kit:  its folders (its `workspaces`, epic `repo-split` P20), one with no `"spell"`, one not there at all.
 */
const KIT = mkdtempSync(join(tmpdir(), "spell-repos-"))
afterAll(() => rmSync(KIT, { recursive: true, force: true }))

write("repos.json5", "{ repos: [] }")
write("package.json", {
  name: "spell",
  version: "1.2.3",
  workspaces: ["parser", "ui", "gone", "app"],
  spell: { commands: "./cli/commands.ts" }
})
write("parser/package.json", { name: "spell-parser", spell: { commands: "./cli/commands.ts" } })
write("ui/package.json", { name: "spell-ui" })
write("app/package.json", { name: "spell-app", spell: { commands: "./cli/commands.ts", hooks: "./cli/hooks.ts" } })
write("app/cli/hooks.ts", 'export default { greeting: async () => "hello", other: async () => "other" }\n')

describe("spellRepos()", () => {
  test("the kit, then each of its folders with a `spell` entry, in its `workspaces` order", () => {
    const repos = CLI.spellRepos(KIT)
    expect(repos.map((repo) => [repo.name, repo.short])).toEqual([
      ["spell", "kit"],
      ["spell-parser", "parser"],
      ["spell-app", "app"]
    ])
    expect(repos[0]).toMatchObject({ version: "1.2.3", commands: join(KIT, "cli/commands.ts") })
    expect(repos[2]!.hooks).toBe(join(KIT, "app/cli/hooks.ts"))
  })
})

describe("spellRepos(), the kit installed from npm", () => {
  test("the same folders, inside the installed package", () => {
    const project = mkdtempSync(join(tmpdir(), "spell-installed-"))
    const kit = join(project, "node_modules", "spell")
    mkdirSync(join(kit, "parser"), { recursive: true })
    writeFileSync(
      join(kit, "package.json"),
      JSON.stringify({ name: "spell", workspaces: ["parser"], spell: { commands: "./c.js" } })
    )
    writeFileSync(join(kit, "parser", "package.json"), JSON.stringify({ name: "spell-parser", spell: { commands: "./c.js" } }))
    expect(CLI.spellRepos(kit).map((repo) => repo.root)).toEqual([kit, join(kit, "parser")])
    rmSync(project, { recursive: true, force: true })
  })
})

describe("hook() / needHook()", () => {
  test("the first repo's hook by that name, loaded;  none:  undefined, or needHook's CliError", async () => {
    const repos = CLI.spellRepos(KIT)
    expect(await CLI.hook<string>("greeting", repos)).toBe("hello")
    expect(await CLI.hook("nope", repos)).toBeUndefined()
    await expect(CLI.needHook("nope", "clone spell-app")).rejects.toThrow(new CLI.CliError("clone spell-app"))
  })
})

/** Write `content` (an object as JSON) to `path` in the kit, making its folders. */
function write(path: string, content: string | object) {
  mkdirSync(dirname(join(KIT, path)), { recursive: true })
  writeFileSync(join(KIT, path), typeof content === "string" ? content : JSON.stringify(content))
}
