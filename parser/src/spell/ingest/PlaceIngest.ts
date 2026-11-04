import { SP } from "spell/parser/spell"
import { fieldNamed } from "spell/parser/spell/rules/places/PlaceDetail"
import { parseSpellProject } from "spell/parser/spell/test/parseSpellProject"

import {
  IngestStopped,
  type CollectionDescription,
  type IngestAsk,
  type IngestResult,
  type IngestSettings,
  type PlaceDescription,
  type PlaceDescriptionOnDisk,
  type PlaceLook
} from "./ingest.types"
import { agentRead, renameCollections } from "./PlaceReading"
import { answersUnder, IS_WEB_ADDRESS, KINDS_IT_CAN_LOOK_AT, kindFoundAt, kindReadFrom, lookAtPlace } from "./PlaceLook"
import { checkSecondsWithin, describeLook, fingerprintOf, plainNameFor } from "./PlaceShape"
import {
  mergedSpell,
  placeLineAt,
  placesIn,
  spellPartsFor,
  spellTextOf,
  type SpellLine,
  type SpellParts
} from "./PlaceSpell"
import { keptHeaders, PoliteReader } from "./PoliteReader"
import { writesTried, writeWordsFor } from "./WritesTried"

/** How many times it leaves out a line Spell can't read, and tries again. */
const MOST_COMPILES = 12

/** What a compile says of a line:  `3:12 ...`. */
const ERROR_LINE = /^(\d+):\d+ (.*)$/s

/** A kind of place, as a person might write it:  `sheet` and `spreadsheet` are one. */
const KIND_WORDS: Readonly<Record<string, string>> = {
  spreadsheet: "sheet",
  csv: "sheet",
  rest: "web server",
  graphql: "graphql server"
}

/** The kinds of place spell knows, for the question. */
const KINDS_TO_NAME = [...KINDS_IT_CAN_LOOK_AT]

/****************
 * ### `PlaceIngest`
 * Looks at one data source for real, and writes what it found:  a description of it, and the Spell to reach it.
 *
 * ```ts
 * const ingest = new PlaceIngest({ fetch, ask, files, readThrough, claude })
 * await ingest.add({ address: "https://swapi.info/api", into: "StarWars.api.spell" })
 * await ingest.update("StarWars.api.spell")
 * ```
 *
 * - The steps, in order:
 *   1. which file, and is the place already in it
 *   2. which kind of place, from `kind`, else the address, else a request, else it asks, else it stops, naming those it tried
 *   3. a look:  a few pages of each collection, its docs (`lookAtPlace()`, through `PoliteReader`, which can't write)
 *   4. what the rows show (`describeLook()`), then what the agent reads in samples of them (`agentRead()`)
 *   5. the Spell (`spellPartsFor()`), which has to compile:  a line Spell can't read is left out, and the description says so
 *   6. a real read through that Spell (`readThrough`), which has to return rows
 *   7. only then, the files:  a file is added to, never overwritten, and the same place isn't added twice
 * - One server per Spell file, `<Name>.api.spell`;  its description goes beside it, `<Name>.api.json5`.
 *   - JSON5, so a person can read it, and the next look can too.
 *   - What every collection agrees on is written once, in `allCollections`;  each collection keeps only what differs
 *     (`descriptionOnDisk()`).
 *   - A person's own keys in it, and comments, stay when it's written again.
 *   - The project's file names it, in `development.apis` (`IngestFiles.listInProject`).
 * - Knows nothing of a terminal, a disk or `claude`:  every one is handed in (`IngestSettings`), so the editor can run the
 *   same steps, and ask its own way.
 * - Imported by path, never through `SP`'s barrel:  `spell/parser/spell/ingest/PlaceIngest`.
 * - throws `IngestStopped` for whatever only a person can settle, having written nothing
 ****************/
export class PlaceIngest {
  /** What it's handed. */
  private readonly settings: IngestSettings

  constructor(settings: IngestSettings) {
    this.settings = settings
  }

  /**
   * Add the source at `ask.address` to a Spell file.
   * - throws `IngestStopped`:  see the class
   */
  async add(ask: IngestAsk): Promise<IngestResult> {
    const { files } = this.settings
    const address = addressFrom(ask.address)
    const file = await this.fileFor(ask.into)
    refuseLanguage(file)
    const existing = (await files.read(file)) ?? ""
    const already = placeLineAt(existing, address)
    if (already) return this.alreadyThere(file, already, existing)
    const reader = this.readerFor(ask.keySecret)
    const kind = await this.kindFor(address, ask.kind, reader, ask)
    this.say(`A ${kind}.  Looking at what it holds ...`)
    const look = await lookAtPlace(kind, {
      address,
      reader,
      ...withDefined({ docs: ask.docs, collections: ask.collections, samples: ask.samples })
    })
    if (!look.collections.length) {
      throw new IngestStopped(`${address} gave back nothing to describe.  ${look.notes.join("  ")}`)
    }
    // the address asked for may be one list of a place, whose own address is above it
    const alreadyAbove = placeLineAt(existing, look.address)
    if (alreadyAbove) return this.alreadyThere(file, alreadyAbove, existing)
    refuseSecondServer(file, existing)
    const description = describeLook(look, { kind, name: ask.name ?? plainNameFor(address, kind) })
    if (ask.keySecret) description.about.keySecret = ask.keySecret
    if (ask.keySecret) await this.noteKeyIfSet(description, look)
    if (ask.collections?.length) description.about.collectionsAsked = [...ask.collections]
    await this.notePictures(description, ask.pictures, reader)
    if (ask.triesWrites) await this.noteWrites(description, look, reader)
    awayFromTypesBeside(description, await files.otherSpellBeside(file))
    await this.readWithAgent(description, look, { keepName: !!ask.name })
    const warnings = this.compileLeavingOut(description, file)
    this.checkAddedCompiles(existing, description, file)
    await this.readThroughIt(description, reader)
    await this.finish(description)
    const spell = description.spell.join("\n")
    const text = existing.trim() ? `${existing.trimEnd()}\n\n${spell}\n` : `${spell}\n`
    const descriptionPath = descriptionPathFor(file)
    await files.write(file, text)
    await this.writeDescription(file, descriptionPath, description)
    return { file, descriptionPath, description, wrote: true, spell, changes: [], couldntChange: [], warnings }
  }

  /**
   * Look again at the place described beside `file`:  say what changed, and change it.
   * - Keeps what a person wrote, in the Spell and in the description:  see `mergedSpell()`.
   * - Writes nothing until the merged file compiles, and a read through the new Spell returns rows.
   * - throws `IngestStopped`:  no description, or nothing compiles or reads
   */
  async update(file: string): Promise<IngestResult> {
    const descriptionPath = descriptionPathFor(file)
    const onDisk = await this.settings.files.readDescription(descriptionPath)
    if (!onDisk) {
      throw new IngestStopped(
        `${file} has no description beside it, ${descriptionPath}, so there's nothing to look at again:  spell place ingest <address> --into ${file}`
      )
    }
    return this.updateOne(file, descriptionPath, descriptionFromDisk(onDisk))
  }

  /** Look again at one place. */
  private async updateOne(file: string, descriptionPath: string, old: PlaceDescription): Promise<IngestResult> {
    const { files } = this.settings
    const { name, kind, address, keySecret, docsAt, collectionsAsked, picturesAsked } = old.about
    const reader = this.readerFor(keySecret)
    this.say(`Looking again at ${address} ...`)
    // the collections it was asked for, as asked, and only those;  else every one it has, and whatever's new
    const collections = collectionsAsked ?? Object.values(old.collections).map(({ at }) => at)
    // a collection found by name is read by the names it was read by before
    // each by its own collection's address, as two collections found by name may each have their own (Open Library's)
    const samples = Object.values(old.collections).flatMap(({ at, samples: names }) =>
      (names ?? []).map((sample) => `${at}=${sample}`)
    )
    const look = await lookAtPlace(kind, {
      address,
      reader,
      collections,
      addListed: !collectionsAsked,
      ...withDefined({ docs: docsAt, samples: samples.length ? samples : undefined })
    })
    const description = describeLook(look, { kind, name })
    if (keySecret) description.about.keySecret = keySecret
    if (keySecret) await this.noteKeyIfSet(description, look)
    if (collectionsAsked) description.about.collectionsAsked = collectionsAsked
    await this.notePictures(description, picturesAsked, reader)
    if (carryOver(description, old)) {
      // something new, for the agent to read;  what was chosen before still stands
      await this.readWithAgent(description, look, { keepName: true })
      carryOver(description, old)
    }
    const shapeSame = (await fingerprintOf(description)) === old.about.fingerprint
    if (shapeSame) {
      description.canDo = old.canDo
      description.about.readBy = old.about.readBy
      if (old.checkEverySeconds !== undefined) description.checkEverySeconds = old.checkEverySeconds
      // what was said stays, and what this look found to say joins it:  a list answering from somewhere new
      description.notes = [...new Set([...old.notes, ...look.notes])]
    }
    if (old.about.triesWrites) await this.noteWrites(description, look, reader)
    // a line of the new look's that Spell can't read is left out, as the first look's was:  GitHub's reactions' `+1`
    this.compileLeavingOut(description, file)
    const before = writtenOf(spellPartsFor(old), old.spell)
    const after = spellPartsFor(description)
    const text = (await files.read(file)) ?? ""
    const others = await files.otherSpellBeside(file)
    const merge = mergedSpell(text, before, after, (words, own) => isUsed(words, text, others, own), old.spell)
    const changes = [...saidChanges(old, description), ...merge.changed]
    const warnings = this.checkFileCompiles(text, merge.text, file)
    await this.readThroughIt(description, reader)
    await this.finish(description)
    await files.write(file, merge.text)
    await this.writeDescription(file, descriptionPath, description)
    return {
      file,
      descriptionPath,
      description,
      wrote: true,
      spell: merge.text,
      changes,
      couldntChange: merge.couldnt,
      warnings
    }
  }

  ////////////////
  // ## Which file, which kind
  ////////////////

  /** The Spell file:  as given, else asked for.  - throws `IngestStopped` with no one to ask */
  private async fileFor(into: string | undefined): Promise<string> {
    if (into) return into
    const answer = await this.settings.ask({ asks: "file", text: "Which .spell file should the place go in?" })
    if (!answer) throw new IngestStopped("which file should the place go in?  --into <file>")
    return answer
  }

  /** The kind:  see the class.  - throws `IngestStopped` for a kind nobody knows, and when it can't tell, with no one to ask */
  private async kindFor(
    address: string,
    named: string | undefined,
    reader: PoliteReader,
    { collections, samples }: Pick<IngestAsk, "collections" | "samples"> = {}
  ): Promise<string> {
    if (named) return kindNamed(named)
    const read = kindReadFrom(address)
    if (read) return read
    const tried: string[] = []
    const found = await kindFoundAt(address, reader, tried)
    if (found) return found
    // an address that answers nothing itself, Wikipedia's:  a web server if a collection under it answers
    if (await answersUnder(address, reader, collections, samples)) return "web server"
    const answer = await this.settings.ask({
      asks: "kind",
      text: `What kind of place is ${address}?  Tried ${tried.join(", ") || "reading its address"}, and couldn't tell.`,
      choices: KINDS_TO_NAME
    })
    if (answer) return kindNamed(answer)
    throw new IngestStopped(
      `can't tell what kind of place ${address} is:  tried ${tried.join(", ") || "reading its address"}.  Say which, --kind <kind>:  ${KINDS_TO_NAME.join(", ")};  ` +
        `an address that answers nothing itself, with its collections under it, is a web server:  --kind "web server"`
    )
  }

  /** A reader for this place, with its key.  - throws `IngestStopped` for a key that isn't there */
  private readerFor(keySecret: string | undefined): PoliteReader {
    const { fetch, sleep, keyNamed } = this.settings
    const key = keySecret ? keyNamed?.(keySecret) : undefined
    if (keySecret && key === undefined) {
      throw new IngestStopped(
        `the key named ${keySecret} isn't in the environment:  set it, and it's sent, never written down`
      )
    }
    return new PoliteReader({ fetch, ...withDefined({ key, sleep }) })
  }

  /**
   * SIDE EFFECT:  when the first collection it looked at answers without the key too, the key's only for when it's set
   * (GitHub answers 60 requests an hour with none);  and a program checks within the limit it has without one.
   * - One request, with no key, of a page of it.  NEVER throws:  no answer leaves the key needed.
   */
  private async noteKeyIfSet(description: PlaceDescription, { address, collections }: PlaceLook): Promise<void> {
    const { fetch, sleep } = this.settings
    const first = collections[0]
    // a web server's list, by its path:  not a GraphQL field's, nor one found by name
    if (!first?.at.startsWith("/") || first.at.includes("{")) return
    try {
      const reader = new PoliteReader({ fetch, ...withDefined({ sleep }) })
      const { status, headers } = await reader.read(new URL(`${address.replace(/\/+$/, "")}${first.at}`).href)
      if (status >= 400) return
      description.about.keyIfSet = true
      const limit = headers.get("x-ratelimit-limit") ?? headers.get("ratelimit-limit")
      if (limit) description.canDo.limits += `.  Without its key, it allows ${limit}.`
      const shown = Object.values(description.collections).filter(({ leftOut }) => !leftOut).length
      const keyless = checkSecondsWithin(keptHeaders(headers), shown)
      if (description.checkEverySeconds !== undefined && keyless > description.checkEverySeconds)
        description.checkEverySeconds = keyless
    } catch {
      // no answer:  the key stays needed
    }
  }

  /**
   * SIDE EFFECT:  `description` says what a write of each kind answered, and whether the server keeps them (epic `data` P30):
   * only because the person said it may, `--try-writes` (`writesTried()`).
   * - NEVER throws, but `IngestStopped` past the reader's limits.
   */
  private async noteWrites(description: PlaceDescription, look: PlaceLook, reader: PoliteReader): Promise<void> {
    description.about.triesWrites = true
    if (description.about.kind !== "web server") return
    this.say("Trying a write of each kind, as asked ...")
    const seen = await writesTried(look.address, look.collections, reader)
    if (seen) description.canDo.write = writeWordsFor(seen)
  }

  /**
   * SIDE EFFECT:  each field `asked` names, `cover_i=https://covers.openlibrary.org/b/id/{id}-M.jpg`, holds a picture's id,
   * where it answers a picture:  tried on a real value, one request each (epic `data` P29).
   * - One that doesn't is said, and left as it is.
   * - NEVER throws, but `IngestStopped` past the reader's limits.
   */
  private async notePictures(
    description: PlaceDescription,
    asked: readonly string[] | undefined,
    reader: PoliteReader
  ): Promise<void> {
    if (!asked?.length) return
    description.about.picturesAsked = [...asked]
    for (const given of asked) {
      const cut = given.indexOf("=")
      const [field, address] = [given.slice(0, cut).trim(), given.slice(cut + 1).trim()]
      if (cut < 0 || !PICTURE_ID.test(address)) {
        description.notes.push(
          `"${given}" isn't a field and where its pictures are, with braces for its id:  left out.`
        )
        continue
      }
      const holding = Object.entries(description.collections).filter(([, { fields }]) => fields[field])
      if (!holding.length) description.notes.push(`No collection has a field "${field}", to hold a picture's id.`)
      for (const [collection, { fields }] of holding) {
        const about = fields[field]!
        const example = [about.example].flat()[0]
        if (typeof example !== "string" && typeof example !== "number") continue
        const url = address.replace(PICTURE_ID, encodeURIComponent(`${example}`))
        try {
          const { status, headers } = await reader.read(url)
          if (status < 400 && /^image\//i.test(headers.get("content-type") ?? "")) about.pictureAt = address
          else
            description.notes.push(
              `${collection}'s "${field}" isn't a picture's id:  ${url} answered ${status}, no picture.`
            )
        } catch (error) {
          if (error instanceof IngestStopped) throw error
          description.notes.push(`${collection}'s "${field}" couldn't be tried:  ${url} didn't answer.`)
        }
      }
    }
  }

  /** The place is already in the file:  nothing changes. */
  private async alreadyThere(file: string, name: string, text: string): Promise<IngestResult> {
    const { files } = this.settings
    const descriptionPath = descriptionPathFor(file)
    const onDisk = await files.readDescription(descriptionPath)
    return {
      file,
      descriptionPath,
      description: onDisk ? descriptionFromDisk(onDisk) : ({ about: { name } } as PlaceDescription),
      wrote: false,
      spell: text,
      changes: [],
      couldntChange: [],
      warnings: []
    }
  }

  ////////////////
  // ## The agent
  ////////////////

  /** Have the agent read it, if there is one.  NEVER throws. */
  private async readWithAgent(
    description: PlaceDescription,
    look: PlaceLook,
    { keepName }: { keepName: boolean }
  ): Promise<void> {
    const { claude, claudeVia } = this.settings
    if (!claude) return
    this.say("Asking the agent to read samples of it ...")
    if (await agentRead(description, look, claude, { keepName })) description.about.readBy = claudeVia ?? "an agent"
    renameCollections(description)
  }

  ////////////////
  // ## Compiling
  ////////////////

  /**
   * SIDE EFFECT:  the Spell compiles by itself, each line it can't read left out of `description`, with why:  what compiling warned of.
   * - throws `IngestStopped` for an error on any other line:  the place's own, say
   */
  private compileLeavingOut(description: PlaceDescription, file: string): string[] {
    for (let round = 0; round < MOST_COMPILES; round++) {
      const parts = spellPartsFor(description)
      const text = spellTextOf(parts)
      const { errors, warnings } = compile(text, file)
      if (!errors.length) return warnings
      const lines = text.split("\n")
      let leftOut = 0
      for (const error of errors) {
        const [, at, message] = ERROR_LINE.exec(error) ?? []
        const line = lines[Number(at) - 1]?.trim()
        if (line && leaveOutLine(description, parts, line, message ?? error)) leftOut++
      }
      if (!leftOut) {
        throw new IngestStopped(`the Spell written for it doesn't compile:\n${errors.join("\n")}\n\n${text}`)
      }
    }
    throw new IngestStopped("the Spell written for it doesn't compile, after leaving out every line it could")
  }

  /** The file with this place added has no error it hadn't before.  - throws `IngestStopped` if it does */
  private checkAddedCompiles(existing: string, description: PlaceDescription, file: string): void {
    if (!existing.trim()) return
    const added = `${existing.trimEnd()}\n\n${spellTextOf(spellPartsFor(description))}`
    this.checkFileCompiles(existing, added, file)
  }

  /** The file as it'll be has no error it hadn't before:  a program may import what no single file can see.  - throws `IngestStopped` if it does */
  private checkFileCompiles(before: string, after: string, file: string): string[] {
    const was = new Set(compile(before, file).errors.map(withoutPlaceInFile))
    const { errors, warnings } = compile(after, file)
    const added = errors.filter((error) => !was.has(withoutPlaceInFile(error)))
    if (added.length) throw new IngestStopped(`with this place in it, ${file} doesn't compile:\n${added.join("\n")}`)
    return warnings
  }

  ////////////////
  // ## Reading through it
  ////////////////

  /**
   * SIDE EFFECT:  really reads each type through the Spell, and says what it found on `description`.
   * - throws `IngestStopped` if no type returned any row
   */
  private async readThroughIt(description: PlaceDescription, reader: PoliteReader): Promise<void> {
    const { readThrough } = this.settings
    reader.startAgain()
    this.say("Reading through the Spell ...")
    const types: Record<string, string> = {}
    const shown = Object.values(description.collections).filter((collection) => !collection.leftOut)
    for (const { type } of shown) types[type] = classNameFor(type)
    const byName = Object.fromEntries(
      shown.flatMap(({ type, samples }) => (samples?.length ? [[type, samples[0]!]] : []))
    )
    // answering only a search:  searched for what it was looked at with, `dune`
    const bySearch = Object.fromEntries(
      shown.flatMap(({ type, searchedOnly, searchedFor, searchedBy, fields }) =>
        searchedOnly && searchedFor !== undefined && searchedBy
          ? [[type, { field: fieldNamed(fields[searchedBy.field]?.words ?? searchedBy.field), text: searchedFor }]]
          : []
      )
    )
    const spell = spellTextOf(spellPartsFor(description, { withKey: false }))
    const { byType, complaints } = await readThrough({ spell, types, byName, bySearch, fetch: reader.fetch })
    for (const collection of shown) {
      const read = byType[collection.type]
      if (read) collection.readThrough = read
    }
    // looking again, the last look's notes are there already:  each said once
    description.notes = [...new Set([...description.notes, ...complaints])]
    const rows = shown.reduce((sum, { readThrough: read }) => sum + (read?.rows ?? 0), 0)
    if (!rows) {
      const why = shown.map(({ type, readThrough: read }) => `${type}:  ${read?.problem ?? "no rows"}`).join("\n")
      throw new IngestStopped(`a read through the Spell returned no rows, so nothing was written:\n${why}\n\n${spell}`)
    }
  }

  /** SIDE EFFECT:  `description` is finished:  when it was looked at, its fingerprint, what Spell can't say, its Spell. */
  private async finish(description: PlaceDescription): Promise<void> {
    description.about.lookedAt = (this.settings.now?.() ?? new Date()).toISOString()
    description.about.fingerprint = await fingerprintOf(description)
    description.spellCantSay = whatSpellCantSay(description)
    description.spell = spellTextOf(spellPartsFor(description)).trimEnd().split("\n")
  }

  /** SIDE EFFECT:  `description` written beside `file`, as it's kept on disk, and named in the project's file. */
  private async writeDescription(file: string, path: string, description: PlaceDescription): Promise<void> {
    const { files } = this.settings
    await files.writeDescription(path, descriptionOnDisk(description))
    await files.listInProject?.(file, path)
  }

  /** Say how it's going. */
  private say(line: string): void {
    this.settings.say?.(line)
  }
}

////////////////
// ## What it knows
////////////////

/** An address as it's asked for:  no trailing slash, and a web address with its scheme. */
function addressFrom(address: string): string {
  const trimmed = address.trim().replace(/\/+$/, "")
  if (IS_WEB_ADDRESS.test(trimmed) || /^(?:wss?|did):/i.test(trimmed)) return trimmed
  return /^[\w-]+(?:\.[\w-]+)+\//.test(`${trimmed}/`) && !/\.csv$/i.test(trimmed) ? `https://${trimmed}` : trimmed
}

/** `kind`, as `core.place()` words it.  - throws `IngestStopped` for one it can't look at */
function kindNamed(kind: string): string {
  const named = KIND_WORDS[kind.trim().toLowerCase()] ?? kind.trim().toLowerCase()
  if (!KINDS_IT_CAN_LOOK_AT.includes(named)) {
    throw new IngestStopped(`can't look at a "${kind}":  --kind is one of ${KINDS_IT_CAN_LOOK_AT.join(", ")}`)
  }
  return named
}

/** A file in another language can't take this Spell yet:  it's written in English.  - throws `IngestStopped` */
function refuseLanguage(file: string): void {
  const language = /\.([a-z]{2})\.spell$/.exec(file)?.[1]
  if (language && language !== "en") {
    throw new IngestStopped(
      `it writes English Spell, and ${file} is in another language:  put it in an English file, then spell translate`
    )
  }
}

/** Where a place's description goes:  beside its Spell file, `StarWars.api.spell` => `StarWars.api.json5`. */
export function descriptionPathFor(file: string): string {
  return `${file.replace(/\.spell$/, "")}.json5`
}

/** One server per Spell file:  `file` holds a place already.  - throws `IngestStopped` if it does */
function refuseSecondServer(file: string, existing: string): void {
  const [held] = placesIn(existing)
  if (!held) return
  throw new IngestStopped(
    `${file} already holds ${held.name}, and a server gets a file of its own:  --into <Name>.api.spell`
  )
}

////////////////
// ## On disk
////////////////

/** A collection's settings that are often the same in every one, written once in `allCollections` when they are. */
const SHARED_SETTINGS = ["idField", "idIsAnAddress", "paging", "rowsAt", "nextAt", "listsGive"] as const

/**
 * `description` as it's written:  what every collection agrees on, once, in `allCollections`;  each collection only what differs.
 * - Only for two collections or more:  one has nothing to share.
 */
export function descriptionOnDisk(description: PlaceDescription): PlaceDescriptionOnDisk {
  const { collections, ...rest } = description
  const each = Object.values(collections)
  const allCollections: Partial<CollectionDescription> = {}
  if (each.length > 1) {
    for (const setting of SHARED_SETTINGS) {
      const values = new Set(each.map((collection) => JSON.stringify(collection[setting])))
      const [only] = values
      if (values.size === 1 && only !== undefined) Object.assign(allCollections, { [setting]: JSON.parse(only) })
    }
  }
  const shared = Object.keys(allCollections)
  const own = Object.fromEntries(
    Object.entries(collections).map(([name, collection]) => [
      name,
      Object.fromEntries(Object.entries(collection).filter(([key]) => !shared.includes(key)))
    ])
  )
  // what it is and what it holds first, as a person reads it;  the rest after
  const { about, canDo, ...after } = rest
  return {
    about,
    canDo,
    ...(shared.length && { allCollections }),
    collections: own,
    ...after
  } as PlaceDescriptionOnDisk
}

/** A description as it's read:  each collection with what `allCollections` says, its own settings winning. */
export function descriptionFromDisk({
  allCollections,
  collections,
  ...rest
}: PlaceDescriptionOnDisk): PlaceDescription {
  const each = Object.entries(collections).map(([name, collection]) => [name, { ...allCollections, ...collection }])
  return { ...rest, collections: Object.fromEntries(each) } as PlaceDescription
}

/** The class a type's words compile to:  `life form` => `LifeForm`. */
function classNameFor(words: string): string {
  return words
    .split(" ")
    .map((word) => `${SP.typeName(word)}`.replace(/^\p{Ll}/u, (first) => first.toUpperCase()))
    .join("")
}

/** `values` without what's undefined:  for optional settings. */
function withDefined<Values extends object>(values: Values): { [Key in keyof Values]?: NonNullable<Values[Key]> } {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as never
}

/** Compile `text` as this file, alone. */
function compile(text: string, file: string): { errors: string[]; warnings: string[] } {
  const name = file.slice(file.lastIndexOf("/") + 1)
  const { files } = parseSpellProject([{ path: `/${name}`, contents: text }])
  return { errors: files[0]!.errors as string[], warnings: files[0]!.warnings as string[] }
}

/** Where a picture's id goes, in where its pictures are:  `{id}`. */
const PICTURE_ID = /\{[^{}]*\}/

/** What an error says, without where:  lines move when a place is added. */
function withoutPlaceInFile(error: string): string {
  return error.replace(/^\d+:\d+ /, "")
}

/**
 * SIDE EFFECT:  `description` leaves out what this line says, with why:  `false` if it's not a line that can go.
 * - A field's, by itself;  a type's first lines, the whole collection.
 */
function leaveOutLine(description: PlaceDescription, parts: SpellParts, line: string, why: string): boolean {
  const reason = `Spell couldn't read its line:  ${line} -- ${why}`
  const key = keyOfLine(parts, line)
  if (key) {
    const [kind, collection, field] = key.split(":") as [string, string, string?]
    const held = description.collections[collection]
    if (held && field && (kind === "field" || kind === "name")) {
      const about = held.fields[field]!
      if (kind === "name" && !about.wordsInQuotes) {
        about.wordsInQuotes = true
        return true
      }
      about.leftOut = reason
      description.notes.push(`Left out ${collection}'s "${field}":  ${reason}`)
      return true
    }
    if (held && kind === "lives") return leaveOutCollection(description, collection, reason)
    if (kind === "inside") return leaveOutInside(description, parts, collection, field!, reason)
  }
  const type = parts.types.find(({ header }) => header === line)
  return !!type && leaveOutCollection(description, type.collection, reason)
}

/**
 * SIDE EFFECT:  the Spell leaves out a field of a type inside a row, `typeWords`, by its `words`:
 * GitHub's reactions' `+1` and `-1`.  - `false` if there's no such line
 */
function leaveOutInside(
  description: PlaceDescription,
  { types }: SpellParts,
  typeWords: string,
  words: string,
  reason: string
): boolean {
  const fields = types.find(({ isInside, header }) => isInside && header.includes(`"${typeWords}"`))?.insideFields
  const [name, about] = Object.entries(fields ?? {}).find(([, each]) => each.words === words && !each.leftOut) ?? []
  if (!about) return false
  about.leftOut = reason
  description.notes.push(`Left out ${typeWords}'s "${name}":  ${reason}`)
  return true
}

/** SIDE EFFECT:  the Spell leaves out a whole collection. */
function leaveOutCollection(description: PlaceDescription, collection: string, reason: string): boolean {
  const held = description.collections[collection]!
  if (held.leftOut) return false
  held.leftOut = reason
  description.notes.push(`Left out the collection "${collection}":  ${reason}`)
  return true
}

/** The key of a line the tool wrote. */
function keyOfLine({ placeLines, types }: SpellParts, line: string): string | undefined {
  const all: SpellLine[] = [...placeLines, ...types.flatMap((type) => type.lines)]
  return all.find(({ text }) => text.trim() === line)?.key
}

/** A type a Spell file declares:  `a "user" is a thing`, `a user is a thing`. */
const DECLARED_TYPE = /^(?:a|an) (?:"([^"\n]+)"|([\p{L}\d ]+?)) is a thing\b/gmu

/**
 * SIDE EFFECT:  a type another Spell file beside it already declares goes by the place's name too, as one project holds
 * every type once:  JSONPlaceholder's `user`, beside GitHub's, is a `jsonplaceholder user` (epic `data` P30).
 */
function awayFromTypesBeside(description: PlaceDescription, others: readonly string[]): void {
  const declared = new Set(
    others.flatMap((text) =>
      [...text.matchAll(DECLARED_TYPE)].map(([, quoted, plain]) => (quoted ?? plain)!.toLowerCase())
    )
  )
  const { name } = description.about
  let isRenamed = false
  for (const collection of Object.values(description.collections)) {
    if (!declared.has(collection.type.toLowerCase())) continue
    collection.type = `${name} ${collection.type}`
    isRenamed = true
  }
  if (isRenamed) renameCollections(description)
}

/** Are these words used in a line the tool didn't write, here or in another file beside it? */
function isUsed(words: string, text: string, others: readonly string[], own: ReadonlySet<string>): boolean {
  const pattern = new RegExp(`\\b${words.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
  const uses = (line: string) => pattern.test(line.replace(/\/\/.*$/, ""))
  const hereUses = text.split("\n").some((line) => !own.has(line.trim()) && uses(line))
  return hereUses || others.some((other) => other.split("\n").some(uses))
}

////////////////
// ## Looking again
////////////////

/** An address without the slash it may end in:  `/people/` and `/people` are one collection. */
function withoutEndSlash(at: string): string {
  return at.replace(/\/+$/, "")
}

/**
 * SIDE EFFECT:  what was chosen last time stays:  each collection's name and words, each field's, and any keys a person added.
 * - Matched by address and by the source's own name for a field, as those don't change when someone renames a type.
 *   An address that now ends in a slash is the same one.
 * - Returns whether anything new is left for the agent to read.
 */
function carryOver(description: PlaceDescription, old: PlaceDescription): boolean {
  let isNew = false
  const kept: Record<string, CollectionDescription> = {}
  for (const [name, collection] of Object.entries(description.collections)) {
    // where it answered from may have moved, `/people` to `/people/`:  the same collection
    const was = Object.entries(old.collections).find(
      ([, each]) => withoutEndSlash(each.at) === withoutEndSlash(collection.at)
    )
    if (!was) {
      kept[name] = collection
      isNew = true
      continue
    }
    const [oldName, oldCollection] = was
    for (const [field, about] of Object.entries(collection.fields)) {
      const wasField = oldCollection.fields[field]
      if (!wasField) {
        isNew = true
        continue
      }
      const { leftOut: _recalculated, ...keptField } = wasField
      collection.fields[field] = {
        ...keptField,
        ...about,
        words: wasField.words,
        ...(wasField.means && { means: wasField.means }),
        ...(about.type === wasField.type && wasField.leftOut && { leftOut: wasField.leftOut })
      }
    }
    kept[oldName] = {
      ...oldCollection,
      ...collection,
      type: oldCollection.type,
      ...(oldCollection.about && { about: oldCollection.about }),
      ...(oldCollection.idField && oldCollection.idField in collection.fields && { idField: oldCollection.idField }),
      fields: collection.fields
    }
  }
  description.collections = kept
  const { about, canDo, collections, notes, spellCantSay, checkEverySeconds, spell, ...personsKeys } = old
  Object.assign(description, personsKeys)
  return isNew
}

/** What's different from the last look, in words for people. */
function saidChanges(old: PlaceDescription, now: PlaceDescription): string[] {
  const said: string[] = []
  const oldVersion = old.about.version?.says
  const newVersion = now.about.version?.says
  if (newVersion !== oldVersion) {
    said.push(`Its version:  ${oldVersion ?? "none named"} => ${newVersion ?? "none named"}.`)
  }
  for (const [name, collection] of Object.entries(now.collections)) {
    const was = old.collections[name]
    if (!was) continue
    for (const [field, { type }] of Object.entries(collection.fields)) {
      const wasField = was.fields[field]
      if (!wasField) said.push(`${name} has a new field, "${field}" (${type}).`)
      else if (wasField.type !== type) said.push(`${name}'s "${field}" holds ${type} now, not ${wasField.type}.`)
    }
    for (const field of Object.keys(was.fields)) {
      if (!(field in collection.fields)) said.push(`${name}'s "${field}" is gone.`)
    }
  }
  return said
}

/** What this source does that Spell has no words for:  each said plainly, in the description, as what a program can't do yet. */
function whatSpellCantSay({ about, collections, canDo }: PlaceDescription): string[] {
  const said = new Set<string>()
  const each = Object.entries(collections).filter(([, collection]) => !collection.leftOut)
  // a link to one of its own collections is followed:  `its "homeworld" is a planet`
  const shown = new Set(each.map(([name]) => name))
  const links = each.flatMap(([name, { fields, idField }]) =>
    Object.entries(fields)
      .filter(
        ([field, { type, linksTo }]) =>
          field !== idField && (type === "link" || type === "list of links") && !(linksTo && shown.has(linksTo))
      )
      .map(([field]) => `${name}.${field}`)
  )
  if (links.length) {
    said.add(
      `A link to somewhere else:  ${links.join(", ")} hold addresses of nothing described here, so they read as text.`
    )
  }
  const pointers = each
    .filter(([, { fields, idIsAnAddress }]) => idIsAnAddress && Object.keys(fields).length <= 2)
    .map(([name]) => name)
  if (pointers.length) {
    said.add(
      `A list that only points elsewhere:  the rows of ${pointers.join(", ")} hold little but an address, the rest is at each one, and no line can say to read it there.`
    )
  }
  for (const [name, { fields, paging, rowsAt, nextAt }] of each) {
    for (const [field, { type, inside }] of Object.entries(fields)) {
      if (type === "inside" && !inside)
        said.add(
          `A list of objects inside a field:  ${field} of ${name} holds them, and a type's line can't say their shape yet, so it's left out.`
        )
    }
    if (paging === "link header" && each.some(([, collection]) => collection.paging === "next field"))
      said.add(
        `Paging by a Link header in one collection and a field in another:  ${name} says its next page in its Link header, and "its next page is" is for the whole place, so a read of it gets only its first page.`
      )
    // what's said of lists is said of those that list:  one found by name is read a thing at a time
    const lists = each.filter(([, { at }]) => !/\{[^{}/]*\}/.test(at))
    if (rowsAt && new Set(lists.map(([, collection]) => collection.rowsAt)).size > 1)
      said.add(`Rows kept somewhere different in each collection:  "its rows are" is for the whole place.`)
    if (nextAt && new Set(lists.map(([, collection]) => collection.nextAt)).size > 1)
      said.add(`A next page kept somewhere different in each collection:  "its next page is" is for the whole place.`)
  }
  const { kind } = about
  if (kind === "web server") {
    said.add(
      "What it can filter or sort:  no line says, so `where` and `sorted by` load its rows and work here, up to the usual ceiling."
    )
    if (/read only/.test(canDo.write))
      said.add("That it's read only:  no line says, so a program's write compiles, and fails when it runs.")
  }
  if (kind === "sheet" || kind === "google sheet") {
    if (
      each.some(([, { fields }]) =>
        Object.keys(fields).some((field) => /[^a-z0-9_ ]/.test(field) || /[A-Z]/.test(field))
      )
    ) {
      said.add(
        "A sheet's column by another name:  a sheet reads no `a recipe's title is its \"Title\"` line, so a column named differently stays empty."
      )
    }
  }
  return [...said]
}

/**
 * `parts`, only the lines the tool really wrote last time, `written`:  an older version wrote other words.
 * - So a line today's version writes and that one didn't is new, and is added;  and one it wrote in older words is
 *   `mergedSpell()`'s to put in today's.
 * - No record of what was written:  `parts` as they are.
 */
function writtenOf(parts: SpellParts, written: readonly string[] | undefined): SpellParts {
  if (!written?.length) return parts
  const wrote = new Set(written.map((line) => line.trim()))
  const kept = (lines: readonly SpellLine[]) => lines.filter(({ text }) => wrote.has(text))
  return {
    ...parts,
    placeLines: kept(parts.placeLines),
    types: parts.types.map((type) => ({ ...type, lines: kept(type.lines) }))
  }
}
