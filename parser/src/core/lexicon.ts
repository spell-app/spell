/**
 * A type as a LEXICON, AT Protocol's schema language, and a Lexicon read back as a type (epic `atmosphere` P10):
 * what another app reads Spell's records by, and how Spell reads another app's.
 *
 * ```ts
 * lexiconFor(Recipe, { id: nsidFor("owen@spell/recipes", "Recipe") })
 * // => { lexicon: 1, id: "spaces.spell.owen.recipes.recipe", defs: { main: { type: "record", key: "any", ... } } }
 *
 * spellTypeFor(statusphereLexicon)
 * // => `a "status" is a thing:\n\t- it is published as "xyz.statusphere.status"\n\t- its "status" is required text, ...`
 * ```
 *
 * - The Spell declaration stays the one description of a type:
 *   - a Lexicon is only MADE from the compiled class, by the same `kindOf()` as its JSON Schema (`checking.ts`)
 *   - never committed, never written by hand
 * - Reading one in WRITES Spell:  the declaration a person would have written, which then is the source.
 * - Where the two don't match, and what Spell does:
 *   - a decimal number:  Lexicon has none, so it's a string, `"12.50"`, its description saying so (`DECIMAL_NOTE`);
 *     an atmosphere account writes it that way, and reads it back as a number (`AtProtoPlace`)
 *   - a field's words (`created at`) are its description, in the program's own language
 *   - `must not be empty` is `required`;  a length in letters is one in graphemes
 *   - a rename can't be published:  a published schema's fields never change (the language's warning says so)
 * - Plain data and the class's schema:  imports only `spell/util` and its peers,
 *   so the people store, a library and the command line can all use it.
 */
import { lowerFirst, schemaOf, type PropInfo, type PropRule } from "spell/util"

import { kindOf, type Kind } from "./checking"

/** The Lexicon language's version, every document's `lexicon`. */
export const LEXICON_VERSION = 1

/** Where Spell's own schemas are named:  `spell.spaces`, reversed. */
export const SPELL_LEXICON_AUTHORITY = "spaces.spell"

/**
 * What a decimal number's description says, after its words:  Lexicon has no decimals, so it's kept as text.
 * - `spellTypeFor()` reads a string field whose description has it as a number again.
 */
export const DECIMAL_NOTE = 'a decimal number, kept as text, e.g. "12.50"'

/** A field's schema in a Lexicon:  only what Spell writes and reads of the language. */
export type LexiconField = {
  /** `string`, `integer`, `boolean`, `array`, `unknown` ...:  Lexicon's own. */
  type: string
  /** A person's words for it. */
  description?: string
  /** A string's kind:  `datetime`, `uri` ... (a fixed list, with no decimal in it). */
  format?: string
  /** A string's least and most length, in UTF-8 bytes:  Spell has no words for those. */
  minLength?: number
  maxLength?: number
  /** A string's least and most length, in graphemes:  Spell's letters. */
  minGraphemes?: number
  maxGraphemes?: number
  /** An integer's least and most. */
  minimum?: number
  maximum?: number
  /** Its only legal values. */
  enum?: readonly unknown[]
  /** Values its app knows, any others allowed too. */
  knownValues?: readonly unknown[]
  /** An array's items. */
  items?: LexiconField
}

/** A record's definition:  the `main` one of a Lexicon that names a kind of record. */
export type LexiconRecord = {
  type: "record"
  /** What its record keys are:  `tid`, `any`, `literal:self` ... */
  key: string
  description?: string
  record: LexiconObject
}

/** An object's definition:  its fields, and which every one has. */
export type LexiconObject = {
  type: "object"
  /** The fields every record has. */
  required?: string[]
  properties: Record<string, LexiconField>
}

/** A Lexicon document, as Spell writes one:  one record type, its `main`. */
export type LexiconDocument = {
  lexicon: typeof LEXICON_VERSION
  /** Its name, an NSID:  `xyz.statusphere.status`. */
  id: string
  description?: string
  defs: { main: LexiconRecord } & Record<string, unknown>
}

/** What `lexiconFor()` is told. */
export type LexiconOptions = {
  /** Its name, an NSID:  `Class.publishedAs`, else `nsidFor()` its project's address. */
  id: string
  /** What it says of itself:  the type's words, by default. */
  description?: string
}

////////////////
// ## Names
////////////////

/**
 * The NSID Spell names a type of project `address` by:
 * the address as a reversed domain under `spell.spaces`, then the type.
 * - `nsidFor("owen@spell/recipes", "Recipe")` => `spaces.spell.owen.recipes.recipe`
 * - `nsidFor("@spell/examples/RecipeBox", "Recipe")` => `spaces.spell.spell.examples.recipebox.recipe`
 * - The address's owner:
 *   - a person at Spell (`owen@spell`):  their name
 *   - an org (`@family`):  its name
 *   - a person at another org (`ana@family`):  the org, then them
 * - A part a domain can't spell (an underscore, as in `events_team`) becomes a hyphen;  all lowercase.
 * - The type's part is its name in lower camel case:  `DatedEvent` => `datedEvent`.
 * - throws `TypeError` for an address that names nothing
 */
export function nsidFor(address: string, typeName: string): string {
  const parts = address
    .split("/")
    .filter(Boolean)
    .flatMap((part) => {
      const [person, org] = part.split("@")
      if (org === undefined) return [part]
      return !person ? [org] : org === "spell" ? [person] : [org, person]
    })
    .map((part) =>
      part
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean)
  const name = lowerFirst(typeName.replace(/[^A-Za-z0-9]+/g, ""))
  if (!parts.length || !name) throw new TypeError(`nsidFor():  "${address}" and "${typeName}" name no schema`)
  return [SPELL_LEXICON_AUTHORITY, ...parts, name].join(".")
}

////////////////
// ## Writing
////////////////

/**
 * The Lexicon of a saved `Class`'s records:  one per type, made, never written by hand.
 * - Its fields are the class's declared ones, inherited too, each by `kindOf()` -- see the module's docs.
 * - Its key is `any`:  a record's key is its thing's id, which Spell makes (`status-k3x9q2mf`), not a time.
 */
export function lexiconFor(Class: Function, { id, description }: LexiconOptions): LexiconDocument {
  const properties: Record<string, LexiconField> = {}
  const required: string[] = []
  for (const [name, info] of declaredProps(Class)) {
    if (name === "id") continue
    const { field, isRequired } = fieldFor(name, info)
    properties[name] = field
    if (isRequired) required.push(name)
  }
  return {
    lexicon: LEXICON_VERSION,
    id,
    defs: {
      main: {
        type: "record",
        key: "any",
        description: description ?? wordsOf(Class.name),
        record: { type: "object", ...(required.length && { required }), properties }
      }
    }
  }
}

/** Property `name`, declared as `info`, as a Lexicon field;  and whether every record has it. */
function fieldFor(name: string, info: PropInfo): { field: LexiconField; isRequired: boolean } {
  const words = wordsOf(name)
  const rules = info.rules ?? []
  const isRequired = rules.some(({ type }) => type === "empty")
  const kind: Kind = info.type === "integer" ? { kind: "any" } : kindOf(info)
  const field = info.type === "integer" ? integerField(words, info) : { ...kindField(kind), description: words }
  if (kind.kind === "number") field.description = `${words}:  ${DECIMAL_NOTE}`
  if (kind.kind === "text") Object.assign(field, textRules(rules, isRequired))
  // `one of happy, sad`:  its words are text, whatever it's declared as
  if ("oneOf" in kind && kind.oneOf?.every((value) => typeof value === "string")) {
    Object.assign(field, { type: "string", enum: kind.oneOf })
  }
  return { field, isRequired }
}

/** `kind` as a Lexicon field. */
function kindField(kind: Kind): LexiconField {
  switch (kind.kind) {
    case "text":
      return { type: "string" }
    case "number":
      return { type: "string" }
    case "choice":
      return { type: "boolean" }
    case "date":
      return { type: "string", format: "datetime" }
    case "list":
      return { type: "array", items: kind.item.kind === "list" ? { type: "unknown" } : kindField(kind.item) }
    case "thing":
    case "any":
      return { type: "unknown" }
  }
}

/** An `integer` property as a Lexicon field:  its bounds, its legal values. */
function integerField(description: string, info: PropInfo): LexiconField {
  const field: LexiconField = { type: "integer", description }
  for (const { type, value = "" } of info.rules ?? []) {
    const [min, max] = value.split("..")
    if (type === "range") Object.assign(field, { minimum: Number(min), maximum: Number(max) })
    else if (type === "minValue") field.minimum = Number(value)
    else if (type === "maxValue") field.maximum = Number(value)
  }
  const values = typeof info.oneOf === "function" ? info.oneOf() : info.oneOf
  if (values?.length && values.every(Number.isInteger)) field.enum = values
  return field
}

/**
 * A text property's rules, as Lexicon's own:  lengths in letters are graphemes, `must be a url` its format.
 * - `must not be empty` is `required` (above), and at least one byte too.
 * - A pattern, or an email, has no Lexicon of its own:  left to Spell's checking.
 */
function textRules(rules: readonly PropRule[], isRequired: boolean): Partial<LexiconField> {
  const field: Partial<LexiconField> = isRequired ? { minLength: 1 } : {}
  for (const { type, value = "" } of rules) {
    if (type === "minLength") field.minGraphemes = Number(value)
    else if (type === "maxLength") field.maxGraphemes = Number(value)
    else if (type === "url") field.format = "uri"
  }
  return field
}

////////////////
// ## Reading
////////////////

/** What `spellTypeFor()` writes:  the declaration, and what it couldn't say. */
export type SpellTypeFromLexicon = {
  /** The type's words, as the declaration names it:  `status`. */
  typeWords: string
  /** The declaration, in English:  a type, its fields, its rules, and that it's published as the Lexicon's name. */
  source: string
  /** What the Lexicon says that Spell can't yet, each a line, e.g. `"status" holds at most 32 bytes`. */
  notes: string[]
}

/**
 * Lexicon `document`'s record as a Spell type:  the declaration a person would have written for it.
 * - Its words come from its name's last part:  `xyz.statusphere.status` => `status`.
 * - Each field's come from its key:  `createdAt` => `created at`, which compiles back to `createdAt`.
 * - `- it is published as "<its id>"`:  so its records are that app's, and Spell's warnings watch the round trip.
 * - A field Spell can't hold yet (a blob, a reference to another record, an object of its own):
 *   left out, and said in `notes`;  its records keep it, as an atmosphere account writes a record whole.
 * - English:  a Spanish program's field names in a record are still an open point (the Spaces guide).
 * - throws `TypeError` for a Lexicon whose `main` isn't a record or an object
 */
export function spellTypeFor(document: LexiconDocument): SpellTypeFromLexicon {
  // a record's fields are in its `record`;  a plain object's are its own
  const main = document.defs?.main as unknown as { type?: string; record?: LexiconObject; properties?: unknown }
  const record: Partial<LexiconObject> | undefined =
    main?.type === "record" ? main.record : main?.type === "object" ? (main as LexiconObject) : undefined
  if (!record?.properties) {
    throw new TypeError(`spellTypeFor():  ${document.id}'s main isn't a record:  only a record's shape is a type`)
  }
  const name = document.id.split(".").pop() ?? ""
  const typeWords = wordsOf(name).replace(/ /g, "-")
  const required = new Set(record.required ?? [])
  const lines: string[] = []
  const rules: string[] = []
  const notes: string[] = []
  for (const [key, field] of Object.entries(record.properties)) {
    const words = wordsOf(key)
    const kind = spellKindOf(field)
    if (!kind) {
      notes.push(`"${key}" is ${field.type} in the Lexicon:  Spell can't hold one yet, so it's left out`)
      continue
    }
    const { said, inline } = spellLineOf(kind, field, required.has(key))
    lines.push(`\t- its "${words}" is ${said}`)
    rules.push(...spellRulesOf(words, field, required.has(key), inline))
    if (field.type === "string" && field.maxLength !== undefined) {
      notes.push(`"${key}" holds at most ${field.maxLength} bytes:  Spell says lengths in letters`)
    }
  }
  const header = [
    `// Read in from the Lexicon "${document.id}" (spell app lexicon read):  its records' shape, as Spell says it.`,
    ...notes.map((note) => `// - ${note}`)
  ]
  const source = [
    ...header,
    `a "${typeWords}" is a thing:`,
    `\t- it is published as "${document.id}"`,
    ...lines,
    ...rules,
    ""
  ].join("\n")
  return { typeWords, source, notes }
}

/** How a declaration says `field`'s kind, after `is`:  `undefined` for one Spell can't hold yet. */
function spellKindOf(field: LexiconField): string | undefined {
  if (field.type === "string" && field.enum?.length) return oneOfWords(field.enum)
  if (field.type === "string" && field.format === "datetime") return "a date"
  if (field.type === "string" && field.description?.includes(DECIMAL_NOTE)) return "a number"
  if (field.type === "string") return "text"
  if (field.type === "integer") return "an integer"
  if (field.type === "boolean") return "yes or no"
  if (field.type === "array" && field.items) {
    const item = spellKindOf(field.items)
    return item && LIST_ITEMS[item] ? `a list of ${LIST_ITEMS[item]}` : undefined
  }
  return undefined
}

/** What a list of each kind is called. */
const LIST_ITEMS: Record<string, string> = {
  text: "text",
  "a date": "dates",
  "a number": "numbers",
  "an integer": "integers",
  "yes or no": "choices"
}

/** What a field's line says itself, rather than on a rule line of its own. */
type SaidInline = {
  /** `required`, in its kind:  `a required date`. */
  required?: boolean
  /** Its length, after it:  `, with maximum length 1`. */
  length?: "minGraphemes" | "maxGraphemes"
}

/**
 * What a field's line says after `is`, its kind and what it says with it:
 * `required text, with maximum length 1`, `a required date`.
 * - `required` goes in a plain kind only (`text`, `a date`, `a number`, `an integer`):
 *   the language has it there, and not in `one of ...`, `yes or no` or a list, whose rule line says it instead.
 * - One length goes on the line, the most if it has both;  the other is a rule line.
 */
function spellLineOf(kind: string, field: LexiconField, isRequired: boolean): { said: string; inline: SaidInline } {
  const inline: SaidInline = {}
  let said = kind
  if (isRequired && REQUIRED_KINDS.has(kind)) {
    said = kind.replace(/^(an? )?/, (article) => (article ? "a required " : "required "))
    inline.required = true
  }
  if (field.type === "string" && field.maxGraphemes !== undefined) {
    said += `, with maximum length ${field.maxGraphemes}`
    inline.length = "maxGraphemes"
  } else if (field.type === "string" && field.minGraphemes !== undefined) {
    said += `, with minimum length ${field.minGraphemes}`
    inline.length = "minGraphemes"
  }
  return { said, inline }
}

/** The kinds `required` goes in:  `required text`, `a required date`. */
const REQUIRED_KINDS = new Set(["text", "a date", "a number", "an integer"])

/** The rule lines `field` asks for, on the property called `words`:  what its line didn't say (`inline`). */
function spellRulesOf(words: string, field: LexiconField, isRequired: boolean, inline: SaidInline): string[] {
  const rules: string[] = []
  const must = (rule: string) => rules.push(`\t- its ${words} must ${rule}`)
  if (isRequired && !inline.required) must("not be empty")
  const letters = (count: number) => `${count} letter${count === 1 ? "" : "s"}`
  if (field.minGraphemes !== undefined && inline.length !== "minGraphemes") {
    must(`be at least ${letters(field.minGraphemes)} long`)
  }
  if (field.maxGraphemes !== undefined && inline.length !== "maxGraphemes") {
    must(`be at most ${letters(field.maxGraphemes)} long`)
  }
  if (field.format === "uri") must("be a url")
  const { minimum, maximum } = field
  if (minimum !== undefined && maximum !== undefined) must(`be between ${minimum} and ${maximum}`)
  else if (minimum !== undefined) must(`be at least ${minimum}`)
  else if (maximum !== undefined) must(`be at most ${maximum}`)
  return rules
}

////////////////
// ## Helpers
////////////////

/**
 * A name's words, as a person says them:  `createdAt` => `created at`, `DatedEvent` => `dated event`.
 * - Spell compiles `created at` back to `createdAt`.
 */
function wordsOf(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .trim()
}

/**
 * A Lexicon's legal values as Spell says them, `one of happy, sad or grumpy`:  words, each as written.
 * - `undefined` when one isn't a plain word Spell would read back the same (`"12:30"`, `"a b"`).
 */
function oneOfWords(values: readonly unknown[]): string | undefined {
  const words = values.map((value) => `${value as string}`)
  if (!words.every((word) => /^[a-z][a-z0-9-]*$/i.test(word))) return undefined
  return `one of ${words.length > 1 ? `${words.slice(0, -1).join(", ")} or ${words.at(-1)}` : words[0]}`
}

/**
 * Every property `Class` declares, inherited and its own, by name.
 * - A superclass's come first (`id`);  a subclass's declaration of the same name wins.
 * - REFACTOR: `checking.ts` has the same walk;  one shared one, once a third reads it.
 */
function declaredProps(Class: Function): Map<string, PropInfo> {
  const chain: ReturnType<typeof schemaOf>[] = []
  for (let schema: ReturnType<typeof schemaOf> | undefined = schemaOf(Class); schema; schema = schema.parent)
    chain.unshift(schema)
  const props = new Map<string, PropInfo>()
  for (const schema of chain) for (const [name, info] of schema.declared) props.set(name, info)
  return props
}
