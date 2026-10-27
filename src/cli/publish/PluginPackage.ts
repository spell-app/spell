import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { DOC_FILES, PublishedPackage, type BuildReport, type PackedPackage, type PublishCheck } from "spell/cli/publish"

/****************
 * ### PluginPackage
 * The `spell-epic` package (epic `repo-split` Q64):  the epic plugin for Claude Code, its parts at the package's root,
 * its code in the `spell` it depends on.
 * - What ships:  the plugin's manifest (`.claude-plugin/plugin.json`, named `epic`:  installed as `epic@spell`,
 *   Q58), its skills, hooks, monitors and agents, the templates and voices, the docs the skills read, and `bin/epic`.
 * - NOT its code:  `bin/epic` runs `spell`'s built `dist/epic/cli/epicMain.js`, and the hooks import
 *   `spell/epic/...`, which `spell` answers.  So `npm install spell-epic` brings both, and one copy of the code.
 * - NOT the folder's own marketplace file (`.claude-plugin/marketplace.json`):  Owen's machine loads the plugin in
 *   place from it;  the repo's root marketplace, `spell`, names this package as the plugin's npm source.
 * - From the epic folder's `package.json`:  its `"spellPublish": { "files" }`, and the agents its plugin manifest names.
 ****************/
export class PluginPackage extends PublishedPackage {
  /** Copy the plugin's parts into the staging folder, then write `bin/epic` and the published `package.json`. */
  override async stage(): Promise<BuildReport> {
    rmSync(this.stageDir, { recursive: true, force: true })
    mkdirSync(this.stageDir, { recursive: true })
    let copied = 0
    for (const path of this.parts()) {
      const from = join(this.repo.root, path)
      if (!existsSync(from)) continue
      mkdirSync(dirname(join(this.stageDir, path)), { recursive: true })
      cpSync(from, join(this.stageDir, path), { recursive: true })
      copied++
    }
    rmSync(join(this.stageDir, ".claude-plugin", "marketplace.json"), { force: true })
    const pluginFile = join(this.stageDir, ".claude-plugin", "plugin.json")
    const plugin = JSON.parse(readFileSync(pluginFile, "utf8")) as Record<string, unknown>
    writeFileSync(pluginFile, `${JSON.stringify({ ...plugin, name: PLUGIN_NAME, version: this.version }, null, 2)}\n`)
    const bin = join(this.stageDir, "bin", "epic")
    mkdirSync(dirname(bin), { recursive: true })
    writeFileSync(
      bin,
      "#!/usr/bin/env node\n// `epic`:  the epic command, from the `spell` this plugin depends on (written by `spell publish`)\n" +
        'await import("spell/epic/cli/epicMain")\n'
    )
    chmodSync(bin, 0o755)
    writeFileSync(join(this.stageDir, "package.json"), `${JSON.stringify(this.manifest(), null, 2)}\n`)
    this.built = { compiled: 0, modules: 0, copied, declarations: 0, warnings: [] }
    return this.built
  }

  /** The published `package.json`:  `spell-epic`, its `epic` bin, depending on `spell` at the one version. */
  override manifest(): Record<string, unknown> {
    const source = this.repo.manifest
    return {
      name: source.name,
      version: this.version,
      description: "The epic plugin for Claude Code:  epic pages, worktrees and windows, the review loop and the epic command",
      license: source.license,
      type: "module",
      bin: { epic: "./bin/epic" },
      files: readdirSync(this.stageDir).filter((entry) => entry !== "package.json"),
      dependencies: { spell: this.version }
    }
  }

  /** The base checks, and its own:  a plugin manifest named `epic`, and no code but the bin. */
  override checks(packed: PackedPackage): PublishCheck[] {
    const plugin = JSON.parse(readFileSync(join(this.stageDir, ".claude-plugin", "plugin.json"), "utf8")) as {
      name?: string
    }
    const code = packed.files.filter((file) => /\.(tsx?|jsx?)$/.test(file) && !file.startsWith("skills/"))
    return [
      ...super.checks(packed),
      {
        pkg: this.name,
        check: `its plugin manifest names it ${PLUGIN_NAME} (/plugin install ${PLUGIN_NAME}@spell)`,
        ok: plugin.name === PLUGIN_NAME,
        ...(plugin.name !== PLUGIN_NAME && { detail: String(plugin.name) })
      },
      {
        pkg: this.name,
        check: "no code of its own:  the plugin's code is spell's",
        ok: !code.length,
        ...(code.length && { detail: code.slice(0, 5).join(", ") })
      }
    ]
  }

  /** What ships, from the folder's root:  its docs, its `"spellPublish": { "files" }`, the agents its plugin names. */
  private parts(): string[] {
    const docs = readdirSync(this.repo.root).filter((file) => DOC_FILES.test(file))
    const plugin = JSON.parse(readFileSync(join(this.repo.root, ".claude-plugin", "plugin.json"), "utf8")) as {
      agents?: string[]
    }
    const agents = (plugin.agents ?? []).map((file) => file.replace(/^\.\//, ""))
    return [...docs, ...(this.repo.settings.files ?? []), ...agents]
  }
}

/** The plugin's name in Claude Code:  `/plugin install epic@spell` (Owen, 2026-10-26, Q58). */
export const PLUGIN_NAME = "epic"
