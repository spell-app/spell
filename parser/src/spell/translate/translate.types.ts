/**
 * Types for translating a spell project into another language (epic `spanish` P24-P25):  see `Translator`.
 * - Type-only:  imports no values.
 */
import type { P } from "spell-lang/parser"

/**
 * What a project's names dictionary holds, `<Project>.<lang>.names.json5`:
 * every name the project's people chose, by its words in the language it's written in.
 * - A value of `TODO` (`TranslationNames.TODO`), or an empty one, counts as missing.
 */
export type NamesData = {
  /** Each type's name, singular, e.g. `card` => `{ name: "carta", gender: "feminine" }`. */
  types?: Record<string, TranslatedType>
  /** Each property, variable, value or event name, as written, e.g. `rank` => `rango`. */
  names?: Record<string, string>
  /** Each method's or phrase's words, as declared, e.g. `turn it face up` => `voltearla boca arriba`. */
  phrases?: Record<string, string>
  /** Each quoted text, e.g. `queen of spades` => `dama de espadas`. */
  texts?: Record<string, string>
  /** Each comment's words, after its `//` or `#`. */
  comments?: Record<string, string>
  /**
   * The gender of each noun in `names` that isn't a type's, by its word in the OTHER language, singular:
   * `imagen` => `feminine` (epic `spanish` P25, J146) -- so its article agrees, `la imagen`, not a guess by its ending.
   */
  genders?: Record<string, string>
}

/**
 * What a language pack's names glossary holds, `languages/<lang>/glossary.json5` (epic `spanish` P26):
 * the names people choose, shared by every project -- see `NamesGlossary`.
 */
export type GlossaryData = {
  /** Each type's or name's English words, singular, e.g. `card` => `{ name: "carta", gender: "feminine", ... }`. */
  names?: Record<string, GlossaryEntry>
  /** General method phrases, e.g. `turn it face up` => `{ name: "voltear eso boca arriba", ... }`. */
  phrases?: Record<string, GlossaryEntry>
  /** The gender of common nouns, by their word in the other language, singular:  `mano` => `feminine`. */
  genders?: Record<string, string>
}

/** One name in a glossary:  its words in the other language, and where it came from. */
export type GlossaryEntry = {
  /** Its words in the other language, singular, e.g. `carta`. */
  name: string
  /** A noun's gender, e.g. `feminine`. */
  gender?: string
  /** Its plural, only where the language's rules get it wrong. */
  plural?: string
  /**
   * Where it came from:  a better source wins when two disagree.
   * - `reviewed`:  a person checked it
   * - `seed:<Project>`:  a translation a person made, e.g. `seed:Solitario`
   * - `learned:<Project>`:  a project's dictionary (`--learn`)
   * - `drafted`:  written by an AI, unchecked
   */
  from: string
}

/** One section of a names dictionary, e.g. `names`. */
export type NamesKind = keyof NamesData

/** A type's name in the other language, and its gender there, if it has genders. */
export type TranslatedType = {
  /** Its name, singular, as a person writes it, e.g. `pila de reserva`. */
  name: string
  /** Its gender, e.g. `feminine` -- what its declaration's article says, `una carta es ...`. */
  gender?: string
}

/** One file of a project to translate, already parsed. */
export type SourceFile = {
  /** Its path in the project, e.g. `/Card.spell`. */
  path: string
  /** Its text. */
  contents: string
  /** Its parse, `block` rule. */
  match: P.Match | undefined
}

/** One file, translated:  one line for each of its source's lines. */
export type TranslatedFile = {
  /** Its source's path, e.g. `/Card.spell`. */
  path: string
  /** Its lines, in the other language. */
  lines: string[]
  /**
   * The lines that still need a person, by index:  why, e.g. `rule if_else`, `name "face up cards"`.
   * - Each says so in a `// TODO: translate` comment of its own.
   */
  todo: Map<number, string[]>
  /** The names each line asked the dictionary for and didn't find, by index -- see `TranslationNames.missing`. */
  missing: Map<number, MissingName[]>
  /** How many lines each statement over several lines takes (JSX), by its first line's index:  the rest take one. */
  spans: Map<number, number>
  /**
   * The lines written whose word order may be wrong in the other language, by index:  why (epic `spanish` P25).
   * - e.g. a text joined to a value with `+`:  `its color + " joker"` is `"comodín " + su color` in Spanish.
   * - They read and run, so lint can't tell:  the fix-up pass looks at each in context (`FixUps`).
   */
  risky: Map<number, string>
}

/** A name the dictionary lacks:  its section and its words. */
export type MissingName = { kind: NamesKind; words: string }

/**
 * What a project needs to know of a project it imports, to translate the lines that use it (epic `spanish` P25).
 * - `declarations`:  what it declares (`<Project>.declarations.json5`):  its types, properties and methods.
 * - `names`:  its own names dictionary in the other language (`<Project>.<lang>.names.json5`), when it has one AND a
 *   translation the importing project can import instead;  else its names are kept as it declares them,
 *   the only words the other language's parser reads for it.
 */
export type ImportedProject = {
  /** Its address, as the project file imports it, e.g. `@spell/test/counter`. */
  path: string
  /** What it declares. */
  declarations: { statements: DeclarationStatement[] }
  /** Its names in the other language, if it has a translation. */
  names?: NamesData
  /** The address of its translation, to import instead, e.g. `@spell/test/contador`. */
  translatedPath?: string
}

/**
 * One declaring statement of a project's declarations, as far as translating reads it (`SP.SpellDeclaration`):
 * a type, a property (with its values), a method or a function.
 */
export type DeclarationStatement = {
  /** A type's name, `StockPile`. */
  type?: string
  /** A property's name, `rank`, or `"is-set-up"` as written. */
  property?: string
  /** The type it's declared on, `Card`. */
  of?: string
  /** A method's or function's words, as declared:  `turn it face up`, `"is a (rank)"`. */
  name?: string
  /** `method` or `function`. */
  kind?: string
  /** A method's compiled name, `turn_face_up`:  what a call's rule says (`methodName`). */
  output?: string
  /** A property's values, `["ace", 2, ...]`. */
  enumeration?: unknown[]
  /** A quoted property's values, by slot. */
  values?: Record<string, unknown[]>
  /** Constants it declares, `["red"]`. */
  constants?: string[]
}

/**
 * Spell UI's names in another language, for the `<ui-*>` tags a project draws with (epic `spanish` P25):
 * `<ui-text color="red">` => `<es-texto color="rojo">`.
 * - spell-app makes it from Spell UI's dictionaries (`UI<Name>.<lang>.ts`):  spell-lang never imports Spell UI.
 */
export type UIVocabulary = {
  /** `tag` (`ui-text`) in the other language, `es-texto`;  `undefined` if it isn't Spell UI's. */
  tag(tag: string): string | undefined
  /**
   * `attribute` of `tag` (canonical, `ui-text`) and its `value`, in the other language:
   * `{ attribute: "color", value: "rojo" }`;  `undefined` for one the tag doesn't take.
   * - A value it has no word for comes back as it was.
   */
  attribute(tag: string, attribute: string, value?: string): { attribute: string; value?: string } | undefined
  /** Does `attribute` of `tag` take only the values it names (`color`, `size`)?  Then a text in it is one of them. */
  hasValues(tag: string, attribute: string): boolean
}

/**
 * Asks Claude `prompt`, and answers what it said (epic `spanish` P25-P27):  every pass asks through one of these.
 * - Two of them, the command picks (`spell-lang/cli/claudeRunners`):
 *   - the Claude API, straight, when `ANTHROPIC_API_KEY` is set:  no program to start for each call
 *   - `claude -p` otherwise, signed in as the person
 * - Injected, so a test can answer with a fake.
 * - throws if Claude couldn't be asked, or failed
 */
export type ClaudeRunner = (prompt: string, options?: ClaudeOptions) => Promise<string>

/** How a pass wants Claude asked:  see `ClaudeRunner`. */
export type ClaudeOptions = {
  /** How hard it thinks:  less is faster -- default the model's own. */
  effort?: ClaudeEffort
  /**
   * Which model, e.g. `opus`, `claude-sonnet-5-5` -- default the runner's:  `claude -p`'s own, the API's Opus 5.5.
   * - `opus`, `sonnet` and `haiku` are the newest of each, through either runner.
   */
  model?: string
  /**
   * The answer's shape, a JSON schema:  Claude can only answer JSON that fits it.
   * - Every object in it lists its properties, all required, with `additionalProperties: false`.
   */
  schema?: JsonSchema
  /**
   * What every call of a pass shares, e.g. the language pack's glossary:  in the system prompt, after its first line.
   * - The API caches it, so the calls after the first read it for less, and sooner.
   */
  context?: string
}

/** A JSON schema, as `ClaudeOptions.schema` takes it. */
export type JsonSchema = { [key: string]: unknown }

export type ClaudeEffort = "low" | "medium" | "high"

/** Something wrong with one line of a translated project, as lint or a failed test says (epic `spanish` P25). */
export type LineProblem = {
  /** The file's path in the translated project, `/Carta.es.spell`. */
  path: string
  /** Its line, from 0. */
  line: number
  /** What lint or the test said. */
  message: string
  /** Who said it:  lint, a failed test, or the shape check (`ShapeCheck`:  it compiles to a different program). */
  source: "lint" | "test" | "shape"
}

/**
 * Checks a translated project as it is on disk:  lint, then its tests (epic `spanish` P25).
 * - spell-app's, as it finds and runs projects the app's way;  called again after each round of fix-ups.
 * - `files`:  the translation's spell files as it parsed them, in its own project, for the shape check (P26).
 * - NEVER throws:  a project that won't load is one problem, on its first line.
 */
export type TranslationChecker = () => Promise<{
  problems: LineProblem[]
  tests?: { passed: number; failed: number }
  files?: SourceFile[]
}>
