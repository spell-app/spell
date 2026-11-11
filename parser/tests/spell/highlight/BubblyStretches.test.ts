import { describe, expect, it } from "vite-plus/test"

import { SP } from "spell/parser/spell"

/** A card, as Solitaire's starts. */
const CARD = `# A card
a "card" is a draggable two sided view
\tits "rank" is one of ace, jack, queen
\tto "deal the cards"
\t\tset its rank to ace
`

/** Each stretch of `text` as `kind:words`, with its band and marks when it has them. */
function stretchesOf(text = CARD): string[] {
  return SP.BubblyStretches.of(SP.BubblyLayout.of(text)).map(({ start, end, kind, partOfSpeech, isName }) =>
    [`${kind}:${text.slice(start, end)}`, partOfSpeech, isName && "name"].filter(Boolean).join(" ")
  )
}

describe("BubblyStretches.of()", () => {
  it("a quoted input in three:  its own marks, its words;  the first on a head is the name it defines", () => {
    const stretches = stretchesOf()
    expect(stretches).toContain('quote-open:" thing')
    expect(stretches).toContain("input:card thing name")
    expect(stretches).toContain("input:rank property name")
    expect(stretches).toContain("input:deal the cards action name")
  })

  it("a list's values each a choice;  a heading's marks apart from its words", () => {
    const stretches = stretchesOf()
    expect(stretches.filter((each) => each.startsWith("choice:"))).toEqual([
      "choice:ace property",
      "choice:jack property",
      "choice:queen property"
    ])
    expect(stretches.slice(0, 2)).toEqual(["heading-mark:#", "heading: A card"])
  })

  it("a step's stretches sit on no band", () => {
    const step = stretchesOf().filter((each) => !/ (thing|property|action|plain)( name)?$/.test(each))
    expect(step).toContain("reference:rank")
  })
})
