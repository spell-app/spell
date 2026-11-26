import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { App, Site, core, h } from "spell/parser/core"
import type { SiteHost, TabIcon } from "spell/parser/core/core.types"
import type { Drawing } from "spell/parser/core/drawing"

/**
 * An app's icon on the browser tab (epic `editor` P50):  `its icon is "rocket"`, `its icon color is "green"`.
 * - `core.mountApp()` asks the run's host to show it (`SiteHost.showIcon()`), again as it changes, and to put its own
 *   back as the app is unmounted.
 * - Solid's CLIENT build, drawing into a fake page (linkedom), as `sites.test.ts` does.
 */

/** A game, as `a "game" is an app` with `its icon is ...` compiles:  here its icon is set, so a test can change it. */
class Game extends App {
  draw(): Drawing {
    return h("p", null, "a game") as unknown as Drawing
  }
}

/** A site whose icon is worked out, as `its icon is "static/icon.png"` compiles:  a getter. */
class Guide extends Site {
  static pages = [{ name: "home page", page: "HomePage", address: "/" }]
  get icon() {
    return "static/icon.png"
  }
}

describe("an app's icon on the browser tab", () => {
  let page: ReturnType<typeof parseHTML>
  let element: HTMLElement
  /** What the fake host was asked to show, in order. */
  let shown: Array<TabIcon | undefined>

  beforeAll(() => {
    page = parseHTML("<!doctype html><html><head></head><body></body></html>")
    for (const name of ["window", "document", "Node", "Element", "HTMLElement", "Event", "CustomEvent"]) {
      vi.stubGlobal(name, page[name as keyof typeof page])
    }
    bridgeSolid({ enableExternalSource, flush })
  })

  beforeEach(() => {
    core.resetRuntime()
    element = page.document.createElement("div")
    page.document.body.appendChild(element)
    shown = []
    const host: SiteHost = { address: () => "/", go: () => {}, listen: () => {}, showIcon: (icon) => shown.push(icon) }
    core.siteHost = host
  })

  afterEach(() => {
    core.siteHost = undefined
    core.projectFolder = undefined
    element.remove()
  })

  /** A moment for the icon's effect to run. */
  async function settled(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve))
    core.flush()
  }

  test("shown as it starts, in its colour;  again as either changes;  the host's own back as it stops", async () => {
    const game = new Game()
    game.icon = "rocket"
    game.iconColor = "green"
    const mounted = core.mountApp(game, element)
    await settled()
    expect(shown).toEqual([{ name: "rocket", color: "green" }])

    game.iconColor = "red"
    await settled()
    expect(shown.at(-1)).toEqual({ name: "rocket", color: "red" })

    mounted.unmount()
    expect(shown.at(-1)).toBeUndefined()
  })

  test("an app with no icon asks nothing, not even to put the host's back", async () => {
    core.mountApp(new Game(), element).unmount()
    await settled()
    expect(shown).toEqual([])
  })

  test("a picture is a file of the project, found where its files are;  its colour isn't asked for", async () => {
    core.projectFolder = "/spaces/owen@spell/guide"
    core.mountApp(new Guide(), element)
    await settled()
    expect(shown).toEqual([{ address: "/spaces/owen@spell/guide/static/icon.png" }])
  })

  test("a host that shows no icons (`<spell-viewer>`, VS Code) is left alone", async () => {
    core.siteHost = { address: () => "/", go: () => {}, listen: () => {} }
    const game = new Game()
    game.icon = "rocket"
    core.mountApp(game, element).unmount()
    await settled()
    expect(shown).toEqual([])
  })
})
