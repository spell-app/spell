/**
 * String helpers:  attribute <-> property case, Fomantic's number words, "did you mean",
 * slugs and accents, escaping (regular expressions, HTML), and indents.
 * - Standalone:  no imports, so plain `node` loads it too (`spell/util/string.ts`).
 * - Case conversion is hand-rolled rather than lodash's `kebabCase` / `camelCase`:  lodash splits on digits
 *   (`"h1"` => `"h-1"`), which breaks round-tripping `activeIndex` <-> `active-index` for attribute names.
 * - Case conversions are memoized:  attribute names are converted on every `attributeChangedCallback`.
 */

////////////////
// ## Case conversion
////////////////

/**
 * Convert `camelCase` to `kebab-case`, e.g. `activeIndex` => `active-index`.
 * - Only splits before an uppercase letter, so digits stay put:  `h1Size` => `h1-size`.
 * - Already-kebab text passes through unchanged.
 */
export function kebabCase(text: string) {
  return (KEBAB_CASE[text] ??= text.replace(/\p{Lu}/gu, (letter) => `-${letter.toLowerCase()}`))
}
/** Memo for `kebabCase()`. */
const KEBAB_CASE: Record<string, string> = Object.create(null)

/**
 * Convert `kebab-case` to `camelCase`, e.g. `active-index` => `activeIndex`.
 * - Exact inverse of `kebabCase()` for names it produces.
 * - Already-camel text passes through unchanged.
 */
export function camelCase(text: string) {
  return (CAMEL_CASE[text] ??= text.replace(/-([\p{Ll}\d])/gu, (_, letter: string) => letter.toUpperCase()))
}
/** Memo for `camelCase()`. */
const CAMEL_CASE: Record<string, string> = Object.create(null)

////////////////
// ## Number words
////////////////

/**
 * Fomantic's word for a column count 1..16, e.g. `4` or `"4"` => `"four"` (as in `four wide column`).
 * - Returns `undefined` for anything else, including `0`, fractions and out-of-range numbers,
 *   so callers decide whether that's an error or a pass-through.
 */
export function numberToWord(value: number | string): string | undefined {
  const number = typeof value === "number" ? value : /^\d+$/.test(value.trim()) ? Number(value) : NaN
  return Number.isInteger(number) ? NUMBER_WORDS[number - 1] : undefined
}
/** `numberToWord()`'s words, index `n - 1`. */
const NUMBER_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen"
]

////////////////
// ## Did you mean
////////////////

/**
 * Levenshtein edit distance between `a` and `b`:  inserts + deletes + substitutions to turn one into the other.
 * - Two rolling rows rather than the full matrix -- the inputs are short, but this runs per candidate.
 * - Case-sensitive;  `suggest()` lower-cases first.
 */
export function levenshtein(a: string, b: string) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  let current = new Array<number>(b.length + 1)
  for (let i = 1; i <= a.length; i++) {
    current[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
    }
    ;[previous, current] = [current, previous]
  }
  return previous[b.length]
}

/**
 * Closest of `candidates` to `word`, for dev-time "did you mean" warnings on unknown attribute values.
 * - Case-insensitive.
 * - Returns `undefined` when nothing is within `maxDistance` edits (default 2) -- a wild guess is worse
 *   than no guess.
 * - Ties go to the EARLIER candidate, so list the most common values first.
 */
export function suggest(word: string, candidates: Iterable<string>, maxDistance = 2): string | undefined {
  const lower = word.toLowerCase()
  let best: string | undefined
  let bestDistance = maxDistance + 1
  for (const candidate of candidates) {
    const distance = levenshtein(lower, candidate.toLowerCase())
    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

////////////////
// ## Slugs and accents
////////////////

/** How `slug()` makes its slug. */
export type SlugOptions = {
  /**
   * Which rule (default `"id"`):
   * - `"id"`:  an id or an address, ASCII only:  accents and apostrophes dropped, every other run of non-letters,
   *   non-digits one `-`, none at the ends
   * - `"github"`:  GitHub's heading anchor:  lower case, punctuation dropped, each space a `-`;
   *   accented letters kept, runs of `-` too
   */
  as?: "id" | "github"
  /** what an empty slug becomes, e.g. `"phase"`;  default `""` */
  fallback?: string
}

/**
 * `text` as a slug, e.g. `Café 2.0` => `cafe-2-0`, `Owen's <epic-link>` => `owens-epic-link`.
 * - THE rule for ids (`PhaseIds.slugOf()`'s, moved here):  an id drops accents, so a title made into an id anywhere (phase ids, epic addresses,
 *   Spell UI's contents and site index) agrees with every other place.
 * - A markdown heading's anchor is GitHub's (`{ as: "github" }`):  `Café` => `café`, `A & B` => `a--b`,
 *   so links into a README or a docs page land where GitHub's do.
 * - NEVER throws
 */
export function slug(text: string, { as = "id", fallback = "" }: SlugOptions = {}): string {
  const made =
    as === "github"
      ? text
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
          .replace(/ /g, "-")
      : withoutAccents(text.normalize("NFKD"))
          .toLowerCase()
          .replace(/['’]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
  return made || fallback
}

/** How `withoutAccents()` treats letters. */
export type AccentOptions = {
  /**
   * letters whose marks stay, either case, e.g. `"ñü"` for Spanish keywords:  `año` stays `año`
   * - default none
   */
  keep?: string
}

/**
 * `text` with its accents and other marks dropped:  `Café` => `Cafe`, `naïve` => `naive`.
 * - `keep`:  letters left as they are (`{ keep: "ñü" }`:  `pingüino` stays, `canción` => `cancion`)
 * - Letters with no plain form (`ø`, `ß`) stay as they are.
 */
export function withoutAccents(text: string, { keep = "" }: AccentOptions = {}): string {
  const kept = keep.normalize("NFC").toLowerCase()
  return text
    .normalize("NFC")
    .replace(/\P{ASCII}/gu, (letter) =>
      kept.includes(letter.toLowerCase()) ? letter : letter.normalize("NFD").replace(/\p{M}+/gu, "")
    )
}

////////////////
// ## Escaping
////////////////

/**
 * `text` with every regular expression character escaped, to match it literally:  `a.b` => `a\.b`.
 * - Ours rather than `RegExp.escape()`:  that one is too new for every browser we run in (coherence J8).
 */
export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** `text` safe in HTML text and in an attribute's value, either quote:  `&`, `<`, `>`, `"` and `'` escaped. */
export function escapeHTML(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!)
}
/** What `escapeHTML()` writes for each special character. */
const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }

////////////////
// ## Indents
////////////////

/**
 * `text` with the indent its lines share taken off, and its blank first and last lines dropped:
 * for a template literal written indented in code.
 * - spaces and tabs count alike, one each;  blank lines don't count
 */
export function dedent(text: string): string {
  const lines = text.split("\n")
  while (lines.length && !lines[0]!.trim()) lines.shift()
  while (lines.length && !lines.at(-1)!.trim()) lines.pop()
  const indents = lines.filter((line) => line.trim()).map((line) => /^[ \t]*/.exec(line)![0].length)
  const shared = indents.length ? Math.min(...indents) : 0
  return lines.map((line) => line.slice(shared)).join("\n")
}

/**
 * `text` with each line indented by `indent`:  that text, or that many spaces.
 * - blank lines (empty, or spaces only) are left as they are, so no line ends in spaces
 */
export function indented(text: string, indent: string | number): string {
  const prefix = typeof indent === "number" ? " ".repeat(indent) : indent
  return text
    .split("\n")
    .map((line) => (line.trim() ? `${prefix}${line}` : line))
    .join("\n")
}
