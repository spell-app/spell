import { describe, expect, test } from "vite-plus/test"

import { PY } from "spell/parser/py"
import { parseSpellProject } from "spell/parser/spell/test"

/**
 * A step said of each item, `play each card in the pile`, does it for EVERY item (epic `language` I193):
 * when the step waits and gives a value, it's written as a plain loop, and that value is a statement there,
 * never a `return` that ended the action after the first card.
 */
describe("a step said of each item, when it waits", () => {
  const lines = [
    "a card has a rank as number",
    "\tto play it",
    "\t\tpause for 10 msec",
    "\t\treturn yes",
    "a pile is a list of cards",
    "game is an app",
    '\t"pile" is a new pile',
    "\tto play all",
    "\t\tplay each card in the pile"
  ]
  const [file] = parseSpellProject([{ path: "/Game.spell", contents: lines.join("\n") }]).files

  test("javascript plays every card in turn", () => {
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toMatch(
      /async playAll\(\) \{\s+for \(const card of this\.pile\) \{\s+await card\.play\(\)\s+\}/
    )
    expect(file!.compiled).not.toContain("return await card.play()")
  })

  test("python too", () => {
    const python = String(PY.PyWriter.instance.writeMatch(file!.match!))
    expect(python).toMatch(/for card in self\.pile:\s+await card\.play\(\)/)
    expect(python).not.toContain("return await card.play()")
  })
})
