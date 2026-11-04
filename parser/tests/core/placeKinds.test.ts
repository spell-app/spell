/**
 * What's behind a place, from what its line says (`placeBehind()`):  here, a data folder's two kinds of address
 * (epic `atmosphere` P1), and who writes it, by its address (P4).
 * - The rest of what a place does at run time:  `places.test.ts`.
 */
import { describe, expect, test } from "vite-plus/test"

import * as PlacesFolder from "spell/util/places"
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

  test("any other server's says none of that, and a web folder is read straight off it", () => {
    const served = folderAt("/api/places/recipes")
    expect(served).toBeInstanceOf(PlacesFolder.RemotePlace)
    expect(served.describe()).not.toHaveProperty("checkedAtMostEvery")
    expect(served.describe()).not.toHaveProperty("identifiesBy")
    expect(folderAt("recipes/")).toBeInstanceOf(PlacesFolder.ChunkedPlace)
  })
})
