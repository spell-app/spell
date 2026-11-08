import { describe, expect, test } from "vite-plus/test"

import type { PlaceDescriptionOnDisk } from "spell/parser/spell/ingest/ingest.types"
import { PlaceNerd, type NerdGroup, type NerdSpec } from "spell/parser/spell/ingest/PlaceNerd"

/** A Star Wars-shaped description, as `spell place ingest` writes one:  three collections linking each other. */
const STAR_WARS = {
  about: {
    name: "star wars",
    kind: "web server",
    address: "https://swapi.example/api",
    lookedAt: "2026-11-04T00:00:00.000Z",
    fingerprint: "abc",
    readBy: "nobody"
  },
  canDo: { read: "Yes", write: "No", live: "No", limits: "None", browsers: "No" },
  allCollections: { idField: "url", idIsAnAddress: true, paging: "next field", rowsAt: "results" },
  collections: {
    people: {
      type: "character",
      at: "/people/",
      rowsSeen: 30,
      rowsItSays: 87,
      fields: {
        name: { words: "name", type: "text", example: "Luke Skywalker" },
        height: { words: "height", type: "number", example: "172" },
        homeworld: {
          words: "homeworld",
          type: "link",
          linksTo: "planets",
          example: "https://swapi.example/api/planets/1/"
        },
        films: { words: "films", type: "list of links", linksTo: "films" },
        url: { words: "url", type: "link", linksTo: "people" }
      }
    },
    planets: {
      type: "planet",
      at: "/planets/",
      rowsSeen: 30,
      fields: {
        name: { words: "name", type: "text" },
        residents: { words: "residents", type: "list of links", linksTo: "people" },
        url: { words: "url", type: "link", linksTo: "planets" }
      }
    },
    films: {
      type: "film",
      at: "/films/",
      rowsSeen: 7,
      fields: {
        title: { words: "title", type: "text" },
        characters: { words: "characters", type: "list of links", linksTo: "people" },
        planets: { words: "planets", type: "list of links", linksTo: "planets" },
        opening: {
          words: "opening",
          type: "inside",
          inside: { director: { words: "director", type: "link", linksTo: "directors" } }
        },
        url: { words: "url", type: "link", linksTo: "films" }
      }
    }
  }
} as unknown as PlaceDescriptionOnDisk

/** One main concept:  a recipe box pointing at things that point nowhere. */
const RECIPES = {
  ...STAR_WARS,
  about: { ...STAR_WARS.about, name: "recipe box" },
  collections: {
    recipes: {
      type: "recipe",
      at: "/recipes/",
      rowsSeen: 5,
      fields: {
        author: { words: "author", type: "link", linksTo: "cooks" },
        tags: { words: "tags", type: "list of links", linksTo: "tags" }
      }
    },
    cooks: { type: "cook", at: "/cooks/", rowsSeen: 2, fields: { name: { words: "name", type: "text" } } },
    tags: { type: "tag", at: "/tags/", rowsSeen: 9, fields: { name: { words: "name", type: "text" } } }
  }
} as unknown as PlaceDescriptionOnDisk

/** Every box in `spec`, by name, with its group's label. */
function boxesIn(spec: NerdSpec): Map<string, { fields: string[]; group: string; column: number }> {
  const boxes = new Map<string, { fields: string[]; group: string; column: number }>()
  spec.columns.forEach((column, index) => {
    for (const group of column.groups) {
      if ("legend" in group) continue
      const nodes = "nodes" in group ? group.nodes : group.lanes.flat()
      for (const node of nodes) boxes.set(node.name, { fields: node.fields ?? [], group: group.label, column: index })
    }
  })
  return boxes
}

describe("PlaceNerd.of()", () => {
  const spec = PlaceNerd.of(STAR_WARS)
  const boxes = boxesIn(spec)

  test("a box per collection, named by its type's words, keeping only its linking fields", () => {
    expect(boxes.get("Character")?.fields).toEqual(["homeworld", "films[]"])
    expect(boxes.get("Planet")?.fields).toEqual(["residents[]"])
    // the id field (`url`, from `allCollections`) and plain fields are the ERD's
    expect(boxes.get("Film")?.fields).toEqual(["characters[]", "planets[]", "opening"])
  })

  test("links are `ref`, a field's own object `contains`, named in the ingester's words", () => {
    expect(spec.edges).toContainEqual({ from: "Character.homeworld", to: "Planet", kind: "ref" })
    expect(spec.edges).toContainEqual({ from: "Character.films[]", to: "Film", kind: "ref" })
    expect(spec.edges).toContainEqual({ from: "Film.opening", to: "Opening", kind: "contains" })
    // a field inside it links on
    expect(spec.edges).toContainEqual({ from: "Opening.director", to: "Directors", kind: "ref" })
  })

  test("a field's own object goes under its owner;  what isn't described, under Elsewhere", () => {
    expect(boxes.get("Opening")?.column).toBe(boxes.get("Film")?.column)
    expect(boxes.get("Directors")?.group).toBe("Elsewhere")
  })

  test("at most three columns by default, filled before stacking, with one legend", () => {
    expect(spec.columns).toHaveLength(3)
    const legends = spec.columns.flatMap((column) => column.groups.filter((group) => "legend" in group))
    expect(legends).toHaveLength(1)
  })

  test("`columns` sets the most", () => {
    expect(PlaceNerd.of(STAR_WARS, { columns: 1 }).columns).toHaveLength(1)
    expect(PlaceNerd.of(STAR_WARS, { columns: 2 }).columns).toHaveLength(2)
  })

  test("one main concept:  it and what it points at side by side, two lanes", () => {
    const main = PlaceNerd.of(RECIPES)
    const group = main.columns[0]!.groups.find(
      (each): each is Extract<NerdGroup, { lanes: unknown }> => "lanes" in each
    )
    expect(group?.lanes.map((lane) => lane.map((node) => node.name))).toEqual([["Recipe"], ["Cook", "Tag"]])
  })
})

describe("PlaceNerd.erdOf()", () => {
  test("every field, its kind, the id said and links named by box", () => {
    expect(PlaceNerd.erdOf(STAR_WARS, "people")).toEqual([
      { key: "name", words: "name", kind: "text", example: "Luke Skywalker" },
      { key: "height", words: "height", kind: "number", example: "172" },
      {
        key: "homeworld",
        words: "homeworld",
        kind: "link",
        linksTo: "Planet",
        example: "https://swapi.example/api/planets/1/"
      },
      { key: "films", words: "films", kind: "list of links", linksTo: "Film" },
      { key: "url", words: "url", kind: "link", isId: true }
    ])
  })

  test("a box back to its collection", () => {
    expect(PlaceNerd.collectionOfBox(STAR_WARS, "Character")).toBe("people")
    expect(PlaceNerd.collectionOfBox(STAR_WARS, "Opening")).toBeUndefined()
  })
})
