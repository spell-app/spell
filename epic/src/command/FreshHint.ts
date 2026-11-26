import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// By package path, `.ts` and all:  the `UserPromptSubmit` hook loads this file with plain `node` (types stripped)
import { Bells } from "spell/epic/config/Bells.ts"
import { ClaudeHome } from "spell/epic/config/ClaudeHome.ts"
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"
import { EpicHome } from "spell/epic/config/EpicHome.ts"
import { bareTitle, isSupersededTitle } from "spell/epic/command/command.types.ts"

/****************
 * ### `FreshHint`
 * The one line that suggests `/epic fresh` when an epic's session has grown big (epic `epic-engine` T110).
 * - Why:  every turn re-reads the session's whole conversation, so a long-running epic's session (epic-engine's) pays
 *   for it again and again;  `/epic fresh` hands the epic to a new session that picks up from its page.
 * - A hint, never a move:  the person types `/epic fresh` when it suits them.
 * - Given when ALL of these hold (`line()`):
 *   - the transcript is a fair measure of what each turn re-reads:  its size on disk
 *   - its switch on in Bells & Whistles, `bells.freshHint` (`Bells.isOn()`, epic `epic-engine` P86)
 *   - past the repo's `freshHintMB` (`.epic/config.json5`;  8 MB left out, `0` never)
 *   - in an epic's session:  its title names an epic page (`🚧 seo`), else its folder is an epic's worktree
 * - WHEN (Owen, 2026-11-19:  "ok to show it again at the end of a phase, significant chunk of work, after a merge"):
 *   - the first prompt past the threshold:  the `UserPromptSubmit` hook (`hooks/prompt-gate.mjs`) asks `answer()`;
 *     its line goes to the person (`systemMessage`) and to Claude (`additionalContext`), after whatever the gate,
 *     the "On it" line or a missed move said
 *   - then again at a BREAK POINT (`atBreak()`):  the `epic` command, once a verb that ends a piece of work succeeds,
 *     prints it last (`breakOf()`):  a phase marked done, `epic merge`, `epic agents done`
 *     - at most once per `BREAK_GAP_MS`:  a merge, an agent back and its phase done, one after another, say it once
 *   - never on every turn:  a mark in the epic home, `fresh-hints/<session id>`, holds when it last showed
 * - NEVER throws:  `null` when it can't tell.
 ****************/
export class FreshHint {
  /** where the marks of when it last showed go:  `EpicHome.subfolder("fresh-hints")` */
  readonly marks: string

  constructor({ marks = EpicHome.subfolder(MARKS_FOLDER) }: FreshHintProps = {}) {
    this.marks = marks
  }

  /**
   * The hook's answer for prompt `input`:  `output` (the gate's or the ack's, or `null`) with the hint added, when
   * it gets one;  else `output` as it was.
   * - a block (`decision`) stays as it is:  that prompt never reaches Claude
   * - only the FIRST time:  after that, the break points say it (`atBreak()`)
   * - SIDE EFFECT:  marks the session when it's given
   */
  answer<T extends HookAnswer>(input: FreshInput, output: T | null): T | HookAnswer | null {
    if (output && "decision" in output) return output
    let line: string | null = null
    try {
      if (this.lastShown(input.session_id) !== undefined) return output
      line = this.line(input)
      if (!line) return output
      this.mark(input.session_id!)
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

  /**
   * The hint for the session running the `epic` command, after verb `typed` (`epic merge`) with `args` succeeded:
   * its line, to print, or `null` for none.
   * - only at a break point (`breakOf()`), and not within `BREAK_GAP_MS` of the last time it showed
   * - the session:  `$CLAUDE_CODE_SESSION_ID`, which Claude Code sets in its commands;  its transcript found by id
   * - SIDE EFFECT:  marks the session when it's given
   * - NEVER throws
   */
  atBreak(typed: string, args: readonly string[], { env = process.env, cwd = process.cwd(), now = Date.now() } = {}) {
    try {
      if (!FreshHint.breakOf(typed, args)) return null
      const sessionId = env.CLAUDE_CODE_SESSION_ID
      const last = this.lastShown(sessionId)
      if (last !== undefined && now - last < BREAK_GAP_MS) return null
      const transcript = sessionId && SESSION_ID.test(sessionId) ? ClaudeHome.transcriptOf(sessionId) : undefined
      const epic = /^[^#\s-][^#\s]*/.exec(args.find((arg) => !arg.startsWith("-")) ?? "")?.[0]
      const line = this.line({ session_id: sessionId, transcript_path: transcript, cwd, session_title: epic })
      if (!line) return null
      this.mark(sessionId!, now)
      return `${line}  (Tell the person in one line;  an agent passes it on in its report.)`
    } catch {
      return null
    }
  }

  /**
   * Whether verb `typed` with `args` ends a piece of work:  a break point, where the hint may show again.
   * - `epic phase <epic>#P3 done`, `epic merge`, `epic agents done`
   */
  static breakOf(typed: string, args: readonly string[]): boolean {
    if (typed === "epic merge") return true
    if (typed === "epic agents done") return true
    // `epic agents` with no verb typed hands the verb on in its args
    if (typed === "epic agents") return args[0] === "done"
    return typed === "epic phase" && args.includes("done")
  }

  /** When the hint last showed to session `sessionId`, in ms;  `undefined` when it never did. */
  lastShown(sessionId: string | undefined): number | undefined {
    if (!sessionId || !SESSION_ID.test(sessionId)) return undefined
    const file = join(this.marks, sessionId)
    if (!existsSync(file)) return undefined
    const at = Date.parse(readFileSync(file, "utf8").trim())
    return Number.isNaN(at) ? 0 : at
  }

  /** Mark that the hint showed to session `sessionId` at `now`. */
  private mark(sessionId: string, now = Date.now()): void {
    mkdirSync(this.marks, { recursive: true })
    writeFileSync(join(this.marks, sessionId), `${new Date(now).toISOString()}\n`)
  }

  /** The hint's words for `input`, or `null` when it gets none (see the class);  marks nothing. */
  line({ session_id: sessionId, transcript_path: transcript, cwd, session_title: title }: FreshInput): string | null {
    if (!sessionId || !SESSION_ID.test(sessionId) || !transcript || !cwd) return null
    const config = EpicConfig.of(cwd)
    if (!(config.freshHintMB > 0) || !existsSync(transcript)) return null
    if (!Bells.isOn("freshHint", { cwd })) return null
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
   * - a superseded session (`🗄️ seo (replaced)`, epic `epic-engine` T175):  none, though it sits in the worktree
   */
  static epicOf(cwd: string, title = ""): string | undefined {
    if (isSupersededTitle(title)) return undefined
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
  /** where the marks of when it last showed go;  default the epic home's `fresh-hints/` */
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

/** The epic home's folder of marks:  when the hint last showed to each session. */
const MARKS_FOLDER = "fresh-hints"

/** The least time between two hints at break points:  a burst of them (a merge, an agent back, its phase) says it once. */
const BREAK_GAP_MS = 15 * 60 * 1000

/** Bytes in a MB, as `freshHintMB` counts them. */
const MEGABYTE = 1024 * 1024

/** A Claude Code session id:  also what keeps a mark's file name plain. */
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** An epic's name, as its folder is named. */
const EPIC_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
