/**
 * Spanish's own small words:  the tables spell's rules read while parsing Spanish (epic `spanish` P5).
 * - The same shape as English's (`SP.LanguageWords`);  rules read the language in play, never these directly.
 * - Keywords typed without their accent (`si`, `numero`) are accepted too (Owen, the bedtime page, 2026-10-22):
 *   each list holds both spellings where people drop one.
 */
import type { P } from "spell-lang/parser"
import type { SP } from "spell-lang/spell"

/** Spanish's words:  see `SP.LanguageWords` for what each list is for. */
export const spanishWords: SP.LanguageWords = {
  /**
   * Words which may never be a one-word name, so they stay spell's:  Spanish's for the roles English's 8 play
   * (`is`, `if`, `the`, `in`, `of`, `with`, `to`, `no`), its articles all.
   * - English's were found by the blacklist analysis (P2);  Spanish's are its counterparts, to be checked the same way.
   */
  blacklist: {
    es: 1,
    si: 1,
    el: 1,
    la: 1,
    los: 1,
    las: 1,
    en: 1,
    de: 1,
    con: 1,
    a: 1,
    no: 1
  },

  /** Words which end a member's name of several words:  `de` ends `el rango corto de`, `como` a declaration ... */
  memberStopWords: new Set([
    "de",
    "del",
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "unos",
    "unas",
    "uno",
    "es",
    "son",
    "está",
    "esta",
    "están",
    "estan",
    "tiene",
    "tienen",
    "en",
    "a",
    "al",
    "y",
    "o",
    "u",
    "si",
    "donde",
    "cuyo",
    "cuya",
    "cuyos",
    "cuyas",
    "como",
    "con",
    "para",
    "desde",
    "entonces",
    "sino",
    "no",
    "por",
    "sobre"
  ]),

  /** Stop words which may still START a member's name, e.g. `con comodines` (with jokers), `en juego` (in play). */
  memberLeadingWords: new Set(["con", "para", "desde", "en", "por", "sobre", "al"]),

  /** Little words after which a method's name keeps its receiver's type:  `actualizar_el_total_de_calculadora`. */
  danglingWords: new Set([
    "de",
    "del",
    "a",
    "al",
    "desde",
    "en",
    "sobre",
    "para",
    "con",
    "sin",
    "antes",
    "después",
    "despues",
    "entre",
    "hacia",
    "bajo",
    "contra"
  ]),

  /** Words which end a type's name of several words:  `alias`, as in `una cuenta bancaria alias cuenta es una cosa`. */
  typeNameStopWords: new Set(["alias"]),

  /** The word between a list and what it holds:  `lista de cartas`. */
  listOfWord: "de",

  /**
   * The kind of a property's values, by Spanish's word order:  `palo de carta`, from a carta's `su "palo" es uno de ...`.
   * - Its plural is its first word's, `palos de carta`, as for any name with `de` in it.
   */
  propertyKindName: "{property} de {type}",

  /**
   * Words which name `it` as an object:  `imprimir eso`, `obtener su nombre`, then `imprimir eso`.
   * - Spanish attaches the pronoun to its verb (`imprimirlo`), which spell's words can't split, so `eso` ("that").
   * - `ello` too, the plain pronoun.
   */
  itWords: new Set(["eso", "ello"]),

  /**
   * A verb with `it` fused onto its end:  `barajarla`, `dibujarlo`, `voltearlas` => `barajar`, `dibujar`, `voltear`.
   * - Only an infinitive (`-ar`, `-er`, `-ir`) then `lo`, `la`, `los` or `las`:  `para barajarla:` in a type's outline body.
   */
  fusedIt: /^(\p{L}+(?:ar|er|ir|ár|ér|ír))(?:lo|la|los|las)$/iu,

  /** `al` is `a el`, `del` is `de el`:  a method's words and its calls may say either. */
  contractions: { al: "a el", del: "de el" },

  /**
   * Spanish's words for the built-in types' members:  `el largo de la lista`, `el año de la fecha`.
   * - A list's `name` is `nombre`:  `el nombre de la pila` reads and sets `pila.name`.
   */
  builtInMembers: {
    name: ["nombre"],
    length: ["largo", "longitud"],
    size: ["tamaño", "tamano"],
    characters: ["caracteres"],
    year: ["año", "ano"],
    day: ["día", "dia"]
  },

  /** How a file's raw text declares things, found before it's parsed -- see `SP.DeclarationPatterns`. */
  declarations: {
    /**
     * A line declaring a type, its name captured:  `una carta es una cosa`, `un mazo es una lista de cartas`.
     * - Its groups, in order:
     *   1. a one-word name
     *   2. a name of several words, before `es un` / `es una` or `alias`,
     *      quoted too:  `una "carta de juego" es una cosa`
     *   3. `crear un tipo llamado ...`'s name
     *   4. a one-of-a-kind app's name, `solitario es una aplicación`
     */
    typeDeclaration:
      /^[ \t]*(?:-[ \t]+)?(?:un[oa]?[ \t]+["']?([\p{L}\p{M}\d_-]+)["']?[ \t]+es\b|un[oa]?[ \t]+["']?((?:(?!(?:es|alias)\b)[\p{L}\p{M}\d_-]+[ \t]+){1,3}(?!(?:es|alias)\b)[\p{L}\p{M}\d_-]+)["']?[ \t]+(?:es[ \t]+un[oa]?|alias)\b|crear[ \t]+un[ \t]+tipo[ \t]+(?:llamado|nombrado)[ \t]+([\p{L}\p{M}\d_-]+)|(?!(?:un[oa]?|el|la|los|las|su|sus)\b)((?:(?!es\b)[\p{L}\p{M}\d_-]+[ \t]+){0,3}(?!es\b)[\p{L}\p{M}\d_-]+)[ \t]+es[ \t]+una[ \t]+aplicaci[oó]n\b)/gimu,
    /** A line declaring a value kind, its PLURAL name captured:  `- "palos" como uno de ...`. */
    valueKindDeclaration:
      /^[ \t]*(?:-[ \t]+)?["']([\p{L}\p{M}\d_-]+)["'][ \t]+como[ \t]+(?:uno[ \t]+de|o[ \t]+bien)\b/gimu,
    /**
     * A body's line declaring a property with a list of values, its words captured (group 1, or 2 after `tiene`):
     * `- su "palo" es uno de ...`, `- "palo" es o bien ...`, `- tiene un palo como uno de ...`.
     * - Not a value kind's `- "palos" como uno de ...`:  `como` only after `tiene`.
     */
    propertyListDeclaration:
      /^[ \t]+-[ \t]+(?:(?:sus?[ \t]+)?["']?((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]+(?:es|son)|tiene[ \t]+(?:un[oa]?[ \t]+)?["']?((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]+como)[ \t]+(?:un[oa][ \t]+de|o[ \t]+bien)\b/iu,
    /**
     * A line starting a method:  `para mover una carta`, `animación repartir`.
     * - Not a loop, which starts `para cada` too:  `para cada carta en el mazo:`.
     */
    methodLine: /^(?:para(?![ \t]+cada\b)|(?:crear[ \t]+)?animaci[oó]n)[ \t]/iu,
    /** A line re-opening a type, its name captured:  `una carta:`, `un solitario donde:`. */
    reopenedType: /^un[oa]?[ \t]+([\p{L}\p{M}\d_-]+(?:[ \t]+[\p{L}\p{M}\d_-]+){0,3})[ \t]*(?:donde[ \t]*)?:[ \t]*$/iu
  }
}

/** Every way a person may WRITE a built-in type in Spanish, lowercased and singular => its datatype. */
export const spanishTypeWords: P.TypeWords = {
  texto: "text",
  cadena: "text",
  número: "number",
  numero: "number",
  fracción: "number",
  fraccion: "number",
  decimal: "number",
  entero: "integer",
  carácter: "character",
  caracter: "character",
  opción: "choice",
  opcion: "choice",
  booleano: "choice",
  "sí o no": "choice",
  "si o no": "choice",
  "verdadero o falso": "choice",
  fecha: "date",
  lista: "list",
  arreglo: "list",
  cosa: "thing",
  aplicación: "app",
  aplicacion: "app",
  dibujable: "drawable",
  "cosa dibujable": "drawable",
  "cosa-dibujable": "drawable",
  "lista dibujable": "drawable list",
  "lista-dibujable": "drawable list",
  nada: "nothing",
  indefinido: "nothing",
  nulo: "nothing"
}
