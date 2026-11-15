import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-toolbar"
import "spell/ui/components/ui-action"
import "spell/ui/components/ui-text"
import "spell/ui/components/ui-segment"

/**
 * A toolbar of actions, as an app's menu draws one (`<toolbar menu="game menu" shrinkable>`;  epic `language` T55, T70):
 * - its icons-only stage drops the actions' key caps, so the icons fit before the row folds into `…`
 * - its own row draws no key caps (unless `show-keys`):  each action's tooltip names its keys
 * - a `-` between two groups (`<ui-item kind="divider">`) is a hairline:  upright in a row, across a column
 * - `appearance="pills"`:  each group is a pill, its pieces drawn by its items
 * - widening brings the titles back, however the page shrink-wraps the row (Solitaire's game bar)
 */

/** Solitaire's game menu:  three actions with keys, a divider after the first when `divider`. */
function actions(divider = false) {
  return (
    `<ui-action icon="redo" shortcut="N">Restart</ui-action>` +
    (divider ? `<ui-item kind="divider"></ui-item>` : "") +
    `<ui-action icon="fast forward" shortcut="A">Auto play</ui-action>` +
    `<ui-action icon="eye" shortcut="C">Cheat</ui-action>`
  )
}

/** Render a shrinkable toolbar of `items` in a box `width` px wide;  returns it and its row's box. */
async function toolbar(width: number, items: string, attributes = "") {
  const box = await ElementFixture.render(
    `<div style="width: ${width}px"><ui-toolbar aria-label="Game" shrinkable ${attributes}>` +
      `<ui-text slot="title" size="large">Klondike Solitaire</ui-text>${items}</ui-toolbar></div>`
  )
  const host = box.querySelector<DOMElement>("ui-toolbar")!
  await settled()
  return { box, host, row: host.shadowRoot!.querySelector<HTMLElement>("[part~=menu]")! }
}

/** Wait for the toolbar to fit:  Solid's update, then two frames (`TitleFit` refits before a paint). */
async function settled() {
  await ElementFixture.settle()
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  await ElementFixture.settle()
}

/** `action`'s item box, in its shadow root. */
function itemBox(action: Element): HTMLElement {
  return action.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!
}

/** `action`'s key caps' box, if it draws one. */
function shortcutOf(action: Element): HTMLElement | null {
  return action.shadowRoot!.querySelector<HTMLElement>("[part~=shortcut]")
}

/** The stage the row shows:  `whole`, `cut`, `icons` or `overflow`. */
function stage(row: HTMLElement): string {
  return row.style.getPropertyValue("--_menu-fit")
}

describe("<ui-toolbar shrinkable> of actions", () => {
  it("icons only:  the key caps go with the titles, so three icons fit in 200px", async () => {
    const { host, row } = await toolbar(380, actions(), "show-keys")
    expect(stage(row)).toBe("icons")
    for (const action of host.querySelectorAll("ui-action")) {
      const shortcut = shortcutOf(action)
      expect(!shortcut || getComputedStyle(shortcut).display === "none").toBe(true)
      expect(itemBox(action).title).toMatch(/^\w[\w ]* \(\w\)$/)
    }
  })

  it("whole:  no key caps in its row;  each action's tooltip names its title and its keys", async () => {
    const { host, row } = await toolbar(900, actions())
    expect(stage(row)).toBe("whole")
    const tips = [...host.querySelectorAll("ui-action")].map((action) => [!!shortcutOf(action), itemBox(action).title])
    expect(tips).toEqual([
      [false, "Restart (N)"],
      [false, "Auto play (A)"],
      [false, "Cheat (C)"]
    ])
  })

  it("`show-keys`:  each action keeps its key caps beside its title, and needs no tooltip", async () => {
    const { host, row } = await toolbar(900, actions(), "show-keys")
    expect(stage(row)).toBe("whole")
    const action = host.querySelector("ui-action")!
    expect(shortcutOf(action)!.getBoundingClientRect().width).toBeGreaterThan(0)
    expect(itemBox(action).title).toBe("")
  })

  it("a page's own `title` wins over the keys' tooltip", async () => {
    const { host } = await toolbar(900, `<ui-action icon="eye" shortcut="C" title="Peek">Cheat</ui-action>`)
    expect(itemBox(host.querySelector("ui-action")!).title).toBe("Peek")
  })

  it("a sub-menu's actions keep their key caps:  only the toolbar's own row leaves them out", async () => {
    await import("spell/ui/components/ui-menu")
    const { host } = await toolbar(900, `<ui-menu><ui-action icon="eye" shortcut="C">Cheat</ui-action></ui-menu>`)
    const nested = host.querySelector("ui-menu ui-action")!
    expect(shortcutOf(nested)).not.toBeNull()
  })

  it("folded into `…`:  no divider left beside the overflow button", async () => {
    const { host, row } = await toolbar(250, actions(true))
    expect(stage(row)).toBe("overflow")
    const divider = host.querySelector("ui-item")!.shadowRoot!.querySelector<HTMLElement>(".divider")!
    expect(getComputedStyle(divider).display).toBe("none")
  })
})

describe("<ui-item kind=divider> in a menu of actions", () => {
  it("in a row:  an upright hairline, with room each side", async () => {
    const { host } = await toolbar(900, actions(true))
    const divider = host.querySelector("ui-item")!.shadowRoot!.querySelector<HTMLElement>(".divider")!
    const { width, height } = divider.getBoundingClientRect()
    expect([Math.round(width), height > 10, parseFloat(getComputedStyle(divider).marginInlineStart) > 0]).toEqual([
      1,
      true,
      true
    ])
    expect(getComputedStyle(divider).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  })

  it("in a column (a right click's menu):  a hairline across it", async () => {
    await import("spell/ui/components/ui-menu")
    const menu = await ElementFixture.render(
      `<ui-menu direction="vertical" aria-label="Game">${actions(true)}</ui-menu>`
    )
    await ElementFixture.settle()
    const divider = menu.querySelector("ui-item")!.shadowRoot!.querySelector<HTMLElement>(".divider")!
    const { width, height } = divider.getBoundingClientRect()
    expect([width > 100, Math.round(height)]).toEqual([true, 1])
  })
})

describe("<ui-menu> of actions", () => {
  it("keeps its key caps:  only a toolbar leaves them out", async () => {
    await import("spell/ui/components/ui-menu")
    const menu = await ElementFixture.render(`<ui-menu aria-label="Game">${actions()}</ui-menu>`)
    await ElementFixture.settle()
    const action = menu.querySelector("ui-action")!
    expect(shortcutOf(action)!.getBoundingClientRect().width).toBeGreaterThan(0)
  })
})

describe("<ui-toolbar appearance=pills>", () => {
  /** Each action's piece of its pill:  its box's `pill-start` / `pill-end` classes, as `s`, `m`, `e` or `se`. */
  function pieces(host: Element): string[] {
    return [...host.querySelectorAll("ui-action")].map((action) => {
      const { classList } = itemBox(action)
      if (!classList.contains("pill")) return "-"
      return (classList.contains("pill-start") ? "s" : "") + (classList.contains("pill-end") ? "e" : "") || "m"
    })
  }

  /** Two groups:  three actions, a divider, two. */
  const GROUPS =
    actions() +
    `<ui-item kind="divider"></ui-item>` +
    `<ui-action icon="undo">Undo</ui-action><ui-action icon="redo">Redo</ui-action>`

  it("each run of items between two dividers is one pill:  rounded at its two ends only", async () => {
    const { host } = await toolbar(900, GROUPS, `appearance="pills"`)
    expect(pieces(host)).toEqual(["s", "m", "e", "s", "e"])
    const [first, middle] = [...host.querySelectorAll("ui-action")].map((action) =>
      getComputedStyle(itemBox(action), "::before")
    )
    expect([first!.borderTopLeftRadius !== "0px", first!.borderTopRightRadius, middle!.borderTopLeftRadius]).toEqual([
      true,
      "0px",
      "0px"
    ])
    expect(first!.backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  })

  it("the divider is only the room between two pills:  no hairline", async () => {
    const { host } = await toolbar(900, GROUPS, `appearance="pills"`)
    const divider = host.querySelector("ui-item")!.shadowRoot!.querySelector<HTMLElement>(".divider")!
    expect(getComputedStyle(divider).backgroundColor).toBe("rgba(0, 0, 0, 0)")
    const actionsInRow = [...host.querySelectorAll("ui-action")].map((action) =>
      itemBox(action).getBoundingClientRect()
    )
    expect(actionsInRow[3]!.left - actionsInRow[2]!.right).toBeGreaterThan(8)
    expect(Math.round(actionsInRow[1]!.left - actionsInRow[0]!.right)).toBe(0)
  })

  it("any element between two runs splits them, with the same gap:  a spacer as well as a divider", async () => {
    const withSpacer = GROUPS.replace(`<ui-item kind="divider"></ui-item>`, `<spacer></spacer>`)
    const { host } = await toolbar(900, withSpacer, `appearance="pills"`)
    expect(pieces(host)).toEqual(["s", "m", "e", "s", "e"])
    const boxes = [...host.querySelectorAll("ui-action")].map((action) => itemBox(action).getBoundingClientRect())
    expect(boxes[3]!.left - boxes[2]!.right).toBeGreaterThan(8)
  })

  it("a lone item is a pill rounded at both ends;  without `pills`, no pieces at all", async () => {
    const lone = await toolbar(900, `<ui-action icon="eye">Cheat</ui-action>`, `appearance="pills"`)
    expect(pieces(lone.host)).toEqual(["se"])
    const plain = await toolbar(900, GROUPS)
    expect(pieces(plain.host)).toEqual(["-", "-", "-", "-", "-"])
  })

  it("through the stages:  its icons stay on their pills, and the `…` button is a pill of its own", async () => {
    const { host, row, box } = await toolbar(480, GROUPS, `appearance="pills"`)
    expect([stage(row), ...pieces(host)]).toEqual(["icons", "s", "m", "e", "s", "e"])
    box.style.width = "250px"
    await settled()
    expect(stage(row)).toBe("overflow")
    const more = host.shadowRoot!.querySelector<HTMLElement>("[part~=overflow]")!
    expect(getComputedStyle(more).backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
  })
})

describe("<ui-toolbar shrinkable> widening", () => {
  /**
   * Solitaire's game bar:  the toolbar inside a box of `display: contents` (a `<ui-segment>`), its row only as wide
   * as what it shows (`::part(menu)`'s `flex: 0 1 auto`).
   */
  async function gameBar(width: number) {
    const outer = await ElementFixture.render(
      `<div style="width: ${width}px"><style>.bar::part(menu) { flex: 0 1 auto } .bar::part(title), .bar::part(right) { flex: 1 0 0; min-width: max-content }</style>` +
        `<ui-segment inverted attach-to="top"><ui-toolbar class="bar" aria-label="Game" shrinkable appearance="pills">` +
        `<ui-text slot="title">Solitaire</ui-text>${actions(true)}<ui-text slot="right">Score: 0</ui-text>` +
        `</ui-toolbar></ui-segment></div>`
    )
    const host = outer.querySelector<DOMElement>("ui-toolbar")!
    await settled()
    return { outer, host, row: host.shadowRoot!.querySelector<HTMLElement>("[part~=menu]")! }
  }

  it("narrowed to icons only, then widened again:  every title comes back whole", async () => {
    const { outer, host, row } = await gameBar(900)
    expect(stage(row)).toBe("whole")
    const seen = []
    // icons only:  the row, as wide as its icons, has room to spare, so it never resizes as the bar widens
    for (const width of [330, 900, 230, 900]) {
      outer.style.width = `${width}px`
      await settled()
      seen.push(stage(row))
    }
    expect(seen).toEqual(["icons", "whole", "overflow", "whole"])
    for (const action of host.querySelectorAll("ui-action")) {
      const title = action.shadowRoot!.querySelector<HTMLElement>("[part~=title]")!
      expect(title.getBoundingClientRect().width).toBeGreaterThan(20)
    }
  })
})

describe("<ui-action icon-only> in a toolbar (epic `mockup` J107)", () => {
  /** Solitaire's bar:  three titled actions, then Undo and Redo as icons alone. */
  const ICON_ONLY_ACTIONS =
    actions() +
    `<ui-action icon="undo" shortcut="mod+Z" icon-only>Undo Play From The Stock</ui-action>` +
    `<ui-action icon="redo" shortcut="mod+shift+Z" icon-only>Redo</ui-action>`

  /** The two `icon-only` actions. */
  function iconOnly(host: Element): Element[] {
    return [...host.querySelectorAll("ui-action[icon-only]")]
  }

  it("wide:  its icon alone, its title its tooltip (with its keys) and its name;  the others keep their titles", async () => {
    const { host, row } = await toolbar(1200, ICON_ONLY_ACTIONS)
    expect(stage(row)).toBe("whole")
    for (const action of iconOnly(host)) {
      expect(action.matches(":state(icon-only)")).toBe(true)
      const title = action.shadowRoot!.querySelector<HTMLElement>("[part~=title]")!
      expect(getComputedStyle(title).display).toBe("none")
      expect(itemBox(action).classList.contains("icon")).toBe(true)
      expect(itemBox(action).getAttribute("aria-label")).toBe(action.textContent)
      expect(itemBox(action).title).toMatch(new RegExp(`^${action.textContent} \\(.+\\)$`))
    }
    const restart = host.querySelector("ui-action")!
    expect(restart.shadowRoot!.querySelector<HTMLElement>("[part~=title]")!.getBoundingClientRect().width).toBeGreaterThan(20)
  })

  it("narrowest:  it folds into `…` with the rest, its row in the menu titled", async () => {
    const { host, row } = await toolbar(250, ICON_ONLY_ACTIONS)
    expect(stage(row)).toBe("overflow")
    for (const action of iconOnly(host)) expect(getComputedStyle(itemBox(action)).display).toBe("none")
    const menu = host.shadowRoot!.querySelector<HTMLElement>("[part~=overflow-menu]")!
    expect(menu.textContent).toContain("Undo Play From The Stock")
    expect(menu.textContent).toContain("Redo")
  })

  it("no icon:  its title shows, as there's nothing else to show", async () => {
    const { host } = await toolbar(1200, `<ui-action icon-only>Deal</ui-action>`)
    const action = host.querySelector("ui-action")!
    expect(action.matches(":state(icon-only)")).toBe(false)
    expect(action.shadowRoot!.querySelector<HTMLElement>("[part~=title]")!.getBoundingClientRect().width).toBeGreaterThan(10)
  })

  it("in a menu bar:  no key caps beside it, as it has no title for them to follow", async () => {
    await import("spell/ui/components/ui-menu")
    const box = await ElementFixture.render(
      `<ui-menu aria-label="Edit"><ui-action icon="undo" shortcut="mod+Z" icon-only>Undo</ui-action></ui-menu>`
    )
    await settled()
    const action = box.querySelector("ui-action")!
    expect(shortcutOf(action)).toBeNull()
    expect(itemBox(action).getAttribute("aria-label")).toBe("Undo")
  })
})
