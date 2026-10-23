import escapeRegExp from "lodash/escapeRegExp"

import { TranslationNames } from "./TranslationNames"
import type { GlossaryData, GlossaryEntry, MissingName, NamesData } from "./translate.types"

/**
 * A language pack's NAMES GLOSSARY (epic `spanish` P26):  the names people choose in spell programs, in the other
 * language, shared by every project -- spell as a corpus of programs, not one program at a time.
 * - Saved in the pack, `languages/<lang>/glossary.json5` (`GlossaryData`), read by node only:  never in a browser.
 * - Before asking `claude` for a project's names, the names pass fills what it can from here (`fill()`):
 *   a name found here costs no call, and the same English name gets the same name in every project.
 * - A project's own dictionary may choose otherwise:  `differences()` says where, so drift shows up.
 * - `learn()` adds a project's names to it (`--learn`):  a better source wins, never a worse one (`SOURCE_RANKS`).
 * - Its `genders`, by the other language's word (`imagen` => `feminine`), are beneath every project's dictionary,
 *   so an article agrees without a guess by the word's ending.
 * - Pure data:  reading and writing the file is the command's (`translateProject()`).
 */
export class NamesGlossary {
  /** Its sections, every one there. */
  readonly data: Required<GlossaryData>

  constructor(data: GlossaryData = {}) {
    this.data = { names: { ...data.names }, phrases: { ...data.phrases }, genders: { ...data.genders } }
  }

  /** How many names and phrases it holds. */
  get size(): number {
    return Object.keys(this.data.names).length + Object.keys(this.data.phrases).length
  }

  ////////////////
  // ## Looking up
  ////////////////

  /**
   * Fill each of `wanted` the glossary has into `names`, the project's dictionary:  the rest, still to ask for.
   * - A type needs its gender:  one the glossary has no gender for is left to ask for.
   * - A name's gender goes into the dictionary's `genders` too, so its article agrees.
   * - Texts and comments are each project's own:  never here.
   * - Never a word the project already uses for something else:  `column` isn't `columna` where `tableau` is,
   *   as spell would read the two as one -- that one is left to ask for.
   * - SIDE EFFECT:  adds to `names`.
   */
  fill(names: TranslationNames, wanted: MissingName[]): { filled: number; rest: MissingName[] } {
    let filled = 0
    const rest = wanted.filter((name) => {
      const found = this.answerFor(names, name)
      if (!found) return true
      const theirs = typeof found.value === "string" ? found.value : found.value.name
      if (name.kind !== "phrases" && usedFor(names, theirs, name.words)) return true
      names.add(name.kind, name.words, found.value)
      if (found.gender && name.kind === "names") names.add("genders", found.value as string, found.gender)
      filled++
      return false
    })
    return { filled, rest }
  }

  /**
   * The glossary's entries for the words `contents` (a project's files) holds, as `NamesData`, for a prompt:
   * so `claude` writes the rest in the same words.
   */
  relevantTo(contents: string): NamesData {
    // as whole words:  `up` isn't in `setup`
    const holds = ([words]: [string, unknown]) =>
      new RegExp(`(^|[^\\p{L}])${escapeRegExp(words)}($|[^\\p{L}])`, "iu").test(contents)
    return {
      names: Object.fromEntries(
        Object.entries(this.data.names)
          .filter(holds)
          .map(([words, entry]) => [words, entry.name])
      ),
      phrases: Object.fromEntries(
        Object.entries(this.data.phrases)
          .filter(holds)
          .map(([words, entry]) => [words, entry.name])
      )
    }
  }

  ////////////////
  // ## Agreeing
  ////////////////

  /**
   * Where `names` (a project's dictionary, filled in) chooses differently from the glossary:
   * each a line for the report, e.g. `` `rank` is `grado` here, `rango` in the glossary (seed:Solitario) ``.
   */
  differences(names: TranslationNames): string[] {
    const differences: string[] = []
    const compare = (words: string, ours: string | undefined, entry: GlossaryEntry | undefined) => {
      if (!entry || !ours || ours === TranslationNames.TODO || ours === entry.name) return
      differences.push(`\`${words}\` is \`${ours}\` here, \`${entry.name}\` in the glossary (${entry.from})`)
    }
    for (const [words, type] of Object.entries(names.data.types)) compare(words, type.name, this.data.names[words])
    for (const [words, name] of Object.entries(names.data.names)) compare(words, name, this.data.names[words])
    for (const [words, phrase] of Object.entries(names.data.phrases)) compare(words, phrase, this.data.phrases[words])
    return differences
  }

  ////////////////
  // ## Learning
  ////////////////

  /**
   * Add `names`' types and names (a project's dictionary) to the glossary, as `learned:<projectName>`:
   * how many it added or bettered, and each it kept because the glossary's own source is as good or better.
   * - A name with its gender, from the dictionary's types or `genders`.
   * - Not its phrases, texts or comments:  those are the project's own;  a general phrase is added by hand.
   */
  learn(names: TranslationNames, projectName: string): { added: number; kept: string[] } {
    const from = `learned:${projectName}`
    let added = 0
    const kept: string[] = []
    const add = (words: string, entry: GlossaryEntry) => {
      const existing = this.data.names[words]
      if (existing?.name === entry.name) {
        if (!existing.gender && entry.gender) existing.gender = entry.gender
        return
      }
      if (existing && rankOf(existing.from) >= rankOf(from)) {
        kept.push(`\`${words}\`:  kept \`${existing.name}\` (${existing.from}), not \`${entry.name}\``)
        return
      }
      this.data.names[words] = entry
      added++
    }
    for (const [words, type] of Object.entries(names.data.types)) {
      if (isFilled(type.name)) add(words, withGender({ name: type.name, from }, type.gender))
    }
    for (const [words, name] of Object.entries(names.data.names)) {
      if (isFilled(name)) add(words, withGender({ name, from }, names.data.genders[name]))
    }
    for (const [word, gender] of Object.entries(names.data.genders)) this.data.genders[word] ??= gender
    return { added, kept }
  }

  /** What it holds, for the file:  each section sorted, so a diff shows what changed. */
  toJSON(): Required<GlossaryData> {
    const sorted = <T>(section: Record<string, T>) =>
      Object.fromEntries(Object.entries(section).sort(([a], [b]) => a.localeCompare(b)))
    return { names: sorted(this.data.names), phrases: sorted(this.data.phrases), genders: sorted(this.data.genders) }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The glossary's answer for `name`, as the dictionary's section holds it, and its gender;  none if it has none. */
  private answerFor(
    names: TranslationNames,
    { kind, words }: MissingName
  ): { value: string | { name: string; gender?: string }; gender?: string } | undefined {
    if (kind === "phrases") {
      const phrase = this.data.phrases[words]
      return phrase && { value: phrase.name }
    }
    if (kind !== "types" && kind !== "names") return undefined
    const entry = this.entryFor(names, words)
    if (!entry) return undefined
    const gender = entry.gender ?? this.data.genders[names.to.inflector.singularize(entry.name)]
    if (kind === "names") return { value: entry.name, gender }
    return gender ? { value: { name: entry.name, gender }, gender } : undefined
  }

  /** `words`' entry:  as written, else its singular's, made plural (its own `plural`, else by the language's rules). */
  private entryFor(names: TranslationNames, words: string): GlossaryEntry | undefined {
    const found = this.data.names[words]
    if (found) return found
    const singular = names.from.inflector.singularize(words)
    const entry = singular !== words ? this.data.names[singular] : undefined
    if (!entry) return undefined
    return { ...entry, name: entry.plural ?? names.to.inflector.pluralize(entry.name) }
  }
}

/** How good each source of a glossary entry is:  a better one wins.  See `GlossaryEntry.from`. */
const SOURCE_RANKS: Array<[RegExp, number]> = [
  [/^reviewed\b/, 4],
  [/^seed\b/, 3],
  [/^learned\b/, 2],
  [/^drafted\b/, 1]
]

/** `from`'s rank in `SOURCE_RANKS`;  0 for one it doesn't know. */
function rankOf(from: string): number {
  return SOURCE_RANKS.find(([source]) => source.test(from))?.[1] ?? 0
}

/**
 * Does `names` already use `theirs` (a type's or name's words in the other language) for words other than `ours`
 * -- or its singular?
 */
function usedFor(names: TranslationNames, theirs: string, ours: string): boolean {
  const singular = names.from.inflector.singularize(ours)
  const other = (words: string) => words !== ours && words !== singular
  return (
    Object.entries(names.data.types).some(([words, type]) => type.name === theirs && other(words)) ||
    Object.entries(names.data.names).some(([words, name]) => name === theirs && other(words))
  )
}

/** Is `value` a name someone chose:  not empty, not `TODO`? */
function isFilled(value: string | undefined): value is string {
  return !!value && value !== TranslationNames.TODO
}

/** `entry`, with `gender` if it has one. */
function withGender(entry: GlossaryEntry, gender: string | undefined): GlossaryEntry {
  return gender ? { ...entry, gender } : entry
}
