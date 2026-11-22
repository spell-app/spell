import { describe, expect, it } from "vite-plus/test"

import { ComponentPacks } from "spell/ui/components/ui-components/ComponentPacks"
import { RootLoader } from "spell/ui/components/ui-root/RootLoader"

// `RootLoader`'s registries are page-wide and have no reset:  each case uses folders of its own

describe("RootLoader.load()", () => {
  it("loads a library family by folder", async () => {
    await RootLoader.load("ui-divider")
    expect(customElements.get("ui-divider")).toBeDefined()
  })

  it("doesn't know the doc-only families until a bundle adds them (I12)", async () => {
    await expect(RootLoader.load("ui-docs-api")).rejects.toThrow('no family "ui-docs-api"')
  })

  it("rejects a folder with no family", async () => {
    await expect(RootLoader.load("ui-nope")).rejects.toThrow(/no family/)
  })
})

describe("RootLoader.folderFor()", () => {
  it("names the family that defines a tag;  nothing for an `Object.prototype` key", () => {
    expect(RootLoader.folderFor("ui-buttons")).toBe("ui-button")
    expect(RootLoader.folderFor("toString")).toBeUndefined()
  })
})

describe("RootLoader.undefinedTags()", () => {
  it("lists each undefined `ui-*` tag once;  defined ones and an app's own elements are left out", () => {
    customElements.define("ui-test-loader-defined", class extends HTMLElement {})
    const root = document.createElement("div")
    root.innerHTML =
      `<ui-test-loader-a></ui-test-loader-a><p><ui-test-loader-a></ui-test-loader-a></p>` +
      `<ui-test-loader-defined></ui-test-loader-defined><app-widget></app-widget>`
    expect(RootLoader.undefinedTags(root)).toEqual(new Set(["ui-test-loader-a"]))
  })
})

describe("RootLoader.add()", () => {
  it("lets load() import an added barrel, keyed by its folder, once", async () => {
    let imports = 0
    RootLoader.add({ "../../docs-components/ui-added-once/index.ts": async () => void imports++ })
    await RootLoader.load("ui-added-once")
    await RootLoader.load("ui-added-once")
    expect(imports).toBe(1)
  })

  it("skips a path that isn't a family barrel", async () => {
    RootLoader.add({ "../../docs-components/ui-added-stray/other.ts": async () => undefined })
    await expect(RootLoader.load("ui-added-stray")).rejects.toThrow('no family "ui-added-stray"')
  })
})

describe("RootLoader.entryOf()", () => {
  it("knows a catalog tag;  nothing for a tag no catalog or registered pack lists", () => {
    expect(RootLoader.entryOf("ui-buttons")).toMatchObject({ folder: "ui-button", attributes: expect.any(Array) })
    expect(RootLoader.entryOf("x-unlisted")).toBeUndefined()
    expect(RootLoader.entryOf("toString")).toBeUndefined()
  })
})

describe("RootLoader.canLoad()", () => {
  it("knows the library's families and the added ones;  not a doc-only one no bundle added", () => {
    RootLoader.add({ "../../docs-components/ui-added-can/index.ts": async () => undefined })
    expect(RootLoader.canLoad("ui-divider")).toBe(true)
    expect(RootLoader.canLoad("ui-added-can")).toBe(true)
    expect(RootLoader.canLoad("ui-docs-api")).toBe(false)
  })
})

// epic `solid-2-final` P7:  the docs bundle defines no family up front, and a pack's families are modules of their own
describe("RootLoader.loadOnFirstUse()", () => {
  it("loads a pack's added family the first time one of its elements is made, in a shadow root too, once", async () => {
    const catalog = { "p7lazy-card": { folder: "p7lazy-card", attributes: ["label"] } }
    ComponentPacks.register({ name: "p7lazy", prefix: "p7lazy-", catalog, define: () => undefined })
    let loads = 0
    RootLoader.add({ "p7lazy-card/index.ts": async () => void loads++ })
    expect(RootLoader.folderFor("p7lazy-card")).toBe("p7lazy-card")
    RootLoader.loadOnFirstUse()
    RootLoader.defineEarly(catalog)
    const host = document.body.appendChild(document.createElement("div"))
    host.attachShadow({ mode: "open" }).innerHTML = "<p7lazy-card></p7lazy-card><p7lazy-card></p7lazy-card>"
    document.body.append(document.createElement("p7lazy-card"))
    await Promise.resolve()
    expect(loads).toBe(1)
    host.remove()
  })

  it("leaves a tag whose family the page can't import to the page's own script:  no load, no warning", () => {
    RootLoader.loadOnFirstUse()
    expect(() => document.createElement("ui-docs-api")).not.toThrow()
  })
})
