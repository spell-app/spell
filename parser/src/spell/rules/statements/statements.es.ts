/**
 * The `statements` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `statements` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `statements.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 */
import { SpellParser } from "spell-parser/spell/SpellParser"

import { DoNothing } from "./DoNothing"

/** Spanish's `statements` rules. */
export const statementsEs = new SpellParser({ module: "statements" })

statementsEs.addRule(DoNothing, {
  syntax: "no hacer nada",
  tests: [
    {
      compileAs: "statement",
      tests: [[`no hacer nada`, `core.doNothing()`]]
    }
  ]
})
