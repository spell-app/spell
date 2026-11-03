import { describe, expect, it } from "vite-plus/test"

import { markdownTagsOnOneLine } from "spell/epic/tools/MarkdownTags.js"

const ONE_LINE = `        <!-- prettier-ignore -->
        <ui-markdown><script type="text/markdown">
          # Hello
        </script></ui-markdown>
`

describe("markdownTagsOnOneLine()", () => {
  it("joins what the formatter split", () => {
    const split = `        <ui-markdown
          ><script type="text/markdown">
          # Hello
        </script></ui-markdown
        >
`
    expect(markdownTagsOnOneLine(split)).toBe(ONE_LINE)
  })

  it("changes nothing the second time", () => {
    expect(markdownTagsOnOneLine(ONE_LINE)).toBe(ONE_LINE)
  })

  it("keeps a block's attributes", () => {
    const html = `<ui-markdown size="small"><script type="text/markdown">x</script></ui-markdown>`
    expect(markdownTagsOnOneLine(html)).toContain(`<ui-markdown size="small"><script type="text/markdown">x`)
  })

  it("leaves a block that holds its text from a source alone", () => {
    const html = `<ui-markdown source="a.md"></ui-markdown>`
    expect(markdownTagsOnOneLine(html)).toBe(html)
  })
})
