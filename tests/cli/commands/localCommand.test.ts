import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import { localCommand, type LocalProbes } from "spell/cli/commands/localCommand"
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

write(checkout, {
  "package.json": JSON.stringify({ name: "spell" }),
  "bin/spell.mjs": "",
  "epic/bin/epic": "",
  "node_modules/tsx/x": ""
})
write(project, {
  "package.json": "{}",
  ".gitignore": "node_modules/",
  "node_modules/spell/epic/.claude-plugin/plugin.json": "{}"
})
spawnSync("git", ["init", "-q"], { cwd: project })

/** What the command printed. */
const printed: string[] = []

/** Each run of the stand-in `epic`, and each server stopped. */
const epicRuns: string[][] = []
const killed: number[] = []

/** NEVER the real Claude Code, VS Code or servers:  a stand-in `epic`, made-up servers, a pretend `kill`. */
const probes: LocalProbes = {
  run: (_bin, args) => {
    epicRuns.push(args)
    const changes =
      args[0] === "plugin"
        ? [
            "cache:  linked",
            "VS Code:  extension spell-app.spell-epic 0.8.17 installed;  then:  Developer:  Reload Window"
          ]
        : []
    return { status: 0, stdout: JSON.stringify({ changes }), stderr: "" }
  },
  servers: [
    {
      pid: 41,
      port: 4848,
      command: "",
      kind: "epic",
      copy: join(root, "app", "node_modules", "spell"),
      isYours: false
    },
    { pid: 42, port: 4747, command: "", kind: "page", copy: join(root, "spell-app"), isYours: false }
  ],
  kill: (pid) => void killed.push(pid),
  extensions: () => ""
}

beforeEach(() => {
  printed.length = 0
  epicRuns.length = 0
  killed.length = 0
  vi.spyOn(CLI, "out").mockImplementation((text) => void printed.push(text))
  vi.stubEnv("INIT_CWD", project)
  vi.stubEnv("SPELL_KIT", "")
  // NEVER the real ~/.local/bin or ~/.spell/:  `spell local on` links `spell` there (`PathLink`)
  vi.stubEnv("HOME", join(root, "home"))
  vi.stubEnv("SPELL_BIN_DIR", join(root, "bin"))
})

describe("spell local", () => {
  test("names the checkout in the project's own file, and keeps it out of git", async () => {
    expect(await localCommand("on", checkout, {}, probes)).toBe(CLI.EXIT.OK)
    expect(kitSetting(project, {})?.kit).toBe(checkout)
    expect(readFileSync(join(project, ".gitignore"), "utf8")).toContain("\n/.spell/\n")
    expect(spawnSync("git", ["check-ignore", "-q", ".spell/kit.json5"], { cwd: project }).status).toBe(0)
    expect(printed[0]).toContain("Here, spell runs your checkout now")
    expect(realpathSync(join(root, "bin", "spell"))).toBe(join(checkout, "bin", "spell.mjs"))
    expect(printed).toContain(`- typing spell runs your checkout now, from any folder (${join(root, "bin", "spell")})`)
    expect(epicRuns[0]).toEqual(["plugin", "install", "--kit", checkout, "--no-bin", "--json"])
    expect(printed).toContain("- Claude Code's epic plugin and its skills now use your checkout.")
    expect(printed).toContain(
      "- VS Code's epic extension is your checkout's now.  Reload each VS Code window to use it."
    )
    // servers of another copy:  said, never stopped without --stop
    expect(printed).toContain("To stop them so your checkout takes over, type:  spell local on --stop")
    expect(killed).toEqual([])
  })

  test("on --stop:  stops them, and starts the epic server again from the checkout", async () => {
    expect(await localCommand("on", checkout, { stop: true }, probes)).toBe(CLI.EXIT.OK)
    expect(killed).toEqual([41, 42])
    expect(epicRuns.at(-1)).toEqual(["hub", "start"])
    expect(printed).toContain("Started again, from your checkout:  the epic page server")
    await expect(localCommand("status", undefined, { stop: true }, probes)).rejects.toThrow(
      "--stop goes with spell local on"
    )
  })

  test("run again:  .gitignore left as it is", async () => {
    const before = readFileSync(join(project, ".gitignore"), "utf8")
    await localCommand("on", checkout, {}, probes)
    expect(readFileSync(join(project, ".gitignore"), "utf8")).toBe(before)
  })

  test("status (the default) says which Spell runs, and why", async () => {
    expect(await localCommand(undefined, undefined, {}, probes)).toBe(CLI.EXIT.OK)
    expect(printed[0]).toMatch(/Here, spell runs your checkout:  .*spell \(named by .*kit\.json5\)/)
  })

  test("a checkout that isn't installed:  nothing written", async () => {
    const fresh = join(root, "fresh")
    write(fresh, { "package.json": JSON.stringify({ name: "spell" }), "bin/spell.mjs": "" })
    await expect(localCommand("on", fresh, {}, probes)).rejects.toThrow("isn't installed yet")
    expect(kitSetting(project, {})?.kit).toBe(checkout)
  })

  test("off:  npm's spell again", async () => {
    expect(await localCommand("off", undefined, {}, probes)).toBe(CLI.EXIT.OK)
    expect(existsSync(join(project, ".spell", "kit.json5"))).toBe(false)
    expect(kitSetting(project, {})).toBeUndefined()
    expect(existsSync(join(root, "bin", "spell"))).toBe(false)
    expect(epicRuns.at(-1)).toEqual([
      "plugin",
      "install",
      "--kit",
      join(project, "node_modules", "spell"),
      "--no-bin",
      "--no-extension",
      "--json"
    ])
    expect(printed).toContain(
      "- Claude Code's epic plugin and its skills use the copy npm installed in this project again."
    )
    await localCommand("status", undefined, {}, probes)
    expect(printed.join("\n")).toContain("npm's copy")
  })

  test("a checkout named to off, or another verb:  a mistake", async () => {
    await expect(localCommand("off", checkout)).rejects.toThrow("spell local off takes no checkout")
    await expect(localCommand("maybe")).rejects.toThrow("unknown verb 'maybe':  status, on, off")
  })
})
