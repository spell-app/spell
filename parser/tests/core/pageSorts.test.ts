import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core } from "spell/parser/core"
import { listenForTableSorts } from "spell/parser/core/ui"
import { registerTestComponentPack, runSpellFiles } from "spell/parser/spell/test"

/**
 * A sort a page holds, and a read sorted by it:  compiled spell, on `core`, against a fake web server, drawn into a
 * fake page (linkedom).
 * - The server sorts measurements newest first by their end time only, by its own name for it, `recency`.
 * - A sort it can't do is done here, over the first rows read:  no more are read.
 * - A table's header click sets the sort (`listenForTableSorts()`), and the read asks again.
 */

const SERVER = `lab is a web server at "https://lab.test"
	it is read only
	measurements live at "/measurements"
		it sorts with "order_by"
		measurements can be sorted by:
			- "completion" as "recency", by end time

a "measurement" is a thing
	it lives in lab
	its "name" is text
	its "end time" is a number
`

/** The server's rows, in its own order:  newest first when asked for `recency`. */
const ROWS = [
  { id: "1", name: "bravo", end_time: 1 },
  { id: "2", name: "charlie", end_time: 3 },
  { id: "3", name: "alpha", end_time: 2 },
  { id: "4", name: "delta", end_time: 4 }
]

/** Waits for promises, timers and the page's staged writes. */
async function settled(): Promise<void> {
  for (let turns = 0; turns < 20; turns++) {
    await new Promise((resolve) => setTimeout(resolve, 10))
    core.flush()
    flush()
  }
}

let page: ReturnType<typeof parseHTML>

beforeAll(() => {
  registerTestComponentPack()
  page = parseHTML("<!doctype html><html><head></head><body></body></html>")
  for (const name of ["window", "document", "Node", "Element", "HTMLElement", "Event", "CustomEvent"]) {
    vi.stubGlobal(name, page[name as keyof typeof page])
  }
  bridgeSolid({ enableExternalSource, flush })
})

afterAll(() => void vi.unstubAllGlobals())

/** The screen drawn, what it shows, and what the server was asked. */
async function drawnScreen() {
  const asked: string[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = new URL(`${input instanceof Request ? input.url : input}`)
    asked.push(`${url.pathname}${url.search}`)
    const rows =
      url.searchParams.get("order_by") === "recency" ? [...ROWS].sort((a, b) => b.end_time - a.end_time) : ROWS
    const size = Number(url.searchParams.get("limit") ?? url.searchParams.get("per_page") ?? rows.length)
    return Response.json(rows.slice(0, size))
  })
  core.resetRuntime()
  const contents = `${SERVER}
a "lab screen" is a view
	its "order" is a sort:  completion, newest first
	its "rows" is the first 3 measurements sorted by the order
	to draw it
		<for measurement in its rows><text>{its name};</text></for>

set screen to a new lab screen
`
  const { screen } = runSpellFiles([{ path: "/T.spell", contents }], { registered: true })("screen") as {
    screen: { order: unknown }
  }
  const element = page.document.createElement("div")
  page.document.body.appendChild(element)
  const dispose = render(() => core.drawThing(screen) as never, element)
  await settled()
  const shown = () => element.textContent?.replace(/\s+/g, " ").trim() ?? ""
  return { screen, asked, shown, dispose: () => (dispose(), element.remove()) }
}

describe("a read sorted by a sort a page holds", () => {
  test("a sort its server names, the way it runs:  asked of the server", async () => {
    const { asked, shown, dispose } = await drawnScreen()
    try {
      expect(asked).toHaveLength(1)
      expect(asked[0]).toContain("order_by=recency")
      expect(shown()).toBe("delta;charlie;alpha;")
    } finally {
      dispose()
    }
  })

  test("the other way round, or a field it can't sort:  its first 3 read, and sorted here", async () => {
    const { screen, asked, shown, dispose } = await drawnScreen()
    try {
      screen.order = core.sort("completion")
      await settled()
      expect(asked.at(-1)).not.toContain("order_by")
      // the server's first 3, by their end time:  bravo 1, alpha 2, charlie 3
      expect(shown()).toBe("bravo;alpha;charlie;")
      screen.order = core.sort("name", true)
      await settled()
      expect(asked.at(-1)).not.toContain("order_by")
      expect(shown()).toBe("charlie;bravo;alpha;")
    } finally {
      dispose()
    }
  })

  test("a header click:  the next sort written into the page, and the read asks again", async () => {
    const { screen, asked, shown, dispose } = await drawnScreen()
    const app = page.document.createElement("div")
    const stop = listenForTableSorts(app as unknown as HTMLElement)
    const table = page.document.createElement("ui-table") as unknown as HTMLElement & { sort?: unknown }
    app.appendChild(table)
    const click = (key: string) => {
      table.sort = core.sortShown(screen, "order")
      const event = new page.CustomEvent("ui-sorting", { detail: { key }, bubbles: true, cancelable: true })
      table.dispatchEvent(event)
      return event
    }
    try {
      // the sorted header again:  the other way round
      expect(click("completion").defaultPrevented).toBe(true)
      expect(screen.order).toEqual({ by: "completion", descending: false })
      await settled()
      expect(shown()).toBe("bravo;alpha;charlie;")
      // another, which the server can't sort:  oldest first
      click("name")
      expect(screen.order).toEqual({ by: "name", descending: false })
      // back to the one it sorts newest first only:  that way round first
      click("completion")
      expect(screen.order).toEqual({ by: "completion", descending: true })
      await settled()
      expect(asked.at(-1)).toContain("order_by=recency")
      expect(shown()).toBe("delta;charlie;alpha;")
    } finally {
      stop()
      dispose()
    }
  })
})

describe("a sort a page holds, by itself", () => {
  test("`core.sort()`:  frozen, smallest first unless it says", () => {
    expect(core.sort("name")).toEqual({ by: "name", descending: false })
    expect(Object.isFrozen(core.sort("name", true))).toBe(true)
  })

  test("`core.sortedByValue()`:  a list kept here, by the field its words name", () => {
    const rows = [{ endTime: 2 }, { endTime: 1 }, { endTime: undefined }, { endTime: 3 }]
    expect(core.sortedByValue(rows, core.sort("end time", true), "endTime")).toEqual([
      { endTime: 3 },
      { endTime: 2 },
      { endTime: 1 },
      { endTime: undefined }
    ])
    expect(core.sortedByValue(rows, undefined)).toBe(rows)
  })

  test("`core.nextSort()`:  the same flips, another starts smallest first when nothing says otherwise", () => {
    expect(core.nextSort(core.sort("name"), "name")).toEqual({ by: "name", descending: true })
    expect(core.nextSort(core.sort("name", true), "date")).toEqual({ by: "date", descending: false })
  })
})
