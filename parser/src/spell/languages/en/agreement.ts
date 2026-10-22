/**
 * How English's articles agree with their noun, for spell's English pack (epic `spanish` P8):
 * `a` before a consonant SOUND, `an` before a vowel sound.
 * - `a apple` warns "an apple"?, `an card` "a card"?:  see `SP.Language.agreement()`.
 * - By the noun's first letter, with a few exceptions it can't hear:  `an hour`, `a unicorn`, `a user`, `a one`.
 * - Needs no type:  `a apple` warns though no type is called `apple`.
 * - `the` agrees with everything;  English types have no gender.
 */
import type { SP } from "spell-lang/spell"

/** English's article agreement:  see the file's docstring. */
export const englishAgreement: SP.ArticleAgreement = {
  expected(article, noun) {
    if (article !== "a" && article !== "an") return undefined
    const wanted = startsWithVowelSound(noun) ? "an" : "a"
    return wanted === article ? undefined : wanted
  },

  warning(phrase) {
    return `Did you mean "${phrase}"?`
  }
}

/**
 * Does `word` start with a vowel SOUND, so it takes `an`?
 * - A vowel letter does, e.g. `apple`, `hour`;  a consonant doesn't, e.g. `card`.
 * - Except the words in `CONSONANT_SOUNDS` and `VOWEL_SOUNDS`, e.g. `unicorn`, `hour`.
 */
function startsWithVowelSound(word: string): boolean {
  if (CONSONANT_SOUNDS.test(word)) return false
  return VOWEL_SOUNDS.test(word) || /^[aeiou]/i.test(word)
}

/** Words which start with a vowel letter, but a consonant sound:  `a one`, `a unicorn`, `a user`, `a euro`. */
const CONSONANT_SOUNDS = /^(?:one(?![a-z])|once|uni(?!n)|use|usu|uti|ur[il]|eu|ewe)/i

/** Words which start with a consonant letter, but a vowel sound:  `an hour`, `an honest`, `an heir`. */
const VOWEL_SOUNDS = /^(?:hour|honest|hono(?:u)?r|heir)/i
