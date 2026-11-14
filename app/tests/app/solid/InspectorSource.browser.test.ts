import { describe, expect, test } from "vite-plus/test"

import { handlerPlacesInSource, handlersInSource } from "spell/app/app/solid/InspectorSource"

/**
 * `handlersInSource()`:  the handlers an element was written with, read at the place the compiler marked on it.
 */

const FILE = "Tip.spell"
const SOURCE = [
  "to draw it:",
  "\treturn <div>",
  "\t\t<ui-button onClick={set its percent to 15}>15%</ui-button>",
  '\t\t<ui-button appearance="basic" icon="plus" onClick={add someone}>Add someone</ui-button>',
  '\t\t<ui-button part="remove" aria-label="Remove" onClick={remove it}/>',
  "\t</div>"
].join("\n")
const SOURCES = new Map([[FILE, SOURCE]])

/** An element the compiler marked as written at `line`, `column`, in `file`. */
function drawnAt(line: number, column: number, file = FILE): Element {
  const element = document.createElement("ui-button")
  element.setAttribute("data-spell-at", `${file}:${line}:${column}`)
  return element
}

describe("handlersInSource()", () => {
  test("its tag's handlers, by event", () => {
    expect(handlersInSource(drawnAt(2, 2), SOURCES)).toEqual({ click: "set its percent to 15" })
    expect(handlersInSource(drawnAt(3, 2), SOURCES)).toEqual({ click: "add someone" })
    expect(handlersInSource(drawnAt(4, 2), SOURCES)).toEqual({ click: "remove it" })
  })

  test("a tag with none:  nothing", () => {
    expect(handlersInSource(drawnAt(1, 8), SOURCES)).toEqual({})
  })

  test("no mark, or no such file, or no tag there:  nothing, never a guess", () => {
    expect(handlersInSource(document.createElement("ui-button"), SOURCES)).toEqual({})
    expect(handlersInSource(drawnAt(2, 2, "Other.spell"), SOURCES)).toEqual({})
    expect(handlersInSource(drawnAt(0, 0), SOURCES)).toEqual({})
  })
})

describe("handlerPlacesInSource()", () => {
  test("only the code between its braces, never the tag around it (epic `editor` I141)", () => {
    // `onClick={set its percent to 15}`:  line 3, its code from column 23 to 44
    expect(handlerPlacesInSource(drawnAt(2, 2), SOURCES)).toEqual({
      click: { path: FILE, from: 3, to: 3, column: 23, endColumn: 44 }
    })
  })

  test("a handler just added, `onClick={}`:  an empty slice, its two columns the same", () => {
    const source = '\t<text slot="title" size="large" heavy onClick={}>Spell Solitaire</>'
    const at = source.indexOf("{}") + 2
    expect(handlerPlacesInSource(drawnAt(0, 1), new Map([[FILE, source]]))).toEqual({
      click: { path: FILE, from: 1, to: 1, column: at, endColumn: at }
    })
  })
})
