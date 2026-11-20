import { describe, expect, test } from "vite-plus/test"

import { core, View } from "spell/parser/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { installSpellElements } from "spell/app/app/runner/SpellElement"

import "spell/app/app/solid/cellsBridge"

/**
 * A Spell type built on a Spell UI element:  `a "netlist column" is a ui tree view`,
 * compiled as the parser's test pins it (`uiViews.test.ts`), draws as a `<ui-tree>` of its own.
 */
describe("UIViewElements", () => {
  installSpellElements(core)

  /**
   * What `a "netlist column" is a ui tree view` compiles to, with `its appearance is columns`,
   * `to give the row class of (an item)` and a `<css>` block.
   */
  class NetlistColumn extends View {
    static uiElement = "ui-tree"
    static css = ".column-row.port { color: rgb(1, 2, 3) }"
    get appearance() {
      return "columns"
    }
    rowClass(item: { data?: { direction?: string } }) {
      return item.data?.direction ? `port dir-${item.data.direction}` : "node"
    }
  }

  /** A netlist:  a block holding a port and a node. */
  const NETLIST = [
    { id: "cpu", label: "CPU", data: {} },
    { id: "clk", label: "clk", data: { direction: "in" } }
  ]

  /** `<harbor-netlist-column>`, with the netlist's items, drawn. */
  async function netlistColumn() {
    core.defineElement(NetlistColumn, "Harbor")
    await Promise.resolve()
    await customElements.whenDefined("harbor-netlist-column")
    const element = await ElementFixture.render<HTMLElement & { items?: unknown; appearance?: string }>(
      `<harbor-netlist-column label="Netlist" style="height: 200px; width: 600px"></harbor-netlist-column>`
    )
    element.items = NETLIST
    await ElementFixture.settle()
    return element
  }

  /** The row drawn for item `id`. */
  function row(element: Element, id: string): HTMLElement {
    return element.shadowRoot!.querySelector<HTMLElement>(`.column-row[data-id="${id}"]`)!
  }

  test("its tag is a tree of its own, its attributes defaulting to the type's own values:  columns", async () => {
    const element = await netlistColumn()
    expect(element.appearance).toBe("columns")
    expect(element.shadowRoot!.querySelector("ul.column")).not.toBeNull()
  })

  test("its type's `to give the row class of (an item)` classes each row, which its own sheet styles", async () => {
    const element = await netlistColumn()
    expect([...row(element, "clk").classList]).toEqual(expect.arrayContaining(["column-row", "port", "dir-in"]))
    expect([...row(element, "cpu").classList]).toContain("node")
    expect(getComputedStyle(row(element, "clk")).color).toBe("rgb(1, 2, 3)")
  })

  test("on a page whose program runs elsewhere (Python's):  the same tree, its hooks answered on the page", async () => {
    // what the Python target's page file writes (`PY.ElementsWriter`):  the same class, run on the page's core
    class PortColumn extends NetlistColumn {}
    const sent: string[] = []
    core.remote = {
      run: (_owner, method) => void sent.push(method),
      startWhile: () => {},
      endWhile: () => {},
      set: () => {},
      trigger: () => {}
    }
    try {
      core.defineElement(PortColumn, "HarborPy")
      await Promise.resolve()
      await customElements.whenDefined("harbor-py-port-column")
      const element = await ElementFixture.render<HTMLElement & { items?: unknown; appearance?: string }>(
        `<harbor-py-port-column label="Netlist" style="height: 200px; width: 600px"></harbor-py-port-column>`
      )
      element.items = NETLIST
      await ElementFixture.settle()
      expect(element.appearance).toBe("columns")
      expect([...row(element, "clk").classList]).toEqual(expect.arrayContaining(["port", "dir-in"]))
      expect(sent).toEqual([])
    } finally {
      core.remote = undefined
    }
  })
})
