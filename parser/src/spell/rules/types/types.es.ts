/**
 * The `types` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `types` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `types.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 *   - Except where a test is about singular and plural:  there the names are Spanish (`carta`, `cartas`),
 *     so Spanish's inflector can tell them apart, and the type's name follows (`Carta`).
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"

import { KnownType } from "./KnownType"
import { PluralType } from "./PluralType"
import { QuotedType } from "./QuotedType"
import { SingularType } from "./SingularType"
import { SubjectImplied } from "./SubjectImplied"
import { SubjectIt } from "./SubjectIt"
import { SubjectIts } from "./SubjectIts"
import { Type } from "./Type"
import { TypeWords } from "./TypeWords"

/** Spanish's `types` rules. */
export const typesEs = new SpellParser({ module: "types" })

typesEs.addRule(Type, {
  tests: [
    {
      tests: [
        { title: "minúsculas", input: "thing", js: "Thing" },
        { title: "mayúsculas", input: "Thing", js: "Thing" },
        { title: "varias palabras, minúsculas", input: "bank-account", js: "BankAccount" },
        { title: "varias palabras, mezcladas", input: "Bank-account", js: "BankAccount" },
        { title: "varias palabras, mayúsculas", input: "Bank-Account", js: "BankAccount" },
        { title: "con acento", input: "corazón", js: "Corazón" },
        { title: "palabra prohibida", input: "si", js: undefined }
      ]
    }
  ]
})

typesEs.addRule(SingularType, {
  tests: [
    {
      tests: [
        { title: "singular, minúsculas", input: "carta", js: "Carta" },
        { title: "singular, mayúsculas", input: "Carta", js: "Carta" },
        { title: "singular, varias palabras, minúsculas", input: "cuenta-bancaria", js: "CuentaBancaria" },
        { title: "singular, varias palabras, mezcladas", input: "Cuenta-bancaria", js: "CuentaBancaria" },

        { title: "plural, minúsculas", input: "cartas", js: undefined },
        { title: "plural, mayúsculas", input: "Cartas", js: undefined },
        { title: "plural, varias palabras, minúsculas", input: "cuentas-bancarias", js: undefined },
        { title: "plural, varias palabras, mezcladas", input: "Cuentas-bancarias", js: undefined }
      ]
    }
  ]
})

typesEs.addRule(PluralType, {
  tests: [
    {
      tests: [
        { title: "plural, minúsculas", input: "cartas", js: "Carta" },
        { title: "plural, mayúsculas", input: "Cartas", js: "Carta" },
        { title: "plural, con acento que se va", input: "corazones", js: "Corazón" },
        // every word of a name goes plural in Spanish, the adjective too:  `cuentas-bancarias`
        { title: "plural, varias palabras, minúsculas", input: "cuentas-bancarias", js: "CuentaBancaria" },
        { title: "plural, varias palabras, mezcladas", input: "Cuentas-bancarias", js: "CuentaBancaria" },

        { title: "singular, minúsculas", input: "carta", js: undefined },
        { title: "singular, mayúsculas", input: "Carta", js: undefined },
        { title: "singular, varias palabras, minúsculas", input: "cuenta-bancaria", js: undefined },
        { title: "singular, varias palabras, mezcladas", input: "Cuenta-bancaria", js: undefined }
      ]
    }
  ]
})

typesEs.addRule(QuotedType, {
  tests: [
    {
      tests: [
        { title: "una palabra entre comillas", input: '"card"', js: "Card" },
        { title: "con guiones", input: '"bank-account"', js: "BankAccount" },
        { title: "dos palabras", input: '"carta bonita"', js: "CartaBonita" },
        { title: "una palabra prohibida dentro (épica `spanish` P14)", input: '"carta de juego"', js: "CartaDeJuego" },
        { title: "una palabra prohibida al final", input: '"carta de"', js: undefined },
        { title: "palabra prohibida", input: '"si"', js: undefined }
      ]
    }
  ]
})

// The subject words:  Spanish leaves `it` out (`subject_implied`), `- tiene un mazo`;  `its` is `su` / `sus`,
// `- su "palo" es ...`.
// `subject_it` is registered with no word, so it matches nothing:  rules naming `{subject_it}` still compile
// packs: ok -- Spanish leaves `it` out:  no word
typesEs.addRule(SubjectIt)

typesEs.addRule(SubjectIts, { syntax: "(su|sus)/i" })

typesEs.addRule(SubjectImplied)

typesEs.addRule(KnownType, {
  tests: [
    {
      beforeEach(scope: P.Scope) {
        // `Scope.types` is typed narrowly (`ScopeList<TypeScope>`):
        // the concrete `RootScope` accepts plain `TypeScopeProps` too
        const { types } = scope as P.RootScope
        types.add({ name: "Carta" })
        types.add({ name: "Cuenta-Bancaria", aka: "cuenta" })
      },
      tests: [
        { title: "singular, tipo conocido, minúsculas", input: "carta", js: "Carta" },
        { title: "singular, tipo conocido, mayúsculas", input: "Carta", js: "Carta" },
        { title: "singular, conocido, varias palabras, minúsculas", input: "cuenta-bancaria", js: "CuentaBancaria" },
        { title: "singular, conocido, varias palabras, mezcladas", input: "Cuenta-bancaria", js: "CuentaBancaria" },
        { title: "singular, conocido, varias palabras, mayúsculas", input: "Cuenta-Bancaria", js: "CuentaBancaria" },
        { title: "plural, tipo conocido, minúsculas", input: "cartas", js: "Carta" },
        { title: "plural, tipo conocido, mayúsculas", input: "Cartas", js: "Carta" },
        { title: "plural, conocido, varias palabras, minúsculas", input: "cuentas-bancarias", js: "CuentaBancaria" },
        { title: "plural, conocido, varias palabras, mezcladas", input: "Cuentas-bancarias", js: "CuentaBancaria" },
        { title: "varias palabras, declarado", input: "cuenta bancaria", js: "CuentaBancaria" },
        { title: "varias palabras, declarado, plural", input: "cuentas bancarias", js: "CuentaBancaria" },
        { title: "nombre corto", input: "cuenta", js: "CuentaBancaria" },
        { title: "nombre corto, plural", input: "Cuentas", js: "CuentaBancaria" },
        { title: "palabras que nadie declaró", input: "caja fuerte", js: undefined },
        { title: "desconocido", input: "widget", js: undefined },
        { title: "desconocido, varias palabras", input: "otra-carta", js: undefined }
      ]
    }
  ]
})

typesEs.addRule(TypeWords, {
  tests: [
    {
      tests: [
        { title: "una palabra", input: "carta", js: "Carta" },
        { title: "dos palabras", input: "cuenta bancaria", js: "CuentaBancaria" },
        { title: "con guiones", input: "cuenta-bancaria", js: "CuentaBancaria" },
        { title: "plural", input: "cartas", js: "Carta" },
        { title: "plural, varias palabras", input: "cuentas bancarias", js: "CuentaBancaria" },
        { title: "hasta una palabra prohibida", input: "cuenta bancaria es", js: "CuentaBancaria" },
        { title: "hasta alias", input: "cuenta bancaria alias cuenta", js: "CuentaBancaria" },
        {
          title: "una palabra prohibida dentro, hasta es (épica `spanish` P14)",
          input: "carta de juego es",
          js: "CartaDeJuego"
        },
        {
          title: "palabras prohibidas dentro, hasta alias",
          input: "cuenta de ahorro alias cuenta",
          js: "CuentaDeAhorro"
        },
        { title: "una palabra prohibida, no hasta es", input: "carta de juego", js: "Carta" },
        { title: "una palabra prohibida", input: "es", js: undefined }
      ]
    }
  ]
})
