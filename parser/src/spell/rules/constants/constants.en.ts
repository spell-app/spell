/**
 * The `constants` rules in English:  each rule's syntax and its tests, registered on the `constants` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `constants.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell/parser/parser"

import { constants } from "./constants.parser"
import { Constant } from "./Constant"
import { KnownConstant } from "./KnownConstant"

constants.addRule(Constant, {
  tests: [
    {
      tests: [
        { title: "single word", input: "red", js: '"red"' },
        { title: "multi-word", input: "orangish-red", js: '"orangish-red"' },
        { title: "blacklisted word", input: "if", js: undefined }
      ]
    }
  ]
})

constants.addRule(KnownConstant, {
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
        { title: "known constant", input: "red", js: '"red"' },
        // its value is spell's, so each writer quotes it (epic `python-target` P3)
        { title: "known constant w/specific value", input: "green", js: '"#00FF00"' },
        { title: "unknown constant", input: "missing", js: undefined }
      ]
    }
  ]
})
