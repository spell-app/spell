import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs"
import { dirname, join } from "node:path"

import { DOC_FILES, PublishedPackage, type BuildReport, type PackedPackage, type PublishCheck } from "spell/cli/publish"

/****************
 * ### PluginPackage
 * The `spell-epic` package (epic `repo-split` Q64, epic `epic-engine` Q43):  the epic plugin for Claude Code, its parts
 * at the package's root, its code in the `spell` it depends on.
 * - What ships:  the plugin's manifest (`.claude-plugin/plugin.json`, named `epic`:  installed as `epic@spell`,
 *   Q58), and Codex's beside it (`.codex-plugin/plugin.json`, epic `epic-friend` P12:  the same skills folder, and
 *   Codex's own hooks file), both at the package's version;  its skills, hooks, monitors and agents, the templates and voices, the docs the skills read, and `bin/epic`.
 *   - and every file its skills, hooks, monitors and agents name by `${CLAUDE_PLUGIN_ROOT}/...` (`namedFiles()`):
 *     the designer's and coherence's rules, `src/AGENTS.md`, `README-vscode.md` ...
 *   - a skill names the plugin's own CODE by its GitHub address instead (`https://github.com/spell-app/spell/...`),
 *     never `${CLAUDE_PLUGIN_ROOT}/src/<file>.ts`:  no code ships here, and a code file named so fails its checks
 * - NOT its code:  `bin/epic` runs `spell`'s built `dist/epic/cli/epicMain.js`, and the hooks import
 *   `spell/epic/...`, which `spell` answers.  So `npm install spell-epic` brings both, and one copy of the code.
 * - The ONE marketplace file is the repo's root, `.claude-plugin/marketplace.json` (`spell`, epic `epic-engine` Q42):
 *   its `epic` entry's source is `./epic`, the checkout's folder, until the first publish;  publishing turns it to
 *   this package (`sourceToNpm()`), for `/plugin marketplace add spell-app/spell`.
 * - From the `epic/` folder's `package.json`:  its `"spellPublish": { "files" }`, and the agents its plugin manifest names.
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
    // both manifests, Claude Code's and Codex's, named and versioned as the package
    for (const folder of MANIFEST_FOLDERS) {
      const pluginFile = join(this.stageDir, folder, "plugin.json")
      if (!existsSync(pluginFile)) continue
      const plugin = JSON.parse(readFileSync(pluginFile, "utf8")) as Record<string, unknown>
      writeFileSync(pluginFile, `${JSON.stringify({ ...plugin, name: PLUGIN_NAME, version: this.version }, null, 2)}\n`)
    }
    const bin = join(this.stageDir, "bin", "epic")
    mkdirSync(dirname(bin), { recursive: true })
    writeFileSync(
      bin,
      "#!/usr/bin/env node\n// `epic`:  the epic command, from the `spell` this plugin depends on (written by `spell publish`)\n" +
        'await import("spell/epic/cli/epicMain")\n'
    )
    chmodSync(bin, 0o755)
    writeFileSync(join(this.stageDir, "package.json"), `${JSON.stringify(this.manifest(), null, 2)}\n`)
    // the VS Code extension `epic plugin install` installs (epic `epic-friend` P15):  built beforehand, never here
    const warnings = existsSync(join(this.stageDir, VSIX))
      ? []
      : [`no ${VSIX}:  \`yarn vscode:package\` in epic/ first, or epic plugin install can't install the extension`]
    this.built = { compiled: 0, modules: 0, copied, declarations: 0, warnings }
    return this.built
  }

  /** The published `package.json`:  `spell-epic`, its `epic` bin, depending on `spell` at the one version. */
  override manifest(): Record<string, unknown> {
    const source = this.repo.manifest
    return {
      name: source.name,
      version: this.version,
      description:
        "The epic plugin for Claude Code:  epic pages, worktrees and windows, the review loop and the epic command",
      license: source.license,
      type: "module",
      bin: { epic: "./bin/epic" },
      files: readdirSync(this.stageDir).filter((entry) => entry !== "package.json"),
      dependencies: { spell: this.version }
    }
  }

  /**
   * The base checks, and its own:  a plugin manifest named `epic`, no code but the bin, and every file the skills,
   * hooks, monitors and agents name packed.
   */
  override checks(packed: PackedPackage): PublishCheck[] {
    const plugin = JSON.parse(readFileSync(join(this.stageDir, ".claude-plugin", "plugin.json"), "utf8")) as {
      name?: string
    }
    const code = packed.files.filter((file) => /\.(tsx?|jsx?)$/.test(file) && !file.startsWith("skills/"))
    const codexProblems = PluginPackage.codexManifestProblems(this.stageDir)
    const unpacked = PluginPackage.namedFiles(this.repo.root).filter(
      (path) => !packed.files.some((file) => file === path || file.startsWith(`${path.replace(/\/$/, "")}/`))
    )
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
        check: `its Codex manifest ships, named ${PLUGIN_NAME}, its skills and hooks there`,
        ok: codexProblems.length === 0,
        ...(codexProblems.length && { detail: codexProblems.join(", ") })
      },
      {
        pkg: this.name,
        check: "no code of its own:  the plugin's code is spell's",
        ok: !code.length,
        ...(code.length && { detail: code.slice(0, 5).join(", ") })
      },
      {
        pkg: this.name,
        check: "every file its skills, hooks and agents name (${CLAUDE_PLUGIN_ROOT}/...) is packed",
        ok: !unpacked.length,
        ...(unpacked.length && { detail: unpacked.slice(0, 5).join(", ") })
      }
    ]
  }

  /**
   * What's wrong with the Codex manifest in `root` (`.codex-plugin/plugin.json`):  missing, not named `epic`, or a
   * `skills` / `hooks` path that isn't there;  none, `[]`.
   */
  static codexManifestProblems(root: string): string[] {
    const file = join(root, ".codex-plugin", "plugin.json")
    if (!existsSync(file)) return [".codex-plugin/plugin.json missing"]
    const manifest = JSON.parse(readFileSync(file, "utf8")) as { name?: string; skills?: string; hooks?: string }
    const problems = manifest.name === PLUGIN_NAME ? [] : [`named ${String(manifest.name)}`]
    for (const key of ["skills", "hooks"] as const) {
      const path = manifest[key]
      if (!path || !existsSync(join(root, path))) problems.push(`its ${key} (${String(path)}) isn't there`)
    }
    return problems
  }

  /**
   * What ships, from the folder's root:  its docs, its `"spellPublish": { "files" }`, the agents its plugin names,
   * and the files those name (`namedFiles()`).
   */
  parts(): string[] {
    const docs = readdirSync(this.repo.root).filter((file) => DOC_FILES.test(file))
    const plugin = JSON.parse(readFileSync(join(this.repo.root, ".claude-plugin", "plugin.json"), "utf8")) as {
      agents?: string[]
    }
    const agents = (plugin.agents ?? []).map((file) => file.replace(/^\.\//, ""))
    const named = PluginPackage.namedFiles(this.repo.root).map((path) => path.replace(/\/$/, ""))
    return [...new Set([...docs, ...(this.repo.settings.files ?? []), ...agents, ...named])]
  }

  /**
   * Every file or folder (`designer/`) the plugin's own text names by `${CLAUDE_PLUGIN_ROOT}/<path>`, sorted:  what
   * its skills, hooks, monitors and agents read or run, so what the package must ship.
   * - read from `skills/`, `hooks/`, `monitors/` and the agents' folders (`plugin.json`'s `agents`), every text file
   */
  static namedFiles(root: string): string[] {
    const plugin = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8")) as {
      agents?: string[]
    }
    const folders = ["skills", "hooks", "monitors", ...(plugin.agents ?? []).map((file) => dirname(file))]
    const named = new Set<string>()
    for (const folder of new Set(folders.map((each) => each.replace(/^\.\//, "")))) {
      for (const file of filesUnder(join(root, folder))) {
        for (const [, path] of readFileSync(file, "utf8").matchAll(NAMED)) named.add(path!.replace(/\.+$/, ""))
      }
    }
    return [...named].sort()
  }

  /**
   * Turn the repo's ONE marketplace file's `epic` entry to the npm package, from `./epic`:  run by `spell publish`
   * once the package is out, so `/plugin marketplace add spell-app/spell` installs it from npm (epic `epic-engine`
   * Q42).  Whether it changed the file.
   * - `kit`:  the repo's root, which holds `.claude-plugin/marketplace.json`
   * - SIDE EFFECT:  rewrites the file, which the publish's commit takes;  Owen's machine then runs
   *   `epic plugin install` again, which links the cache back to his checkout
   */
  static sourceToNpm(kit: string, packageName = "spell-epic"): boolean {
    const file = join(kit, ".claude-plugin", "marketplace.json")
    if (!existsSync(file)) return false
    const marketplace = JSON.parse(readFileSync(file, "utf8")) as { plugins?: { name: string; source: unknown }[] }
    const entry = marketplace.plugins?.find((each) => each.name === PLUGIN_NAME)
    const npm = { source: "npm", package: packageName }
    if (!entry || JSON.stringify(entry.source) === JSON.stringify(npm)) return false
    entry.source = npm
    writeFileSync(file, `${JSON.stringify(marketplace, null, 2)}\n`)
    return true
  }
}

/** A path the plugin's text names:  `${CLAUDE_PLUGIN_ROOT}/designer/craft.md`. */
const NAMED = /\$\{CLAUDE_PLUGIN_ROOT\}\/([\w./-]+)/g

/** Every file under `folder`, or `[]` for none. */
function filesUnder(folder: string): string[] {
  if (!existsSync(folder)) return []
  if (!statSync(folder).isDirectory()) return [folder]
  return readdirSync(folder, { recursive: true, encoding: "utf8" })
    .map((file) => join(folder, file))
    .filter((file) => statSync(file).isFile())
}

/** The plugin's name in Claude Code:  `/plugin install epic@spell` (Owen, 2026-10-26, Q58). */
export const PLUGIN_NAME = "epic"

/** The epic VS Code extension's package, as the plugin ships it (`PluginInstall`'s step 7). */
const VSIX = "vscode/spell-epic.vsix"

/** The plugin manifests' folders:  Claude Code's, and Codex's (epic `epic-friend` P12). */
const MANIFEST_FOLDERS = [".claude-plugin", ".codex-plugin"]
