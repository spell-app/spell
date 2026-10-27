import { describe, expect, test } from "vite-plus/test"

import { Fixture } from "spell/test-helpers/Fixture"
import { PAGE } from "spell/ui/test-helpers/docsSearch.fixtures"

import { PageOutline } from "spell/ui/components/ui-toc/PageOutline"

describe("PageOutline.sections()", () => {
  test("lists titled sections as the search file does:  a top section's tab, an inner one's parent index", () => {
    expect(PageOutline.sections(Fixture.render(PAGE))).toEqual({
      sections: [
        { id: "examples-types", title: "Types", tab: "examples" },
        { id: "examples-types-divider", title: "Divider", parent: 0 },
        { id: "examples-types-vertical-divider", title: "Vertical Divider", parent: 0 },
        { id: "usage-keyboard", title: "Keyboard", tab: "usage" }
      ],
      tabs: { examples: "Examples", usage: "Usage" }
    })
  })
})
