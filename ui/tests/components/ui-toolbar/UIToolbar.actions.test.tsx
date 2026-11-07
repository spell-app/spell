import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-toolbar"
import "spell/ui/components/ui-action"
import "spell/ui/components/ui-text"

/**
 * A toolbar of actions, as an app's menu draws one (`<toolbar menu="game menu" shrinkable>`;  epic `language` T55, T70):
 * - its icons-only stage drops the actions' key caps, so the icons fit before the row folds into `…`
 * - a `-` between two groups (`<ui-item kind="divider">`) is a hairline:  upright in a row, across a column
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
async function toolbar(width: number, items: string) {
  const box = await ElementFixture.render(
    `<div style="width: ${width}px"><ui-toolbar aria-label="Game" shrinkable>` +
      `<ui-text slot="title" size="large">Klondike Solitaire</ui-text>${items}</ui-toolbar></div>`
  )
  const host = box.querySelector<DOMElement>("ui-toolbar")!
  await ElementFixture.settle()
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  await ElementFixture.settle()
  return { host, row: host.shadowRoot!.querySelector<HTMLElement>("[part~=menu]")! }
}

/** The stage the row shows:  `whole`, `cut`, `icons` or `overflow`. */
function stage(row: HTMLElement): string {
  return row.style.getPropertyValue("--_menu-fit")
}

describe("<ui-toolbar shrinkable> of actions", () => {
  it("icons only:  the key caps go with the titles, so three icons fit in 200px", async () => {
    const { host, row } = await toolbar(380, actions())
    expect(stage(row)).toBe("icons")
    for (const action of host.querySelectorAll("ui-action")) {
      const shortcut = action.shadowRoot!.querySelector<HTMLElement>("[part~=shortcut]")!
      expect(getComputedStyle(shortcut).display).toBe("none")
    }
  })

  it("whole:  each action keeps its key caps", async () => {
    const { host, row } = await toolbar(900, actions())
    expect(stage(row)).toBe("whole")
    const shortcut = host.querySelector("ui-action")!.shadowRoot!.querySelector<HTMLElement>("[part~=shortcut]")!
    expect(shortcut.getBoundingClientRect().width).toBeGreaterThan(0)
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
