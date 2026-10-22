/**
 * The `types` rules in English:  each rule's syntax and its tests, registered on the `types` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `types.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-lang/parser"

import { types } from "./types.parser"
import { KnownType } from "./KnownType"
import { PluralType } from "./PluralType"
import { QuotedType } from "./QuotedType"
import { SingularType } from "./SingularType"
import { SubjectImplied } from "./SubjectImplied"
import { SubjectIt } from "./SubjectIt"
import { SubjectIts } from "./SubjectIts"
import { Type } from "./Type"
import { TypeWords } from "./TypeWords"

types.addRule(Type, {
  tests: [
    {
      tests: [
        { title: "lower case", input: "thing", js: "Thing" },
        { title: "upper case", input: "Thing", js: "Thing" },
        { title: "multi-word, lower case", input: "bank-account", js: "BankAccount" },
        { title: "multi-word, mixed case", input: "Bank-account", js: "BankAccount" },
        { title: "multi-word, upper case", input: "Bank-Account", js: "BankAccount" },
        { title: "blacklisted word", input: "if", js: undefined }
      ]
    }
  ]
})

types.addRule(SingularType, {
  tests: [
    {
      tests: [
        { title: "singular, lower case", input: "thing", js: "Thing" },
        { title: "singular, upper case", input: "Thing", js: "Thing" },
        { title: "singular, multi-word, lower case", input: "bank-account", js: "BankAccount" },
        { title: "singular, multi-word, mixed case", input: "Bank-account", js: "BankAccount" },

        { title: "plural, lower case", input: "things", js: undefined },
        { title: "plural, upper case", input: "Things", js: undefined },
        { title: "plural, multi-word, lower case", input: "bank-accounts", js: undefined },
        { title: "plural, multi-word, mixed case", input: "Bank-accounts", js: undefined }
      ]
    }
  ]
})

types.addRule(PluralType, {
  tests: [
    {
      tests: [
        { title: "plural, lower case", input: "things", js: "Thing" },
        { title: "plural, upper case", input: "Things", js: "Thing" },
        { title: "plural, multi-word, lower case", input: "bank-accounts", js: "BankAccount" },
        { title: "plural, multi-word, mixed case", input: "Bank-accounts", js: "BankAccount" },

        { title: "singular, lower case", input: "thing", js: undefined },
        { title: "singular, upper case", input: "Thing", js: undefined },
        { title: "singular, multi-word, lower case", input: "bank-account", js: undefined },
        { title: "singular, multi-word, mixed case", input: "Bank-account", js: undefined }
      ]
    }
  ]
})

types.addRule(QuotedType, {
  tests: [
    {
      tests: [
        { title: "a quoted word", input: '"card"', js: "Card" },
        { title: "dashed", input: '"bank-account"', js: "BankAccount" },
        { title: "two words", input: '"playing card"', js: "PlayingCard" },
        { title: "a blacklisted word inside (epic `spanish` P14)", input: '"card in play"', js: "CardInPlay" },
        { title: "a blacklisted word last", input: '"card in"', js: undefined },
        { title: "blacklisted word", input: '"if"', js: undefined }
      ]
    }
  ]
})

// The subject words:  `it` and `its` start an outline body's line, `- it has a deck`, `- its "suit" is ...`
types.addRule(SubjectIt, { syntax: "it/i" })

types.addRule(SubjectIts, { syntax: "its/i" })

types.addRule(SubjectImplied)

types.addRule(KnownType, {
  tests: [
    {
      beforeEach(scope: P.Scope) {
        // `Scope.types` is typed narrowly (`ScopeList<TypeScope>`):
        // the concrete `RootScope` accepts plain `TypeScopeProps` too
        const { types } = scope as P.RootScope
        types.add({ name: "Thing" })
        types.add({ name: "Bank-Account", aka: "account" })
      },
      tests: [
        { title: "singular, known type, lower case", input: "thing", js: "Thing" },
        { title: "singular, known type, upper case", input: "Thing", js: "Thing" },
        { title: "singular, known, multi-word, lower case", input: "bank-account", js: "BankAccount" },
        { title: "singular, known, multi-word, mixed case", input: "Bank-account", js: "BankAccount" },
        { title: "singular, known, multi-word, upper case", input: "Bank-Account", js: "BankAccount" },
        { title: "plural, known type, lower case", input: "thing", js: "Thing" },
        { title: "plural, known type, upper case", input: "Thing", js: "Thing" },
        { title: "plural, known, multi-word, lower case", input: "bank-accounts", js: "BankAccount" },
        { title: "plural, known, multi-word, mixed case", input: "Bank-accounts", js: "BankAccount" },
        { title: "plural, known, multi-word, upper case", input: "Bank-Accounts", js: "BankAccount" },
        { title: "multi-word, declared", input: "bank account", js: "BankAccount" },
        { title: "multi-word, declared, plural", input: "bank accounts", js: "BankAccount" },
        { title: "short name", input: "account", js: "BankAccount" },
        { title: "short name, plural", input: "Accounts", js: "BankAccount" },
        { title: "words nobody declared", input: "savings account", js: undefined },
        { title: "unknown", input: "widget", js: undefined },
        { title: "unknown. multi-word", input: "other-thing", js: undefined }
      ]
    }
  ]
})

types.addRule(TypeWords, {
  tests: [
    {
      tests: [
        { title: "one word", input: "card", js: "Card" },
        { title: "two words", input: "bank account", js: "BankAccount" },
        { title: "dashed", input: "bank-account", js: "BankAccount" },
        { title: "plural", input: "bank accounts", js: "BankAccount" },
        { title: "up to a blacklisted word", input: "bank account is", js: "BankAccount" },
        { title: "up to aka", input: "bank account aka account", js: "BankAccount" },
        {
          title: "a blacklisted word inside, up to is (epic `spanish` P14)",
          input: "card in play is",
          js: "CardInPlay"
        },
        { title: "blacklisted words inside, up to aka", input: "box of the year aka box", js: "BoxOfTheYear" },
        { title: "a blacklisted word, not up to is", input: "card in play", js: "Card" },
        { title: "a blacklisted word last", input: "card in is", js: "Card" },
        { title: "a blacklisted word", input: "is", js: undefined }
      ]
    }
  ]
})
