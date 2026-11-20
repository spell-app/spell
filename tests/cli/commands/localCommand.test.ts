import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import { localCommand } from "spell/cli/commands/localCommand"
import { kitSetting } from "spell/cli/kitCheckout"

/** A made-up project (a git repo) and a made-up, installed checkout beside it. */
const root = realpathSync(mkdtempSync(join(tmpdir(), "spell-local-")))
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
  // NEVER the real ~/.local/bin or ~/.spell/:  `spell local on` links `spell` there (`PathLink`)
  vi.stubEnv("HOME", join(root, "home"))
  vi.stubEnv("SPELL_BIN_DIR", join(root, "bin"))
})

describe("spell local", () => {
  test("names the checkout in the project's own file, and keeps it out of git", async () => {
    expect(await localCommand("on", checkout)).toBe(CLI.EXIT.OK)
    expect(kitSetting(project, {})?.kit).toBe(checkout)
    expect(readFileSync(join(project, ".gitignore"), "utf8")).toContain("\n/.spell/\n")
    expect(spawnSync("git", ["check-ignore", "-q", ".spell/kit.json5"], { cwd: project }).status).toBe(0)
    expect(printed[0]).toContain("Here, spell runs your checkout now")
    expect(realpathSync(join(root, "bin", "spell"))).toBe(join(checkout, "bin", "spell.mjs"))
    expect(printed).toContain(`- typing spell runs your checkout now, from any folder (${join(root, "bin", "spell")})`)
  })

  test("run again:  .gitignore left as it is", async () => {
    const before = readFileSync(join(project, ".gitignore"), "utf8")
    await localCommand("on", checkout)
    expect(readFileSync(join(project, ".gitignore"), "utf8")).toBe(before)
  })

  test("status (the default) says which Spell runs, and why", async () => {
    expect(await localCommand()).toBe(CLI.EXIT.OK)
    expect(printed[0]).toMatch(/Here, spell runs your checkout:  .*spell \(named by .*kit\.json5\)/)
  })

  test("a checkout that isn't installed:  nothing written", async () => {
    const fresh = join(root, "fresh")
    write(fresh, { "package.json": JSON.stringify({ name: "spell" }), "bin/spell.mjs": "" })
    await expect(localCommand("on", fresh)).rejects.toThrow("isn't installed yet")
    expect(kitSetting(project, {})?.kit).toBe(checkout)
  })

  test("off:  npm's spell again", async () => {
    expect(await localCommand("off")).toBe(CLI.EXIT.OK)
    expect(existsSync(join(project, ".spell", "kit.json5"))).toBe(false)
    expect(kitSetting(project, {})).toBeUndefined()
    expect(existsSync(join(root, "bin", "spell"))).toBe(false)
    await localCommand("status")
    expect(printed.join("\n")).toContain("npm's copy")
  })

  test("a checkout named to off, or another verb:  a mistake", async () => {
    await expect(localCommand("off", checkout)).rejects.toThrow("spell local off takes no checkout")
    await expect(localCommand("maybe")).rejects.toThrow("unknown verb 'maybe':  status, on, off")
  })
})
