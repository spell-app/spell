import { afterEach, describe, expect, test } from "vite-plus/test"

import { HashLanding } from "spell-ui/components/ui-toc/HashLanding"

/** A page of `html` in a fresh frame:  each test its own document, so its own landing. */
async function pageOf(html: string): Promise<Document> {
  const frame = document.createElement("iframe")
  frame.style.cssText = "width: 400px; height: 300px"
  document.body.append(frame)
  const document_ = frame.contentDocument!
  document_.body.innerHTML = html
  frames.push(frame)
  return document_
}
const frames: HTMLIFrameElement[] = []
afterEach(() => frames.splice(0).forEach((frame) => frame.remove()))

/** Tall content around a target, `#far`, unfolded or not. */
const PAGE = `<div style="height: 2000px"></div><ui-section id="fold" collapsible open="false"><p id="far">far</p></ui-section><div style="height: 2000px"></div>`

describe("HashLanding.reveal()", () => {
  test("unfolds the sections around the target, itself only with `opensTarget`", async () => {
    const page = await pageOf(PAGE)
    const fold = page.getElementById("fold")!
    expect(HashLanding.reveal(fold, { opensTarget: false })).toBe(false)
    expect(fold.getAttribute("open")).toBe("false")
    expect(HashLanding.reveal(page.getElementById("far")!, { opensTarget: false })).toBe(true)
    expect(fold.hasAttribute("open")).toBe(false)
  })
})

describe("HashLanding.land()", () => {
  test("scrolls the target's top to its line:  the margin line by default", async () => {
    const page = await pageOf(PAGE)
    page.getElementById("far")!.style.scrollMarginTop = "40px"
    expect(await HashLanding.forDocument(page).landOnHash("#far")).toBe(true)
    expect(Math.round(page.getElementById("far")!.getBoundingClientRect().top)).toBe(40)
  })

  test("a newer landing stops an older one still waiting:  the page scrolls once", async () => {
    const page = await pageOf(PAGE)
    const landing = HashLanding.forDocument(page)
    const first = landing.land(page.getElementById("far")!)
    const second = landing.land(page.getElementById("fold")!)
    expect(await first).toBe(false)
    expect(await second).toBe(true)
  })

  test("a page with its own rules lands its hashes itself:  `landOnHash()` leaves them", async () => {
    const page = await pageOf(PAGE)
    const landed: Element[] = []
    const landing = HashLanding.forDocument(page).use({ lineFor: () => 10, onLanded: (target) => landed.push(target) })
    expect(landing.isPageOwned).toBe(true)
    expect(await landing.landOnHash("#far")).toBe(false)
    expect(await landing.land(page.getElementById("far")!)).toBe(true)
    expect(landed.map((target) => target.id)).toEqual(["far"])
    expect(Math.round(page.getElementById("far")!.getBoundingClientRect().top)).toBe(10)
  })
})
