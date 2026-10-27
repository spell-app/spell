import { describe, expect, it, onTestFinished } from "vite-plus/test"

import { Fixture } from "spell/test-helpers/Fixture"

import { PageBridge } from "spell/ui/components/ui-theme-editor/PageBridge"

describe("PageBridge.applyCss()", () => {
  it("lays the theme being made last in <head>, changes it in place, and takes it away", () => {
    onTestFinished(() => PageBridge.applyCss(document, ""))
    PageBridge.applyCss(document, ":root { --bench-test: 1px !important; }")
    const style = document.getElementById("ui-theme-editor-sheet")!
    expect(document.head.lastElementChild).toBe(style)
    expect(getComputedStyle(document.documentElement).getPropertyValue("--bench-test")).toBe("1px")
    PageBridge.applyCss(document, ":root { --bench-test: 2px !important; }")
    expect(document.getElementById("ui-theme-editor-sheet")).toBe(style)
    expect(getComputedStyle(document.documentElement).getPropertyValue("--bench-test")).toBe("2px")
    PageBridge.applyCss(document, "")
    expect(document.getElementById("ui-theme-editor-sheet")).toBeNull()
  })
})

describe("PageBridge.pinScheme()", () => {
  it("shows its scheme on <html>, and puts it back after the page follows another frame's stored one", async () => {
    const frame = document.createElement("iframe")
    document.body.append(frame)
    onTestFinished(() => frame.remove())
    const doc = frame.contentDocument!
    const root = doc.documentElement
    PageBridge.pinScheme(doc, "dark")
    expect(root.classList.contains("ui-dark")).toBe(true)
    expect(root.style.colorScheme).toBe("dark")
    // the page follows a scheme another frame stored:  light, then the storage event
    root.classList.replace("ui-dark", "ui-light")
    frame.contentWindow!.dispatchEvent(new StorageEvent("storage", { key: "spell-site:scheme" }))
    await expect.poll(() => root.classList.contains("ui-dark")).toBe(true)
    expect(root.classList.contains("ui-light")).toBe(false)
    // pinned again, to light:  the same listener puts light back
    PageBridge.pinScheme(doc, "light")
    expect(root.className).toContain("ui-light")
    expect(root.classList.contains("ui-dark")).toBe(false)
  })
})

describe("PageBridge.look()", () => {
  it("what the sheets read and set, and set on an element below :root", () => {
    const box = Fixture.render(`
      <div class="bench-look">
        <style>
          :root { --bench-a: red; }
          .bench-look { --bench-b: var(--bench-a); color: var(--bench-c, blue); }
          .bench-nowhere { --bench-d: 1px; }
        </style>
      </div>`)
    const host = document.createElement("div")
    box.append(host)
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(":host { --bench-e: var(--bench-f); }")
    host.attachShadow({ mode: "open" }).adoptedStyleSheets = [sheet]
    const look = PageBridge.look(document, ["--bench-a"])
    expect(look.reads).toEqual(expect.arrayContaining(["--bench-a", "--bench-c", "--bench-f"]))
    expect(look.declares).toEqual(expect.arrayContaining(["--bench-a", "--bench-b", "--bench-d", "--bench-e"]))
    // only where its rule matches an element now
    expect(look.overrides).toContain("--bench-b")
    expect(look.overrides).not.toContain("--bench-a")
    expect(look.overrides).not.toContain("--bench-d")
    expect(look.values["--bench-a"]).toBe("red")
  })
})
