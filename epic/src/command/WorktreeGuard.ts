import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { basename, join } from "node:path"

// By relative path, `.ts` and all:  the `SessionStart` hook loads this file with plain `node` (types stripped)
import { EpicConfig } from "spell-epic/config/EpicConfig.ts"
import { EpicRepo } from "spell-epic/config/EpicRepo.ts"
import { RealPath } from "spell-epic/config/RealPath.ts"
import { HOME_ENV, HOME_FOLDER } from "spell-epic/server/server.types.ts"

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
 *    - no note at all:  the guard's OWN record of the session's worktree (rule 2) stands in for one
 * 2. NOT RECORDED:  the session's folder is in a worktree BESIDE the repo
 *    (`../spell-app.worktrees/<name>`, a worktree-only window's new tab), and no worktree note names it.
 *    The guard RECORDS it itself (`record()`), and says nothing:  a reopen outside it is rule 1's.
 *    - Before epic `epic-engine` P12, Claude was told to `EnterWorktree` the folder it was already in, so Claude
 *      Code would record it.  But Claude Code ASKS before entering any worktree outside `.claude/worktrees/`,
 *      whatever the permission rules say (r11, Owen:  "You keep asking for permission to EnterWorktree, it has to
 *      stop"):  every new tab of a worktree window asked.
 *    - So only a session really outside its worktree (rule 1) is asked to enter, and Owen is asked once then.
 *    - a worktree nested in the checkout doesn't need it:  the panel hands such a session its folder itself
 * 0. STRAY, first:  the session's folder, or the worktree its last note names, is a worktree of THIS repo named for
 *    an epic worked in ANOTHER repo (`EpicRepo.elsewhere()`, epic `epic-engine` I47):  `spell-app.worktrees/epic-engine`.
 *    Claude is told to edit nothing there (a link in it, `spell-epic`, leads to the other repo's MAIN checkout), to
 *    leave it (`ExitWorktree` keep), and to offer `epic window launch <name>`;  never sent back into it (1).
 * - A MULTI-REPO top (`EpicConfig.top`, epic `epic-engine` P10):  the worktree is the epic's worktree of the TOP
 *   (`~/www/spell.worktrees/<name>`), even for a session in a child repo's folder inside it:  that's the folder
 *   Claude is told to `EnterWorktree`.
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
    // a child repo of a multi-repo top (epic `epic-engine` P10):  the TOP's worktrees, whose each holds every repo's
    const own = EpicConfig.of(cwd)
    const config = own.top ?? own
    if (!existsSync(config.file)) return undefined
    const here = RealPath.of(cwd)
    // Claude Code's own note first;  none at all (never entered, never left):  the guard's record (rule 2)
    const last = WorktreeGuard.lastNote(transcript)
    const note = last === undefined ? WorktreeGuard.recordOf(input.session_id) : last
    const recorded = note?.worktreePath ? RealPath.of(note.worktreePath) : undefined
    const stray = WorktreeGuard.stray(config, here) ?? (recorded ? WorktreeGuard.stray(config, recorded) : undefined)
    if (stray) return stray
    if (recorded && existsSync(recorded) && !RealPath.isIn(here, recorded)) {
      const name = note!.worktreeName || basename(recorded)
      return WorktreeGuard.output(
        `⎇ ${name}:  this session was reopened outside its worktree;  Claude moves back in first.`,
        `This session worked in worktree ${name} (${recorded}) when it was last open, but it was reopened in ` +
          `${here}, the folder of the window it was opened from.  Before anything else, run EnterWorktree with ` +
          `name "${name}" (never its path, which makes Claude Code ask Owen), unless \`pwd\` already prints ` +
          `${recorded}, and say so in one line.  Stay where you are only if Owen says it left that worktree on ` +
          `purpose.`
      )
    }
    const name = config.worktreeNameOf(here)
    const folder = name && config.worktreeFolder(name)
    if (!name || !folder || !config.isOutside(folder) || (recorded && RealPath.isIn(recorded, RealPath.of(folder))))
      return undefined
    // NOT RECORDED (rule 2):  the guard records it, quietly;  no EnterWorktree, which would ask Owen
    WorktreeGuard.record(input.session_id, { worktreePath: RealPath.of(folder), worktreeName: name })
    return undefined
  }

  /**
   * Record that session `id` works in worktree `note` (rule 2), in spell-epic's home folder:
   * `~/.spell-epic/session-worktrees/<id>.json`, the fields of Claude Code's own note.
   * - no id:  nothing;  a write that fails:  nothing either (the hook never fails a session)
   */
  static record(id: string | undefined, note: WorktreeNote): void {
    if (!id) return
    try {
      mkdirSync(WorktreeGuard.recordsFolder(), { recursive: true })
      writeFileSync(WorktreeGuard.recordFile(id), `${JSON.stringify({ ...note, at: new Date().toISOString() })}\n`)
    } catch {
      // no record:  a reopen elsewhere works in that window's folder, as before the guard
    }
  }

  /** Session `id`'s worktree as the guard recorded it (`record()`);  `undefined` when there's none. */
  static recordOf(id: string | undefined): WorktreeNote | undefined {
    if (!id || !existsSync(WorktreeGuard.recordFile(id))) return undefined
    try {
      return JSON.parse(readFileSync(WorktreeGuard.recordFile(id), "utf8")) as WorktreeNote
    } catch {
      return undefined
    }
  }

  /** Where the guard's records go:  `$SPELL_EPIC_HOME`, else `~/.spell-epic`, then `session-worktrees/`. */
  static recordsFolder(): string {
    return join(process.env[HOME_ENV] || join(homedir(), HOME_FOLDER), "session-worktrees")
  }

  /** Session `id`'s record file;  the id's own characters only, so it can't name another folder. */
  static recordFile(id: string): string {
    return join(WorktreeGuard.recordsFolder(), `${id.replace(/[^\w-]/g, "_")}.json`)
  }

  /**
   * The guard's answer when `path` is in a worktree of `config`'s repo named for an epic worked in ANOTHER repo
   * (step 0);  else `undefined`.
   */
  static stray(config: EpicConfig, path: string): GuardOutput | undefined {
    const name = config.worktreeNameOf(path)
    const home = name ? EpicRepo.elsewhere(name, config.main) : undefined
    if (!name || !home) return undefined
    const folder = config.worktreeFolder(name)
    return WorktreeGuard.output(
      `⎇ ${name}:  this worktree is a stray, in the wrong repo (${basename(config.main)}):  ` +
        `epic ${name} is worked in ${home.checkout ?? home.url}.`,
      `This session works in, or was last in, worktree ${name} of ${config.main} (${folder}), but epic ${name} is ` +
        `worked in ANOTHER repo:  ${EpicRepo.refusal(home)}  Before anything else:  edit NOTHING in ${folder} ` +
        `(a link in it may lead into the other repo's main checkout);  if you're in it, ExitWorktree with action ` +
        `"keep";  never EnterWorktree it.  Tell Owen in one line, and offer \`epic window launch ${name}\`.  ` +
        `Removing the stray worktree is Owen's call, once no session works in it.`
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
