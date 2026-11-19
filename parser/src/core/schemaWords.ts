/**
 * A field of a schema, as a Spell type's line says it:  the ONE writer of those lines (epic `data` P49, J252).
 *
 * ```ts
 * fieldLineOf("name", { kind: "text", isRequired: true, maxLetters: 100 })
 * // => { line: 'its "name" is required text, with maximum length 100', rules: [] }
 * fieldLineOf("status", { kind: "one of open or closed" })
 * // => { line: 'its "status" as one of open or closed', rules: [] }
 * ```
 *
 * - Two readers hand it what a schema says:  a Lexicon (`spellTypeFor()`, in `lexicon.ts`) and an OpenAPI description
 *   (`spell place ingest`'s `PlaceSpec`, through the description's fields).
 * - A leaf:  it imports nothing, so the language's ingest can use it without loading the core.
 */

/** What a schema says of one field, in Spell's words:  see `fieldLineOf()`. */
export type SchemaField = {
  /** Its kind, as a declaration says it after `is`:  `text`, `a date`, `a number`, `one of open or closed`, `a list of text`. */
  kind: string
  /** Every thing has one:  `required text`, or a rule line where its kind can't say it. */
  isRequired?: boolean
  /** Its least length, in letters. */
  minLetters?: number
  /** Its most length, in letters. */
  maxLetters?: number
  /** A number's least. */
  minimum?: number
  /** A number's most. */
  maximum?: number
  /** It holds an address. */
  isUrl?: boolean
}

/** The kinds `required` goes in:  `required text`, `a required date`. */
const REQUIRED_KINDS = new Set(["text", "a date", "a number", "an integer"])

/** What a list of each kind is called. */
export const LIST_ITEMS: Readonly<Record<string, string>> = {
  text: "text",
  "a date": "dates",
  "a number": "numbers",
  "an integer": "integers",
  "yes or no": "choices"
}

/**
 * A field's line and the rule lines it asks for, on the property whose words are `words`.
 * - `required` goes in a plain kind only (`text`, `a date`, `a number`, `an integer`):
 *   the language has it there, and not in `one of ...`, `yes or no` or a list, whose rule line says it instead.
 * - One length goes on the line, the most if it has both;  the other is a rule line.
 * - `quoted`:  the line names its field in quotes, `its "name"`, as the ingest writes it;  a rule line never does.
 */
export function fieldLineOf(
  words: string,
  field: SchemaField,
  { quoted = true }: { quoted?: boolean } = {}
): { line: string; rules: string[] } {
  const { said, inline } = kindWordsOf(field)
  return {
    line: `its ${quoted ? `"${words}"` : words} ${verbBefore(said)} ${said}`,
    rules: ruleLinesOf(words, field, inline)
  }
}

/**
 * The word between a field's name and what it is:  `as` before its choices, as a sentence says them
 * (`its "status" as one of open or closed`;  epic `data` J289, Owen's ask on the reference pages page), else `is`.
 * - Both read the same:  `its "status" is one of ...` too.
 */
export function verbBefore(said: string): "as" | "is" {
  return /^(one of|either) /.test(said) ? "as" : "is"
}

/** What `field`'s line says after `is`:  `required text, with maximum length 1`, `a required date`. */
export function kindWordsOf(field: SchemaField): { said: string; inline: SaidInline } {
  const inline: SaidInline = {}
  let said = field.kind
  if (field.isRequired && REQUIRED_KINDS.has(said)) {
    said = said.replace(/^(an? )?/, (article) => (article ? "a required " : "required "))
    inline.required = true
  }
  if (field.maxLetters !== undefined) {
    said += `, with maximum length ${field.maxLetters}`
    inline.length = "max"
  } else if (field.minLetters !== undefined) {
    said += `, with minimum length ${field.minLetters}`
    inline.length = "min"
  }
  return { said, inline }
}

/** What a field's line says itself, rather than on a rule line of its own. */
export type SaidInline = {
  /** `required`, in its kind:  `a required date`. */
  required?: boolean
  /** Its length, after it:  `, with maximum length 1`. */
  length?: "min" | "max"
}

/** The rule lines `field` asks for, on the property called `words`:  what its line didn't say (`inline`). */
function ruleLinesOf(words: string, field: SchemaField, inline: SaidInline): string[] {
  const rules: string[] = []
  const must = (rule: string) => rules.push(`its ${words} must ${rule}`)
  if (field.isRequired && !inline.required) must("not be empty")
  const letters = (count: number) => `${count} letter${count === 1 ? "" : "s"}`
  if (field.minLetters !== undefined && inline.length !== "min") must(`be at least ${letters(field.minLetters)} long`)
  if (field.maxLetters !== undefined && inline.length !== "max") must(`be at most ${letters(field.maxLetters)} long`)
  if (field.isUrl) must("be a url")
  const { minimum, maximum } = field
  if (minimum !== undefined && maximum !== undefined) must(`be between ${minimum} and ${maximum}`)
  else if (minimum !== undefined) must(`be at least ${minimum}`)
  else if (maximum !== undefined) must(`be at most ${maximum}`)
  return rules
}

/**
 * Legal values as Spell says them, `one of happy, sad or grumpy`:  words, each as written.
 * - `undefined` when one isn't a plain word Spell would read back the same (`"12:30"`, `"a b"`).
 */
export function oneOfWords(values: readonly unknown[]): string | undefined {
  const words = values.map((value) => `${value as string}`)
  if (!words.length || !words.every((word) => /^[a-z][a-z0-9-]*$/i.test(word))) return undefined
  return `one of ${words.length > 1 ? `${words.slice(0, -1).join(", ")} or ${words.at(-1)}` : words[0]}`
}
