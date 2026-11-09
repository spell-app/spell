import { describe, expect, test } from "vite-plus/test"

import { P, Parser, Tokenizer, WhitespacePolicy } from "spell/parser/parser"
// These tests define rules with rulex `syntax`, so they must opt into the rulex parser.
import "spell/parser/parser/rulex"

const { tokenize } = new Tokenizer({ whitespacePolicy: WhitespacePolicy.NONE })

/** A choice long enough to look its rules up by first word, of `syntaxes`, and fillers nothing here matches. */
function longChoice(...syntaxes: string[]): P.Choice {
  const fillers = Array.from({ length: 20 }, (_, index) => new P.Sequence({ syntax: `filler${index} word` }))
  return new P.Choice({ rules: [...syntaxes.map((syntax) => new P.Sequence({ syntax })), ...fillers] })
}

/** Which of `choice`'s rules are tried for the first token of `text`, by their syntax. */
function triedFor(choice: P.Choice, text: string): string[] {
  return choice["rulesFor"](tokenize(text)[0]!).map((rule) => rule.toRulexSyntax())
}

/** A scope to parse in. */
const scope = () => new Parser().getScope("test")

describe("a long `P.Choice` looks its rules up by first word", () => {
  test("tries only the rules that can start with that word, and those that can start with anything", () => {
    const choice = longChoice("the red", "the? blue", "a green")
    expect(triedFor(choice, "the red")).toEqual(["the red", "the? blue"])
    expect(triedFor(choice, "a green")).toEqual(["the? blue", "a green"])
    expect(triedFor(choice, "nothing")).toEqual(["the? blue"])
  })

  test("a rule of several first words is found by each;  each list keeps the rules' order", () => {
    const choice = longChoice("(this|that) one", "any? one", "that other")
    expect(triedFor(choice, "this")).toEqual(["(this|that) one", "any? one"])
    expect(triedFor(choice, "that")).toEqual(["(this|that) one", "any? one", "that other"])
  })

  test("a word compared ignoring case, or a rule with its own `test()`, is always tried", () => {
    class OwnTest extends P.Sequence {
      test() {
        return true
      }
    }
    const ownTest = new OwnTest({ syntax: "own word" })
    const choice = longChoice("the/i red")
    choice.addChoice(undefined as unknown as P.Parser, ownTest)
    expect(triedFor(choice, "THE")).toEqual(["the/i red", ownTest.toRulexSyntax()])
  })

  test("a rule added afterward is looked up too", () => {
    const choice = longChoice("the red")
    expect(triedFor(choice, "blue")).toEqual([])
    choice.addChoice(undefined as unknown as P.Parser, new P.Sequence({ syntax: "blue sky" }))
    expect(triedFor(choice, "blue")).toEqual(["blue sky"])
  })

  test("parses what trying every rule parses, the same one winning a tie", () => {
    const choice = longChoice("red sky", "red (sky)", "blue sky")
    const match = choice.parse(scope(), tokenize("red sky"))
    expect(match?.rule).toBe(choice.rules[0])
    expect(choice.parse(scope(), tokenize("green sky"))).toBeUndefined()
  })

  test("a short choice just tries each", () => {
    const choice = new P.Choice({ rules: [new P.Sequence({ syntax: "red sky" }), new P.Sequence({ syntax: "blue sky" })] })
    expect(choice["rulesFor"](tokenize("green")[0]!)).toBe(choice.rules)
  })
})
