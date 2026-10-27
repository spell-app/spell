/**
 * The `tests` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `tests` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `tests.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 *   - Except the text of what's checked, which `core.expect()` reports as written:  `el rank de it`.
 * - A keyword with a written accent is accepted without it too:  `(debería|deberia)`.
 */
import { P } from "spell/parser/parser"
import { SpellParser } from "spell/parser/spell/SpellParser"

import { Echo } from "./Echo"
import { EndTest } from "./EndTest"
import { ExpectTest } from "./ExpectTest"
import { StartTest } from "./StartTest"

/** Spanish's `tests` rules. */
export const testsEs = new SpellParser({ module: "tests" })

/** The thing and list every `expect` test checks. */
function makeTestThings(scope: P.Scope) {
  scope.compile(`it = una nueva thing con rank = "queen", is-face-up = sí`, "block")
  scope.compile("my-list es una nueva lista", "block")
}

// `que` is required:  a bare `esperar ...` is `async`'s wait
testsEs.addRule(ExpectTest, {
  syntax: "esperar que {expression} (sea (value:{expression}|{constant}))?",
  tests: [
    {
      beforeEach: makeTestThings,
      tests: [
        ['esperar que el rank de it sea "queen"', 'core.expect(it.rank, `el rank de it`, "queen", `"queen"`)'],
        ["esperar que el is-face-up de it sea sí", "core.expect(it.isFaceUp, `el is-face-up de it`, true, `sí`)"],
        ["esperar que el is-face-up de it", "core.expect(it.isFaceUp, `el is-face-up de it`)"],
        [
          "esperar que el número de items en my-list sea 0",
          "core.expect(core.itemCountOf(myList), `el número de items en my-list`, 0, `0`)"
        ],
        ["esperar que it es una cosa", 'core.expect(core.isOfType(it, "Thing"), `it es una cosa`)'],
        ["esperar que su rank sea queen", 'core.expect(it.rank, `su rank`, "queen", `queen`)']
      ]
    }
  ]
})

testsEs.addRule(ExpectTest, {
  syntax: "{expression} (debería|deberia) ser (value:{expression}|{constant})",
  tests: [
    {
      beforeEach: makeTestThings,
      tests: [
        ["su rank debería ser queen", 'core.expect(it.rank, `su rank`, "queen", `queen`)'],
        ['el rank de it deberia ser "queen"', 'core.expect(it.rank, `el rank de it`, "queen", `"queen"`)'],
        [
          "el número de items en my-list debería ser 0",
          "core.expect(core.itemCountOf(myList), `el número de items en my-list`, 0, `0`)"
        ]
      ]
    }
  ]
})

testsEs.addRule(StartTest, {
  syntax: "(iniciar|empezar) (la)? prueba (quiet:silenciosa)? {message:text}"
})

testsEs.addRule(EndTest, {
  syntax: "(terminar|finalizar) (la)? prueba"
})

testsEs.addRule(Echo, {
  syntax: "eco {expression}",
  tests: [
    {
      tests: [
        [`eco 1`, `core.echo(1)`],
        [`eco "foo"`, `core.echo("foo")`],
        ["eco el rank de una nueva cosa", "core.echo((new Thing()).rank)"]
      ]
    }
  ]
})
