import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core } from "spell/parser/core"
import { registerTestComponentPack, runSpellFiles } from "spell/parser/spell/test"

/**
 * A `<for>` over a saved type BESIDE other lines of a drawing:  compiled spell, on `core`, against a fake web
 * server, drawn into a fake page (linkedom).
 * - Among other lines, the loop is a live value, `() => core.drawRead(...)`, in the drawing's list:  the boundary called
 *   it again each time it re-read its children, so each answer made a new read, which waited, then answered ...
 *   and the page hung, its main thread spinning in Solid's scheduler.
 * - Alone on its line it's the drawing itself, and drew.
 */

const SERVER = `test server is a web server at "https://owners.test"
	it is read only
	owners live at "/owners"
	an owner's id is its "name"

an "owner" is a thing
	it lives in test server
	its "name" is text
	its "big" is yes or no
`

/** At most this many reads asked of `core`:  more is the loop, which is stopped. */
const MOST_READS = 20

/** Waits for promises, timers and the page's staged writes. */
async function settled(): Promise<void> {
  for (let turns = 0; turns < 10; turns++) {
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

/**
 * The page `drawing` draws, once the server's answered:  its text, what the server was asked, and whether `core` was
 * asked to read again and again.
 */
async function drawn(drawing: string): Promise<{ text: string; isLooping: boolean; asked: string[] }> {
  const asked: string[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    asked.push(`${input instanceof Request ? input.url : input}`)
    return Response.json([
      { name: "ann", big: true },
      { name: "bob", big: false }
    ])
  })
  core.resetRuntime()
  const contents = `${SERVER}\na "kids screen" is a view\n\tits "big count" is the number of owners where its big is yes, filtered here\n\tto draw it\n${drawing}\n\nset screen to a new kids screen\n`
  const { screen } = runSpellFiles([{ path: "/T.spell", contents }], { registered: true })("screen")
  // the loop asks again and again, never waiting for a timer:  stopped here by an answer that never comes, so the
  // test fails, not hangs (one that fails is asked again too)
  let reads = 0
  const savedThings = core.savedThings
  const counted = vi.spyOn(core, "savedThings").mockImplementation((...args) => {
    if (++reads > MOST_READS) return new Promise(() => {})
    return savedThings(...args)
  })
  const element = page.document.createElement("div")
  page.document.body.appendChild(element)
  const dispose = render(() => core.drawThing(screen) as never, element)
  try {
    await settled()
    return { text: element.textContent?.replace(/\s+/g, " ").trim() ?? "", isLooping: reads > MOST_READS, asked }
  } finally {
    dispose()
    element.remove()
    counted.mockRestore()
  }
}

describe("a <for> over a saved type, beside other lines of a drawing", () => {
  test("beside a line of text:  drawn, its list asked for once", async () => {
    const { text, isLooping, asked } = await drawn(
      "\t\t<text>Owners:</text>\n\t\t<for owner in every owner><text>{its name}</text></for>"
    )
    expect(isLooping).toBe(false)
    expect(text).toBe("Owners:annbob")
    expect(asked).toEqual(["https://owners.test/owners"])
  })

  test("beside a count of the same type:  both drawn", async () => {
    const { text, isLooping } = await drawn(
      "\t\t<text>Big:  {its big count}</text>\n\t\t<for owner in every owner><text>{its name}</text></for>"
    )
    expect(isLooping).toBe(false)
    expect(text).toBe("Big: 1annbob")
  })

  test("inside an element, as it was:  drawn", async () => {
    const { text, isLooping } = await drawn(
      "\t\t<text>Big:  {its big count}</text>\n\t\t<segment><for owner in every owner><text>{its name}</text></for></segment>"
    )
    expect(isLooping).toBe(false)
    expect(text).toBe("Big: 1annbob")
  })
})
