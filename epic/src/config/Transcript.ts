import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs"

/****************
 * ### `Transcript`
 * One saved Claude Code session's transcript, `<home>/projects/<slug>/<id>.jsonl` (`ClaudeHome.transcriptOf()`):
 * a JSON entry a line.  The ONE reader of its lines, their content and its titles (epic `coherence` P20).
 *
 * ```ts
 * new Transcript(file).titles()        // => { custom: "🚧 seo", ai: "Fix the sitemap", last: { title, custom } }
 * Transcript.parseLine(line)           // => { type: "user", message: { content: [...] } ... }
 * Transcript.blocksOf(entry.message)   // => [{ type: "text", text: "..." }]
 * ```
 *
 * - Transcripts run to hundreds of MB:  a reader looks at a line's text first (`line.includes('"custom-title"')`),
 *   and parses only the lines that can matter;  `titles()` reads the file's end first.
 * - What it never decides:  which entries are Owen's own words.  Each reader has its own rule, for its own job
 *   (`Sessions.promptText()`, `ActiveTime`'s gaps, `ReviewBackfill`'s evidence, `Requests.promptBlocks()`).
 * - Its position:  node's own modules only, so plain `node` loads it (the handoff hook), types stripped;
 *   NEVER an alias, an `enum` or a parameter property.
 ****************/
export class Transcript {
  /** its file */
  readonly path: string

  constructor(path: string) {
    this.path = path
  }

  /** Its last `bytes` (all of it when it's shorter), as text:  its first line may be cut in half. */
  tail(bytes: number): string {
    const size = statSync(this.path).size
    const length = Math.min(size, bytes)
    const buffer = Buffer.alloc(length)
    const fd = openSync(this.path, "r")
    try {
      readSync(fd, buffer, 0, length, size - length)
    } finally {
      closeSync(fd)
    }
    return buffer.toString("utf8")
  }

  /**
   * Its titles, the last of each kind:  `custom` (a `custom-title`:  `/rename`, a skill's, the prompt gate's;  `""` when
   * cleared), `ai` (Claude Code's own `ai-title`), and `last`, its last title line of either.
   * - the end first (`TITLE_TAIL`):  Claude Code writes both again before each reply, so they're nearly always there;
   *   the whole file only for a kind the end lacks
   * - which a caller wants is its own rule:  the title Owen gave it (`custom`), its name (`custom || ai`), what its tab
   *   shows (`last`)
   */
  titles(): TranscriptTitles {
    const size = statSync(this.path).size
    const found = Transcript.titlesIn(this.tail(TITLE_TAIL))
    if (size <= TITLE_TAIL || (found.custom !== undefined && found.ai !== undefined)) return found
    const whole = Transcript.titlesIn(readFileSync(this.path, "utf8"))
    return { custom: found.custom ?? whole.custom, ai: found.ai ?? whole.ai, last: found.last ?? whole.last }
  }

  ////////////////
  // ## Statics:  a transcript's text
  ////////////////

  /**
   * One line as an entry;  `{}` when it isn't a JSON object (a half-written last line, a tail's cut first one).
   * - static:  pure
   */
  static parseLine(line: string): Record<string, unknown> {
    try {
      const value = JSON.parse(line)
      return value && typeof value === "object" && !Array.isArray(value) ? value : {}
    } catch {
      return {}
    }
  }

  /**
   * A message's content as blocks:  a plain string is one text block;  anything that isn't an object, dropped.
   * - static:  pure
   */
  static blocksOf(message: unknown): TranscriptBlock[] {
    const content = (message as { content?: unknown } | undefined)?.content
    if (typeof content === "string") return [{ type: "text", text: content }]
    return Array.isArray(content) ? content.filter((block) => block && typeof block === "object") : []
  }

  /**
   * The `AskUserQuestion` in transcript text `text` that no answer has come back for:  its questions, and when it was
   * asked;  `undefined` for none.
   * - any tool result after it is its answer;  a background agent's entries (`isSidechain`) don't count
   * - only the lines that can matter are parsed
   * - static:  pure
   */
  static pendingQuestion(text: string): PendingAsk | undefined {
    let pending: PendingAsk | undefined
    for (const line of text.split("\n")) {
      if (!line.includes('"AskUserQuestion"') && !line.includes('"tool_result"')) continue
      const entry = Transcript.parseLine(line)
      if (entry.isSidechain) continue
      for (const block of Transcript.blocksOf(entry.message)) {
        if (block.type === "tool_result") pending = undefined
        else if (block.type === "tool_use" && block.name === "AskUserQuestion") {
          const questions = (block.input as { questions?: PendingQuestion[] } | undefined)?.questions ?? []
          pending = { questions, at: typeof entry.timestamp === "string" ? entry.timestamp : undefined }
        }
      }
    }
    return pending
  }

  /**
   * The titles in transcript text `text`, the last of each kind (`titles()`'s).
   * - static:  pure
   */
  private static titlesIn(text: string): TranscriptTitles {
    const found: TranscriptTitles = {}
    for (const line of text.split("\n")) {
      if (!line.includes('"custom-title"') && !line.includes('"ai-title"')) continue
      const entry = Transcript.parseLine(line)
      const custom = entry.type === "custom-title"
      if (!custom && entry.type !== "ai-title") continue
      const value = custom ? entry.customTitle : entry.aiTitle
      const title = typeof value === "string" ? value : ""
      if (custom) found.custom = title
      else found.ai = title
      found.last = { title, custom }
    }
    return found
  }
}

/**
 * A transcript's titles (`Transcript.titles()`), the last of each kind;  a kind it never had is left out.
 * - `custom`:  its last `custom-title` (`/rename`, a skill's, the prompt gate's);  `""` when it was cleared
 * - `ai`:  its last `ai-title`, Claude Code's own guess, which names no epic on purpose
 * - `last`:  its last title line, either kind
 */
export type TranscriptTitles = { custom?: string; ai?: string; last?: TitleLine }

/** A transcript's title line:  its title, and whether it's a `custom-title` (else an `ai-title`). */
export type TitleLine = { title: string; custom: boolean }

/** One block of a message's content:  `text`, `tool_use`, `tool_result`, `image` ...;  the fields readers look at. */
export type TranscriptBlock = {
  type?: string
  text?: string
  name?: unknown
  id?: unknown
  tool_use_id?: unknown
  input?: unknown
  source?: { type?: string; media_type?: string; data?: unknown }
}

/** An `AskUserQuestion` still waiting (`Transcript.pendingQuestion()`):  its questions, and when it was asked (ISO). */
export type PendingAsk = { questions: PendingQuestion[]; at?: string }

/** One question of a waiting `AskUserQuestion`. */
export type PendingQuestion = {
  question?: string
  options?: { label?: string; description?: string }[]
}

/** How much of a transcript's end `Transcript.titles()` reads first, in bytes. */
const TITLE_TAIL = 4 * 1024 * 1024
