import { collectionNameFor } from "spell/parser/spell/rules/places/places.shared"
import { jsonIn } from "spell/parser/spell/translate/NamesPass"
import type { ClaudeRunner, JsonSchema } from "spell/parser/spell/translate/translate.types"

import type { CollectionLook, PlaceDescription, PlaceLook, PlaceVersion } from "./ingest.types"
import { isSpellsOwnType } from "./PlaceShape"

/** How many rows of each collection the agent sees:  samples, never the whole of it. */
const SAMPLE_ROWS = 3

/** The longest text it sees of a value. */
const LONGEST_TEXT = 200

/** How many items of a list it sees. */
const LONGEST_LIST = 3

/** What the agent is told it is. */
const SYSTEM = `You read samples of a data source and describe it for a program written in Spell, a language of plain words.
Say only what the samples and docs show.  Answer only with what you're asked for, in the form asked for.`

/** A word a person writes:  a type's or a property's. */
const IS_WORDS = /^[a-z][a-z0-9 ]*$/

/** What it asks the agent's answer to be. */
const ANSWER_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["placeName", "version", "versionWhere", "limits", "write", "checkEverySeconds", "notes", "collections"],
  properties: {
    placeName: { type: "string", description: "what a program calls this place, one or two lowercase words" },
    version: { type: "string", description: "its own word for its version, from its docs;  empty if it names none" },
    versionWhere: { type: "string", description: "where it says so;  empty if it names none" },
    limits: { type: "string", description: "its request limits, from its docs;  empty if nothing says" },
    write: { type: "string", description: "what its docs say it takes as writes;  empty if nothing says" },
    checkEverySeconds: { type: "number", description: "how often a program should ask what changed:  never impolite" },
    notes: { type: "array", items: { type: "string" }, description: "what someone using it should know, short" },
    collections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "typeWords", "about", "idField", "fields"],
        properties: {
          name: { type: "string", description: "the collection's key, as given" },
          typeWords: { type: "string", description: "one thing of it, lowercase and singular:  film" },
          about: { type: "string", description: "what it holds, one short sentence" },
          idField: { type: "string", description: "the field that says which row is which;  empty if none does" },
          fields: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["field", "words", "means"],
              properties: {
                field: { type: "string", description: "the field's name, as given" },
                words: { type: "string", description: "what a program calls it, lowercase words:  hair color" },
                means: { type: "string", description: "what it holds, a few words" }
              }
            }
          }
        }
      }
    }
  }
}

/** What the agent answers. */
type AgentReading = {
  placeName: string
  version: string
  versionWhere: string
  limits: string
  write: string
  checkEverySeconds: number
  notes: string[]
  collections: Array<{
    name: string
    typeWords: string
    about: string
    idField: string
    fields: Array<{ field: string; words: string; means: string }>
  }>
}

/**
 * What the agent's asked:  what the rows show, samples of them, and any docs.
 * - Samples only (`SAMPLE_ROWS`), every text and list cut short:  it never sees whole data.
 */
export function promptFor(description: PlaceDescription, look: PlaceLook): string {
  const collections = Object.entries(description.collections).map(([name, collection]) => {
    const seen = look.collections.find(({ at }) => at === collection.at)
    return {
      name,
      type: collection.type,
      idFieldFound: collection.idField ?? "",
      fields: Object.fromEntries(Object.entries(collection.fields).map(([field, { type }]) => [field, type])),
      sample: seen ? sampleOf(seen) : []
    }
  })
  const words = [
    `A place's Spell says things like:  family cookbook is a web server at "..."`,
    `a "recipe" is a view:`,
    `A type can't be one of Spell's own:  character, date, list, number, page, place, text, thing, view.`
  ]
  return [
    `A ${description.about.kind} at ${description.about.address}.`,
    ...words,
    `Its collections, what each field seems to hold, and samples:`,
    JSON.stringify(collections, null, 1),
    ...(look.docs ? [`Its docs, from ${look.docsAt}, cut short:`, look.docs] : [`It has no docs that could be found.`]),
    `Keep every collection's name and every field's name as given.`
  ].join("\n\n")
}

/** A few rows, each value cut short. */
function sampleOf({ rows }: CollectionLook): unknown[] {
  return rows
    .slice(0, SAMPLE_ROWS)
    .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, cut(value)])))
}

/** `value`, cut short. */
function cut(value: unknown): unknown {
  if (typeof value === "string") return value.slice(0, LONGEST_TEXT)
  if (Array.isArray(value)) return value.slice(0, LONGEST_LIST).map(cut)
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, LONGEST_TEXT)
  return value
}

/**
 * Have the agent read the samples, and put what it says on the description:  `true` if it answered.
 * - Believed only as far as it can be checked:  it can name and explain what was seen, never add to it.
 *   A collection or field it invents is ignored;  a word that isn't plain words, or an id that isn't really unique, too.
 * - NEVER throws:  an agent that fails, or answers nonsense twice, leaves what could be worked out alone, and a note says so.
 */
export async function agentRead(
  description: PlaceDescription,
  look: PlaceLook,
  claude: ClaudeRunner,
  { keepName = false }: { keepName?: boolean } = {}
): Promise<boolean> {
  const prompt = promptFor(description, look)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const answer = await claude(prompt, {
        pass: "describePlace",
        tier: "balanced",
        system: SYSTEM,
        schema: ANSWER_SCHEMA
      })
      const reading = jsonIn(answer) as AgentReading | undefined
      if (reading?.collections) {
        applyReading(description, reading, look, { keepName })
        return true
      }
    } catch (error) {
      if (attempt === 2) {
        description.notes.push(
          `The agent couldn't read it:  ${error instanceof Error ? error.message : String(error)}.`
        )
        return false
      }
    }
  }
  description.notes.push("The agent's answer wasn't what was asked for:  this is only what could be worked out.")
  return false
}

/** SIDE EFFECT:  what the agent read, as far as it checks out, on `description`:  see `agentRead()`. */
function applyReading(
  description: PlaceDescription,
  reading: AgentReading,
  look: PlaceLook,
  { keepName }: { keepName: boolean }
): void {
  const { about, canDo } = description
  const placeName = reading.placeName.replace(/^(?:the|an?) /i, "")
  if (!keepName && IS_WORDS.test(placeName)) about.name = placeName
  if (reading.version && !about.version)
    about.version = { says: reading.version, where: reading.versionWhere || "its docs" } satisfies PlaceVersion
  if (reading.limits && /named none/.test(canDo.limits)) canDo.limits = reading.limits
  if (reading.write && /Nothing says/.test(canDo.write)) canDo.write = `${reading.write}  Never tried.`
  if (reading.checkEverySeconds >= 1 && description.checkEverySeconds !== undefined) {
    description.checkEverySeconds = Math.round(reading.checkEverySeconds)
  }
  description.notes.push(...reading.notes.filter(Boolean))
  for (const said of reading.collections) {
    const collection = description.collections[said.name]
    if (!collection) continue
    if (IS_WORDS.test(said.typeWords) && !isSpellsOwnType(said.typeWords)) collection.type = said.typeWords
    if (said.about) collection.about = said.about
    const rows = look.collections.find(({ at }) => at === collection.at)?.rows ?? []
    if (said.idField && said.idField in collection.fields && isUniqueIn(rows, said.idField)) {
      collection.idField = said.idField
      if (collection.fields[said.idField]!.type === "link") collection.idIsAnAddress = true
      else delete collection.idIsAnAddress
    }
    for (const { field, words, means } of said.fields) {
      const held = collection.fields[field]
      if (!held) continue
      if (IS_WORDS.test(words)) held.words = words
      if (means) held.means = means
    }
  }
  renameCollections(description)
}

/**
 * SIDE EFFECT:  each collection goes by its type's plural, which is what a program's lines find it by:
 * a type the agent called `character` is `characters`, whatever the source calls it, and its links follow.
 */
export function renameCollections(description: PlaceDescription): void {
  const renamed = new Map(
    Object.entries(description.collections).map(([name, { type }]) => [name, collectionNameFor(type)])
  )
  description.collections = Object.fromEntries(
    Object.entries(description.collections).map(([name, collection]) => [renamed.get(name)!, collection])
  )
  for (const collection of Object.values(description.collections)) {
    for (const field of Object.values(collection.fields))
      if (field.linksTo) field.linksTo = renamed.get(field.linksTo) ?? field.linksTo
    // the lists under each of its things, by the collection each is of (epic `data` P30)
    if (collection.listsUnder) {
      const lists = Object.entries(collection.listsUnder).map(([list, at]) => [renamed.get(list) ?? list, at])
      collection.listsUnder = Object.fromEntries(lists)
    }
  }
}

/** Does every one of `rows` hold its own value in `field`? */
function isUniqueIn(rows: ReadonlyArray<Record<string, unknown>>, field: string): boolean {
  const values = rows.map((row) => row[field])
  return (
    values.every((value) => value !== undefined && value !== null && value !== "") &&
    new Set(values).size === values.length
  )
}
