import type { TranslationNames } from "./TranslationNames"
import { glossaryContext, jsonIn, objectSchema } from "./NamesPass"
import type { ClaudeRunner, JsonSchema } from "./translate.types"

/**
 * The FIX-UP PASS of a translation (epic `spanish` P25):  each line the mechanical writer got wrong, written again
 * by `claude -p`, in context.
 * - Which lines (`FixUpLine`):  one that fails lint, one a failed test points to, one the writer couldn't write
 *   (`// TODO: translate`), one it wrote whose word order may be wrong (`TranslatedFile.risky`),
 *   one that compiles to a different program than its English (`ShapeCheck`, epic `spanish` P26).
 * - ONE call a round for all of them (`round()`):  each with its English, the Spanish written, the lines around it
 *   in both, and what's wrong;  and the dictionary, so it says each name as the rest of the program does.
 *   - Its answer is JSON of one shape (`FIXES_SCHEMA`);  one that isn't anyway (cut off, say) is asked again in
 *     two halves, side by side, so a big round isn't lost (epic `spanish` P27).
 * - Its answer may fix any line it was shown, not only the one asked about:
 *   a test that fails on `su nombre debería ser "comodín rojo"` is fixed where the name is made.
 * - One line in, one line out:  an answer that would add or remove lines is left out, so `--update` still lines up.
 * - The command runs the rounds, checking between them (`TranslationChecker`), and stops after a few.
 * - Pure, but for `run`:  no files.
 */
export class FixUps {
  /** Runs `claude -p`. */
  readonly run: ClaudeRunner
  /** The project's names dictionary, for the prompt. */
  readonly names: TranslationNames
  /** The other language pack's glossary, for the system prompt (`glossaryContext()`). */
  readonly glossary: string | undefined
  /** How many lines each side of a line to show. */
  readonly context: number
  /** How long each `claude` call took, in milliseconds:  one a round. */
  readonly durations: number[] = []
  /** What went wrong, for the command to print. */
  readonly notes: string[] = []

  constructor({
    run,
    names,
    glossary,
    context = 10
  }: {
    run: ClaudeRunner
    names: TranslationNames
    glossary?: string
    context?: number
  }) {
    this.run = run
    this.names = names
    this.glossary = glossary
    this.context = context
  }

  /**
   * Ask `claude` to fix each of `lines`, shown in `files`;  the fixes it answers, each a line of a file shown.
   * - Once;  an answer that isn't JSON, asked again in two halves at once (one line:  again as it was), and no more.
   * - Each fix keeps its line's indent and bullet as the file has them:  only what follows is `claude`'s.
   * - NEVER throws:  none, noted in `notes`, if `claude` fails or answers what isn't JSON.
   */
  async round(lines: FixUpLine[], files: Map<string, FixUpFile>): Promise<FixUp[]> {
    if (!lines.length) return []
    const answer = await this.ask(lines, files)
    if (answer) return this.fixesIn(answer, lines, files)
    const halves = lines.length > 1 ? [lines.slice(0, lines.length / 2), lines.slice(lines.length / 2)] : [lines]
    this.notes.push(
      `claude's fixes weren't JSON:  asked again${halves.length > 1 ? `, in two halves of ${halves[0]!.length}` : ""}`
    )
    const again = await Promise.all(halves.map((half) => this.ask(half, files)))
    if (again.some((each) => !each)) this.notes.push("claude's fixes aren't JSON:  left the lines as they were")
    return again.flatMap((each, at) => (each ? this.fixesIn(each, halves[at]!, files) : []))
  }

  /**
   * Ask `claude` once to fix `lines`:  its answer, parsed;  `undefined` if it failed, or isn't JSON.
   * - A failure is noted in `notes`, and NOT asked again:  the runner has retried what's worth retrying.
   */
  private async ask(lines: FixUpLine[], files: Map<string, FixUpFile>): Promise<FixUpsAnswer | undefined> {
    const started = performance.now()
    let answer: string
    try {
      answer = await this.run(this.prompt(lines, files), {
        schema: FIXES_SCHEMA,
        context: glossaryContext(this.glossary, this.names.to)
      })
    } catch (error) {
      this.notes.push(`claude couldn't fix the lines:  ${error instanceof Error ? error.message : String(error)}`)
      return { fixes: [] }
    } finally {
      this.durations.push(performance.now() - started)
    }
    const parsed = jsonIn(answer) as FixUpsAnswer | undefined
    return Array.isArray(parsed?.fixes) ? parsed : undefined
  }

  /** The fixes in `answer` to the lines shown for `lines`:  see `round()`. */
  private fixesIn(answer: FixUpsAnswer, lines: FixUpLine[], files: Map<string, FixUpFile>): FixUp[] {
    const shown = new Set(
      lines.flatMap(({ path, line }) => this.rangeOf(line, files.get(path)!).map((at) => `${path}:${at}`))
    )
    const fixes: FixUp[] = []
    for (const { file, line, text } of answer.fixes) {
      const path = file && (files.has(file) ? file : files.has(`/${file}`) ? `/${file}` : undefined)
      if (!path || typeof line !== "number" || typeof text !== "string" || /\n/.test(text)) continue
      const at = line - 1
      if (!shown.has(`${path}:${at}`)) continue
      const old = files.get(path)!.lines[at]!
      const fixed = `${/^[ \t]*/.exec(old)![0]}${text.trimStart()}`
      if (fixed !== old) fixes.push({ path, line: at, old, text: fixed })
    }
    return fixes
  }

  /** What `claude` is asked:  see `round()`. */
  prompt(lines: FixUpLine[], files: Map<string, FixUpFile>): string {
    const { from, to } = this.names
    const { comments: _comments, ...dictionary } = this.names.toJSON()
    const items = lines.map(({ path, line, why }, at) => {
      const file = files.get(path)!
      const range = this.rangeOf(line, file)
      const numbered = (text: string[]) =>
        range.map((index) => `${String(index + 1).padStart(4)}${index === line ? " >" : "  "} ${text[index] ?? ""}`)
      return [
        `### ${at + 1}. ${path.slice(1)}, line ${line + 1}:  ${why.join(";  ")}`,
        `${from.name}:  \`${file.english[line]?.trim()}\``,
        `${to.name}, as written:  \`${file.lines[line]?.trim()}\``,
        "",
        `${to.name}, around it:`,
        "```spell",
        ...numbered(file.lines),
        "```",
        `${from.name}, around it:`,
        "```spell",
        ...numbered(file.english),
        "```"
      ].join("\n")
    })
    return [
      `A spell program was translated from ${from.name} into ${to.name} (\`${to.lang}\`) line by line, by machine;`,
      "the lines below are wrong, or may be.  Spell reads programs written in plain words:  its own words are the",
      `glossary's (above), and the program's own names the dictionary's.`,
      `Fix each line so it reads as natural ${to.name}, means what the ${from.name} means, and spell reads it:`,
      "- a line that fails lint or a test:  what it says is wrong.  The fault may be on another line shown:  fix that one.",
      "- a line marked `// TODO: translate`:  write it in full, and drop the note",
      "- a line that means something else (compiles to a different program):  compare the two javascripts given;",
      "  a loop's or a step's own variable may read as something else in the translation:  give it another word,",
      "  on every line shown that uses it",
      `- a text joined to a value with \`+\`:  put its words where ${to.name} says them, e.g.`,
      '  `its color + " joker"` => `"comodín " + su color`;  a test that checks that text must agree with it',
      "- a line that's right already:  leave it out",
      "- keep each name as the dictionary says it (but for that variable), each line one line,",
      "  and its indent and `- ` bullet as they are",
      "",
      "Answer with ONE JSON object:",
      '`{ "fixes": [ { "file": "Carta.es.spell", "line": 142, "text": "- su nombre es \\"comodín \\" + su color" } ] }`',
      "- `line`:  its number, as shown;  `text`:  the whole new line, without its indent",
      "",
      "## The lines",
      ...items,
      "",
      "## The dictionary:  the program's names",
      "```json",
      JSON.stringify(dictionary, null, 2),
      "```"
    ].join("\n")
  }

  /** The indexes of the lines shown around line `line` of `file`. */
  rangeOf(line: number, file: FixUpFile): number[] {
    const first = Math.max(0, line - this.context)
    const last = Math.min(file.lines.length - 1, line + this.context)
    return Array.from({ length: last - first + 1 }, (_, at) => first + at)
  }
}

/** What `claude` answers a round:  each fix, a whole line of a file shown. */
type FixUpsAnswer = { fixes: Array<{ file?: string; line?: number; text?: string }> }

/** The shape of a round's answer (`FixUpsAnswer`), the same every round. */
const FIXES_SCHEMA: JsonSchema = objectSchema({
  fixes: {
    type: "array",
    items: objectSchema({ file: { type: "string" }, line: { type: "integer" }, text: { type: "string" } })
  }
})

/** A line to fix:  its file's path in the translation (`/Carta.es.spell`), its index, and what's wrong. */
export type FixUpLine = { path: string; line: number; why: string[] }

/** A translated file as the fix-up pass sees it:  its lines, and its source's, one for one. */
export type FixUpFile = { lines: string[]; english: string[] }

/** One line fixed:  where, what it was, and what it is now. */
export type FixUp = { path: string; line: number; old: string; text: string }
