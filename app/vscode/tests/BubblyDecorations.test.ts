import { describe, expect, test } from "vite-plus/test"

import values from "spell/app/app/components/spell-code/bubbly.values.json"
import { optionsFor, pillPieces, styleKey, type BubblyRange } from "../src/BubblyDecorations"

/** A stretch of `kind`, its range anywhere. */
const stretch = (kind: string, more: Partial<BubblyRange> = {}): BubblyRange => ({
  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
  kind,
  ...more
})

/**
 * How VS Code draws each stretch of the bubbly look (epic `language` P51):  the look's values, light and dark.
 * - The stretches themselves are the language server's (`spell/bubbly`), tested there.
 */
describe("BubblyDecorations", () => {
  test("a style per kind;  a pill's by its band and whether it's a name", () => {
    expect(styleKey(stretch("reference"))).toBe("reference")
    expect(styleKey(stretch("input", { partOfSpeech: "thing", isName: true }))).toBe("input:thing:name")
    expect(styleKey(stretch("choice", { partOfSpeech: "property" }))).toBe("choice:property")
    expect(styleKey(stretch("input"))).toBe("input:plain")
  })

  test("weights, ink and slant from the sheet's values", () => {
    const { settings } = values
    expect(optionsFor(stretch("reference"))).toMatchObject({
      fontWeight: settings["--bubbly-bold"].light,
      light: { color: settings["--bubbly-bold-ink"].light },
      dark: { color: settings["--bubbly-bold-ink"].dark }
    })
    expect(optionsFor(stretch("value"))).toMatchObject({ fontStyle: "italic" })
    expect(optionsFor(stretch("comment"))).toMatchObject({
      fontStyle: "italic",
      light: { color: settings["--bubbly-faint"].light }
    })
    expect(optionsFor(stretch("words"))).toMatchObject({ light: { color: settings["--bubbly-ink"].light } })
    // one value or one question:  its dotted line alone, over the stretches it runs under
    const underline = optionsFor(stretch("underline"))
    expect(underline.light?.textDecoration).toMatch(/^underline dotted #/)
    expect(underline.light?.color).toBeUndefined()
  })

  test("a pill:  its band's colour, rounded, an edge, room either side as attachments, never padding", () => {
    const options = optionsFor(stretch("input", { partOfSpeech: "action", isName: true }))
    expect(options).toMatchObject({
      light: { backgroundColor: values.parts.action["--bubbly-pill"].light },
      dark: { backgroundColor: values.parts.action["--bubbly-pill"].dark },
      fontWeight: values.settings["--bubbly-bold"].light,
      before: { contentText: " " },
      after: { contentText: " " }
    })
    expect(options.borderRadius).toBeTruthy()
    expect(options.borderColor).toContain(values.settings["--bubbly-action"].light)
    expect(options.borderWidth).toBe("1px")
    expect(JSON.stringify(options)).not.toMatch(/padding|margin/)
  })

  test("a pill over several letters in three pieces, so VS Code's runs inside it don't each round off (T115)", () => {
    const pill = stretch("input", {
      partOfSpeech: "action",
      range: { start: { line: 2, character: 4 }, end: { line: 2, character: 10 } }
    })
    const pieces = pillPieces(pill)
    expect(pieces.map(({ piece, range }) => [piece, range.start.character, range.end.character])).toEqual([
      ["start", 4, 5],
      ["middle", 5, 9],
      ["end", 9, 10]
    ])
    expect(new Set(pieces.map(styleKey)).size).toBe(3)
    const [start, middle, end] = pieces.map(optionsFor)
    // corners and edges only at its ends;  the room beside it outside them
    expect(start).toMatchObject({ borderRadius: "5px 0 0 5px", borderWidth: "1px 0 1px 1px", before: { contentText: "\u00a0" } })
    expect(start!.after).toBeUndefined()
    expect(middle).toMatchObject({ borderRadius: "0", borderWidth: "1px 0" })
    expect(middle!.before ?? middle!.after).toBeUndefined()
    expect(end).toMatchObject({ borderRadius: "0 5px 5px 0", borderWidth: "1px 1px 1px 0", after: { contentText: "\u00a0" } })
    // one letter, another kind:  as they are
    expect(pillPieces(stretch("input"))).toHaveLength(1)
    expect(pillPieces(stretch("reference", { range: pill.range }))).toHaveLength(1)
  })
})
