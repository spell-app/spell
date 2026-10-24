import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { CLI } from "spell/cli"

/** A made-up kit:  three child repos, one installed as a package, one with no `"spell"`, one not there at all. */
const KIT = mkdtempSync(join(tmpdir(), "spell-repos-"))
afterAll(() => rmSync(KIT, { recursive: true, force: true }))

write(
  "repos.json5",
  "{ repos: [{ name: 'spell-parser' }, { name: 'spell-ui' }, { name: 'spell-gone' }, { name: 'spell-app' }] }"
)
write("package.json", { name: "spell", version: "1.2.3", spell: { commands: "./cli/commands.ts" } })
write("spell-parser/package.json", { name: "spell-parser", spell: { commands: "./cli/commands.ts" } })
write("spell-ui/package.json", { name: "spell-ui" })
write("node_modules/spell-app/package.json", {
  name: "spell-app",
  spell: { commands: "./cli/commands.ts", hooks: "./cli/hooks.ts" }
})
write(
  "node_modules/spell-app/cli/hooks.ts",
  'export default { greeting: async () => "hello", other: async () => "other" }\n'
)

describe("spellRepos()", () => {
  test("the kit, then each child repo with a `spell` entry, lowest first, in the kit or installed", () => {
    const repos = CLI.spellRepos(KIT)
    expect(repos.map((repo) => [repo.name, repo.short])).toEqual([
      ["spell", "kit"],
      ["spell-parser", "parser"],
      ["spell-app", "app"]
    ])
    expect(repos[0]).toMatchObject({ version: "1.2.3", commands: join(KIT, "cli/commands.ts") })
    expect(repos[2]!.hooks).toBe(join(KIT, "node_modules/spell-app/cli/hooks.ts"))
  })
})

describe("spellRepos(), the kit installed from npm", () => {
  test("each child repo beside it in node_modules", () => {
    const project = mkdtempSync(join(tmpdir(), "spell-installed-"))
    const kit = join(project, "node_modules", "spell")
    mkdirSync(kit, { recursive: true })
    writeFileSync(join(kit, "repos.json5"), "{ repos: [{ name: 'spell-parser' }, { name: 'spell-brand' }] }")
    writeFileSync(join(kit, "package.json"), JSON.stringify({ name: "spell", spell: { commands: "./c.js" } }))
    mkdirSync(join(project, "node_modules", "spell-parser"))
    writeFileSync(
      join(project, "node_modules", "spell-parser", "package.json"),
      JSON.stringify({ name: "spell-parser", spell: { commands: "./c.js" } })
    )
    expect(CLI.spellRepos(kit).map((repo) => repo.root)).toEqual([kit, join(project, "node_modules", "spell-parser")])
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
