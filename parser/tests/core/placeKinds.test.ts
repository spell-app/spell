/**
 * What's behind a place, from what its line says (`placeBehind()`).  Here, a data folder's:
 * - two kinds of address (epic `atmosphere` P1)
 * - who may write it, by its address (P4)
 * - where a space's own folder is read direct (P5)
 * - The rest of what a place does at run time:  `places.test.ts`.
 */
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import * as PlacesFolder from "spell/places"
import { placeBehind } from "spell/parser/core/placeKinds"

/** What's behind a data folder at `at`. */
function folderAt(at: string) {
  return placeBehind({
    details: { name: "family_cookbook", kind: "data folder", at },
    folder: PlacesFolder,
    collection: "recipes",
    Class: Object,
    person: { id: "guest-1", name: "Guest 1" }
  })
}

/** What's behind a web server whose lines say `details`. */
function webServerWith(details: object) {
  return placeBehind({
    details: { name: "cookbook", kind: "web server", at: "https://cookbook.test", ...details },
    folder: PlacesFolder,
    collection: "recipes",
    Class: Object,
    person: { id: "guest-1", name: "Guest 1" }
  })
}

describe("placeBehind(), a web server (epic `data` I35)", () => {
  test("says what its lines say it can do", () => {
    expect(
      webServerWith({
        pagesByOffset: { limit: "per", offset: "from" },
        filters: ["cuisine"],
        sorts: "every field",
        fieldsNamedIn: "response_fields",
        readOnly: true
      }).describe()
    ).toMatchObject({
      page: "offset",
      filter: ["cuisine"],
      sort: "every field",
      select: "every field",
      write: "none"
    })
  })

  test("with no lines it promises nothing, and takes writes", () => {
    expect(webServerWith({}).describe()).toMatchObject({
      page: "none",
      filter: "none",
      sort: "none",
      select: "none",
      write: ["insert", "update", "delete"]
    })
  })

  test("pages counted by number are paged by offset, asked for by what they're called", () => {
    expect(webServerWith({ pagesByNumber: { limit: "per_page", page: "page" } }).describe().page).toBe("offset")
    expect(webServerWith({ pagesByNumber: { page: "p", first: 0 } }).describe().page).toBe("offset")
  })

  test("the last row's id is a kind of cursor", () => {
    expect(webServerWith({ pagesByLastId: { param: "after", moreIn: "has_more" } }).describe().page).toBe("cursor")
  })

  test("its next page in its `Link` header still pages by cursor", () => {
    expect(webServerWith({ nextPageInLink: true }).describe()).toMatchObject({ page: "cursor" })
  })
})

describe("placeBehind(), a web server's collection paging its own way (epic `data` P56)", () => {
  afterEach(() => void vi.unstubAllGlobals())

  test("its own paging lines win for it;  the place's for the rest", async () => {
    const asked: string[] = []
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      asked.push(`${input instanceof Request ? input.url : input}`)
      return Response.json([])
    })
    const behind = webServerWith({
      pagesByOffset: { limit: "limit", offset: "offset" },
      pageSize: 500,
      collections: {
        recipes: { at: "/recipes" },
        events: { at: "/events", paging: { pagesByOffset: { limit: "take", offset: "skip" }, pageSize: 100 } }
      }
    })
    await behind.list("recipes", {}, {})
    await behind.list("events", {}, {})
    expect(asked).toEqual([
      "https://cookbook.test/recipes?limit=500&offset=0",
      "https://cookbook.test/events?take=100&skip=0"
    ])
  })
})

describe("placeBehind(), a data folder", () => {
  test("a project data folder's address is the page server's, and says what its server does", () => {
    const behind = folderAt("/api/places/spaces/owen@spell/recipes")
    expect(behind).toBeInstanceOf(PlacesFolder.RemotePlace)
    expect(behind.describe()).toMatchObject({
      kind: "data folder",
      whoWrites: "its members",
      checkedAtMostEvery: 5,
      identifiesBy: "this machine"
    })
  })

  test("who writes it:  a space's own folder its members;  a program's own data, or a person's, each row's owner", () => {
    const whoWrites = (at: string) => folderAt(`/api/places/spaces/${at}`).describe().whoWrites
    expect(whoWrites("@family/cookbook")).toBe("its members")
    expect(whoWrites("@spell/examples/RecipeBox/__data/recipes")).toBe("only the owner")
    expect(whoWrites("personal/recipes")).toBe("only the owner")
    expect(PlacesFolder.whoWritesFolderAt("http://127.0.0.1:4747/api/places/spaces/owen@spell/recipes?x")).toBe(
      "its members"
    )
  })

  test("a space's own folder is read direct, apart from where it's written;  a program's own data isn't (P5)", () => {
    const readsAt = (at: string) =>
      (folderAt(`/api/places/spaces/${at}`) as unknown as { reads?: { store: { url: string } } }).reads?.store.url
    expect(readsAt("@family/cookbook")).toBe("/api/reads/spaces/@family/cookbook")
    expect(readsAt("personal/recipes")).toBeUndefined()
    expect(readsAt("@spell/examples/RecipeBox/__data/recipes")).toBeUndefined()
    expect(PlacesFolder.spaceReadAddressFor("http://127.0.0.1:4747/api/places/spaces/owen@spell/recipes?x")).toBe(
      "http://127.0.0.1:4747/api/reads/spaces/owen@spell/recipes"
    )
  })

  test("any other server's says none of that, and a web folder is read straight off it", () => {
    const served = folderAt("/api/places/recipes")
    expect(served).toBeInstanceOf(PlacesFolder.RemotePlace)
    expect(served.describe()).not.toHaveProperty("checkedAtMostEvery")
    expect(served.describe()).not.toHaveProperty("identifiesBy")
    expect(folderAt("recipes/")).toBeInstanceOf(PlacesFolder.ChunkedPlace)
  })
})

describe("placeBehind(), a sheet or an Excel file (epic `data` P38)", () => {
  /** What's behind a place of `kind` at `at`. */
  const behind = (kind: string, at: string) =>
    placeBehind({
      details: { name: "family_cookbook", kind, at },
      folder: PlacesFolder,
      collection: "recipes",
      Class: Object,
      person: { id: "guest-1", name: "Guest 1" }
    })

  test("a spreadsheet reads Excel by its address's ending;  a .csv stays CSV", () => {
    expect((behind("sheet", "https://x.test/recipes.xlsx") as PlacesFolder.SheetPlace).format).toBe("excel")
    expect((behind("sheet", "https://x.test/recipes.csv") as PlacesFolder.SheetPlace).format).toBe("csv")
  })

  test("an excel file is a workbook whatever its address ends in;  at a place server's address, the server writes it", () => {
    expect((behind("excel file", "https://x.test/download?id=7") as PlacesFolder.SheetPlace).format).toBe("excel")
    expect(behind("excel file", "/api/places/recipes")).toBeInstanceOf(PlacesFolder.RemotePlace)
  })
})

describe("placeBehind(), a file a person picks (epic `editor` P41)", () => {
  /** What's behind a picked file of `kind`, in program `program`. */
  const picked = (kind: string) =>
    placeBehind({
      details: { name: "family_cookbook", kind, picked: true },
      folder: PlacesFolder,
      collection: "recipes",
      Class: Object,
      person: { id: "guest-1", name: "Guest 1" },
      program: "@test/cookbook"
    }) as PlacesFolder.PickedFilePlace

  test("a json, csv or excel file with no address is a picked file, in its format, remembered by program and name", () => {
    expect(picked("file")).toBeInstanceOf(PlacesFolder.PickedFilePlace)
    expect([picked("file"), picked("sheet"), picked("excel file")].map((place) => place.format)).toEqual([
      "json",
      "csv",
      "excel"
    ])
    expect(picked("file").key).toBe("@test/cookbook/family_cookbook")
    expect(picked("file").describe()).toMatchObject({ kind: "json file", write: ["insert", "update", "delete"] })
  })

  test("a file with no address that isn't picked still needs a server side", () => {
    expect(() =>
      placeBehind({
        details: { name: "family_cookbook", kind: "file" },
        folder: PlacesFolder,
        collection: "recipes",
        Class: Object,
        person: { id: "guest-1", name: "Guest 1" }
      })
    ).toThrow(TypeError)
  })
})

describe("placeBehind(), a sheet that's the program's own CSV file (epic `language` T65)", () => {
  /** What's behind a sheet at `at`, its line naming `idColumn`. */
  const sheetAt = (at: string, idColumn?: string) =>
    placeBehind({
      details: { name: "task_sheet", kind: "sheet", at, ...(idColumn !== undefined && { idColumn }) },
      folder: PlacesFolder,
      collection: "tasks",
      Class: Object,
      person: { id: "guest-1", name: "Guest 1" }
    })

  test("on the page server, it takes writes, by `id` unless its line names another column", () => {
    const behind = sheetAt("/api/places/spaces/@spell/examples/TaskList/__data/tasks.csv")
    expect(behind).toBeInstanceOf(PlacesFolder.RemotePlace)
    expect(behind.describe()).toMatchObject({ kind: "sheet", atomic: true, idOf: "id" })
    const keyed = sheetAt("/api/places/spaces/@spell/examples/TaskList/__data/tasks.csv", "key")
    expect(keyed.describe()).toMatchObject({ idOf: "key" })
    expect((keyed as unknown as { lines: object }).lines).toEqual({ idColumn: "key" })
  })
})

describe("placeBehind(), a line naming a sheet's column (epic `data` I36)", () => {
  const collections = { recipes: { at: "Recipes", fields: { title: "Dish Name" } } }
  const fieldLines = { recipes: { fields: { title: "Dish Name" } } }

  /** What's behind a place of `kind` at `at`. */
  const behind = (kind: string, at: string) =>
    placeBehind({
      details: { name: "family_cookbook", kind, at, collections },
      folder: PlacesFolder,
      collection: "recipes",
      Class: Object,
      person: { id: "guest-1", name: "Guest 1" }
    }) as unknown as { collections?: object; lines?: object }

  test("a sheet read from the browser is told", () => {
    expect(behind("sheet", "https://x.test/recipes.csv").collections).toEqual(fieldLines)
    expect(behind("excel file", "https://x.test/recipes.xlsx").collections).toEqual(fieldLines)
  })

  test("a sheet on a server sends it with each request", () => {
    expect(behind("sheet", "/api/places/recipes").lines).toEqual({ collections: fieldLines })
    expect(behind("sheet", "/api/places/spaces/@x/n/__data/recipes.csv").lines).toEqual({ collections: fieldLines })
    expect(behind("google sheet", "/api/places/recipes").lines).toEqual({ collections: fieldLines })
  })
})
