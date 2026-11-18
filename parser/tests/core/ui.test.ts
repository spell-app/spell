import { describe, test, expect, afterEach, onTestFinished, vi } from "vite-plus/test"
import { parseHTML } from "linkedom"

import { core } from "spell/parser/core"

/** A stand-in for the browser's `Audio`:  what each player was told. */
class FakeAudio {
  static made: FakeAudio[] = []
  preload = ""
  src = ""
  currentTime = 0
  paused = true
  plays = 0
  refuse?: Error
  constructor() {
    FakeAudio.made.push(this)
  }
  play(): Promise<void> {
    this.plays++
    this.paused = false
    return this.refuse ? Promise.reject(this.refuse) : Promise.resolve()
  }
  pause(): void {
    this.paused = true
  }
}

afterEach(() => {
  FakeAudio.made = []
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("core.play() / core.stop():  `play its sound`, `stop its sound` (epic `data` T145)", () => {
  test("play makes ONE player per sound file, loading at once, and plays it in the same moment", () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.play("https://example.com/one.ogg")
    expect(FakeAudio.made).toHaveLength(1)
    const [player] = FakeAudio.made
    expect(player).toMatchObject({ src: "https://example.com/one.ogg", preload: "auto", plays: 1, paused: false })
    core.play("https://example.com/one.ogg")
    expect(FakeAudio.made).toHaveLength(1)
    expect(player!.plays).toBe(2)
  })

  test("playing it again starts it over", () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.play("https://example.com/two.ogg")
    const [player] = FakeAudio.made
    player!.currentTime = 1.5
    core.play("https://example.com/two.ogg")
    expect(player!.currentTime).toBe(0)
  })

  test("stop pauses it and puts it back to its start;  a sound never played gets its player, loading", () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.stop("https://example.com/three.ogg")
    expect(FakeAudio.made).toHaveLength(1)
    const [player] = FakeAudio.made
    expect(player).toMatchObject({ preload: "auto", plays: 0, paused: true })
    core.play("https://example.com/three.ogg")
    player!.currentTime = 0.7
    core.stop("https://example.com/three.ogg")
    expect(player).toMatchObject({ paused: true, currentTime: 0, plays: 1 })
    expect(FakeAudio.made).toHaveLength(1)
  })

  test("no address, or no Audio (node):  nothing, and no throw", () => {
    vi.stubGlobal("Audio", FakeAudio)
    core.play(undefined)
    core.stop("")
    expect(FakeAudio.made).toHaveLength(0)
    vi.stubGlobal("Audio", undefined)
    expect(() => core.play("https://example.com/four.ogg")).not.toThrow()
  })

  test("a play the browser refuses is said on the program's console;  one `stop` cut short isn't", async () => {
    vi.stubGlobal("Audio", FakeAudio)
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    core.stop("https://example.com/five.ogg")
    FakeAudio.made[0]!.refuse = Object.assign(new Error("no"), { name: "NotAllowedError" })
    core.play("https://example.com/five.ogg")
    core.stop("https://example.com/six.ogg")
    FakeAudio.made[1]!.refuse = Object.assign(new Error("stopped"), { name: "AbortError" })
    core.play("https://example.com/six.ogg")
    await Promise.resolve()
    await Promise.resolve()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain("five.ogg")
  })

  test("a built-in sound's name plays its file, as the page's Spell UI says where it is (epic `mockup` P28)", () => {
    vi.stubGlobal("Audio", FakeAudio)
    const key = Symbol.for("spell-ui:runtime")
    const sounds = { url: (name: string) => (name === "card slide" ? "https://example.com/card-slide.ogg" : undefined) }
    ;(globalThis as Record<symbol, unknown>)[key] = { sounds }
    onTestFinished(() => delete (globalThis as Record<symbol, unknown>)[key])
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    core.play("card slide")
    expect(FakeAudio.made[0]).toMatchObject({ src: "https://example.com/card-slide.ogg", plays: 1 })
    core.play("no such sound")
    expect(FakeAudio.made).toHaveLength(1)
    expect(String(warn.mock.calls[0]![0])).toContain("no sound called")
  })

  test("a built-in sound's name on a page without Spell UI:  said, nothing plays, and a later play tries again", () => {
    vi.stubGlobal("Audio", FakeAudio)
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    core.play("win")
    expect(FakeAudio.made).toHaveLength(0)
    expect(String(warn.mock.calls[0]![0])).toContain("needs Spell UI")
  })
})

describe("core.alert() / warn() / confirm():  the dialog the page's Spell UI is asked for (epic `language` T143-T145)", () => {
  /** A stand-in for the page's Spell UI runtime:  what its dialogs were asked for. */
  function stubPageUI() {
    const asked: { method: string; options: unknown }[] = []
    const modals = {
      alert: (options: unknown) => (asked.push({ method: "alert", options }), Promise.resolve()),
      confirm: (options: unknown) => (asked.push({ method: "confirm", options }), Promise.resolve(true))
    }
    const page = { load: () => Promise.resolve(page), modals }
    const key = Symbol.for("spell-ui:runtime")
    ;(globalThis as Record<symbol, unknown>)[key] = page
    onTestFinished(() => delete (globalThis as Record<symbol, unknown>)[key])
    return asked
  }

  test("older compiled code's buttons, one by one, still work;  every message may be Markdown", async () => {
    const asked = stubPageUI()
    await core.alert("Yo!", "yep")
    await core.confirm("Sure?", "Yes", "No")
    expect(asked).toEqual([
      { method: "alert", options: { okText: "yep", cancelText: undefined, message: "Yo!", markdown: true } },
      { method: "confirm", options: { okText: "Yes", cancelText: "No", message: "Sure?", markdown: true } }
    ])
  })

  test("a title and a size, as `titled ... in big text` compiles them", async () => {
    const asked = stubPageUI()
    await core.alert("You won!", { title: "Solitaire", size: "big", okText: "New game" })
    await core.warn("Careful!", { title: "Deleting" })
    expect(await core.confirm("Deal?", { title: "Solitaire", okText: "Deal", cancelText: "Not now" })).toBe(true)
    expect(asked).toEqual([
      {
        method: "alert",
        options: { title: "Solitaire", size: "big", okText: "New game", message: "You won!", markdown: true }
      },
      { method: "alert", options: { title: "Deleting", message: "Careful!", markdown: true } },
      {
        method: "confirm",
        options: { title: "Solitaire", okText: "Deal", cancelText: "Not now", message: "Deal?", markdown: true }
      }
    ])
  })
})

describe('core.showDrawn() / hideDrawn():  `show "you won"`, by its name (epic `language` P61)', () => {
  /** A page holding `markup`, as `document`;  a view's shadow root holding `inView`, if given. */
  function pageWith(markup: string, inView?: string) {
    const page = parseHTML(`<!doctype html><html><body>${markup}</body></html>`)
    vi.stubGlobal("document", page.document)
    if (inView !== undefined) {
      const view = page.document.createElement("solitaire-card")
      view.attachShadow({ mode: "open" }).innerHTML = inView
      page.document.body.appendChild(view)
    }
    return page.document
  }

  /** The element with `id`, in `document` or a view's shadow root, as a modal:  its `visible`. */
  function modalIn(document: Document, id: string): { visible?: boolean } {
    const found =
      document.getElementById(id) ??
      [...document.querySelectorAll("*")].map((element) => element.shadowRoot?.getElementById(id)).find(Boolean)
    const modal = found as unknown as { visible?: boolean }
    modal.visible ??= false
    return modal
  }

  test("finds it by its words joined by -, and shows and hides it by its `visible`", () => {
    const document = pageWith('<ui-modal id="you-won"></ui-modal>')
    const modal = modalIn(document, "you-won")
    core.showDrawn("you won")
    expect(modal.visible).toBe(true)
    core.hideDrawn("you won")
    expect(modal.visible).toBe(false)
  })

  test("drawn inside a view's own shadow root too", () => {
    const document = pageWith("", '<ui-modal id="you-won"></ui-modal>')
    const modal = modalIn(document, "you-won")
    core.showDrawn("you won")
    expect(modal.visible).toBe(true)
  })

  test("nothing by that name:  a TypeError saying how to name one", () => {
    pageWith("<ui-text></ui-text>")
    expect(() => core.showDrawn("you lost")).toThrow(/nothing drawn is named "you lost";  name it on its tag/)
  })

  test("no page, as under node:  nothing", () => {
    vi.stubGlobal("document", undefined)
    expect(() => core.showDrawn("you won")).not.toThrow()
  })
})
