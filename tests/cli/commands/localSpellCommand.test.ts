import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import { localSpellCommand } from "spell/cli/commands/localSpellCommand"
import { kitSetting } from "spell/cli/kitCheckout"

/** A made-up project (a git repo) and a made-up, installed checkout beside it. */
const root = realpathSync(mkdtempSync(join(tmpdir(), "local-spell-")))
const project = join(root, "acme-spell")
const checkout = join(root, "spell")
afterAll(() => rmSync(root, { recursive: true, force: true }))

/** `files` (path => text) written under `dir`. */
function write(dir: string, files: Record<string, string>): void {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
}

write(checkout, { "package.json": JSON.stringify({ name: "spell" }), "bin/spell.mjs": "", "node_modules/tsx/x": "" })
write(project, { "package.json": "{}", ".gitignore": "node_modules/" })
spawnSync("git", ["init", "-q"], { cwd: project })

/** What the command printed. */
const printed: string[] = []

beforeEach(() => {
  printed.length = 0
  vi.spyOn(CLI, "out").mockImplementation((text) => void printed.push(text))
  vi.stubEnv("INIT_CWD", project)
  vi.stubEnv("SPELL_KIT", "")
})

describe("spell dev local-spell", () => {
  test("names the checkout in the project's own file, and keeps it out of git", async () => {
    expect(await localSpellCommand(checkout)).toBe(CLI.EXIT.OK)
    expect(kitSetting(project, {})?.kit).toBe(checkout)
    expect(readFileSync(join(project, ".gitignore"), "utf8")).toContain("\n/.spell/\n")
    expect(spawnSync("git", ["check-ignore", "-q", ".spell/kit.json5"], { cwd: project }).status).toBe(0)
    expect(printed[0]).toContain("Here, spell runs your checkout now")
  })

  test("run again:  .gitignore left as it is", async () => {
    const before = readFileSync(join(project, ".gitignore"), "utf8")
    await localSpellCommand(checkout)
    expect(readFileSync(join(project, ".gitignore"), "utf8")).toBe(before)
  })

  test("--status says which Spell runs, and why", async () => {
    expect(await localSpellCommand(undefined, { status: true })).toBe(CLI.EXIT.OK)
    expect(printed[0]).toMatch(/Here, spell runs your checkout:  .*spell \(named by .*kit\.json5\)/)
  })

  test("a checkout that isn't installed:  nothing written", async () => {
    const fresh = join(root, "fresh")
    write(fresh, { "package.json": JSON.stringify({ name: "spell" }), "bin/spell.mjs": "" })
    await expect(localSpellCommand(fresh)).rejects.toThrow("isn't installed yet")
    expect(kitSetting(project, {})?.kit).toBe(checkout)
  })

  test("--off:  npm's spell again", async () => {
    expect(await localSpellCommand(undefined, { off: true })).toBe(CLI.EXIT.OK)
    expect(existsSync(join(project, ".spell", "kit.json5"))).toBe(false)
    expect(kitSetting(project, {})).toBeUndefined()
    await localSpellCommand(undefined, { status: true })
    expect(printed.at(-1)).toContain("npm's copy")
  })
})
