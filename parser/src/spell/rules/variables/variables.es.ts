/**
 * The `variables` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `variables` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `variables.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 *   - Its names are Spanish (`carta`, `cartas`), so Spanish's inflector can tell singular from plural;
 *     the compiled names follow them.
 */
import { P } from "spell-parser/parser"
import { SpellParser } from "spell-parser/spell/SpellParser"

import { Identifier } from "./Identifier"
import { KnownVariable } from "./KnownVariable"
import { ImpliedIt } from "./ImpliedIt"
import { KnownWordsVariable } from "./KnownWordsVariable"
import { PluralIdentifier } from "./PluralIdentifier"
import { SingularIdentifier } from "./SingularIdentifier"
import { Variable } from "./Variable"
import { WordsIdentifier } from "./WordsIdentifier"
import { WordsVariable } from "./WordsVariable"

/** Spanish's `variables` rules. */
export const variablesEs = new SpellParser({ module: "variables" })

/** Syntax shared by `variable` and `known_variable`:  identifier with optional `el` / `la` ..., e.g. `la carta`. */
const VARIABLE_SYNTAX_ES = "(el|la|los|las)? {identifier}"

variablesEs.addRule(Identifier)

variablesEs.addRule(SingularIdentifier, {
  tests: [
    {
      tests: [
        { title: "singular, una palabra", input: "carta", js: "carta" },
        { title: "singular, varias palabras", input: "cuenta-bancaria", js: "cuentaBancaria" },
        { title: "incontable, también singular", input: "lunes", js: "lunes" },
        { title: "plural, una palabra", input: "cartas", js: undefined },
        { title: "plural, varias palabras", input: "cuentas-bancarias", js: undefined }
      ]
    }
  ]
})

variablesEs.addRule(PluralIdentifier, {
  tests: [
    {
      tests: [
        { title: "incontable, también plural", input: "lunes", js: "lunes" },
        { title: "plural, una palabra", input: "cartas", js: "cartas" },
        { title: "plural, varias palabras", input: "cuentas-bancarias", js: "cuentasBancarias" },
        { title: "singular, una palabra", input: "carta", js: undefined },
        { title: "singular, varias palabras", input: "cuenta-bancaria", js: undefined }
      ]
    }
  ]
})

variablesEs.addRule(Variable, {
  syntax: VARIABLE_SYNTAX_ES,
  tests: [
    {
      tests: [
        { title: "una palabra", input: "carta", js: "carta" },
        { title: "una palabra con la", input: "la carta", js: "carta" },
        { title: "una palabra con el", input: "el mazo", js: "mazo" },
        { title: "varias palabras", input: "cuenta-bancaria", js: "cuentaBancaria" },
        { title: "varias palabras con la", input: "la cuenta-bancaria", js: "cuentaBancaria" },
        { title: "con acento", input: "el corazón", js: "corazón" },
        { title: "palabra prohibida", input: "si", js: undefined }
      ]
    }
  ]
})

variablesEs.addRule(KnownVariable, {
  syntax: VARIABLE_SYNTAX_ES,
  tests: [
    {
      compileAs: "known_variable", // TODO: "expression"
      beforeEach(scope: P.Scope) {
        // `Scope.variables` is typed narrowly (`ScopeList<ScopeVariable>`);
        // the concrete `BlockScope` accepts a plain name string too
        const { variables } = scope as P.BlockScope
        variables.add("carta")
        variables.add("cuenta-bancaria")
      },
      tests: [
        { title: "una palabra", input: "carta", js: "carta" },
        { title: "varias palabras", input: "cuenta-bancaria", js: "cuentaBancaria" },
        { title: "no definida", input: "nada", js: undefined }
      ]
    }
  ]
})

variablesEs.addRule(WordsIdentifier, {
  tests: [
    {
      tests: [
        ["pila inicial", "pilaInicial"],
        ["algo cambiado", "algoCambiado"],
        ["pila", undefined],
        ["nombre de", undefined]
      ]
    }
  ]
})

variablesEs.addRule(WordsVariable, {
  syntax: "(el|la|los|las)? {identifier:words_identifier}",
  tests: [{ tests: [["la pila inicial", "pilaInicial"]] }]
})

variablesEs.addRule(KnownWordsVariable, {
  syntax: "(el|la|los|las)? {identifier:words_identifier}",
  tests: [
    {
      compileAs: "known_words_variable",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("pila_inicial")
      },
      tests: [
        ["pila inicial", "pilaInicial"],
        ["la pila inicial", "pilaInicial"],
        ["pila final", undefined]
      ]
    },
    {
      title: "un nombre conocido con una palabra prohibida, leído entero (épica `spanish` P14)",
      compileAs: "known_words_variable",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("carta_de_juego")
      },
      tests: [
        ["carta de juego", "cartaDeJuego"],
        ["la carta de juego", "cartaDeJuego"],
        ["carta de mazo", undefined]
      ]
    }
  ]
})

// `eso` left out before `es` / `está`, as Spanish leaves its subject out:  `si es un trébol` in a card's method
variablesEs.addRule(ImpliedIt, {
  syntax:
    "(es|está|esta|son|están|estan|puede|pueden|no es|no está|no esta|no son|no están|no estan|no puede|no pueden)",
  tests: [
    {
      title: "`eso`, dejado fuera ante `es`:  lo que `eso` sería",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("it")
      },
      tests: [
        ["está vacío", "core.isEmpty(it)"],
        ["no es 1", "(it !== 1)"],
        ["es 1 y no está vacío", "(it === 1 && !core.isEmpty(it))"],
        ["no", "false"],
        ["vacío", undefined],
        ["es", undefined]
      ]
    },
    {
      title: "sin `eso` que leer, nada",
      compileAs: "expression",
      tests: [["está vacío", undefined]]
    }
  ]
})
