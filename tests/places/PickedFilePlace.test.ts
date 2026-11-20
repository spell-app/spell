import { describe, expect, it } from "vite-plus/test"

import { PickedFilePlace, type PickedFileStatus } from "spell/places/PickedFilePlace"

import { FakeBrowser, FakeFileHandle, FakeMemory, plainFile } from "./fakeFileHandle"

const RECIPES = `${JSON.stringify({ recipes: [{ id: "r1", title: "Soup" }] }, null, 2)}\n`

/** A place on a fake disk, its statuses heard. */
function placeWith({ browser = new FakeBrowser(), memory = new FakeMemory() } = {}) {
  const place = new PickedFilePlace({ key: "@test/cookbook/family_cookbook", browser, memory })
  const statuses: PickedFileStatus[] = []
  place.onStatus((status) => statuses.push(status))
  return { place, browser, memory, statuses }
}

/** A title change to r1. */
const retitle = (title: string) => [{ kind: "update" as const, collection: "recipes", id: "r1", fields: { title } }]

describe("PickedFilePlace", () => {
  it("no file yet:  no rows, and its status asks for one", async () => {
    const { place } = placeWith()
    expect((await place.list("recipes")).rows).toEqual([])
    expect(place.status).toBe("no file")
  })

  it("a picked file is read, and a change goes back to the same file at once", async () => {
    const { place, browser, memory } = placeWith()
    const file = new FakeFileHandle("recipes.json", RECIPES)
    browser.picks.push(file)
    await place.pick()
    expect((await place.list("recipes")).rows).toEqual([{ id: "r1", title: "Soup" }])
    expect(place.status).toBe("ready")
    await place.apply(retitle("Stew"))
    expect(JSON.parse(file.contents!)).toEqual({ recipes: [{ id: "r1", title: "Stew" }] })
    expect(memory.kept?.unsaved).toBe(false)
  })

  it("after a reload with no permission:  rows from the copy here, the Reopen status;  a save asks, then writes", async () => {
    const memory = new FakeMemory()
    const file = new FakeFileHandle("recipes.json", RECIPES)
    const first = placeWith({ memory })
    first.browser.picks.push(file)
    await first.place.pick()
    file.permission = "prompt"
    const { place } = placeWith({ memory })
    expect((await place.list("recipes")).rows).toEqual([{ id: "r1", title: "Soup" }])
    expect(place.status).toBe("needs permission")
    await place.apply(retitle("Stew"))
    expect(file.writes).toEqual([])
    expect(memory.kept?.unsaved).toBe(true)
    await place.save()
    expect(file.asked).toBe(1)
    expect(JSON.parse(file.contents!).recipes[0].title).toBe("Stew")
    expect(place.status).toBe("ready")
  })

  it("permission still there after a reload:  the file is read quietly", async () => {
    const memory = new FakeMemory()
    const file = new FakeFileHandle("recipes.json", RECIPES)
    const first = placeWith({ memory })
    first.browser.picks.push(file)
    await first.place.pick()
    file.editElsewhere(RECIPES.replace("Soup", "Salad"))
    const { place } = placeWith({ memory })
    expect((await place.list("recipes")).rows[0]!.title).toBe("Salad")
    expect(file.asked).toBe(0)
  })

  it("denied:  still the Reopen status, and nothing is written", async () => {
    const { place, browser } = placeWith()
    const file = new FakeFileHandle("recipes.json", RECIPES)
    browser.picks.push(file)
    await place.pick()
    file.permission = "denied"
    file.answer = "denied"
    await place.apply(retitle("Stew"))
    await place.save()
    expect(place.status).toBe("needs permission")
    expect(file.writes).toEqual([])
  })

  it("changed by someone else under my unsaved change:  a conflict, never written over", async () => {
    const { place, browser, statuses } = placeWith()
    const file = new FakeFileHandle("recipes.json", RECIPES)
    browser.picks.push(file)
    await place.pick()
    file.editElsewhere(RECIPES.replace("Soup", "Salad"))
    await place.apply(retitle("Stew"))
    expect(statuses.at(-1)).toBe("conflict")
    expect(JSON.parse(file.contents!).recipes[0].title).toBe("Salad")
    expect(file.writes).toEqual([])
  })

  it("keep theirs:  the file read again, mine set aside;  keep yours:  written over", async () => {
    const { place, browser, memory } = placeWith()
    const file = new FakeFileHandle("recipes.json", RECIPES)
    browser.picks.push(file)
    await place.pick()
    file.editElsewhere(RECIPES.replace("Soup", "Salad"))
    await place.apply(retitle("Stew"))
    const told: unknown[] = []
    place.watch({ collection: "recipes" }, (event) => told.push(event.row))
    await place.keepTheirs()
    expect((await place.list("recipes")).rows[0]!.title).toBe("Salad")
    expect(told).toEqual([{ id: "r1", title: "Salad" }])
    expect(JSON.parse(memory.aside as string).recipes[0].title).toBe("Stew")
    file.editElsewhere(RECIPES.replace("Soup", "Pie"))
    await place.apply(retitle("Stew"))
    expect(place.status).toBe("conflict")
    await place.keepYours()
    expect(JSON.parse(file.contents!).recipes[0].title).toBe("Stew")
  })

  it("keep both:  mine to a new file, which becomes the place's;  theirs stays", async () => {
    const { place, browser } = placeWith()
    const file = new FakeFileHandle("recipes.json", RECIPES)
    const copy = new FakeFileHandle("recipes 2.json", "")
    browser.picks.push(file)
    browser.newFiles.push(copy)
    await place.pick()
    file.editElsewhere(RECIPES.replace("Soup", "Salad"))
    await place.apply(retitle("Stew"))
    await place.saveAsNew()
    expect(JSON.parse(copy.contents!).recipes[0].title).toBe("Stew")
    expect(JSON.parse(file.contents!).recipes[0].title).toBe("Salad")
    expect(place.fileName).toBe("recipes 2.json")
  })

  it("moved, renamed or deleted:  not found, nothing written, the copy kept", async () => {
    const { place, browser, memory } = placeWith()
    const file = new FakeFileHandle("recipes.json", RECIPES)
    browser.picks.push(file)
    await place.pick()
    file.remove()
    await place.apply(retitle("Stew"))
    expect(place.status).toBe("not found")
    expect(file.writes).toEqual([])
    expect((await place.list("recipes")).rows[0]!.title).toBe("Stew")
    expect(memory.kept?.unsaved).toBe(true)
  })

  it("changed while open, nothing unsaved:  the tab coming back says so;  read again takes it", async () => {
    const { place, browser } = placeWith()
    const file = new FakeFileHandle("recipes.json", RECIPES)
    browser.picks.push(file)
    await place.pick()
    const stop = place.watch({ collection: "recipes" }, () => {})
    file.editElsewhere(RECIPES.replace("Soup", "Salad"))
    browser.showTab()
    await expect.poll(() => place.status).toBe("changed")
    await place.readAgain()
    expect((await place.list("recipes")).rows[0]!.title).toBe("Salad")
    expect(place.status).toBe("ready")
    stop()
  })

  it("no handles (Safari, Firefox):  a plain file read, changes kept here, a save downloads it by its name", async () => {
    const { place, browser, memory, statuses } = placeWith({ browser: new FakeBrowser(false) })
    browser.picks.push(plainFile("recipes.json", RECIPES))
    await place.pick()
    expect(place.status).toBe("plain file")
    await place.apply(retitle("Stew"))
    expect(memory.kept?.unsaved).toBe(true)
    await place.save()
    expect(browser.downloads.map(({ name }) => name)).toEqual(["recipes.json"])
    expect(JSON.parse(browser.downloads[0]!.text).recipes[0].title).toBe("Stew")
    expect(statuses.at(-1)).toBe("downloaded")
    await place.save()
    expect(place.status).toBe("plain file")
  })

  it("a bare JSON list:  any collection reads it, and it's written back as a list", async () => {
    const { place, browser } = placeWith()
    const file = new FakeFileHandle("recipes.json", JSON.stringify([{ id: "r1", title: "Soup" }]))
    browser.picks.push(file)
    await place.pick()
    await place.apply(retitle("Stew"))
    expect(JSON.parse(file.contents!)).toEqual([{ id: "r1", title: "Stew" }])
  })

  it("a CSV file:  only the line that changed changes", async () => {
    const browser = new FakeBrowser()
    const place = new PickedFilePlace({ key: "@test/tasks/tasks", format: "csv", browser, memory: new FakeMemory() })
    const file = new FakeFileHandle("tasks.csv", "id,title\n1,Wash\n2,Dry\n")
    browser.picks.push(file)
    await place.pick()
    expect((await place.list("tasks")).rows).toEqual([
      { id: "1", title: "Wash" },
      { id: "2", title: "Dry" }
    ])
    await place.apply([{ kind: "update", collection: "tasks", id: "2", fields: { title: "Fold" } }])
    expect(file.contents).toBe("id,title\n1,Wash\n2,Fold\n")
  })
})
