import { describe, expect, test } from "vite-plus/test"

import values from "spell/app/app/components/spell-code/bubbly.values.json"
import { optionsFor, styleKey, type BubblyRange } from "../src/BubblyDecorations"

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
    expect(options.border).toContain(values.settings["--bubbly-action"].light)
    expect(JSON.stringify(options)).not.toMatch(/padding|margin/)
  })
})
