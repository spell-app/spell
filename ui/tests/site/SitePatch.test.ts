import { afterEach, describe, expect, it } from "vite-plus/test"

import { ExampleSource } from "spell-ui/docs-components/ui-docs-example/ExampleSource"
import { SitePatch } from "spell-ui/site/_src/SitePatch"

/**
 * `SitePatch`:  an edit to the shown page's file, patched into its `main` (epic `epic-engine` P40).
 * - the live client stood in for:  `SPELL_SERVER.readPage()` gives the page as loaded, and the test fires the
 *   change (`spell-server:reloading`) as the client would, with the new page
 */

/** A page of the site, `main` as given. */
function pageWith(main: string): string {
  return `<!doctype html><html><head><title>T</title></head><body><main id="main" class="site-main">${main}</main></body></html>`
}

const MAIN = `<ui-section id="examples-a" label="A"><p>Hello world</p>
  <ui-docs-example description="One."><ui-button>Follow</ui-button></ui-docs-example></ui-section>`

/** What a change did:  whether it was taken, and whether it asked to reload. */
type Taken = { taken: boolean; reloaded: boolean }

/** Show `main`, start a patch from it, and hand it `after`'s page:  what happened, once it's done. */
async function changed(before: string, after: string, own = false): Promise<Taken & { main: HTMLElement }> {
  const main = document.createElement("main")
  main.id = "main"
  main.className = "site-main"
  main.innerHTML = before
  document.body.append(main)
  Object.assign(globalThis, {
    SPELL_SERVER: { etag: '"e1"', readPage: async () => ({ html: pageWith(before), etag: '"e1"' }) }
  })
  const patch = new SitePatch({ main: () => main })
  patch.start()
  let reloaded = false
  const event = new CustomEvent("spell-server:reloading", {
    cancelable: true,
    detail: { html: pageWith(after), etag: '"e2"', own, reload: () => (reloaded = true) }
  })
  const taken = !dispatchEvent(event)
  // the update runs in its queue, after the baseline's read
  await new Promise((done) => setTimeout(done, 50))
  return { taken, reloaded, main }
}

afterEach(() => {
  for (const main of document.querySelectorAll("main#main")) main.remove()
})

describe("SitePatch", () => {
  it("edits a word in its text node, in place:  no reload", async () => {
    const text = () => document.querySelector("main#main p")!.firstChild
    const page = changed(MAIN, MAIN.replace("Hello world", "Hello there"))
    const before = text()
    const { taken, reloaded, main } = await page
    expect([taken, reloaded]).toEqual([true, false])
    expect(main.querySelector("p")!.firstChild).toBe(before)
    expect(main.querySelector("p")!.textContent).toBe("Hello there")
  })

  it("replaces a changed example whole, its new markup kept as its code", async () => {
    const { reloaded, main } = await changed(MAIN, MAIN.replace("Follow", "Unfollow"))
    expect(reloaded).toBe(false)
    const example = main.querySelector("ui-docs-example")!
    expect(ExampleSource.of(example)).toContain("Unfollow")
  })

  it("takes its own save as the baseline only", async () => {
    const { taken, reloaded, main } = await changed(MAIN, MAIN.replace("Hello world", "Hello there"), true)
    expect([taken, reloaded]).toEqual([true, false])
    expect(main.querySelector("p")!.textContent).toBe("Hello world")
  })
})
