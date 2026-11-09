import { beforeAll, describe, test, expect } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A FENCED CODE BLOCK in spellx prose (epic `language` T80):  ` ``` ` to ` ``` `, as markdown writes one.
 * - Every line inside it is prose, as written:  a tag at a line's start (`<property ...>`) is shown, never read.
 * - Outside a fence, the same line is a tag, as before.
 */
describe("a fenced code block in spellx prose", () => {
  beforeAll(registerTestComponentPack)

  test("a tag at a line's start inside a fence is prose:  no error, nothing declared", () => {
    const text = [
      "# The bill",
      "Add a line of your own:",
      "",
      "```spellml",
      '<property "tip each">the tip / the people</>',
      "```",
      "",
      '<spell-thing "bill">',
      '\t<property "tip">10</>',
      "\tA bill's prose, with a fence of its own:",
      "\t~~~",
      '\t<property "tip each">the tip / 2</>',
      "\t~~~",
      "</spell-thing>",
      ""
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/Bill.spellml", contents: text }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain("tip")
    expect(file!.compiled).not.toMatch(/tipEach|tip_each/)
  })

  test("after its closing fence, a tag is read again", () => {
    const text = [
      "```",
      "<b>not a tag</b>",
      "```",
      '<spell-thing "bill">',
      '\t<property "tip">10</>',
      "</spell-thing>",
      ""
    ]
    const [file] = parseSpellProject([{ path: "/Bill.spellml", contents: text.join("\n") }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain("class Bill")
  })
})
