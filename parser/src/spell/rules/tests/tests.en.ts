/**
 * The `tests` rules in English:  each rule's syntax and its tests, registered on the `tests` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `tests.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-lang/parser"

import { tests } from "./tests.parser"
import { Echo } from "./Echo"
import { EndTest } from "./EndTest"
import { ExpectTest } from "./ExpectTest"
import { StartTest } from "./StartTest"

tests.addRule(ExpectTest, {
  syntax: "expect that? {expression} (to be (value:{expression}|{constant}))?",
  tests: [
    {
      beforeEach(scope: P.Scope) {
        // `Scope.compile()`'s `ruleName` has no default,
        // though the `Parser.compile()` it calls defaults it to `"block"`:  so it's passed here
        scope.compile(`it = a new thing with rank = "queen", is-face-up = yes`, "block")
        scope.compile("my-list is a new list", "block")
      },
      tests: [
        ['expect the rank of it to be "queen"', 'core.expect(it.rank, `the rank of it`, "queen", `"queen"`)'],
        ["expect the is-face-up of it to be yes", "core.expect(it.isFaceUp, `the is-face-up of it`, true, `yes`)"],
        ["expect the is-face-up of it", "core.expect(it.isFaceUp, `the is-face-up of it`)"],
        [
          "expect the number of items in my-list to be 0",
          "core.expect(core.itemCountOf(myList), `the number of items in my-list`, 0, `0`)"
        ],
        ["expect that it is a thing", 'core.expect(core.isOfType(it, "Thing"), `it is a thing`)'],
        ["expect its rank to be queen", 'core.expect(it.rank, `its rank`, "queen", `queen`)']
      ]
    }
  ]
})

tests.addRule(ExpectTest, {
  syntax: "{expression} should be (value:{expression}|{constant})",
  tests: [
    {
      beforeEach(scope: P.Scope) {
        // `Scope.compile()`'s `ruleName` has no default,
        // though the `Parser.compile()` it calls defaults it to `"block"`:  so it's passed here
        scope.compile(`it = a new thing with rank = "queen", is-face-up = yes`, "block")
        scope.compile("my-list is a new list", "block")
      },
      tests: [
        ["its rank should be queen", 'core.expect(it.rank, `its rank`, "queen", `queen`)'],
        ['the rank of it should be "queen"', 'core.expect(it.rank, `the rank of it`, "queen", `"queen"`)'],
        [
          "the number of items in my-list should be 0",
          "core.expect(core.itemCountOf(myList), `the number of items in my-list`, 0, `0`)"
        ]
      ]
    }
  ]
})

tests.addRule(StartTest, {
  syntax: "start (quiet:quiet)? test {message:text}"
})

tests.addRule(EndTest, {
  syntax: "end test"
})

tests.addRule(Echo, {
  syntax: "echo {expression}",
  tests: [
    {
      tests: [
        [`echo 1`, `core.echo(1)`],
        [`echo "foo"`, `core.echo("foo")`],
        ["echo the rank of a new thing", "core.echo((new Thing()).rank)"]
      ]
    }
  ]
})
