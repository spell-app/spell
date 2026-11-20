import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
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
    expect(localTools(project, kit, { env, home })).toEqual([
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
        fix: `to switch it, type epic plugin install --kit ${kit} here;  then /reload-plugins in Claude Code`
      },
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
    const tools = localTools(project, undefined, { env, home })
    expect(tools[0]).toMatchObject({ runs: `this project's install, handed to by ${kit}`, follows: false })
    expect(tools[3]).toMatchObject({
      runs: `${join(kit, "epic")} (0.8.0)`,
      fix: "to switch it back, type yarn spell epic plugin install here;  then /reload-plugins in Claude Code"
    })
  })
})
