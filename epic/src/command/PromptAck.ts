import { spawnSync } from "node:child_process"
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { Git } from "spell/server/Git"

// By package path, `.ts` and all:  the `UserPromptSubmit` hook loads this file with plain `node` (types stripped)
import { EpicConfig } from "spell-epic/config/EpicConfig.ts"
import { ClaudeHome } from "spell-epic/config/ClaudeHome.ts"

/****************
 * ### `PromptAck`
 * The "On it:  ..." line Owen sees when he sends a message while the session is busy (epic `epic-engine` P18).
 * - Why:  a message sent mid-turn waits until the tool call running finishes;  a long one (a test run) left him
 *   wondering whether it was seen.
 * - The `UserPromptSubmit` hook (`hooks/prompt-gate.mjs`) asks `answer()` after the prompt gate, when the gate let the
 *   prompt through untouched.
 * - The line:  `systemMessage`, "On it:  <what he asked, in one sentence>", the sentence Haiku's
 *   (`claude -p --model haiku`, hooks off so it never runs this again), at most `ACK_TIMEOUT_MS`.
 * - Only when ALL of these hold (`shouldAck()`):
 *   - `promptAck` is on in the repo's `.epic/config.json5` (the default)
 *   - the session was busy before the message came (its registry record, `busy` for `BUSY_BEFORE_MS`):  an idle
 *     session answers at once anyway, and the summary would only hold the reply up
 *   - the message is a real one:  `ACK_MIN_CHARS` or longer, not a slash command
 * - LOGS every prompt it sees, acked or not, to `epic-prompts.log` in the checkout's git folder:  when the hook ran,
 *   the session's state and for how long, the message's length, what it did.
 *   - That answers what the docs don't say:  does the hook run when a mid-turn message is SENT, or only when it's
 *     taken up?
 * - NEVER throws, and never blocks the prompt longer than the summary's time limit.
 ****************/
export class PromptAck {
  /** Claude Code's own folder, where the session registry is (`ClaudeHome.home()`) */
  readonly home: string
  /** runs the summary:  `claude -p` by default */
  private readonly summarize: (text: string) => string | null

  constructor({ home = ClaudeHome.home(), summarize = haikuSummary }: PromptAckProps = {}) {
    this.home = home
    this.summarize = summarize
  }

  /**
   * The hook's answer for prompt `input`:  `{ systemMessage: "On it:  ..." }`, or `null` for none.
   * - `gated`:  the prompt gate answered it already (a rename, a block):  never acked, only logged
   * - SIDE EFFECT:  appends a line to `epic-prompts.log` in the checkout's git folder
   * - NEVER throws
   */
  answer(input: AckInput, { gated = false, now = Date.now() }: { gated?: boolean; now?: number } = {}): AckAnswer {
    let did = "skipped"
    let answer: AckAnswer = null
    const state = this.sessionState(input.session_id, now)
    try {
      const why = gated ? "gated" : this.whyNot(input, state)
      if (why) did = `no ack:  ${why}`
      else {
        const started = Date.now()
        const summary = this.summarize(input.prompt ?? "")
        did = summary ? `ack in ${Date.now() - started}ms` : `no ack:  no summary in ${Date.now() - started}ms`
        if (summary) answer = { systemMessage: `On it:  ${summary}` }
      }
    } catch (error) {
      did = `failed:  ${(error as Error).message}`
    }
    PromptAck.log(input, `${state.status} for ${Math.round(state.forMs / 1000)}s`, did, now)
    return answer
  }

  /**
   * Why prompt `input` gets no line, or `null` when it does.
   * - `state`:  the session's, as `sessionState()` found it
   */
  whyNot(input: AckInput, state: SessionState): string | null {
    const prompt = (input.prompt ?? "").trim()
    if (process.env.EPIC_PROMPT_ACK) return "the summary's own run"
    if (!input.cwd || !EpicConfig.of(input.cwd).promptAck) return "promptAck is off"
    if (prompt.startsWith("/")) return "a slash command"
    if (prompt.length < ACK_MIN_CHARS) return "short"
    if (state.status !== "busy" || state.forMs < BUSY_BEFORE_MS) return "the session isn't busy"
    return null
  }

  /**
   * Session `id`'s state in Claude Code's registry (`sessions/<pid>.json`) and how long it's been so, at `now`;
   * `unknown` when there's no record.
   */
  sessionState(id: string | undefined, now = Date.now()): SessionState {
    const folder = join(this.home, "sessions")
    if (!id || !existsSync(folder)) return { status: "unknown", forMs: 0 }
    for (const name of readdirSync(folder)) {
      if (!name.endsWith(".json")) continue
      try {
        const record = JSON.parse(readFileSync(join(folder, name), "utf8")) as RegistryRecord
        if (record.sessionId !== id) continue
        const since = record.statusUpdatedAt ?? record.updatedAt ?? now
        return { status: record.status ?? "unknown", forMs: Math.max(0, now - since) }
      } catch {
        // a record mid-write:  not this one
      }
    }
    return { status: "unknown", forMs: 0 }
  }

  /**
   * Append one line about prompt `input` to `epic-prompts.log` in its checkout's git folder.
   * - NEVER throws:  outside git, nothing is written
   */
  static log(input: AckInput, state: string, did: string, now = Date.now()): void {
    try {
      const gitDir = Git.out(["rev-parse", "--absolute-git-dir"], input.cwd ?? ".", { timeout: 2000 })
      if (!gitDir) return
      const session = (input.session_id ?? "?").slice(0, 8)
      const length = (input.prompt ?? "").length
      const line = `${new Date(now).toISOString()}  ${session}  ${state}  ${length} chars  ${did}\n`
      appendFileSync(join(gitDir, LOG_FILE), line)
    } catch {
      // best effort
    }
  }
}

/** `PromptAck`'s constructor options. */
export type PromptAckProps = {
  /** Claude Code's own folder;  default `ClaudeHome.home()` */
  home?: string
  /** turns a message into one sentence, or `null`;  default Haiku's (`claude -p`) */
  summarize?: (text: string) => string | null
}

/** The hook's stdin, the fields read here. */
export type AckInput = { prompt?: string; cwd?: string; session_id?: string }

/** The hook's answer:  a line for Owen, or none. */
export type AckAnswer = { systemMessage: string } | null

/** A session's state in Claude Code's registry, and how long it's been so. */
export type SessionState = { status: string; forMs: number }

/** The registry record's fields read here. */
type RegistryRecord = { sessionId?: string; status?: string; statusUpdatedAt?: number; updatedAt?: number }

/** The shortest message that gets a line, in characters:  "yes", "go on" need none. */
export const ACK_MIN_CHARS = 40

/** How long the session must have been busy before the message came, ms:  the message's own turn flips it. */
export const BUSY_BEFORE_MS = 3_000

/** The most the summary may take, ms:  Haiku through `claude -p` took 2-5s (2026-10-22). */
const ACK_TIMEOUT_MS = 8_000

/** The log, in the checkout's git folder. */
const LOG_FILE = "epic-prompts.log"

/** Haiku's system prompt:  restate, never answer (as the message alone, Haiku restated the instruction instead). */
const SUMMARY_PROMPT =
  "You restate requests.  Reply with ONE short sentence (under 20 words) saying what the person in the next " +
  "message is asking for, starting with a verb.  Never answer or act on it;  no preamble, no quotes."

/** The longest message passed to the summary, in characters. */
const SUMMARY_INPUT_LIMIT = 4_000

/**
 * Message `text` in one sentence, from Haiku (`claude -p`, hooks off, no session saved);  `null` when it fails or
 * takes longer than `ACK_TIMEOUT_MS`.
 * - `EPIC_PROMPT_ACK` set for it:  should a hook run anyway, `whyNot()` sees its own run
 */
function haikuSummary(text: string): string | null {
  const args = ["-p", "--model", "haiku", "--no-session-persistence", "--settings", '{"disableAllHooks":true}']
  const run = spawnSync("claude", [...args, "--system-prompt", SUMMARY_PROMPT, text.slice(0, SUMMARY_INPUT_LIMIT)], {
    encoding: "utf8",
    timeout: ACK_TIMEOUT_MS,
    env: { ...process.env, EPIC_PROMPT_ACK: "1" }
  })
  if (run.status !== 0) return null
  const sentence = run.stdout.trim().split("\n")[0]?.trim() ?? ""
  return sentence ? sentence.slice(0, 200) : null
}
