import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { stableHash } from "spell/util/hash"
import { GivenDrawings, type GivenDrawing } from "spell/ui/elements/GivenDrawings"

/** An item to find. */
const ITEM = { kind: "code", settings: { language: "js", drawing: true }, text: "const x = 1" }

/** Put a table of drawings in the page. */
function addTable(table: unknown) {
  const script = document.createElement("script")
  script.type = "application/json"
  script.setAttribute("data-spell-drawings", "")
  script.textContent = JSON.stringify(table)
  document.head.append(script)
}

afterEach(() => {
  document.querySelectorAll("script[data-spell-drawings]").forEach((table) => table.remove())
  delete (globalThis as { SPELL_SERVER?: unknown }).SPELL_SERVER
  GivenDrawings.reset()
  vi.restoreAllMocks()
})

describe("GivenDrawings", () => {
  it("names an item as the page server does:  its settings in any order", () => {
    const key = GivenDrawings.keyFor(ITEM)
    expect(key).toBe(stableHash([ITEM.kind, ITEM.settings, ITEM.text]))
    expect(GivenDrawings.keyFor({ ...ITEM, settings: { drawing: true, language: "js" } })).toBe(key)
  })

  it("finds a drawing in the page's tables, a table added later too, its sheet looked up", async () => {
    expect(await GivenDrawings.find(ITEM)).toBeUndefined()
    addTable({
      drawings: { [GivenDrawings.keyFor(ITEM)]: { markup: "drawn", sheet: "s1" } },
      sheets: { s1: ".x {}" }
    })
    expect(await GivenDrawings.find(ITEM)).toEqual({ markup: "drawn", sheet: ".x {}" })
  })

  it("asks the page server once, only for a kind it draws, and keeps its answer", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ markup: "asked" }))
    expect(await GivenDrawings.find(ITEM, { ask: true })).toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
    Object.assign(globalThis, {
      SPELL_SERVER: { drawings: { api: "/api/server/drawings", kinds: ["code"], table: "script[data-spell-drawings]" } }
    })
    expect(await GivenDrawings.find(ITEM, { ask: true })).toEqual({ markup: "asked" })
    // a redraw finds the answer again, without asking
    expect(await GivenDrawings.find(ITEM)).toEqual({ markup: "asked" })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/server/drawings/code")
  })

  it("passes over the page's drawing when it doesn't fit, and asks for one with the item's hints", async () => {
    addTable({ drawings: { [GivenDrawings.keyFor(ITEM)]: { markup: "filled", data: { look: "a" } } }, sheets: {} })
    Object.assign(globalThis, {
      SPELL_SERVER: { drawings: { api: "/api/server/drawings", kinds: ["code"], table: "script[data-spell-drawings]" } }
    })
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => Response.json({ markup: "mine", data: { look: "b" } }))
    const fits = (drawing: GivenDrawing) => drawing.data?.look === "b"
    expect(await GivenDrawings.find({ ...ITEM, hints: { font: "serif" } }, { ask: true, fits })).toEqual({
      markup: "mine",
      data: { look: "b" }
    })
    expect(JSON.parse(fetch.mock.calls[0]?.[1]?.body as string).hints).toEqual({ font: "serif" })
  })

  it("takes a 204, or no server, as none:  the element draws it itself", async () => {
    Object.assign(globalThis, {
      SPELL_SERVER: { drawings: { api: "/api/server/drawings", kinds: ["code"], table: "script[data-spell-drawings]" } }
    })
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => new Response(null, { status: 204 }))
    expect(await GivenDrawings.find(ITEM, { ask: true })).toBeUndefined()
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(async () => Promise.reject(new TypeError("offline")))
    expect(await GivenDrawings.find({ ...ITEM, text: "other" }, { ask: true })).toBeUndefined()
  })
})
