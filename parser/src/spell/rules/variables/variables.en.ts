/**
 * The `variables` rules in English:  each rule's syntax and its tests, registered on the `variables` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `variables.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell/parser/parser"

import { variables } from "./variables.parser"
import { VARIABLE_SYNTAX } from "./variables.shared"
import { Identifier } from "./Identifier"
import { KnownVariable } from "./KnownVariable"
import { ImpliedIt } from "./ImpliedIt"
import { KnownWordsVariable } from "./KnownWordsVariable"
import { PluralIdentifier } from "./PluralIdentifier"
import { SingularIdentifier } from "./SingularIdentifier"
import { Variable } from "./Variable"
import { WordsIdentifier } from "./WordsIdentifier"
import { WordsVariable } from "./WordsVariable"

variables.addRule(Identifier)

variables.addRule(SingularIdentifier, {
  tests: [
    {
      tests: [
        { title: "singular, single word", input: "thing", js: "thing" },
        { title: "singular, multi-word", input: "bank-account", js: "bankAccount" },
        { title: "uncountable, matches as singular too", input: "sheep", js: "sheep" },
        { title: "plural, single word", input: "things", js: undefined },
        { title: "plural, multi-word", input: "bank-accounts", js: undefined }
      ]
    }
  ]
})

variables.addRule(PluralIdentifier, {
  tests: [
    {
      tests: [
        { title: "uncountable, matches as plural too", input: "sheep", js: "sheep" },
        { title: "plural, single word", input: "things", js: "things" },
        { title: "plural, multi-word", input: "bank-accounts", js: "bankAccounts" },
        { title: "singular, single word", input: "thing", js: undefined },
        { title: "singular, multi-word", input: "bank-account", js: undefined }
      ]
    }
  ]
})

variables.addRule(Variable, {
  syntax: VARIABLE_SYNTAX,
  tests: [
    {
      tests: [
        { title: "single word", input: "thing", js: "thing" },
        { title: "single word with the", input: "the thing", js: "thing" },
        { title: "multi-word", input: "bank-account", js: "bankAccount" },
        { title: "multi-word with the", input: "the bank-account", js: "bankAccount" },
        { title: "blacklisted word", input: "if", js: undefined }
      ]
    }
  ]
})

variables.addRule(KnownVariable, {
  syntax: VARIABLE_SYNTAX,
  tests: [
    {
      compileAs: "known_variable", // TODO: "expression"
      beforeEach(scope: P.Scope) {
        // `Scope.variables` is typed narrowly (`ScopeList<ScopeVariable>`);
        // the concrete `BlockScope` accepts a plain name string too
        const { variables } = scope as P.BlockScope
        variables.add("thing")
        variables.add("bank-account")
      },
      tests: [
        { title: "single word", input: "thing", js: "thing" },
        { title: "multi-word", input: "bank-account", js: "bankAccount" },
        { title: "not defined", input: "nothing", js: undefined }
      ]
    }
  ]
})

variables.addRule(WordsIdentifier, {
  tests: [
    {
      tests: [
        ["start pile", "startPile"],
        ["anything changed", "anythingChanged"],
        ["pile", undefined],
        ["name of", undefined]
      ]
    }
  ]
})

variables.addRule(WordsVariable, {
  syntax: "the? {identifier:words_identifier}",
  tests: [{ tests: [["the start pile", "startPile"]] }]
})

variables.addRule(KnownWordsVariable, {
  syntax: "the? {identifier:words_identifier}",
  tests: [
    {
      compileAs: "known_words_variable",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("start_pile")
      },
      tests: [
        ["start pile", "startPile"],
        ["the start pile", "startPile"],
        ["end pile", undefined]
      ]
    },
    {
      title: "a known name with a blacklisted word, read whole (epic `spanish` P14)",
      compileAs: "known_words_variable",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("way_to_go")
      },
      tests: [
        ["way to go", "wayToGo"],
        ["the way to go", "wayToGo"],
        ["way to stop", undefined]
      ]
    }
  ]
})

// `it` left out before `is`:  English writes its `it`, so with no words to come before, it never matches
variables.addRule(ImpliedIt)
