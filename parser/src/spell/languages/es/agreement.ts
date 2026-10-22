/**
 * How Spanish's articles agree with their noun, for spell's Spanish pack (epic `spanish` P8):
 * in gender and number, `la carta`, `los mazos`, `unas cartas`.
 * - `el carta` warns "la carta"?, `un cartas` "unas cartas"?:  see `SP.Language.agreement()`.
 * - A type's gender is read off its declaration's article (`genderOf()`):
 *   `una carta es una cosa` is feminine, `un mazo ...` masculine.
 *   The built-in types' are in `BUILT_IN_GENDERS`, e.g. `lista`.
 * - Its number is the noun's as written:  `cartas` is plural.
 * - Only a noun naming a type:  a word spell knows no gender for (`un trébol`, a value) never warns.
 * - A message's example takes its article from the same table (`article()`):  `una carta tiene ...`.
 * - NOT the contractions `al` and `del`, nor a feminine noun taking `el` before a stressed `a` (`el agua`).
 */
import { P } from "spell-lang/parser"
import type { SP } from "spell-lang/spell"

/** Spanish's article agreement:  see the file's docstring. */
export const spanishAgreement: SP.ArticleAgreement = {
  expected(article, noun, type) {
    const form = ARTICLES[article]
    if (!form || !type) return undefined
    const [kind, articleGender, articleNumber] = form
    const gender = type.gender ?? BUILT_IN_GENDERS[P.singularize(noun)] ?? articleGender
    const plurality = P.Inflector.active.plurality(noun.split(" ").at(-1)!)
    const number = plurality === "either" ? articleNumber : plurality
    const wanted = Object.keys(ARTICLES).find((each) => {
      const [eachKind, eachGender, eachNumber] = ARTICLES[each]!
      return eachKind === kind && eachGender === gender && eachNumber === number
    })
    return wanted === article ? undefined : wanted
  },

  genderOf(article) {
    return ARTICLES[article]?.[1]
  },

  article(kind, noun, type) {
    const word = noun.replace(/^["']|["']$/g, "")
    const gender = type?.gender ?? BUILT_IN_GENDERS[P.singularize(word)] ?? guessedGender(word)
    return Object.keys(ARTICLES).find((each) => {
      const [eachKind, eachGender, eachNumber] = ARTICLES[each]!
      return eachKind === kind && eachGender === gender && eachNumber === "singular"
    })!
  }
}

/**
 * The gender a Spanish noun most likely has, by its ending, for a message's example:  `una dirección`, `un rango`.
 * - Feminine:  `-a`, `-ión`, `-dad`, `-tad`, `-tud`, `-umbre`;  else masculine.
 * - Only a guess, for a word naming no type (a property):  `el día`, `el mapa` guess wrong.
 * - Its first word, singular, for a name of several:  `palos cortos` is `palo`'s, `nombres-de-cartas` `nombre`'s.
 */
function guessedGender(noun: string): Gender {
  const first = P.singularize(noun.split(/[\s-]+/)[0] ?? noun)
  return /(a|i[oó]n|dad|tad|tud|umbre)$/i.test(first) ? "feminine" : "masculine"
}

/** Each article's kind, gender and number:  `la` is the definite, feminine, singular one. */
const ARTICLES: Record<string, [kind: "definite" | "indefinite", gender: Gender, number: "singular" | "plural"]> = {
  el: ["definite", "masculine", "singular"],
  la: ["definite", "feminine", "singular"],
  los: ["definite", "masculine", "plural"],
  las: ["definite", "feminine", "plural"],
  un: ["indefinite", "masculine", "singular"],
  una: ["indefinite", "feminine", "singular"],
  unos: ["indefinite", "masculine", "plural"],
  unas: ["indefinite", "feminine", "plural"]
}

/** Spanish's two genders, as a type's `P.TypeScope.gender` says them. */
type Gender = "masculine" | "feminine"

/** The gender of each Spanish word for a built-in type (`SP.Language.typeWords`), singular:  `una lista`, `un texto`. */
const BUILT_IN_GENDERS: Record<string, Gender> = {
  texto: "masculine",
  cadena: "feminine",
  número: "masculine",
  numero: "masculine",
  fracción: "feminine",
  fraccion: "feminine",
  decimal: "masculine",
  entero: "masculine",
  carácter: "masculine",
  caracter: "masculine",
  opción: "feminine",
  opcion: "feminine",
  booleano: "masculine",
  fecha: "feminine",
  lista: "feminine",
  arreglo: "masculine",
  cosa: "feminine",
  aplicación: "feminine",
  aplicacion: "feminine",
  dibujable: "masculine"
}
