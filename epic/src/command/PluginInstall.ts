import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"

import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { ClaudeHome } from "spell/epic/config/ClaudeHome"

import { EXIT, EpicCommandError, parseVerbArgs, stringFlag } from "./command.types"
import { SessionMoves } from "./SessionMoves"

/****************
 * ### `PluginInstall`
 * `epic plugin install [--kit <folder>] [--dry-run] [--json]`:  the epic plugin installed for Claude Code as
 * `epic@spell`, run in place from the kit's `epic/` folder (epic `epic-engine` P49, Q45).
 *
 * It does what the kit's README/agents.md once listed as five commands to type, in order, each step skipped when it's
 * done already, so it's safe to run again:
 * 1. Claude Code's settings (`<claude>/settings.json`):
 *    - the old plugin, `spell-epic@spell-epic`, and its marketplace taken out of `enabledPlugins` and
 *      `extraKnownMarketplaces`
 *    - the marketplace `spell` added, from the kit's main checkout (a folder, not GitHub), and `epic@spell` turned on
 *    - a permission naming `spell-epic/templates/epics/` made to name `epic/templates/epics/`
 * 2. its list of marketplaces (`<claude>/plugins/known_marketplaces.json`):  the old one out, `spell` in
 * 3. its list of installed plugins (`<claude>/plugins/installed_plugins.json`):  the old one out, `epic@spell` in,
 *    at the plugin's version (its `plugin.json`)
 * 4. the cached copy Claude Code runs the hooks and monitor from (`<claude>/plugins/cache/spell/epic/<version>`):
 *    a LINK to the kit's `epic/`, so they run the checkout's own code;  the old plugin's cache removed
 * 5. a link in `<claude>/skills/` for each of the plugin's skills, so a bare `/epic` works (a plugin's skills are
 *    otherwise `/epic:epic`);  links left at an older folder of the plugin's (`spell-epic/skills/...`) moved
 * 6. `epic` on the terminal's `PATH`:  `~/.local/bin/epic`, a link to the kit's `epic/bin/epic`
 *
 * - It writes Claude Code's own files rather than run `claude plugin ...`:  every step can be checked, and run again,
 *   and its test runs it against a scratch Claude folder.
 * - Claude Code reads them as a session starts:  `/reload-plugins` (or a new session) after it.
 * - `--dry-run`:  says what it would do, and writes nothing;  `--json`:  the report as JSON
 * - `--kit`:  the kit's checkout to install from;  default the MAIN checkout of the repo this code is in,
 *   never a worktree's, which goes away
 * - At Publish the root marketplace's source turns to npm (`PluginPackage.sourceToNpm()`):  running this again then
 *   links the cache back to the checkout, at the new version.
 * - Claude Code's folder:  `ClaudeHome.home()` (`$CLAUDE_CONFIG_DIR`, else `~/.claude`);  the `PATH` folder:
 *   `~/.local/bin`.  A test hands in both.
 * - Throws `EpicCommandError` when the kit has no plugin in `epic/`, or a list of Claude Code's won't parse.
 *
 * `--codex` (epic `epic-friend` P11) sets it up for Codex instead (`installCodex()`):
 * 1. the plugin's Codex hooks ([codex-hooks.json](../../hooks/codex-hooks.json)) in Codex's own hooks file,
 *    `<codex>/hooks.json`, run from the kit's `epic/` by its full path:  each turn's end runs `epic turn end`, and a
 *    new session hears when its worktree is behind `main` or the last sync stopped on a conflict
 *    - Codex's user hooks file, not the plugin's own:  Codex's docs say a plugin's hooks run in a plugin installed by
 *      hand in its desktop app, and say nothing of the CLI;  `~/.codex/hooks.json` reaches every Codex
 *    - its other hooks kept;  ours from an older install (another kit folder) replaced, never doubled
 *    - Codex runs a hook only once the person trusts it, in its `/hooks` screen, and again after it changes
 * 2. `epic` on the terminal's `PATH`, as step 6 above
 * - Codex's folder:  `$CODEX_HOME`, else `~/.codex`;  a test hands it in.
 ****************/
export class PluginInstall {
  /** Claude Code's own folder (`~/.claude`) */
  readonly home: string
  /** the kit's checkout the plugin runs from (`~/www/spell`) */
  readonly kit: string
  /** the folder `epic` goes in, on the terminal's `PATH` (`~/.local/bin`) */
  readonly bin: string
  /** the time written into Claude Code's lists */
  readonly now: () => Date
  /** Codex's own folder (`~/.codex`):  `--codex` writes its hooks file there */
  readonly codexHome: string

  constructor({
    home = ClaudeHome.home(),
    kit = PluginInstall.mainKit(),
    bin = join(homedir(), ".local", "bin"),
    now = () => new Date(),
    codexHome = process.env.CODEX_HOME || join(homedir(), ".codex")
  }: PluginInstallProps = {}) {
    this.home = home
    this.kit = kit
    this.bin = bin
    this.now = now
    this.codexHome = codexHome
  }

  /** The kit's MAIN checkout:  the repo this file is in, through a worktree too. */
  static mainKit(): string {
    return Git.mainRoot(dirname(dirname(dirname(import.meta.dirname))))
  }

  /** Run `epic plugin <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["dryRun", "json", "codex"])
    const [verb] = positional
    if (verb !== "install") throw new EpicCommandError(`unknown verb '${verb ?? ""}':  epic plugin install`)
    const kit = stringFlag(flags.kit)
    const installer = kit
      ? new PluginInstall({ home: this.home, kit: resolve(kit), bin: this.bin, codexHome: this.codexHome })
      : this
    const dryRun = flags.dryRun === true
    const report = flags.codex ? installer.installCodex({ dryRun }) : installer.install({ dryRun })
    if (flags.json) CLI.out(JSON.stringify(report, null, 2))
    else for (const line of PluginInstall.lines(report)) CLI.out(line)
    return EXIT.OK
  }

  /** The plugin's folder in the kit:  `<kit>/epic`. */
  get engine(): string {
    return join(this.kit, "epic")
  }

  /**
   * Install the plugin (the class's steps);  what it changed, or would with `dryRun`.
   * - SIDE EFFECT (not `dryRun`):  writes Claude Code's settings and lists, and the links
   * - throws `EpicCommandError` when the kit has no plugin, or a list won't parse
   */
  install({ dryRun = false }: { dryRun?: boolean } = {}): PluginInstallReport {
    const { plugin, marketplace } = this.names()
    const version = this.version()
    const report: PluginInstallReport = {
      plugin: `${plugin}@${marketplace}`,
      version,
      from: this.engine,
      dryRun,
      changes: []
    }
    const change = (text: string) => report.changes.push(text)
    this.settings(plugin, marketplace, { dryRun, change })
    this.knownMarketplaces(marketplace, { dryRun, change })
    this.installedPlugins(`${plugin}@${marketplace}`, version, { dryRun, change })
    this.cache(plugin, marketplace, version, { dryRun, change })
    this.skills({ dryRun, change })
    this.binLink({ dryRun, change })
    return report
  }

  /**
   * Set the plugin up for Codex (`--codex`, the class's Codex steps);  what it changed, or would with `dryRun`.
   * - SIDE EFFECT (not `dryRun`):  writes Codex's hooks file, and the `epic` link
   * - throws `EpicCommandError` when the kit has no Codex hooks file, or Codex's won't parse
   */
  installCodex({ dryRun = false }: { dryRun?: boolean } = {}): PluginInstallReport {
    const report: PluginInstallReport = {
      plugin: "epic for Codex",
      version: this.version(),
      from: this.engine,
      dryRun,
      changes: [],
      agent: "codex"
    }
    const change = (text: string) => report.changes.push(text)
    this.codexHooks({ dryRun, change })
    this.binLink({ dryRun, change })
    return report
  }

  /** What `report` says, a line each:  every change, or that there was none. */
  static lines(report: PluginInstallReport): string[] {
    const head = `${report.plugin} ${report.version}, from ${report.from}`
    if (!report.changes.length) return [`${head}:  already installed;  nothing to change`]
    const verb = report.dryRun ? "would change" : "changed"
    const then =
      report.agent === "codex"
        ? "then:  in Codex, /hooks, and trust them (once, and again whenever they change);  a new session runs them"
        : "then:  /reload-plugins in each running session (or start a new one)"
    return [
      `${head}:  ${verb} ${report.changes.length}`,
      ...report.changes.map((line) => `  ${line}`),
      ...(report.dryRun ? [] : [then])
    ]
  }

  ////////////////
  // ## The plugin's names
  ////////////////

  /** `epic` and `spell`, from the kit's plugin manifest and root marketplace;  throws when the kit has no plugin. */
  private names(): { plugin: string; marketplace: string } {
    if (!existsSync(join(this.engine, ".claude-plugin", "plugin.json")))
      throw new EpicCommandError(
        `epic plugin install:  ${this.kit} has no plugin in epic/ (.claude-plugin/plugin.json);  ` +
          "pass the kit's checkout:  --kit ~/www/spell",
        EXIT.ERRORS
      )
    return new SessionMoves({ engine: this.engine, home: this.home }).pluginNames()
  }

  /** The plugin's version, its `plugin.json`'s:  the name of its cache folder. */
  private version(): string {
    return (readJson(join(this.engine, ".claude-plugin", "plugin.json")) as { version?: string }).version ?? "0.0.0"
  }

  ////////////////
  // ## Claude Code's lists
  ////////////////

  /** Step 1:  `settings.json`'s plugin, marketplace and Read permission. */
  private settings(plugin: string, marketplace: string, step: Step): void {
    const file = join(this.home, "settings.json")
    const settings = (existsSync(file) ? readJson(file) : {}) as ClaudeSettings
    const before = JSON.stringify(settings)
    const enabled = (settings.enabledPlugins ??= {})
    for (const key of Object.keys(enabled))
      if (isOldPlugin(key)) {
        delete enabled[key]
        step.change(`settings.json:  ${key} taken out of enabledPlugins`)
      }
    const key = `${plugin}@${marketplace}`
    if (enabled[key] !== true) {
      enabled[key] = true
      step.change(`settings.json:  ${key} turned on (enabledPlugins)`)
    }
    const markets = (settings.extraKnownMarketplaces ??= {})
    if (markets[OLD]) {
      delete markets[OLD]
      step.change(`settings.json:  marketplace ${OLD} taken out of extraKnownMarketplaces`)
    }
    if (markets[marketplace]?.source?.path !== this.kit || markets[marketplace]?.source?.source !== "directory") {
      markets[marketplace] = { ...markets[marketplace], source: { source: "directory", path: this.kit } }
      step.change(`settings.json:  marketplace ${marketplace} from ${this.kit} (extraKnownMarketplaces)`)
    }
    for (const [kind, rules] of Object.entries(settings.permissions ?? {})) {
      if (!Array.isArray(rules)) continue
      const fixed = rules.map((rule) => (typeof rule === "string" ? rule.replace(OLD_TEMPLATES, NEW_TEMPLATES) : rule))
      if (fixed.every((rule, at) => rule === rules[at])) continue
      settings.permissions![kind] = [...new Set(fixed)]
      step.change(`settings.json:  permissions.${kind} names ${NEW_TEMPLATES}, not ${OLD_TEMPLATES}`)
    }
    if (JSON.stringify(settings) !== before && !step.dryRun) writeJson(file, settings)
  }

  /** Step 2:  `plugins/known_marketplaces.json`. */
  private knownMarketplaces(marketplace: string, step: Step): void {
    const file = join(this.home, "plugins", "known_marketplaces.json")
    const known = (existsSync(file) ? readJson(file) : {}) as Record<string, KnownMarketplace>
    let changed = false
    if (known[OLD]) {
      delete known[OLD]
      changed = true
      step.change(`known_marketplaces.json:  ${OLD} taken out`)
    }
    const entry = known[marketplace]
    if (entry?.source?.path !== this.kit || entry?.installLocation !== this.kit) {
      known[marketplace] = {
        source: { source: "directory", path: this.kit },
        installLocation: this.kit,
        lastUpdated: this.now().toISOString()
      }
      changed = true
      step.change(`known_marketplaces.json:  ${marketplace} from ${this.kit}`)
    }
    if (changed && !step.dryRun) writeJson(file, known)
  }

  /** Step 3:  `plugins/installed_plugins.json`:  `key` at `version`, from its cache folder. */
  private installedPlugins(key: string, version: string, step: Step): void {
    const file = join(this.home, "plugins", "installed_plugins.json")
    const installed = (existsSync(file) ? readJson(file) : { version: 2, plugins: {} }) as InstalledPlugins
    const plugins = (installed.plugins ??= {})
    let changed = false
    for (const old of Object.keys(plugins))
      if (isOldPlugin(old)) {
        delete plugins[old]
        changed = true
        step.change(`installed_plugins.json:  ${old} taken out`)
      }
    const installPath = this.cacheFolder(key.split("@")[1]!, key.split("@")[0]!, version)
    const [current] = plugins[key] ?? []
    if (plugins[key]?.length !== 1 || current?.installPath !== installPath || current?.version !== version) {
      const at = this.now().toISOString()
      plugins[key] = [{ scope: "user", installPath, version, installedAt: current?.installedAt ?? at, lastUpdated: at }]
      changed = true
      step.change(`installed_plugins.json:  ${key} ${version}, from ${installPath}`)
    }
    if (changed && !step.dryRun) writeJson(file, installed)
  }

  ////////////////
  // ## Codex
  ////////////////

  /** Codex's step 1:  the plugin's Codex hooks in `<codex>/hooks.json`, by full path;  its other hooks kept. */
  private codexHooks(step: Step): void {
    const source = join(this.engine, "hooks", CODEX_HOOKS)
    if (!existsSync(source))
      throw new EpicCommandError(
        `epic plugin install --codex:  ${this.kit} has no Codex hooks (epic/hooks/${CODEX_HOOKS});  ` +
          "pass the kit's checkout:  --kit ~/www/spell",
        EXIT.ERRORS
      )
    const ours = PluginInstall.codexHooksFor(this.engine)
    const file = join(this.codexHome, "hooks.json")
    const theirs = (existsSync(file) ? readJson(file) : {}) as CodexHooksFile
    const merged = PluginInstall.withCodexHooks(theirs, ours)
    if (JSON.stringify(merged) === JSON.stringify(theirs)) return
    const events = Object.keys(ours.hooks).join(", ")
    step.change(`${file}:  the epic hooks (${events}), run from ${join(this.engine, "hooks")}`)
    if (!step.dryRun) writeJson(file, merged)
  }

  /**
   * The plugin's Codex hooks, as the file in its `hooks/` holds them, each command's `${PLUGIN_ROOT}` made `engine`:
   * a user hooks file has no plugin root to name.
   */
  static codexHooksFor(engine: string): CodexHooksFile {
    const text = readFileSync(join(engine, "hooks", CODEX_HOOKS), "utf8")
    const hooks = JSON.parse(text) as CodexHooksFile
    for (const groups of Object.values(hooks.hooks))
      for (const group of groups)
        for (const hook of group.hooks) hook.command = hook.command.replaceAll(PLUGIN_ROOT, engine)
    return hooks
  }

  /**
   * `theirs` (Codex's hooks file) with `ours` in it:  every group of ours appended to its event, after taking out any
   * group whose command runs one of the plugin's hook scripts (an older install, from wherever).
   * - their own hooks, and their file's other keys, kept as they are;  a plain copy
   */
  static withCodexHooks(theirs: CodexHooksFile, ours: CodexHooksFile): CodexHooksFile {
    const merged = JSON.parse(JSON.stringify(theirs)) as CodexHooksFile
    const events = (merged.hooks ??= {})
    for (const [event, groups] of Object.entries(events))
      events[event] = groups.filter((group) => !group.hooks?.some((hook) => OUR_HOOK.test(hook.command ?? "")))
    for (const [event, groups] of Object.entries(ours.hooks)) events[event] = [...(events[event] ?? []), ...groups]
    for (const [event, groups] of Object.entries(events)) if (!groups.length) delete events[event]
    return merged
  }

  ////////////////
  // ## The links
  ////////////////

  /** `<claude>/plugins/cache/<marketplace>/<plugin>/<version>`:  where Claude Code runs an installed plugin from. */
  private cacheFolder(marketplace: string, plugin: string, version: string): string {
    return join(this.home, "plugins", "cache", marketplace, plugin, version)
  }

  /** Step 4:  the cache folder a link to the kit's `epic/`;  the old plugin's cache gone. */
  private cache(plugin: string, marketplace: string, version: string, step: Step): void {
    const at = this.cacheFolder(marketplace, plugin, version)
    if (this.link(at, this.engine, step)) step.change(`cache:  ${at} links to ${this.engine}`)
    const old = join(this.home, "plugins", "cache", OLD)
    if (lstatSync(old, { throwIfNoEntry: false })) {
      // Claude Code's own copy, or the link the old steps made:  rmSync never follows a link
      if (!step.dryRun) rmSync(old, { recursive: true, force: true })
      step.change(`cache:  ${old} removed`)
    }
  }

  /** Step 5:  a link in `<claude>/skills/` to each of the plugin's skills. */
  private skills(step: Step): void {
    const folder = join(this.home, "skills")
    const own = join(this.engine, "skills")
    const names = readdirSync(own, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    const moved: string[] = []
    for (const name of names) {
      const at = join(folder, name)
      const stat = lstatSync(at, { throwIfNoEntry: false })
      if (stat && !stat.isSymbolicLink()) {
        step.change(`skills:  ${at} is a folder of your own;  left as it is`)
        continue
      }
      if (this.link(at, join(own, name), step)) moved.push(name)
    }
    if (moved.length) step.change(`skills:  ${moved.length} linked to ${own}:  ${moved.join(", ")}`)
    // a link to an older folder of the plugin's skill the plugin no longer has:  it leads nowhere
    if (!existsSync(folder)) return
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const at = join(folder, entry.name)
      if (!entry.isSymbolicLink() || existsSync(at)) continue
      const target = readlinkSync(at)
      if (!OLD_SKILL.test(target)) continue
      if (!step.dryRun) rmSync(at)
      step.change(`skills:  ${at} removed (it led to ${target}, gone)`)
    }
  }

  /** Step 6:  `~/.local/bin/epic`, a link to the kit's `epic/bin/epic`. */
  private binLink(step: Step): void {
    const at = join(this.bin, "epic")
    const target = join(this.engine, "bin", "epic")
    if (this.link(at, target, step)) step.change(`PATH:  ${at} links to ${target}`)
  }

  /**
   * Make `at` a link to `target`, unless it is one already (by its real path);  whether it had to.
   * - a link elsewhere, or a dangling one, replaced;  a copy (a real folder:  Claude Code's cached copy) removed first
   * - SIDE EFFECT (not `dryRun`):  makes the folder above it, writes the link (an absolute target)
   */
  private link(at: string, target: string, { dryRun }: Step): boolean {
    const stat = lstatSync(at, { throwIfNoEntry: false })
    if (stat?.isSymbolicLink() && existsSync(at) && realpathSync(at) === realpathSync(target)) return false
    if (dryRun) return true
    if (stat) rmSync(at, { recursive: true, force: true })
    mkdirSync(dirname(at), { recursive: true })
    symlinkSync(target, at)
    return true
  }
}

/** `PluginInstall`'s constructor options;  every one has a default. */
export type PluginInstallProps = {
  /** Claude Code's folder;  default `ClaudeHome.home()` */
  home?: string
  /** the kit's checkout;  default `PluginInstall.mainKit()` */
  kit?: string
  /** the `PATH` folder `epic` goes in;  default `~/.local/bin` */
  bin?: string
  /** the time written into Claude Code's lists;  default now */
  now?: () => Date
  /** Codex's folder;  default `$CODEX_HOME`, else `~/.codex` */
  codexHome?: string
}

/** What `install()` did, or would do. */
export type PluginInstallReport = {
  /** the plugin, as Claude Code names it:  `epic@spell` */
  plugin: string
  /** its version:  its cache folder's name */
  version: string
  /** the folder it runs from:  the kit's `epic/` */
  from: string
  /** nothing was written */
  dryRun: boolean
  /** each change, a line;  none:  it was installed already */
  changes: string[]
  /** the agent it was set up for, when not Claude Code:  `codex` (`--codex`) */
  agent?: "codex"
}

/**
 * A Codex hooks file (`~/.codex/hooks.json`, and the plugin's `hooks/codex-hooks.json`):  each event's groups, each
 * group's command hooks.  The rest of its keys kept as they are.
 * - SEE:  https://learn.chatgpt.com/docs/hooks
 */
export type CodexHooksFile = Record<string, unknown> & {
  hooks: Record<string, { matcher?: string; hooks: { type: string; command: string; [key: string]: unknown }[] }[]>
}

/** A step's options:  whether to write, and where its changes are said. */
type Step = { dryRun: boolean; change: (text: string) => void }

/** The parts of Claude Code's `settings.json` this touches;  the rest is kept as it is. */
type ClaudeSettings = Record<string, unknown> & {
  enabledPlugins?: Record<string, boolean>
  extraKnownMarketplaces?: Record<string, { source?: { source?: string; path?: string } }>
  permissions?: Record<string, unknown>
}

/** An entry of `known_marketplaces.json`. */
type KnownMarketplace = { source?: { source?: string; path?: string }; installLocation?: string; lastUpdated?: string }

/** `installed_plugins.json`:  each plugin's installs. */
type InstalledPlugins = Record<string, unknown> & {
  plugins?: Record<
    string,
    { scope?: string; installPath?: string; version?: string; installedAt?: string; lastUpdated?: string }[]
  >
}

/** The old plugin's name, and its marketplace's:  `spell-epic@spell-epic` (before repo-split's P20 · One Repo). */
const OLD = "spell-epic"

/** The templates' folder as a permission named it before, and as it names it now. */
const OLD_TEMPLATES = "spell-epic/templates/epics/"
const NEW_TEMPLATES = "epic/templates/epics/"

/** A skill link's target in an older folder of the plugin's:  `.../spell-epic/skills/epic`, `.../epic/skills/epic`. */
const OLD_SKILL = /(?:^|\/)(?:spell-)?epic\/skills\/[^/]+\/?$/

/** The plugin's Codex hooks, in its `hooks/`. */
const CODEX_HOOKS = "codex-hooks.json"

/** What the plugin's Codex hooks name its folder by, in a plugin;  the kit's `epic/` in a user hooks file. */
const PLUGIN_ROOT = "${PLUGIN_ROOT}"

/** A command that runs one of the plugin's hook scripts:  `node "/.../epic/hooks/shared-commit.mjs"`. */
const OUR_HOOK = /(?:^|[/"'])(?:spell-)?epic\/hooks\/[\w-]+\.mjs\b/

/** Whether `key` is the old plugin, or any plugin of its marketplace:  `spell-epic@spell-epic`. */
function isOldPlugin(key: string): boolean {
  return key.startsWith(`${OLD}@`) || key.endsWith(`@${OLD}`)
}

/** JSON file `file`;  throws `EpicCommandError` when it won't parse. */
function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"))
  } catch (error) {
    throw new EpicCommandError(`epic plugin install:  ${file} can't be read:  ${(error as Error).message}`, EXIT.ERRORS)
  }
}

/** Write `value` to JSON file `file`, as Claude Code writes its own:  2 spaces. */
function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}
