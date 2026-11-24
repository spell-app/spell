import { existsSync, mkdirSync } from "node:fs"
import { delimiter, dirname, join } from "node:path"

import { DataFile } from "spell/server/DataFile"
import { ClaudePrint } from "spell/epic/command/ClaudePrint"
import { EpicHome } from "spell/epic/config/EpicHome"

import { PlanDocError, ShortTitle } from "./planDoc.types"

/****************
 * ### `TitleReader`
 * A FRESH reader reads a new item title cold, before `epic add` or `epic update --title` writes it
 * (epic `epic-engine` T123).
 * - Why (Owen, 2026-11-21):  "`the pack`, `the monitor`, `the kit` -- it's impossible for me to read that and
 *   understand what you're trying to say, unless I happen to be closely following the work."
 * - The rule it reads by:  plan-doc.md, "Rules", TITLES;  `RULE` below is that rule, told to a reader.
 * - The reader:  `claude -p` with Sonnet and nothing of the repo (`ClaudePrint`), answering pass or fail, why, and
 *   a rewrite.
 *   - a fail:  `check()` throws, quoting the reasons and the rewrite to use
 *   - `--title-ok` skips it, for a deliberate case
 * - It converges (epic `epic-engine` I390:  it once refused five titles in a row, two its own rewrites):
 *   - the reader passes unless a reader with no context would truly be lost, by examples of both (`RULE`)
 *   - its rewrite must meet the word-count rule too (`ShortTitle`):  one that doesn't is cut to its first sentence,
 *     else not offered (`offerable()`), so it never suggests a title `epic add` would refuse
 *   - a title that IS a rewrite it offered in the last hour passes unread (`SUGGESTIONS_FILE`, any epic or item)
 * - Skipped:  no `claude` on the `PATH` (CI, Codex), with one line on stderr;  under a test runner (`VITEST`),
 *   quietly.
 *   - A reader that fails (offline, a timeout) lets the title through, saying so:  it's a check, not a gate on work.
 * - Nothing else is kept:  every other title is read anew.
 * - Testable without a model:  the reader and the skip test are constructor options.
 * - node only;  imported by path
 ****************/
export class TitleReader {
  /** the reader:  `claude -p` by default */
  private readonly ask: TitleAsk
  /** why the check can't run here, or `undefined` when it can */
  private readonly skipReason: () => TitleSkip
  /** where the skip and failure lines go */
  private readonly warn: (line: string) => void
  /** where the rewrites it offered are kept, an hour each */
  private readonly suggestionsFile: string
  /** the clock, ms */
  private readonly now: () => number
  /** said the skip line once already */
  private saidSkip = false

  constructor({
    ask = claudeReader,
    skipReason = defaultSkipReason,
    warn = (line) => void process.stderr.write(`${line}\n`),
    suggestionsFile = join(EpicHome.folder(), SUGGESTIONS_FILE),
    now = Date.now
  }: TitleReaderProps = {}) {
    this.ask = ask
    this.skipReason = skipReason
    this.warn = warn
    this.suggestionsFile = suggestionsFile
    this.now = now
  }

  /**
   * Read `title` cold;  throw when it fails.
   * - a known trailing tag (`(coherence)`:  `ShortTitle.TAGS`) is a label, so the reader never sees it (I385)
   * - a title the reader itself offered in the last hour passes unread (I390)
   * - `kind`:  the item's kind (`issue`, `todo` ...), or `phase`
   * - throws `PlanDocError` on a fail, with the reasons and the rewrite (`refusal()`)
   *   - SIDE EFFECT:  the rewrite offered is kept an hour, in `suggestionsFile`
   * - NEVER throws for a reader that can't run:  one line on stderr, and the title stands
   */
  check(title: string, kind: string): void {
    const skip = this.skipReason()
    if (skip) {
      if (!this.saidSkip && !skip.quiet) this.warn(`epic:  title not read cold (${skip.why})`)
      this.saidSkip = true
      return
    }
    if (this.suggested().includes(TitleReader.sameness(title))) return
    let verdict: TitleVerdict
    try {
      verdict = this.ask({ system: RULE, text: TitleReader.question(ShortTitle.withoutTag(title), kind) })
    } catch (error) {
      this.warn(`epic:  title not read cold:  ${(error as Error).message}`)
      return
    }
    if (verdict.pass) return
    const rewrite = TitleReader.offerable(verdict.rewrite)
    if (rewrite) this.remember(rewrite)
    throw new PlanDocError(TitleReader.refusal(title, { ...verdict, rewrite: rewrite ?? "" }))
  }

  /**
   * The reader's `rewrite` as a title `epic add` takes (`ShortTitle`), or `undefined` when it can't be one.
   * - tidied:  stray markup and a quote wrapped round it taken off (the reader has answered `">The ...` before)
   * - too long or two sentences:  its first sentence alone, when that passes;  else none
   * - pure
   */
  static offerable(rewrite: string): string | undefined {
    let text = rewrite
      .replace(/<[^>]*>/g, "")
      .replace(/^\s*"?>\s*/, "")
      .trim()
    if (/^["“].*["”]$/.test(text)) text = text.slice(1, -1).trim()
    // a closing quote left over from the junk taken off the front
    if (/["”]$/.test(text) && (text.match(/["“”]/g)?.length ?? 0) % 2) text = text.slice(0, -1).trim()
    if (!text) return undefined
    if (!ShortTitle.problemOf(text)) return text
    const first = /^.*?[.!?](?=\s+[A-Z])/.exec(text)?.[0]
    return first && !ShortTitle.problemOf(first) ? first : undefined
  }

  /** `title` as compared with a rewrite offered:  no tag, spaces and case evened out, no closing period. */
  static sameness(title: string): string {
    return ShortTitle.withoutTag(title).replace(/\s+/g, " ").replace(/\.$/, "").toLowerCase()
  }

  /** The rewrites offered in the last hour, as `sameness()` has them;  none when the file won't read.  NEVER throws. */
  private suggested(): string[] {
    try {
      const kept = DataFile.read<KeptSuggestion[]>(this.suggestionsFile) ?? []
      return kept.filter(({ at }) => this.now() - at < SUGGESTION_MS).map(({ title }) => title)
    } catch {
      return []
    }
  }

  /** Keep `rewrite` an hour, dropping the ones past theirs.  NEVER throws:  a title it can't keep is read again. */
  private remember(rewrite: string): void {
    try {
      const kept = (DataFile.read<KeptSuggestion[]>(this.suggestionsFile) ?? []).filter(
        ({ at }) => this.now() - at < SUGGESTION_MS
      )
      mkdirSync(dirname(this.suggestionsFile), { recursive: true })
      DataFile.write(this.suggestionsFile, [...kept, { title: TitleReader.sameness(rewrite), at: this.now() }])
    } catch (error) {
      this.warn(`epic:  the title reader's rewrite not kept:  ${(error as Error).message}`)
    }
  }

  /** What the reader is handed:  the kind and the title, nothing else. */
  static question(title: string, kind: string): string {
    return `Kind:  ${kind}\nTitle:  ${title}`
  }

  /** The refusal for a failed `title`:  each reason, the rewrite to use, and how to keep it anyway. */
  static refusal(title: string, verdict: TitleVerdict): string {
    const reasons = verdict.reasons.length ? verdict.reasons : ["it doesn't read cold"]
    return [
      `rewrite this title:  a reader with no context couldn't follow it.`,
      `  "${title}"`,
      ...reasons.map((reason) => `- ${reason}`),
      ...(verdict.rewrite.trim() ? [`Try:  "${verdict.rewrite.trim()}"`] : []),
      `(the rule:  plan-doc.md, "Rules", TITLES;  --title-ok keeps it as it is)`
    ].join("\n")
  }
}

////////////////
// ## Types
////////////////

/** What the reader answers. */
export type TitleVerdict = {
  /** a reader with no context understands it */
  pass: boolean
  /** what trips the reader, one short line each;  none on a pass */
  reasons: string[]
  /** the title rewritten by the rule;  `""` on a pass */
  rewrite: string
}

/** What the reader is handed:  its instructions, and the kind and title (`TitleReader.question()`). */
export type TitleRequest = { system: string; text: string }

/** Why the reader can't run here (`quiet`:  say nothing, a test run), or `undefined` when it can. */
export type TitleSkip = { why: string; quiet?: boolean } | undefined

/** Reads a title cold and answers;  throws when it can't. */
export type TitleAsk = (request: TitleRequest) => TitleVerdict

/** `TitleReader`'s constructor options:  each a stand-in for a test. */
export type TitleReaderProps = {
  /** the reader;  default `claude -p` */
  ask?: TitleAsk
  /** why the check can't run here;  default:  no `claude` on the `PATH`, or a test runner */
  skipReason?: () => TitleSkip
  /** prints a line;  default stderr */
  warn?: (line: string) => void
  /** where the rewrites offered are kept;  default `title-suggestions.json5` in the epic home (`EpicHome`) */
  suggestionsFile?: string
  /** the clock, ms;  default `Date.now` */
  now?: () => number
}

/** A rewrite the reader offered, kept an hour:  as `TitleReader.sameness()` has it, and when (ms). */
type KeptSuggestion = { title: string; at: number }

////////////////
// ## The rule and the reader
////////////////

/** The rewrites the reader offered, in the epic home:  a title that is one passes unread for an hour (I390). */
const SUGGESTIONS_FILE = "title-suggestions.json5"

/** How long a rewrite offered passes unread, ms:  an hour. */
const SUGGESTION_MS = 60 * 60 * 1000

/**
 * The reader's instructions:  plan-doc.md's TITLES rule, told to someone who has never seen the project.
 * - calibrated to PASS what meets the rule, with examples both ways, and to rewrite within `ShortTitle`'s limits
 *   (epic `epic-engine` I390)
 */
const RULE = `You read one title of an item on a software project's planning page, the way its owner, Owen, will:
hours or days later, cold, without following the work.  Items are questions, judgement calls, todos, issues, tests,
decisions and phases.  The project is Spell, a programming language with its own editor, pages and commands;
Owen knows its plain words:  Spell, the editor, an epic page, a test, "main" (the main copy of the code), Spell's
Python version, a command he types (\`epic add\`).

PASS unless a reader with no context would truly be lost.  Most titles pass.  A title needn't name every detail:
the details sit under it.  Wording you'd change, a test or command not named exactly, or a cause not spelled out
are NOT reasons to fail.

FAIL only for one of these:
- an internal name Owen can't know:  a class, module or file name, or a nickname like "the pack", "the monitor",
  "the kit", "the fork", "the poller", "the hook", unless the title says what it is to Owen
- a bare id as its lead ("P52:  chips follow renumbering")
- a passing condition that will mean nothing later:  a pid, "after the 4-line fix", "the turn was stuck"
- it never says what changed or what's wrong

Titles that PASS:
- "Each Claude session's background 'listen for my Send' process now uses 48 MB instead of 188 MB.  Nothing you'd see."
- "On an epic page, an item's commit chip keeps pointing at the right phase when phases are renumbered."
- "An epic that touches several of Spell's folders counts as one epic, so a second session isn't wrongly blocked from
  starting."

Titles that FAIL:
- "The monitor is split in two:  a tiny plain-JS poller, and a short look that runs the epic tool" (internal names)
- "P52:  chips follow renumbering" (a bare id, and "chips" unexplained)

On a fail, give each reason in one short line, and a rewrite that keeps every fact the title has (guess the plain
meaning of an internal name from the words;  never invent facts, never a placeholder like "(name it)").
The rewrite MUST be a title the project takes:
- at most 25 words, ONE sentence, plain text:  no quotes round it, no markup, no list after ";"
- the one second sentence allowed:  "Nothing you'd see." for a change with no visible effect
On a pass:  no reasons, rewrite "".`

/** The reader's model:  a judgement of how words read, so Sonnet over Haiku, kept fast by the short prompt. */
const MODEL = "sonnet"

/** The longest a read may take, ms. */
const READ_TIMEOUT_MS = 60_000

/** The answer's shape, as `claude -p --json-schema` takes it:  `TitleVerdict`. */
const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    pass: { type: "boolean" },
    reasons: { type: "array", items: { type: "string" } },
    rewrite: { type: "string" }
  },
  required: ["pass", "reasons", "rewrite"]
}

/** Is `answer` a verdict:  it says pass or fail, at least. */
function isVerdict(answer: unknown): answer is TitleVerdict {
  return typeof (answer as TitleVerdict | undefined)?.pass === "boolean"
}

/** The default reader:  `claude -p`, as fresh as it gets (`ClaudePrint`);  `EPIC_TITLE_READER` set while it runs. */
function claudeReader({ system, text }: TitleRequest): TitleVerdict {
  const verdict = ClaudePrint.ask({
    system,
    text,
    model: MODEL,
    schema: VERDICT_SCHEMA,
    label: "the title reader",
    marker: "EPIC_TITLE_READER",
    timeoutMs: READ_TIMEOUT_MS,
    isAnswer: isVerdict
  })
  return { pass: verdict.pass, reasons: verdict.reasons ?? [], rewrite: verdict.rewrite ?? "" }
}

/**
 * Why the default reader can't run here, or `undefined` when it can.
 * - a test runner (`VITEST`):  quietly, so no test's output changes
 * - no `claude` on the `PATH` (CI, Codex):  said once
 */
export function defaultSkipReason(): TitleSkip {
  if (process.env.VITEST) return { why: "a test run", quiet: true }
  return hasClaude(process.env.PATH ?? "") ? undefined : { why: "no claude on the PATH" }
}

/** Is there a `claude` command in one of `path`'s folders. */
export function hasClaude(path: string): boolean {
  const names = process.platform === "win32" ? ["claude.exe", "claude.cmd"] : ["claude"]
  return path
    .split(delimiter)
    .filter(Boolean)
    .some((folder) => names.some((name) => existsSync(join(folder, name))))
}
