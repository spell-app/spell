import escapeRegExp from "lodash/escapeRegExp"

import { CLI } from "spell/cli"
import type { SRV } from "spell/server"
import type { NamesPass } from "spell-parser/spell/translate/NamesPass"
import { TranslationNames } from "spell-parser/spell/translate/TranslationNames"
import type { MissingName, NamesKind, SourceFile, TranslatedType } from "spell-parser/spell/translate/translate.types"

/****************
 * ### `NamesReview`
 * `spell translate --review` (epic `spanish` P31, P32):  the names a translation drafted, shown to a person on a page
 * before any line is written with them -- a COMMAND RUN (the kit's `SRV.CommandRun`), in the Review tab.
 * - `open()`, before the names pass:  the page, with the effort picker (`--effort`'s tiers)
 * - `review()`, after it:  a row per name drafted (not the glossary's, not the dictionary's), then each answer AS
 *   IT'S GIVEN (`answersAsTheyCome()`), until Send or `--review-timeout`;  each answer goes into the dictionary,
 *   marked reviewed, so `--update` never asks again
 *   - accepted:  the proposal, as it was;  typed or picked:  checked readable at once, as a drafted name is
 *     (`NamesPass.problemWith()`);  one that isn't, its row says why straight away, for a person to try again
 *   - a good one is TAKEN (`take()`):  the page marks it;  changed again, it's checked again
 *   - ticked "for every project":  into `ticked`, for the command to add to the shared glossary
 *   - no Send in time:  the answers given so far count (J187), the rest stay as drafted
 * - The run stays open through the lines and the fix-ups:  the command shows its passes there, reads the effort
 *   picked before each, and finishes it (`finish()`) when it's done.
 * - With `--no-ai`, its rows are the names still missing, to type:  no proposal, no alternatives.
 * - Knows nothing of files:  the command reads and writes the dictionary and the glossary.
 * - Its run comes from `opener`, injected:  the kit's `CommandRun.open()` (`openCommandRun()`), a test's fake.
 *   - `spell/server` is loaded only when a review opens:  types only here.
 ****************/
export class NamesReview {
  /** The dictionary its answers go into. */
  readonly names: TranslationNames
  /** The names pass that drafted them:  its alternatives, and its readability check. */
  readonly pass: NamesPass
  /** The project's files:  the lines each name is in. */
  readonly files: SourceFile[]
  /** Opens the run:  the kit's `CommandRun.open()`, or a test's fake. */
  readonly opener: ReviewRunOpener
  /** The folder of the checkout:  which content folder holds the run. */
  readonly root: string
  /** The project's name, for the page's title. */
  readonly projectName: string
  /** The command, as a person would type it, for the page. */
  readonly command: string
  /** How long to listen for answers, until Send, ms. */
  readonly timeoutMs: number
  /** Whether Claude drafted the names (`false`:  `--no-ai`, every row typed). */
  readonly ai: boolean
  /** The efforts the page offers, and the one it starts at (`--effort`). */
  readonly effort: SRV.RunEffortChoice
  /** The names a person ticked "for every project", readable:  the command adds them to the shared glossary. */
  readonly ticked: MissingName[] = []
  /** How it went, for the report:  see `ReviewOutcome`. */
  readonly outcome: ReviewOutcome = { accepted: 0, typed: 0, picked: 0, untouched: 0, timedOut: false, unreadable: [] }
  /** The run, once open. */
  run?: ReviewRun
  /** Where its page is:  its URL, else its path. */
  where?: string
  /** The rows asked, by row id, as `review()` shows them. */
  private readonly asked = new Map<string, AskedRow>()

  constructor(props: NamesReviewProps) {
    this.names = props.names
    this.pass = props.pass
    this.files = props.files
    this.opener = props.opener
    this.root = props.root
    this.projectName = props.projectName
    this.command = props.command
    this.timeoutMs = props.timeoutMs
    this.ai = props.ai
    this.effort = props.effort
  }

  /**
   * Open the run, with no rows yet, and show its page:  before the names pass, so its progress shows there.
   * - SIDE EFFECT:  a run folder in the content folder;  the page opens in the Review tab, else a browser
   * - throws what the opener throws, e.g. `CommandRunError` for a checkout with no content folder
   */
  async open(asking: number): Promise<this> {
    const { to } = this.names
    this.run = await this.opener({
      root: this.root,
      command: this.command,
      title: `Names for ${this.projectName}, in ${to.name}`,
      description: this.ai
        ? `Each name Claude drafted:  accept it, type over it, or pick another;  each is used as you give it.  ` +
          `Tick "${TICK_LABEL}" to put it in the ${to.name} glossary.  ` +
          `Then Send:  the lines are written with your names, and --update never asks again.  ` +
          `The effort takes at the next pass.`
        : `Each name the dictionary lacks (--no-ai):  type it, or leave it TODO.  ` +
          `Tick "${TICK_LABEL}" to put it in the ${to.name} glossary.  Then Send.`,
      columns: COLUMNS,
      answerLabel: to.name,
      rows: [],
      effort: this.effort
    })
    this.where = await this.run.show()
    this.run.progress(this.ai ? `names:  asking Claude for ${asking}` : `names:  ${asking} missing (--no-ai)`)
    return this
  }

  /**
   * Show `wanted` (the names this run asked for) as rows, and take each answer as it comes, until Send or the time
   * limit:  see the class docstring.
   * - `drafting`:  how long the names pass took, ms, for its progress line
   * - leaves the run OPEN:  the command shows its next passes there, and finishes it
   * - SIDE EFFECT:  changes `names`, `ticked`, `outcome`
   */
  async review(wanted: MissingName[], drafting: number): Promise<this> {
    const run = this.run!
    for (const name of wanted.filter(({ kind }) => kind !== "genders")) {
      const { row } = this.rowFor(name)
      this.asked.set(row.id, { name, row, original: this.entryOf(name) })
    }
    const rows = [...this.asked.values()]
    const drafted = rows.filter(({ row }) => row.value).length
    this.showRows()
    run.progress(
      this.ai
        ? `names:  ${drafted} drafted in ${seconds(drafting)};  your turn:  accept, type or pick, then Send`
        : `names:  ${rows.length} to type, then Send`
    )
    run.progress(`each answer is used as you give it;  Send by ${clockTime(Date.now() + this.timeoutMs)} to go on`)
    const answers = run.answersAsTheyCome({ timeoutMs: this.timeoutMs })
    let next = await answers.next()
    while (!next.done) {
      this.take(next.value)
      next = await answers.next()
    }
    this.settle(next.value)
    const { accepted, typed, picked, timedOut } = this.outcome
    run.progress(
      `${timedOut ? "no Send in time:  " : ""}names:  ${accepted} accepted, ${typed} typed, ${picked} picked;  ` +
        "writing the lines"
    )
    return this
  }

  /**
   * Until the returned undo is called:  on Ctrl-C (`SIGINT`) or `SIGTERM`, finish the run `stopped`, so its page
   * says so, and exit (130, or 143).
   * - SIDE EFFECT:  process signal listeners
   */
  finishOnInterrupt(): () => void {
    const onSignal = (signal: NodeJS.Signals) => {
      this.run?.finish("stopped")
      process.exit(signal === "SIGINT" ? 130 : 143)
    }
    process.once("SIGINT", onSignal)
    process.once("SIGTERM", onSignal)
    return () => {
      process.off("SIGINT", onSignal)
      process.off("SIGTERM", onSignal)
    }
  }

  ////////////////
  // ## Rows
  ////////////////

  /**
   * `name`'s row:  its English, gender, kind, where it came from, the first line it's in;  its proposal, the
   * alternatives Claude gave, a tick for a name the glossary can hold.
   * - `why`:  why the answer given can't be read, shown on the row while it stands;  its id is the same
   */
  rowFor(name: MissingName, why?: string): ReviewRow {
    const proposal = this.valueOf(name)
    const alternatives = this.pass
      .alternativesFor(name)
      .map((each) => (typeof each === "string" ? each : each.name))
      .filter((each) => each !== proposal)
    const lines = this.linesWith(name)
    const row: SRV.RunRow = {
      id: `${name.kind}:${name.words}`,
      cells: {
        english: name.words,
        gender: this.genderOf(name, proposal) ?? "",
        kind: KIND_LABELS[name.kind] ?? name.kind,
        from: why
          ? `not readable:  ${why}`
          : !this.ai
            ? "missing (--no-ai)"
            : proposal
              ? "Claude"
              : "Claude:  none readable",
        lines: lines[0] ?? ""
      },
      value: proposal,
      ...(alternatives.length ? { alternatives } : {}),
      ...(TICKABLE.includes(name.kind) ? { tick: { label: TICK_LABEL } } : {}),
      ...(lines.length > 1 || why ? { details: [...(why ? [`Not readable:  ${why}`] : []), ...lines] } : {})
    }
    return { name, row }
  }

  /** `name`'s value in the dictionary, filled in;  `""` for none, or `TODO`. */
  private valueOf({ kind, words }: MissingName): string {
    const value = kind === "types" ? this.names.data.types[words]?.name : this.names.data[kind][words]
    return value && value !== TranslationNames.TODO ? value : ""
  }

  /** A type's gender, or a noun's from the dictionary's `genders`;  `undefined` for a verb, a text, a comment. */
  private genderOf({ kind, words }: MissingName, value: string): string | undefined {
    if (kind === "types") return this.names.data.types[words]?.gender
    if (kind === "names" && value) return this.names.data.genders[value]
    return undefined
  }

  /**
   * The lines of the project that use `name`, `Card.spell:3  its label is ...`, the first `MAX_LINES`:
   * a name or a type as a whole word (`todos-app` as `todos app` too), a text or a comment as written.
   */
  private linesWith({ kind, words }: MissingName): string[] {
    const spelled =
      kind === "texts" || kind === "comments" ? escapeRegExp(words) : escapeRegExp(words).replace(/\\? /g, "[\\s-]?")
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${spelled}(?![\\p{L}\\p{N}])`, "iu")
    const found: string[] = []
    for (const file of this.files) {
      file.contents.split("\n").forEach((line, at) => {
        if (found.length < MAX_LINES && pattern.test(line))
          found.push(`${file.path.slice(1)}:${at + 1}  ${line.trim()}`)
      })
    }
    return found
  }

  ////////////////
  // ## Answers
  ////////////////

  /**
   * Take one answer, as it's given:  into the dictionary at once, or, when spell can't read it, its row saying why.
   * - empty, or `TODO`:  the proposal again, as drafted
   * - `accepted`:  the proposal
   * - `typed`, `picked`:  checked readable (`problemWith()`), then set;  the row is marked taken (`take()`)
   * - given again (changed):  the one before undone first, then this one taken the same way
   * - a row this review didn't ask:  left alone
   * - SIDE EFFECT:  changes `names`;  `setRows()` when a row's problem comes or goes
   */
  private take({ rowId, answer }: SRV.RunRowAnswer): void {
    const asked = this.asked.get(rowId)
    if (!asked) return
    const { name, row } = asked
    this.restore(asked)
    asked.taken = undefined
    const value = answer.value.trim()
    if (!value || value === TranslationNames.TODO) return this.showProblem(asked, undefined)
    if (answer.outcome === "accepted" && value === row.value) {
      asked.taken = { outcome: "accepted", ticked: !!answer.ticked }
    } else {
      const typed = this.answerFor(name, value, row.value)
      const why = this.problemWith(name, typed)
      if (why) return this.showProblem(asked, `\`${value}\`:  ${why}`)
      this.names.add(name.kind, name.words, typed)
      asked.taken = { outcome: answer.outcome === "picked" ? "picked" : "typed", ticked: !!answer.ticked }
    }
    this.showProblem(asked, undefined)
    this.run!.take(rowId)
  }

  /**
   * Once the answers stop coming (`end`):  each taken one marked reviewed, and counted;  ticked ones into `ticked`;
   * each still unreadable noted, kept as drafted.
   * - no Send (`timed-out`, or the run finished meanwhile):  `outcome.timedOut`, the answers taken still count
   */
  private settle(end: SRV.RunAnswersEnd): void {
    this.outcome.timedOut = end !== "sent"
    for (const { name, taken, problem } of this.asked.values()) {
      if (problem) this.outcome.unreadable.push(`\`${name.words}\`:  ${problem}`)
      if (!taken) {
        if (!problem) this.outcome.untouched++
        continue
      }
      this.outcome[taken.outcome]++
      this.names.markReviewed(name)
      if (taken.ticked && TICKABLE.includes(name.kind)) this.ticked.push(name)
    }
  }

  /** Show `asked`'s row saying why its answer can't be read, or as asked (`why` undefined), when that changed. */
  private showProblem(asked: AskedRow, why: string | undefined): void {
    if (asked.problem === why) return
    asked.problem = why
    asked.shown = why ? this.rowFor(asked.name, why).row : undefined
    this.showRows()
    if (why) this.run!.progress(`can't read ${why}:  try another`)
  }

  /** The rows, each as asked, or saying why its answer can't be read.  SIDE EFFECT:  `setRows()`. */
  private showRows(): void {
    this.run!.setRows([...this.asked.values()].map(({ row, shown }) => shown ?? row))
  }

  /** `name`'s entry in the dictionary now:  a type's `{ name, gender }`, or text;  `undefined` for none. */
  private entryOf({ kind, words }: MissingName): string | TranslatedType | undefined {
    const entry = (this.names.data[kind] as Record<string, string | TranslatedType | undefined>)[words]
    return typeof entry === "object" ? { ...entry } : entry
  }

  /** Put `asked`'s name back as drafted, undoing an answer taken before.  SIDE EFFECT:  changes `names`. */
  private restore({ name, original }: AskedRow): void {
    if (original !== undefined) this.names.add(name.kind, name.words, original)
    else delete (this.names.data[name.kind] as Record<string, unknown>)[name.words]
  }

  /**
   * What an answer means for `name`:  text, or for a type `{ name, gender }`.
   * - A type's gender:  `(f)` or `(m)` after it says;  else its proposal's, when it's the proposal;
   *   else the alternative's it picked;  else the language's guess by its ending (`genderOf()`).
   */
  private answerFor(name: MissingName, value: string, proposal: string): string | TranslatedType {
    if (name.kind !== "types") return value
    const [, typed, said] = value.match(GENDER_SUFFIX) ?? [undefined, value, undefined]
    const gender =
      (said && (/^f/i.test(said) ? "feminine" : "masculine")) ??
      (typed === proposal ? this.names.data.types[name.words]?.gender : undefined) ??
      this.pass
        .alternativesFor(name)
        .find((each): each is TranslatedType => typeof each !== "string" && each.name === typed)?.gender ??
      this.names.genderOf(typed!)
    return { name: typed!, ...(gender ? { gender } : {}) }
  }

  /**
   * Why spell can't read `value` as `name`'s translation, if it can't:  the names pass's own check
   * (`NamesPass.problemWith()`), and a word another type or name has already -- spell would read the two as one.
   */
  problemWith(name: MissingName, value: string | TranslatedType): string | undefined {
    const problem = this.pass.problemWith(name, value)
    if (problem || (name.kind !== "types" && name.kind !== "names")) return problem
    const theirs = typeof value === "string" ? value : value.name
    const singular = (words: string) => this.names.from.inflector.singularize(words)
    const other = (words: string) => singular(words) !== singular(name.words)
    const { types, names } = this.names.data
    const owner =
      Object.entries(types).find(([words, type]) => type.name === theirs && other(words))?.[0] ??
      Object.entries(names).find(([words, each]) => each === theirs && other(words))?.[0]
    return owner ? `that's \`${owner}\` already -- one word, one thing` : undefined
  }

  ////////////////
  // ## Reporting
  ////////////////

  /**
   * How it went, a line for the report:  `review:  3 accepted, 1 typed, ...`;
   * `review:  no Send in time:  0 accepted, 1 typed, ...` when time ran out, the answers taken by then counted.
   */
  get summary(): string {
    const { accepted, typed, picked, untouched, timedOut, unreadable } = this.outcome
    const where = `${this.where ? `${this.where}:  ` : ""}${timedOut ? "no Send in time:  " : ""}`
    const parts = [`${accepted} accepted`, `${typed} typed`, `${picked} picked`]
    if (this.ticked.length) parts.push(`${this.ticked.length} for every project`)
    if (untouched) parts.push(`${untouched} left as ${this.ai ? "drafted" : "they were"}`)
    if (unreadable.length) parts.push(`${unreadable.length} still unreadable, kept as drafted`)
    return `review:  ${where}${parts.join(", ")}`
  }
}

/** `new NamesReview()`'s props:  see its fields. */
export type NamesReviewProps = Pick<
  NamesReview,
  "names" | "pass" | "files" | "opener" | "root" | "projectName" | "command" | "timeoutMs" | "ai" | "effort"
>

/**
 * How a review went:  how many rows were accepted, typed, picked or left alone (`untouched`);
 * whether time ran out (no Send:  the answers taken still count);  each answer still unreadable at the end, and why.
 */
export type ReviewOutcome = {
  accepted: number
  typed: number
  picked: number
  untouched: number
  timedOut: boolean
  unreadable: string[]
}

/** One row, and the name it's for. */
type ReviewRow = { name: MissingName; row: SRV.RunRow }

/**
 * A row `review()` asks:  its name, its row as asked, and its dictionary entry as drafted (`original`, to undo an
 * answer by);  the answer taken, if one is;  why the one given can't be read, and its row saying so, while it stands.
 */
type AskedRow = ReviewRow & {
  original: string | TranslatedType | undefined
  taken?: { outcome: "accepted" | "typed" | "picked"; ticked: boolean }
  problem?: string
  shown?: SRV.RunRow
}

/**
 * What a review needs of a command run:  the kit's `CommandRun` has it all, a test's fake too.
 * - The command uses the rest (P32):  the passes, the effort picked, `finish()`.
 */
export type ReviewRun = {
  /** show the page:  where it is, its URL or its path */
  show(): Promise<string>
  /** add a progress line */
  progress(text: string): unknown
  /** replace the rows:  answers are kept by row id */
  setRows(rows: SRV.RunRow[]): unknown
  /** each row's answer as it's given, until Send, the time limit or `finish()`:  its return value says which */
  answersAsTheyCome(props: SRV.RunAnswersProps): AsyncGenerator<SRV.RunRowAnswer, SRV.RunAnswersEnd>
  /** mark rows taken:  the page shows them so */
  take(...rowIds: string[]): unknown
  /** the effort picked on the page now, else the one it opened with */
  readonly effort: string | undefined
  /** start a pass on the page's status card;  `effort`:  the one it runs at, when it isn't the page's */
  startPass(name: string, facts?: SRV.RunPassStart): unknown
  /** how far the current pass has got */
  updatePass(facts: SRV.RunPassFacts): unknown
  /** end the current pass */
  endPass(facts?: SRV.RunPassFacts): unknown
  /** end the run:  `done`, `stopped` or `timed-out` */
  finish(status?: Exclude<SRV.RunStatus, "open">): unknown
}

/** Opens a review's run:  the kit's `CommandRun.open()` (`openCommandRun()`), or a test's fake. */
export type ReviewRunOpener = (props: SRV.RunOpenProps) => ReviewRun | Promise<ReviewRun>

/**
 * The kit's `CommandRun.open()`, in checkout `props.root`'s content folder, else the working folder's:
 * a project outside the checkout (`spell.spaces`) still reviews in it.
 * - Loads `spell/server` only now:  `spell translate` without `--review` never does.
 * - throws `CommandRunError` (`no-content-folder`) when neither names a content folder
 */
export async function openCommandRun(props: SRV.RunOpenProps): Promise<ReviewRun> {
  const { SRV } = await import("spell/server")
  try {
    return SRV.CommandRun.open(props)
  } catch (error) {
    if (!(error instanceof SRV.CommandRunError) || error.kind !== "no-content-folder") throw error
    return SRV.CommandRun.open({ ...props, root: process.cwd() })
  }
}

/**
 * `--review-timeout`, in ms:  minutes (`30`, `0.5`), or with its unit, `90s`, `10m`, `1h`;  default `DEFAULT_TIMEOUT_MS`.
 * - throws `CliError` for one it can't read
 */
export function reviewTimeoutMs(timeout: string | undefined): number {
  if (timeout === undefined) return DEFAULT_TIMEOUT_MS
  const [, amount, unit = "m"] = timeout.trim().match(/^(\d+(?:\.\d+)?)\s*([smh])?$/) ?? []
  if (!amount || !Number(amount)) {
    throw new CLI.CliError(`--review-timeout ${timeout}:  say how long, e.g. 30 (minutes), 90s, 10m or 1h`)
  }
  return Number(amount) * UNIT_MS[unit]!
}

/** How long a review takes answers before going on without Send, by default:  30 minutes. */
const DEFAULT_TIMEOUT_MS = 30 * 60_000

/** `--review-timeout`'s units, in ms. */
const UNIT_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000 }

/** The page's columns, before the answer's. */
const COLUMNS: SRV.RunColumn[] = [
  { key: "english", label: "English" },
  { key: "gender", label: "Gender" },
  { key: "kind", label: "Kind" },
  { key: "from", label: "From" },
  { key: "lines", label: "First line" }
]

/** Each section's name on the page. */
const KIND_LABELS: Partial<Record<NamesKind, string>> = {
  types: "type",
  names: "name",
  phrases: "phrase",
  texts: "text",
  comments: "comment"
}

/** The sections the shared glossary holds, so a row of one has a tick. */
const TICKABLE: NamesKind[] = ["types", "names", "phrases"]

/** The tick's label. */
const TICK_LABEL = "for every project"

/** How many lines a row shows, in its details. */
const MAX_LINES = 8

/** A type typed with its gender after it:  `tarea (f)`, `gestor (masculine)`. */
const GENDER_SUFFIX = /^(.*?)\s*\((f|m|feminine|masculine)\)$/i

/** `ms` as seconds, `6 s`. */
function seconds(ms: number): string {
  return `${Math.round(ms / 1000)} s`
}

/** `at` (ms since 1970) as a local clock time, `19:42`. */
function clockTime(at: number): string {
  const time = new Date(at)
  return `${time.getHours()}:${String(time.getMinutes()).padStart(2, "0")}`
}
