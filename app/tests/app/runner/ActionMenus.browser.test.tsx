import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import h from "@solidjs/h"

import { core, App, View } from "spell/parser/core"
import { installSpellElements, SpellElement } from "spell/app/app/runner/SpellElement"
import { ActionMenus } from "spell/app/app/runner/ActionMenus"
import { LONG_PRESS_MS, LongPress } from "spell/app/app/runner/LongPress"

import "spell/app/app/solid/cellsBridge"
import "spell/ui/components/ui-action"
import "spell/ui/components/ui-toolbar"
import "spell/ui/components/ui-menu"

/**
 * A program's actions on the page (epic `elemental-spell` P10):  a small Solitaire, its game menu as the app's menu
 * bar, a toolbar and a card's right click, its shortcuts run only while enabled, and undo naming what it undoes.
 * - The classes are what spell compiles a template like this to:
 *
 *       solitaire is an app where:
 *         - to deal:
 *           - shortcut meta+D
 *           - enabled when its card is face up
 *           - undoable as "Deal"
 *         - its "game menu" is a menu of "deal", "-", "undo" and "redo"
 *         - its menu bar is "game menu"
 *         - to draw it:  the card, then `<ui-toolbar menu="game menu" />`
 *       a card is a view where:
 *         - to turn it over:  (undoable as "Turn Card")
 *         - to draw it:  `<span context-menu="game menu">`
 */
describe("ActionMenus:  a Solitaire's game menu", () => {
  installSpellElements(core)

  /** A card, face up or down;  right-clicked, its game's menu. */
  class Card extends View {
    static elementTag = core.defineElement(this, "Patience")
    static {
      this.declareProp("faceUp", { type: "choice" })
    }
    get faceUp(): boolean {
      return this.getProp("faceUp")
    }
    set faceUp(faceUp: boolean) {
      this.setProp("faceUp", faceUp)
    }
    turnOver(): void {
      this.faceUp = !this.faceUp
    }
    draw(): ReturnType<View["draw"]> {
      const face = () => (this.faceUp ? "up" : "down")
      return (
        h("span", { class: "card", "context-menu": "game menu" }, face) as unknown as () => ReturnType<View["draw"]>
      )()
    }
  }
  core.describeAction(Card, "turnOver", { title: "turn it over", undoneAs: "Turn Card" })

  /** The game:  one card, a deal that turns it face down, its menu bar and a toolbar of the same menu. */
  class Patience extends App {
    static elementTag = core.defineElement(this, "Patience", "App")
    static menuBar = "game menu"
    card = new Card({ faceUp: true })
    deal(): void {
      this.card.faceUp = false
    }
    get dealIsEnabled(): boolean {
      return this.card.faceUp
    }
    draw(): ReturnType<View["draw"]> {
      return (
        h(
          "div",
          { class: "table" },
          () => core.drawThing(this.card),
          h("ui-toolbar", { menu: "game menu", "aria-label": "Game" })
        ) as unknown as () => ReturnType<View["draw"]>
      )()
    }
  }
  core.describeAction(Patience, "deal", {
    title: "deal",
    shortcuts: ["meta+D"],
    enabledWhen: "dealIsEnabled",
    undoneAs: "Deal"
  })
  core.describeMenu(Patience, "gameMenu", { items: ["deal", "-", "undo", "redo"] })

  let root: HTMLElement

  beforeEach(() => {
    core.resetRuntime()
    root = document.createElement("div")
    document.body.append(root)
  })

  afterEach(() => {
    ActionMenus.closeContextMenu()
    root.remove()
  })

  /** The game, mounted, with its app's element and its card's, drawn. */
  async function mountedGame() {
    await Promise.resolve()
    const game = new Patience()
    core.mountApp(game, root)
    flush()
    const app = root.querySelector("patience-app") as HTMLElement & { ready: Promise<void> }
    await app.ready
    flush()
    const card = app.querySelector("patience-card") as HTMLElement & { ready: Promise<void> }
    await card.ready
    flush()
    return { game, app, card }
  }

  /** The titles `element`'s actions draw, `-` for a divider. */
  async function titlesIn(element: Element): Promise<string[]> {
    const actions = [...element.querySelectorAll("ui-action, ui-item")] as Array<HTMLElement & { ready: Promise<void> }>
    await Promise.all(actions.map((action) => action.ready))
    flush()
    return actions.map((action) =>
      action.localName === "ui-item" ? "-" : action.shadowRoot!.querySelector("[part~=title]")!.textContent!.trim()
    )
  }

  /** `action`'s item box, which a click presses. */
  function boxOf(action: Element): HTMLElement {
    return action.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!
  }

  /** Press `key` with the platform's command key (command on a Mac, control elsewhere), as a person would. */
  function pressCommand(key: string) {
    const isMac = /mac/i.test(navigator.platform || navigator.userAgent)
    const event = new KeyboardEvent("keydown", {
      key,
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
      cancelable: true
    })
    window.dispatchEvent(event)
    return event
  }

  test("the app's menu bar and its toolbar draw the game menu:  each action's title, live", async () => {
    const { game, app } = await mountedGame()
    const menuBar = app.shadowRoot!.querySelector("[part~=menu-bar]")!
    expect(menuBar.localName).toBe("ui-toolbar")
    expect(await titlesIn(menuBar)).toEqual(["deal", "-", "Undo", "Redo"])
    const toolbar = app.querySelector("ui-toolbar[menu]")!
    // filled once it has drawn
    await expect.poll(() => toolbar.querySelectorAll("ui-action").length).toBe(3)
    expect(await titlesIn(toolbar)).toEqual(["deal", "-", "Undo", "Redo"])
    // its `-` is Spell UI's divider, a hairline, never an empty item (epic `language` T70)
    const divider = toolbar.querySelector("ui-item")!
    expect([divider.getAttribute("kind"), !!divider.shadowRoot!.querySelector("[role=separator]")]).toEqual([
      "divider",
      true
    ])
    // undo names what it undoes (C11), and its item follows
    boxOf(toolbar.querySelector("ui-action")!).click()
    expect(game.card.faceUp).toBe(false)
    flush()
    expect(await titlesIn(menuBar)).toEqual(["deal", "-", "Undo Deal", "Redo"])
  })

  test("a right click on the card shows its game's menu where it was clicked;  choosing an action runs it", async () => {
    const { game, card } = await mountedGame()
    const face = card.shadowRoot!.querySelector(".card")!
    face.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true, clientX: 40, clientY: 50 })
    )
    const menu = document.querySelector("ui-menu[data-spell-action-menu]") as HTMLElement
    expect(menu).not.toBeNull()
    const popup = menu.closest("ui-popup") as HTMLElement
    expect(JSON.parse(popup.getAttribute("at")!).x).toBe(40)
    expect(await titlesIn(menu)).toEqual(["deal", "-", "Undo", "Redo"])
    boxOf(menu.querySelector("ui-action")!).click()
    expect(game.card.faceUp).toBe(false)
    expect(menu.isConnected).toBe(false)
    // the card's turn, undone by name
    core.runAction(game.card, "turnOver", "click")
    expect(game.undoTitle).toBe("Undo Turn Card")
  })

  test("the editor's part menu finds the program's menu as Run does:  from a click's path, or from an element (I76)", async () => {
    const { game, app, card } = await mountedGame()
    const face = card.shadowRoot!.querySelector(".card")!
    let path: EventTarget[] = []
    face.addEventListener("contextmenu", (event) => (path = event.composedPath()), { once: true })
    face.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true }))
    ActionMenus.closeContextMenu()
    const titles = (items: { kind: string; title?: string }[] | undefined) =>
      items?.map((item) => (item.kind === "separator" ? "-" : item.title))
    expect(titles(SpellElement.programMenuAt(path))).toEqual(["deal", "-", "Undo", "Redo"])
    // a row of the Views tree has only the element:  its path, shadow roots and all
    expect(titles(SpellElement.programMenuOf(face))).toEqual(["deal", "-", "Undo", "Redo"])
    // each item runs through the core, as Run's does
    SpellElement.programMenuOf(face)!
      .find((item) => item.kind === "action")!
      .run("click")
    expect(game.card.faceUp).toBe(false)
    // outside the card's menu:  none
    expect(SpellElement.programMenuOf(app)).toBeUndefined()
  })

  describe("a finger held on the card opens its menu, as a right click does (P62)", () => {
    // a phone:  no mouse here (the test's browser has one)
    beforeEach(() => {
      const noMouse = vi.spyOn(LongPress, "hasNoMouse").mockReturnValue(true)
      return () => noMouse.mockRestore()
    })

    /** A finger (or `pointerType`) on `target`:  `event` at (`x`, `y`). */
    function touch(target: EventTarget, event: string, { x = 40, y = 50, pointerType = "touch" } = {}) {
      const init = { bubbles: true, composed: true, cancelable: true, pointerId: 7, isPrimary: true, pointerType }
      target.dispatchEvent(new PointerEvent(event, { ...init, clientX: x, clientY: y }))
    }
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    const menusShowing = () => document.querySelectorAll("ui-menu[data-spell-action-menu]").length

    test("held still:  the menu, where the finger is;  its lift makes no click", async () => {
      const { card } = await mountedGame()
      const face = card.shadowRoot!.querySelector(".card")!
      touch(face, "pointerdown")
      await wait(LONG_PRESS_MS + 100)
      expect(menusShowing()).toBe(1)
      const popup = document.querySelector("ui-menu[data-spell-action-menu]")!.closest("ui-popup")!
      expect(JSON.parse(popup.getAttribute("at")!)).toEqual({ x: 40, y: 50 })
      let clicked = false
      face.addEventListener("click", () => (clicked = true))
      touch(face, "pointerup")
      face.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true }))
      expect(clicked).toBe(false)
    })

    test("no menu for a tap, a finger that moves, a second finger, or a mouse held down", async () => {
      const { card } = await mountedGame()
      const face = card.shadowRoot!.querySelector(".card")!
      // a tap:  lifted first, and its click goes through
      touch(face, "pointerdown")
      await wait(100)
      touch(face, "pointerup")
      let clicked = false
      face.addEventListener("click", () => (clicked = true))
      face.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true }))
      expect(clicked).toBe(true)
      // a finger that moves:  a drag, or a scroll
      touch(face, "pointerdown")
      touch(face, "pointermove", { x: 60 })
      // a second finger:  a pinch
      await wait(LONG_PRESS_MS + 100)
      touch(face, "pointerup", { x: 60 })
      touch(face, "pointerdown")
      face.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, composed: true, pointerId: 8, pointerType: "touch" })
      )
      // a mouse
      touch(face, "pointerup")
      touch(face, "pointerdown", { pointerType: "mouse" })
      await wait(LONG_PRESS_MS + 100)
      touch(face, "pointerup", { pointerType: "mouse" })
      expect(menusShowing()).toBe(0)
    })

    test("a phone that sends its own right click for a long press (Android) shows one menu, whichever comes first", async () => {
      const { card } = await mountedGame()
      const face = card.shadowRoot!.querySelector(".card")!
      const rightClick = () =>
        face.dispatchEvent(
          new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true, clientX: 40, clientY: 50 })
        )
      // the browser's first:  ours never comes
      touch(face, "pointerdown")
      await wait(LONG_PRESS_MS - 100)
      rightClick()
      await wait(200)
      expect(menusShowing()).toBe(1)
      touch(face, "pointerup")
      ActionMenus.closeContextMenu()
      // ours first:  the browser's, after, is swallowed
      touch(face, "pointerdown")
      await wait(LONG_PRESS_MS + 100)
      const popup = document.querySelector("ui-menu[data-spell-action-menu]")
      rightClick()
      expect(menusShowing()).toBe(1)
      expect(document.querySelector("ui-menu[data-spell-action-menu]")).toBe(popup)
      touch(face, "pointerup")
    })

    test("`on long press` takes it:  no menu, no right click (T154)", async () => {
      const { card, game } = await mountedGame()
      const face = card.shadowRoot!.querySelector(".card")!
      const pressed: string[] = []
      const proto = Card.prototype as unknown as Record<string, unknown>
      proto.onLongPress = () => pressed.push("long press")
      proto.onRightClick = () => pressed.push("right click")
      try {
        touch(face, "pointerdown")
        await wait(LONG_PRESS_MS + 100)
        touch(face, "pointerup")
        await expect.poll(() => pressed).toEqual(["long press"])
        expect(menusShowing()).toBe(0)
        expect(game.card.faceUp).toBe(true)
      } finally {
        delete proto.onLongPress
        delete proto.onRightClick
      }
    })

    test("with no `on long press`, a long press is a right click:  `on right click` and the menu (T154)", async () => {
      const { card } = await mountedGame()
      const face = card.shadowRoot!.querySelector(".card")!
      const pressed: string[] = []
      const proto = Card.prototype as unknown as Record<string, unknown>
      proto.onRightClick = () => pressed.push("right click")
      try {
        touch(face, "pointerdown")
        await wait(LONG_PRESS_MS + 100)
        touch(face, "pointerup")
        await expect.poll(() => pressed).toEqual(["right click"])
        expect(menusShowing()).toBe(1)
      } finally {
        delete proto.onRightClick
      }
    })
  })

  test("with a mouse, a finger held still is a long press only:  never a right click or its menu (T154)", async () => {
    vi.spyOn(LongPress, "hasNoMouse").mockReturnValue(false)
    const { card } = await mountedGame()
    const face = card.shadowRoot!.querySelector(".card")!
    const pressed: string[] = []
    const proto = Card.prototype as unknown as Record<string, unknown>
    proto.onLongPress = () => pressed.push("long press")
    proto.onRightClick = () => pressed.push("right click")
    const finger = { bubbles: true, composed: true, cancelable: true, pointerId: 9, isPrimary: true }
    try {
      face.dispatchEvent(new PointerEvent("pointerdown", { ...finger, pointerType: "touch", clientX: 40, clientY: 50 }))
      await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 100))
      face.dispatchEvent(new PointerEvent("pointerup", { ...finger, pointerType: "touch", clientX: 40, clientY: 50 }))
      await expect.poll(() => pressed).toEqual(["long press"])
      delete proto.onLongPress
      // nothing takes it:  still no menu
      face.dispatchEvent(new PointerEvent("pointerdown", { ...finger, pointerType: "touch", clientX: 40, clientY: 50 }))
      await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 100))
      face.dispatchEvent(new PointerEvent("pointerup", { ...finger, pointerType: "touch", clientX: 40, clientY: 50 }))
      expect(document.querySelectorAll("ui-menu[data-spell-action-menu]").length).toBe(0)
      expect(pressed).toEqual(["long press"])
    } finally {
      delete proto.onLongPress
      delete proto.onRightClick
      vi.restoreAllMocks()
    }
  })

  test("a shortcut runs its action only while it's enabled;  the app's own undo takes ⌘Z", async () => {
    const { game, card } = await mountedGame()
    // the page starts hearing keys from the first mouse event (`SpellElement.noteInput()`)
    card.dispatchEvent(new MouseEvent("mouseenter"))
    game.card.faceUp = false
    expect(pressCommand("d").defaultPrevented).toBe(false)
    game.card.faceUp = true
    expect(pressCommand("d").defaultPrevented).toBe(true)
    expect(game.card.faceUp).toBe(false)
    expect(game.undoTitle).toBe("Undo Deal")
    expect(pressCommand("z").defaultPrevented).toBe(true)
    expect(game.card.faceUp).toBe(true)
  })

  test("a shortcut leaves keys typed into the code pane alone:  a code editor may type through an EditContext, not a field", async () => {
    const { game, card } = await mountedGame()
    card.dispatchEvent(new MouseEvent("mouseenter"))
    game.card.faceUp = true
    // the code pane:  a plain <div> with an EditContext, as CodeMirror's is where the browser has one
    const codePane = document.createElement("div")
    codePane.tabIndex = 0
    ;(codePane as unknown as { editContext: unknown }).editContext = new (
      globalThis as unknown as { EditContext: new () => unknown }
    ).EditContext()
    document.body.append(codePane)
    try {
      codePane.focus()
      const isMac = /mac/i.test(navigator.platform || navigator.userAgent)
      const typed = new KeyboardEvent("keydown", {
        key: "d",
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true,
        composed: true,
        cancelable: true
      })
      codePane.dispatchEvent(typed)
      expect(typed.defaultPrevented).toBe(false)
      expect(game.card.faceUp).toBe(true)
    } finally {
      codePane.remove()
    }
  })

  test("a shortcut draws as the key it presses:  spell's `meta+D` is Spell UI's `mod+D`, ⌘ D on a Mac, Ctrl D elsewhere", async () => {
    const { app } = await mountedGame()
    const menuBar = app.shadowRoot!.querySelector("[part~=menu-bar]")!
    await expect.poll(() => menuBar.querySelector("ui-action")).toBeTruthy()
    expect(menuBar.querySelector("ui-action")!.getAttribute("shortcut")).toBe("mod+D")
    expect(ActionMenus.shortcutForUI("meta+shift+Z")).toBe("mod+shift+Z")
    expect(ActionMenus.shortcutForUI("F2")).toBe("F2")
  })
})

describe("ActionMenus:  a menu bar of menus (epic `language` P19)", () => {
  installSpellElements(core)

  /** A desk:  its menu bar is a menu of its File and Edit menus, File holding a sub-menu of its examples. */
  class Desk extends App {
    static elementTag = core.defineElement(this, "Desk", "App")
    static menuBar = "menu bar"
    examples = [{ title: "Solitaire" }, { title: "Cards" }]
    opened: unknown[] = []
    save(): void {}
    openExample(example: unknown): void {
      this.opened.push(example)
    }
    get moreExamplesItems(): unknown[] {
      return this.examples
    }
  }
  core.describeAction(Desk, "save", { title: "Save" })
  core.describeMenu(Desk, "fileMenu", { items: ["save", "-", "moreExamples"], title: "File" })
  core.describeMenu(Desk, "moreExamples", {
    items: [],
    each: "moreExamplesItems",
    action: "openExample",
    title: "More Examples"
  })
  core.describeMenu(Desk, "editMenu", { items: ["undo", "redo"], title: "Edit" })
  core.describeMenu(Desk, "menuBar", { items: ["fileMenu", "editMenu"] })

  test("each menu an item of the bar, holding its menu;  a sub-menu inside, its items from the list", async () => {
    core.resetRuntime()
    const root = document.createElement("div")
    document.body.append(root)
    try {
      await Promise.resolve()
      core.mountApp(new Desk(), root)
      flush()
      const app = root.querySelector("desk-app") as HTMLElement & { ready: Promise<void> }
      await app.ready
      flush()
      const menuBar = app.shadowRoot!.querySelector("[part~=menu-bar]")!
      const menus = [...menuBar.children]
      expect(menus.map((menu) => menu.localName)).toEqual(["ui-item", "ui-item"])
      expect(menus.map((menu) => menu.firstChild?.textContent)).toEqual(["File", "Edit"])
      const file = menus[0]!.querySelector(":scope > ui-menu")!
      expect([...file.children].map((item) => item.localName)).toEqual(["ui-action", "ui-item", "ui-item"])
      const more = file.querySelector(":scope > ui-item:last-child")!
      expect(more.firstChild?.textContent).toBe("More Examples")
      const examples = more.querySelectorAll(":scope > ui-menu > ui-action")
      expect(examples).toHaveLength(2)
      const solitaire = examples[0] as HTMLElement & { action: { title: string } }
      expect(solitaire.action.title).toBe("Solitaire")
    } finally {
      root.remove()
    }
  })
})
