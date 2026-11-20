import { describe, expect, test } from "vite-plus/test"

import { runSpellFiles } from "spell/parser/spell/test"

/**
 * A `where` over a text's characters looks through its characters:  `core.filter()` of the text itself threw as it
 * ran (`itemsToFilterAST()`).
 */
describe("a text's characters, where ...", () => {
  test("counted, kept and picked by a `where`", () => {
    const run = runSpellFiles([
      {
        path: "/Test.spell",
        contents: [
          'set path to "a.b.c"',
          'set dots to the number of items in the characters of path where it is "."',
          'set counted to the number of characters in path where it is "."',
          'set kept to the characters of path where it is not "."',
          'set first to the first character in path where it is not "a"'
        ].join("\n")
      }
    ])
    const { dots, counted, kept, first } = run("dots, counted, kept, first") as Record<string, unknown>
    expect({ dots, counted, first }).toEqual({ dots: 2, counted: 2, first: "." })
    expect([...(kept as Iterable<string>)]).toEqual(["a", "b", "c"])
  })
})
