/**
 * `PluginInstall`:  `epic plugin install`, the epic plugin moved from `spell-epic@spell-epic` to `epic@spell`
 * (epic `epic-engine` P49, Q45).
 * - Claude Code's folder, the `PATH` folder and the kit are scratch ones:  NEVER the machine's own `~/.claude`.
 * - The kit is a made-up one:  its plugin manifest, root marketplace, two skills and `bin/epic`.
 * - Claude Code's lists start as Owen's were on 2026-10-27, before the move (their shapes read off his machine).
 */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { PluginInstall } from "spell/epic/command/PluginInstall"

const top = realpathSync(mkdtempSync(join(tmpdir(), "plugin-install-")))
const home = join(top, "claude")
const bin = join(top, "local-bin")
const kit = join(top, "spell")
const engine = join(kit, "epic")
/** where the old steps linked everything:  the old engine's folder */
const old = join(top, "old", "spell-epic")
const NOW = new Date("2026-10-27T12:00:00.000Z")

// the kit:  `epic@spell` 0.8.0, two skills, `bin/epic`
for (const folder of [".claude-plugin", "skills/epic", "skills/isolate", "bin", "hooks"])
  mkdirSync(join(engine, folder), { recursive: true })
mkdirSync(join(kit, ".claude-plugin"))
writeFileSync(join(engine, ".claude-plugin", "plugin.json"), '{ "name": "epic", "version": "0.8.0" }')
writeFileSync(join(kit, ".claude-plugin", "marketplace.json"), '{ "name": "spell" }')
writeFileSync(join(engine, "bin", "epic"), "")
writeFileSync(join(engine, "hooks", "handoff.mjs"), "")
mkdirSync(join(old, "skills", "epic"), { recursive: true })

/** An installer on the scratch folders. */
function installer(): PluginInstall {
  return new PluginInstall({ home, kit, bin, now: () => NOW })
}

/** Claude Code's file `path` (from its folder), parsed. */
function claude(path: string): any {
  return JSON.parse(readFileSync(join(home, path), "utf8"))
}

/** Claude Code's folder as the old install steps left it:  `spell-epic@spell-epic`, linked to `old`. */
function oldInstall(): void {
  const source = { source: "directory", path: old }
  mkdirSync(join(home, "plugins", "cache", "spell-epic", "spell-epic"), { recursive: true })
  mkdirSync(join(home, "skills", "graphify"), { recursive: true })
  mkdirSync(bin, { recursive: true })
  writeFileSync(
    join(home, "settings.json"),
    JSON.stringify({
      model: "opus",
      enabledPlugins: { "spell-epic@spell-epic": true, "other@elsewhere": true },
      extraKnownMarketplaces: { "spell-epic": { source } },
      permissions: {
        allow: ["Bash(epic help *)", `Read(/${old}/templates/epics/**)`],
        additionalDirectories: ["/x"]
      }
    })
  )
  writeFileSync(
    join(home, "plugins", "known_marketplaces.json"),
    JSON.stringify({
      "claude-plugins-official": { source: { source: "github", repo: "anthropics/claude-plugins-official" } },
      "spell-epic": { source, installLocation: old, lastUpdated: "2026-10-18T22:11:19.465Z" }
    })
  )
  writeFileSync(
    join(home, "plugins", "installed_plugins.json"),
    JSON.stringify({
      version: 2,
      plugins: {
        "spell-epic@spell-epic": [
          { scope: "user", installPath: join(home, "plugins/cache/spell-epic/spell-epic/0.1.0"), version: "0.1.0" }
        ]
      }
    })
  )
  symlinkSync(old, join(home, "plugins", "cache", "spell-epic", "spell-epic", "0.1.0"))
  symlinkSync(join(old, "skills", "epic"), join(home, "skills", "epic"))
  // a skill the plugin no longer has, its link at the old folder, gone
  symlinkSync(join(old, "skills", "bedtime"), join(home, "skills", "bedtime"))
  symlinkSync(join(old, "bin", "epic"), join(bin, "epic"))
}

beforeEach(() => {
  rmSync(home, { recursive: true, force: true })
  rmSync(bin, { recursive: true, force: true })
  mkdirSync(home)
})

afterAll(() => rmSync(top, { recursive: true, force: true }))

describe("install()", () => {
  test("from the old install:  every list and link moved to epic@spell;  run again, nothing to change", () => {
    oldInstall()
    const report = installer().install()
    expect(report).toMatchObject({ plugin: "epic@spell", version: "0.8.0", from: engine, dryRun: false })

    const settings = claude("settings.json")
    expect(settings.model).toBe("opus")
    expect(settings.enabledPlugins).toEqual({ "other@elsewhere": true, "epic@spell": true })
    expect(settings.extraKnownMarketplaces).toEqual({ spell: { source: { source: "directory", path: kit } } })
    expect(settings.permissions.allow).toEqual(["Bash(epic help *)", `Read(/${top}/old/epic/templates/epics/**)`])
    expect(settings.permissions.additionalDirectories).toEqual(["/x"])

    const known = claude("plugins/known_marketplaces.json")
    expect(Object.keys(known)).toEqual(["claude-plugins-official", "spell"])
    expect(known.spell).toEqual({
      source: { source: "directory", path: kit },
      installLocation: kit,
      lastUpdated: NOW.toISOString()
    })

    const cache = join(home, "plugins", "cache", "spell", "epic", "0.8.0")
    expect(claude("plugins/installed_plugins.json")).toEqual({
      version: 2,
      plugins: {
        "epic@spell": [
          {
            scope: "user",
            installPath: cache,
            version: "0.8.0",
            installedAt: NOW.toISOString(),
            lastUpdated: NOW.toISOString()
          }
        ]
      }
    })
    expect(readlinkSync(cache)).toBe(engine)
    expect(existsSync(join(home, "plugins", "cache", "spell-epic"))).toBe(false)
    // the old engine's folder is never touched
    expect(existsSync(join(old, "skills", "epic"))).toBe(true)

    expect(readlinkSync(join(home, "skills", "epic"))).toBe(join(engine, "skills", "epic"))
    expect(readlinkSync(join(home, "skills", "isolate"))).toBe(join(engine, "skills", "isolate"))
    expect(lstatSync(join(home, "skills", "bedtime"), { throwIfNoEntry: false })).toBeUndefined()
    expect(lstatSync(join(home, "skills", "graphify")).isDirectory()).toBe(true)
    expect(readlinkSync(join(bin, "epic"))).toBe(join(engine, "bin", "epic"))

    expect(PluginInstall.lines(report)[0]).toBe(`epic@spell 0.8.0, from ${engine}:  changed ${report.changes.length}`)

    const again = installer().install()
    expect(again.changes).toEqual([])
    expect(PluginInstall.lines(again)).toEqual([
      `epic@spell 0.8.0, from ${engine}:  already installed;  nothing to change`
    ])
  })

  test("--dry-run:  says what it would change, and writes nothing", () => {
    oldInstall()
    const before = readFileSync(join(home, "settings.json"), "utf8")
    const report = installer().install({ dryRun: true })
    expect(report.changes).toContain("settings.json:  spell-epic@spell-epic taken out of enabledPlugins")
    expect(report.changes).toContain(`cache:  ${join(home, "plugins", "cache", "spell-epic")} removed`)
    expect(PluginInstall.lines(report)[0]).toMatch(/would change \d+$/)
    expect(readFileSync(join(home, "settings.json"), "utf8")).toBe(before)
    expect(readlinkSync(join(home, "skills", "epic"))).toBe(join(old, "skills", "epic"))
    expect(existsSync(join(home, "plugins", "cache", "spell", "epic"))).toBe(false)
  })

  test("a fresh machine:  every list and link made;  Claude Code's own copy in the cache swapped for a link", () => {
    const report = installer().install()
    expect(claude("settings.json").enabledPlugins).toEqual({ "epic@spell": true })
    expect(Object.keys(claude("plugins/installed_plugins.json").plugins)).toEqual(["epic@spell"])
    expect(readlinkSync(join(bin, "epic"))).toBe(join(engine, "bin", "epic"))
    expect(report.changes.some((line) => line.startsWith("skills:  2 linked"))).toBe(true)
    // Claude Code reinstalls or updates the plugin:  a copy again, which the next run links back
    const cache = join(home, "plugins", "cache", "spell", "epic", "0.8.0")
    rmSync(cache)
    mkdirSync(join(cache, "hooks"), { recursive: true })
    expect(installer().install().changes).toEqual([`cache:  ${cache} links to ${engine}`])
    expect(readlinkSync(cache)).toBe(engine)
  })

  test("a kit with no plugin, a list that won't parse:  refused, saying why", () => {
    expect(() => new PluginInstall({ home, kit: top, bin }).install()).toThrow(/has no plugin in epic\/.*--kit/)
    writeFileSync(join(home, "settings.json"), "{ not json")
    expect(() => installer().install()).toThrow(/settings\.json can't be read/)
  })
})

describe("from the published packages (npm install spell spell-epic)", () => {
  // as npm lays them out:  `spell` with its plugin parts in `epic/` but no `epic/bin` and no marketplace file,
  // `spell-epic` beside it with the plugin and `bin/epic`
  const modules = join(top, "project", "node_modules")
  const published = join(modules, "spell")
  const pluginPackage = join(modules, "spell-epic")
  for (const folder of [join(published, "epic", ".claude-plugin"), join(published, "epic", "skills", "epic")])
    mkdirSync(folder, { recursive: true })
  writeFileSync(
    join(published, "package.json"),
    '{ "name": "spell", "repository": "https://github.com/spell-app/spell" }'
  )
  writeFileSync(join(published, "epic", ".claude-plugin", "plugin.json"), '{ "name": "epic", "version": "0.8.6" }')

  function publishedInstaller(): PluginInstall {
    return new PluginInstall({ home, kit: published, bin, now: () => NOW })
  }

  test("spell-epic beside it:  the plugin and bin/epic from there, the marketplace from GitHub", () => {
    for (const folder of [".claude-plugin", "skills/epic", "bin", "hooks"])
      mkdirSync(join(pluginPackage, folder), { recursive: true })
    writeFileSync(join(pluginPackage, "package.json"), '{ "name": "spell-epic" }')
    writeFileSync(join(pluginPackage, ".claude-plugin", "plugin.json"), '{ "name": "epic", "version": "0.8.6" }')
    writeFileSync(join(pluginPackage, "bin", "epic"), "")
    try {
      const installer = publishedInstaller()
      expect(installer.engine).toBe(pluginPackage)
      const dry = installer.install({ dryRun: true })
      expect(dry.changes.length).toBeGreaterThan(0)
      expect(existsSync(join(home, "settings.json"))).toBe(false)

      const report = installer.install()
      expect(report).toMatchObject({ plugin: "epic@spell", version: "0.8.6", from: pluginPackage })
      expect(claude("settings.json").extraKnownMarketplaces).toEqual({
        spell: { source: { source: "github", repo: "spell-app/spell" } }
      })
      expect(existsSync(join(home, "plugins", "known_marketplaces.json"))).toBe(false)
      expect(readlinkSync(join(home, "plugins", "cache", "spell", "epic", "0.8.6"))).toBe(pluginPackage)
      expect(readlinkSync(join(home, "skills", "epic"))).toBe(join(pluginPackage, "skills", "epic"))
      expect(readlinkSync(join(bin, "epic"))).toBe(join(pluginPackage, "bin", "epic"))
      expect(publishedInstaller().install().changes).toEqual([])
    } finally {
      rmSync(pluginPackage, { recursive: true, force: true })
    }
  })

  test("a checkout's marketplace folder left in Claude Code's list:  taken out, GitHub's added by Claude Code", () => {
    mkdirSync(join(home, "plugins"), { recursive: true })
    writeFileSync(
      join(home, "plugins", "known_marketplaces.json"),
      JSON.stringify({ spell: { source: { source: "directory", path: kit }, installLocation: kit } })
    )
    const report = publishedInstaller().install()
    expect(report.changes).toContain(`known_marketplaces.json:  spell from ${kit} taken out`)
    expect(claude("plugins/known_marketplaces.json")).toEqual({})
  })

  test("no spell-epic:  spell's own epic/, and no epic on the PATH, saying so;  a dry run never throws", () => {
    const installer = publishedInstaller()
    expect(installer.engine).toBe(join(published, "epic"))
    const message = `PATH:  ${join(published, "epic", "bin", "epic")} doesn't exist, so no ${join(bin, "epic")};  `
    expect(installer.install({ dryRun: true }).changes).toContain(
      `${message}for the epic command:  npm install spell-epic`
    )
    installer.install()
    expect(readlinkSync(join(home, "plugins", "cache", "spell", "epic", "0.8.6"))).toBe(join(published, "epic"))
    expect(lstatSync(join(bin, "epic"), { throwIfNoEntry: false })).toBeUndefined()
  })
})

describe("run()", () => {
  test("a verb but install:  a usage error", async () => {
    await expect(installer().run(["remove"])).rejects.toThrow(/epic plugin install/)
  })
})
