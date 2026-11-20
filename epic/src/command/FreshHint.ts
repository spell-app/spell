import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// By package path, `.ts` and all:  the `UserPromptSubmit` hook loads this file with plain `node` (types stripped)
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"
import { EpicHome } from "spell/epic/config/EpicHome.ts"
import { bareTitle } from "spell/epic/command/command.types.ts"

/****************
 * ### `FreshHint`
 * The one line that suggests `/epic fresh` when an epic's session has grown big (epic `epic-engine` T110).
 * - Why:  every turn re-reads the session's whole conversation, so a long-running epic's session (epic-engine's) pays
 *   for it again and again;  `/epic fresh` hands the epic to a new session that picks up from its page.
 * - A hint, never a move:  the person types `/epic fresh` when it suits them.
 * - The `UserPromptSubmit` hook (`hooks/prompt-gate.mjs`) asks `answer()` for each prompt the gate let through:
 *   - the transcript is a fair measure of what each turn re-reads:  its size on disk
 *   - past the repo's `freshHintMB` (`.epic/config.json5`;  8 MB left out, `0` never)
 *   - in an epic's session:  its title names an epic page (`🚧 seo`), else its folder is an epic's worktree
 *   - ONCE per session:  a mark in the epic home, `fresh-hints/<session id>`
 * - The line goes to the person (`systemMessage`) and to Claude (`additionalContext`), which says it in one line,
 *   added to whatever the gate, the "On it" line or a missed move said.
 * - NEVER throws:  `null` when it can't tell.
 ****************/
export class FreshHint {
  /** where the once-per-session marks go:  `EpicHome.subfolder("fresh-hints")` */
  readonly marks: string

  constructor({ marks = EpicHome.subfolder(MARKS_FOLDER) }: FreshHintProps = {}) {
    this.marks = marks
  }

  /**
   * The hook's answer for prompt `input`:  `output` (the gate's or the ack's, or `null`) with the hint added, when
   * it gets one;  else `output` as it was.
   * - a block (`decision`) stays as it is:  that prompt never reaches Claude
   * - SIDE EFFECT:  marks the session once it's given, so it's given once
   */
  answer<T extends HookAnswer>(input: FreshInput, output: T | null): T | HookAnswer | null {
    if (output && "decision" in output) return output
    let line: string | null = null
    try {
      line = this.line(input)
      if (!line) return output
      mkdirSync(this.marks, { recursive: true })
      writeFileSync(join(this.marks, input.session_id!), `${new Date().toISOString()}\n`)
    } catch {
      return output
    }
    const own = output?.hookSpecificOutput
    const joined = (before: string | undefined, text: string) => (before ? `${before}\n\n${text}` : text)
    return {
      ...output,
      hookSpecificOutput: {
        ...own,
        hookEventName: "UserPromptSubmit",
        additionalContext: joined(own?.additionalContext, `${line}  Tell the person in one line;  don't move.`)
      },
      systemMessage: joined(output?.systemMessage, line)
    }
  }

  /** The hint's words for `input`, or `null` when it gets none (see the class). */
  line({ session_id: sessionId, transcript_path: transcript, cwd, session_title: title }: FreshInput): string | null {
    if (!sessionId || !SESSION_ID.test(sessionId) || !transcript || !cwd) return null
    if (existsSync(join(this.marks, sessionId))) return null
    const config = EpicConfig.of(cwd)
    if (!(config.freshHintMB > 0) || !existsSync(transcript)) return null
    const megabytes = statSync(transcript).size / MEGABYTE
    if (megabytes < config.freshHintMB) return null
    const epic = FreshHint.epicOf(cwd, title)
    if (!epic) return null
    return (
      `This session's conversation is ${Math.round(megabytes)} MB, and every turn reads it all again:  ` +
      `\`/epic fresh\` hands ${epic} to a new session in this window, which picks up from the epic page.`
    )
  }

  /**
   * The epic a session works on, or `undefined`:  its title without its icon (`🚧 seo` -> `seo`), else its folder's
   * worktree, whichever has an epic page (as `InboxMonitor.epicOf()`).
   */
  static epicOf(cwd: string, title = ""): string | undefined {
    const config = EpicConfig.of(cwd)
    const epics = join(EpicConfig.contentOf(cwd), "epics")
    for (const name of [bareTitle(title), config.worktreeNameOf(cwd)]) {
      if (name && EPIC_NAME.test(name) && existsSync(join(epics, name, `${name}.plan.html`))) return name
    }
    return undefined
  }
}

/** `FreshHint`'s constructor options. */
export type FreshHintProps = {
  /** where the once-per-session marks go;  default the epic home's `fresh-hints/` */
  marks?: string
}

/** What the `UserPromptSubmit` hook hands `FreshHint`:  the fields it reads. */
export type FreshInput = {
  /** the session's id */
  session_id?: string
  /** its transcript, `~/.claude/projects/<slug>/<session id>.jsonl` */
  transcript_path?: string
  /** its folder */
  cwd?: string
  /** its title, when it has one */
  session_title?: string
}

/** A `UserPromptSubmit` hook's JSON, the fields `answer()` touches (as `SessionMoves`' `HookOutput`). */
export type HookAnswer =
  | { decision: "block"; reason: string }
  | {
      hookSpecificOutput?: { hookEventName: "UserPromptSubmit"; sessionTitle?: string; additionalContext?: string }
      systemMessage?: string
    }

/** The epic home's folder of once-per-session marks. */
const MARKS_FOLDER = "fresh-hints"

/** Bytes in a MB, as `freshHintMB` counts them. */
const MEGABYTE = 1024 * 1024

/** A Claude Code session id:  also what keeps a mark's file name plain. */
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** An epic's name, as its folder is named. */
const EPIC_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
