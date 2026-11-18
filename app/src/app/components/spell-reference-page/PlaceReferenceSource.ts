import JSON5 from "json5"

import type {
  CollectionDescription,
  Deployment,
  FieldDescription,
  OperationDescription,
  PlaceDescription,
  PlaceDescriptionOnDisk,
  PlaceState
} from "spell/parser/spell/ingest/ingest.types"
import { descriptionFromDisk } from "spell/parser/spell/ingest/PlaceOnDisk"
import { PlaceWords, type ThingWords, type WordsTarget } from "spell/parser/spell/ingest/PlaceWords"
import { PROJECT_FILE } from "spell/parser/spell/spell.types"
import { SpellUrls } from "spell/parser/spell/SpellUrls"
import type { spellReferencePageVocabulary } from "./SpellReferencePage.en"
import type {
  Reference,
  ReferenceColor,
  ReferenceItem,
  ReferenceSection,
  ReferenceSource,
  ReferenceState,
  ReferenceTextEdit,
  ReferenceWords
} from "./SpellReferencePage.types"

/****************
 * ### `PlaceReferenceSource`
 * A place's reference (epic `data` P52, P53):  what `<spell-reference-page src>` draws for a place's description.
 * - What it FOUND, from its description, `<Name>.api.json5`, read whole through `descriptionFromDisk()`, the ONE
 *   reading of a description (J261):
 *   - its line:  what and where it is, its version, when it was looked at, how many of its lists are in each state
 *   - where it runs:  the deployments its project's file lists
 *   - a section per tag (NetBox's `dcim`, `ipam` ...;  one, "Lists", for a place with none), a section per list in
 *     it:  its address, how trying it went, what it can change, its fields
 *   - the agent's notes about it, and the last look's
 * - What a PERSON wrote, from its Spell file beside it, `<Name>.api.spell`:  the `--` lines `PlaceWords` reads
 *   (the place's prose, a type's words, a field's), and the ingest's dated marks.
 * - Plain TypeScript, no Solid, and no parser:  the element draws it, and the editor's Data tab reads places through
 *   it too (`SitePlaces`).
 * - Changes nothing:  a place is changed by `spell place update`;  only its words change here, saved by the page.
 ****************/
export class PlaceReferenceSource implements ReferenceSource {
  readonly reference: Reference
  readonly wordsFile: string | undefined

  /** The words file's text now:  `""` without one. */
  private text: string

  /** Each type's name in its Spell, by the collection it's for:  `jobs` => `job`. */
  private readonly typeOf: Record<string, string>

  constructor(
    readonly place: PlaceOnServer,
    /** Its Spell file:  its address and text;  `undefined` for none, its words not shown or edited. */
    spell: { path: string; text: string } | undefined,
    /** A label, in the reader's language:  the element's texts. */
    private readonly say: Say
  ) {
    this.wordsFile = spell?.path
    this.text = spell?.text ?? ""
    const description = descriptionFromDisk(place.description)
    this.typeOf = Object.fromEntries(Object.entries(description.collections).map(([key, { type }]) => [key, type]))
    this.reference = this.referenceOf(description)
  }

  /**
   * The place whose description is at `path`, `@spell/examples/StarWars/StarWars.api.json5`, and its Spell file beside
   * it:  `undefined` when the description won't load or parse, said in the console.
   * - Its Spell file missing:  no words, nothing to edit.
   * - NEVER throws.
   */
  static async at(path: string, say: Say): Promise<PlaceReferenceSource | undefined> {
    const place = await PlaceReferenceSource.placeAt(path)
    if (!place) return undefined
    const spellPath = path.replace(/\.json5$/, ".spell")
    const text = spellPath === path ? undefined : await textAt(spellPath)
    return new PlaceReferenceSource(place, text === undefined ? undefined : { path: spellPath, text }, say)
  }

  /**
   * The place whose description is at `path`, read over the page server:  its name, its description, where it runs.
   * - Its project is the folder it's in.
   * - `undefined` when it won't load or parse, said in the console.
   * - NEVER throws.
   */
  static async placeAt(path: string): Promise<PlaceOnServer | undefined> {
    const projectId = path.slice(0, path.lastIndexOf("/"))
    try {
      const text = await textAt(path)
      if (text === undefined) throw new Error("it isn't there")
      const description = JSON5.parse(text) as PlaceDescriptionOnDisk
      const deployments = await deploymentsOf(projectId, description.about.name)
      return { name: description.about.name, path, description, ...(deployments && { deployments }) }
    } catch (error) {
      console.error(`PlaceReferenceSource:  couldn't read the place description ${path}`, error)
      return undefined
    }
  }

  ////////////////
  // ## Words
  ////////////////

  words(): Record<string, ReferenceWords> {
    const found = PlaceWords.of(this.text)
    const words: Record<string, ReferenceWords> = {}
    const add = (key: string, thing: ThingWords | undefined) => {
      if (thing) words[key] = { text: thing.words, marks: thing.marks }
    }
    add(PLACE_KEY, found.place)
    for (const [collection, type] of Object.entries(this.typeOf)) {
      const typeWords = found.types[type]
      add(typeKey(collection), typeWords)
      for (const [field, thing] of Object.entries(typeWords?.fields ?? {})) add(fieldKey(collection, field), thing)
    }
    return words
  }

  editIn(text: string, key: string, words: string): ReferenceTextEdit {
    return PlaceWords.edit(text, this.targetOf(key), words)
  }

  take(text: string): void {
    this.text = text
  }

  /** What `PlaceWords` calls the thing with words `key`. */
  private targetOf(key: string): WordsTarget {
    if (key === PLACE_KEY) return { kind: "place" }
    const [, collection = "", field] = key.split(":")
    const type = this.typeOf[collection] ?? collection
    return field === undefined ? { kind: "type", type } : { kind: "field", type, field }
  }

  ////////////////
  // ## What it found
  ////////////////

  /** The whole reference:  its line, where it runs, its lists by tag, its notes. */
  private referenceOf(description: PlaceDescription): Reference {
    const { say } = this
    const { about } = description
    const counts = stateCounts(description)
    const sections: ReferenceSection[] = [this.deploymentsSection(description)]
    for (const tag of tagsOf(description, say("lists"))) {
      sections.push({
        id: `tag:${tag.name}`,
        label: tag.name,
        badge: String(tag.collections.length),
        sections: tag.collections.map(([key, collection]) => this.listSection(key, collection))
      })
    }
    if (description.agentNotes?.length) {
      sections.push({
        id: "agent-notes",
        label: say("agentNotes"),
        badge: String(description.agentNotes.length),
        notes: description.agentNotes
      })
    }
    if (description.notes.length) {
      sections.push({
        id: "notes",
        label: say("notes"),
        badge: String(description.notes.length),
        notes: description.notes
      })
    }
    return {
      title: this.place.name,
      facts: [
        { text: about.kind },
        { text: about.address, isCode: true },
        ...(about.version
          ? [{ text: say("version", { version: about.version.says }), title: about.version.where }]
          : []),
        { text: say("looked", { date: dateOf(about.lookedAt) }), title: about.specAt ?? about.docsAt ?? "" }
      ],
      counts: [
        { label: say("lists"), count: Object.keys(description.collections).length },
        ...STATE_ORDER.filter((state) => counts[state]).map((state) => ({
          label: say(STATE_LOOKS[state].words),
          count: counts[state]!,
          title: say(STATE_LOOKS[state].why),
          ...(STATE_LOOKS[state].color && { color: STATE_LOOKS[state].color })
        }))
      ],
      ...(this.wordsFile && { wordsKey: PLACE_KEY }),
      sections
    }
  }

  /** Where it runs:  its project file's deployments, else the one address it was looked at. */
  private deploymentsSection(description: PlaceDescription): ReferenceSection {
    const { say } = this
    const rows = Object.entries(this.place.deployments ?? {}).map(([name, deployment]) => [
      name,
      deployment.at,
      deployment.key ?? description.about.keySecret ?? "",
      deployment.readOnly ? say("yes") : ""
    ])
    return {
      id: "deployments",
      label: say("deployments"),
      ...(rows.length && { badge: String(rows.length) }),
      ...(rows.length
        ? { table: { columns: [say("name"), say("address"), say("key"), say("readOnly")], rows, codeColumns: [1] } }
        : { empty: say("deploymentsNone", { address: description.about.address }) })
    }
  }

  /** One list:  its address, how trying it went, its words, what it can change and its fields. */
  private listSection(key: string, collection: CollectionDescription): ReferenceSection {
    const { say } = this
    const operations = Object.entries(collection.operations ?? {}).map(([name, operation]) =>
      this.operationItem(key, name, operation)
    )
    const fields = Object.entries(collection.fields).map(([field, about]) =>
      this.fieldItem(key, field, about, field === collection.idField)
    )
    const sections: ReferenceSection[] = []
    if (operations.length) {
      sections.push({
        id: `changes:${key}`,
        label: say("changes"),
        badge: String(operations.length),
        items: operations
      })
    }
    sections.push({ id: `fields:${key}`, label: say("fields"), badge: String(fields.length), items: fields })
    return {
      id: `list:${key}`,
      label: key,
      hint: `GET ${collection.at}`,
      state: this.stateOf(collection.state),
      ...(this.wordsFile && { wordsKey: typeKey(key) }),
      lines: [
        ...(collection.about ? [{ text: collection.about }] : []),
        ...(collection.state ? [{ text: this.stateLine(collection.state), title: collection.state.reason ?? "" }] : []),
        ...(collection.leftOut ? [{ text: say("listLeftOut", { why: collection.leftOut }) }] : [])
      ],
      sections
    }
  }

  /** A list's change:  its name, method and address, what it takes, how trying it went. */
  private operationItem(list: string, name: string, operation: OperationDescription): ReferenceItem {
    const params = Object.entries(operation.params ?? {})
      .map(([param, kind]) => `${param} (${kind})`)
      .join(", ")
    return {
      id: `change:${list}:${name}`,
      name,
      says: [`${operation.method} ${operation.at}`, ...(params ? [this.say("takes", { params })] : [])],
      state: this.stateOf(operation.state)
    }
  }

  /** A list's field:  the source's name, Spell's when it differs, its kind, what else its description says. */
  private fieldItem(list: string, field: string, about: FieldDescription, isId: boolean): ReferenceItem {
    const { say } = this
    const says = [about.format ? `${about.type} (${about.format})` : about.type]
    if (about.words !== field) says.unshift(say("calledInSpell", { words: about.words }))
    if (isId) says.push(say("isId"))
    if (about.linksTo) says.push(say("linksTo", { target: about.linksTo }))
    if (about.isRequired) says.push(say("required"))
    if (about.isReadOnly) says.push(say("setByServer"))
    if (about.choices?.length) says.push(say("oneOf", { choices: about.choices.join(", ") }))
    if (about.leftOut) says.push(say("leftOut"))
    return {
      id: `field:${list}:${field}`,
      name: field,
      says,
      ...(this.wordsFile && { wordsKey: fieldKey(list, about.words) })
    }
  }

  /** How trying something went, as a label:  never tried, `Not tried yet`. */
  private stateOf(state: PlaceState | undefined): ReferenceState {
    const look = STATE_LOOKS[state?.is ?? "unverified"]
    return {
      label: this.say(look.words),
      title: state ? this.stateLine(state) : this.say(look.why),
      ...(look.color && { color: look.color })
    }
  }

  /**
   * A state, in short lines (shown with `pre-line`):  how it went, when and where it was tried;  then what happened.
   * - `Verified, tried on dev, Nov 17, 2026, 9:31 PM` / `3 rows read`
   * - `Failed, tried Nov 17, 2026, 9:32 PM` / what its answer means, in plain words, and what to do next
   *   (`failureWords()`);  the answer itself is the line's tooltip
   * - never tried:  why, `Not tried yet` / `Spell only knows it from its description ...`
   */
  private stateLine(state: PlaceState): string {
    const { say } = this
    const look = STATE_LOOKS[state.is]
    let line = say(look.words)
    if (state.at) {
      const date = dateOf(state.at)
      line += `, ${state.deployment ? say("triedOn", { date, deployment: state.deployment }) : say("tried", { date })}`
    }
    const said =
      state.is === "failed"
        ? this.failureWords(state)
        : state.is === "verified" && state.rows !== undefined
          ? say("rows", { count: String(state.rows) })
          : state.at
            ? state.reason
            : say(look.why)
    return said ? `${line}\n${said}` : line
  }

  /**
   * What a failed try's answer means, in plain words, with what to do next:  by its status, 401, 403, 404 or 5xx;
   * any other, or none, its own reason, as the try wrote it.
   */
  private failureWords(state: PlaceState): string | undefined {
    const status = state.status
    if (status === 401) return this.say("failed401")
    if (status === 403) return this.say("failed403")
    if (status === 404) return this.say("failed404")
    if (status !== undefined && status >= 500) return this.say("failed5xx")
    return status === undefined ? state.reason : this.say("failedOther")
  }
}

/** A place, as the page server has it:  its name, its description, where it runs. */
export type PlaceOnServer = {
  /** What the program calls it:  `star wars`. */
  name: string
  /** Its description's address:  `@spell/examples/StarWars/StarWars.api.json5`. */
  path: string
  /** What `spell place ingest` wrote of it. */
  description: PlaceDescriptionOnDisk
  /** Where it runs, by name, as its project's file lists them (`dev`, `production`):  left out, none listed. */
  deployments?: Record<string, Deployment>
}

/** A label in the reader's language:  one of the element's texts, its `{params}` filled in. */
export type Say = (key: ReferenceTextKey, params?: Record<string, string>) => string

/** One of `<spell-reference-page>`'s texts. */
export type ReferenceTextKey = (typeof spellReferencePageVocabulary)["texts"][number]["key"]

////////////////
// ## Helpers
////////////////

/** The key of the place's own words. */
const PLACE_KEY = "place"

/** The key of a list's type's words:  `type:jobs`. */
function typeKey(collection: string): string {
  return `type:${collection}`
}

/** The key of a field's words, by its words in Spell:  `field:jobs:display url`. */
function fieldKey(collection: string, words: string): string {
  return `field:${collection}:${words}`
}

/** The order the state counts show in. */
const STATE_ORDER = ["verified", "failed", "untyped", "disabled", "unverified"] as const

/** Each state's label:  its colour, its words, and why, its tooltip. */
const STATE_LOOKS: Record<
  PlaceState["is"],
  { color?: ReferenceColor; words: ReferenceTextKey; why: ReferenceTextKey }
> = {
  verified: { color: "green", words: "verified", why: "verifiedWhy" },
  failed: { color: "red", words: "failed", why: "failedWhy" },
  untyped: { color: "yellow", words: "untyped", why: "untypedWhy" },
  disabled: { color: "grey", words: "disabled", why: "disabledWhy" },
  unverified: { words: "unverified", why: "unverifiedWhy" }
}

/** The place's lists, a group per tag, the tags in order;  a place with none, one group, `lists`. */
function tagsOf(
  description: PlaceDescription,
  lists: string
): { name: string; collections: [string, CollectionDescription][] }[] {
  const byTag = new Map<string, [string, CollectionDescription][]>()
  for (const entry of Object.entries(description.collections)) {
    const tag = entry[1].tag ?? lists
    byTag.set(tag, [...(byTag.get(tag) ?? []), entry])
  }
  return [...byTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, collections]) => ({ name, collections }))
}

/** How many lists are in each state. */
function stateCounts(description: PlaceDescription): Partial<Record<PlaceState["is"], number>> {
  const counts: Partial<Record<PlaceState["is"], number>> = {}
  for (const described of Object.values(description.collections)) {
    const is = described.state?.is ?? "unverified"
    counts[is] = (counts[is] ?? 0) + 1
  }
  return counts
}

/** The text of project file `path` over the page server:  `undefined` when it isn't there. */
async function textAt(path: string): Promise<string | undefined> {
  const response = await fetch(SpellUrls.fileUrl(path))
  return response.ok ? response.text() : undefined
}

/**
 * Where place `place` runs, as project `projectId`'s file lists it (epic `data` P49):
 * `"places": { "netbox": { "dev": { "at": "..." } } }`.
 * - `undefined`:  none listed, or the file won't load (said in the console).
 */
async function deploymentsOf(projectId: string, place: string): Promise<Record<string, Deployment> | undefined> {
  try {
    const text = await textAt(`${projectId}/${PROJECT_FILE}`)
    if (text === undefined) return undefined
    const project = JSON5.parse(text) as { places?: Record<string, Record<string, Deployment>> }
    return project.places?.[place]
  } catch (error) {
    console.error(`PlaceReferenceSource:  couldn't read ${projectId}'s places`, error)
    return undefined
  }
}

/** An ISO date as people read it, in this browser's language:  `Nov 17, 2026, 9:31 PM`. */
function dateOf(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : DATE_FORMAT.format(date)
}

/** How `dateOf()` writes a date. */
const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
