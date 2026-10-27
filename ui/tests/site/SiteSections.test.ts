import { afterEach, describe, expect, it } from "vite-plus/test"

import { SiteSections } from "spell-ui/site/_src/SiteSections"
import { FOLDS_KEY, OLD_FOLDS_KEY } from "spell-ui/site/_src/site.types"

/**
 * `SiteSections`' folds:  what the viewer opened or closed comes back on the next visit (epic `epic-engine` I142).
 * - Plain attributes on `<ui-section>`s, the element left undefined:  on a first load the site restores them before
 *   the sections are defined, so the attribute is what it reads and writes.
 */

/** Show a page `main` holding `sections`, as the site's first load does. */
function show(sections: string): HTMLElement {
  const main = document.createElement("main")
  main.id = "main"
  main.innerHTML = sections
  document.body.append(main)
  SiteSections.instance.show(main, { isFirst: true })
  return main
}

/** The viewer's toggle of `section`, as `<ui-section>` announces it:  cancelable `ui-opening` / `ui-closing`. */
function toggle(section: Element, open: boolean): void {
  const type = open ? "ui-opening" : "ui-closing"
  section.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, cancelable: true, detail: { open } }))
}

const key = () => FOLDS_KEY + location.pathname

afterEach(() => {
  for (const main of document.querySelectorAll("main#main")) main.remove()
  localStorage.removeItem(key())
  localStorage.removeItem(OLD_FOLDS_KEY + location.pathname)
})

describe("SiteSections folds", () => {
  it("keeps them under the docs runtime's key:  spell-folds:<path>", () => {
    expect(FOLDS_KEY).toBe("spell-folds:")
  })

  it("opens a section that starts folded (open=false) once the viewer opened it", () => {
    const main = show(`<ui-section id="a" collapsible open="false"></ui-section>`)
    toggle(main.querySelector("#a")!, true)
    expect(JSON.parse(localStorage.getItem(key())!)).toEqual({ a: false })
    main.remove()
    const again = show(`<ui-section id="a" collapsible open="false"></ui-section>`)
    expect(again.querySelector("#a")!.hasAttribute("open")).toBe(false)
  })

  it("folds a section that starts open once the viewer folded it", () => {
    const main = show(`<ui-section id="b" collapsible></ui-section>`)
    toggle(main.querySelector("#b")!, false)
    main.remove()
    const again = show(`<ui-section id="b" collapsible></ui-section>`)
    expect(again.querySelector("#b")!.getAttribute("open")).toBe("false")
  })

  it("leaves untouched sections as their markup says", () => {
    const main = show(
      `<ui-section id="c" collapsible open="false"></ui-section><ui-section id="d" collapsible></ui-section>`
    )
    expect(main.querySelector("#c")!.getAttribute("open")).toBe("false")
    expect(main.querySelector("#d")!.hasAttribute("open")).toBe(false)
  })

  it("moves what the site kept under its old key over", () => {
    localStorage.setItem(OLD_FOLDS_KEY + location.pathname, JSON.stringify({ e: true }))
    const main = show(`<ui-section id="e" collapsible></ui-section>`)
    expect(main.querySelector("#e")!.getAttribute("open")).toBe("false")
    expect(localStorage.getItem(OLD_FOLDS_KEY + location.pathname)).toBeNull()
    expect(JSON.parse(localStorage.getItem(key())!)).toEqual({ e: true })
  })
})
