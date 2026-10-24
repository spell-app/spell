import type { SP } from "spell-parser/spell"
import { NAMES_KINDS, TranslationNames } from "./TranslationNames"
import type {
  ClaudeEffort,
  ClaudeRunner,
  JsonSchema,
  DeclarationStatement,
  MissingName,
  NamesData,
  NamesKind,
  SourceFile,
  TranslatedType
} from "./translate.types"

/**
 * The NAMES PASS of a translation (epic `spanish` P25-P26):  every name a project's people chose, translated before
 * any line is written.
 * - What it asks for (`wanted()`):
 *   - every type, property, value and method the project declares (its declarations, the words file's source)
 *   - and whatever else the lines asked the dictionary for and didn't find:  variables, texts, comments
 *   - less what the dictionary has already:  a seed's, a person's, an import's, the shared glossary's
 * - In TWO stages (`draft()`, epic `spanish` P26), so each call is small, and most run at once:
 *   1. the TYPES alone, with their genders, in one small call:  every other name is built on them
 *   2. the rest -- members, phrases, texts, comments -- in a few calls SIDE BY SIDE, a group of files each
 *      (`groups()`), each shown its files, the types from stage 1 and the glossary, so the terms agree
 * - Each answer is JSON of exactly the names asked for (`schemaFor()`):  the runner can't answer anything else.
 * - Each answer is checked readable by the other language's parser (`problemWith()`):
 *   those that aren't are asked for again, once, all together, saying why;  still unreadable, they're left out.
 * - With `alternatives` (`spell translate --review`, epic `spanish` P31):  2 or 3 other choices for each type, name
 *   and phrase, in the same calls, for a person to pick from on the review page (`alternativesFor()`).
 * - `claude` runs through `run`, injected:  the command's runs `claude -p`;  a test answers with a fake.
 * - Pure, but for `run`:  no files.  The command reads the glossaries and writes the dictionary.
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
  /** The other language pack's glossary, for the system prompt (`glossaryContext()`):  spell's own words in it. */
  readonly glossary: string | undefined
  /** The names other projects chose for words these files use (`NamesGlossary.relevantTo()`), for the prompt. */
  readonly shared: NamesData | undefined
  /** Each `claude` call:  its stage and how long it took, in milliseconds, in the order they ended. */
  readonly calls: Array<{ stage: NamesStage; ms: number }> = []
  /** What went wrong, for the command to print:  `claude` failing, an answer that isn't JSON, names left out. */
  readonly notes: string[] = []
  /** Whether each call asks for alternatives too:  see `alternativesFor()`. */
  readonly askAlternatives: boolean
  /** The alternatives each answer gave, by `<kind>:<words>`, readable ones only:  see `alternativesFor()`. */
  private readonly alternatives = new Map<string, Array<string | TranslatedType>>()

  constructor({
    names,
    run,
    files,
    declarations,
    words,
    glossary,
    shared,
    alternatives = false
  }: {
    names: TranslationNames
    run: ClaudeRunner
    files: SourceFile[]
    declarations: DeclarationStatement[]
    words?: SP.SpellWordsData
    glossary?: string
    shared?: NamesData
    alternatives?: boolean
  }) {
    this.names = names
    this.run = run
    this.files = files
    this.declarations = declarations
    this.words = words
    this.glossary = glossary
    this.shared = shared
    this.askAlternatives = alternatives
  }

  /**
   * The other choices Claude gave for `name`, besides its answer, when asked for (`alternatives`):
   * readable ones only, never its answer again.
   * - A type's as `{ name, gender }`;  a name's or phrase's as text.
   * - None for a text or a comment:  they're sentences.
   */
  alternativesFor({ kind, words }: MissingName): Array<string | TranslatedType> {
    return this.alternatives.get(`${kind}:${words}`) ?? []
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
    // one type, however its words are joined:  `todos-app` is `todos app`
    const keyOf = (kind: NamesKind, words: string) =>
      `${kind}:${kind === "types" ? TranslationNames.typeKey(words) : words}`
    return [...declared, ...missing].filter(({ kind, words }) => {
      const key = keyOf(kind, words)
      const ownOnly = declaredKeys.has(key)
      if (seen.has(key) || this.has(kind, words, ownOnly) || (kind === "types" && isKind(words))) return false
      seen.add(key)
      return true
    })
  }

  /**
   * Ask `claude` for `wanted`, in two stages, and add what it answers to the dictionary:  how many names it added.
   * 1. the types alone, in one call, added at once:  the next stage's prompts show them
   * 2. the rest, a group of files to a call (`groups()`), all at once
   * - Each answer it can't read is asked for again, once, all together, saying why (`problemWith()`).
   * - NEVER throws:  a `claude` that fails, or answers what isn't JSON, adds nothing, noted in `notes`.
   */
  async draft(wanted: MissingName[]): Promise<number> {
    if (!wanted.length) return 0
    const types = wanted.filter(({ kind }) => kind === "types")
    const rest = wanted.filter(({ kind }) => kind !== "types")
    const typeDrafts = types.length ? await this.ask(types, { stage: "types", files: [], effort: TYPES_EFFORT }) : {}
    const rejected = this.rejectFrom(typeDrafts, types)
    let added = this.names.merge(typeDrafts)
    const groups = this.groups(rest)
    const answers = await Promise.all(groups.map(({ files, names }) => this.ask(names, { stage: "names", files })))
    answers.forEach((answer, at) => {
      rejected.push(...this.rejectFrom(answer, groups[at]!.names))
      added += this.names.merge(answer)
    })
    // the calls ran side by side:  two may have chosen one word for two things
    const taken = this.takeTwice(wanted)
    rejected.push(...taken)
    added -= taken.length
    if (!rejected.length) return added
    this.notes.push(`asked again for ${rejected.length} names:  ${rejected.map(({ why }) => why).join(";  ")}`)
    const again = await this.ask(
      rejected.map(({ name }) => name),
      { stage: "again", rejected: rejected.map(({ why }) => why) }
    )
    const still = this.rejectFrom(
      again,
      rejected.map(({ name }) => name)
    )
    for (const { why } of still) this.notes.push(`left TODO:  ${why}`)
    return added + this.names.merge(again)
  }

  /**
   * `wanted` (no types) in groups for stage 2, a call each:  each name with the first file that holds it,
   * then evened out by how much each call writes (its names' length:  a comment is long, a name short) --
   * - at most `MAX_GROUPS`:  the two lightest together
   * - the heaviest split in two while it's over `SPLIT_LENGTH`, and over a fair share of the whole
   * - A name no file holds as written (a declared value) goes with the first group.
   */
  groups(wanted: MissingName[]): Array<{ files: SourceFile[]; names: MissingName[] }> {
    if (!wanted.length) return []
    const byFile = new Map<SourceFile, MissingName[]>(this.files.map((file) => [file, []]))
    const homeless: MissingName[] = []
    for (const name of wanted) {
      const file = this.files.find((each) => each.contents.includes(name.words))
      if (file) byFile.get(file)!.push(name)
      else homeless.push(name)
    }
    const groups = [...byFile].filter(([, names]) => names.length).map(([file, names]) => ({ files: [file], names }))
    if (!groups.length) groups.push({ files: this.files.slice(0, 1), names: [] })
    groups[0]!.names.unshift(...homeless)
    const length = (names: MissingName[]) => names.reduce((sum, { words }) => sum + words.length, 0)
    while (groups.length > MAX_GROUPS) {
      groups.sort((a, b) => length(a.names) - length(b.names))
      const [a, b] = groups.splice(0, 2)
      groups.push({ files: [...a!.files, ...b!.files], names: [...a!.names, ...b!.names] })
    }
    const fairShare = length(wanted) / MAX_GROUPS
    for (;;) {
      const heaviest = groups.reduce((a, b) => (length(b.names) > length(a.names) ? b : a))
      const heavy = length(heaviest.names)
      if (groups.length >= MAX_GROUPS || heavy <= SPLIT_LENGTH || heavy <= fairShare * 1.3) break
      // its second half by length, not by count
      let at = 0
      for (let sum = 0; sum < heavy / 2; at++) sum += heaviest.names[at]!.words.length
      groups.push({ files: heaviest.files, names: heaviest.names.splice(Math.max(1, at)) })
    }
    return groups
  }

  ////////////////
  // ## Checking an answer
  ////////////////

  /**
   * Take each of `drafted` (names just drafted) out of the dictionary whose word another type or name has already:
   * spell would read the two as one thing -- which, and why.
   * - The other keeps it:  one chosen before (a person's, the glossary's), else the one asked for first.
   * - A word and its plural (`card`, `cards`) are one name.
   */
  takeTwice(drafted: MissingName[]): Array<{ name: MissingName; why: string }> {
    const { types, names } = this.names.data
    const singular = (words: string) => this.names.from.inflector.singularize(words)
    const order = new Map(drafted.map(({ kind, words }, at) => [`${kind}:${words}`, at]))
    const rankOf = (kind: NamesKind, words: string) => order.get(`${kind}:${words}`) ?? -1
    const owners = new Map<string, Array<{ kind: NamesKind; words: string }>>()
    const own = (kind: NamesKind, words: string, theirs: string | undefined) => {
      if (!theirs || theirs === TranslationNames.TODO) return
      owners.set(theirs, [...(owners.get(theirs) ?? []), { kind, words }])
    }
    for (const [words, type] of Object.entries(types)) own("types", words, type.name)
    for (const [words, name] of Object.entries(names)) own("names", words, name)
    const taken: Array<{ name: MissingName; why: string }> = []
    for (const [theirs, all] of owners) {
      const sorted = [...all].sort((a, b) => rankOf(a.kind, a.words) - rankOf(b.kind, b.words))
      const keeper = sorted[0]!
      for (const other of sorted.slice(1)) {
        if (singular(other.words) === singular(keeper.words) || rankOf(other.kind, other.words) < 0) continue
        delete (this.names.data[other.kind] as Record<string, unknown>)[other.words]
        taken.push({
          name: other,
          why: `\`${other.words}\` => \`${theirs}\`:  that's \`${keeper.words}\` already -- one word, one thing`
        })
      }
    }
    return taken
  }

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
      return formChange(name.words, type.name) ?? this.unreadableType(type.name) ?? this.unreadable("names", type.name)
    }
    if (typeof value !== "string") return "not a text"
    if (name.kind === "names") return formChange(name.words, value) ?? this.unreadable("names", value)
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
   * Why spell can't read `name` as a TYPE's name, if it can't (epic `spanish` P28):
   * a plural, as spell reads the other language -- `tareas`, not `agenda`, `gestor-tareas` or `gestorTareas`,
   * whose first word says it's one
   */
  unreadableType(name: string): string | undefined {
    const singular = this.names.to.inflector.singularize(name)
    if (singular !== name) return `reads as a plural (of \`${singular}\`):  a type's name is singular, e.g. \`agenda\``
    return undefined
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
   * - `stage`:  which, for the report (`calls`)
   * - `files`:  the program's files to show it -- default all of them;  none for the types
   * - `rejected`:  answers it gave before that spell can't read, and why, for it to do better
   * - Only the names asked for, and genders:  anything else it answers is left out.
   * - NEVER throws:  nothing, noted in `notes`, if `claude` fails or answers what isn't JSON.
   */
  async ask(
    wanted: MissingName[],
    {
      stage,
      files = this.files,
      rejected = [],
      effort = NAMES_EFFORT
    }: { stage: NamesStage; files?: SourceFile[]; rejected?: string[]; effort?: ClaudeEffort }
  ): Promise<NamesData> {
    const started = performance.now()
    let answer: string
    try {
      answer = await this.run(this.prompt(wanted, { rejected, files }), {
        effort,
        model: NAMES_MODEL,
        schema: this.schemaFor(wanted),
        context: glossaryContext(this.glossary, this.names.to)
      })
    } catch (error) {
      this.notes.push(`claude couldn't draft the names:  ${error instanceof Error ? error.message : String(error)}`)
      return {}
    } finally {
      this.calls.push({ stage, ms: performance.now() - started })
    }
    const parsed = jsonIn(answer) as
      | (Omit<NamesData, "genders"> & { genders?: unknown; alternatives?: Record<string, Record<string, unknown>> })
      | undefined
    if (!parsed) {
      this.notes.push("claude's names aren't JSON:  left them TODO")
      return {}
    }
    // only what was asked for:  an answer may add a type again under its compiled name (`StockPile`)
    const asked = new Set(wanted.map(({ kind, words }) => `${kind}:${words}`))
    if (this.askAlternatives) this.keepAlternatives(parsed.alternatives, wanted)
    const answered: NamesData = { ...parsed, genders: gendersIn(parsed.genders) }
    return Object.fromEntries(
      NAMES_KINDS.map((kind) => {
        const section = Object.entries(answered[kind] ?? {})
        return [
          kind,
          Object.fromEntries(kind === "genders" ? section : section.filter(([words]) => asked.has(`${kind}:${words}`)))
        ]
      })
    )
  }

  /**
   * What `claude` is asked:  see `ask()`.
   * - `files`:  the program's files to show it;  with none (the types), its words instead:  each type's members
   */
  prompt(
    wanted: MissingName[],
    { rejected = [], files = this.files }: { rejected?: string[]; files?: SourceFile[] } = {}
  ): string {
    const { from, to } = this.names
    // only the sections it's asked to fill:  an empty one, it fills again from the names already chosen
    const kinds = NAMES_KINDS.filter((kind) => kind !== "genders" && wanted.some((name) => name.kind === kind))
    const toFill = Object.fromEntries(
      kinds.map((kind) => [
        kind,
        Object.fromEntries(
          wanted
            .filter((name) => name.kind === kind)
            .map(({ words }) => [words, kind === "types" ? { name: "", gender: "" } : ""])
        )
      ])
    )
    // its names, not its texts and comments:  they're long, and no other name is made from them
    const { comments: _comments, texts: _texts, ...chosen } = this.names.toJSON()
    const program = files.map((file) => `### ${file.path}\n\`\`\`spell\n${file.contents}\n\`\`\``).join("\n\n")
    const itWord = [...(to.words.itWords ?? ["it"])][0]
    return [
      `Translate the names the people who wrote a spell program chose, from ${from.name} into ${to.name} (\`${to.lang}\`).`,
      "Spell reads programs written in plain words;  its own words are already translated (the glossary, above).",
      "Translate them ALL together, so one thing has one word everywhere and the program reads as one language.",
      "Fill in every empty value below, and answer with ONE JSON object of only those keys, and `genders`:",
      '- `types`:  each type\'s name, singular, as `{ "name": "...", "gender": "masculine" | "feminine" }`',
      "  - singular, as the language reads it:  `todos-app` => `agenda` or `gestor-tareas`, never `tareas`",
      "- KEEP EACH NAME'S FORM:  words stay words, plain or dashed (`todos-app` => `agenda` or `gestor-de-tareas`,",
      "  never `gestorTareas`);  camelCase stays camelCase (`newTaskName` => `nombreNuevaTarea`)",
      "- `names`:  each property, variable, value or event, as written (a plural stays plural)",
      `  - NEVER with one of spell's own small words inside, which end a name:  ${smallWords(to)}`,
      "    e.g. `test card` => `candidata`, not `carta de prueba`;  one word is best",
      "  - NEVER a word already chosen for something else (below):  spell would read the two as one thing",
      "- `genders`:  ADD the gender of each noun you wrote in `names` that isn't a type's,",
      "  by its word in the translation, singular:",
      '  `[{ "word": "imagen", "gender": "feminine" }, { "word": "palo", "gender": "masculine" }]`',
      "- `phrases`:  a method's or quoted phrase's words, as declared:",
      `  - keep each \`(slot)\`, its words translated as \`names\` translates them;  write \`it\` as \`${itWord}\`,`,
      `    straight after the verb:  \`turn it face up\` => \`voltear ${itWord} boca arriba\`, \`turn it over\` => \`voltear ${itWord}\``,
      "  - keep each `a <type>` as the type's name with its article, e.g. `a card` => `una carta`",
      "- `texts`:  quoted text people see:  keep its spaces, punctuation and symbols;",
      "  a value's text (`red joker`) as the program says that value",
      "- `comments`:  the program's comments:  keep their code (in backticks) as the translated program says it",
      ...(this.askAlternatives && alternativeKinds(wanted).length
        ? [
            "- `alternatives`:  for each type, name and phrase you fill in, 2 or 3 OTHER good choices, as readable",
            "  as your first, for a person to pick from;  a type's as `{ name, gender }`, the rest as text",
            "  (`alternatives` isn't in the JSON below:  its keys are the same as the sections'):"
          ]
        : []),
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
      ...(hasShared(this.shared)
        ? [
            "",
            "## Names other programs chose:  use them for the same words",
            "```json",
            JSON.stringify(this.shared, null, 2),
            "```"
          ]
        : []),
      ...(this.words && !files.length
        ? [
            "",
            "## The program's words:  each type's members",
            "```json",
            JSON.stringify(this.words.types, null, 2),
            "```"
          ]
        : []),
      ...(files.length ? ["", "## The program", program] : [])
    ].join("\n")
  }

  /**
   * The shape of the answer to a call for `wanted`:  each name asked for, by its section, and `genders`, a list.
   * - Exactly what the prompt's "To fill in" shows, so Claude can't leave one out, add one, or answer prose.
   * - `genders` is a list, as a schema can't name keys it doesn't know:  `gendersIn()` makes it a table again.
   */
  schemaFor(wanted: MissingName[]): JsonSchema {
    const kinds = NAMES_KINDS.filter((kind) => kind !== "genders" && wanted.some((name) => name.kind === kind))
    const properties = Object.fromEntries(
      kinds.map((kind) => [
        kind,
        objectSchema(
          Object.fromEntries(
            wanted
              .filter((name) => name.kind === kind)
              .map(({ words }) => [words, kind === "types" ? objectSchema({ name: STRING, gender: STRING }) : STRING])
          )
        )
      ])
    )
    const gender = objectSchema({ word: STRING, gender: STRING })
    const alternatives = this.askAlternatives ? alternativeKinds(wanted) : []
    if (!alternatives.length) return objectSchema({ ...properties, genders: { type: "array", items: gender } })
    const choice = (kind: NamesKind) => (kind === "types" ? objectSchema({ name: STRING, gender: STRING }) : STRING)
    const alternativesSchema = objectSchema(
      Object.fromEntries(
        alternatives.map((kind) => [
          kind,
          objectSchema(
            Object.fromEntries(
              wanted
                .filter((name) => name.kind === kind)
                .map(({ words }) => [words, { type: "array", items: choice(kind) }])
            )
          )
        ])
      )
    )
    return objectSchema({
      ...properties,
      genders: { type: "array", items: gender },
      alternatives: alternativesSchema
    })
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * Keep the alternatives an answer gave (`answered`, by section, then words) for each of `wanted`:
   * each readable (`problemWith()`), each once.
   * - SIDE EFFECT:  sets `alternatives`
   */
  private keepAlternatives(answered: Record<string, Record<string, unknown>> | undefined, wanted: MissingName[]): void {
    for (const name of wanted) {
      const given = answered?.[name.kind]?.[name.words]
      if (!Array.isArray(given)) continue
      const seen = new Set<string>()
      const readable = given.filter((each: unknown) => {
        const text = each && typeof each === "object" ? (each as TranslatedType).name : each
        if (typeof text !== "string" || !text || seen.has(text) || this.problemWith(name, each)) return false
        seen.add(text)
        return true
      }) as Array<string | TranslatedType>
      if (readable.length) this.alternatives.set(`${name.kind}:${name.words}`, readable)
    }
  }

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

/**
 * Why `theirs` isn't written in the same FORM as `ours`, if it isn't (Owen, 2026-10-23, epic `spanish` P28:
 * "why is the type name being created camelCase at all?"):
 * - words stay words, plain or dashed:  `todos-app` => `agenda` or `gestor-de-tareas`, never `gestorTareas`
 * - camelCase stays one word:  `newTaskName` => `nombreNuevaTarea`, never `nombre nueva tarea`
 * - `ours` as the program has it:  a type's as declared, `todos app`, its dashes made spaces
 */
export function formChange(ours: string, theirs: string): string | undefined {
  const isCamel = (words: string) => /\p{Ll}\p{Lu}/u.test(words)
  if (!isCamel(ours) && isCamel(theirs)) return `keeps its form:  words, as \`${ours}\` is, not camelCase`
  if (isCamel(ours) && /[\s-]/.test(theirs)) return `keeps its form:  one word in camelCase, as \`${ours}\` is`
  return undefined
}

/** A `claude` call of the names pass:  the types (stage 1), the rest (stage 2), or asking again. */
export type NamesStage = "types" | "names" | "again"

/**
 * The model the names pass asks, `claude --model`.
 * - At low effort it's the fastest too (epic `spanish` P26, measured):  ~10 s for a group, thinking ~300 tokens;
 *   `haiku` thought ~2,500 tokens on the same prompt and took ~15 s, `sonnet` ~11 s.
 */
const NAMES_MODEL = "opus"

/** How hard `claude` thinks about the types:  the names every other name is built on. */
const TYPES_EFFORT: ClaudeEffort = "low"

/** How hard it thinks about the rest. */
const NAMES_EFFORT: ClaudeEffort = "low"

/** The most calls stage 2 makes at once. */
const MAX_GROUPS = 6

/** How much one call may write (its names' length, in characters) before stage 2 splits it:  about 25 names. */
const SPLIT_LENGTH = 400

/** The first JSON object in `answer`, a fenced one first;  `undefined` if there's none that parses. */
export function jsonIn(answer: string): unknown {
  const json = answer.match(/```(?:json5?)?\n([\s\S]*?)```/)?.[1] ?? answer
  try {
    return JSON.parse(json.slice(json.indexOf("{"), json.lastIndexOf("}") + 1))
  } catch {
    return undefined
  }
}

/** A JSON schema's string. */
const STRING = { type: "string" }

/** A JSON schema's object of exactly `properties`, every one required, as a structured answer needs. */
export function objectSchema(properties: Record<string, unknown>): JsonSchema {
  return { type: "object", properties, required: Object.keys(properties), additionalProperties: false }
}

/**
 * The other language pack's glossary (`GLOSSARY.md`), as a pass's shared `context`:  spell's own words in it.
 * - The same text for every call of a run, so the API reads it from its cache after the first.
 */
export function glossaryContext(glossary: string | undefined, to: SP.Language): string | undefined {
  return glossary && `## The ${to.name} glossary:  spell's own words\n${glossary}`
}

/**
 * The genders an answer gave, as a table, `{ imagen: "feminine" }`:  from the list a schema asks for
 * (`[{ word, gender }]`), or a table as it was.
 */
function gendersIn(genders: unknown): Record<string, string> | undefined {
  if (!Array.isArray(genders)) return genders as Record<string, string> | undefined
  return Object.fromEntries(
    genders.flatMap((each: { word?: unknown; gender?: unknown }) =>
      typeof each?.word === "string" && typeof each.gender === "string" ? [[each.word, each.gender]] : []
    )
  )
}

/** The sections of `wanted` that alternatives are asked for:  types, names, phrases;  never texts or comments. */
function alternativeKinds(wanted: MissingName[]): NamesKind[] {
  return ALTERNATIVE_KINDS.filter((kind) => wanted.some((name) => name.kind === kind))
}

/** The sections a name has alternatives in. */
const ALTERNATIVE_KINDS: NamesKind[] = ["types", "names", "phrases"]

/** Does `shared` (the glossary's names for a prompt) hold any? */
function hasShared(shared: NamesData | undefined): shared is NamesData {
  return !!shared && (Object.keys(shared.names ?? {}).length > 0 || Object.keys(shared.phrases ?? {}).length > 0)
}

/** The language's small words a name may not hold, for the prompt:  its `memberStopWords`. */
function smallWords(to: SP.Language): string {
  return [...to.words.memberStopWords].map((word) => `\`${word}\``).join(", ")
}
