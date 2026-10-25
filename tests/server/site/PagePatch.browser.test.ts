import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { chromium, type Browser, type Page } from "playwright"
import { build } from "vite"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { PageServer } from "spell/server/page"

/**
 * `PagePatch`'s runner and a whole page's patch, in headless Chromium, on a page the page server serves
 * (epic `epic-engine` P40);  the planner's steps alone:  `PagePatch.test.ts`.
 * - the patcher, bundled from its source (`build()`, into the checkout as `/patch.js`), with a small runtime of the
 *   page's own:  it takes the live client's `spell-server:reloading` and patches `main`
 * - the change comes WITH the page (`LiveReload.pages`):  the test counts the fetches of it
 */
const SOURCE = resolve(import.meta.dirname, "../../../src/server/site/PagePatch.ts")

const root = mkdtempSync(join(tmpdir(), "srv-patch-"))
const PAGE = join(root, "docs", "page.html")
let server: PageServer
let browser: Browser

/** The page's `main`, inside its markup. */
const MAIN = `<main>
  <section id="intro"><p>Hello world, from the page.</p><p><input id="field" type="text"></p></section>
  <section id="more"><p>One</p><p>Two</p></section>
</main>`

/** The page's runtime:  its patcher, its baseline, and what each change did (`window.patches`). */
const RUNTIME = `<script>
  window.patcher = new PagePatchTest.PagePatch({ skip: "[data-spell-added]" })
  window.patches = []
  const parse = (html) => new DOMParser().parseFromString(html, "text/html")
  let base
  addEventListener("DOMContentLoaded", () => (base = window.SPELL_SERVER.readPage().then(({ html }) => html)))
  addEventListener("spell-server:reloading", async (event) => {
    event.preventDefault()
    const { html, own } = event.detail
    const before = await base
    base = Promise.resolve(html)
    if (own) return window.patches.push("own")
    const done = window.patcher.page({
      before: parse(before), after: parse(html), live: document.querySelector("main"), mainOf: (r) => r.querySelector("main")
    })
    window.patches.push(done ? done.steps : null)
  })
</script>`

/** The page's markup, `main` as given. */
function pageWith(main: string, title = "T"): string {
  return `<!doctype html><html><head><title>${title}</title><script src="/patch.js"></script></head><body>${main}${RUNTIME}</body></html>\n`
}

beforeAll(async () => {
  await build({
    configFile: false,
    logLevel: "silent",
    build: {
      outDir: root,
      emptyOutDir: false,
      minify: false,
      lib: { entry: SOURCE, formats: ["iife"], name: "PagePatchTest", fileName: () => "patch.js" }
    }
  })
  mkdirSync(join(root, "docs"), { recursive: true })
  writeFileSync(join(root, "package.json"), JSON.stringify({ pageServer: { writable: ["docs"] } }))
  server = await new PageServer({ root }).start({ port: 0, routes: false, pidFile: false })
  server.web.live!.watch(join(root, "docs"))
  browser = await chromium.launch()
}, 120_000)

afterAll(async () => {
  await browser?.close()
  await server?.stop()
  rmSync(root, { recursive: true, force: true })
})

/** The page, opened fresh, its nodes marked (`window.marked`), `window.loads` counting fetches of the page. */
async function opened(main = MAIN): Promise<Page> {
  writeFileSync(PAGE, pageWith(main))
  // the server reports a file once it's quiet:  the write above must not reach the page as a change
  await new Promise((done) => setTimeout(done, 600))
  const page = await browser.newPage()
  let loads = 0
  page.on("request", (request) => request.url().endsWith("/docs/page.html") && loads++)
  ;(page as Page & { loads: () => number }).loads = () => loads
  await page.goto(`http://127.0.0.1:${server.info.port}/docs/page.html`)
  await page.waitForFunction(() => !!(window as { SPELL_SERVER?: { readPage?: unknown } }).SPELL_SERVER?.readPage)
  await page.evaluate(() => {
    const main = document.querySelector("main")!
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
    const marked: Node[] = []
    for (let node: Node | null = walker.currentNode; node; node = walker.nextNode()) marked.push(node)
    Object.assign(window, { marked, alive: true })
  })
  return page
}

/** Write `main` as the page's, and wait for the page to take it:  what the patch did. */
async function edited(page: Page, main: string, title = "T"): Promise<unknown> {
  const count = await page.evaluate(() => (window as unknown as { patches: unknown[] }).patches.length)
  writeFileSync(PAGE, pageWith(main, title))
  await page.waitForFunction((n) => (window as unknown as { patches: unknown[] }).patches.length > n, count, {
    timeout: 5000
  })
  return page.evaluate(() => (window as unknown as { patches: unknown[] }).patches.at(-1))
}

/** How many of the nodes marked at load have left the page. */
function gone(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { marked: Node[] }).marked.filter((n) => !n.isConnected).length)
}

describe("PagePatch on a served page", () => {
  it("edits one word in its text node:  the same node, no reload, no fetch, focus and typed text kept", async () => {
    const page = await opened()
    const loads = (page as Page & { loads: () => number }).loads()
    await page.fill("#field", "typed by the reader")
    await page.focus("#field")
    const text = await page.evaluateHandle(() => document.querySelector("#intro p")!.firstChild)
    const steps = await edited(page, MAIN.replace("Hello world", "Hello there"))
    expect(steps).toEqual([
      {
        op: "text",
        target: "#intro/p[1]/text()[1]",
        text: "Hello there, from the page.",
        from: "Hello world, from the page."
      }
    ])
    expect(await text.evaluate((node) => [node?.isConnected, node?.textContent])).toEqual([
      true,
      "Hello there, from the page."
    ])
    expect(await gone(page)).toBe(0)
    expect(await page.evaluate(() => [(window as { alive?: boolean }).alive, document.activeElement?.id])).toEqual([
      true,
      "field"
    ])
    expect(await page.inputValue("#field")).toBe("typed by the reader")
    // the page came with the change:  not fetched again (once at load, once for the baseline)
    expect((page as Page & { loads: () => number }).loads()).toBe(loads)
    await page.close()
  })

  it("adds and removes paragraphs where they go, the others the same nodes;  the title follows", async () => {
    const page = await opened()
    const steps = await edited(
      page,
      MAIN.replace("<p>One</p>", "<p>Zero</p><p>One</p>").replace("<p>Two</p>", ""),
      "New title"
    )
    expect(steps).toHaveLength(2)
    expect(await page.evaluate(() => [...document.querySelectorAll("#more p")].map((p) => p.textContent))).toEqual([
      "Zero",
      "One"
    ])
    // `Two`, its text, and nothing else
    expect(await gone(page)).toBe(2)
    expect(await page.title()).toBe("New title")
    await page.close()
  })

  it("never replaces what holds the field being typed in;  the rest goes on", async () => {
    // a long page:  replacing the section is far less than half of it, so the patch isn't refused for its size
    const long = MAIN.replace("</main>", `<section id="filler">${"<p>filler text</p>".repeat(40)}</section></main>`)
    const page = await opened(long.replace(`<section id="intro">`, `<section id="intro"><pre>a</pre>`))
    await page.focus("#field")
    // the section turns into another kind:  it would be replaced, but it holds the reader's field
    const steps = await edited(
      page,
      long
        .replace(`<section id="intro">`, `<article id="intro"><pre>a</pre>`)
        .replace('</p></section>\n  <section id="more">', '</p></article>\n  <section id="more">')
        .replace("<p>Two</p>", "<p>Three</p>")
    )
    expect(steps).not.toBeNull()
    expect(
      await page.evaluate(() => [document.activeElement?.id, document.querySelector("#more")!.textContent])
    ).toEqual(["field", "OneThree"])
    await page.close()
  })

  it("takes its own save back as `own`:  not patched in again", async () => {
    const page = await opened()
    const html = pageWith(MAIN.replace("One", "Uno"))
    const saved = await page.evaluate(async (text) => {
      const server = (window as unknown as { SPELL_SERVER: Record<string, any> }).SPELL_SERVER
      return server.saveFile({ path: server.file, text, etag: server.etag, shown: true })
    }, html)
    expect(saved.ok).toBe(true)
    await page.waitForFunction(() => (window as unknown as { patches: unknown[] }).patches.length > 0)
    expect(await page.evaluate(() => (window as unknown as { patches: unknown[] }).patches)).toEqual(["own"])
    // the page still shows what it showed:  its own save wrote it, so the patcher left it
    expect(await page.textContent("#more p")).toBe("One")
    expect(readFileSync(PAGE, "utf8")).toContain("Uno")
    await page.close()
  })
})

describe("PagePatch.run()", () => {
  it("moves a keyed node as itself, and never touches inside an open editor", async () => {
    const page = await opened()
    const result = await page.evaluate(() => {
      const patcher = (window as unknown as { patcher: any }).patcher
      const host = document.createElement("div")
      host.innerHTML = `<section id="a"><p id="k">k</p></section><section id="b"><div class="cell" data-spell-editor>e</div></section>`
      document.body.append(host)
      const k = host.querySelector("#k")
      const parse = (html: string) => {
        const div = document.createElement("div")
        div.innerHTML = html
        return div
      }
      const steps = patcher.plan(
        parse(
          `<section id="a"><p id="k">k</p></section><section id="b"><div class="cell" data-spell-editor></div></section>`
        ),
        parse(
          `<section id="a"></section><section id="b"><div class="cell" data-spell-editor><p>new</p></div><p id="k">k</p></section>`
        )
      )
      const run = patcher.run(steps, host)
      return {
        steps: steps.length,
        moved: host.querySelector("#b #k") === k,
        skipped: run.skipped,
        cell: host.querySelector(".cell")!.textContent
      }
    })
    // the move;  the insert into the cell holding the editor is left alone
    expect(result).toEqual({ steps: 2, moved: true, skipped: 1, cell: "e" })
    await page.close()
  })

  it("throws a `PatchError` when the live page doesn't line up, before changing anything", async () => {
    const page = await opened()
    const result = await page.evaluate(() => {
      const patcher = (window as unknown as { patcher: any }).patcher
      const host = document.createElement("div")
      host.innerHTML = `<p>changed by someone</p><p>b</p>`
      const parse = (html: string) => {
        const div = document.createElement("div")
        div.innerHTML = html
        return div
      }
      const steps = patcher.plan(parse(`<p>a</p><p>b</p>`), parse(`<p>A</p><p>B</p>`))
      try {
        patcher.run(steps, host)
        return "ran"
      } catch (error) {
        return `${(error as Error).name} ${host.innerHTML}`
      }
    })
    expect(result).toBe("PatchError <p>changed by someone</p><p>b</p>")
    await page.close()
  })
})
