import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { RealPath } from "spell/server/RealPath"
// By package path, `.ts` and all:  the `SessionStart` hook loads this file with plain `node` (types stripped)
import { ClaudeHome, type PluginLookup } from "spell/epic/config/ClaudeHome.ts"
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
 *   - and superpowers is turned on for the session (`ClaudeHome.isPluginEnabled()`, epic `epic-engine` I318):
 *     the person's settings, the project's (`.claude/settings.json`, `.claude/settings.local.json`), the managed
 *     file, or `claude --plugin-dir`
 * - And in the repo's `AGENTS.md`, which every session reads however superpowers was turned on (I318):
 *   a marked block `epic init` writes and keeps current (`agentsStep()`), the same words
 * - Its caller:  the worktree guard's `SessionStart` hook (`hooks/worktree-guard.mjs`), which adds this to its own
 *   answer (`WorktreeGuard.withNotice()`).
 * - Its position:  node's own modules, and `ClaudeHome`, `EpicConfig` and `EpicGuide` by path, so plain `node` loads
 *   it;  NEVER an alias, an `enum` or a parameter property.
 ****************/
export class Superpowers {
  /**
   * What the hook adds for `input` (the `SessionStart` hook's stdin):  a line for the person and the words for
   * Claude, or `undefined` for nothing.
   * - `lookup`:  where to look for superpowers (`ClaudeHome.isPluginEnabled()`);  the session's folder is the project
   * - NEVER throws:  a config or guide it can't read says nothing
   */
  static notice(input: { cwd?: string }, lookup: Omit<PluginLookup, "project"> = {}): Notice | undefined {
    try {
      const epic = Superpowers.epicOf(input.cwd)
      if (!epic || !Superpowers.isOn({ ...lookup, project: input.cwd })) return undefined
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

  /** Is superpowers turned on for a session started in `project`, by any layer (`ClaudeHome.isPluginEnabled()`)? */
  static isOn(lookup: PluginLookup = {}): boolean {
    return ClaudeHome.isPluginEnabled(PLUGIN, lookup)
  }

  ////////////////
  // ## The words in AGENTS.md
  ////////////////

  /**
   * The block `epic init` puts in a repo's `AGENTS.md`:  the guide's `superpowers` topic, between two markers.
   * - the guide is the ONE copy:  the block is written from it, and written again when it changes
   */
  static agentsBlock(guide = new EpicGuide()): string {
    const words = guide.text(TOPIC).replace(/^## \S+ -- /, "## ")
    return `${BLOCK_START}\n${words.trim()}\n${BLOCK_END}\n`
  }

  /** `text` (an `AGENTS.md`) with `block` in it:  in place of the old one, else added at its end after a blank line. */
  static withAgentsBlock(text: string, block: string): string {
    const start = text.indexOf(BLOCK_MARK)
    const end = text.indexOf(BLOCK_END, start)
    if (start >= 0 && end > start) {
      const after = text.slice(end + BLOCK_END.length).replace(/^\n/, "")
      return `${text.slice(0, start)}${block}${after}`
    }
    if (!text.trim()) return block
    return `${text.replace(/\n*$/, "\n")}\n${block}`
  }

  /** Whether the `AGENTS.md` at checkout `main` holds the block already, current or not. */
  static hasAgentsBlock(main: string): boolean {
    const file = join(main, AGENTS_FILE)
    return existsSync(file) && readFileSync(file, "utf8").includes(BLOCK_MARK)
  }

  /**
   * Put the words in the `AGENTS.md` at checkout `main`, or bring them up to date;  what it did, or would with `dryRun`.
   * - `written`:  a new `AGENTS.md`;  `added`:  the block added to one;  `updated`:  the old block replaced;
   *   `ok`:  current already
   * - SIDE EFFECT (not `dryRun`):  writes the file
   */
  static agentsStep({
    main,
    dryRun = false,
    guide
  }: {
    main: string
    dryRun?: boolean
    guide?: EpicGuide
  }): AgentsReport {
    const file = join(main, AGENTS_FILE)
    const before = existsSync(file) ? readFileSync(file, "utf8") : undefined
    const after = Superpowers.withAgentsBlock(before ?? "", Superpowers.agentsBlock(guide))
    const action =
      before === undefined ? "written" : after === before ? "ok" : before.includes(BLOCK_MARK) ? "updated" : "added"
    if (!dryRun && action !== "ok") writeFileSync(file, after)
    return { file, action }
  }
}

/** What `Superpowers.agentsStep()` did to the repo's `AGENTS.md`. */
export type AgentsReport = { file: string; action: "ok" | "written" | "added" | "updated" }

/** What the hook adds:  a line for the person, and the words for Claude. */
export type Notice = { forPerson: string; forClaude: string }

/** superpowers' plugin name, in Claude Code's `enabledPlugins` (`superpowers@<marketplace>`). */
const PLUGIN = "superpowers"

/** The guide's topic holding the words. */
const TOPIC = "superpowers"

/** The file the words go in, at the repo's root:  every agent's instructions, Claude Code's too. */
const AGENTS_FILE = "AGENTS.md"

/** How the block starts, whatever its first line says next:  how `epic init` finds it again. */
const BLOCK_MARK = "<!-- epic:superpowers:start"

/** The block's first line. */
const BLOCK_START = `${BLOCK_MARK} -- written by \`epic init\` from \`epic guide superpowers\`;  change it there, not here -->`
/** The block's last line. */
const BLOCK_END = "<!-- epic:superpowers:end -->"
