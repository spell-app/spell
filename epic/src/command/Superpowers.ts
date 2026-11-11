import { existsSync } from "node:fs"
import { join } from "node:path"

import { RealPath } from "spell/server/RealPath"
// By package path, `.ts` and all:  the `SessionStart` hook loads this file with plain `node` (types stripped)
import { ClaudeHome } from "spell/epic/config/ClaudeHome.ts"
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"
import { EpicGuide } from "spell/epic/command/EpicGuide.ts"

/****************
 * ### `Superpowers`
 * What an epic's session is told at its start when the superpowers plugin is on (epic `epic-engine` P72):
 * where superpowers stands aside in an epic, and which of its skills to use.
 * - superpowers (obra/superpowers, MIT) is a plugin of skills for the whole of a piece of work:
 *   a design, a plan, a worktree, the build, the finish.  In an epic, epic does the first three and the last.
 * - It has no setting to turn a skill off:  it obeys only the person's own instructions (CLAUDE.md, AGENTS.md, a
 *   direct request), by its own always-on skill.  So the words reach the agent at the moment superpowers' own text
 *   does:  at session start, on `/clear` and after compaction.
 * - The words are ONE copy:  the epic skill's guide, its `superpowers` topic (`epic guide superpowers`), which the epic
 *   skill's own paragraph matches.
 * - Said only when:
 *   - the session's folder is an EPIC's worktree:  a worktree of a repo set up for epics (`EpicConfig.ofSetUp()`)
 *     whose name has an epic page folder (`<contentFolder>/epics/<name>/`)
 *   - and superpowers is turned on in Claude Code's settings (`ClaudeHome.isPluginEnabled()`)
 * - Its caller:  the worktree guard's `SessionStart` hook (`hooks/worktree-guard.mjs`), which adds this to its own
 *   answer (`WorktreeGuard.withNotice()`).
 * - Its position:  node's own modules, and `ClaudeHome`, `EpicConfig` and `EpicGuide` by path, so plain `node` loads
 *   it;  NEVER an alias, an `enum` or a parameter property.
 ****************/
export class Superpowers {
  /**
   * What the hook adds for `input` (the `SessionStart` hook's stdin):  a line for the person and the words for
   * Claude, or `undefined` for nothing.
   * - `home`:  Claude Code's folder, for its settings;  default `ClaudeHome.home()`
   * - NEVER throws:  a config or guide it can't read says nothing
   */
  static notice(input: { cwd?: string }, { home = ClaudeHome.home() }: { home?: string } = {}): Notice | undefined {
    try {
      const epic = Superpowers.epicOf(input.cwd)
      if (!epic || !ClaudeHome.isPluginEnabled(PLUGIN, home)) return undefined
      const install = epic.config.installCommand
      return {
        forPerson: `superpowers is on:  in epic ${epic.name} it stands aside for planning, worktrees and finishing.`,
        forClaude:
          `The superpowers plugin is turned on, and this session works in epic ${epic.name}'s worktree.  ` +
          `The person runs this work as an epic;  these are their instructions for it, which take precedence over ` +
          `superpowers' skills by its own using-superpowers rule.\n\n` +
          new EpicGuide().text(TOPIC) +
          (install ? `\n\nThis repo's install command, already run in this worktree:  \`${install}\`.` : "")
      }
    } catch {
      return undefined
    }
  }

  /**
   * The epic whose worktree `cwd` is in, and its repo's settings;  `undefined` outside one.
   * - a worktree of a repo set up for epics, whose name has a folder in the epic repo's `epics/`
   *   (a plain `/isolate` worktree has none)
   */
  static epicOf(cwd: string | undefined): { name: string; config: EpicConfig } | undefined {
    const own = cwd ? EpicConfig.ofSetUp(cwd) : undefined
    if (!own) return undefined
    const config = own.top ?? own
    const name = config.worktreeNameOf(RealPath.of(cwd!))
    if (!name || !existsSync(join(config.contentFolder, "epics", name))) return undefined
    return { name, config }
  }
}

/** What the hook adds:  a line for the person, and the words for Claude. */
export type Notice = { forPerson: string; forClaude: string }

/** superpowers' plugin name, in Claude Code's `enabledPlugins` (`superpowers@<marketplace>`). */
const PLUGIN = "superpowers"

/** The guide's topic holding the words. */
const TOPIC = "superpowers"
