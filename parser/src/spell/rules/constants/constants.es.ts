/**
 * The `constants` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `constants` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `constants.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"

import { Constant } from "./Constant"
import { KnownConstant } from "./KnownConstant"

/** Spanish's `constants` rules. */
export const constantsEs = new SpellParser({ module: "constants" })

constantsEs.addRule(Constant, {
  tests: [
    {
      tests: [
        { title: "una palabra", input: "red", js: '"red"' },
        { title: "varias palabras", input: "orangish-red", js: '"orangish-red"' },
        { title: "con acento", input: "corazón", js: '"corazón"' },
        { title: "palabra prohibida", input: "si", js: undefined }
      ]
    }
  ]
})

constantsEs.addRule(KnownConstant, {
  tests: [
    {
      compileAs: "known_constant", // TODO: to "expression"
      beforeEach(scope: P.Scope) {
        // `Scope.constants` is typed narrowly (`ScopeList<ScopeConstant>`);
        // the concrete `RootScope` accepts a plain name string or `ScopeConstantProps` too
        const { constants } = scope as P.RootScope
        constants.add("red")
        constants.add({ name: "green", value: "#00FF00" })
      },
      tests: [
        { title: "constante conocida", input: "red", js: '"red"' },
        // its value is spell's, so each writer quotes it (epic `python-target` P3)
        { title: "constante conocida con su propio valor", input: "green", js: '"#00FF00"' },
        { title: "constante desconocida", input: "missing", js: undefined }
      ]
    }
  ]
})
