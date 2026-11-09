/**
 * When a place's sign-in bar shows (`signInBar.ts`, `ProgramPlaces.startSignIn()`):  once the program first reads the place,
 * not as it starts (epic `language` T67).
 * - Task List and Lista de tareas start in the browser, and read their atmosphere account only once it's picked:
 *   its bar said "You aren't signed in" from the first moment, for a place nobody had asked for.
 * - The cloud here (`the cloud`):  a sign-in to a Spell account, which asks the server nothing for its rows while nobody's
 *   signed in.  Drawn into a fake page (linkedom).
 */
import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core, Place, Thing } from "spell/parser/core"

/** How long to let the places folder load, and what's asked be answered. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 300))

/** The bar, if it shows. */
const barOn = (page: ReturnType<typeof parseHTML>) => page.document.querySelector("ui-message.spell-sign-in")

describe("a place's sign-in bar", () => {
  let page: ReturnType<typeof parseHTML>

  beforeAll(() => {
    page = parseHTML("<!doctype html><html><head></head><body></body></html>")
    for (const name of ["window", "document", "Node", "Element", "HTMLElement", "Event", "CustomEvent"]) {
      vi.stubGlobal(name, page[name as keyof typeof page])
    }
    // nobody's signed in, as the server says
    vi.stubGlobal("fetch", async () => new Response("{}", { headers: { "Content-Type": "application/json" } }))
    bridgeSolid({ enableExternalSource, flush })
  })

  afterAll(() => vi.unstubAllGlobals())

  beforeEach(() => core.resetRuntime())

  test("shows once the program first reads the place, not as it starts", async () => {
    class Note extends Thing {
      static savedIn = { place: "notes", collection: "notes" }
    }
    class Notes extends Place {}
    core.place(new Notes(), { name: "notes", kind: "the cloud", at: "/api/places/spaces/personal/notes" })
    await settled()
    expect(barOn(page)).toBeNull()

    await core.savedThings(Note)
    expect(barOn(page)).not.toBeNull()
    expect(page.document.querySelectorAll("ui-message.spell-sign-in")).toHaveLength(1)
  })
})
