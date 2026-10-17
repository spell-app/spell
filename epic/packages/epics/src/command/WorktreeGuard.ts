import { existsSync, readFileSync, realpathSync } from "node:fs"
import { basename, sep } from "node:path"

// By relative path, `.ts` and all:  the `SessionStart` hook loads this file with plain `node` (types stripped)
import { EpicConfig } from "../config/EpicConfig.ts"

/****************
 * ### `WorktreeGuard`
 * Brings a worktree's session back into its worktree when it starts somewhere else (epic `epic-eject` I3).
 * These are the rules the `SessionStart` hook (`hooks/worktree-guard.mjs`) runs:  a thin hook, as the prompt gate's.
 *
 * Why:  a reopened session goes back into its worktree only when its transcript holds a "worktree" note.
 * - the note (`worktree-state`) is what Claude Code writes when a session ENTERS a worktree with `EnterWorktree`
 * - without it, the session works in whatever folder the tab got:  the window's first folder, often the main checkout
 * - so real branch work, reopened from the wrong window, would land on `main`
 * - the Claude panel's own reopen can't be fixed from here (it marks only `.claude/worktrees/<name>` folders),
 *   and a hook can't move a session:  it can only tell Claude
 *
 * What it tells Claude (`check()`), on a start-up or a resume, in a repo that uses epics (`.epic/config.json5`):
 * 1. LOST:  the transcript's last worktree note names a worktree that still exists,
 *    but the session's folder is outside it.
 *    Claude is told to `EnterWorktree` back into it before anything else.
 *    - a session that LEFT on purpose (`ExitWorktree`) has a last note of `null`:  nothing said
 * 2. NOT RECORDED:  the session's folder is in a worktree BESIDE the repo
 *    (`../spell-app.worktrees/<name>`, a worktree-only window's new tab), and no worktree note names it.
 *    Claude is told to `EnterWorktree` the folder it's already in,
 *    so Claude Code records it, and a reopen from any window comes back there.
 *    - a worktree nested in the checkout doesn't need it:  the panel hands such a session its folder itself
 * - Its answer is the hook's JSON:  `additionalContext` for Claude, `systemMessage` a line for Owen.
 * - Its position:  node's own modules and `EpicConfig` by path, so plain `node` loads it.
 *   NEVER an alias, an `enum` or a parameter property.
 ****************/
export class WorktreeGuard {
  /**
   * What the hook says for `input` (the `SessionStart` hook's stdin):  its JSON output, or `undefined` for nothing.
   * - `input`:  `{ cwd, transcript_path, source, session_id, ... }`;  `source` `startup` or `resume` (else nothing)
   * - never throws on a transcript it can't read:  nothing to say
   */
  static check(input: GuardInput): GuardOutput | undefined {
    const { cwd, transcript_path: transcript, source } = input
    if (!cwd || (source !== "startup" && source !== "resume")) return undefined
    const config = EpicConfig.of(cwd)
    if (!existsSync(config.file)) return undefined
    const here = real(cwd)
    const note = WorktreeGuard.lastNote(transcript)
    const recorded = note?.worktreePath ? real(note.worktreePath) : undefined
    if (recorded && existsSync(recorded) && !inside(here, recorded)) {
      const name = note!.worktreeName || basename(recorded)
      return WorktreeGuard.output(
        `⎇ ${name}:  this session was reopened outside its worktree;  Claude moves back in first.`,
        `This session worked in worktree ${name} (${recorded}) when it was last open, but it was reopened in ` +
          `${here}, the folder of the window it was opened from.  Before anything else, run EnterWorktree with ` +
          `path "${recorded}", unless \`pwd\` already prints that folder, and say so in one line.  Stay where you ` +
          `are only if Owen says it left that worktree on purpose.`
      )
    }
    const name = config.worktreeNameOf(here)
    const folder = name && config.worktreeFolder(name)
    if (!name || !folder || !config.isOutside(folder) || (recorded && inside(recorded, real(folder)))) return undefined
    const path = real(folder)
    return WorktreeGuard.output(
      `⎇ ${name}:  Claude enters its worktree properly first, so a reopen from another window comes back here.`,
      `This session started inside worktree ${name}'s folder (${path}) without EnterWorktree, so Claude Code ` +
        `hasn't recorded the worktree:  reopened from another window, the session would work in that window's ` +
        `folder instead (epic-eject I3).  Before anything else, run EnterWorktree with path "${path}" (the folder ` +
        `you're already in).  If it refuses, say so in one line and carry on.`
    )
  }

  /**
   * The LAST worktree note in transcript `file` (`{"type":"worktree-state","worktreeSession":{...}}`):
   * its `worktreeSession`.
   * - `null` when the session left its worktree (`ExitWorktree`)
   * - `undefined` when there's none (or no transcript)
   */
  static lastNote(file: string | undefined): WorktreeNote | null | undefined {
    if (!file || !existsSync(file)) return undefined
    let last: WorktreeNote | null | undefined
    for (const line of readFileSync(file, "utf8").split("\n")) {
      if (!line.includes('"worktree-state"')) continue
      try {
        const entry = JSON.parse(line) as { type?: string; worktreeSession?: WorktreeNote | null }
        if (entry.type === "worktree-state") last = entry.worktreeSession ?? null
      } catch {
        // a half-written last line
      }
    }
    return last
  }

  /** The hook's JSON:  `systemMessage` for Owen, `additionalContext` for Claude. */
  static output(forOwen: string, forClaude: string): GuardOutput {
    return {
      systemMessage: forOwen,
      hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: forClaude }
    }
  }
}

/** The `SessionStart` hook's stdin, as far as the guard reads it. */
export type GuardInput = { cwd?: string; transcript_path?: string; source?: string; session_id?: string }

/** The hook's answer:  a line for Owen, and context for Claude. */
export type GuardOutput = {
  systemMessage: string
  hookSpecificOutput: { hookEventName: "SessionStart"; additionalContext: string }
}

/** A transcript's worktree note, as Claude Code writes it (CLI 2.1.296):  the fields read here. */
export type WorktreeNote = { worktreePath?: string; worktreeName?: string; originalCwd?: string }

/** Whether `path` is `folder` or inside it. */
function inside(path: string, folder: string): boolean {
  return path === folder || path.startsWith(folder + sep)
}

/** `path` with symlinks resolved (`/tmp` -> `/private/tmp`);  as is if missing. */
function real(path: string): string {
  try {
    return realpathSync(path)
  } catch {
    return path
  }
}
