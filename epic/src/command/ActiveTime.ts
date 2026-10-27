import { Transcript, type TranscriptBlock } from "spell/epic/config/Transcript.ts"

import type { TimeSpan } from "./command.types"

/****************
 * ### `ActiveTime`
 * How long Claude was WORKING in a transcript (a Claude Code session's, or a background agent's):
 * the time from each entry to the next, never the time spent waiting on Owen (epic `epic-engine` P41).
 * - A transcript is a JSONL file, one entry a line, each user and assistant entry with its `timestamp`.
 * - The time from one entry to the next counts, EXCEPT when the next one is:
 *   - a PROMPT:  Owen typed, or a message came in (a redirect, another session's):
 *     the turn before it had ended, and the session sat waiting for him
 *   - Owen's ANSWER:  to a question (`AskUserQuestion`), a plan (`ExitPlanMode`), a permission he gave by hand
 *   - a tool's result more than `TURN_GAP` later:  nothing Claude runs takes that long in a turn
 *     (a command times out at 10 minutes)
 * - A NOTICE that background work finished (a command run in the background, an agent) counts the wait before it:
 *   Claude's own work was running.
 *   - NOT a wait for Owen run in the background (`epic inbox wait`, `epic agents wait`, `epic ask wait` ...,
 *     `OWEN_WAITS`):  its notice means he spoke
 *   - nor one more than `NOTICE_GAP` later:  a server or a watcher left running, not work
 * - Work done side by side (the session and its agents, agents at once) counts ONCE:  `union()`, then `minutes()`.
 * - STATIC and instance-free on purpose:  pure functions of the text and the times passed in;
 *   finding the transcripts is `WorkTime`'s.
 * - Its position:  its types file, and `Transcript` (a line, a message's blocks);  plain node can load it (no aliases, no
 *   parameter properties).
 ****************/
export class ActiveTime {
  /** The longest a tool's result may take, in a turn, and still count as work:  15 minutes, in ms. */
  static readonly TURN_GAP = 15 * 60 * 1000

  /** The longest wait for background work that still counts:  an hour, in ms. */
  static readonly NOTICE_GAP = 60 * 60 * 1000

  /**
   * The stretches Claude worked in transcript `text`, oldest first, merged where they touch.
   * - `within`:  only entries inside it count (a phase's time, from active to done);  default every entry
   * - lines that don't parse, and entries without a time, are skipped
   * - a background agent's entries (every one `isSidechain`) count as a session's
   */
  static spans(text: string, within?: TimeSpan): TimeSpan[] {
    const entries = ActiveTime.entries(text, within)
    const spans: TimeSpan[] = []
    for (let at = 1; at < entries.length; at++) {
      const from = entries[at - 1]!.at
      const { at: to, after } = entries[at]!
      const longest = after === "owen" ? -1 : after === "notice" ? ActiveTime.NOTICE_GAP : ActiveTime.TURN_GAP
      if (to - from <= longest) spans.push({ from, to })
    }
    return ActiveTime.union(spans)
  }

  /** `spans` merged into the fewest stretches covering the same time, oldest first:  overlaps count once. */
  static union(spans: readonly TimeSpan[]): TimeSpan[] {
    const sorted = spans.filter((span) => span.to > span.from).sort((a, b) => a.from - b.from)
    const merged: TimeSpan[] = []
    for (const span of sorted) {
      const last = merged.at(-1)
      if (last && span.from <= last.to) last.to = Math.max(last.to, span.to)
      else merged.push({ ...span })
    }
    return merged
  }

  /** The time `spans` cover, counted once, in whole minutes:  any work at all is at least 1. */
  static minutes(spans: readonly TimeSpan[]): number {
    const ms = ActiveTime.union(spans).reduce((total, span) => total + span.to - span.from, 0)
    return ms ? Math.max(1, Math.round(ms / 60_000)) : 0
  }

  ////////////////
  // ## Reading a transcript
  ////////////////

  /**
   * The user and assistant entries of `text` (inside `within`, if given), in time order:
   * each one's time, and what the gap BEFORE it was (`after`).
   * - cheap first:  an entry's time is read off the line by a pattern, and only entries inside `within` are parsed
   */
  private static entries(text: string, within?: TimeSpan): TranscriptEntry[] {
    const entries: TranscriptEntry[] = []
    // the tool calls whose result is Owen's answer, and the background waits for him
    const owens: OwenCalls = { answers: new Set(), waits: new Set() }
    for (const line of text.split("\n")) {
      if (!line.startsWith(ENTRY_START)) continue
      const stamp = STAMP.exec(line)?.[1]
      const at = stamp ? Date.parse(stamp) : NaN
      if (Number.isNaN(at) || (within && (at < within.from || at > within.to))) continue
      const entry = Transcript.parseLine(line) as RawEntry
      if (entry.type === "assistant") {
        for (const block of Transcript.blocksOf(entry.message)) ActiveTime.noteOwens(block, owens)
        entries.push({ at, after: "work" })
      } else if (entry.type === "user") entries.push({ at, after: ActiveTime.gapBefore(entry, owens) })
    }
    return entries.sort((a, b) => a.at - b.at)
  }

  /** What the gap before user entry `entry` was:  `owens`, the tool calls whose answer is Owen's. */
  private static gapBefore(entry: RawEntry, owens: OwenCalls): Gap {
    const blocks = Transcript.blocksOf(entry.message)
    const results = blocks.filter((block) => block.type === "tool_result")
    if (results.length) {
      const his =
        results.some((block) => owens.answers.has(String(block.tool_use_id))) || ActiveTime.permittedByHand(entry)
      return his ? "owen" : "result"
    }
    // a notice, in a session or (marked `isMeta`) in an agent
    const notice = NOTICE.exec(blocks.map((block) => block.text ?? "").join("\n"))
    if (notice) return owens.waits.has(notice[1]!) ? "owen" : "notice"
    // a hook's or a skill's text riding along with the prompt before it;  else Owen's words, a message
    return entry.isMeta ? "work" : "owen"
  }

  /**
   * Note tool call `block` in `owens` when it waits for Owen:  a question or a plan (`answers`), or a background
   * command waiting for his notes (`waits`)
   */
  private static noteOwens(block: TranscriptBlock, owens: OwenCalls): void {
    if (block.type !== "tool_use") return
    const id = String(block.id)
    if (ASKS_OWEN.has(String(block.name))) owens.answers.add(id)
    const input = (block.input ?? {}) as { command?: unknown; run_in_background?: unknown }
    if (block.name === "Bash" && input.run_in_background && OWEN_WAITS.test(String(input.command))) owens.waits.add(id)
  }

  /** Did Owen allow this tool's run by hand (a permission prompt), not a rule or the mode? */
  private static permittedByHand(entry: RawEntry): boolean {
    const decision = entry.permissionDecision
    return !!decision && /^user/.test(String(decision.source)) && decision.reasonType !== "rule"
  }
}

/**
 * What the gap before an entry was:
 * - `work`:  Claude at work:  thinking, writing (counts up to `TURN_GAP`)
 * - `result`:  a tool ran (counts up to `TURN_GAP`, as `work` does)
 * - `notice`:  background work ran (counts up to `NOTICE_GAP`)
 * - `owen`:  waiting for Owen (never counts)
 */
type Gap = "work" | "result" | "notice" | "owen"

/** The tool calls of a transcript that wait for Owen, by id. */
type OwenCalls = {
  /** their result is his answer:  a question, a plan */
  answers: Set<string>
  /** run in the background, their notice means he spoke:  `epic inbox wait` ... */
  waits: Set<string>
}

/** One user or assistant entry:  its time (ms), and what the gap before it was. */
type TranscriptEntry = { at: number; after: Gap }

/** What `entries()` reads of a transcript line. */
type RawEntry = {
  type?: string
  isMeta?: boolean
  message?: { content?: unknown }
  permissionDecision?: { source?: unknown; reasonType?: unknown }
}

/** How a user or assistant entry's line starts;  the other kinds (titles, API requests ...) start otherwise. */
const ENTRY_START = '{"parentUuid"'

/**
 * An entry's own time:  right after its `uuid`, at the top level.
 * - NOT the first `"timestamp"` in the line:  the message, before it, can quote other entries
 */
const STAMP = /"uuid":"[^"]*","timestamp":"([^"]+)"/

/** Tools whose result is Owen's answer:  the time before it was his. */
const ASKS_OWEN = new Set(["AskUserQuestion", "ExitPlanMode"])

/** A background command that waits for Owen (his notes, Send, an answer):  `epic inbox wait`, `ask show --wait` ... */
const OWEN_WAITS = /\bepic\b.*(\b(wait|listen)\b|--wait\b)/

/** A notice that background work finished, and the tool call that started it. */
const NOTICE = /<task-notification>[\s\S]*?<tool-use-id>([^<]+)<\/tool-use-id>/
