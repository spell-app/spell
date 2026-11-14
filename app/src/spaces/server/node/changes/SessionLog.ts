import { readFileSync } from "node:fs"
import { basename } from "node:path"

import type { SPACES } from "spell/app/spaces"

/****************
 * ### `SessionLog`
 * What a Claude session the page server started (`ClaudeStarter`) has written so far, read for the box
 * (epic `editor` I138).
 * - The session streams its events as they happen, one JSON object a line
 *   (Claude Code's `--output-format stream-json --verbose`).
 * - `progress`:  what it's doing now, from the last tool it used.
 * - `summary`:  its last word, once it has ended.
 * - Plain text, no process:  so a test hands it a log's text.
 * - NEVER throws:  a line that isn't JSON is passed over, a log that can't be read is empty.
 ****************/
export class SessionLog {
  constructor(readonly text: string) {}

  /** The log in `file`:  empty while there's none, or it can't be read. */
  static of(file: string): SessionLog {
    try {
      return new SessionLog(readFileSync(file, "utf8"))
    } catch (ignored) {
      return new SessionLog("")
    }
  }

  /**
   * What the session is doing, from the last tool it used:
   * - nothing yet:  `starting`
   * - ran `spell app changes take`:  `reading request`
   * - read a file:  `reading`, its name;  edited or wrote one:  `editing`, its name
   * - ran `spell app changes done`:  `finishing`
   * - Any other tool leaves the step as it was.
   */
  get progress(): SPACES.ChangeProgress {
    let progress: SPACES.ChangeProgress = { step: "starting" }
    for (const tool of this.toolsUsed) progress = progressFor(tool) ?? progress
    return progress
  }

  /**
   * The session's last word:  the text of its result, else the last line it wrote that isn't an event
   * (an error before it began, `Error:  not logged in`);  `undefined` when it has none.
   * - At most `MOST_SUMMARY_CHARS`.
   */
  get summary(): string | undefined {
    const result = this.events.findLast((event) => event.type === "result")
    const said = typeof result?.result === "string" ? result.result.trim() : ""
    const line = said || this.lines.findLast((each) => !eventOf(each))
    return line ? line.slice(0, MOST_SUMMARY_CHARS) : undefined
  }

  /** The log's lines, trimmed, without the empty ones. */
  private get lines(): string[] {
    return this.text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  }

  /** The events among its lines, in order. */
  private get events(): SessionEvent[] {
    return this.lines.flatMap((line) => eventOf(line) ?? [])
  }

  /** Every tool the session asked for, in order. */
  private get toolsUsed(): ToolUse[] {
    return this.events.flatMap((event) =>
      event.type === "assistant" && Array.isArray(event.message?.content)
        ? event.message.content.filter((part): part is ToolUse => part?.type === "tool_use")
        : []
    )
  }
}

/** One line of the log, as Claude Code streams it:  only what's read here. */
type SessionEvent = {
  /** `system`, `assistant`, `user`, `result` ... */
  type?: string
  /** an `assistant` event's message */
  message?: { content?: ToolUse[] }
  /** a `result` event's text:  the session's last message */
  result?: unknown
}

/** A tool the session asked for, part of an `assistant` event's message. */
type ToolUse = {
  type: "tool_use"
  /** `Bash`, `Read`, `Edit` ... */
  name?: string
  /** its input:  a command, a file's path ... */
  input?: { command?: unknown; file_path?: unknown }
}

/** `line` as an event:  `undefined` when it isn't one. */
function eventOf(line: string): SessionEvent | undefined {
  if (!line.startsWith("{")) return undefined
  try {
    const event = JSON.parse(line) as unknown
    return event && typeof event === "object" ? (event as SessionEvent) : undefined
  } catch (ignored) {
    return undefined
  }
}

/** What using `tool` says the session is doing:  `undefined` for a tool that says nothing new. */
function progressFor(tool: ToolUse): SPACES.ChangeProgress | undefined {
  const { command, file_path: path } = tool.input ?? {}
  const file = typeof path === "string" && path ? basename(path) : undefined
  if (tool.name === "Bash" && typeof command === "string") {
    if (TAKE_COMMAND.test(command)) return { step: "reading request" }
    if (DONE_COMMAND.test(command)) return { step: "finishing" }
    return undefined
  }
  if (file && READING_TOOLS.includes(tool.name ?? "")) return { step: "reading", file }
  if (file && EDITING_TOOLS.includes(tool.name ?? "")) return { step: "editing", file }
  return undefined
}

/** The two `spell app changes` commands a session runs. */
const TAKE_COMMAND = /\bapp changes take\b/
const DONE_COMMAND = /\bapp changes done\b/

/** The tools that read a file, and those that change one. */
const READING_TOOLS = ["Read"]
const EDITING_TOOLS = ["Edit", "Write"]

/** The longest summary taken from a log, in characters. */
const MOST_SUMMARY_CHARS = 300
