/**
 * A field holding another thing's address, followed as it's drawn (epic `data` I33):  `core.linked()`, on classes written
 * as compiled spell's are, and a place that answers when the test says.
 * - The compiling half, and a real server:  `tests/spell/parserTests/followingLinks.test.ts`.
 */
import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core, h, Place, Thing } from "spell/parser/core"
import type { Drawing } from "spell/parser/core/drawing"
import { MemoryPlace, type PlaceRow, type SelectingContext } from "spell/places"

/** A place in memory that holds each answer until the test lets it go:  as a slow server would. */
class SlowPlace extends MemoryPlace {
  /** Each answer still held back, oldest first. */
  private held: Array<() => void> = []
  /** How many times it's been asked. */
  asked = 0

  async getMany(collection: string, ids: readonly string[], context: SelectingContext = {}): Promise<PlaceRow[]> {
    this.asked++
    // as a request does:  given up on, it ends at once
    await new Promise<void>((answer, fail) => {
      this.held.push(answer)
      context.signal?.addEventListener("abort", () => fail(context.signal!.reason), { once: true })
    })
    return super.getMany(collection, ids, context)
  }

  /** SIDE EFFECT:  lets every answer held go, then lets the page take them in. */
  async answer(): Promise<void> {
    for (const answer of this.held.splice(0)) answer()
    await settled()
  }
}

/** Waits for promises, and the page's staged writes. */
async function settled(): Promise<void> {
  for (let turns = 0; turns < 10; turns++) {
    await new Promise((resolve) => setTimeout(resolve, 1))
    core.flush()
    flush()
  }
}

/**
 * A planet, saved in the stars;  a person, whose homeworld is a planet's address there;
 * a row, drawing the planet its first holds the address of.
 */
function program(behind: SlowPlace) {
  core.resetRuntime()
  class Planet extends Thing {
    static {
      this.declareProp("name", { type: "text" })
    }
    get name() {
      return this.getProp("name") as string
    }
    set name(value) {
      this.setProp("name", value)
    }
    static savedIn = { place: "stars", collection: "planets" }
    override draw(): Drawing {
      return h("i", () => this.name) as unknown as Drawing
    }
  }
  // as PokéSpell's chain draws its species:  `{draw its species}`, then the rest of its row
  class Row extends Thing {
    static {
      this.declareProp("first", { type: "Planet", link: true })
    }
    get first() {
      return core.linked(this, "first", Planet) as Planet | undefined
    }
    set first(value) {
      this.setProp("first", value)
    }
    override draw(): Drawing {
      return h("p", () => core.whileWaiting(() => core.drawThing(this.first)), " > end") as unknown as Drawing
    }
  }
  class Person extends Thing {
    static {
      this.declareProp("homeworld", { type: "Planet", link: true })
    }
    get homeworld() {
      return core.linked(this, "homeworld", Planet) as Planet | undefined
    }
    set homeworld(value) {
      this.setProp("homeworld", value)
    }
    // as `<p>{the name of its homeworld}</p>` compiles
    override draw(): Drawing {
      return h("p", () => core.whileWaiting(() => this.homeworld?.name as unknown as Drawing)) as unknown as Drawing
    }
  }
  class Stars extends Place {
    makePlace() {
      return behind
    }
  }
  core.place(new Stars(), { name: "stars" })
  return { Person, Planet, Row }
}

/** Draws `thing` on a page of its own:  call what it returns to take it off. */
function draw(thing: object): { shown: () => string | undefined; leave: () => void } {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const leave = render(() => core.drawThing(thing) as never, container)
  flush()
  return { shown: () => container.textContent?.trim(), leave }
}

const leaving: Array<() => void> = []

beforeAll(() => {
  const { document, window } = parseHTML("<!doctype html><html><body></body></html>")
  Object.assign(globalThis, { document, window, Node: window.Node, Element: window.Element })
  bridgeSolid({ enableExternalSource, flush })
})

afterEach(() => {
  for (const leave of leaving.splice(0)) leave()
})

describe("a link, drawn", () => {
  test('a "…" until its thing comes, then the thing', async () => {
    const stars = new SlowPlace({ collections: { planets: [{ id: "tatooine", name: "Tatooine" }] } })
    const { Person } = program(stars)
    const drawn = draw(new Person({ homeworld: "tatooine" }))
    leaving.push(drawn.leave)
    await settled()
    expect(drawn.shown()).toBe("…")
    await stars.answer()
    expect(drawn.shown()).toBe("Tatooine")
  })

  // epic `data`:  PokéSpell's Evolutions, "… > Metapod > …" for good, on a page drawn again as its read was given up
  test("drawn again just as the last drawing gave its read up:  it asks again, and the new drawing shows it", async () => {
    const stars = new SlowPlace({ collections: { planets: [{ id: "tatooine", name: "Tatooine" }] } })
    const { Person } = program(stars)
    const luke = new Person({ homeworld: "tatooine" })
    const first = draw(luke)
    await settled()
    expect(stars.asked).toBe(1)
    // the page goes, and in the same moment a new one draws the same thing:  a page drawn again, Back and forward
    first.leave()
    await Promise.resolve()
    const again = draw(luke)
    leaving.push(again.leave)
    await settled()
    expect(again.shown()).toBe("…")
    await stars.answer()
    await stars.answer()
    expect(again.shown()).toBe("Tatooine")
  })

  test("nobody comes back:  the read is given up, and the next drawing asks afresh", async () => {
    const stars = new SlowPlace({ collections: { planets: [{ id: "tatooine", name: "Tatooine" }] } })
    const { Person } = program(stars)
    const luke = new Person({ homeworld: "tatooine" })
    const first = draw(luke)
    await settled()
    first.leave()
    await stars.answer()
    const again = draw(luke)
    leaving.push(again.leave)
    await settled()
    expect(stars.asked).toBe(2)
    await stars.answer()
    expect(again.shown()).toBe("Tatooine")
  })

  // epic `data`:  PokéSpell's Evolutions row gone, when Back and a Pokémon's page again came while its species were read
  for (const turns of [0, 1, 3, 6]) {
    test(`a row drawn again ${turns} moments after the last one went:  the whole row, once its thing comes`, async () => {
      const stars = new SlowPlace({ collections: { planets: [{ id: "tatooine", name: "Tatooine" }] } })
      const { Row } = program(stars)
      const row = new Row({ first: "tatooine" })
      const first = draw(row)
      await settled()
      first.leave()
      for (let moment = 0; moment < turns; moment++) await Promise.resolve()
      const again = draw(row)
      leaving.push(again.leave)
      await settled()
      expect(again.shown()).toBe("… > end")
      await stars.answer()
      await stars.answer()
      expect(again.shown()).toBe("Tatooine > end")
    })
  }
})
