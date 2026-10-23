import type { SP } from "spell-lang/spell"
import { NAMES_KINDS, TranslationNames } from "./TranslationNames"
import type {
  ClaudeEffort,
  ClaudeRunner,
  DeclarationStatement,
  MissingName,
  NamesData,
  NamesKind,
  SourceFile,
  TranslatedType
} from "./translate.types"

/**
 * The NAMES PASS of a translation (epic `spanish` P25):  every name a project's people chose, translated in ONE go,
 * before any line is written.
 * - What it asks for (`wanted()`):
 *   - every type, property, value and method the project declares (its declarations, the words file's source)
 *   - and whatever else the lines asked the dictionary for and didn't find:  variables, texts, comments
 *   - less what the dictionary has already:  a seed's, a person's, an import's
 * - ONE `claude -p` call for all of them (`draft()`), so the terms agree with each other:
 *   - each type with its gender, each noun in `names` with its gender (`genders`), each phrase's `(slots)` kept
 *   - its comments in calls of their own AT THE SAME TIME, a file each, thinking less:
 *     they're most of what's written, and no line's code reads them, so the names needn't wait for them
 * - Then each name is checked readable by the other language's parser (`problemWith()`):
 *   those that aren't are asked for again, once, together, saying why;  still unreadable, they're left out.
 * - `claude` runs through `run`, injected:  a test answers with a fake.
 * - Pure, but for `run`:  no files.  The command reads the glossary and writes the dictionary.
 */
export class NamesPass {
  /** The dictionary to fill. */
  readonly names: TranslationNames
  /** Runs `claude -p`. */
  readonly run: ClaudeRunner
  /** The project's files, for the prompt:  each name in context. */
  readonly files: SourceFile[]
  /** What the project declares:  its types, properties, values and methods. */
  readonly declarations: DeclarationStatement[]
  /** The program's words, its types' members by type (`SP.SpellWords`, its `<Project>.<lang>.js`), for the prompt. */
  readonly words: SP.SpellWordsData | undefined
  /** The other language pack's glossary, for the prompt:  spell's own words in it. */
  readonly glossary: string | undefined
  /** How long each `claude` call took, in milliseconds, in the order they started. */
  readonly durations: number[] = []
  /** What went wrong, for the command to print:  `claude` failing, an answer that isn't JSON, names left out. */
  readonly notes: string[] = []

  constructor({
    names,
    run,
    files,
    declarations,
    words,
    glossary
  }: {
    names: TranslationNames
    run: ClaudeRunner
    files: SourceFile[]
    declarations: DeclarationStatement[]
    words?: SP.SpellWordsData
    glossary?: string
  }) {
    this.names = names
    this.run = run
    this.files = files
    this.declarations = declarations
    this.words = words
    this.glossary = glossary
  }

  /**
   * What to ask for:  each name the project declares, then each of `missing` (what the lines lacked), each once --
   * less what the dictionary has.
   * - A name the project declares itself is asked for even when a project it imports declares it too (`draw it`):
   *   an import's words are its own, kept for ITS things.
   */
  wanted(missing: MissingName[]): MissingName[] {
    const { types, names, phrases } = TranslationNames.declaredIn(this.declarations)
    const declared: MissingName[] = [
      ...types.map((words) => ({ kind: "types" as const, words })),
      ...names.map((words) => ({ kind: "names" as const, words })),
      ...phrases.map((words) => ({ kind: "phrases" as const, words }))
    ]
    // a kind's values, `card rank`:  the dictionary works it out from its type and its property (`rango de carta`)
    const isKind = (words: string) =>
      words.split(" ").some((_, at, all) => {
        const type = all.slice(0, at).join(" ")
        const property = this.names.from.inflector.singularize(all.slice(at).join(" "))
        return at > 0 && types.includes(type) && names.includes(property)
      })
    const declaredKeys = new Set(declared.map(({ kind, words }) => `${kind}:${words}`))
    const seen = new Set<string>()
    return [...declared, ...missing].filter(({ kind, words }) => {
      const key = `${kind}:${words}`
      const ownOnly = declaredKeys.has(key)
      if (seen.has(key) || this.has(kind, words, ownOnly) || (kind === "types" && isKind(words))) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Ask `claude` for `wanted`, all at once, and add what it answers to the dictionary:  how many names it added.
   * - Each answer it can't read is asked for again, once, all together, saying why (`problemWith()`).
   * - NEVER throws:  a `claude` that fails, or answers what isn't JSON, adds nothing, noted in `notes`.
   */
  async draft(wanted: MissingName[]): Promise<number> {
    if (!wanted.length) return 0
    const names = wanted.filter(({ kind }) => kind !== "comments")
    const comments = wanted.filter(({ kind }) => kind === "comments")
    const [first, ...commented] = await Promise.all([
      names.length ? this.ask(names) : {},
      ...this.commentsByFile(comments).map(({ file, comments: each }) => this.ask(each, [], COMMENTS_EFFORT, [file]))
    ])
    const rejected = this.rejectFrom(first, names)
    let drafts = commented.reduce(mergedDrafts, first)
    if (rejected.length) {
      this.notes.push(`asked again for ${rejected.length} names:  ${rejected.map(({ why }) => why).join(";  ")}`)
      const again = await this.ask(
        rejected.map(({ name }) => name),
        rejected.map(({ why }) => why)
      )
      const still = this.rejectFrom(
        again,
        rejected.map(({ name }) => name)
      )
      for (const { why } of still) this.notes.push(`left TODO:  ${why}`)
      drafts = mergedDrafts(drafts, again)
    }
    return this.names.merge(drafts)
  }

  ////////////////
  // ## Checking an answer
  ////////////////

  /**
   * Take each answer out of `drafts` the other language's parser can't read, or that leaves out what it must:
   * which, and why.  A name of `wanted` it didn't answer at all counts too.
   */
  rejectFrom(drafts: NamesData, wanted: MissingName[]): Array<{ name: MissingName; why: string }> {
    const rejected: Array<{ name: MissingName; why: string }> = []
    for (const name of wanted) {
      if (name.kind === "genders") continue
      const section = (drafts[name.kind] ?? {}) as Record<string, unknown>
      const value = section[name.words]
      const why = value === undefined || value === "" ? "no answer" : this.problemWith(name, value)
      if (!why) continue
      delete section[name.words]
      rejected.push({ name, why: `\`${name.words}\` => \`${JSON.stringify(value) ?? ""}\`:  ${why}` })
    }
    return rejected
  }

  /**
   * Why the other language's parser can't read `value` as `name`'s translation, if it can't:
   * - a type with no gender, in a language with genders
   * - a name holding one of the language's small words (`de`, `en`, `y`):  `carta de prueba` reads as `carta` of `prueba`
   * - a phrase that drops a `(slot)` or its `it`, or puts `it` (`eso`) anywhere but straight after its verb
   */
  problemWith(name: MissingName, value: unknown): string | undefined {
    const { to } = this.names
    if (name.kind === "types") {
      const type = value as TranslatedType
      if (typeof type?.name !== "string" || !type.name) return "a type is `{ name, gender }`"
      if (to.articles?.genderOf && !type.gender) return "no gender"
      return this.unreadable("names", type.name)
    }
    if (typeof value !== "string") return "not a text"
    if (name.kind === "names") return this.unreadable("names", value)
    if (name.kind !== "phrases") return undefined
    const slots = (text: string) => (text.match(/\([^)]*\)/g) ?? []).length
    if (slots(value) !== slots(name.words)) return `keeps ${slots(name.words)} \`(slots)\`, not ${slots(value)}`
    const hasIt = (text: string, language: SP.Language) =>
      text
        .split(/\s+/)
        .some((word) => language.words.itWords?.has(word) || word === "it" || !!language.words.fusedIt?.test(word))
    if (hasIt(name.words, this.names.from) && !hasIt(value, to)) {
      return `keeps its \`it\`:  \`${[...(to.words.itWords ?? ["it"])][0]}\` straight after the verb`
    }
    return this.unreadable("phrases", value)
  }

  /**
   * Why spell can't read `value` as a name of section `kind` (`names` or `phrases`), if it can't:
   * a small word inside a name, an `it` away from its verb.
   */
  unreadable(kind: "names" | "phrases", value: string): string | undefined {
    const { to } = this.names
    const words = value.split(/\s+/)
    if (kind === "names") {
      const small = words.find(
        (word) => to.words.memberStopWords.has(word.toLowerCase()) || to.words.blacklist[word.toLowerCase()]
      )
      return small && words.length > 1 ? `holds \`${small}\`, one of spell's own words` : undefined
    }
    const it = words.findIndex((word, at) => at > 0 && to.words.itWords?.has(word))
    return it > 1
      ? `\`${words[it]}\` must come straight after the verb, e.g. \`voltear ${words[it]} boca arriba\``
      : undefined
  }

  ////////////////
  // ## Asking claude
  ////////////////

  /**
   * Ask `claude` for `wanted`, once:  what it answers, as dictionary sections.
   * - `rejected`:  answers it gave before that spell can't read, and why, for it to do better.
   * - Only the names asked for, and genders:  anything else it answers is left out.
   * - NEVER throws:  nothing, noted in `notes`, if `claude` fails or answers what isn't JSON.
   */
  async ask(
    wanted: MissingName[],
    rejected: string[] = [],
    effort = NAMES_EFFORT,
    files = this.files
  ): Promise<NamesData> {
    const started = performance.now()
    let answer: string
    try {
      answer = await this.run(this.prompt(wanted, rejected, files), { effort })
    } catch (error) {
      this.notes.push(`claude couldn't draft the names:  ${error instanceof Error ? error.message : String(error)}`)
      return {}
    } finally {
      this.durations.push(performance.now() - started)
    }
    const parsed = jsonIn(answer) as NamesData | undefined
    if (!parsed) {
      this.notes.push("claude's names aren't JSON:  left them TODO")
      return {}
    }
    // only what was asked for:  an answer may add a type again under its compiled name (`StockPile`)
    const asked = new Set(wanted.map(({ kind, words }) => `${kind}:${words}`))
    return Object.fromEntries(
      NAMES_KINDS.map((kind) => {
        const section = Object.entries(parsed[kind] ?? {})
        return [
          kind,
          Object.fromEntries(kind === "genders" ? section : section.filter(([words]) => asked.has(`${kind}:${words}`)))
        ]
      })
    )
  }

  /**
   * `comments`, each with the file it's in:  the files' comments, a call each, side by side --
   * so most of what's written is written at once.
   * - A comment no file holds as written goes with the first file's.
   */
  commentsByFile(comments: MissingName[]): Array<{ file: SourceFile; comments: MissingName[] }> {
    const groups = new Map<SourceFile, MissingName[]>()
    for (const comment of comments) {
      const file = this.files.find((each) => each.contents.includes(comment.words)) ?? this.files[0]
      if (file) groups.set(file, [...(groups.get(file) ?? []), comment])
    }
    return [...groups].map(([file, each]) => ({ file, comments: each }))
  }

  /** What `claude` is asked:  see `ask()`.  `files`:  the program's files to show it. */
  prompt(wanted: MissingName[], rejected: string[] = [], files = this.files): string {
    const { from, to } = this.names
    const toFill = Object.fromEntries(
      NAMES_KINDS.filter((kind) => kind !== "genders").map((kind) => [
        kind,
        Object.fromEntries(
          wanted
            .filter((name) => name.kind === kind)
            .map(({ words }) => [words, kind === "types" ? { name: "", gender: "" } : ""])
        )
      ])
    )
    const { comments: _comments, ...chosen } = this.names.toJSON()
    const program = files.map((file) => `### ${file.path}\n\`\`\`spell\n${file.contents}\n\`\`\``).join("\n\n")
    const itWord = [...(to.words.itWords ?? ["it"])][0]
    return [
      `Translate the names the people who wrote a spell program chose, from ${from.name} into ${to.name} (\`${to.lang}\`).`,
      "Spell reads programs written in plain words;  its own words are already translated (the glossary, below).",
      "Translate them ALL together, so one thing has one word everywhere and the program reads as one language.",
      "Fill in every empty value below, and answer with ONE JSON object with the same keys, in a ```json fence:",
      '- `types`:  each type\'s name, singular, as `{ "name": "...", "gender": "masculine" | "feminine" }`',
      "- `names`:  each property, variable, value or event, as written (a plural stays plural)",
      `  - NEVER with one of spell's own small words inside, which end a name:  ${smallWords(to)}`,
      "    e.g. `test card` => `candidata`, not `carta de prueba`;  one word is best",
      "- `genders`:  ADD the gender of each noun you wrote in `names` that isn't a type's,",
      '  by its word in the translation, singular:  `{ "imagen": "feminine", "palo": "masculine" }`',
      "- `phrases`:  a method's or quoted phrase's words, as declared:",
      `  - keep each \`(slot)\`, its words translated as \`names\` translates them;  write \`it\` as \`${itWord}\`,`,
      `    straight after the verb:  \`turn it face up\` => \`voltear ${itWord} boca arriba\`, \`turn it over\` => \`voltear ${itWord}\``,
      "  - keep each `a <type>` as the type's name with its article, e.g. `a card` => `una carta`",
      "- `texts`:  quoted text people see:  keep its spaces, punctuation and symbols;",
      "  a value's text (`red joker`) as the program says that value",
      "- `comments`:  the program's comments:  keep their code (in backticks) as the translated program says it",
      "",
      ...(rejected.length
        ? ["## Your answers spell can't read:  try again", ...rejected.map((why) => `- ${why}`), ""]
        : []),
      "## To fill in",
      "```json",
      JSON.stringify(toFill, null, 2),
      "```",
      "",
      "## Names already chosen:  use them",
      "```json",
      JSON.stringify(chosen, null, 2),
      "```",
      ...(this.words
        ? [
            "",
            "## The program's words:  each type's members",
            "```json",
            JSON.stringify(this.words.types, null, 2),
            "```"
          ]
        : []),
      "",
      "## The program",
      program,
      ...(this.glossary ? ["", `## The ${to.name} glossary:  spell's own words`, this.glossary] : [])
    ].join("\n")
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Does the dictionary have `words` in section `kind` already, filled in -- in our own names, or an import's? */
  private has(kind: NamesKind, words: string, ownOnly = false): boolean {
    const own = this.names.data[kind] as Record<string, unknown>
    const imported = this.names.imported[kind] as Record<string, unknown>
    const filled = (value: unknown) => {
      const text = value && typeof value === "object" ? (value as TranslatedType).name : value
      return typeof text === "string" && text !== "" && text !== TranslationNames.TODO
    }
    return filled(own[words]) || (!ownOnly && filled(imported[words]))
  }
}

/** How hard `claude` thinks about the names:  enough to choose well, little enough to be quick. */
const NAMES_EFFORT: ClaudeEffort = "medium"

/** How hard it thinks about the comments:  most of what's written, and no code reads them. */
const COMMENTS_EFFORT: ClaudeEffort = "low"

/** The first JSON object in `answer`, a fenced one first;  `undefined` if there's none that parses. */
export function jsonIn(answer: string): unknown {
  const json = answer.match(/```(?:json5?)?\n([\s\S]*?)```/)?.[1] ?? answer
  try {
    return JSON.parse(json.slice(json.indexOf("{"), json.lastIndexOf("}") + 1))
  } catch {
    return undefined
  }
}

/** `first` with `second`'s names added. */
function mergedDrafts(first: NamesData, second: NamesData): NamesData {
  return Object.fromEntries(NAMES_KINDS.map((kind) => [kind, { ...first[kind], ...second[kind] }]))
}

/** The language's small words a name may not hold, for the prompt:  its `memberStopWords`. */
function smallWords(to: SP.Language): string {
  return [...to.words.memberStopWords].map((word) => `\`${word}\``).join(", ")
}
