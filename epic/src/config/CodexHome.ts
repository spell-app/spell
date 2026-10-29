import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/****************
 * ### `CodexHome`
 * Codex's own folders, and what the epic tools write and read there (epic `epic-friend` P12):
 * the ONE place that knows where they are, as `ClaudeHome` is for Claude Code's.
 *
 * ```ts
 * CodexHome.home()           // => "/Users/owen/.codex"        its hooks file, its custom agents
 * CodexHome.agentsHome()     // => "/Users/owen/.agents"        the open skills format's own folder
 * CodexHome.skillsFolder()   // => "/Users/owen/.agents/skills" the person's own skills, for any agent
 * CodexHome.hasEpicHooks()   // => true, once `epic plugin install --codex` wrote ours into its hooks file
 * ```
 *
 * - Where (Codex's docs, read 2026-10-29):
 *   - `$CODEX_HOME`, else `~/.codex`:  `hooks.json`, `agents/<name>.toml`, `config.toml`
 *   - `~/.agents/skills/`:  the person's skills, which the Codex CLI lists in every repo;  it follows links
 *     - `$SPELL_EPIC_AGENTS_HOME` moves `~/.agents`:  ours, not Codex's, so every test points it at a scratch folder
 *       (epic `epic-friend` I10:  a test once linked skills into the machine's own)
 * - SEE:  https://learn.chatgpt.com/docs/build-skills, https://learn.chatgpt.com/docs/hooks,
 *   https://learn.chatgpt.com/docs/agent-configuration/subagents.md
 * - STATIC, and each takes its folder (default the machine's), so a test reads a scratch one.
 * - Its position:  node's own modules only, so plain `node` loads it (the hooks), types stripped;
 *   NEVER an alias, an `enum` or a parameter property.
 ****************/
export class CodexHome {
  /** Codex's own folder:  `$CODEX_HOME`, else `~/.codex`.  Read on every call:  a test sets it. */
  static home(): string {
    return process.env.CODEX_HOME || join(homedir(), ".codex")
  }

  /**
   * The open skills format's own folder:  `$SPELL_EPIC_AGENTS_HOME`, else `~/.agents`.
   * - Read on every call:  the tests' setup sets it to a scratch folder, so no test writes the machine's
   */
  static agentsHome(): string {
    return process.env[AGENTS_HOME_ENV] || join(homedir(), ".agents")
  }

  /** The person's own skills, for Codex and any agent reading the open skills format:  `<agentsHome>/skills`. */
  static skillsFolder(agentsHome = CodexHome.agentsHome()): string {
    return join(agentsHome, "skills")
  }

  /** Codex's custom agents, a TOML file each:  `<home>/agents`. */
  static agentsFolder(home = CodexHome.home()): string {
    return join(home, "agents")
  }

  /**
   * Whether Codex's user hooks file (`<home>/hooks.json`) runs the epic plugin's hooks:
   * `epic plugin install --codex` put them there.
   * - NEVER throws:  no file, or one that won't parse, is `false`
   */
  static hasEpicHooks(home = CodexHome.home()): boolean {
    const file = join(home, "hooks.json")
    if (!existsSync(file)) return false
    try {
      const { hooks = {} } = JSON.parse(readFileSync(file, "utf8")) as {
        hooks?: Record<string, { hooks?: { command?: string }[] }[]>
      }
      return Object.values(hooks).some((groups) =>
        groups.some((group) => group.hooks?.some((hook) => EPIC_HOOK.test(hook.command ?? "")))
      )
    } catch {
      return false
    }
  }

  /**
   * Whether a hook script, started with `argv`, should do nothing:  started by the epic PLUGIN in Codex
   * (its hooks file passes `--codex-plugin`) while Codex's user hooks file runs the same scripts.
   * - ONE route for the hooks, never both (J37):  the user file `epic plugin install --codex` writes wins,
   *   since the Codex CLI runs it;  the plugin's own hooks run only where nothing installed them that way
   *   (a plugin added in Codex's desktop app)
   * - NEVER throws
   */
  static skipPluginHook(argv: readonly string[] = process.argv, home = CodexHome.home()): boolean {
    return argv.includes(PLUGIN_HOOK_FLAG) && CodexHome.hasEpicHooks(home)
  }
}

/** Moves `~/.agents` (`CodexHome.agentsHome()`):  the tests' scratch one. */
export const AGENTS_HOME_ENV = "SPELL_EPIC_AGENTS_HOME"

/** What the plugin's Codex hooks file passes each script, so it knows the plugin started it. */
export const PLUGIN_HOOK_FLAG = "--codex-plugin"

/** A command that runs one of the plugin's hook scripts:  `node "/.../epic/hooks/shared-commit.mjs"`. */
export const EPIC_HOOK = /(?:^|[/"'])(?:spell-)?epic\/hooks\/[\w-]+\.mjs\b/
