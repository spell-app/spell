import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { MachineTools } from "spell/cli/commands/localMachine"

/**
 * `MachineTools` in a made-up home, with a stand-in for the checkout's `epic`:  NEVER the real Claude Code or VS Code,
 * and the real runner refuses under Vitest.
 */
const root = realpathSync(mkdtempSync(join(tmpdir(), "local-machine-")))
afterAll(() => rmSync(root, { recursive: true, force: true }))

const home = join(root, "home")
const kit = join(root, "spell")
const app = join(root, "app")
const shop = join(root, "shop")

/** `files` (path => text) written under `root`. */
function write(files: Record<string, string>): void {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true })
    writeFileSync(join(root, path), text)
  }
}

write({
  "spell/epic/bin/epic": "",
  "app/node_modules/spell/epic/.claude-plugin/plugin.json": "{}",
  "shop/node_modules/spell/epic/.claude-plugin/plugin.json": "{}"
})

/** Each run of the stand-in `epic`:  its args and folder. */
let runs: { args: string[]; cwd: string }[] = []
/** What the stand-in `epic plugin install` says it changed. */
let changes: string[] = []

/** A `MachineTools` on the made-up home, with the stand-in. */
function machine(): MachineTools {
  return new MachineTools({
    home,
    run: (_bin, args, cwd) => {
      runs.push({ args, cwd })
      return { status: 0, stdout: JSON.stringify({ changes }), stderr: "" }
    }
  })
}

/** Turn `spell local` on in `project`:  its kit file, as `spell local on` writes it. */
function localOn(project: string): void {
  write({ [`${project.slice(root.length + 1)}/.spell/kit.json5`]: `{ kit: "${kit}" }` })
}

beforeEach(() => {
  runs = []
  changes = []
  rmSync(home, { recursive: true, force: true })
  for (const project of [app, shop]) rmSync(join(project, ".spell"), { recursive: true, force: true })
})

describe("MachineTools", () => {
  test("on:  the checkout's epic plugin install, its PATH link left to spell local;  recorded only when it changed", () => {
    localOn(app)
    changes = [
      "settings.json:  epic@spell turned on (enabledPlugins)",
      "VS Code:  extension spell-app.spell-epic 0.8.17 installed"
    ]
    expect(machine().switchOn(app, kit)).toMatchObject({ outcome: "switched", changes })
    expect(runs).toEqual([{ args: ["plugin", "install", "--kit", kit, "--no-bin", "--json"], cwd: kit }])
    expect(machine().record()).toEqual({ kit, projects: [app] })
    // run again, nothing to change:  still recorded, so off still undoes it
    changes = []
    expect(machine().switchOn(app, kit).outcome).toBe("kept")
    expect(machine().record()).toEqual({ kit, projects: [app] })
  })

  test("on, when the plugin followed the checkout already:  no record, so off leaves it", () => {
    localOn(app)
    expect(machine().switchOn(app, kit).outcome).toBe("kept")
    expect(existsSync(machine().recordFile)).toBe(false)
    expect(machine().switchOff(app).outcome).toBe("not-ours")
    expect(runs).toHaveLength(1)
  })

  test("off:  left while another project still runs a checkout;  the last one puts back npm's, no extension", () => {
    localOn(app)
    localOn(shop)
    changes = ["cache:  linked"]
    machine().switchOn(app, kit)
    machine().switchOn(shop, kit)
    rmSync(join(app, ".spell"), { recursive: true })
    expect(machine().switchOff(app)).toMatchObject({ outcome: "in-use", projects: [shop] })
    rmSync(join(shop, ".spell"), { recursive: true })
    expect(machine().switchOff(shop)).toMatchObject({ outcome: "switched" })
    const npm = join(shop, "node_modules", "spell")
    expect(runs.at(-1)).toEqual({
      args: ["plugin", "install", "--kit", npm, "--no-bin", "--no-extension", "--json"],
      cwd: kit
    })
    expect(existsSync(machine().recordFile)).toBe(false)
  })

  test("a failure is said, never thrown;  a checkout with no epic", () => {
    const failing = new MachineTools({ home, run: () => ({ status: 1, stdout: "", stderr: "boom\nno plugin here" }) })
    expect(failing.switchOn(app, kit)).toMatchObject({
      outcome: "failed",
      problem: "epic plugin install failed:  no plugin here"
    })
    expect(machine().switchOn(app, root)).toMatchObject({ outcome: "failed", problem: `${root} has no epic/bin/epic` })
  })

  test("the real runner refuses in a test", () => {
    expect(new MachineTools({ home }).switchOn(app, kit)).toMatchObject({
      outcome: "failed",
      problem: "epic plugin install failed:  a test runs no real epic:  hand in `run`"
    })
    expect(readFileSync(join(kit, "epic", "bin", "epic"), "utf8")).toBe("")
  })
})
