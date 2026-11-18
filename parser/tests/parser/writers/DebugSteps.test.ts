import { describe, expect, test } from "vite-plus/test"

import { compiledSpellProject } from "spell/parser/spell/test"

/** A pile game:  an action, a question, a handler and an after hook. */
const GAME = `a "card" is a thing
	its "rank" is a number
	it "is high" if its rank > 10
	its "label" is
		set word to "card"
		return word && its rank

a "pile" is a list of cards
	its "score" is a number
	when a card is dropped
		move the card to the pile
	to "move a card to a pile"
		cancel if the card is high
		set points to the points for the card
		add the card to the pile
		set the pile's score to the pile's score + points
	to "the points for (a card)"
		return 10 if the card is high
		return 5
	after moving a card to a pile
		set the pile's score to the pile's score + 1
`

describe("P.DebugSteps:  a debugging build", () => {
  const shipped = compiledSpellProject([{ path: "/Game.spell", contents: GAME }]).code
  const debugging = compiledSpellProject([{ path: "/Game.spell", contents: GAME }], { debugging: true }).code

  test("the shipped build has no steps, and its actions don't wait", () => {
    expect(shipped).not.toContain("_stepper")
    expect(shipped).not.toContain("frame$")
    expect(shipped).toContain("  moveToPile(pile) {")
  })

  test("each action and handler waits, and opens a frame:  its file, the line it's declared on, its inputs", () => {
    expect(debugging).toContain(
      `  async moveToPile(pile) {\n    const frame$ = core._stepper.frame("/Game.spell", 11, this, () => ({ "pile": pile }))`
    )
    expect(debugging).toContain(`  async whenCardDroppedOn(card) {`)
    expect(debugging).toContain(`  async afterMoveToPile(pile) {`)
  })

  test("each line asks first, with the values set so far;  a call of an action that now waits is awaited", () => {
    expect(debugging).toContain(
      [
        "    try {",
        "      if (frame$.at(12)) await frame$.held()",
        "      if (this.isHigh) core.cancel()",
        "      if (frame$.at(13)) await frame$.held()",
        "      const points = await this.thePointsForCard()",
        `      if (frame$.at(14, () => ({ "points": points }))) await frame$.held()`,
        "      pile.append(this)"
      ].join("\n")
    )
  })

  test("each frame is done however its function ends", () => {
    expect(debugging).toContain(["      return 5", "    } finally {", "      frame$.done()", "    }", "  }"].join("\n"))
  })

  test("a getter and a question answer at once:  no steps, no waiting", () => {
    expect(debugging).toContain("  get isHigh() {\n    return this.rank > 10\n  }")
    expect(debugging).toContain(`  get label() {\n    const word = "card"`)
  })

  test("past its steps and waiting, the same code as shipped", () => {
    const bare = (code: string) =>
      code
        .split("\n")
        .filter((line) => !/frame\$|^\s*(try \{|\} finally \{|\})$/.test(line))
        .map((line) => line.trim())
        .join("\n")
        .replace(/async |await /g, "")
    expect(bare(debugging)).toBe(bare(shipped))
  })
})
