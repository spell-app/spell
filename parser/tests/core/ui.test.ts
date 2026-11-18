import { describe, test, expect, afterEach, onTestFinished, vi } from "vite-plus/test"
import { parseHTML } from "linkedom"

import { core } from "spell/parser/core"
import { closeDialogOf } from "spell/parser/core/ui"

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

  test("a test plays no sounds:  a program's tests run as it loads, before anyone clicks (epic `mockup` P28)", () => {
    vi.stubGlobal("Audio", FakeAudio)
    vi.spyOn(core.console, "groupCollapsed").mockImplementation(() => {})
    vi.spyOn(core.console, "groupEnd").mockImplementation(() => {})
    core.test("test counting", () => core.play("https://example.com/click.ogg"))
    expect(FakeAudio.made).toHaveLength(0)
    core.play("https://example.com/click.ogg")
    expect(FakeAudio.made[0]).toMatchObject({ plays: 1 })
  })

  test("a built-in sound's name on a page without Spell UI:  said, nothing plays, and a later play tries again", () => {
    vi.stubGlobal("Audio", FakeAudio)
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    core.play("win")
    expect(FakeAudio.made).toHaveLength(0)
    expect(String(warn.mock.calls[0]![0])).toContain("needs Spell UI")
  })
})

describe("core.alert() / warn() / confirm() / prompt():  the dialog the page's Spell UI is asked for (epic `language` T143-T145)", () => {
  /** A stand-in for the page's Spell UI runtime:  what its dialogs were asked for. */
  function stubPageUI() {
    const asked: { method: string; options: unknown }[] = []
    const modals = {
      alert: (options: unknown) => (asked.push({ method: "alert", options }), Promise.resolve()),
      confirm: (options: unknown) => (asked.push({ method: "confirm", options }), Promise.resolve(true)),
      prompt: (options: unknown) => (asked.push({ method: "prompt", options }), Promise.resolve(typed.shift()))
    }
    const typed: Array<string | undefined> = ["Bob", undefined]
    const page = { load: () => Promise.resolve(page), modals }
    const key = Symbol.for("spell-ui:runtime")
    ;(globalThis as Record<symbol, unknown>)[key] = page
    onTestFinished(() => {
      delete (globalThis as Record<symbol, unknown>)[key]
    })
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

  test("`prompt`:  its Markdown message;  the text typed is its value, `the result` ok or cancel (P64)", async () => {
    const asked = stubPageUI()
    core.resetRuntime()
    onTestFinished(() => void core.resetRuntime())
    expect(await core.prompt("Your **name**?", "Ann")).toBe("Bob")
    expect(core.result()).toBe("ok")
    expect(await core.prompt("Again?")).toBe("")
    expect(core.result()).toBe("cancel")
    expect(asked[0]).toEqual({ method: "prompt", options: { message: "Your **name**?", markdown: true, value: "Ann" } })
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
    void core.showDrawn("you won")
    expect(modal.visible).toBe(true)
    core.hideDrawn("you won")
    expect(modal.visible).toBe(false)
  })

  test("drawn inside a view's own shadow root too", () => {
    const document = pageWith("", '<ui-modal id="you-won"></ui-modal>')
    const modal = modalIn(document, "you-won")
    void core.showDrawn("you won")
    expect(modal.visible).toBe(true)
  })

  test("nothing by that name:  a TypeError saying how to name one", () => {
    pageWith("<ui-text></ui-text>")
    expect(() => core.showDrawn("you lost")).toThrow(/nothing drawn is named "you lost";  name it on its tag/)
  })

  test("no page, as under node:  nothing", () => {
    vi.stubGlobal("document", undefined)
    expect(() => void core.showDrawn("you won")).not.toThrow()
  })
})

describe("a modal's buttons, and `the result` (epic `language` T155)", () => {
  /** A page holding a modal, `you won`, with a button in it:  the modal, the button and the page's document. */
  function modalWithButton() {
    const page = parseHTML(
      '<!doctype html><html><body><ui-modal id="you-won"><ui-actions><ui-button></ui-button></ui-actions></ui-modal></body></html>'
    )
    vi.stubGlobal("document", page.document)
    core.resetRuntime()
    onTestFinished(() => void core.resetRuntime())
    const modal = page.document.getElementById("you-won") as unknown as Element & { visible?: boolean }
    modal.visible = false
    return { modal, button: modal.querySelector("ui-button")!, document: page.document }
  }

  /** A game with an action, `dealTheCards`, which says `... without closing` when `keepsOpen`;  and how often it ran. */
  function gameWith({ keepsOpen = false, waits = false } = {}) {
    const ran: string[] = []
    const game = {
      dealTheCards: async () => {
        if (waits) await new Promise((resolve) => setTimeout(resolve, 5))
        if (keepsOpen) core.keepOpen()
        ran.push("deal")
      }
    }
    const action = { thing: game, name: "dealTheCards", run: () => core.runAction(game, "dealTheCards", "click") }
    return { ran, action }
  }

  test("`show` waits until a button closes it, once its action has run:  `the result` is its answer", async () => {
    const { modal, button } = modalWithButton()
    const { ran, action } = gameWith({ waits: true })
    const shown = core.showDrawn("you won")
    expect(modal.visible).toBe(true)
    closeDialogOf(button, "deal the cards", action)
    expect(modal.visible).toBe(true)
    expect(await shown).toBe("deal the cards")
    expect(ran).toEqual(["deal"])
    expect(modal.visible).toBe(false)
    expect(core.result()).toBe("deal the cards")
    expect(core.resultIs("Deal the Cards")).toBe(true)
    expect(core.resultIs("ok")).toBe(false)
  })

  test("`... without closing` in its action leaves it open", async () => {
    const { modal, button } = modalWithButton()
    const { ran, action } = gameWith({ keepsOpen: true })
    void core.showDrawn("you won")
    closeDialogOf(button, "ok", action)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(ran).toEqual(["deal"])
    expect(modal.visible).toBe(true)
  })

  test("`<action ok />` with no action of that name just closes it, answering ok", async () => {
    const { modal, button } = modalWithButton()
    const shown = core.showDrawn("you won")
    closeDialogOf(button, "ok")
    expect(await shown).toBe("ok")
    expect(modal.visible).toBe(false)
    expect(core.resultIs("OK")).toBe(true)
  })

  test("Escape, the dimmer or its close icon (Spell UI's `ui-closed`) answer cancel;  `hide` leaves the result", async () => {
    const { modal, document } = modalWithButton()
    const shown = core.showDrawn("you won")
    modal.dispatchEvent(new document.defaultView!.CustomEvent("ui-closed", { detail: { reason: "escape" } }))
    expect(await shown).toBe("cancel")
    const again = core.showDrawn("you won")
    core.hideDrawn("you won")
    expect(await again).toBeUndefined()
    expect(core.result()).toBe("cancel")
  })

  test("a `show` waiting inside an action lets a button's action run, rather than holding it behind itself", async () => {
    const { modal, button } = modalWithButton()
    const { ran, action } = gameWith()
    const game = {
      win: async () => {
        await core.showDrawn("you won")
        ran.push(`won:  ${String(core.result())}`)
      }
    }
    core.runAction(game, "win", "click")
    expect(modal.visible).toBe(true)
    closeDialogOf(button, "deal the cards", action)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(ran).toEqual(["deal", "won:  deal the cards"])
  })

  test("`alert` answers ok, `confirm` and `prompt` ok or cancel, with no Spell UI;  `prompt` gives its text", async () => {
    vi.stubGlobal("document", undefined)
    vi.spyOn(core.console, "info").mockImplementation(() => undefined)
    core.resetRuntime()
    await core.alert("You won!")
    expect(core.result()).toBe("ok")
    expect(await core.prompt("Name?", "Ann")).toBe("Ann")
    expect(core.result()).toBe("ok")
    await core.confirm("Deal again?")
    expect(core.result()).toBe("ok")
  })

  test("`core.answered()`:  an action's value, run as a statement, is `the result`, and given back (P64)", () => {
    core.resetRuntime()
    expect(core.answered(3)).toBe(3)
    expect(core.result()).toBe(3)
  })
})
