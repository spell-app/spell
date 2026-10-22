/**
 * The `draw` rules in Spanish:  each rule's syntax and its tests, registered on Spanish's own `draw` parser
 * (epic `spanish`).
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `draw.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"

import { DrawItems } from "./DrawItems"
import { DrawThing } from "./DrawThing"
import { StartApp } from "./StartApp"

/** Spanish's `draw` rules. */
export const drawEs = new SpellParser({ module: "draw" })

drawEs.addRule(DrawThing, {
  syntax: "dibujar {expression}"
})

drawEs.addRule(DrawItems, {
  syntax:
    "dibujar (cada {variable}|((todos|todas) (los|las)?|el|la|los|las)? {plural_identifier}) (de|del|en) {expression}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
      },
      tests: [
        {
          input: "dibujar cada carta en el deck",
          js: "core.drawItems(deck)",
          ts: "<For each={deck.items}>{(item) => item.draw()}</For>"
        },
        {
          input: "dibujar cartas de el deck",
          js: "core.drawItems(deck)",
          ts: "<For each={deck.items}>{(item) => item.draw()}</For>"
        },
        {
          input: "dibujar las cartas del deck",
          js: "core.drawItems(deck)",
          ts: "<For each={deck.items}>{(item) => item.draw()}</For>"
        },
        {
          input: "dibujar todas las cartas del deck",
          js: "core.drawItems(deck)",
          ts: "<For each={deck.items}>{(item) => item.draw()}</For>"
        },
        {
          input: "dibujar todos los naipes en el deck",
          js: "core.drawItems(deck)",
          ts: "<For each={deck.items}>{(item) => item.draw()}</For>"
        }
      ]
    }
  ]
})

drawEs.addRule(StartApp, {
  syntax: "iniciar {app:expression}"
})
