import type { CollectionDescription, FieldDescription, PlaceDescription, PlaceDescriptionOnDisk } from "./ingest.types"

/****************
 * ### `PlaceNerd`
 * A place's NERD and ERD, read from what `spell place ingest` wrote of it (`<Name>.api.json5`;  epic `mockup` P11).
 * - A NERD ("not an entity relationship diagram") shows the SHAPE of the data, for people who don't care about
 *   columns, by the rules of Owen's NERD skill:
 *   - a box per collection, showing ONLY the fields that link to another box;  plain fields are the ERD's
 *   - each link `contains` (a field holding an object of its own, the ingester's `inside`:  a box of its own,
 *     a solid line) or `ref` (a link to another collection:  a dashed line)
 *   - a field's name is the ingester's own words for it (`homeworld`, `films[]` for a list), never worked out again
 *   - at most three columns by default (`columns`), filled before stacking (`columnsOf()`)
 * - What it makes is the NERD skill's spec as it is (`NerdSpec`):  `<ui-diagram>` draws it, and saved as JSON the
 *   skill's own script draws it too.
 * - The ERD is each box's every field and its kind (`erdOf()`), drawn on the box's back.
 * - PURE:  no DOM, no node, no file reading:  handed the description, so the editor and the command line share it.
 *   - Its types are the skill's spec's own keys, written out here:  `spell/parser` sits below Spell UI, so it can't
 *     name `<ui-diagram>`'s `DiagramSpec`, which takes these as they are.
 ****************/
export class PlaceNerd {
  /** The description it reads. */
  private readonly description: PlaceDescription
  /** Its most columns. */
  private readonly maxColumns: number
  /** Each box, by its name, in the order the collections are described. */
  private readonly boxes = new Map<string, NerdBox>()
  /** Each collection's box's name, by the collection's key. */
  private readonly boxOfCollection = new Map<string, string>()
  /** The links, in the order they're found. */
  private readonly edges: NerdEdge[] = []

  private constructor(
    description: PlaceDescription | PlaceDescriptionOnDisk,
    { columns = DEFAULT_COLUMNS }: NerdOptions
  ) {
    this.description = PlaceNerd.whole(description)
    this.maxColumns = Math.max(1, Math.floor(columns))
  }

  /**
   * `description`'s NERD, as the NERD skill's spec.
   * - `columns`:  its most columns, 3 unless it's told otherwise
   */
  static of(description: PlaceDescription | PlaceDescriptionOnDisk, options: NerdOptions = {}): NerdSpec {
    return new PlaceNerd(description, options).spec()
  }

  /**
   * The ERD side of `collection`'s box:  its every field, its kind, and the box it links to.
   * - The fields the ingester left out stay out;  its id field says so (`isId`).
   * - `[]` for a collection it doesn't describe.
   */
  static erdOf(description: PlaceDescription | PlaceDescriptionOnDisk, collection: string): ErdField[] {
    const nerd = new PlaceNerd(description, {})
    nerd.readBoxes()
    const described = nerd.description.collections[collection]
    if (!described || described.leftOut) return []
    const { idField } = described
    return Object.entries(described.fields)
      .filter(([, field]) => !field.leftOut)
      .map(([key, field]) => {
        const linksTo = field.linksTo === undefined ? undefined : nerd.boxOfCollection.get(field.linksTo)
        return {
          key,
          words: field.words,
          kind: field.type,
          ...(key === idField && { isId: true }),
          ...(linksTo !== undefined && key !== idField && { linksTo }),
          ...(field.example !== undefined && { example: field.example })
        }
      })
  }

  /** The name of `collection`'s box:  its type's words, a capital first, `Character`. */
  static boxNameOf(described: Pick<CollectionDescription, "type">): string {
    return capitalized(described.type)
  }

  /** The collection a box shows, by the box's name:  `undefined` for a box of its own (a field's object). */
  static collectionOfBox(description: PlaceDescription | PlaceDescriptionOnDisk, box: string): string | undefined {
    for (const [key, described] of Object.entries(PlaceNerd.whole(description).collections)) {
      if (!described.leftOut && PlaceNerd.boxNameOf(described) === box) return key
    }
    return undefined
  }

  ////////////////
  // ## Reading the boxes
  ////////////////

  /** The spec:  every box, its links, in columns. */
  private spec(): NerdSpec {
    this.readBoxes()
    this.readLinks()
    return { columns: this.columnsOf(), edges: this.edges }
  }

  /** A box per collection the ingester didn't leave out, named so each name is the diagram's only one. */
  private readBoxes() {
    for (const [key, described] of Object.entries(this.description.collections)) {
      if (described.leftOut) continue
      const name = this.freeName(PlaceNerd.boxNameOf(described))
      this.boxOfCollection.set(key, name)
      this.boxes.set(name, { name, note: noteOf(key, described), fields: [], role: "collection" })
    }
  }

  /** Each box's linking fields, and a box of its own for each field holding an object. */
  private readLinks() {
    for (const [key, described] of Object.entries(this.description.collections)) {
      const box = this.boxOfCollection.get(key)
      if (box === undefined) continue
      this.readFields(box, described.fields, described.idField)
    }
  }

  /** `fields` of `box`:  a row for each that links, a line to what it links to. */
  private readFields(box: string, fields: Record<string, FieldDescription>, idField?: string) {
    const owner = this.boxes.get(box)!
    for (const [key, field] of Object.entries(fields)) {
      if (field.leftOut || key === idField) continue
      if (field.inside && !field.isItsOwner) {
        const name = this.freeName(capitalized(field.words))
        const row = rowName(field.words, !!field.isListInside)
        owner.fields.push(row)
        this.boxes.set(name, { name, note: `inside ${owner.name}`, fields: [], role: "inside", of: box })
        this.edges.push({ from: `${box}.${row}`, to: name, kind: "contains" })
        this.readFields(name, field.inside)
      } else if (field.isItsOwner) {
        const row = rowName(field.words, true)
        owner.fields.push(row)
        this.edges.push({ from: `${box}.${row}`, to: box, kind: "contains" })
      } else if (field.linksTo !== undefined) {
        const row = rowName(field.words, field.type === "list of links")
        owner.fields.push(row)
        this.edges.push({ from: `${box}.${row}`, to: this.boxLinkedTo(field.linksTo), kind: "ref" })
      }
    }
  }

  /** The box `linksTo` names:  its collection's, or one of the boxes for what isn't described here. */
  private boxLinkedTo(linksTo: string): string {
    const box = this.boxOfCollection.get(linksTo)
    if (box !== undefined) return box
    const name = capitalized(linksTo)
    if (!this.boxes.has(name)) this.boxes.set(name, { name, note: "not described here", fields: [], role: "elsewhere" })
    return name
  }

  /**
   * `description` with every collection whole:  as it's written on disk, what every collection agrees on is said once,
   * in `allCollections`, which each collection takes (`descriptionFromDisk()`'s rule, kept here so this stays pure).
   */
  private static whole(description: PlaceDescription | PlaceDescriptionOnDisk): PlaceDescription {
    const { allCollections } = description as PlaceDescriptionOnDisk
    if (!allCollections) return description as PlaceDescription
    const each = Object.entries(description.collections).map(([key, described]) => [
      key,
      { ...allCollections, ...described }
    ])
    return { ...description, collections: Object.fromEntries(each) } as PlaceDescription
  }

  /** `name`, or `name 2` ... when a box already has it. */
  private freeName(name: string): string {
    let free = name
    for (let count = 2; this.boxes.has(free); count++) free = `${name} ${count}`
    return free
  }

  ////////////////
  // ## Columns
  ////////////////

  /**
   * The boxes in columns, by the NERD skill's rules:
   * - ONE main concept (one collection links to every other, and none of them links on):  its group gets two lanes,
   *   it on the left and what it points at beside it;  the rest in the next column
   * - else, several concepts:  what's pointed at most and points least on the left ("reusable"), what points out most
   *   on the right ("records"), the rest between;  filled before stacking, at most `maxColumns`
   * - a box of a field's own object goes under its owner;  what isn't described here, under the last column
   * - the legend at the top of the column with the fewest boxes
   */
  private columnsOf(): NerdColumn[] {
    const collections = [...this.boxes.values()].filter((box) => box.role === "collection")
    const main = this.mainConcept(collections)
    const columns: NerdGroup[][] = main ? this.aroundMain(main, collections) : this.byRole(collections)
    const elsewhere = [...this.boxes.values()].filter((box) => box.role === "elsewhere")
    if (elsewhere.length) {
      columns[columns.length - 1]!.push({ label: ELSEWHERE_LABEL, color: GREY, nodes: elsewhere.map(nodeOf) })
    }
    const counts = columns.map((groups) => groups.reduce((sum, group) => sum + boxCount(group), 0))
    const fewest = counts.indexOf(Math.min(...counts))
    columns[fewest]!.unshift({ legend: true })
    return columns.map((groups) => ({ groups }))
  }

  /** The one box that links to every other collection while none of those links on;  `undefined` when there's none. */
  private mainConcept(collections: readonly NerdBox[]): NerdBox | undefined {
    if (collections.length < 2) return undefined
    const names = new Set(collections.map((box) => box.name))
    const pointers = collections.filter((box) => this.targetsOf(box.name, names).size > 0)
    if (pointers.length !== 1) return undefined
    const [main] = pointers
    return this.targetsOf(main!.name, names).size === collections.length - 1 ? main : undefined
  }

  /** One main concept:  it and what it points at, two lanes;  the rest (their own objects) beside. */
  private aroundMain(main: NerdBox, collections: readonly NerdBox[]): NerdGroup[][] {
    const pointedAt = collections.filter((box) => box !== main)
    const lanes = [this.withInsides([main]), this.withInsides(pointedAt)]
    const columns: NerdGroup[][] = [[{ label: this.placeLabel(), color: COLORS[2]!, lanes }]]
    if (this.maxColumns > 2) columns.push([])
    return columns
  }

  /** Several concepts:  thirds, by how much each points out against how much it's pointed at. */
  private byRole(collections: readonly NerdBox[]): NerdGroup[][] {
    const names = new Set(collections.map((box) => box.name))
    const scoreOf = (box: NerdBox) =>
      this.targetsOf(box.name, names).size - this.sourcesOf(box.name, names).size + box.fields.length / 100
    const order = collections.map((box, index) => ({ box, index, score: scoreOf(box) }))
    order.sort((a, b) => a.score - b.score || a.index - b.index)
    const count = Math.min(this.maxColumns, order.length) || 1
    const each = Math.ceil(order.length / count)
    const roles = ROLES[count] ?? ROLES[3]!
    const columns: NerdGroup[][] = []
    for (let column = 0; column < count; column++) {
      const boxes = order.slice(column * each, (column + 1) * each).map(({ box }) => box)
      if (!boxes.length && column > 0) continue
      const role = roles[Math.min(column, roles.length - 1)]!
      const label = count === 1 ? this.placeLabel() : role.label
      columns.push([{ label, color: role.color, nodes: this.withInsides(boxes) }])
    }
    return columns
  }

  /** `boxes` as nodes, each followed by the boxes of its fields' own objects. */
  private withInsides(boxes: readonly NerdBox[]): NerdNode[] {
    const nodes: NerdNode[] = []
    const add = (box: NerdBox) => {
      nodes.push(nodeOf(box))
      for (const inside of this.boxes.values()) if (inside.role === "inside" && inside.of === box.name) add(inside)
    }
    for (const box of boxes) add(box)
    return nodes
  }

  /** The other boxes among `names` that `box` links to. */
  private targetsOf(box: string, names: ReadonlySet<string>): Set<string> {
    const owned = this.ownedBy(box)
    const targets = this.edges
      .filter((edge) => owned.has(edge.from.slice(0, edge.from.indexOf("."))) && edge.kind === "ref")
      .map((edge) => edge.to)
    return new Set(targets.filter((to) => to !== box && names.has(to)))
  }

  /** The other boxes among `names` that link to `box`. */
  private sourcesOf(box: string, names: ReadonlySet<string>): Set<string> {
    const sources = new Set<string>()
    for (const other of names) if (other !== box && this.targetsOf(other, names).has(box)) sources.add(other)
    return sources
  }

  /** `box` and the boxes of its fields' own objects, at every depth. */
  private ownedBy(box: string): Set<string> {
    const owned = new Set([box])
    for (let grew = true; grew;) {
      grew = false
      for (const inside of this.boxes.values()) {
        if (inside.role === "inside" && inside.of && owned.has(inside.of) && !owned.has(inside.name)) {
          owned.add(inside.name)
          grew = true
        }
      }
    }
    return owned
  }

  /** The place's own name, a capital first:  a group's label when there's only one. */
  private placeLabel(): string {
    return capitalized(this.description.about.name)
  }
}

////////////////
// ## Types
////////////////

/** What `PlaceNerd.of()` is told. */
export type NerdOptions = {
  /** Its most columns:  3 unless it's told otherwise (the NERD skill's own default). */
  columns?: number
}

/** A NERD, as the NERD skill's spec:  `<ui-diagram>`'s `DiagramSpec`, with only what a NERD of a place uses. */
export type NerdSpec = {
  /** Left to right, each a stack of groups. */
  columns: NerdColumn[]
  /** The links, from a box's field to another box. */
  edges: NerdEdge[]
}

/** One column:  its groups, top to bottom. */
export type NerdColumn = { groups: NerdGroup[] }

/** A group:  its boxes on a tinted background, its label above;  or the legend. */
export type NerdGroup =
  | { legend: true }
  | { label: string; color: string; nodes: NerdNode[] }
  | { label: string; color: string; lanes: NerdNode[][] }

/** One box. */
export type NerdNode = {
  /** Its name, in its header, and how its links name it. */
  name: string
  /** One line under its name. */
  note?: string
  /** Its linking fields, a row each:  `homeworld`, `films[]`. */
  fields?: string[]
}

/** A link from a box's field to another box. */
export type NerdEdge = {
  /** `<box>.<field>`:  `Character.homeworld`. */
  from: string
  /** The box it points at. */
  to: string
  /** `contains`:  the box owns it;  `ref`:  it exists by itself. */
  kind: "contains" | "ref"
}

/** One field of a box's ERD side. */
export type ErdField = {
  /** The source's name for it:  `homeworld`. */
  key: string
  /** What Spell calls it:  `homeworld`. */
  words: string
  /** What it holds, in the ingester's words:  `link`, `text`, `list of links`. */
  kind: FieldDescription["type"]
  /** It's the field saying which row is which. */
  isId?: boolean
  /** The box it links to. */
  linksTo?: string
  /** A real value, as the ingester saw it. */
  example?: unknown
}

/** A box while it's read:  what it shows, and where it goes. */
type NerdBox = {
  name: string
  note: string
  fields: string[]
  /** `collection`:  a collection's;  `inside`:  a field's own object;  `elsewhere`:  a collection not described here. */
  role: "collection" | "inside" | "elsewhere"
  /** An `inside` box's owner. */
  of?: string
}

////////////////
// ## Helpers
////////////////

/** The NERD skill's own most columns. */
const DEFAULT_COLUMNS = 3

/** The NERD skill's colours, as its examples use them. */
const COLORS = ["#0f766e", "#1d4ed8", "#7c3aed", "#047857"] as const

/** What isn't described here. */
const GREY = "#6b7280"

/** The group of collections a place links to without describing them. */
const ELSEWHERE_LABEL = "Elsewhere"

/** The groups' labels and colours, left to right, by how many columns there are. */
const ROLES: Record<number, readonly { label: string; color: string }[]> = {
  1: [{ label: "", color: COLORS[1] }],
  2: [
    { label: "Reference", color: COLORS[0] },
    { label: "Records", color: COLORS[2] }
  ],
  3: [
    { label: "Reference", color: COLORS[0] },
    { label: "Core", color: COLORS[1] },
    { label: "Records", color: COLORS[2] }
  ]
}

/** `box` as the spec's node:  no empty field list. */
function nodeOf({ name, note, fields }: NerdBox): NerdNode {
  return { name, note, ...(fields.length > 0 && { fields }) }
}

/** How many boxes a group holds. */
function boxCount(group: NerdGroup): number {
  if ("nodes" in group) return group.nodes.length
  if ("lanes" in group) return group.lanes.reduce((sum, lane) => sum + lane.length, 0)
  return 0
}

/** A field's row:  its words, `[]` after a list's, as the NERD skill writes them (`steps[]`). */
function rowName(words: string, isList: boolean): string {
  return isList ? `${words}[]` : words
}

/** A collection's note:  what it's about, else its key and how many rows it says it has. */
function noteOf(key: string, { about, rowsItSays, rowsSeen }: CollectionDescription): string {
  if (about) return about.length > NOTE_MOST ? `${about.slice(0, NOTE_MOST - 1)}…` : about
  return `${key} · ${rowsItSays ?? rowsSeen} rows`
}

/** The longest note, in characters:  one line under a box's name. */
const NOTE_MOST = 40

/** `words` with a capital first:  `character` => `Character`. */
function capitalized(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1)
}
