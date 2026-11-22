import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { ask, serveHandler } from "spell/server/test/serve"

/** A drawer of `kind`:  the text upper-cased, counting its draws;  it finds `<x-box>text</x-box>` in a page. */
function upperDrawer(kind = "box", props: Partial<SRV.Drawer> = {}): SRV.Drawer & { draws: number } {
  const drawer = {
    kind,
    name: `${kind}-upper`,
    version: "1",
    draws: 0,
    find: (page: string) =>
      [...page.matchAll(/<x-box>(.*?)<\/x-box>/g)].map((match) => ({ kind, settings: {}, text: match[1]! })),
    async draw(item: SRV.DrawingItem) {
      drawer.draws += 1
      return { markup: item.text.toUpperCase(), data: { drawn: true } }
    },
    ...props
  }
  return drawer
}

describe("Drawings", () => {
  let folder: string
  let drawings: SRV.Drawings

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "drawings-"))
    drawings = new SRV.Drawings({ folder, waitMs: 200 })
  })
  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  it("draws an item once, and keeps it on disk under its drawer's version", async () => {
    const drawer = upperDrawer()
    drawings.add(drawer)
    const item = { kind: "box", settings: { a: 1 }, text: "hi" }
    expect(drawings.cached(item)).toBeUndefined()
    const [one, two] = await Promise.all([drawings.draw(item), drawings.draw(item)])
    expect(one).toEqual({ markup: "HI", data: { drawn: true } })
    expect(two).toEqual(one)
    expect(drawer.draws).toBe(1)
    expect(drawings.cached(item)).toEqual(one)
    // a new version of the drawer starts empty
    const next = new SRV.Drawings({ folder }).add({ ...upperDrawer(), version: "2" })
    expect(next.cached(item)).toBeUndefined()
  })

  it("keeps a drawing asked for with hints apart from the one pages are filled with", async () => {
    drawings.add(
      upperDrawer("box", {
        draw: async (item) => ({ markup: `${item.text}:${(item.hints?.font as string | undefined) ?? "none"}` })
      })
    )
    const item = { kind: "box", settings: {}, text: "a" }
    expect((await drawings.draw(item))?.markup).toBe("a:none")
    expect((await drawings.draw({ ...item, hints: { font: "serif" } }))?.markup).toBe("a:serif")
    expect(drawings.cached(item)?.markup).toBe("a:none")
  })

  it("names an item the same whatever order its settings are in", () => {
    const a = SRV.Drawings.keyFor({ kind: "code", settings: { language: "js", drawing: true }, text: "x" })
    const b = SRV.Drawings.keyFor({ kind: "code", settings: { drawing: true, language: "js" }, text: "x" })
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{32}$/)
  })

  it("asks the drawer added last first, if it takes the item", async () => {
    drawings.add(upperDrawer("code"))
    drawings.add({
      kind: "code",
      name: "spell",
      version: "1",
      takes: (item) => item.settings.language === "spell",
      draw: async () => ({ markup: "bubbly" })
    })
    expect((await drawings.draw({ kind: "code", settings: { language: "spell" }, text: "x" }))?.markup).toBe("bubbly")
    expect((await drawings.draw({ kind: "code", settings: { language: "js" }, text: "x" }))?.markup).toBe("X")
    expect(drawings.kinds).toEqual(["code"])
  })

  it("fills a page with what it has drawn, and draws the rest for the next view", async () => {
    drawings.add(upperDrawer("box", { replaces: ["/box.js"] }))
    const page = "<html><head><title>t</title></head><body><x-box>a</x-box><x-box>b</x-box></body></html>"
    await drawings.draw({ kind: "box", settings: {}, text: "a" })
    const first = drawings.fill(page)
    const table = JSON.parse(
      /<script type="application\/json" data-spell-drawings>(.*?)<\/script>/.exec(first.page)![1]!
    )
    expect(Object.values(table.drawings)).toEqual([{ markup: "A", data: { drawn: true } }])
    // not all in:  its scripts stay
    expect(drawings.replacedScripts(first.filled)).toEqual(new Set())
    // `b` was drawn meanwhile:  the next view has both, and needs no `/box.js`
    await new Promise((resolve) => setTimeout(resolve, 20))
    const second = drawings.fill(page)
    expect(second.page.indexOf("data-spell-drawings")).toBeLessThan(second.page.indexOf("</head>"))
    expect(Object.keys(JSON.parse(/data-spell-drawings>(.*?)<\/script>/.exec(second.page)![1]!).drawings)).toHaveLength(
      2
    )
    expect(drawings.replacedScripts(second.filled)).toEqual(new Set(["/box.js"]))
    // a page with none of its items needs none of its scripts either;  and gets no table
    const plain = drawings.fill("<p>no boxes</p>")
    expect(plain.page).toBe("<p>no boxes</p>")
    expect(drawings.replacedScripts(plain.filled)).toEqual(new Set(["/box.js"]))
  })

  it("puts a sheet many drawings share in the page once, and keeps `</script>` out of the table", async () => {
    drawings.add(
      upperDrawer("box", { draw: async (item) => ({ markup: `${item.text}</script>`, sheet: ".bubbly { }" }) })
    )
    await drawings.draw({ kind: "box", settings: {}, text: "a" })
    await drawings.draw({ kind: "box", settings: {}, text: "b" })
    const { page } = drawings.fill("<x-box>a</x-box><x-box>b</x-box>")
    const json = /data-spell-drawings>(.*?)<\/script>/.exec(page)![1]!
    expect(json).not.toContain("</script")
    const table = JSON.parse(json) as SRV.DrawingsTable
    expect(Object.values(table.sheets)).toEqual([".bubbly { }"])
    expect(Object.values(table.drawings).map((each) => each.markup)).toEqual(["a</script>", "b</script>"])
  })

  it("answers over HTTP:  a drawing, or 204 when it isn't done in time or nothing draws it", async () => {
    let finish: () => void = () => {}
    drawings.add(upperDrawer())
    drawings.add({
      kind: "slow",
      name: "slow",
      version: "1",
      draw: () => new Promise((resolve) => (finish = () => resolve({ markup: "late" })))
    })
    const router = new SRV.Router().use(SRV.Drawings.API, drawings.router())
    const served = await serveHandler(router.handle)
    const post = (kind: string, body: unknown) =>
      ask(served.port, "POST", `${SRV.Drawings.API}/${kind}`, {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" }
      })
    try {
      const drawn = await post("box", { text: "hi", settings: {} })
      expect([drawn.status, JSON.parse(drawn.text)]).toEqual([200, { markup: "HI", data: { drawn: true } }])
      expect((await post("nothing", { text: "hi", settings: {} })).status).toBe(204)
      // the slow one:  204 now, still drawing, and kept for the next ask
      expect((await post("slow", { text: "x", settings: {} })).status).toBe(204)
      finish()
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(JSON.parse((await post("slow", { text: "x", settings: {} })).text)).toEqual({ markup: "late" })
      expect((await post("box", { text: 3 })).status).toBe(400)
    } finally {
      await served.close()
    }
  })

  it("never throws for a drawer that fails:  the page draws it itself", async () => {
    drawings.add(upperDrawer("box", { draw: () => Promise.reject(new Error("no browser")) }))
    expect(await drawings.draw({ kind: "box", settings: {}, text: "a" })).toBeUndefined()
    expect(drawings.fill("<x-box>a</x-box>").page).toBe("<x-box>a</x-box>")
  })

  it("refuses a drawer name that's no folder name", () => {
    expect(() => drawings.add({ ...upperDrawer(), name: "../x" })).toThrow(TypeError)
  })
})
