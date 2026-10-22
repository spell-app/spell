/**
 * How Spanish makes a word singular or plural, for spell's Spanish pack (epic `spanish` P5):
 * `cartas` => `carta`, `corazones` => `corazón`, `luces` => `luz`, `lunes` is both.
 * - The rules are Python-Inflector's Spanish ones (bermi's `rules/spanish.py`), ported and widened:
 *   an irregulars list, the words that don't change, then rules by the word's ending.
 *   Owen chose porting them over a dependency (the bedtime page, 2026-10-22):  no npm package singularizes Spanish.
 * - Spanish moves the written accent as a word grows or shrinks a syllable:
 *   - plural:  `corazón` => `corazones` (the accent goes), `joven` => `jóvenes` (one comes)
 *   - singular:  the other way;  a word that can't be told by rule is in `IRREGULAR`
 * - Only parsing and compiling load it:  a compiled program never inflects.
 */
import { P } from "spell-lang/parser"

/** Spanish's inflector:  see the file's docstring. */
export const spanishInflector = new P.Inflector({
  lang: "es",
  singular: (words) => eachWord(words, singularOf),
  plural: (words) => eachWord(words, pluralOf)
})

/**
 * `words`, a name of one or several words, each made singular or plural by `inflect`:
 * in Spanish an adjective agrees with its noun, `cuenta bancaria` => `cuentas bancarias`.
 * - Words are split at a space, a dash or an underscore, which stay as they were.
 * - From a linking word on (`de`, `del`, `con` ...), the rest is left alone:  `carta de juego` => `cartas de juego`.
 */
function eachWord(words: string, inflect: (word: string) => string): string {
  const parts = words.split(/([ _-]+)/)
  let linked = false
  return parts
    .map((part, index) => {
      if (index % 2 === 1 || linked) return part
      if (LINKING_WORDS.has(part.toLowerCase())) {
        linked = true
        return part
      }
      return inflect(part)
    })
    .join("")
}

/** Words after which the rest of a name is left alone:  `carta de juego`. */
const LINKING_WORDS = new Set(["de", "del", "con", "para", "en", "a", "al", "sin", "por"])

/** `word` made plural, its case kept:  `carta` => `cartas`, `corazón` => `corazones`, `luz` => `luces`. */
export function pluralOf(word: string): string {
  // a plural already stays as it is:  `cartas`, `corazones`
  if (singularOf(word) !== word) return word
  const lower = word.toLowerCase()
  if (!lower || UNCHANGING.has(lower) || INVARIANT_ENDING.test(lower)) return word
  const irregular = IRREGULAR_PLURALS.get(lower)
  if (irregular) return sameCase(word, irregular)
  // -z => -ces:  luz, luces
  if (lower.endsWith("z")) return `${word.slice(0, -1)}${sameCase(word.slice(-1), "c")}es`
  // a vowel without a written accent, or é / ó:  add -s, `carta`, `café`
  if (/[aeiouéó]$/.test(lower)) return `${word}s`
  // á, í, ú:  add -es, `rubí`, `rubíes`
  if (/[áíú]$/.test(lower)) return `${word}es`
  // a stressed last syllable loses its written accent:  `corazón`, `corazones`;  `inglés`, `ingleses`
  const accented = /([áéíóú])([nsl])$/u.exec(lower)
  if (accented && syllables(lower) > 1) return `${word.slice(0, -2)}${unaccented(accented[1]!)}${accented[2]}es`
  // a word stressed on its next-to-last syllable, ending in -n, gains one:  `joven`, `jóvenes`;  `examen`, `exámenes`
  if (/[^aeiouáéíóú]?[aeiou][^aeiouáéíóú]*en$/u.test(lower) && GAINS_ACCENT.has(lower)) {
    return `${accentLastButOne(word)}es`
  }
  // any other consonant (or y):  add -es, `color`, `colores`;  `rey`, `reyes`
  return `${word}es`
}

/** `word` made singular, its case kept:  `cartas` => `carta`, `corazones` => `corazón`, `luces` => `luz`. */
export function singularOf(word: string): string {
  const lower = word.toLowerCase()
  if (!lower || UNCHANGING.has(lower) || INVARIANT_ENDING.test(lower)) return word
  const irregular = IRREGULAR_SINGULARS.get(lower)
  if (irregular) return sameCase(word, irregular)
  // already singular:  one syllable ending in -s (`as`, `mes`), or a stressed last syllable (`país`, `inglés`)
  if (lower.endsWith("s") && (syllables(lower) === 1 || /[áéíóú]s$/u.test(lower))) return word
  // -ces => -z:  luces, luz
  if (lower.endsWith("ces")) return `${word.slice(0, -3)}${sameCase(word.slice(-3, -2), "z")}`
  if (lower.endsWith("es")) {
    const stem = word.slice(0, -2)
    const lowerStem = stem.toLowerCase()
    // -íes, -úes, -áes:  rubíes, rubí
    if (/[áíú]$/.test(lowerStem)) return stem
    // a stem ending in a vowel took only -s:  `diamantes` is `diamante`, `nubes` is `nube`
    if (/[aeiou]$/.test(lowerStem)) return word.slice(0, -1)
    // -iones, -ones, -anes, -ines, -unes, -eses:  the singular's last syllable takes the accent back
    const stressed = /([aeiou])([ns])$/u.exec(lowerStem)
    if (stressed && syllables(lowerStem) > 1 && !/[áéíóú]/u.test(lowerStem) && TAKES_ACCENT_BACK.test(lowerStem)) {
      return `${stem.slice(0, -2)}${accentedVowel(stressed[1]!)}${stressed[2]}`
    }
    // jóvenes => joven:  the plural's own accent goes
    if (/[áéíóú]/u.test(lowerStem) && /en$/.test(lowerStem)) return removeAccents(stem)
    // a consonant a Spanish word may end in (or y) before -es:  colores, color;  reyes, rey;  tréboles, trébol
    if (/[lnrdjsxy]$/u.test(lowerStem)) return stem
    // any other:  the -e is the word's own, `diamantes` is `diamante`
    return word.slice(0, -1)
  }
  if (lower.endsWith("s")) return word.slice(0, -1)
  return word
}

////////////////
// ## The word lists
////////////////

/** Words the same in singular and plural:  days of the week, and others that end in an unstressed -s or -x. */
const UNCHANGING = new Set([
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "crisis",
  "tesis",
  "análisis",
  "síntesis",
  "paréntesis",
  "virus",
  "atlas",
  "tórax",
  "fénix",
  "dosis",
  "caries",
  "cumpleaños",
  "paraguas",
  "abrelatas",
  "sacacorchos"
])

/** Endings that never change between singular and plural:  -sis, -xis, unstressed -us. */
const INVARIANT_ENDING = /(?:[sx]is|tus|[^aeiouáéíóú]us)$/u

/** Plural => singular for words no rule tells:  the plural's stress or spelling moves. */
const IRREGULAR_SINGULARS = new Map([
  ["países", "país"],
  ["caracteres", "carácter"],
  ["regímenes", "régimen"],
  ["especímenes", "espécimen"],
  ["ases", "as"],
  ["mieses", "mies"],
  ["panes", "pan"],
  ["planes", "plan"],
  ["fines", "fin"],
  ["dones", "don"],
  ["sones", "son"],
  ["tones", "ton"],
  ["meses", "mes"],
  ["toses", "tos"],
  ["gases", "gas"],
  ["dioses", "dios"],
  ["reyes", "rey"],
  ["leyes", "ley"],
  ["bueyes", "buey"],
  ["imágenes", "imagen"],
  ["órdenes", "orden"],
  ["orígenes", "origen"],
  ["exámenes", "examen"],
  ["volúmenes", "volumen"],
  ["márgenes", "margen"],
  ["vírgenes", "virgen"],
  ["crímenes", "crimen"],
  ["resúmenes", "resumen"],
  ["certámenes", "certamen"],
  ["jóvenes", "joven"],
  ["dólmenes", "dolmen"],
  // a plural ending in an accented vowel and -s, which a singular like `país` or `inglés` also does
  ["cafés", "café"],
  ["sofás", "sofá"],
  ["mamás", "mamá"],
  ["papás", "papá"],
  ["dominós", "dominó"],
  ["bebés", "bebé"]
])

/** Singular => plural, the other way round. */
const IRREGULAR_PLURALS = new Map([...IRREGULAR_SINGULARS].map(([plural, singular]) => [singular, plural]))

/** Words ending -en stressed on their next-to-last syllable:  they take an accent in the plural.  See `IRREGULAR_SINGULARS`. */
const GAINS_ACCENT = new Set(["joven", "examen", "orden", "origen", "imagen", "volumen", "margen", "virgen", "crimen"])

/**
 * A stem whose singular ends in a stressed -ón, -ín, -án, -én, -ún, -és:
 * the plural lost the written accent, which the singular takes back.
 * - `corazones` => `corazón`, `jardines` => `jardín`, `alemanes` => `alemán`, `ingleses` => `inglés`
 * - Not a one-syllable word (`pan`, `fin`):  those never had one (and the common ones are in `IRREGULAR_SINGULARS`).
 */
const TAKES_ACCENT_BACK = /(?:i?on|in|an|un|es|en)$/u

////////////////
// ## Helpers
////////////////

/** How many vowel groups `word` has:  a fair count of its syllables, e.g. 3 for `corazón`. */
function syllables(word: string): number {
  return word.match(/[aeiouáéíóúü]+/gu)?.length ?? 0
}

/** `vowel` without its written accent. */
function unaccented(vowel: string): string {
  return removeAccents(vowel)
}

/** `vowel` with a written accent. */
function accentedVowel(vowel: string): string {
  return ACCENTED[vowel] ?? vowel
}

/** `text` with its written accents taken off (but `ñ` and `ü` kept). */
function removeAccents(text: string): string {
  return text.replace(/[áéíóú]/gu, (vowel) => UNACCENTED[vowel] ?? vowel)
}

/** `word` with an accent on its next-to-last vowel group:  `joven` => `jóven`, ready for `-es`. */
function accentLastButOne(word: string): string {
  const groups = [...word.matchAll(/[aeiou]+/gu)]
  const target = groups.at(-2)
  if (!target || target.index === undefined) return word
  const at = target.index + target[0].length - 1
  return `${word.slice(0, at)}${accentedVowel(word[at]!)}${word.slice(at + 1)}`
}

/** `replacement` in the case of `original`:  upper case if it was. */
function sameCase(original: string, replacement: string): string {
  return original === original.toUpperCase() && original !== original.toLowerCase()
    ? replacement.toUpperCase()
    : replacement
}

/** Each vowel with its written accent. */
const ACCENTED: Record<string, string> = { a: "á", e: "é", i: "í", o: "ó", u: "ú" }

/** Each accented vowel without. */
const UNACCENTED: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u" }
