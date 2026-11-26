import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { PageServer } from "spell/server/page"

/**
 * The live client's reload, in headless Chromium, on a page the page server serves (epic `epic-engine` I164):
 * the new page held behind the old one by a cross-document view transition (`holdReveal()`) until it's ready.
 * - each page logs, from before its own scripts (`addInitScript()`), whether it came in through a view transition,
 *   and when its animations were let go
 */
const root = mkdtempSync(join(tmpdir(), "srv-live-"))
let server: PageServer
let browser: Browser

/** A page long enough to scroll, with a section to address, and a field to type in. */
const PAGE = `<!doctype html><html><head><title>T</title></head><body><main>
  <input id="field" aria-label="Field">
  ${"<p>filler text</p>".repeat(150)}<section id="more"><p>More</p></section>${"<p>filler text</p>".repeat(150)}
</main></body></html>\n`

/** In the page, before anything else:  how it came in (`window.came`). */
function logArrival() {
  const came = { transition: false, heldAtStart: false, finished: false, drawnHidden: false }
  Object.assign(window, { came })
  const watchHidden = () => {
    if (document.documentElement?.style.opacity === "0") came.drawnHidden = true
    else requestAnimationFrame(watchHidden)
  }
  watchHidden()
  addEventListener("pagereveal", (event) => {
    const transition = (event as Event & { viewTransition?: ViewTransition | null }).viewTransition
    if (!transition) return
    came.transition = true
    // after `holdReveal()`'s own `ready` handler, which pauses them
    void transition.ready.then(() =>
      queueMicrotask(() => {
        came.heldAtStart = document
          .getAnimations()
          .some((animation) => animation.playState === "paused" && animation.currentTime === 0)
      })
    )
    void transition.finished.then(() => (came.finished = true))
  })
}

beforeAll(async () => {
  mkdirSync(join(root, "docs"), { recursive: true })
  writeFileSync(join(root, "package.json"), JSON.stringify({ pageServer: { writable: ["docs"] } }))
  writeFileSync(join(root, "docs", "page.html"), PAGE)
  writeFileSync(join(root, "docs", "other.html"), PAGE.replace("<title>T</title>", "<title>Other</title>"))
  server = await new PageServer({ root }).start({ port: 0, routes: false, pidFile: false })
  browser = await chromium.launch()
}, 120_000)

afterAll(async () => {
  await browser?.close()
  await server?.stop()
  rmSync(root, { recursive: true, force: true })
})

/** The page, opened at `hash`, scrolled to `y`. */
async function opened(hash = "", y = 0): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
  await page.addInitScript(logArrival)
  await page.goto(`http://127.0.0.1:${server.info.port}/docs/page.html${hash}`)
  await page.waitForFunction(() => !!(window as { SPELL_SERVER?: { reloadNow?: unknown } }).SPELL_SERVER?.reloadNow)
  await page.evaluate((top) => scrollTo(0, top), y)
  return page
}

/** How the page that's showing now came in. */
function came(page: Page) {
  return page.evaluate(() => (window as unknown as { came: Record<string, boolean> }).came)
}

describe("liveClient's reload in a frame (VS Code's side bar):  no view transition, faded in", () => {
  it("draws the new page hidden, at its place, then shows it", async () => {
    const host = await browser.newPage({ viewport: { width: 800, height: 600 } })
    await host.addInitScript(logArrival)
    const url = `http://127.0.0.1:${server.info.port}/docs/page.html`
    await host.setContent(`<iframe src="${url}" style="width:700px;height:500px"></iframe>`)
    const frame = await (await host.waitForSelector("iframe")).contentFrame()
    await frame!.waitForFunction(() => !!(window as { SPELL_SERVER?: { reloadNow?: unknown } }).SPELL_SERVER?.reloadNow)
    await frame!.evaluate(() => {
      scrollTo(0, 900)
      Object.assign(window, { isOld: true })
      ;(window as unknown as { SPELL_SERVER: { reloadNow(): void } }).SPELL_SERVER.reloadNow()
    })
    await frame!.waitForFunction(
      () =>
        !(window as { isOld?: boolean }).isOld &&
        document.readyState === "complete" &&
        !document.documentElement.style.opacity &&
        !document.documentElement.style.transition
    )
    const state = await frame!.evaluate(() => ({
      y: scrollY,
      ...(window as unknown as { came: Record<string, boolean> }).came
    }))
    expect(state).toMatchObject({ y: 900, transition: false, drawnHidden: true })
    await host.close()
  })
})

describe("liveClient's reload:  the new page held behind the old one (holdReveal())", () => {
  it("cross-fades in through a view transition, held until it's ready, its scroll and `#id` kept", async () => {
    const page = await opened("#more", 1234)
    await Promise.all([
      page.waitForEvent("load"),
      page.evaluate(() => (window as unknown as { SPELL_SERVER: { reloadNow(): void } }).SPELL_SERVER.reloadNow())
    ])
    await page.waitForFunction(() => (window as unknown as { came: { finished: boolean } }).came.finished)
    expect(await came(page)).toMatchObject({ transition: true, heldAtStart: true, finished: true })
    expect(await page.evaluate(() => [Math.round(scrollY), location.hash])).toEqual([1234, "#more"])
    await page.close()
  })

  it("`reload()` in view reloads quietly (I172):  held and cross-faded, its scroll kept, no pill", async () => {
    const page = await opened("", 1234)
    await Promise.all([
      page.waitForEvent("load"),
      page.evaluate(() => (window as unknown as { SPELL_SERVER: { reload(): void } }).SPELL_SERVER.reload())
    ])
    await page.waitForFunction(() => (window as unknown as { came: { finished: boolean } }).came.finished)
    expect(await came(page)).toMatchObject({ transition: true, heldAtStart: true, finished: true })
    expect(await page.evaluate(() => Math.round(scrollY))).toBe(1234)
    expect(await page.locator("body > button").count()).toBe(0)
    await page.close()
  })

  it("`reload()` waits while the reader types in a field, and reloads once it loses the focus (I172)", async () => {
    const page = await opened()
    const origin = await page.evaluate(() => performance.timeOrigin)
    await page.getByLabel("Field").fill("half a thought")
    await page.evaluate(() => (window as unknown as { SPELL_SERVER: { reload(): void } }).SPELL_SERVER.reload())
    await page.waitForTimeout(800)
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin)
    await Promise.all([page.waitForEvent("load"), page.evaluate(() => (document.activeElement as HTMLElement).blur())])
    expect(await page.evaluate(() => performance.timeOrigin)).not.toBe(origin)
    await page.close()
  })

  it("a field focused but not typed in doesn't hold a reload", async () => {
    const page = await opened()
    await page.getByLabel("Field").focus()
    await Promise.all([
      page.waitForEvent("load"),
      page.evaluate(() => (window as unknown as { SPELL_SERVER: { reload(): void } }).SPELL_SERVER.reload())
    ])
    await page.close()
  })

  it("leaves every other navigation as it was:  no transition into a page a link opens", async () => {
    const page = await opened()
    await Promise.all([page.waitForEvent("load"), page.evaluate(() => location.assign("/docs/other.html"))])
    await page.waitForTimeout(300)
    expect((await came(page)).transition).toBe(false)
    await page.close()
  })
})

// epic `epic-engine` P54:  Spell UI's `<ui-root>` tells the page server of a stale catalog
describe("liveClient's reportStale()", () => {
  it("posts once a page, with the write token:  the page's path and the stale tag", async () => {
    const page = await opened()
    const posts: { headers: Record<string, string>; body: unknown }[] = []
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/server/stale"))
        posts.push({ headers: request.headers(), body: request.postDataJSON() })
    })
    await page.evaluate(() => {
      const server = (window as unknown as { SPELL_SERVER: { reportStale(cause: unknown): void } }).SPELL_SERVER
      server.reportStale({ tag: "ui-menu", missing: ["choose"] })
      server.reportStale({ tag: "ui-menu", missing: ["choose"] })
    })
    await page.waitForTimeout(200)
    expect(posts).toHaveLength(1)
    expect(posts[0]!.headers["x-server-token"]).toBe(server.web.guard.token)
    expect(posts[0]!.body).toEqual({ path: "/docs/page.html", tag: "ui-menu", missing: ["choose"] })
    await page.close()
  })
})

// epic `epic-engine` I272:  Owen couldn't paste a picture into an item's note box in VS Code's Review tab
describe("liveClient's paste of a picture the extension read off the clipboard (VS Code's side bar)", () => {
  /** A 1 x 1 PNG, as `ClipboardImage.read()` hands it over. */
  const PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

  it("reaches the field typed in, inside shadow roots, as a paste event carrying the file", async () => {
    const host = await browser.newPage({ viewport: { width: 800, height: 600 } })
    const url = `http://127.0.0.1:${server.info.port}/docs/page.html`
    await host.setContent(`<iframe src="${url}" style="width:700px;height:500px"></iframe>`)
    const frame = await (await host.waitForSelector("iframe")).contentFrame()
    await frame!.waitForFunction(() => !!(window as { SPELL_SERVER?: { reloadNow?: unknown } }).SPELL_SERVER?.reloadNow)
    // a note box as `<epic-review>` draws one:  its paste listener inside its shadow root, around a textarea
    // that is itself inside another shadow root (`<ui-textarea>`'s)
    await frame!.evaluate(() => {
      const box = document.createElement("div")
      document.body.prepend(box)
      const outer = box.attachShadow({ mode: "open" })
      const wrapper = document.createElement("div")
      outer.append(wrapper)
      const field = document.createElement("span")
      wrapper.append(field)
      const inner = field.attachShadow({ mode: "open", delegatesFocus: true })
      const textarea = document.createElement("textarea")
      inner.append(textarea)
      const got: string[] = []
      Object.assign(window, { got })
      wrapper.addEventListener("paste", (event) => {
        const file = (event as ClipboardEvent).clipboardData?.files[0]
        got.push(file ? `${file.type} ${file.size}` : "no file")
      })
      textarea.focus()
    })
    // as VS Code's view passes on the extension's answer (`DocView.ts` `edit()`)
    await host.evaluate((image) => {
      document.querySelector("iframe")!.contentWindow!.postMessage({ spell: "edit", command: "paste", image }, "*")
    }, PNG)
    await frame!.waitForFunction(() => (window as unknown as { got: string[] }).got.length > 0, undefined, {
      timeout: 5000
    })
    expect(await frame!.evaluate(() => (window as unknown as { got: string[] }).got)).toEqual(["image/png 70"])
    await host.close()
  })
})

// epic `epic-engine` I293 (Owen:  "many merges into main -- can we avoid reloading the epic pages when that happens?"):
// a server restart alone doesn't reload a page;  a script it runs that changed waits until the reader is away
describe("liveClient after a server restart", () => {
  /** a page that runs a script of its own */
  const RUNS = PAGE.replace("</head>", `<script src="/docs/app.js"></script></head>`)

  /** stop the page server, and start a new run on the same port */
  async function restart() {
    const port = server.info.port
    await server.stop()
    server = await new PageServer({ root }).start({ port, routes: false, pidFile: false })
  }

  /** the page, open, with a marker a reload would lose, once it has noted what its scripts hold */
  async function marked(): Promise<Page> {
    writeFileSync(join(root, "docs", "runs.html"), RUNS)
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${server.info.port}/docs/runs.html`)
    await page.waitForFunction(() => !!(window as { SPELL_SERVER?: { reloadNow?: unknown } }).SPELL_SERVER?.reloadNow)
    await page.evaluate(() => Object.assign(window, { marker: 1 }))
    // `rememberVersions()` waits 2s for the page's fetches to go quiet
    await page.waitForTimeout(2600)
    return page
  }

  const markerOf = (page: Page) => page.evaluate(() => (window as unknown as { marker?: number }).marker)
  const tokenOf = (page: Page) =>
    page.evaluate(() => (window as unknown as { SPELL_SERVER: { token: string } }).SPELL_SERVER.token)

  it("takes the new run's token and doesn't reload when its scripts are the same", async () => {
    writeFileSync(join(root, "docs", "app.js"), "window.app = 1\n")
    const page = await marked()
    const before = await tokenOf(page)
    await restart()
    await page.waitForFunction(
      (old) => (window as unknown as { SPELL_SERVER: { token: string } }).SPELL_SERVER.token !== old,
      before,
      {
        timeout: 15_000
      }
    )
    expect(await tokenOf(page)).toBe(server.web.guard.token)
    await page.waitForTimeout(1500)
    expect(await markerOf(page)).toBe(1)
    await page.close()
  }, 30_000)

  it("a script it runs changed:  waits for the reader to be away, not reloading at once", async () => {
    writeFileSync(join(root, "docs", "app.js"), "window.app = 1\n")
    const page = await marked()
    await page.mouse.move(10, 10)
    await page.mouse.down()
    await page.mouse.up()
    await restart()
    writeFileSync(join(root, "docs", "app.js"), "window.app = 2\n")
    await page.waitForTimeout(4000)
    expect(await markerOf(page)).toBe(1)
    await page.close()
  }, 30_000)
})

// epic `epic-engine` I309 (Owen, of VS Code's side bar sitting grey:  "This is happening a lot, several times an hour"):
// a reload asked for while the server is down waits for it, never loading the browser's error page
describe("liveClient's reload while the server is down", () => {
  it("waits for the server to come back, then reloads the page itself", async () => {
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${server.info.port}/docs/page.html`)
    await page.waitForFunction(() => !!(window as { SPELL_SERVER?: { reload?: unknown } }).SPELL_SERVER?.reload)
    await page.evaluate(() => Object.assign(window, { marker: 1 }))
    const down = page.evaluate(() => new Promise((resolve) => addEventListener("spell-server:down", resolve)))
    const port = server.info.port
    // its socket open first:  only an open socket's closing says the server went down
    await page.waitForTimeout(1000)
    await server.stop()
    await down
    await page.evaluate(() => (window as unknown as { SPELL_SERVER: { reload(): void } }).SPELL_SERVER.reload())
    await page.waitForTimeout(1500)
    // still the page, not an error page:  nothing navigated
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1)
    server = await new PageServer({ root }).start({ port, routes: false, pidFile: false })
    await page.waitForFunction(() => !(window as unknown as { marker?: number }).marker && !!document.title, null, {
      timeout: 15_000
    })
    expect(await page.title()).toBe("T")
    await page.close()
  }, 30_000)
})

// epic `solid-2-final` P1:  every change anywhere in the kit made the editor search its ~400 script tags
describe("liveClient's changes to files the page never loaded", () => {
  it("a burst of 1,000 does no script work:  the page's script tags searched not once", async () => {
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${server.info.port}/docs/page.html`)
    await page.waitForFunction(() => !!(window as { SPELL_SERVER?: { reload?: unknown } }).SPELL_SERVER?.reload)
    const searches = await page.evaluate(() => {
      let count = 0
      const search = Document.prototype.querySelectorAll
      Document.prototype.querySelectorAll = function (this: Document, selectors: string) {
        if (selectors.includes("script[src]")) count++
        return search.call(this, selectors)
      } as typeof search
      const change = (window as unknown as { __spellLiveChange(path: string): void }).__spellLiveChange
      for (let index = 0; index < 1000; index++)
        change(index % 2 ? `/parser/src/x${index}.ts` : `/ui/src/styles/x${index}.css`)
      return count
    })
    expect(searches).toBe(0)
    await page.close()
  }, 30_000)
})

// epic `editor` T178:  a rebuild after an update holds what a page loads
describe("liveClient's box while a rebuild holds the page", () => {
  /** A page whose element still waits for its code, as a Spell UI element does (`:state(pending)`), until `ready()`. */
  const HELD = `<!doctype html><html><head><title>Held</title></head><body><x-held></x-held><script>
    customElements.define("x-held", class extends HTMLElement {
      constructor() { super(); this.internals = this.attachInternals(); this.internals.states.add("pending") }
    })
    window.ready = () => document.querySelector("x-held").internals.states.delete("pending")
  </script></body></html>\n`

  /** The box's words, or `null` while there's none. */
  const box = (page: Page) =>
    page.evaluate(() => document.querySelector<HTMLElement>('[role="status"][data-spell-added]')?.innerText ?? null)

  it("says Spell was just updated while the page is held;  gone once it's ready, or the rebuild ends", async () => {
    writeFileSync(join(root, "docs", "held.html"), HELD)
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${server.info.port}/docs/held.html`)
    await page.waitForFunction(() => (window as { SPELL_SERVER?: { connected?: boolean } }).SPELL_SERVER?.connected)
    const live = server.web.live!
    live.keep("bundles-waiting", { build: root, waiting: true }, "t178")
    await page.waitForFunction(() => !!document.querySelector('[role="status"][data-spell-added]'))
    expect(await box(page)).toBe(
      "Spell was just updated.\nGetting this page ready…\nIt shows up by itself in a moment."
    )
    await page.evaluate(() => (window as unknown as { ready(): void }).ready())
    await page.waitForFunction(() => !document.querySelector('[role="status"][data-spell-added]'))
    // held again, then the rebuild ends:  gone at once
    await page.evaluate(() =>
      (document.querySelector("x-held") as HTMLElement & { internals: ElementInternals }).internals.states.add(
        "pending"
      )
    )
    await page.waitForFunction(() => !!document.querySelector('[role="status"][data-spell-added]'))
    live.drop("bundles-waiting", { build: root, waiting: false }, "t178")
    await page.waitForFunction(() => !document.querySelector('[role="status"][data-spell-added]'))
    await page.close()
  })

  it("a page that connects while the rebuild runs hears it too;  one not held shows nothing", async () => {
    writeFileSync(join(root, "docs", "held.html"), HELD)
    const live = server.web.live!
    live.keep("bundles-waiting", { build: root, waiting: true }, "t178")
    const held = await browser.newPage()
    await held.goto(`http://127.0.0.1:${server.info.port}/docs/held.html`)
    await held.waitForFunction(() => !!document.querySelector('[role="status"][data-spell-added]'))
    const plain = await opened()
    await plain.waitForTimeout(1200)
    expect(await box(plain)).toBeNull()
    live.drop("bundles-waiting", { build: root, waiting: false }, "t178")
    await Promise.all([held.close(), plain.close()])
  })
})
