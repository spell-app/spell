/**
 * The `statements` rules in English:  each rule's syntax and its tests, registered on the `statements` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `statements.<lang>.ts` (epic `spanish`).
 */
import { statements } from "./statements.parser"
import { DoNothing } from "./DoNothing"

statements.addRule(DoNothing, {
  syntax: "do nothing",
  tests: [
    {
      compileAs: "statement",
      tests: [[`do nothing"`, `core.doNothing()`]]
    }
  ]
})
