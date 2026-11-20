import { describe, expect, it } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { spellPartsFor, spellTextOf } from "spell/parser/spell/ingest/PlaceSpell"
import type { FieldDescription, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"

// the language loads first:  `PlaceSpell` reads its rules as it loads
void SP

/** A place with one list, `assets`, whose rows hold `meta` (one thing) and `tags` (a list of things). */
function placeWith(meta: Partial<FieldDescription>, tags: Partial<FieldDescription> = {}): PlaceDescription {
  return {
    about: { name: "console", kind: "web server", address: "https://console.test/api" },
    canDo: {},
    collections: {
      assets: {
        type: "asset",
        at: "/assets",
        rowsSeen: 0,
        paging: "none",
        fields: {
          name: { words: "name", type: "text" },
          meta: { words: "meta", type: "inside", inside: { source: { words: "source", type: "text" } }, ...meta },
          tags: {
            words: "tags",
            type: "inside",
            isListInside: true,
            inside: { label: { words: "label", type: "text" } },
            ...tags
          }
        }
      }
    },
    notes: [],
    spell: []
  } as unknown as PlaceDescription
}

describe("spellPartsFor(), a type inside a row a person named (`insideType`)", () => {
  it("names the type inside from its field's words when nobody named it", () => {
    const text = spellTextOf(spellPartsFor(placeWith({})))
    expect(text).toMatch(/its "meta" is a meta\n/)
    expect(text).toMatch(/^a "meta" is a thing$/m)
  })

  it("keeps the person's name for it, one thing or a list, and the field's words as they were", () => {
    const text = spellTextOf(spellPartsFor(placeWith({ insideType: "asset meta" }, { insideType: "asset tag" })))
    expect(text).toMatch(/its "meta" is an asset meta\n/)
    expect(text).toMatch(/^an "asset meta" is a thing$/m)
    expect(text).toMatch(/its "tags" is a list of asset tags\n/)
    expect(text).toMatch(/^an "asset tag" is a thing$/m)
    expect(text).not.toMatch(/^a "meta" is a thing$/m)
  })

  it("never takes a collection's own type's name for it:  the writer's own name instead", () => {
    const text = spellTextOf(spellPartsFor(placeWith({ insideType: "asset" })))
    expect(text).toMatch(/its "meta" is a meta\n/)
  })
})
