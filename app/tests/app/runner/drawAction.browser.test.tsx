import { beforeEach, afterEach, describe, expect, test } from "vite-plus/test"
import { flush } from "solid-js"
import h from "@solidjs/h"

import { core, App, View } from "spell/parser/core"
import { installSpellElements } from "spell/app/app/runner/SpellElement"
import { ActionMenus } from "spell/app/app/runner/ActionMenus"

import "spell/app/app/solid/cellsBridge"
import "spell/ui/components/ui-button"
import "spell/ui/components/ui-action"
import "spell/ui/components/ui-menu"

/**
 * `<action "deal"/>`:  a button for one of the program's actions, drawn by the core (`core.drawAction()`, epic
 * `language`;  Owen, 2026-11-13).
 * - The class is what spell compiles a template like this to:
 *
 *       a klondike is an app
 *         to deal
 *           shortcut D
 *           enabled when its face is up
 *           undoable as "Deal"
 *         to draw it
 *           <div class="Table">
 *             <context-menu>
 *               <action "deal"/>
 *               <divider/>
 *               <action "undo"/>
 *             </>
 *             <action "deal" class="Deal"/>
 *             <action "undo" icon-only/>
 *           </div>
 */
describe("core.drawAction():  an action's button", () => {
  installSpellElements(core)

  /** A game whose deal turns its one card face down, drawing a button for its deal and one for undo. */
  class Klondike extends App {
    static elementTag = core.defineElement(this, "Klondike", "App")
    static {
      this.declareProp("faceUp", { type: "choice" })
    }
    get faceUp(): boolean {
      return this.getProp("faceUp")
    }
    set faceUp(faceUp: boolean) {
      this.setProp("faceUp", faceUp)
    }
    deal(): void {
      this.faceUp = false
    }
    get dealIsEnabled(): boolean {
      return this.faceUp
    }
    draw(): ReturnType<View["draw"]> {
      return (
        h(
          "div",
          { class: "Table" },
          core.drawContextMenu(this, ["deal", "-", "undo"]),
          core.drawAction(this, "deal", { class: "Deal" }),
          core.drawAction(this, "undo", { "icon-only": true, class: "Undo" }),
          core.drawAction(this, "deal", { class: "Again", icon: "refresh", title: "Deal again" }, "Again")
        ) as unknown as () => ReturnType<View["draw"]>
      )()
    }
  }
  core.describeAction(Klondike, "deal", {
    title: "Deal",
    shortcuts: ["D"],
    enabledWhen: "dealIsEnabled",
    undoneAs: "Deal"
  })

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

  /** The game, mounted, its buttons drawn. */
  async function mountedGame() {
    await Promise.resolve()
    const game = new Klondike({ faceUp: true })
    core.mountApp(game, root)
    flush()
    const app = root.querySelector("klondike-app") as HTMLElement & { ready: Promise<void> }
    await app.ready
    flush()
    const button = (name: string) => app.querySelector(`ui-button.${name}`) as HTMLElement & { ready: Promise<void> }
    await Promise.all(["Deal", "Undo", "Again"].map((name) => button(name).ready))
    flush()
    return { game, button }
  }

  /** Press `button` as a person would:  its inner `<button>`. */
  function press(button: HTMLElement) {
    button.shadowRoot!.querySelector("button")!.click()
    flush()
  }

  test("its title, icon and key tip come from the action;  a click runs it, one undo step", async () => {
    const { game, button } = await mountedGame()
    const deal = button("Deal")
    expect(deal.textContent).toBe("Deal")
    expect(deal.getAttribute("title")).toBe("Deal (D)")
    const undo = button("Undo")
    expect(undo.getAttribute("icon")).toBe("undo")
    expect(undo.getAttribute("aria-label")).toBe("Undo")
    expect(undo.textContent).toBe("")
    press(deal)
    expect(game.faceUp).toBe(false)
    expect(game.undoTitle).toBe("Undo Deal")
  })

  test("disabled follows the action, live:  deal while it's enabled, undo while there's a step", async () => {
    const { game, button } = await mountedGame()
    const deal = button("Deal")
    const undo = button("Undo")
    expect([deal.hasAttribute("disabled"), undo.hasAttribute("disabled")]).toEqual([false, true])
    press(deal)
    expect([deal.hasAttribute("disabled"), undo.hasAttribute("disabled")]).toEqual([true, false])
    expect(undo.getAttribute("aria-label")).toBe("Undo Deal")
    // a disabled button runs nothing
    press(deal)
    expect(game.undoTitle).toBe("Undo Deal")
    press(undo)
    expect(game.faceUp).toBe(true)
    expect([deal.hasAttribute("disabled"), undo.hasAttribute("disabled")]).toEqual([false, true])
  })

  test("what the tag says wins over what the action gives:  its icon, its tooltip, its text", async () => {
    const { button } = await mountedGame()
    const again = button("Again")
    // its `title` is the action's title for it, so the tooltip is that and its key (language, 2026-11-14)
    expect([again.getAttribute("icon"), again.getAttribute("title"), again.textContent]).toEqual([
      "refresh",
      "Deal again (D)",
      "Again"
    ])
  })

  test("<context-menu>:  a right click on its element shows its items, live;  choosing one runs it", async () => {
    const { game, button } = await mountedGame()
    const table = button("Deal").parentElement!
    // it draws nothing where it is
    expect(table.querySelector<HTMLElement>("spell-context-menu")!.hidden).toBe(true)
    // the right click, on a button in the table, as the page's runner hears it
    let shown = false
    root.addEventListener("contextmenu", (event) => (shown = ActionMenus.showContextMenu(event, root, game, core)), {
      once: true
    })
    const click = new MouseEvent("contextmenu", {
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: 20,
      clientY: 30
    })
    button("Deal").dispatchEvent(click)
    expect([shown, click.defaultPrevented]).toEqual([true, true])
    const menu = document.querySelector("ui-menu[data-spell-action-menu]") as HTMLElement
    const items = [...menu.querySelectorAll("ui-action, ui-item")] as Array<HTMLElement & { ready: Promise<void> }>
    await Promise.all(items.map((item) => item.ready))
    flush()
    expect(
      items.map((item) =>
        item.localName === "ui-item" ? "-" : (item as unknown as { action: { title: string } }).action.title
      )
    ).toEqual(["Deal", "-", "Undo"])
    items[0]!.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    expect(game.faceUp).toBe(false)
    expect(menu.isConnected).toBe(false)
    expect(game.undoTitle).toBe("Undo Deal")
  })

  describe("<context-menu> at the drawing's own level (I81)", () => {
    /** A card of the table's:  a view of its own, drawn in its own element's shadow root, with no menu of its own. */
    class Card extends View {
      static elementTag = core.defineElement(this, "Patience")
      draw(): ReturnType<View["draw"]> {
        return (h("button", { class: "Card" }, "A") as unknown as () => ReturnType<View["draw"]>)()
      }
    }

    /**
     * The table, as spell compiles a drawing whose `<context-menu>` is its last line, beside its toolbar and board:
     *
     *       to draw it
     *         <div class="Bar">Patience</div>
     *         <div class="Board"><card .../></div>
     *         <context-menu>
     *           <action "deal"/>
     *         </>
     */
    class Patience extends App {
      static elementTag = core.defineElement(this, "Patience", "App")
      card = new Card()
      deal(): void {}
      draw(): ReturnType<View["draw"]> {
        return [
          h("div", { class: "Bar" }, "Patience"),
          h("div", { class: "Board" }, () => core.drawThing(this.card)),
          core.drawContextMenu(this, ["deal"])
        ] as unknown as ReturnType<View["draw"]>
      }
    }
    core.describeAction(Patience, "deal", { title: "Deal" })

    test("is the right-click menu of the app's own element, wherever in its drawing the click lands", async () => {
      await Promise.resolve()
      core.mountApp(new Patience({}), root)
      flush()
      const app = root.querySelector("patience-app") as HTMLElement & { ready: Promise<void> }
      const card = app.querySelector("patience-card") as HTMLElement & { ready: Promise<void> }
      await Promise.all([app.ready, card.ready])
      flush()
      // the app's own child:  nothing draws it in an element
      expect(app.querySelector(":scope > spell-context-menu")).not.toBeNull()
      const spots = { bar: app.querySelector(".Bar")!, card: card.shadowRoot!.querySelector(".Card")!, app }
      const shown: Record<string, boolean> = {}
      for (const [name, spot] of Object.entries(spots)) {
        ActionMenus.closeContextMenu()
        // as the page hears a right click:  each element's own handler, the card's first, then the app's
        const click = new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true })
        spot.dispatchEvent(click)
        shown[name] = click.defaultPrevented && !!document.querySelector("ui-menu[data-spell-action-menu]")
      }
      expect(shown).toEqual({ bar: true, card: true, app: true })
    })
  })
})

/**
 * `<menu><action "deal"/></menu>`:  an action a Spell UI menu holds is a menu's ROW (epic `editor` P29), as the editor's
 * own menus are drawn.
 * - The class is what spell compiles this to:
 *
 *       a freecell is an app
 *         its "face up" is yes or no
 *         to deal
 *           shortcut meta+D
 *           enabled when its face up is yes
 *           selected when its face up is no
 *           undoable as "Deal"
 *         to draw it
 *           <menu direction="vertical">
 *             <action "deal"/>
 *             <divider/>
 *             <action "undo"/>
 *           </menu>
 */
describe("core.drawAction() in a menu:  an action's row", () => {
  installSpellElements(core)

  /** A game whose deal turns its one card face down, drawing a menu of its deal and undo. */
  class Freecell extends App {
    static elementTag = core.defineElement(this, "Freecell", "App")
    static {
      this.declareProp("faceUp", { type: "choice" })
    }
    get faceUp(): boolean {
      return this.getProp("faceUp")
    }
    set faceUp(faceUp: boolean) {
      this.setProp("faceUp", faceUp)
    }
    deal(): void {
      this.faceUp = false
    }
    get dealIsEnabled(): boolean {
      return this.faceUp
    }
    get dealIsSelected(): boolean {
      return !this.faceUp
    }
    draw(): ReturnType<View["draw"]> {
      return (
        h(
          "ui-menu",
          { direction: "vertical" },
          core.drawAction(this, "deal", { "in-menu": true }),
          h("ui-action", { kind: "divider" }),
          core.drawAction(this, "undo", { "in-menu": true })
        ) as unknown as () => ReturnType<View["draw"]>
      )()
    }
  }
  core.describeAction(Freecell, "deal", {
    title: "Deal",
    icon: "play",
    shortcuts: ["meta+D"],
    enabledWhen: "dealIsEnabled",
    selectedWhen: "dealIsSelected",
    undoneAs: "Deal"
  })

  let root: HTMLElement

  beforeEach(() => {
    core.resetRuntime()
    root = document.createElement("div")
    document.body.append(root)
  })

  afterEach(() => root.remove())

  test("a <ui-action> of the action, live:  its title, icon and key;  greyed and ticked;  a click runs it, one undo step", async () => {
    await Promise.resolve()
    const game = new Freecell({ faceUp: true })
    core.mountApp(game, root)
    flush()
    const app = root.querySelector("freecell-app") as HTMLElement & { ready: Promise<void> }
    await app.ready
    const rows = [...app.querySelectorAll("ui-menu > ui-action")] as Array<HTMLElement & { ready: Promise<void> }>
    await Promise.all(rows.map((row) => row.ready))
    flush()
    const [deal, divider, undo] = rows as unknown as [HTMLElement, HTMLElement, HTMLElement]
    expect(rows.length).toBe(3)
    expect(divider.getAttribute("kind")).toBe("divider")
    // Spell's `meta` is Spell UI's `mod`:  ⌘ on a Mac, Ctrl elsewhere
    expect(deal.getAttribute("shortcut")).toBe("mod+D")
    const title = (row: HTMLElement) => row.shadowRoot!.querySelector("[part~=title]")!.textContent
    expect([title(deal), title(undo)]).toEqual(["Deal", "Undo"])
    const states = (row: HTMLElement) => [row.matches(":state(disabled)"), row.matches(":state(selected)")]
    expect([states(deal), states(undo)]).toEqual([
      [false, false],
      [true, false]
    ])
    deal.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    flush()
    await Promise.resolve()
    flush()
    expect(game.faceUp).toBe(false)
    expect(game.undoTitle).toBe("Undo Deal")
    expect([states(deal), states(undo)]).toEqual([
      [true, true],
      [false, false]
    ])
    expect(title(undo)).toBe("Undo Deal")
  })
})
