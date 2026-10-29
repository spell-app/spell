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
import { homedir, tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { PluginInstall } from "spell/epic/command/PluginInstall"
import { CodexHome } from "spell/epic/config/CodexHome"
import { Editor } from "spell/epic/config/Editor"

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

  test("isInstalled() (epic-friend P13):  not on a fresh machine;  installed once it's run", () => {
    expect(installer().isInstalled()).toBe(false)
    installer().install()
    expect(installer().isInstalled()).toBe(true)
    // its folder gone:  not installed
    rmSync(join(home, "plugins", "cache"), { recursive: true, force: true })
    expect(installer().isInstalled()).toBe(false)
  })

  test("a kit with no plugin, a list that won't parse:  refused, saying why", () => {
    expect(() => new PluginInstall({ home, kit: top, bin }).install()).toThrow(/has no plugin in epic\/.*--kit/)
    writeFileSync(join(home, "settings.json"), "{ not json")
    expect(() => installer().install()).toThrow(/settings\.json can't be read/)
  })
})

describe("off macOS, and the VS Code extension (epic-friend P15)", () => {
  test("Windows:  epic.cmd runs bin/epic with node, no file link;  run again, nothing", () => {
    const windows = () => new PluginInstall({ home, kit, bin, now: () => NOW, platform: "win32", code: () => "" })
    const report = windows().install()
    expect(readFileSync(join(bin, "epic.cmd"), "utf8")).toBe(
      `@echo off\r\nnode "${join(engine, "bin", "epic")}" %*\r\n`
    )
    expect(existsSync(join(bin, "epic"))).toBe(false)
    expect(report.changes.some((line) => line.startsWith(`PATH:  ${join(bin, "epic.cmd")} runs`))).toBe(true)
    expect(windows().install().changes).toEqual([])
  })

  test("the extension:  installed from vscode/spell-epic.vsix unless VS Code has that version;  no code:  said", () => {
    const vscode = join(engine, "vscode")
    mkdirSync(vscode, { recursive: true })
    writeFileSync(
      join(vscode, "package.json"),
      '{ "publisher": "spell-app", "name": "spell-epic", "version": "0.2.0" }'
    )
    writeFileSync(join(vscode, "spell-epic.vsix"), "")
    try {
      const calls: string[][] = []
      let listed = "spell-app.spell-epic@0.1.0\n"
      const code = (args: string[]) => (calls.push(args), args[0] === "--list-extensions" ? listed : "")
      const withCode = (run: (args: string[]) => string | undefined = code, editor = new Editor("code")) =>
        new PluginInstall({ home, kit, bin, now: () => NOW, editor, code: run })
      expect(withCode().install().changes.at(-1)).toBe(
        "VS Code:  extension spell-app.spell-epic 0.2.0 installed;  then:  Developer:  Reload Window"
      )
      expect(calls.at(-1)).toEqual(["--install-extension", join(vscode, "spell-epic.vsix"), "--force"])
      listed = "spell-app.spell-epic@0.2.0\n"
      expect(withCode().install().changes).toEqual([])
      expect(withCode(() => undefined).install().changes).toEqual([
        `VS Code:  no code command, so ${join(vscode, "spell-epic.vsix")} isn't installed;  in VS Code:  Install from VSIX...`
      ])
      // into Cursor when it's the editor (P16):  the same flags, its own name and command in what's said
      listed = "spell-app.spell-epic@0.1.0\n"
      expect(withCode(code, new Editor("cursor")).install().changes.at(-1)).toBe(
        "Cursor:  extension spell-app.spell-epic 0.2.0 installed;  then:  Developer:  Reload Window"
      )
      expect(withCode(() => undefined, new Editor("cursor")).install().changes).toEqual([
        `Cursor:  no cursor command, so ${join(vscode, "spell-epic.vsix")} isn't installed;  in Cursor:  Install from VSIX...`
      ])
    } finally {
      rmSync(vscode, { recursive: true, force: true })
    }
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

////////////////
// ## Codex (epic `epic-friend` P11)
////////////////

/** The real plugin's folder:  its Codex hooks file and manifest, copied into the made-up kit. */
const REAL = join(import.meta.dirname, "..", "..")

/** Codex's scratch folder:  NEVER the machine's own `~/.codex`. */
const codexHome = join(top, "codex")
/** The skills' scratch folder:  NEVER the machine's own `~/.agents`. */
const agentsHome = join(top, "agents-home")

/** Codex's hooks file, parsed. */
function codexHooks(): any {
  return JSON.parse(readFileSync(join(codexHome, "hooks.json"), "utf8"))
}

/** Every command in a Codex hooks file, by event. */
function commandsOf(file: any): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(file.hooks as Record<string, { hooks: { command: string }[] }[]>).map(([event, groups]) => [
      event,
      groups.flatMap((group) => group.hooks.map((hook) => hook.command))
    ])
  )
}

describe("the plugin's Codex hooks", () => {
  test("valid:  Codex's event names only, each command a hook script the plugin has, run from its root", () => {
    const file = JSON.parse(readFileSync(join(REAL, "hooks", "codex-hooks.json"), "utf8"))
    expect(Object.keys(file.hooks).sort()).toEqual(["SessionStart", "Stop"])
    for (const command of Object.values(commandsOf(file)).flat()) {
      const [, script] = /^node "\$\{PLUGIN_ROOT\}\/(hooks\/[\w-]+\.mjs)" --codex-plugin$/.exec(command) ?? []
      expect(script, command).toBeDefined()
      expect(existsSync(join(REAL, script!)), script).toBe(true)
    }
    expect(commandsOf(file).Stop).toEqual(['node "${PLUGIN_ROOT}/hooks/shared-commit.mjs" --codex-plugin'])
    // each script it runs does nothing when the plugin starts it while Codex's user hooks file runs it too (J37)
    for (const command of Object.values(commandsOf(file)).flat()) {
      const script = /hooks\/[\w-]+\.mjs/.exec(command)![0]
      expect(readFileSync(join(REAL, script), "utf8"), script).toContain("CodexHome.skipPluginHook()")
    }
  })

  test("the Codex manifest names that file;  Claude Code's own hooks file stays Claude's", () => {
    const manifest = JSON.parse(readFileSync(join(REAL, ".codex-plugin", "plugin.json"), "utf8"))
    expect(manifest).toMatchObject({ name: "epic", skills: "./skills/", hooks: "./hooks/codex-hooks.json" })
    const claudes = JSON.parse(readFileSync(join(REAL, "hooks", "hooks.json"), "utf8"))
    expect(Object.keys(claudes.hooks)).toContain("WorktreeCreate")
  })
})

describe("installCodex()", () => {
  beforeEach(() => {
    rmSync(codexHome, { recursive: true, force: true })
    rmSync(agentsHome, { recursive: true, force: true })
    writeFileSync(join(engine, "hooks", "codex-hooks.json"), readFileSync(join(REAL, "hooks", "codex-hooks.json")))
    // the designer agent, as the real plugin names it
    mkdirSync(join(engine, "designer"), { recursive: true })
    writeFileSync(
      join(engine, "designer", "designer-agent.md"),
      readFileSync(join(REAL, "designer", "designer-agent.md"))
    )
    writeFileSync(
      join(engine, ".claude-plugin", "plugin.json"),
      '{ "name": "epic", "version": "0.8.0", "agents": ["./designer/designer-agent.md"] }'
    )
  })

  /** An installer for Codex, on the scratch folders. */
  function codexInstaller(): PluginInstall {
    return new PluginInstall({ home, kit, bin, now: () => NOW, codexHome, agentsHome })
  }

  test("a fresh machine:  Codex's hooks file, the skills, the agents, each once;  run again, nothing", () => {
    const report = codexInstaller().installCodex()
    const designer = join(codexHome, "agents", "epic-designer.toml")
    expect(report.changes).toEqual([
      `${join(codexHome, "hooks.json")}:  the epic hooks (SessionStart, Stop), run from ${join(engine, "hooks")}`,
      `Codex skills:  2 linked to ${join(engine, "skills")}:  epic, isolate`,
      `${designer}:  Codex's designer agent, from ${join(engine, "designer", "designer-agent.md")}`,
      `PATH:  ${join(bin, "epic")} links to ${join(engine, "bin", "epic")}`
    ])
    // the skills:  links to the SAME folders Claude Code reads
    for (const name of ["epic", "isolate"])
      expect(realpathSync(join(agentsHome, "skills", name))).toBe(realpathSync(join(engine, "skills", name)))
    // the agent:  Codex's three required keys, the plugin's folder filled in, said to be generated
    const toml = readFileSync(designer, "utf8")
    expect(toml).toMatch(
      /^# GENERATED by epic plugin install --codex, from the epic plugin's .\/designer\/designer-agent\.md/
    )
    expect(toml).toMatch(/^name = "designer"$/m)
    expect(toml).toMatch(/^description = "A design reviewer for web pages and UI\./m)
    expect(toml).toMatch(/^developer_instructions = "You are the designer/m)
    expect(toml).toContain(`${engine}/skills/designer/SKILL.md`)
    expect(toml).not.toContain("CLAUDE_PLUGIN_ROOT")
    expect(commandsOf(codexHooks())).toEqual({
      SessionStart: [`node "${engine}/hooks/behind-main.mjs"`, `node "${engine}/hooks/sync-notice.mjs"`],
      Stop: [`node "${engine}/hooks/shared-commit.mjs"`]
    })
    expect(PluginInstall.lines(report).at(-1)).toMatch(/in Codex, \/hooks, and trust them/)
    expect(codexInstaller().installCodex().changes).toEqual([])
  })

  test("the person's own Codex hooks kept;  an older install's (another kit folder) replaced, never doubled", () => {
    mkdirSync(codexHome, { recursive: true })
    const mine = { type: "command", command: "say done" }
    writeFileSync(
      join(codexHome, "hooks.json"),
      JSON.stringify({
        description: "mine",
        hooks: {
          Stop: [
            { hooks: [mine] },
            { hooks: [{ type: "command", command: 'node "/old/spell/epic/hooks/shared-commit.mjs"' }] }
          ],
          PreToolUse: [{ matcher: "Bash", hooks: [mine] }]
        }
      })
    )
    codexInstaller().installCodex()
    const file = codexHooks()
    expect(file.description).toBe("mine")
    expect(commandsOf(file)).toEqual({
      Stop: ["say done", `node "${engine}/hooks/shared-commit.mjs"`],
      PreToolUse: ["say done"],
      SessionStart: [`node "${engine}/hooks/behind-main.mjs"`, `node "${engine}/hooks/sync-notice.mjs"`]
    })
  })

  test("--dry-run writes nothing;  run() takes --codex;  a kit with no Codex hooks is refused", async () => {
    expect(codexInstaller().installCodex({ dryRun: true }).changes).toHaveLength(4)
    expect(existsSync(join(codexHome, "hooks.json"))).toBe(false)
    expect(existsSync(join(agentsHome, "skills"))).toBe(false)
    expect(existsSync(join(codexHome, "agents"))).toBe(false)
    expect(await codexInstaller().run(["install", "--codex", "--json"])).toBe(0)
    expect(existsSync(join(codexHome, "hooks.json"))).toBe(true)
    // Claude Code's lists untouched by --codex
    expect(existsSync(join(home, "settings.json"))).toBe(false)
    rmSync(join(engine, "hooks", "codex-hooks.json"))
    expect(() => codexInstaller().installCodex()).toThrow(/has no Codex hooks/)
  })
})

describe("Codex's folders in tests (I10)", () => {
  test("the setup points them at scratch ones:  no test writes the machine's ~/.codex or ~/.agents/skills", () => {
    const scratch = realpathSync(tmpdir())
    for (const folder of [CodexHome.home(), CodexHome.agentsHome(), CodexHome.skillsFolder()]) {
      expect(realpathSync(dirname(dirname(folder))).startsWith(scratch), folder).toBe(true)
      expect(folder.startsWith(join(homedir(), ".")), folder).toBe(false)
    }
    const installer = new PluginInstall()
    expect(installer.agentsHome).toBe(CodexHome.agentsHome())
    expect(installer.codexHome).toBe(CodexHome.home())
  })
})

describe("CodexHome.skipPluginHook():  one route for the hooks (J37)", () => {
  test("only a script the plugin started (--codex-plugin), and only while Codex's user hooks file runs ours", () => {
    const home = join(top, "codex-route")
    const argv = ["node", "shared-commit.mjs", "--codex-plugin"]
    expect(CodexHome.skipPluginHook(argv, home)).toBe(false)
    mkdirSync(home, { recursive: true })
    writeFileSync(join(home, "hooks.json"), JSON.stringify({ hooks: { Stop: [{ hooks: [{ command: "say hi" }] }] } }))
    expect(CodexHome.skipPluginHook(argv, home)).toBe(false)
    writeFileSync(join(home, "hooks.json"), JSON.stringify(PluginInstall.codexHooksFor(REAL)))
    expect(CodexHome.hasEpicHooks(home)).toBe(true)
    expect(CodexHome.skipPluginHook(argv, home)).toBe(true)
    // the user file's own run, and Claude Code's:  no flag, so never skipped
    expect(CodexHome.skipPluginHook(["node", "shared-commit.mjs"], home)).toBe(false)
    writeFileSync(join(home, "hooks.json"), "{ not json")
    expect(CodexHome.skipPluginHook(argv, home)).toBe(false)
  })
})
