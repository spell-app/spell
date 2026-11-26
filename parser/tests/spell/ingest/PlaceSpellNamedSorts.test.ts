import { describe, expect, it } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { spellPartsFor, spellTextOf } from "spell/parser/spell/ingest/PlaceSpell"
import type { ListTakes, PlaceDescription } from "spell/parser/spell/ingest/ingest.types"
import { parseSpellProject } from "spell/parser/spell/test"

// the language loads first:  `PlaceSpell` reads its rules as it loads
void SP

/** A web server whose one list, `jobs`, takes `takes`. */
function placeTaking(takes: ListTakes): PlaceDescription {
  return {
    about: { name: "acme", kind: "web server", address: "https://acme.test" },
    canDo: {},
    collections: {
      jobs: {
        type: "job",
        at: "/api/jobs",
        rowsSeen: 0,
        paging: "none",
        takes,
        fields: {
          name: { words: "name", type: "text" },
          created_at: { words: "created at", type: "date" },
          ended_at: { words: "ended at", type: "date" }
        }
      }
    },
    notes: [],
    spell: []
  } as unknown as PlaceDescription
}

describe("spellPartsFor(), a list's named sorts", () => {
  it("says the question once, then each order found newest first, named by its field's words", () => {
    const text = spellTextOf(
      spellPartsFor(
        placeTaking({
          sortedWith: "order_by",
          orders: [
            { as: "created_at", field: "created_at", descending: true },
            { as: "-ended_at", field: "ended_at", descending: true },
            { as: "name", field: "name", descending: false },
            { as: "recency" }
          ]
        })
      )
    )
    expect(text).toContain(
      [
        `\tjobs live at "/api/jobs"`,
        `\t\tit sorts with "order_by"`,
        `\t\tjobs can be sorted by:`,
        `\t\t\t- "created at" as "created_at"`,
        `\t\t\t- "ended at" as "-ended_at", by ended-at`
      ].join("\n")
    )
    // found oldest first, or naming no field:  no line
    expect(text).not.toContain(`as "name"`)
    expect(text).not.toContain(`"recency"`)
    const { files } = parseSpellProject([{ path: "/Acme.api.spell", contents: text }])
    expect(files[0]!.errors).toEqual([])
    expect(files[0]!.compiled).toMatch(
      /sortOrders: \[\{\s*name: "createdAt",\s*as: "created_at",\s*field: "createdAt"\s*\}, \{\s*name: "endedAt",\s*as: "-ended_at",\s*field: "endedAt"\s*\}\]/
    )
  })

  it("with fields it sorts by too, their line leaves the question to the line that says it", () => {
    const text = spellTextOf(
      spellPartsFor(
        placeTaking({
          sorts: ["name"],
          sortedWith: "order_by",
          orders: [{ as: "created_at", field: "created_at", descending: true }]
        })
      )
    )
    expect(text).toMatch(/^\t\tit sorts with "order_by"\n\t\tit sorts by name\n\t\tjobs can be sorted by:$/m)
  })

  it("no named sort:  the question stays on the fields' line, as before", () => {
    const text = spellTextOf(
      spellPartsFor(placeTaking({ sorts: ["name"], sortedWith: "order_by", orders: [{ as: "recency" }] }))
    )
    expect(text).toMatch(/^\t\tit sorts by name with "order_by"$/m)
    expect(text).not.toContain("can be sorted by")
  })
})
