import { expect, it } from "vite-plus/test"
import { flush } from "solid-js"
import ssrShadow from "/.cache/ssr-shadow.html?raw"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

/**
 * The browser half of the server-drawn shadow roots' probe (epic `solid-2-final` P16):  the page `ssr.ssr.test.tsx`
 * drew paints styled BEFORE any script, and when the elements start, each one keeps what's there.
 * - Hydrated:  the same nodes, wired up;  no root ever painted empty;  nothing moved.
 * - A drawing that can't be claimed is drawn again in its place, in the same task:  no frame without it either.
 */
it("paints the server's shadow roots styled before any script;  each element then hydrates them, keeping its nodes", async () => {
  const container = await painted(ssrShadow)
  const roots = shadowRoots(container)
  expect(roots.length).toBe(7)
  const host = container.querySelector<DOMElement>("ui-button")!
  const button = host.shadowRoot!.querySelector("button")!
  expect(button.className).toBe("ui primary button")
  expect(getComputedStyle(button).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  const nodes = roots.map((root) => drawn(root))
  const box = button.getBoundingClientRect().toJSON()
  const frames = watchFrames(roots)

  // no hydration key missed, nothing drawn again
  const warnings: string[] = []
  const warn = console.warn
  console.warn = (...args: unknown[]) => void warnings.push(args.map(String).join(" "))
  await startElements()
  await ElementFixture.settle(container)
  console.warn = warn
  frames.stop()
  expect(warnings).toEqual([])

  expect(roots.map((root) => drawn(root))).toEqual(nodes)
  expect(frames.emptyRoots).toBe(0)
  expect(button.getBoundingClientRect().toJSON()).toEqual(box)
  // its own sheets are in:  the server's links went
  expect(roots.every((root) => !root.querySelector("link"))).toBe(true)
  expect(getComputedStyle(button).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  // and it's live:  a change reaches the very node the server drew
  host.setAttribute("color", "red")
  flush()
  expect(button.className).toBe("ui red button")
  container.remove()
})

it("a drawing it can't claim is drawn again in its place, with no frame empty, the focus kept", async () => {
  // the first button alone, under a tag nothing has defined yet, with no hydration keys:  nothing to claim
  const sheet = /<link[^>]*>/.exec(ssrShadow)![0]
  const button = /<ui-button[\s\S]*?<\/ui-button>/.exec(ssrShadow)![0]
  const html = sheet + button.replaceAll("ui-button", "ssr-button").replace(/ _hk=["']?[\w-]+["']?/g, "")
  const container = await painted(html)
  const roots = shadowRoots(container)
  const host = container.querySelector<DOMElement>("ssr-button")!
  const serverButton = host.shadowRoot!.querySelector("button")!
  serverButton.focus()
  const frames = watchFrames(roots)

  const { UIButton } = await import("spell/ui/components/ui-button")
  UIButton.define("ssr-button")
  await ElementFixture.settle(container)
  frames.stop()

  const drawnAgain = host.shadowRoot!.querySelector("button")!
  expect(drawnAgain).not.toBe(serverButton)
  expect(drawnAgain.className).toBe("ui primary button")
  expect(frames.emptyRoots).toBe(0)
  expect(host.shadowRoot!.activeElement).toBe(drawnAgain)
  container.remove()
})

/** `html` in the page, before its tags are defined;  resolves once every sheet it links is in. */
async function painted(html: string): Promise<HTMLElement> {
  const container = document.createElement("div")
  container.setHTMLUnsafe(html)
  document.body.append(container)
  const links = [container, ...shadowRoots(container)].flatMap((root) => [...root.querySelectorAll("link")])
  const waiting = links.filter((link) => !link.sheet)
  await Promise.all(waiting.map((link) => new Promise((done) => link.addEventListener("load", done))))
  return container
}

/** Load and define the families the page uses:  its elements start. */
async function startElements() {
  await Promise.all([
    import("spell/ui/components/ui-segment"),
    import("spell/ui/components/ui-button"),
    import("spell/ui/components/ui-card"),
    import("spell/ui/components/ui-parts")
  ])
}

/** Every shadow root under `container`, in document order. */
function shadowRoots(container: Element): ShadowRoot[] {
  return [...container.querySelectorAll("*")].flatMap((element) => (element.shadowRoot ? [element.shadowRoot] : []))
}

/** What `root` draws:  its element nodes, its sheets left out. */
function drawn(root: ShadowRoot): Element[] {
  return [...root.querySelectorAll("*")].filter((element) => element.localName !== "link")
}

/** Look at `roots` every frame until `stop()`:  how many times one had nothing drawn. */
function watchFrames(roots: readonly ShadowRoot[]) {
  const watch = { emptyRoots: 0, stop: () => cancelAnimationFrame(frame) }
  const look = () => {
    watch.emptyRoots += roots.filter((root) => !drawn(root).length).length
    frame = requestAnimationFrame(look)
  }
  let frame = requestAnimationFrame(look)
  return watch
}
