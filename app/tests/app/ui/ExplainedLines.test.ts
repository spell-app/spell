import { describe, expect, test } from "vite-plus/test"

import { wordsForLine } from "spell/app/app/ui/ExplainedLines"

/** The editor's own words for a line of code, for Explain This (epic `editor` P32, Q40). */
describe("wordsForLine()", () => {
  const VARIABLE = "variable **card**: Card · argument\n\ndeclared in [Pile.spell:19](spell:/x/Pile.spell#L19)"
  const BUILT_IN =
    "built in:  **add (a thing) to (a list)** of list\n\nAdd `thing` to the end -- or wherever you say:\n- `add the card to the deck`\n\nMore."

  test("a comment line has none:  it's words already", () => {
    expect(wordsForLine("	// How its cards lie:  on top of each other", [BUILT_IN])).toBeUndefined()
    expect(wordsForLine("-- A pile of cards", [null])).toBeUndefined()
  })

  test("how the line reads first, then what a built-in step does;  a variable's card left out", () => {
    const readsAs = "**Reads as**  `a card belongs to one pile`\n\n---\n\n" + VARIABLE
    expect(wordsForLine("add it to the pile", [BUILT_IN, VARIABLE, readsAs])).toBe(
      "**Reads as**  `a card belongs to one pile`\n\n" +
        "built in:  **add (a thing) to (a list)** of list\n\nAdd `thing` to the end -- or wherever you say:\n- `add the card to the deck`"
    )
  })

  test("only a variable's card:  it, without its link", () => {
    expect(wordsForLine("move the card to the pile", [null, VARIABLE])).toBe("variable **card**: Card · argument")
  })

  test("nothing said of it:  no words", () => {
    expect(wordsForLine("set x to 3", [null, null])).toBeUndefined()
  })
})
