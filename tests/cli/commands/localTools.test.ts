import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { localTools } from "spell/cli/commands/localTools"

/**
 * `localTools()` in a made-up home:  a checkout, a project that installs spell 0.8.16 from npm, links on a made-up
 * `PATH`, and Claude Code's list of plugins.  NEVER the real home.
 */
const root = realpathSync(mkdtempSync(join(tmpdir(), "local-tools-")))
afterAll(() => rmSync(root, { recursive: true, force: true }))

/** `files` (path => text) written under `root`. */
function write(files: Record<string, string>): void {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true })
    writeFileSync(join(root, path), text)
  }
}

const kit = join(root, "spell")
const project = join(root, "app")
const home = join(root, "home")
const bin = join(root, "bin")
write({
  "spell/package.json": JSON.stringify({ name: "spell" }),
  "spell/bin/spell.mjs": "",
  "spell/epic/bin/epic": "",
  "app/package.json": "{}",
  "app/node_modules/spell/package.json": JSON.stringify({ name: "spell", version: "0.8.16" }),
  "home/.claude/plugins/cache/spell/epic/0.8.9/x": ""
})
mkdirSync(bin)
symlinkSync(join(kit, "bin", "spell.mjs"), join(bin, "spell"))
const env = { PATH: bin }
/** NEVER the real VS Code or the machine's servers */
const probes = { extensions: () => "spell-app.spell-epic@0.1.3\n", servers: [] }

/** Claude Code's list, its `epic@spell` at `installPath`. */
function plugin(installPath: string, version: string) {
  write({
    "home/.claude/plugins/installed_plugins.json": JSON.stringify({
      plugins: { "epic@spell": [{ installPath, version }] }
    })
  })
}

describe("localTools()", () => {
  test("local on:  what follows the checkout, what doesn't, and what to type", () => {
    plugin(join(home, ".claude", "plugins", "cache", "spell", "epic", "0.8.9"), "0.8.9")
    expect(localTools(project, kit, { env, home, ...probes })).toEqual([
      {
        tool: "spell, typed in a terminal",
        runs: kit,
        follows: true,
        note: `${join(bin, "spell")}:  you added it`
      },
      {
        tool: "epic, typed in a terminal",
        runs: undefined,
        follows: false,
        note: undefined,
        fix: "type yarn spell epic here, or run spell local on"
      },
      { tool: "yarn spell, npx spell", runs: kit, follows: true, fix: undefined },
      {
        tool: "Claude Code's epic plugin",
        runs: join(home, ".claude", "plugins", "cache", "spell", "epic", "0.8.9"),
        follows: false,
        fix: "run spell local on again;  then /reload-plugins in Claude Code"
      },
      { tool: "Claude Code's epic skills", runs: undefined, follows: false, note: undefined, fix: undefined },
      { tool: "VS Code's epic extension", runs: "VS Code's, version 0.1.3", follows: false, fix: undefined },
      { tool: "the epic page server", runs: undefined, follows: false, fix: undefined },
      {
        tool: "this project's code that imports spell",
        runs: `${join(project, "node_modules", "spell")} (0.8.16)`,
        follows: false,
        fix: "that's normal:  your project's own code always uses the copy npm installed"
      }
    ])
  })

  test("local off:  the PATH spell hands off to the project's install;  a checkout's plugin can go back", () => {
    plugin(join(kit, "epic"), "0.8.0")
    const tools = localTools(project, undefined, { env, home, ...probes })
    expect(tools[0]).toMatchObject({ runs: `this project's install, handed to by ${kit}`, follows: false })
    expect(tools[3]).toMatchObject({
      runs: `${join(kit, "epic")} (0.8.0)`,
      fix: "to switch it back, type yarn spell epic plugin install here;  then /reload-plugins in Claude Code"
    })
  })

  test("machine-wide (T72):  skills in an npx copy, an older extension, servers of another copy", () => {
    const npx = join(root, "npm", "_npx", "abc", "node_modules", "spell", "epic", "skills")
    write({ "npm/_npx/abc/node_modules/spell/epic/skills/epic/SKILL.md": "", "home/.claude/skills/mine/SKILL.md": "" })
    symlinkSync(join(npx, "epic"), join(home, ".claude", "skills", "epic"))
    write({
      "spell/epic/vscode/package.json": JSON.stringify({
        publisher: "spell-app",
        name: "spell-epic",
        version: "0.8.17"
      })
    })
    const old = join(root, "old-spell")
    const servers = [
      {
        pid: 7,
        port: 4848,
        command: "",
        kind: "epic" as const,
        copy: join(project, "node_modules", "spell"),
        isYours: false
      },
      { pid: 8, port: 4747, command: "", kind: "page" as const, copy: old, isYours: false },
      { pid: 9, port: 4747, command: "", kind: "page" as const, copy: kit, isYours: true }
    ]
    const tools = localTools(project, kit, { env, home, ...probes, servers })
    const row = (name: string) => tools.find((tool) => tool.tool === name)
    expect(row("Claude Code's epic skills")).toMatchObject({
      runs: npx,
      follows: false,
      fix: "run spell local on again;  then /reload-plugins in Claude Code"
    })
    expect(row("VS Code's epic extension")).toMatchObject({
      runs: "VS Code's, version 0.1.3 (your checkout's:  0.8.17)",
      follows: false,
      fix: `build it first:  cd ${join(kit, "epic")} && yarn vscode:package;  then run spell local on again`
    })
    expect(row("the epic page server")).toMatchObject({
      runs: `${join(project, "node_modules", "spell")} (pid 7, port 4848)`,
      follows: false,
      fix: "type spell local on --stop to start it again from your checkout"
    })
    expect(tools.filter((tool) => tool.tool === "a page server")).toEqual([
      {
        tool: "a page server",
        runs: `${old} (pid 8, port 4747)`,
        follows: false,
        fix: "type spell local on --stop to stop it"
      }
    ])

    // the same version, built after VS Code installed its copy:  not yet;  installed after it:  follows
    write({ "spell/epic/vscode/spell-epic.vsix": "" })
    const copy = join(home, ".vscode", "extensions", "spell-app.spell-epic-0.8.17")
    mkdirSync(copy, { recursive: true })
    utimesSync(copy, new Date("2026-01-01"), new Date("2026-01-01"))
    const same = { ...probes, extensions: () => "spell-app.spell-epic@0.8.17\n" }
    const extension = () =>
      localTools(project, kit, { env, home, ...same }).find((tool) => tool.tool === "VS Code's epic extension")
    expect(extension()).toMatchObject({
      follows: false,
      fix: "run spell local on again;  then reload VS Code's windows"
    })
    utimesSync(copy, new Date(), new Date(Date.now() + 60_000))
    expect(extension()).toMatchObject({ follows: true, fix: undefined })
  })
})
