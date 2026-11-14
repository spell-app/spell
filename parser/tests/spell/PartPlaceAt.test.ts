import { describe, expect, it, vi } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/** A square drawn as a button, its label inside, the button in a column. */
const SOURCE = `a "square" is a view
	its label is text
	to draw it
		<column>
			<button fluid color="primary">
				{its label}
			</button>
			<text>Two</text>
		</column>
// not in any drawing
`

describe("SP.SpellProject.partPlaceAt()", () => {
  const project = parseSpellProject([{ path: "/Square.spell", contents: SOURCE }])
  const file = project.files[0]!
  const lines = SOURCE.split("\n")
  /** The innermost tag around line `line`'s first word:  `line:column` of its start. */
  const tagAround = (line: number) => {
    const offset = lines.slice(0, line).join("\n").length + (line ? 1 : 0) + lines[line]!.search(/\S/)
    const place = SP.SpellProject.partPlaceAt(file.match!, offset)
    return place && `${place.line}:${place.column}`
  }

  it("finds the tag a line starts", () => {
    expect(tagAround(3)).toBe("3:2")
    expect(tagAround(4)).toBe("4:3")
    expect(tagAround(7)).toBe("7:3")
  })

  it("finds the tag around a line of its content, or its closing tag", () => {
    expect(tagAround(5)).toBe("4:3")
    expect(tagAround(6)).toBe("4:3")
    expect(tagAround(8)).toBe("3:2")
  })

  it("finds none outside a drawing", () => {
    expect(tagAround(1)).toBeUndefined()
    expect(tagAround(9)).toBeUndefined()
  })

  // language I85:  a keyword's match (`is`, `to draw`) has no AST;  asking it for one warned, once a cursor move
  it("asks no keyword for its AST", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      for (let line = 0; line < lines.length - 1; line++) tagAround(line)
      expect(warn.mock.calls.map((call) => String(call[0]))).not.toContainEqual(expect.stringContaining("No getAST()"))
    } finally {
      warn.mockRestore()
    }
  })
})
