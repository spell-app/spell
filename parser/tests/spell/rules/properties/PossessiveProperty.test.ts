import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/**
 * A possessive DECLARATION (epic `language` T24):  `a card's value is ...` declares just what
 * `the value of a card is ...` does -- the same program, the same declarations, the same warnings.
 * - Only where each was written differs:  a declaration's `defined` range, and the line's comment.
 * - A plural with no article, `cards' value is ...`, is one too, warning to write `a card's value` (T26).
 * - Reads (`the card's value`) are `NameMeanings.test.ts`'s table, and the rule tests in `properties.en.ts`.
 */

/** A card, for each declaration to give a value. */
const CARD = "a card is a thing:\n\t- it has a rank as a number\n\t- it has a suit as one of clubs, hearts\n"

/** Each possessive declaration, and the `of` form it means. */
const PAIRS: Array<{ title: string; possessive: string; of: string }> = [
  { title: "a value", possessive: "a card's value is its rank * 2", of: "the value of a card is its rank * 2" },
  {
    title: "a name of two words, and a body",
    possessive: "a card's short name is:\n\treturn its rank",
    of: "the short name of a card is:\n\treturn its rank"
  },
  {
    title: "a quoted name",
    possessive: 'a card\'s "short name" is its rank',
    of: 'the "short name" of a card is its rank'
  },
  {
    title: "red if ... otherwise",
    possessive: "a card's color is red if its suit is hearts otherwise it is black",
    of: "the color of a card is red if its suit is hearts otherwise it is black"
  },
  {
    title: "one of a list of its own",
    possessive: "a card's color is one of red, black:\n\tred if its suit is hearts\n\tblack otherwise",
    of: "the color of a card is one of red, black:\n\tred if its suit is hearts\n\tblack otherwise"
  },
  { title: "a curly apostrophe", possessive: "a card’s value is its rank", of: "the value of a card is its rank" },
  {
    title: "a type ending in s",
    possessive: "a boss is a thing\na boss' value is 3",
    of: "a boss is a thing\nthe value of a boss is 3"
  }
]

describe("a possessive declaration is the same as `the X of a Y is`", () => {
  for (const { title, possessive, of } of PAIRS) {
    test(title, () => {
      const mine = compiled(possessive)
      const theirs = compiled(of)
      expect(mine.errors).toEqual([])
      expect(mine.warnings).toEqual(theirs.warnings)
      expect(mine.program).toEqual(theirs.program)
    })
  }

  test("an apostrophe alone after no s is refused, saying how to write it", () => {
    expect(compiled("a card' value is its rank").errors).toEqual([
      '4:2 An apostrophe alone follows a word ending in "s", as in "the cards\' names":  write "a card\'s value"'
    ])
    expect(compiled("a card' color is red if its suit is hearts otherwise it is black").errors).toEqual([
      '4:2 An apostrophe alone follows a word ending in "s", as in "the cards\' names":  write "a card\'s color"'
    ])
  })
})

/** Each possessive declaration with a plural owner and no article (T26), and the `a card's` form it means. */
const PLURALS: Array<{ title: string; plural: string; one: string; property: string }> = [
  {
    title: "a value",
    plural: "cards' value is its rank * 2",
    one: "a card's value is its rank * 2",
    property: "value"
  },
  {
    title: "a value, a colon and a body",
    plural: "cards' value is:\n\treturn its rank",
    one: "a card's value is:\n\treturn its rank",
    property: "value"
  },
  {
    title: "red if ... otherwise",
    plural: "cards' color is red if its suit is hearts otherwise it is black",
    one: "a card's color is red if its suit is hearts otherwise it is black",
    property: "color"
  },
  {
    title: "one of a list of its own",
    plural: "cards' color is one of red, black:\n\tred if its suit is hearts\n\tblack otherwise",
    one: "a card's color is one of red, black:\n\tred if its suit is hearts\n\tblack otherwise",
    property: "color"
  },
  {
    title: "a quoted name",
    plural: 'cards\' "short name" is its rank',
    one: 'a card\'s "short name" is its rank',
    property: "short name"
  },
  {
    title: "a curly apostrophe",
    plural: "cards’ value is its rank",
    one: "a card's value is its rank",
    property: "value"
  }
]

describe("a plural owner with no article is read as one, warning to write that (T26)", () => {
  for (const { title, plural, one, property } of PLURALS) {
    test(title, () => {
      const mine = compiled(plural)
      const theirs = compiled(one)
      expect(mine.errors).toEqual([])
      expect(mine.warnings).toEqual([
        `4:0 Write "a card's ${property} is ...":  a declaration names one card`,
        ...theirs.warnings
      ])
      expect(mine.program).toEqual(theirs.program)
    })
  }

  test("a singular owner with no article isn't a declaration, as before", () => {
    expect(compiled("card's value is its rank").errors).toEqual([`4:0 Don't understand "card's value is its rank"`])
  })

  test("nor is a plural no type is called", () => {
    expect(compiled("widgets' value is 3").errors).toEqual([`4:0 Don't understand "widgets' value is 3"`])
  })
})

/** `declaration` compiled after a card, with a line reading its value:  what it says, and its program less where. */
function compiled(declaration: string) {
  const { files } = parseSpellProject([
    { path: "/a.spell", contents: `${CARD}${declaration}\nprint the value of a new card\n` }
  ])
  const { compiled, errors, warnings } = files[0]!
  // where each was written:  a declaration's range, and the line's own comment
  const program = `${compiled}`
    .split("\n")
    .filter((line) => !/^\s*defined: |^\s*\/\/ /.test(line))
    .join("\n")
  return { program, errors: errors.map(String), warnings: warnings.map(String) }
}
