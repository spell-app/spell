import type { KeyGoes } from "spell/places/keyGoes"
import { ANY_FIELD, isPlaceServerAddress } from "spell/places/places.types"
import { tokenServiceMint } from "spell/places/PlaceToken"
import { SP } from "spell/parser/spell"
import { fieldNamed } from "spell/parser/spell/rules/places/PlaceDetail"
import { parseSpellProject } from "spell/parser/spell/test/parseSpellProject"

import {
  IngestStopped,
  type CollectionDescription,
  type CollectionLook,
  type Deployment,
  type FieldDescription,
  type IngestAsk,
  type IngestResult,
  type IngestSettings,
  type PlaceDescription,
  type PlaceLook,
  type PlaceState,
  type VerifyAsk
} from "./ingest.types"
import { descriptionFromDisk, descriptionOnDisk, stateOfRead } from "./PlaceOnDisk"
import { agentRead, renameCollections } from "./PlaceReading"
import {
  answersUnder,
  IS_WEB_ADDRESS,
  jsonOf,
  KINDS_IT_CAN_LOOK_AT,
  kindFoundAt,
  kindReadFrom,
  lookAtPlace,
  messageOf
} from "./PlaceLook"
import { checkSecondsWithin, describeLook, fieldsOf, fingerprintOf, idFieldOf, plainNameFor } from "./PlaceShape"
import { partsInLanguageOf } from "./PlaceInLanguage"
import {
  isSearchedApart,
  KINDS_WITH_KEY_LINES,
  mergedSpell,
  placeLineAt,
  placesIn,
  spellPartsFor,
  spellLinesOf,
  spellTextOf,
  type MergeMarks,
  type SpellLine,
  type SpellParts,
  type TypeLines,
  type WrittenLine
} from "./PlaceSpell"
import { keptHeaders, PoliteReader, sessionEnded } from "./PoliteReader"
import { writesTried, writeWordsFor } from "./WritesTried"

/** How many times it leaves out a line Spell can't read, and tries again. */
const MOST_COMPILES = 12

/** How many times, for a place read whole from its OpenAPI description (epic `data` P49). */
const MOST_COMPILES_OF_A_SPEC = 60

/** What a compile says of a line:  `3:12 ...`. */
const ERROR_LINE = /^(\d+):\d+ (.*)$/s

/** The line that keeps a copy on this device, in either language:  a person's, if it's in the file. */
const KEEPS_A_COPY = /keep a copy on this device|guarda una copia en este dispositivo/i

/** A kind of place, as a person might write it:  `sheet` and `spreadsheet` are one. */
const KIND_WORDS: Readonly<Record<string, string>> = {
  spreadsheet: "sheet",
  csv: "sheet",
  rest: "web server",
  graphql: "graphql server",
  folder: "data folder",
  atmosphere: "atmosphere account"
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
 *   7. only then, the files:  a file is added to, never overwritten, and the same place isn't added twice;
 *      a `<Name>.es.spell` gets Spanish, its names as the source has them (`partsInLanguageOf()`, epic `data` T72)
 * - One server per Spell file, `<Name>.api.spell`;  its description goes beside it, `<Name>.api.json5`.
 * - A file is written in plain Spell, each member bare (epic `language` P46);  a look again merges into it.
 *   - JSON5, so a person can read it, and the next look can too.
 *   - What every collection agrees on is written once, in `allCollections`;
 *     each collection keeps only what differs (`descriptionOnDisk()`).
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
    const existing = (await files.read(file)) ?? ""
    const already = placeLineAt(existing, address)
    if (already) return this.alreadyThere(file, already, existing)
    const reader = await this.readerFor(ask.keySecret, ask.signedIn, ask.keyGoes, ask.tokenFrom)
    const kind = await this.kindFor(address, ask.kind, reader, ask)
    this.say(`A ${kind}.  Looking at what it holds ...`)
    const look = await lookAtPlace(kind, {
      address,
      reader,
      ...withDefined({
        docs: ask.docs,
        spec: ask.spec,
        collections: ask.collections,
        samples: ask.samples,
        namesInFolder: files.namesInFolder
      })
    })
    if (!look.collections.length) {
      throw new IngestStopped(`${address} gave back nothing to describe.  ${look.notes.join("  ")}`)
    }
    // the address asked for may be one list of a place, whose own address is above it
    const alreadyAbove = placeLineAt(existing, look.address)
    if (alreadyAbove) return this.alreadyThere(file, alreadyAbove, existing)
    refuseSecondServer(file, existing)
    const description = describeLook(look, {
      kind,
      name: ask.name ?? look.nameSuggested ?? plainNameFor(address, kind)
    })
    if (ask.keySecret) description.about.keySecret = ask.keySecret
    if (ask.keyGoes) description.about.keyGoes = ask.keyGoes
    if (ask.keySecret && !look.specAt) await this.noteKeyIfSet(description, look)
    noteSignedIn(description, ask.signedIn)
    if (ask.tokenFrom !== undefined) description.about.tokenFrom = ask.tokenFrom
    if (ask.dataIsPrivateIn !== undefined)
      description.about.privateDataIn = ask.dataIsPrivateIn || privateFolderFor(description)
    if (look.specAt) noteFromSpec(description)
    if (ask.collections?.length) description.about.collectionsAsked = [...ask.collections]
    await this.notePictures(description, ask.pictures, reader)
    if (ask.triesWrites) await this.noteWrites(description, look, reader)
    awayFromTypesBeside(description, await files.otherSpellBeside(file))
    await this.readWithAgent(description, look, { keepName: !!ask.name })
    await this.keepPrivate(description, look, file)
    const warnings = this.compileLeavingOut(description, file)
    this.checkAddedCompiles(existing, description, file)
    if (!look.specAt) await this.readThroughIt(description, reader, ask.keySecret)
    noteKeepingACopy(description, existing)
    await this.finish(description)
    const spell = spellTextOf(partsInLanguageOf(file, spellPartsFor(description))).trimEnd()
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
   * - `movedTo`:  its new address, for a place that moved:  the same collections, looked at where it is now (epic `data` T77).
   * - throws `IngestStopped`:  no description, or nothing compiles or reads
   */
  async update(file: string, { movedTo }: { movedTo?: string } = {}): Promise<IngestResult> {
    const descriptionPath = descriptionPathFor(file)
    const onDisk = await this.settings.files.readDescription(descriptionPath)
    if (!onDisk) {
      throw new IngestStopped(
        `${file} has no description beside it, ${descriptionPath}, so there's nothing to look at again:  spell place ingest <address> --into ${file}`
      )
    }
    return this.updateOne(file, descriptionPath, descriptionFromDisk(onDisk), movedTo)
  }

  /** Look again at one place, at `movedTo` when it's moved. */
  private async updateOne(
    file: string,
    descriptionPath: string,
    old: PlaceDescription,
    movedTo?: string
  ): Promise<IngestResult> {
    const { files } = this.settings
    const { name, kind, keySecret, keyGoes, signedIn, docsAt, specAt, collectionsAsked, picturesAsked } = old.about
    const address = movedTo === undefined ? old.about.address : addressFrom(movedTo)
    const reader = await this.readerFor(keySecret, signedIn, keyGoes, old.about.tokenFrom)
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
      ...withDefined({
        spec: specAt,
        docs: docsAt,
        samples: samples.length ? samples : undefined,
        namesInFolder: files.namesInFolder
      })
    })
    const description = describeLook(look, { kind, name })
    if (keySecret) description.about.keySecret = keySecret
    if (keyGoes) description.about.keyGoes = keyGoes
    if (keySecret && !specAt) await this.noteKeyIfSet(description, look)
    noteSignedIn(description, signedIn)
    if (old.about.tokenFrom !== undefined) description.about.tokenFrom = old.about.tokenFrom
    if (old.about.privateDataIn !== undefined) description.about.privateDataIn = old.about.privateDataIn
    if (specAt) noteFromSpec(description)
    if (collectionsAsked) description.about.collectionsAsked = collectionsAsked
    await this.notePictures(description, picturesAsked, reader)
    // the agent's notes stay, as it isn't asked again;  everything else, this look says afresh
    description.agentNotes = agentNotesOf(old)
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
    }
    if (old.about.triesWrites) await this.noteWrites(description, look, reader)
    await this.keepPrivate(description, look, file)
    // a line of the new look's that Spell can't read is left out, as the first look's was:  GitHub's reactions' `+1`
    this.compileLeavingOut(description, file)
    // each in the file's language:  the same line in, the same line out
    const before = partsInLanguageOf(file, writtenOf(spellPartsFor(old), old.spell))
    const after = partsInLanguageOf(file, spellPartsFor(description))
    const written = (await files.read(file)) ?? ""
    const text = written
    const others = await files.otherSpellBeside(file)
    const merge = mergedSpell(
      text,
      before,
      after,
      (words, own) => isUsed(words, text, others, own),
      old.spell,
      this.marksFor(file)
    )
    const changes = [...saidChanges(old, description), ...merge.changed]
    const warnings = this.checkFileCompiles(text, merge.text, file)
    if (!specAt) await this.readThroughIt(description, reader, keySecret)
    noteKeepingACopy(description, merge.text)
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

  /**
   * Try the place described beside `file` against a running server:  `spell place verify` (epic `data` P49, J254).
   * - Reads each list, and one thing of it by its id;  each collection's `state` says how it went, when, and on which
   *   deployment:  `verified` with its rows, or `failed` with its status and why.
   * - A list no schema typed (`untyped`) gets its fields from what it read.
   * - Its Spell says only each type's `this type is verified` or `failed`;  everything else stays in the description.
   * - A route that answers `Deprecation` or `Sunset` is noted, with its successor (J251).
   * - NEVER writes to the server unless asked (`triesWrites`), and never on a read only deployment.
   * - Keeps what a person wrote, as `update()` does (`mergedSpell()`).
   * - throws `IngestStopped`:  no description, a deployment nobody listed, writes asked of a read only one
   */
  async verify(file: string, { deployment: named, triesWrites }: VerifyAsk = {}): Promise<IngestResult> {
    const { files } = this.settings
    const descriptionPath = descriptionPathFor(file)
    const onDisk = await files.readDescription(descriptionPath)
    if (!onDisk) {
      throw new IngestStopped(
        `${file} has no description beside it, ${descriptionPath}, so there's nothing to verify:  spell place ingest <address> --into ${file}`
      )
    }
    const old = descriptionFromDisk(onDisk)
    const description = descriptionFromDisk(structuredClone(onDisk))
    const { keySecret, signedIn, keyGoes, tokenFrom } = description.about
    const deployment = await this.deploymentFor(file, description, named)
    if (triesWrites) refuseWritesOn(deployment)
    const address = deployment?.at ?? description.about.address
    const reader = await this.readerFor(
      deployment?.key ?? keySecret,
      signedIn,
      keyGoes,
      deployment?.tokenFrom ?? tokenFrom
    )
    this.say(`Verifying ${address}${deployment ? `, its ${deployment.name} deployment` : ""} ...`)
    const changes: string[] = []
    const read: CollectionLook[] = []
    for (const [name, collection] of Object.entries(description.collections)) {
      if (collection.leftOut || collection.state?.is === "disabled" || !isListed(collection)) continue
      // each list its own allowance:  a whole description has hundreds, each read once, a gap between each request
      reader.startAgain()
      const was = collection.state?.is
      const { state, rows } = await this.verifyCollection(address, collection, reader, deployment?.name)
      collection.state = state
      if (rows.length) read.push({ name, at: collection.at, rows, paging: "none", pagesRead: 1, hasMore: false })
      if (state.is !== was) {
        changes.push(`${name}:  ${was ?? "never tried"} => ${state.is}${state.reason ? ` -- ${state.reason}` : ""}.`)
      }
    }
    // only because the person said it may, and never on a read only deployment (above)
    if (triesWrites) {
      const seen = await writesTried(address, read, reader)
      if (seen) description.canDo.write = writeWordsFor(seen)
    }
    await this.keepPrivate(description, { address, collections: read, headers: {}, notes: [] }, file)
    description.about.fingerprint = await fingerprintOf(description)
    description.spell = spellTextOf(spellPartsFor(description)).trimEnd().split("\n")
    const before = partsInLanguageOf(file, writtenOf(spellPartsFor(old), old.spell))
    const after = partsInLanguageOf(file, spellPartsFor(description))
    const text = (await files.read(file)) ?? ""
    const others = await files.otherSpellBeside(file)
    const merge = mergedSpell(
      text,
      before,
      after,
      (words, own) => isUsed(words, text, others, own),
      old.spell,
      this.marksFor(file)
    )
    const warnings = this.checkFileCompiles(text, merge.text, file)
    await files.write(file, merge.text)
    await this.writeDescription(file, descriptionPath, description)
    return {
      file,
      descriptionPath,
      description,
      wrote: true,
      spell: merge.text,
      changes: [...changes, ...merge.changed],
      couldntChange: merge.couldnt,
      warnings
    }
  }

  /**
   * One collection tried:  its first page, then its first thing by its id.
   * - NEVER throws for an answer, or none:  that's `failed`;  but `IngestStopped` past the reader's limits
   */
  private async verifyCollection(
    address: string,
    collection: CollectionDescription,
    reader: PoliteReader,
    deployment: string | undefined
  ): Promise<{ state: PlaceState; rows: Array<Record<string, unknown>> }> {
    const tried = { at: this.nowISO(), ...(deployment !== undefined && { deployment }) }
    const failed = (reason: string, status?: number) => ({
      state: { is: "failed" as const, ...tried, ...(status !== undefined && { status }), reason },
      rows: []
    })
    const url = `${address}${collection.at}`
    let answer: Awaited<ReturnType<PoliteReader["read"]>>
    try {
      answer = await reader.read(url)
    } catch (error) {
      if (error instanceof IngestStopped && !reader.hasRoom) throw error
      return failed(`it didn't answer:  ${messageOf(error)}`)
    }
    if (answer.status >= 400) return failed(`it answered ${answer.status}${detailOf(answer.text)}`, answer.status)
    const body = jsonOf(answer.text)
    const list =
      collection.rowsAt === undefined ? body : (body as Record<string, unknown> | undefined)?.[collection.rowsAt]
    if (!Array.isArray(list)) {
      return failed(`its answer holds no list${collection.rowsAt ? ` in "${collection.rowsAt}"` : ""}`, answer.status)
    }
    const rows = list.filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    const deprecated = deprecationOf(answer.headers)
    if (deprecated) collection.about = [collection.about, deprecated].filter(Boolean).join("  ")
    // no schema said its fields:  what it read does
    if (!Object.keys(collection.fields).length && rows.length) {
      collection.fields = fieldsOf(rows)
      const id = idFieldOf(rows, collection.fields)
      if (id !== undefined) collection.idField = id
    }
    const missing = Object.entries(collection.fields)
      .filter(([field, { isRequired }]) => isRequired && rows.length && rows.every((row) => !(field in row)))
      .map(([field]) => field)
    if (missing.length)
      return failed(`its rows don't hold ${missing.join(", ")}, which its description says each has`, answer.status)
    const byId = await this.thingById(address, collection, rows[0], reader)
    if (byId) return failed(byId)
    return { state: { is: "verified", ...tried, status: answer.status, rows: rows.length }, rows }
  }

  /** Read `row` again by its id, at its own address:  why it couldn't be, or `undefined` when it could, or has none. */
  private async thingById(
    address: string,
    { at, idField = "id", operations }: CollectionDescription,
    row: Record<string, unknown> | undefined,
    reader: PoliteReader
  ): Promise<string | undefined> {
    const id = row?.[idField]
    if (typeof id !== "string" && typeof id !== "number") return undefined
    const template =
      operations?.change?.at ?? operations?.delete?.at ?? `${at.replace(/\/+$/, "")}/{id}${at.endsWith("/") ? "/" : ""}`
    const url = `${address}${template.replace(/\{[^{}/]*\}/, encodeURIComponent(`${id}`))}`
    try {
      const { status } = await reader.read(url)
      return status >= 400 ? `its thing ${id}, read by its id at ${url}, answered ${status}` : undefined
    } catch (error) {
      if (error instanceof IngestStopped && !reader.hasRoom) throw error
      return `its thing ${id}, read by its id at ${url}, didn't answer`
    }
  }

  /**
   * The deployment to work on, from the project's file:  `named`, else the first listed;  none listed and none named:
   * `undefined`, its own address.
   * - throws `IngestStopped` for one named that isn't listed
   */
  private async deploymentFor(
    file: string,
    description: PlaceDescription,
    named: string | undefined
  ): Promise<(Deployment & { name: string }) | undefined> {
    const place = description.about.name
    const listed = await this.settings.files.deploymentsOf?.(file, place)
    const names = Object.keys(listed ?? {})
    if (!names.length) {
      if (named === undefined) return undefined
      throw new IngestStopped(
        `${file}'s project lists no deployments of ${place}, so there's no "${named}" to pick:  list them in its "places"`
      )
    }
    const picked = named ?? names[0]!
    const deployment = listed![picked]
    if (!deployment) throw new IngestStopped(`${place} has no deployment "${picked}":  ${names.join(", ")}`)
    return { name: picked, ...deployment }
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
    { collections, samples, spec }: Pick<IngestAsk, "collections" | "samples" | "spec"> = {}
  ): Promise<string> {
    if (named) return kindNamed(named)
    // an OpenAPI description is a web server's (epic `data` P49)
    if (spec) return "web server"
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

  /**
   * A reader for this place, with its key and session.
   * - `tokenFrom`:  the key sent is a token made there from the key (epic `data` P49), the same way a program's is
   *   (`tokenServiceMint()`).
   * - throws `IngestStopped` for a key or session that isn't there, or has ended, or a token service that says no
   */
  private async readerFor(
    keySecret: string | undefined,
    signedIn?: string,
    keyGoes?: KeyGoes,
    tokenFrom?: string
  ): Promise<PoliteReader> {
    const { fetch, sleep, keyNamed, sessionNamed, Socket } = this.settings
    const secret = keySecret ? keyNamed?.(keySecret) : undefined
    if (keySecret && secret === undefined) {
      throw new IngestStopped(
        `the key named ${keySecret} isn't in the environment:  set it, and it's sent, never written down`
      )
    }
    const key = secret !== undefined && tokenFrom !== undefined ? await tokenMadeFrom(secret, tokenFrom, fetch) : secret
    const session = signedIn ? sessionNamed?.(signedIn) : undefined
    if (signedIn && !session) {
      throw new IngestStopped(`${signedIn} hasn't been signed in to:  spell place sign-in ${signedIn} <address>`)
    }
    if (session?.hasEnded) throw sessionEnded(session)
    return new PoliteReader({ fetch, ...withDefined({ key, keyGoes, session, sleep, Socket }) })
  }

  /**
   * SIDE EFFECT:  when the first collection it looked at answers without the key too,
   * the key's only for when it's set (GitHub answers 60 requests an hour with none);
   * and a program checks within the limit it has without one.
   * - One request, with no key, of a page of it.
   * - NEVER throws:  no answer leaves the key needed.
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
   * SIDE EFFECT:  `description` says what a write of each kind answered, and whether the server keeps them
   * (epic `data` P30):  only because the person said it may, `--try-writes` (`writesTried()`).
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
   * SIDE EFFECT:  each field `asked` names holds a picture's id, where it answers a picture (epic `data` P29):
   * `cover_i=https://covers.openlibrary.org/b/id/{id}-M.jpg`, tried on a real value, one request each.
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

  /**
   * SIDE EFFECT:  a place whose data is private keeps no real value in its description, and the rows it read go in its
   * folder, one samples file a collection, as `spell place read-page` writes them (epic `data` P49, J249, J259).
   * - Nothing to write them with:  said, and they're dropped.
   * - NEVER throws for a file it couldn't write:  said.
   */
  private async keepPrivate(description: PlaceDescription, look: PlaceLook, file: string): Promise<void> {
    const folder = description.about.privateDataIn
    if (folder === undefined) return
    for (const collection of Object.values(description.collections)) withoutExamples(collection.fields)
    const { writeAway } = this.settings.files
    const read = look.collections.filter(({ rows }) => rows.length)
    if (!read.length) return
    if (!writeAway) {
      description.notes.push(
        `Its data is private, and nothing here can write its rows to ${folder}:  they're not kept.`
      )
      return
    }
    const stem = file.slice(file.lastIndexOf("/") + 1).replace(/(?:\.[a-z]{2})?(?:\.api)?\.spell$/, "")
    const readAt = this.nowISO()
    for (const { at, rows } of read) {
      const [name] = Object.entries(description.collections).find(([, each]) => each.at === at) ?? []
      if (!name) continue
      const path = `${folder.replace(/\/+$/, "")}/${stem}.${name.replace(/\W+/g, "-")}.samples.json`
      const page = `${description.about.address}${at}`
      try {
        await writeAway(path, `${JSON.stringify({ page, readAt, rows }, null, 2)}\n`)
      } catch (error) {
        description.notes.push(
          `${name}'s rows couldn't be kept in ${path}:  ${error instanceof Error ? error.message : error}`
        )
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
    // a whole description has many more lines to leave out
    const most = description.about.specAt ? MOST_COMPILES_OF_A_SPEC : MOST_COMPILES
    // the English it wrote:  whatever language the file is in, that's checked after
    const englishFile = file.replace(/\.[a-z]{2}\.spell$/, ".spell")
    for (let round = 0; round < most; round++) {
      const parts = spellPartsFor(description)
      const text = spellTextOf(parts)
      const { errors, warnings } = compile(text, englishFile)
      if (!errors.length) return warnings
      // each line by where it is, never its words:  another type may have a line saying the same (epic `data` I106)
      const written = spellLinesOf(parts)
      const tried = new Set<number>()
      let leftOut = 0
      for (const error of errors) {
        const [, at, message] = ERROR_LINE.exec(error) ?? []
        const index = Number(at) - 1
        const line = written[index]
        // one line left out once, however many errors it has
        if (!line?.text.trim() || tried.has(index)) continue
        tried.add(index)
        if (leaveOutLine(description, line, message ?? error)) leftOut++
      }
      if (!leftOut) {
        throw new IngestStopped(`the Spell written for it doesn't compile:\n${errors.join("\n")}\n\n${text}`)
      }
    }
    throw new IngestStopped("the Spell written for it doesn't compile, after leaving out every line it could")
  }

  /** The file with this place added has no error it hadn't before.  - throws `IngestStopped` if it does */
  private checkAddedCompiles(existing: string, description: PlaceDescription, file: string): void {
    const spell = spellTextOf(partsInLanguageOf(file, spellPartsFor(description)))
    this.checkFileCompiles(existing, existing.trim() ? `${existing.trimEnd()}\n\n${spell}` : spell, file)
  }

  /** The file as it'll be has no error it hadn't before:  a program may import what no single file can see.  - throws `IngestStopped` if it does */
  private checkFileCompiles(before: string, after: string, file: string): string[] {
    const was = new Set(compile(before, file).errors.map(withoutPlaceInFile))
    const { errors, warnings } = compile(after, file)
    const added = errors.filter((error) => !was.has(withoutPlaceInFile(error)))
    if (added.length)
      throw new IngestStopped(`with this place in it, ${file} doesn't compile:\n${added.join("\n")}\n\n${after}`)
    return warnings
  }

  ////////////////
  // ## Reading through it
  ////////////////

  /**
   * SIDE EFFECT:  really reads each type through the Spell, and says what it found on `description`.
   * - throws `IngestStopped` if no type returned any row
   */
  private async readThroughIt(
    description: PlaceDescription,
    reader: PoliteReader,
    keySecret: string | undefined
  ): Promise<void> {
    const { readThrough, keyNamed } = this.settings
    reader.startAgain()
    const shown = Object.values(description.collections).filter((collection) => !collection.leftOut)
    const { kind, address } = description.about
    // an Airtable is reached through a server side, which holds its key:  there's none here to read through
    if (kind === "airtable" && !isPlaceServerAddress(address)) {
      for (const collection of shown)
        collection.state = { is: "verified", at: this.nowISO(), rows: collection.rowsSeen, readByTheLook: true }
      description.notes.push(
        "It wasn't read through the Spell:  a program reaches an Airtable through a server side that holds its key, and there's none here.  Its rows came straight from Airtable."
      )
      return
    }
    this.say("Reading through the Spell ...")
    const types: Record<string, string> = {}
    for (const { type } of shown) types[type] = classNameFor(type)
    const byName = Object.fromEntries(
      shown.flatMap(({ type, samples }) => (samples?.length ? [[type, samples[0]!]] : []))
    )
    // answering only a search:  searched for what it was looked at with, `dune`
    // searching all of each thing:  searched too, as its list may be too long to read, the Met Museum's 500,000 ids
    // each collection searched its own way, at its own address:  all of each, GitHub's (`isSearchedApart()`)
    const searchedApart = isSearchedApart(shown)
    const bySearch = Object.fromEntries(
      shown.flatMap(({ type, searchedOnly, searchedFor, searchedBy, fields }) =>
        (searchedOnly || searchedBy?.searchesEverything) && searchedFor !== undefined && searchedBy
          ? [
              [
                type,
                {
                  field:
                    searchedBy.searchesEverything || searchedApart
                      ? ANY_FIELD
                      : fieldNamed(fields[searchedBy.field]?.words ?? searchedBy.field),
                  text: searchedFor
                }
              ]
            ]
          : []
      )
    )
    // asked for by a query:  asked what it was looked at with, each field as Spell names it
    const byQuery = Object.fromEntries(
      shown.flatMap(({ type, askedBy, fields }) =>
        askedBy
          ? [
              [
                type,
                Object.fromEntries(
                  Object.entries(askedBy).map(([field, value]) => [
                    fieldNamed(fields[field]?.words ?? field),
                    fields[field]?.type === "number" ? Number(value) : value
                  ])
                )
              ]
            ]
          : []
      )
    )
    const spell = spellTextOf(spellPartsFor(description, { withKey: false }))
    // a data folder, a file or a room's key is its server's run token, as a page it served has its own
    const serverToken = keySecret && !KINDS_WITH_KEY_LINES.has(kind) ? keyNamed?.(keySecret) : undefined
    const { byType, complaints } = await readThrough({
      spell,
      types,
      byName,
      bySearch,
      byQuery,
      fetch: reader.fetch,
      ...withDefined({ serverToken })
    })
    for (const collection of shown) {
      const read = byType[collection.type]
      if (read) collection.state = stateOfRead(read, this.nowISO())
    }
    // each said once
    description.notes = [...new Set([...description.notes, ...complaints])]
    const rows = shown.reduce((sum, { state }) => sum + (state?.rows ?? 0), 0)
    if (!rows) {
      const why = shown.map(({ type, state }) => `${type}:  ${state?.reason ?? "no rows"}`).join("\n")
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

  /** The day it looks, and `file`'s language:  the dated marks a later look writes (`mergedSpell()`, epic `data` P53). */
  private marksFor(file: string): MergeMarks {
    return { date: this.nowISO().slice(0, 10), lang: SP.Language.forFile(file).lang }
  }

  /** What time it is, in ISO:  a test's clock. */
  private nowISO(): string {
    return (this.settings.now?.() ?? new Date()).toISOString()
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

/**
 * SIDE EFFECT:  a server that takes no writes is said to be one a program could keep a copy of (epic `data` T126).
 * - Only said:  it never writes the line itself, and one a person added stays.
 * - Not said once the file has it.
 */
function noteKeepingACopy(description: PlaceDescription, text: string): void {
  const { kind } = description.about
  const onlyReads = /read only|offers none/i.test(description.canDo.write)
  if ((kind !== "web server" && kind !== "graphql server") || !onlyReads || KEEPS_A_COPY.test(text)) return
  description.notes.push(
    "It only reads, so a program could keep what it read on this device, and open with it the next time:  add `keep a copy on this device`."
  )
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
// ## Helpers
////////////////

/**
 * A read only deployment takes no writes:  the ONE check, for `--try-writes` and `verify`'s, beside `noteWrites()`
 * (epic `data` P49, J258).
 * - throws `IngestStopped` for one marked read only
 */
function refuseWritesOn(deployment: { name: string; readOnly?: boolean } | undefined): void {
  if (!deployment?.readOnly) return
  throw new IngestStopped(
    `its ${deployment.name} deployment is read only, so nothing is written there:  try writes on another, --deployment <name>`
  )
}

/** Can a collection be read as a list:  not one found by name, only by a search, or asked for by a query? */
function isListed({ at, searchedOnly, askedBy, samples }: CollectionDescription): boolean {
  return !/\{[^{}/]*\}/.test(at) && !searchedOnly && !askedBy && !samples
}

/** What an error answer says, short:  NetBox's `{ "detail": "..." }`. */
function detailOf(text: string): string {
  const body = jsonOf(text) as { detail?: unknown; error?: unknown; message?: unknown } | undefined
  const said = body?.detail ?? body?.error ?? body?.message
  return typeof said === "string" ? `:  ${said.slice(0, 200).replace(/\.+$/, "")}` : ""
}

/** What its answer says of its going away, `Deprecation`, `Sunset` and its successor (J251):  `undefined` for nothing. */
function deprecationOf(headers: Headers): string | undefined {
  const deprecation = headers.get("deprecation")
  const sunset = headers.get("sunset")
  if (!deprecation && !sunset) return undefined
  const successor = /<([^>]+)>\s*;[^,]*\brel="?successor-version"?/.exec(headers.get("link") ?? "")?.[1]
  return ["It says it's going away", sunset ? `on ${sunset}` : "", successor ? `:  use ${successor} instead` : ""]
    .filter(Boolean)
    .join(" ")
    .concat(".")
}

/** Where a private place's rows go when nothing says:  `~/.spell/places/netbox`. */
function privateFolderFor({ about }: PlaceDescription): string {
  return `~/.spell/places/${about.name.toLowerCase().replace(/[^\p{L}\d]+/gu, "-")}`
}

/** SIDE EFFECT:  no field, nor any inside one, keeps a real value. */
function withoutExamples(fields: Record<string, FieldDescription>): void {
  for (const field of Object.values(fields)) {
    delete field.example
    if (field.inside) withoutExamples(field.inside)
  }
}

/**
 * A token made from `secret` at `tokenFrom`, for a look.
 * - throws `IngestStopped` when the token service says no, or doesn't answer
 */
async function tokenMadeFrom(secret: string, tokenFrom: string, fetch: typeof globalThis.fetch): Promise<string> {
  try {
    return (await tokenServiceMint(tokenFrom, fetch)(secret)).token
  } catch (error) {
    throw new IngestStopped(
      `no token could be made at ${tokenFrom}:  ${error instanceof Error ? error.message : error}`
    )
  }
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
 * SIDE EFFECT:  the Spell leaves out the line `line` is, with why:  `false` if it's no line it can leave out.
 * - A field's line, its field;  a collection's `lives at` or its type's header, the collection.
 * - A type inside a row:  a line under it, its field;  its header, every field holding it, never their collection
 *   (epic `data` I106).
 */
function leaveOutLine(description: PlaceDescription, line: WrittenLine, why: string): boolean {
  const reason = `Spell couldn't read its line:  ${line.text.trim()} -- ${why}`
  const { key, type } = line
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
    if (kind === "inside" && type) return leaveOutInside(description, type, collection, field!, reason)
    // an action route Spell can't name:  its description keeps it, disabled
    const action = held && kind === "action" ? held.operations?.[field!] : undefined
    if (action) {
      action.state = { is: "disabled", reason }
      description.notes.push(`Left out ${collection}'s action "${field}":  ${reason}`)
      return true
    }
  }
  if (!type || line.text !== type.header) return false
  if (type.isInside) return leaveOutHolders(description, type, reason)
  return leaveOutCollection(description, type.collection, reason)
}

/**
 * SIDE EFFECT:  the Spell leaves out a field of a type inside a row, `typeWords`, by its `words`:
 * GitHub's reactions' `+1` and `-1`.
 * - `false` if there's no such line
 */
function leaveOutInside(
  description: PlaceDescription,
  { insideFields }: TypeLines,
  typeWords: string,
  words: string,
  reason: string
): boolean {
  const [name, about] =
    Object.entries(insideFields ?? {}).find(([, each]) => each.words === words && !each.leftOut) ?? []
  if (!about) return false
  about.leftOut = reason
  description.notes.push(`Left out ${typeWords}'s "${name}":  ${reason}`)
  return true
}

/** SIDE EFFECT:  the Spell leaves out each field holding a type inside a row, so it's written no more. */
function leaveOutHolders(description: PlaceDescription, { heldBy = [] }: TypeLines, reason: string): boolean {
  const holders = heldBy.filter(({ field }) => !field.leftOut)
  for (const { owner, field } of holders) {
    field.leftOut = reason
    description.notes.push(`Left out ${owner}'s "${field.words}":  ${reason}`)
  }
  return holders.length > 0
}

/** SIDE EFFECT:  the Spell leaves out a whole collection. */
function leaveOutCollection(description: PlaceDescription, collection: string, reason: string): boolean {
  const held = description.collections[collection]!
  if (held.leftOut) return false
  held.leftOut = reason
  description.notes.push(`Left out the collection "${collection}":  ${reason}`)
  return true
}

/** A type a Spell file declares:  `a "user" is a thing`, `a user is a thing`. */
const DECLARED_TYPE = /^(?:a|an|un|una) (?:"([^"\n]+)"|([\p{L}\d ]+?)) (?:is a thing|es una cosa)\b/gmu

/**
 * SIDE EFFECT:  a type another Spell file beside it already declares goes by the place's name too,
 * as one project holds every type once (epic `data` P30):
 * JSONPlaceholder's `user`, beside GitHub's, is a `jsonplaceholder user`.
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
  // a line an older version bulleted, `- its "mass" is a number`, is its own too (epic `language` P46)
  const hereUses = text.split("\n").some((line) => !own.has(line.trim().replace(/^- /, "")) && uses(line))
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
      // what was tried stays, till it's tried again:  a look at a description tries nothing
      ...(oldCollection.state && collection.state?.is === "unverified" && { state: oldCollection.state }),
      ...(oldCollection.idField && oldCollection.idField in collection.fields && { idField: oldCollection.idField }),
      fields: collection.fields
    }
  }
  description.collections = kept
  const {
    about,
    canDo,
    collections,
    notes,
    agentNotes,
    spellCantSay,
    checkEverySeconds,
    mostPerSecond,
    serverTakes,
    spell,
    ...personsKeys
  } = old
  Object.assign(description, personsKeys)
  return isNew
}

/**
 * What the notes the checks write start with, or say:  what each look says again (epic `data` I54).
 * - A read through the Spell, the program's own complaints, the look, the pictures tried, a line left out, the agent failing.
 */
const CHECKS_NOTE =
  /^(?:No row read filled |Expected |Left out |Stopped before |It holds more than the |It's bigger than it reads|The agent(?:'s answer| couldn't)|No collection has a field |[A-Z]\w*:  )|, but its place sent |" answer(?:s only a search|ed from |ed with no rows)|" couldn't be read:  |" is (?:searched at |a list of \d+ ids)|" answers only ids|isn't a picture's id|couldn't be tried:  |where its pictures are|is a plain list, and Spell reads/

/**
 * The agent's notes of `old`, a description looked at before.
 * - One from before they had a list of their own (epic `data` I54):  sorted once from its notes.
 *   None, when no agent read it;  else each note the checks wouldn't write.
 */
function agentNotesOf(old: PlaceDescription): string[] {
  if (old.agentNotes) return [...old.agentNotes]
  if (/^nobody/.test(old.about.readBy)) return []
  return [...new Set(old.notes.filter((note) => !CHECKS_NOTE.test(note)))]
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
function whatSpellCantSay({ about, collections, serverTakes }: PlaceDescription): string[] {
  const said = new Set<string>()
  if (about.signedIn) {
    said.add(
      `This was read signed in, as ${about.signedIn}'s session.  A program reaches it with no session of its own.`
    )
  }
  const each = Object.entries(collections).filter(([, collection]) => !collection.leftOut)
  // a link to one of its own collections is followed:  `its "homeworld" is a planet`
  const shown = new Set(each.map(([name]) => name))
  const links = each.flatMap(([name, { fields, idField }]) =>
    Object.entries(fields)
      .filter(
        // a name and an address is held whole, the place's name type:  it reads as what it is (epic `data` I47)
        ([field, { type, linksTo, isNamedLink }]) =>
          field !== idField &&
          (type === "link" || type === "list of links") &&
          !isNamedLink &&
          !(linksTo && shown.has(linksTo))
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
    for (const [field, { type, inside, unitsOf }] of Object.entries(fields)) {
      // units of another's fields are on each one:  `its "temperature" is a temperature in °C`
      if (type === "inside" && !inside && unitsOf === undefined)
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
  if (about.kind === "web server" && !serverTakes?.filters && !serverTakes?.sorts) {
    said.add(
      "What it can filter or sort:  it answered as if it hadn't been asked, so `where` and `sorted by` load its rows and work here, up to the usual ceiling.  If it can, add `it filters by cuisine` or `it sorts by title`."
    )
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

/**
 * SIDE EFFECT:  a place read from its description says so (epic `data` P49):  nothing was read from the server, so
 * every list, write and action route is unverified until `spell place verify` tries it.
 */
function noteFromSpec(description: PlaceDescription): void {
  description.canDo.read = "Its description says so:  never read yet."
  description.notes.push(
    "Read from its OpenAPI description only:  every list, write and action route is unverified until `spell place verify` tries it against a running server."
  )
}

/** SIDE EFFECT:  `description` says which session it was read as, by name, never its values. */
function noteSignedIn(description: PlaceDescription, signedIn: string | undefined): void {
  if (signedIn) description.about.signedIn = signedIn
}
