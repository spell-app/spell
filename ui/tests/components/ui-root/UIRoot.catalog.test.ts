import { describe, expect, it, test } from "vite-plus/test"

import { ComponentDefinitions } from "$/ui/components/ComponentDefinitions"
import { ROOT_CATALOG } from "$/ui/components/ui-root/UIRoot.catalog"
import { SkeletonText } from "spell-kit/element/SkeletonText"

/**
 * `<ui-root>`'s generated catalog (`UIRoot.catalog.ts`) agrees with the vocabularies:  run `yarn gen:root` after
 * adding, moving or renaming a tag.
 */
describe("ROOT_CATALOG", () => {
  it("has every tag, the doc-only ones too, in its family's folder (else run `yarn gen:root`)", () => {
    const expected = Object.fromEntries(
      [...ComponentDefinitions.all, ...ComponentDefinitions.docs].map(
        (definition) => [definition.tag, definition.folder] as const
      )
    )
    const actual = Object.fromEntries(Object.entries(ROOT_CATALOG).map(([tag, entry]) => [tag, entry.folder] as const))
    expect(actual).toEqual(expected)
  })

  it("knows every tag, and its family", () => {
    expect(ROOT_CATALOG).toMatchObject({
      "ui-or": { folder: "ui-button" },
      "ui-content": { folder: "ui-parts" },
      "ui-root": { folder: "ui-root" }
    })
  })
})

/** Every skeleton the catalog holds (parsed from the vocabularies by `yarn gen:root`), by tag. */
const CATALOG_SKELETONS = Object.entries(ROOT_CATALOG).flatMap(([tag, entry]) =>
  entry.skeleton ? [[tag, entry.skeleton] as const] : []
)

// the kit's skeleton grammar (`SkeletonText`, its own tests in the kit's `tests/element/`) on Spell UI's skeletons
describe("ROOT_CATALOG's skeletons", () => {
  // every skeleton the vocabularies describe survives the trip both ways
  test.each(CATALOG_SKELETONS)("round trip:  <%s>", (_, spec) => {
    const text = SkeletonText.format(spec)
    expect(SkeletonText.parse(text)).toEqual(spec)
    expect(SkeletonText.format(SkeletonText.parse(text))).toBe(text)
  })
})
