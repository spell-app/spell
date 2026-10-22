/**
 * The `draw` rules in English:  each rule's syntax and its tests, registered on the `draw` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `draw.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-lang/parser"

import { draw } from "./draw.parser"
import { DrawItems } from "./DrawItems"
import { DrawThing } from "./DrawThing"
import { StartApp } from "./StartApp"

draw.addRule(DrawThing, {
  syntax: "draw {expression}"
})

draw.addRule(DrawItems, {
  syntax: "draw (each {variable}|(the|all)? {plural_identifier}) (of|in) {expression}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
      },
      tests: [
        {
          input: "draw each card in the deck",
          js: "core.drawItems(deck)",
          ts: "<For each={deck.items}>{(item) => item.draw()}</For>"
        },
        {
          input: "draw cards of the deck",
          js: "core.drawItems(deck)",
          ts: "<For each={deck.items}>{(item) => item.draw()}</For>"
        },
        {
          input: "draw the cards of the deck",
          js: "core.drawItems(deck)",
          ts: "<For each={deck.items}>{(item) => item.draw()}</For>"
        },
        {
          input: "draw all cards of the deck",
          js: "core.drawItems(deck)",
          ts: "<For each={deck.items}>{(item) => item.draw()}</For>"
        }
      ]
    }
  ]
})

draw.addRule(StartApp, {
  syntax: "start {app:expression}"
})
