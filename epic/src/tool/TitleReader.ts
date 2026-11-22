import { existsSync } from "node:fs"
import { delimiter, join } from "node:path"

import { ClaudePrint } from "spell/epic/command/ClaudePrint"

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
 * - Skipped:  no `claude` on the `PATH` (CI, Codex), with one line on stderr;  under a test runner (`VITEST`),
 *   quietly.
 *   - A reader that fails (offline, a timeout) lets the title through, saying so:  it's a check, not a gate on work.
 * - Nothing cached:  every title is read anew.
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
  /** said the skip line once already */
  private saidSkip = false

  constructor({
    ask = claudeReader,
    skipReason = defaultSkipReason,
    warn = (line) => void process.stderr.write(`${line}\n`)
  }: TitleReaderProps = {}) {
    this.ask = ask
    this.skipReason = skipReason
    this.warn = warn
  }

  /**
   * Read `title` cold;  throw when it fails.
   * - a known trailing tag (`(coherence)`:  `ShortTitle.TAGS`) is a label, so the reader never sees it (I385)
   * - `kind`:  the item's kind (`issue`, `todo` ...), or `phase`
   * - throws `PlanDocError` on a fail, with the reasons and the rewrite (`refusal()`)
   * - NEVER throws for a reader that can't run:  one line on stderr, and the title stands
   */
  check(title: string, kind: string): void {
    const skip = this.skipReason()
    if (skip) {
      if (!this.saidSkip && !skip.quiet) this.warn(`epic:  title not read cold (${skip.why})`)
      this.saidSkip = true
      return
    }
    let verdict: TitleVerdict
    try {
      verdict = this.ask({ system: RULE, text: TitleReader.question(ShortTitle.withoutTag(title), kind) })
    } catch (error) {
      this.warn(`epic:  title not read cold:  ${(error as Error).message}`)
      return
    }
    if (!verdict.pass) throw new PlanDocError(TitleReader.refusal(title, verdict))
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
}

////////////////
// ## The rule and the reader
////////////////

/** The reader's instructions:  plan-doc.md's TITLES rule, told to someone who has never seen the project. */
const RULE = `You read one title of an item on a software project's planning page, the way its owner, Owen, will:
hours or days later, cold, without following the work.  Items are questions, judgement calls, todos, issues, tests,
decisions and phases.

A title PASSES when Owen understands it with no other context:
- it says what changed, or what's wrong, effect first, in plain words
- it names things by what Owen sees or types:  a page, a tab, a button, a command (\`epic add\`), a file he edits
- an internal name is a FAIL:  a class, module or file name, or a nickname like "the pack", "the monitor", "the kit",
  "the fork", "the poller", "the hook", unless the title says what it is to Owen
- a bare id as a lead is a FAIL ("P52:  chips follow renumbering")
- a passing condition is a FAIL:  a pid, "after the 4-line fix", "the turn was stuck"
- a change with no visible effect says so, ending "Nothing you'd see."
- at most about 30 words, one sentence (two when the second is "Nothing you'd see.")

Examples, before => after:
- "The monitor is split in two:  a tiny plain-JS poller, and a short look that runs the epic tool" =>
  "Each Claude session's background 'listen for my Send' process now uses 48 MB instead of 188 MB.  Nothing you'd see."
- "P52:  chips follow renumbering" =>
  "On an epic page, an item's commit chip keeps pointing at the right phase when phases are renumbered."

Be fair:  a plain, specific title passes even if you'd word it differently.  Fail only what Owen would have to ask
about.  On a fail, give each reason in one short line, and a rewrite that keeps every fact the title has (guess
the plain meaning of an internal name from the words;  never invent facts).  On a pass:  no reasons, rewrite "".`

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
function defaultSkipReason(): TitleSkip {
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
