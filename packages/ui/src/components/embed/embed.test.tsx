import { beforeEach, describe, expect, it } from "vitest"
import { userEvent } from "vitest/browser"

import { UI } from "$/runtime"
import type { EmbedActivateDetail } from "$/components/components.types"
import { expectAccessible } from "$test/a11y"
import { Fixture } from "$test/fixture"

import { ElementFixture } from "$test/ElementFixture"
import type { UIHost } from "$/elements"

import { EmbedSources } from "./EmbedSources"

import "$/components/embed"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/embed/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** An embed host with its script API. */
type Embed = UIHost & { active: boolean; parameters: unknown; activate(): boolean; reset(): void }

/**
 * A SAME-ORIGIN page to frame, so activation tests never reach the network (a file the dev server has anyway).
 * - Third-party URLs are only ever asserted, through a cancelled `ui-activate` or `EmbedSources` directly.
 */
const LOCAL = new URL("/src/components/embed/examples/types.html", location.href).href

/** Render one `<ui-embed>`;  returns it with its box. */
async function embed(html: string) {
  const host = await ElementFixture.render<Embed>(html)
  const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=embed]")!
  return { host, root }
}

/** Resolves with the next `name` event. */
function next<T>(target: EventTarget, name: string) {
  return new Promise<CustomEvent<T>>((resolve) =>
    target.addEventListener(name, (event) => resolve(event as CustomEvent<T>), { once: true })
  )
}

/** Resource entries that went to a video host. */
function thirdPartyRequests() {
  return performance.getEntriesByType("resource").filter(({ name }) => /youtube|vimeo|ytimg/.test(name))
}

beforeEach(async () => {
  await UI.load()
})

describe("<ui-embed> definition", () => {
  it("registers its texts with UI.i18n when DEFINED", () => {
    expect(UI.i18n.t("embedPlay", { name: "x" })).toBe("Play x")
    expect(UI.i18n.t("embedVideo")).toBe("video")
  })
})

describe("<ui-embed> classes", () => {
  it.each([
    ["", "ui embed"],
    ['aspect-ratio="4:3"', "ui embed 4:3"],
    ['aspect-ratio="square"', "ui embed square"],
    [`active url="${LOCAL}"`, "ui active embed"]
  ])("<ui-embed %s>", async (attributes, classes) => {
    const { root } = await embed(`<ui-embed ${attributes}></ui-embed>`)
    expect(root.localName).toBe("div")
    expect(root.className).toBe(classes)
  })

  it("draws its box at the aspect ratio", async () => {
    const { root } = await embed(`<ui-embed style="width: 320px"></ui-embed>`)
    expect(root.getBoundingClientRect().height).toBeCloseTo(180, 0)
    const { root: square } = await embed(`<ui-embed aspect-ratio="square" style="width: 200px"></ui-embed>`)
    expect(square.getBoundingClientRect().height).toBeCloseTo(200, 0)
  })
})

describe("<ui-embed> placeholder", () => {
  it("renders a named play button with the placeholder image and icon, and NO frame", async () => {
    const { root } = await embed(
      `<ui-embed source="youtube" video-id="abc" placeholder="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" label="Intro"></ui-embed>`
    )
    const button = root.querySelector<HTMLButtonElement>("[part~=play]")!
    expect(button.localName).toBe("button")
    expect(button.type).toBe("button")
    expect(button.getAttribute("aria-label")).toBe("Play Intro")
    expect([...button.children].map((child) => child.getAttribute("part") ?? child.localName)).toEqual([
      "placeholder",
      "icon",
      "slot"
    ])
    expect(button.querySelector("img")!.alt).toBe("")
    await expect.poll(() => button.querySelector("[part~=icon] svg")).not.toBeNull()
    expect(root.querySelector("iframe")).toBeNull()
    expect(thirdPartyRequests()).toEqual([])
  })

  it("names itself by label, then alt, then the kind of content", async () => {
    const label = async (attributes: string) =>
      (await embed(`<ui-embed ${attributes}></ui-embed>`)).root.querySelector("button")!.getAttribute("aria-label")
    expect(await label(`source="vimeo" video-id="1"`)).toBe("Play video")
    expect(await label(`url="${LOCAL}"`)).toBe("Play embedded content")
    expect(await label(`url="https://www.youtube.com/embed/x"`)).toBe("Play video")
    expect(await label(`source="vimeo" video-id="1" alt="A cat"`)).toBe("Play A cat")
  })

  it('has no icon with icon=""', async () => {
    const { root } = await embed(`<ui-embed icon=""></ui-embed>`)
    expect(root.querySelector("[part~=icon]")).toBeNull()
  })
})

describe("<ui-embed> activation", () => {
  it("loads the frame on a click:  ui-activate with the url, active, a titled iframe", async () => {
    const { host, root } = await embed(`<ui-embed url="${LOCAL}" label="Local page"></ui-embed>`)
    const activated = next<EmbedActivateDetail>(host, "ui-activate")
    await userEvent.click(root.querySelector("button")!)
    const event = await activated
    expect(event.cancelable).toBe(true)
    expect(event.detail.url).toBe(LOCAL)
    expect(event.detail.originalEvent).toBeInstanceOf(MouseEvent)
    await ElementFixture.tick()
    expect(host.active).toBe(true)
    expect(host.matches(":state(active)")).toBe(true)
    const frame = root.querySelector("iframe")!
    expect(frame.src).toBe(LOCAL)
    expect(frame.title).toBe("Local page")
    expect(frame.allowFullscreen).toBe(true)
    expect(frame.parentElement!.getAttribute("part")).toBe("frame")
    expect(root.querySelector("button")).toBeNull()
  })

  it("builds a privacy-enhanced YouTube URL with autoplay -- asserted, never loaded", async () => {
    const { host, root } = await embed(`<ui-embed source="youtube" video-id="O6Xo21L0ybE"></ui-embed>`)
    host.addEventListener("ui-activate", (event) => event.preventDefault())
    const activated = next<EmbedActivateDetail>(host, "ui-activate")
    root.querySelector("button")!.click()
    const url = new URL((await activated).detail.url)
    expect(url.origin + url.pathname).toBe("https://www.youtube-nocookie.com/embed/O6Xo21L0ybE")
    expect(url.searchParams.get("autoplay")).toBe("1")
    await ElementFixture.tick()
    expect(host.active).toBe(false)
    expect(root.querySelector("iframe")).toBeNull()
    expect(thirdPartyRequests()).toEqual([])
  })

  it("activates from the keyboard and moves focus into the frame", async () => {
    const { host } = await embed(`<ui-embed url="${LOCAL}"></ui-embed>`)
    const before = Fixture.render<HTMLButtonElement>(`<button>Before</button>`)
    host.before(before)
    before.focus()
    await userEvent.tab()
    expect(host.shadowRoot!.activeElement?.getAttribute("part")).toBe("play")
    await userEvent.keyboard("{Enter}")
    await expect.poll(() => host.shadowRoot!.activeElement?.localName).toBe("iframe")
  })

  it("activates with Space too", async () => {
    const { host } = await embed(`<ui-embed url="${LOCAL}"></ui-embed>`)
    host.shadowRoot!.querySelector<HTMLButtonElement>("button")!.focus()
    await userEvent.keyboard(" ")
    await expect.poll(() => host.active).toBe(true)
  })

  it("stays a placeholder when ui-activate is cancelled", async () => {
    const { host, root } = await embed(`<ui-embed url="${LOCAL}"></ui-embed>`)
    host.addEventListener("ui-activate", (event) => event.preventDefault())
    await userEvent.click(root.querySelector("button")!)
    expect(host.active).toBe(false)
    expect(root.querySelector("iframe")).toBeNull()
  })

  it("refuses a non-http(s) url:  nothing loads", async () => {
    const { host, root } = await embed(`<ui-embed url="javascript:alert(1)"></ui-embed>`)
    const events: Event[] = []
    host.addEventListener("ui-activate", (event) => events.push(event))
    root.querySelector("button")!.click()
    await ElementFixture.tick()
    expect(events).toEqual([])
    expect(host.active).toBe(false)
    expect(host.activate()).toBe(false)
  })

  it("loads without an event when `active` is written, and resets back with ui-reset", async () => {
    const { host, root } = await embed(`<ui-embed url="${LOCAL}"></ui-embed>`)
    const events: string[] = []
    for (const name of ["ui-activate", "ui-reset"]) host.addEventListener(name, () => events.push(name))
    host.active = true
    await ElementFixture.tick()
    expect(root.querySelector("iframe")).not.toBeNull()
    host.reset()
    await ElementFixture.tick()
    expect(root.querySelector("iframe")).toBeNull()
    expect(root.querySelector("button")).not.toBeNull()
    expect(events).toEqual(["ui-reset"])
    expect(host.activate()).toBe(true)
    expect(events).toEqual(["ui-reset", "ui-activate"])
  })

  it("adds `parameters` (property or JSON attribute) to the frame url", async () => {
    const { host, root } = await embed(`<ui-embed url="${LOCAL}" parameters='{"start": 30}'></ui-embed>`)
    host.active = true
    await ElementFixture.tick()
    expect(new URL(root.querySelector("iframe")!.src).searchParams.get("start")).toBe("30")
    host.parameters = { start: 40, mute: true }
    await ElementFixture.tick()
    const url = new URL(root.querySelector("iframe")!.src)
    expect(url.searchParams.get("start")).toBe("40")
    expect(url.searchParams.get("mute")).toBe("1")
  })
})

describe("EmbedSources", () => {
  it("fills the source's URL and its player parameters", () => {
    const youtube = new URL(EmbedSources.resolve({ source: "youtube", id: "a b", autoplay: false, brandedUI: false })!)
    expect(youtube.pathname).toBe("/embed/a%20b")
    expect(Object.fromEntries(youtube.searchParams)).toEqual({
      autohide: "1",
      autoplay: "0",
      hq: "1",
      modestbranding: "1"
    })
    const vimeo = new URL(EmbedSources.resolve({ source: "vimeo", id: "42", autoplay: true, brandedUI: true })!)
    expect(vimeo.origin + vimeo.pathname).toBe("https://player.vimeo.com/video/42")
    expect(Object.fromEntries(vimeo.searchParams)).toEqual({ autoplay: "1", byline: "1", portrait: "1", title: "1" })
  })

  it("recognises a source by its url's domain, and leaves other urls' parameters alone", () => {
    expect(EmbedSources.sourceOf("https://player.vimeo.com/video/1")).toBe("vimeo")
    expect(EmbedSources.sourceOf("https://www.youtube.com/embed/1")).toBe("youtube")
    expect(EmbedSources.sourceOf("https://notyoutube.com/x")).toBeUndefined()
    expect(EmbedSources.resolve({ url: "https://example.com/a?b=1", autoplay: true, brandedUI: false })).toBe(
      "https://example.com/a?b=1"
    )
  })

  it("refuses non-http(s) urls and needs an id or url", () => {
    expect(EmbedSources.resolve({ url: "javascript:alert(1)", autoplay: true, brandedUI: false })).toBeUndefined()
    expect(EmbedSources.resolve({ url: "data:text/html,x", autoplay: true, brandedUI: false })).toBeUndefined()
    expect(EmbedSources.resolve({ source: "youtube", autoplay: true, brandedUI: false })).toBeUndefined()
  })
})

describe("<ui-embed> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s, loading nothing third-party", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
    expect(thirdPartyRequests()).toEqual([])
  })
})
