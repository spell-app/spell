import { describe, expect, it } from "vite-plus/test"

import { RootSheets } from "spell/ui/elements/RootSheets"
import { iconVocabulary } from "spell/ui/components/ui-icon/UIIcon.en"
import { dividerVocabulary } from "spell/ui/components/ui-divider/UIDivider.en"
import { markdownVocabulary } from "spell/ui/components/ui-markdown/UIMarkdown.en"

describe("RootSheets.for()", () => {
  it("gives a family the colour and size remaps when its vocabulary can put a colour or size word on a box", () => {
    expect(RootSheets.for(iconVocabulary)).toEqual(expect.arrayContaining(["colors-shared", "sizes-shared"]))
    expect(RootSheets.for(iconVocabulary)).not.toContain("utilities")
    expect(RootSheets.for(iconVocabulary)).not.toContain("animations")
  })

  it("adds what its own markup uses, from the scan", () => {
    expect(RootSheets.for(markdownVocabulary)).toEqual(
      expect.arrayContaining(["colors-shared", "sizes-shared", "utilities", "animations"])
    )
  })

  it("gives a tag the scan never saw (a component pack's) the utilities and the animations", () => {
    const vocabulary = { ...dividerVocabulary, tag: "x-divider" }
    expect(RootSheets.for(vocabulary)).toEqual(expect.arrayContaining(["utilities", "animations"]))
  })

  it("works each vocabulary out once", () => {
    expect(RootSheets.for(iconVocabulary)).toBe(RootSheets.for(iconVocabulary))
  })
})
