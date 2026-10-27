import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { MemoryStorage, StoragePlace, WaitedOnPlace } from "spell/util"
import { App, core, Thing } from "spell/parser/core"

/** `a solitaire is an app`, with `its theme as one of light, dark, remembered`. */
class Solitaire extends App {
  static {
    this.declareProp("theme", { oneOf: ["light", "dark"], remembered: true })
    this.declareProp("layout", { type: "text", init: () => "fanned", remembered: true })
  }
  get theme(): string {
    return this.getProp("theme")
  }
  set theme(theme: string) {
    this.setProp("theme", theme)
  }
  get layout(): string {
    return this.getProp("layout")
  }
  set layout(layout: string) {
    this.setProp("layout", layout)
  }
}

/** `a settings is a thing`, with `its zoom as a number, remembered` and `its pick as a card, remembered`. */
class Settings extends Thing {
  static {
    this.declareProp("zoom", { type: "number", remembered: true })
    this.declareProp("pick", { type: "Thing", remembered: true })
  }
  get zoom(): number {
    return this.getProp("zoom")
  }
  set zoom(zoom: number) {
    this.setProp("zoom", zoom)
  }
  get pick(): Thing {
    return this.getProp("pick")
  }
  set pick(pick: Thing) {
    this.setProp("pick", pick)
  }
}

/** The project every run here is of, unless it says otherwise. */
const PROJECT = "@owen/solitaire"

let storage: MemoryStorage
let place: StoragePlace

beforeEach(() => {
  storage = new MemoryStorage()
  place = new StoragePlace({ storage, description: "a test's storage" })
})

afterEach(() => {
  vi.restoreAllMocks()
})

////////////////
// ## Remembered from run to run
////////////////

describe("remembered props", () => {
  test("an app's comes back on the next run of its project, kept under the project's id and its name", async () => {
    await newRun()
    expect(new Solitaire().theme).toBe("light")
    new Solitaire().theme = "dark"
    expect(storage.getItem("@owen/solitaire:theme")).toBe("dark")
    await newRun()
    expect(new Solitaire().theme).toBe("dark")
  })

  test("another project remembers its own:  two ids never share", async () => {
    await newRun()
    new Solitaire().theme = "dark"
    await newRun("@owen/spider")
    expect(new Solitaire().theme).toBe("light")
  })

  test("nothing remembered:  its starting value, else its default;  neither is kept", async () => {
    await newRun()
    expect(new Solitaire().layout).toBe("fanned")
    expect(storage.length).toBe(0)
  })

  test("a thing's is kept under the id the program chose:  another thing's id is another value", async () => {
    await newRun()
    new Settings({ id: "main" }).zoom = 2
    expect(storage.getItem("@owen/solitaire:main.zoom")).toBe("2")
    await newRun()
    expect(new Settings({ id: "main" }).zoom).toBe(2)
    expect(new Settings({ id: "other" }).zoom).toBe(0)
  })

  test("a thing with a made-up id isn't remembered, said once on the console", async () => {
    await newRun()
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    const settings = new Settings()
    void settings.id
    settings.zoom = 3
    new Settings().zoom = 4
    expect(storage.length).toBe(0)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0][0]).toMatch(/Settings\.zoom can't be remembered.*new Settings\(\{ id: "main" \}\)/)
  })

  test("only text, numbers and choices are kept:  a thing isn't, said once", async () => {
    await newRun()
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    const settings = new Settings({ id: "main" })
    settings.pick = new Thing()
    settings.pick = new Thing()
    expect(storage.length).toBe(0)
    expect(warn).toHaveBeenCalledOnce()
  })

  test("a remembered value its prop no longer allows is passed over:  it starts afresh, said once", async () => {
    storage.setItem("@owen/solitaire:theme", "sepia")
    await newRun()
    const warn = vi.spyOn(core.console, "warn").mockImplementation(() => {})
    expect(new Solitaire().theme).toBe("light")
    expect(new Solitaire().theme).toBe("light")
    expect(warn).toHaveBeenCalledOnce()
  })

  test("a place that must be waited on is read whole before the program starts, and kept to after", async () => {
    const server = new TestServerPlace({ "@owen/solitaire": { theme: "dark" } })
    core.resetRuntime()
    await core.remember(PROJECT, server)
    const game = new Solitaire()
    expect(game.theme).toBe("dark")
    game.theme = "light"
    await Promise.resolve()
    expect(server.kept["@owen/solitaire"]).toEqual({ theme: "light" })
  })

  test("nothing remembers while nothing asked it to:  a remembered prop is a plain one", async () => {
    core.resetRuntime()
    new Solitaire().theme = "dark"
    await newRun()
    expect(new Solitaire().theme).toBe("light")
    expect(storage.length).toBe(0)
  })

  test("`core.remember()` throws with no program running, or a name with a colon", async () => {
    core.clearRuntime()
    await expect(core.remember(PROJECT, place)).rejects.toThrow(TypeError)
    core.resetRuntime()
    await expect(core.remember("@owen:solitaire", place)).rejects.toThrow(TypeError)
  })
})

////////////////
// ## Helpers
////////////////

/** A new run of `project`, remembering in the test's storage. */
async function newRun(project = PROJECT): Promise<void> {
  core.resetRuntime()
  await core.remember(project, place)
}

/** A place that must be waited on, like the page server:  each store's values in `kept`, by key. */
class TestServerPlace extends WaitedOnPlace {
  readonly isAsync = true
  readonly description = "a test's server"

  constructor(public kept: Record<string, Record<string, unknown>>) {
    super()
  }

  async load(store: string, key: string): Promise<unknown> {
    return this.kept[store]?.[key]
  }

  async save(store: string, key: string, value: unknown): Promise<void> {
    const values = (this.kept[store] ??= {})
    if (value === undefined) delete values[key]
    else values[key] = value
  }

  async loadKeys(store: string): Promise<string[]> {
    return Object.keys(this.kept[store] ?? {})
  }

  async removeUnder(store: string, prefix: string): Promise<void> {
    for (const key of await this.loadKeys(store)) if (key.startsWith(prefix)) await this.save(store, key, undefined)
  }
}
