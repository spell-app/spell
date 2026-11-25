import type { KeyGoes } from "spell/places/keyGoes"
import { ANY_FIELD, isPlaceServerAddress } from "spell/places/places.types"
import { tokenServiceMint } from "spell/places/PlaceToken"
import {
  answerFromSaved,
  answerScrubber,
  isOffline,
  SAVED_ANSWER_HEADER,
  savedAnswerPath
} from "spell/places/SavedAnswers"
import { rowsIn } from "spell/places/wrappedRows"
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
import { agentRead, isUniqueIn, renameCollections } from "./PlaceReading"
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
import {
  checkSecondsWithin,
  describeLook,
  fieldsOf,
  fieldsSeenIn,
  fingerprintOf,
  idFieldOf,
  plainNameFor,
  wordsFor
} from "./PlaceShape"
import { MAKES_A_TOKEN } from "./PlaceSpec"
import { partsInLanguageOf } from "./PlaceInLanguage"
import { PlaceWords } from "./PlaceWords"
import {
  isSearchedApart,
  KINDS_WITH_KEY_LINES,
  mergedSpell,
  placeLineAt,
  placesIn,
  spellPartsFor,
  spellLinesOf,
  spellTextOf,
  wordsSpellReads,
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

/** An id that's an address of its own:  read where it says, not put in its collection's. */
const IS_ITS_OWN_ADDRESS = /^https?:\/\//i

/** What `spell place verify` searches a search for, when its description gives nothing to (epic `data` I140). */
const SEARCH_TRIED = "a"

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
    keepAsked(description, ask)
    if (ask.dataIsPrivateIn !== undefined)
      description.about.privateDataIn = ask.dataIsPrivateIn || privateFolderFor(description)
    if (look.specAt) noteFromSpec(description)
    if (ask.collections?.length) description.about.collectionsAsked = [...ask.collections]
    await this.notePictures(description, ask.pictures, reader)
    if (ask.triesWrites) await this.noteWrites(description, look, reader)
    leaveOutCopies(description, (await files.otherDescriptionsBeside?.(file)) ?? [])
    await this.readWithAgent(description, look, { keepName: !!ask.name })
    // after the agent's names, which may be the bare ones another file beside it declares
    awayFromTypesBeside(description, await files.otherSpellBeside(file))
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
    namesFromFile(old, file, (await files.read(file)) ?? "")
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
    // a list a person gave more room to read is read with it again
    const mostBytes = Object.fromEntries(
      Object.values(old.collections).flatMap(({ at, mostBytes: most }) => (most === undefined ? [] : [[at, most]]))
    )
    const look = await lookAtPlace(kind, {
      address,
      reader,
      collections,
      addListed: !collectionsAsked,
      mostBytes,
      ...withDefined({
        spec: specAt,
        docs: docsAt,
        samples: samples.length ? samples : undefined,
        namesInFolder: files.namesInFolder
      })
    })
    const description = describeLook(look, { kind, name })
    for (const [each, collection] of Object.entries(description.collections)) {
      const most = old.collections[each]?.mostBytes
      if (most !== undefined) collection.mostBytes = most
    }
    leaveOutCopies(description, (await files.otherDescriptionsBeside?.(file)) ?? [])
    if (keySecret) description.about.keySecret = keySecret
    if (keyGoes) description.about.keyGoes = keyGoes
    if (keySecret && !specAt) await this.noteKeyIfSet(description, look)
    noteSignedIn(description, signedIn)
    if (old.about.tokenFrom !== undefined) description.about.tokenFrom = old.about.tokenFrom
    keepAsked(description, old.about)
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
    // after the agent's names, as ingest's:  a new type, a list's or one inside a row, named apart from those beside it
    const others = await files.otherSpellBeside(file)
    const listsBefore = new Set(Object.values(old.collections).map(({ at }) => withoutEndSlash(at)))
    awayFromTypesBeside(description, others, listsBefore)
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
   * - `savesAnswers`:  what it reads is saved, scrubbed, as the place's saved answers (`SavedAnswers`), for when its
   *   server can't be reached;  an `offline` deployment is read from them instead of its server.
   * - throws `IngestStopped`:  no description, a deployment nobody listed, writes asked of a read only one, saved
   *   answers asked for with no folder
   */
  async verify(file: string, { deployment: named, triesWrites, savesAnswers }: VerifyAsk = {}): Promise<IngestResult> {
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
    const written = (await files.read(file)) ?? ""
    namesFromFile(old, file, written)
    namesFromFile(description, file, written)
    const { keySecret, signedIn, keyGoes, tokenFrom } = description.about
    const deployment = await this.deploymentFor(file, description, named)
    if (triesWrites) refuseWritesOn(deployment)
    const address = deployment?.at ?? description.about.address
    const answers = this.savedAnswersFor(file, address, deployment, savesAnswers)
    // read from its saved answers alone:  no key needed
    const isAway = deployment?.offline === true
    const reader = await this.readerFor(
      isAway ? undefined : (deployment?.key ?? keySecret),
      isAway ? undefined : signedIn,
      keyGoes,
      isAway ? undefined : (deployment?.tokenFrom ?? tokenFrom),
      answers.fetch
    )
    this.say(
      `Verifying ${address}${deployment ? `, its ${deployment.name} deployment` : ""}${deployment?.offline === true ? ", from its saved answers" : ""} ...`
    )
    const changes: string[] = []
    const read: CollectionLook[] = []
    // a list asked what another list's things answer after the others, so that one's read (`asksFrom`)
    const inOrder = Object.entries(description.collections).sort(
      ([, one], [, other]) => Number(!!one.asksFrom) - Number(!!other.asksFrom)
    )
    for (const [name, collection] of inOrder) {
      if (collection.leftOut || collection.state?.is === "disabled") continue
      // a `GET` that makes a token, or signs in or out, is never read
      if (MAKES_A_TOKEN.test(collection.at)) continue
      const was = collection.state?.is
      // a question its description gives no value for:  a real one, from the list that answers it
      const unanswered = Object.keys(collection.askedBy ?? {}).filter((param) => collection.askedBy![param] === "")
      const answers = unanswered.length ? answersFrom(unanswered, collection, description, read) : undefined
      if (unanswered.length && !answers) {
        if (!isListed({ ...collection, askedBy: undefined })) continue
        collection.state = { is: "unverified", reason: `${NEEDS_A_QUESTION}${unanswered.join(", ")}` }
        if (was !== "unverified")
          changes.push(`${name}:  ${was ?? "never tried"} => unverified -- ${collection.state.reason}.`)
        continue
      }
      if (!answers && !isListed(collection) && !isSearchToTry(collection)) continue
      // each list its own allowance:  a whole description has hundreds, each read once, a gap between each request
      reader.startAgain()
      const { state, rows } = await this.verifyCollection(
        address,
        collection,
        reader,
        deployment?.name,
        description.about.rows,
        {
          answers,
          fromDescription: description.about.specAt !== undefined,
          answered: (asks) => answersFrom(asks, collection, description, read)
        }
      )
      collection.state = state
      // a list no schema typed:  a field any row read holds is kept, though others don't hold it
      const seen = fieldsSeenIn(collection, rows)
      if (seen.length) changes.push(`${name}:  fields its rows hold, new:  ${seen.join(", ")}.`)
      // each question it's asked for by, a field of its own:  `stacks are asked for by their owner-id`
      if (Object.keys(collection.fields).length)
        for (const param of Object.keys(collection.askedBy ?? {}))
          collection.fields[param] ??= { words: wordsFor(param), type: "text" }
      if (rows.length) read.push({ name, at: collection.at, rows, paging: "none", pagesRead: 1, hasMore: false })
      if (state.is !== was) {
        changes.push(`${name}:  ${was ?? "never tried"} => ${state.is}${state.reason ? ` -- ${state.reason}` : ""}.`)
      }
    }
    // ONE thing under each, or a list, read under its owner's first thing:
    // once its owner's list has rows (epic `data` P56)
    for (const [name, collection] of Object.entries(description.collections)) {
      if (!isUnderAnother(name, description) || collection.leftOut || collection.state?.is === "disabled") continue
      // a list of its own as well, read as one above:  JSONPlaceholder's comments
      if (!collection.isOneUnder && isListed(collection)) continue
      reader.startAgain()
      const was = collection.state?.is
      const state = await this.verifyOneUnder(address, name, description, read, reader, deployment?.name)
      if (!state) continue
      collection.state = state
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
    // the types its reads made, named apart from those beside it, as ingest's are;  its lists are the ones it had
    const others = await files.otherSpellBeside(file)
    const lists = new Set(Object.values(description.collections).map(({ at }) => withoutEndSlash(at)))
    awayFromTypesBeside(description, others, lists)
    // a field its reads made that Spell can't read is left out, as ingest's and update's are:  a server's `load_1min`
    this.compileLeavingOut(description, file)
    description.about.fingerprint = await fingerprintOf(description)
    description.spell = spellTextOf(spellPartsFor(description)).trimEnd().split("\n")
    const before = partsInLanguageOf(file, writtenOf(spellPartsFor(old), old.spell))
    const after = partsInLanguageOf(file, spellPartsFor(description))
    const text = (await files.read(file)) ?? ""
    const merge = mergedSpell(
      text,
      before,
      after,
      (words, own) => isUsed(words, text, others, own),
      old.spell,
      this.marksFor(file)
    )
    const warnings = this.checkFileCompiles(text, merge.text, file)
    const saved = await answers.save()
    if (saved) changes.push(saved)
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
   * - `pageSize`:  how many the place reads at a time, asked for of a list that takes a `limit`, as a read asks;
   *   else a list with no paging of its own answers whole, perhaps more than a reader takes
   * - NEVER throws for an answer, or none:  that's `failed`;  but `IngestStopped` past the reader's limits
   */
  private async verifyCollection(
    address: string,
    collection: CollectionDescription,
    reader: PoliteReader,
    deployment: string | undefined,
    pageSize?: number,
    { answers, fromDescription = false, answered }: VerifyAsking = {}
  ): Promise<{ state: PlaceState; rows: Array<Record<string, unknown>> }> {
    const tried = { at: this.nowISO(), ...(deployment !== undefined && { deployment }) }
    const failed = (reason: string, status?: number) => ({
      state: { is: "failed" as const, ...tried, ...(status !== undefined && { status }), reason },
      rows: []
    })
    // a search is asked something:  what its description says to search for, else a letter (epic `data` I140, J295);
    // a list asked for by a query, what its description's example says (epic `data` P56), or a real value it hasn't
    const { searchedOnly, searchedBy, searchedFor, askedBy = {} } = collection
    // each question beside the others, a search's first, a list of values as the question repeated;
    // a space as `%20`, as a server reads it in an address
    const searched = !!(searchedOnly && searchedBy)
    const urlAsking = (more: Record<string, string>) => {
      const asking = { ...askedBy, ...more }
      const asked: Array<[string, unknown]> = [
        ...(searchedOnly && searchedBy ? [[searchedBy.param, searchedFor ?? SEARCH_TRIED] as [string, unknown]] : []),
        ...Object.entries(asking),
        ...(collection.isOne ? [] : pageAsked(collection, pageSize, asking))
      ]
      const query = asked
        .flatMap(([param, value]) => [value].flat().map((each) => `${param}=${encodeURIComponent(`${each}`)}`))
        .join("&")
      return `${address}${collection.at}${query ? `${collection.at.includes("?") ? "&" : "?"}${query}` : ""}`
    }
    const url = urlAsking(answers ?? {})
    let answer: Awaited<ReturnType<PoliteReader["read"]>>
    try {
      answer = await reader.read(url, { mostBytes: collection.mostBytes })
    } catch (error) {
      if (error instanceof IngestStopped && !reader.hasRoom) throw error
      return failed(`it didn't answer:  ${messageOf(error).replaceAll(url, collection.at)}`)
    }
    // asked nothing, it says it needs a question, though its description says none is needed:  each it takes that
    // another list's things answer, asked with a real one, till one answers (a layer stack, by its owner)
    if (ASKS_A_QUESTION.has(answer.status) && !Object.keys(askedBy).length && collection.asksFrom && answered) {
      const hint = detailOf(answer.text)
      if (hint) this.say(`${collection.at} answered ${answer.status}${hint}`)
      const found = await this.askedAgain(collection, reader, urlAsking, answered)
      if (found) answer = found
    }
    if (answer.status >= 400) {
      // the server's own message is a hint, said as it runs and never kept:  it may name a real value
      const hint = detailOf(answer.text)
      if (hint) this.say(`${collection.at} answered ${answer.status}${hint}`)
      return failed(`it answered ${answer.status} at ${collection.at}`, answer.status)
    }
    if (answer.isCut) return failed("its answer is more than it reads at once:  too big to read whole", answer.status)
    const body = jsonOf(answer.text)
    // ONE thing, not a list:  its description says so;  or, saying nothing of its answer, it answers one object
    // (P10's untyped lists, till a read shows them):  `{ ok: true }`, or `{ nodes: [...], edges: [...] }`
    // and one its description says is one thing, answering a list, is a list after all
    if (collection.isOne && Array.isArray(body)) delete collection.isOne
    if (collection.isOne || isOneThingAnswered(collection, body)) {
      if (!isOneObject(body)) return failed("its answer isn't one thing", answer.status)
      if (!collection.isOne) {
        collection.isOne = true
        delete collection.takesLimit
        delete collection.pagesWith
      }
      // its keys its fields, when they're names:  not a map keyed by its values, an address or an id each
      if (!Object.keys(collection.fields).length && isKeyedByNames(body)) collection.fields = fieldsOf([body])
      return { state: { is: "verified", ...tried, status: answer.status, rows: 1 }, rows: [body] }
    }
    // no schema said where its rows are (NetBox's background queues):  a wrapped list says, as a look finds it;
    // a bare list is its rows, though its description wraps them:  a read takes either
    const found = rowsIn(body, collection.rowsAt)
    if (!found) {
      return failed(`its answer holds no list${collection.rowsAt ? ` in "${collection.rowsAt}"` : ""}`, answer.status)
    }
    if (collection.rowsAt === undefined && found.rowsAt !== undefined) collection.rowsAt = found.rowsAt
    const rows = found.rows.filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    const deprecated = deprecationOf(answer.headers)
    if (deprecated) collection.about = [collection.about, deprecated].filter(Boolean).join("  ")
    // no schema said its fields:  what it read does
    if (!Object.keys(collection.fields).length && rows.length && isKeyedByNames(rows)) {
      collection.fields = fieldsOf(rows)
      const id = idFieldOf(rows, collection.fields)
      if (id !== undefined) collection.idField = id
    }
    const missing = Object.entries(collection.fields)
      .filter(([field, { isRequired }]) => isRequired && rows.length && rows.every((row) => !(field in row)))
      .map(([field]) => field)
    if (missing.length)
      return failed(`its rows don't hold ${missing.join(", ")}, which its description says each has`, answer.status)
    // a search's answers are found elsewhere by id, if at all:  nothing says where
    const byId = searched ? undefined : await this.thingById(address, collection, rows, reader, fromDescription)
    if (byId && byId !== NO_READ_BY_ID) return failed(byId)
    return {
      state: {
        is: "verified",
        ...tried,
        status: answer.status,
        rows: rows.length,
        ...(byId === NO_READ_BY_ID && { reason: NO_READ_BY_ID })
      },
      rows
    }
  }

  /**
   * `collection` asked again with each question another list's things answer (`asksFrom`), a real value each:  the
   * first answer that isn't a refusal;  `undefined` for none.
   * - SIDE EFFECT:  that question is the list's from now on, `askedBy`, its value kept nowhere:
   *   `stacks are asked for by their owner-id`.
   */
  private async askedAgain(
    collection: CollectionDescription,
    reader: PoliteReader,
    urlAsking: (answers: Record<string, string>) => string,
    answered: (params: string[]) => Record<string, string> | undefined
  ): Promise<Awaited<ReturnType<PoliteReader["read"]>> | undefined> {
    for (const param of Object.keys(collection.asksFrom ?? {})) {
      const answers = answered([param])
      if (!answers) continue
      try {
        const answer = await reader.read(urlAsking(answers), { mostBytes: collection.mostBytes })
        if (answer.status >= 400) continue
        collection.askedBy = { [param]: "" }
        return answer
      } catch (error) {
        if (error instanceof IngestStopped && !reader.hasRoom) throw error
      }
    }
    return undefined
  }

  /**
   * One thing under each of another collection's things, `name`, tried under the first one `read` found:
   * a system's snapshot, at `/instances/7/snapshot`;
   * or a list there, a job's steps, at `/jobs/6f1c/steps` (epic `data` P56).
   * - `undefined` when no owner's list read a thing to try it under:  it stays as it was.
   * - NEVER throws for an answer, or none:  that's `failed`;  but `IngestStopped` past the reader's limits
   */
  private async verifyOneUnder(
    address: string,
    name: string,
    { collections }: PlaceDescription,
    read: readonly CollectionLook[],
    reader: PoliteReader,
    deployment: string | undefined
  ): Promise<PlaceState | undefined> {
    const owned = Object.entries(collections).find(([, owner]) => owner.listsUnder?.[name] !== undefined)
    if (!owned) return undefined
    const [ownerName, owner] = owned
    const id = read.find((each) => each.name === ownerName)?.rows[0]?.[owner.idField ?? "id"]
    if (typeof id !== "string" && typeof id !== "number") return undefined
    const tried = { at: this.nowISO(), ...(deployment !== undefined && { deployment }) }
    // its route, never the owner's id nor its address:  a description holds no real value
    const route = owner.listsUnder![name]!
    const under = `at ${route}`
    const failed = (reason: string, status?: number): PlaceState => ({
      is: "failed",
      ...tried,
      ...(status !== undefined && { status }),
      reason
    })
    const url = `${address}${route.replace("{id}", encodeURIComponent(`${id}`))}`
    let answer: Awaited<ReturnType<PoliteReader["read"]>>
    try {
      answer = await reader.read(url)
    } catch (error) {
      if (error instanceof IngestStopped && !reader.hasRoom) throw error
      return failed(`it didn't answer ${under}:  ${messageOf(error).replaceAll(url, route)}`)
    }
    if (answer.status >= 400) return failed(`it answered ${answer.status} ${under}`, answer.status)
    const body = jsonOf(answer.text)
    const { isOneUnder, rowsAt } = collections[name]!
    if (!isOneUnder) {
      const found = rowsIn(body, rowsAt ?? "")
      if (!found) return failed(`its answer ${under} holds no list`, answer.status)
      return { is: "verified", ...tried, status: answer.status, rows: found.rows.length }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return failed(`its answer ${under} isn't one thing`, answer.status)
    }
    return { is: "verified", ...tried, status: answer.status, rows: 1 }
  }

  /**
   * Its first thing read by its id:  why that failed;  `NO_READ_BY_ID` when there's nowhere to;  `undefined` when it read.
   * - Where its description says (`oneAt`), by the field its brace names:  `/types/{type_id}` by its `type_id`, else
   *   its id.  From a description offering none (`fromDescription`):  nowhere.
   * - A place looked at with no description:  its list's address and its id, or where one's changed or deleted.
   * - Why names its route, `/jobs/{id}`, and its status, never the id nor its address:  a description holds no real
   *   value
   * - SIDE EFFECT:  read by a field that isn't its id, and every row read has its own:  that's its id from now on, so
   *   the place reads one where its server does (`a type's id is its "type_id"`).
   */
  private async thingById(
    address: string,
    collection: CollectionDescription,
    rows: ReadonlyArray<Record<string, unknown>>,
    reader: PoliteReader,
    fromDescription: boolean
  ): Promise<string | undefined> {
    const { at, idField = "id", operations, oneAt } = collection
    if (oneAt === undefined && fromDescription) return NO_READ_BY_ID
    const brace = oneAt === undefined ? undefined : /\{([^{}/]+)\}/.exec(oneAt)?.[1]
    const by = brace !== undefined && rows[0] && brace in rows[0] ? brace : idField
    const id = rows[0]?.[by]
    if (typeof id !== "string" && typeof id !== "number") return undefined
    const template =
      oneAt ??
      operations?.change?.at ??
      operations?.delete?.at ??
      `${at.replace(/\/+$/, "")}/{id}${at.endsWith("/") ? "/" : ""}`
    // an id that's its own address (NetBox's background queues' `url`) is read where it says
    const url = IS_ITS_OWN_ADDRESS.test(`${id}`)
      ? `${id}`
      : `${address}${template.replace(/\{[^{}/]*\}/, encodeURIComponent(`${id}`))}`
    const route = IS_ITS_OWN_ADDRESS.test(`${id}`) ? "the address its id is" : template
    try {
      const { status } = await reader.read(url)
      if (status >= 400) return `its first thing, read by its id at ${route}, answered ${status}`
    } catch (error) {
      if (error instanceof IngestStopped && !reader.hasRoom) throw error
      return `its first thing, read by its id at ${route}, didn't answer`
    }
    if (by !== idField && isUniqueIn(rows, by)) collection.idField = by
    return undefined
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
    return { name: picked, ...SP.SpellProject.deploymentAsRun(picked, deployment) }
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
   * The saved answers of a verify (`SavedAnswers`):  the `fetch` its reads go through, and what saves them.
   * - `savesAnswers`:  each list and thing it reads, kept by its address under `address`, then written scrubbed,
   *   the biggest answer an address had (a page of every row, not of one).
   * - An `offline` deployment:  what's offline is read from its folder, its server never asked.
   * - throws `IngestStopped` for saved answers asked for with no folder, or nothing to write them with
   */
  private savedAnswersFor(
    file: string,
    address: string,
    deployment: (Deployment & { name: string }) | undefined,
    savesAnswers: string | true | undefined
  ): { fetch: typeof globalThis.fetch; save: () => Promise<string | undefined> } {
    const { fetch, files } = this.settings
    const named = savesAnswers === true ? deployment?.fixtures : savesAnswers
    if (savesAnswers === true && named === undefined) {
      throw new IngestStopped(
        `--fixtures names no folder, and ${deployment ? `the ${deployment.name} deployment` : "the place"} has no "fixtures":  name one, --fixtures <folder>`
      )
    }
    const folder = named === undefined ? undefined : folderBeside(file, named)
    if (folder !== undefined && !files.writeAway) throw new IngestStopped("nothing here can write saved answers")
    const offline = deployment?.offline
    const readsFrom =
      offline && deployment?.fixtures !== undefined ? folderBeside(file, deployment.fixtures) : undefined
    if (offline && readsFrom === undefined) {
      throw new IngestStopped(`the ${deployment!.name} deployment is offline, and names no "fixtures" folder to read`)
    }
    const base = address.replace(/\/+$/, "")
    const kept = new Map<string, string>()
    const secrets = new Set<string>()
    const under = (url: string) =>
      url.startsWith(`${base}/`) || url === base ? url.slice(base.length) || "/" : undefined
    const fetchThrough: typeof globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : `${input instanceof URL ? input.href : input}`
      const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase()
      const path = under(url)
      if (path === undefined || method !== "GET") return fetch(input, init)
      if (readsFrom !== undefined && isOffline(path, offline)) {
        const name = savedAnswerPath(path)
        const text = name === undefined ? undefined : await files.read(`${readsFrom}/${name}`)
        if (text === undefined) return new Response(`no saved answer for ${path}`, { status: 404 })
        const answer = answerFromSaved(text, new URL(path, "http://saved.answer").searchParams)
        return new Response(answer, { headers: { "content-type": "application/json", [SAVED_ANSWER_HEADER]: "saved" } })
      }
      const answer = await fetch(input, init)
      if (folder !== undefined && answer.ok && /json/i.test(answer.headers.get("content-type") ?? "")) {
        const name = savedAnswerPath(path)
        const text = await answer.clone().text()
        if (name !== undefined && text.length > (kept.get(name)?.length ?? -1)) kept.set(name, text)
        for (const [header, value] of new Headers(init?.headers)) {
          if (header === "accept" || header === "content-type" || header === "x-request-id") continue
          secrets.add(value.replace(/^(Bearer|Basic)\s+/i, ""))
        }
        for (const value of new URL(url).searchParams.values()) if (value.length >= 20) secrets.add(value)
      }
      return answer
    }
    const save = async () => {
      if (folder === undefined || !kept.size) return undefined
      const scrub = answerScrubber(secrets)
      for (const [name, text] of kept) {
        let value: unknown
        try {
          value = JSON.parse(text)
        } catch {
          continue
        }
        await files.writeAway!(`${folder}/${name}`, `${JSON.stringify(scrub.value(value), null, 2)}\n`)
      }
      return `Saved ${kept.size} answer${kept.size === 1 ? "" : "s"}, scrubbed, in ${folder}.`
    }
    return { fetch: fetchThrough, save }
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
    tokenFrom?: string,
    fetch = this.settings.fetch
  ): Promise<PoliteReader> {
    const { sleep, keyNamed, sessionNamed, Socket } = this.settings
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
    // what Spell couldn't read last time may read now:  its words said as Spell reads them, and every line tried again
    wordsSpellReads(description)
    triedAgain(description)
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

/**
 * A search `spell place verify` can try:  one only a search answers, with its question known (epic `data` I140).
 * - Its address has no braces, and it's asked nothing else.
 */
function isSearchToTry({ at, searchedOnly, searchedBy, askedBy, samples }: CollectionDescription): boolean {
  return !!searchedOnly && !!searchedBy && !/\{[^{}/]*\}/.test(at) && !askedBy && !samples
}

/** What verify says of a list its description offers no read by id for:  verified all the same. */
const NO_READ_BY_ID = "no read by id:  its description has no route for one"

/** What verify says of a list it can't ask:  a question its description gives no value for, nor another list. */
const NEEDS_A_QUESTION = "needs a question:  "

/** A list's refusal that says it needs a question:  a bad request, or one it couldn't read. */
const ASKS_A_QUESTION: ReadonlySet<number> = new Set([400, 422])

/** How verify asks one list a question its description gives no value for:  see `PlaceIngest.verifyCollection()`. */
type VerifyAsking = {
  /** A real value for each, from another list's first thing:  in the address only, kept nowhere. */
  answers?: Record<string, string>
  /** It's read from an OpenAPI description, which says where one thing's read by its id, or that it can't be. */
  fromDescription?: boolean
  /** Real values for these questions, from the lists each is asked from (`asksFrom`):  `undefined` for none. */
  answered?: (params: string[]) => Record<string, string> | undefined
}

/**
 * A real value for each of `params`, from the first thing the list it's asked from read (`asksFrom`):  its field of
 * that name, else its id;  `undefined` when one has none.
 * - In a question's address only:  never kept, in the description or the Spell.
 */
function answersFrom(
  params: readonly string[],
  { asksFrom = {} }: CollectionDescription,
  description: PlaceDescription,
  read: readonly CollectionLook[]
): Record<string, string> | undefined {
  const answers: Record<string, string> = {}
  for (const param of params) {
    const at = asksFrom[param]
    const row = at === undefined ? undefined : read.find((each) => each.at === at)?.rows[0]
    if (!row) return undefined
    const idField = Object.values(description.collections).find((each) => each.at === at)?.idField
    const value = row[param] ?? (idField === undefined ? undefined : row[idField])
    if (typeof value !== "string" && typeof value !== "number") return undefined
    answers[param] = `${value}`
  }
  return answers
}

/**
 * Can a collection be read as a list:  not one found by name, nor only by a search?
 * - One asked for by a query is, with what its description gave to ask (epic `data` P56);  not with nothing to ask.
 */
function isListed({ at, searchedOnly, askedBy, samples }: CollectionDescription): boolean {
  const canAsk = !askedBy || Object.values(askedBy).every((value) => value !== "")
  return !/\{[^{}/]*\}/.test(at) && !searchedOnly && canAsk && !samples
}

/** The most fields one thing read is given from its keys:  more, it's a map keyed by its values. */
const MOST_KEYS_AS_FIELDS = 60

/** A key that's a field's name:  `rack_id`, `feedStatus`;  not `10.0.0.5`, `7`, `r-12`. */
const KEY_AS_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * Are `body`'s keys its fields' names, not values it's keyed by (a map from each address to its rack)?
 * And so every object's inside it, each of which is a thing of its own:  `{ racks: [...], mapping: { "10.0.0.5": ... } }`.
 * - So no real value becomes a field's name, in the description or the Spell.
 */
function isKeyedByNames(body: unknown, depth = 0): boolean {
  if (Array.isArray(body)) return body.slice(0, 5).every((each) => isKeyedByNames(each, depth))
  if (!isOneObject(body)) return true
  if (depth > 6) return false
  const keys = Object.keys(body)
  if (keys.length > MOST_KEYS_AS_FIELDS || !keys.every((key) => KEY_AS_NAME.test(key))) return false
  return Object.values(body).every((value) => isKeyedByNames(value, depth + 1))
}

/** Is `body` one object:  not a list, nor nothing? */
function isOneObject(body: unknown): body is Record<string, unknown> {
  return !!body && typeof body === "object" && !Array.isArray(body)
}

/**
 * Is `body`, a list's answer, ONE thing:  its description said nothing of its rows (no field, nor where they are),
 * and it's one object holding no list, or several:  `{ ok: true }`, `{ nodes: [...], edges: [...] }`?
 * - One holding a single list is that list, wrapped:  `{ sources: [...], next_offset: 20 }`.
 */
function isOneThingAnswered({ fields, rowsAt }: CollectionDescription, body: unknown): boolean {
  if (Object.keys(fields).length || rowsAt !== undefined || !isOneObject(body)) return false
  return Object.values(body).filter(Array.isArray).length !== 1
}

/** Is collection `name` kept under each thing of another, one thing or a list:  read only from there? */
function isUnderAnother(name: string, { collections }: PlaceDescription): boolean {
  return Object.values(collections).some(({ listsUnder }) => listsUnder?.[name] !== undefined)
}

/** What an error answer says, short:  NetBox's `{ "detail": "..." }`. */
function detailOf(text: string): string {
  const body = jsonOf(text) as { detail?: unknown; error?: unknown; message?: unknown } | undefined
  // FastAPI's refusal of what it was asked:  `{ "detail": [{ "loc": ["query", "q"], "msg": "Field required" }] }`
  const firstMessage = Array.isArray(body?.detail) ? (body.detail[0] as { msg?: unknown } | undefined)?.msg : undefined
  const said = firstMessage ?? body?.detail ?? body?.error ?? body?.message
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

/**
 * The page a verify asks a list for, as a read would:  `pageSize` under its limit's name, up to the most it gives;
 * nothing for a list that takes no limit, or is asked for one already.
 */
function pageAsked(
  { takesLimit, pagesWith }: CollectionDescription,
  pageSize: number | undefined,
  askedBy: Record<string, unknown>
): Array<[string, unknown]> {
  const limit = pagesWith?.limit ?? (takesLimit ? "limit" : undefined)
  if (limit === undefined || pageSize === undefined || limit in askedBy) return []
  return [[limit, Math.min(pageSize, pagesWith?.most ?? pageSize)]]
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

/**
 * `folder` as a path:  under the folder `file` is in, unless it starts `/`, or `~` (your home, which what reads and
 * writes it says).
 */
function folderBeside(file: string, folder: string): string {
  const clean = folder.replace(/\/+$/, "")
  if (clean.startsWith("/") || clean === "~" || clean.startsWith("~/")) return clean
  const at = file.lastIndexOf("/")
  return at < 0 ? clean : `${file.slice(0, at)}/${clean.replace(/^\.\//, "")}`
}

/** What an error says, without where:  lines move when a place is added. */
function withoutPlaceInFile(error: string): string {
  return error.replace(/^\d+:\d+ /, "")
}

/** Why `leaveOutLine()` leaves a line out. */
const COULDNT_READ = "Spell couldn't read its line:  "

/**
 * SIDE EFFECT:  every line Spell couldn't read last time is written again, to be tried:  a field, a collection, an
 * action, a line by its key, and the notes saying so.
 */
function triedAgain(description: PlaceDescription): void {
  const again = (fields: Record<string, FieldDescription>) => {
    for (const field of Object.values(fields)) {
      if (field.leftOut?.startsWith(COULDNT_READ)) delete field.leftOut
      if (field.inside) again(field.inside)
    }
  }
  for (const collection of Object.values(description.collections)) {
    if (collection.leftOut?.startsWith(COULDNT_READ)) delete collection.leftOut
    again(collection.fields)
    for (const action of Object.values(collection.operations ?? {}))
      if (action.state?.is === "disabled" && action.state.reason?.startsWith(COULDNT_READ))
        action.state = { is: "unverified" }
  }
  delete description.linesLeftOut
  description.notes = description.notes.filter((note) => !note.includes(COULDNT_READ))
}

/**
 * SIDE EFFECT:  the Spell leaves out the line `line` is, with why:  `false` if it's no line it can leave out.
 * - A field's line, its field;  a collection's `lives at` or its type's header, the collection.
 * - A type inside a row:  a line under it, its field;  its header, every field holding it, never their collection
 *   (epic `data` I106).
 */
function leaveOutLine(description: PlaceDescription, line: WrittenLine, why: string): boolean {
  const reason = `${COULDNT_READ}${line.text.trim()} -- ${why}`
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
      if (kind === "field" && goesByItsOwnName(field, about, held.fields)) {
        description.notes.push(`${collection}'s "${field}" goes by its own name:  ${reason}`)
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
  if (type && line.text === type.header) {
    if (type.isInside) return leaveOutHolders(description, type, reason)
    return leaveOutCollection(description, type.collection, reason)
  }
  return key ? leaveOutKeyed(description, key, reason) : false
}

/**
 * SIDE EFFECT:  a field whose words Spell couldn't read goes by the source's own name instead, kept, never left out
 * for that:  a server's `load_1min`, said `load 1min`, which Spell reads as a number run into a word, is
 * `its "load_1min" is a number`.
 * - `false` when it already does, or another field of its type has those words:  then it's left out, saying why.
 */
function goesByItsOwnName(
  name: string,
  about: FieldDescription,
  fields: Readonly<Record<string, FieldDescription>>
): boolean {
  if (about.words === name || Object.values(fields).some((other) => other !== about && other.words === name))
    return false
  about.words = name
  return true
}

/**
 * SIDE EFFECT:  the Spell leaves out one line, by its key, whatever it says:  so one line Spell can't read never stops
 * a whole place (`measurements are asked for by their ...`, before Spell read a list of values).
 * - `false` if it's left out already.
 */
function leaveOutKeyed(description: PlaceDescription, key: string, reason: string): boolean {
  const leftOut = (description.linesLeftOut ??= {})
  if (key in leftOut) return false
  leftOut[key] = reason
  description.notes.push(`Left out a line:  ${reason}`)
  return true
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
  if (goesByItsOwnName(name!, about, insideFields!)) {
    description.notes.push(`${typeWords}'s "${name}" goes by its own name:  ${reason}`)
    return true
  }
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
 * - Every type it writes:  each list's own, and each type inside a row, whoever made it (a look, the agent, a verify's
 *   read):  a lab's verify reading its designs' `inspection` beside a shop's `inspection` writes a `lab inspection`.
 * - The one step ingest, `spell place update` and `spell place verify` each run, last, once the types are named.
 * - `listsKept`:  the addresses of lists already written, whose own types stay as they are (a person's, or ones
 *   that clash already, a person's to settle):  only a new list's is named apart.
 */
function awayFromTypesBeside(
  description: PlaceDescription,
  others: readonly string[],
  listsKept: ReadonlySet<string> = new Set()
): void {
  // each type declared beside it, by the place whose file declares it:  a file of a person's own, by none
  const declared = new Map(
    others.flatMap((text) => {
      const place = placesIn(text)[0]?.name
      return [...text.matchAll(DECLARED_TYPE)].map(([, quoted, plain]) => [(quoted ?? plain)!.toLowerCase(), place])
    })
  )
  const { name } = description.about
  // the other half:  the one already there keeps the bare name till a person renames it, which every update keeps
  const noteApart = (words: string, type: string) => {
    const other = declared.get(words)
    if (other === undefined || words.startsWith(`${other.toLowerCase()} `)) return
    const note = `"${words}" is ${other}'s too, so this one is a "${type}":  to tell them apart both ways, rename ${other}'s in its own file, a "${other} ${words}" (spell place update keeps a name you give).`
    if (!description.notes.includes(note)) description.notes.push(note)
  }
  let isRenamed = false
  for (const collection of Object.values(description.collections)) {
    const words = collection.type.toLowerCase()
    if (collection.leftOut || listsKept.has(withoutEndSlash(collection.at)) || !declared.has(words)) continue
    collection.type = `${name} ${collection.type}`
    isRenamed = true
    noteApart(words, collection.type)
  }
  if (isRenamed) renameCollections(description)
  // each type inside a row, by the name the writer gives it:  one renamed may free a name inside it, so again
  for (let isInsideRenamed = true; isInsideRenamed;) {
    isInsideRenamed = false
    for (const { header, isInside, heldBy = [] } of spellPartsFor(description).types) {
      const words = /"([^"]+)"/.exec(header)?.[1]?.toLowerCase()
      if (!isInside || words === undefined || !declared.has(words) || !heldBy.length) continue
      const type = `${name} ${words}`
      // a name the writer can't take (too many words) stays:  nothing to name it, and the merge's check says so
      if (heldBy.every(({ field }) => field.insideType === type)) continue
      for (const { field } of heldBy) field.insideType = type
      isInsideRenamed = true
      noteApart(words, type)
    }
  }
}

/**
 * SIDE EFFECT:  a list whose rows are another place's is left out, saying which place has them (`others`):
 * a server's copy of another's, `/api/v1/proxy/jobs` beside the other place's `/api/jobs`.
 * - The same list:  one with no fields of its own (its description says nothing of its rows), whose address ends in
 *   the same word as one of another place's, which has fields.
 * - A list with fields of its own, of the same name, is its own:  named apart (`awayFromTypesBeside()`).
 */
function leaveOutCopies(description: PlaceDescription, others: readonly PlaceDescription[]): void {
  const lastWord = (at: string) =>
    at
      .replace(/[?#].*$/, "")
      .replace(/\/+$/, "")
      .split("/")
      .pop()!
      .toLowerCase()
  const theirs = new Map(
    others.flatMap(({ about, collections }) =>
      Object.entries(collections)
        .filter(([, each]) => !each.leftOut && !/\{/.test(each.at) && Object.keys(each.fields).length > 0)
        .map(([list, { at }]) => [lastWord(at), { place: about.name, list }] as const)
    )
  )
  for (const [name, collection] of Object.entries(description.collections)) {
    if (collection.leftOut || Object.keys(collection.fields).length || /\{/.test(collection.at)) continue
    const copied = theirs.get(lastWord(collection.at))
    if (!copied) continue
    leaveOutCollection(
      description,
      name,
      `its rows are ${copied.place}'s ${copied.list.replace(/_/g, " ")}, read there:  this is a copy of them`
    )
  }
}

/**
 * SIDE EFFECT:  a type a person renamed in the place's file goes by their name in `description` too, so a later look
 * changes its lines as it does any other's, and never puts the old name back:
 * `devices live at "/api/devices"`, made `instruments live at "/api/devices"`, and `a "device" is a thing`, made
 * `an "instrument" is a thing`, is an `instrument` from then on.
 * - Found by the collection's address line, in the file's language:  the only line that says which collection it is.
 * - The lines it last wrote (`spell`) say the new name too, so the merge sees them as its own, unchanged.
 */
function namesFromFile(description: PlaceDescription, file: string, text: string): void {
  const typesInFile = Object.keys(PlaceWords.of(text).types)
  const fileLines = new Set(text.split("\n").map((line) => line.trim()))
  const atLineOf = (collection: string) =>
    partsInLanguageOf(file, spellPartsFor(description)).placeLines.find(({ key }) => key === `at:${collection}`)?.text
  const written = new Map<string, string>()
  const linesBefore = spellLinesOf(partsInLanguageOf(file, spellPartsFor(description)))
  for (const [name, collection] of Object.entries(description.collections)) {
    const atLine = atLineOf(name)
    if (collection.leftOut || !atLine || fileLines.has(atLine)) continue
    const taken = new Set(Object.values(description.collections).map(({ type }) => type))
    const was = collection.type
    const named = typesInFile.find((type) => {
      if (taken.has(type)) return false
      collection.type = type
      return fileLines.has(atLineOf(name) ?? "")
    })
    collection.type = named ?? was
  }
  const linesAfter = spellLinesOf(partsInLanguageOf(file, spellPartsFor(description)))
  if (linesBefore.length !== linesAfter.length) return
  linesBefore.forEach(({ text: before }, at) => {
    const after = linesAfter[at]!.text
    if (after !== before) written.set(before.trim(), after.trim())
  })
  if (written.size)
    description.spell = description.spell?.map((line) =>
      line.replace(line.trim(), written.get(line.trim()) ?? line.trim())
    )
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
    // no schema says its fields, and none were read now:  those its rows showed before stay (`fieldsSeenIn()`)
    if (!Object.keys(collection.fields).length && collection.schemaAt === undefined)
      collection.fields = structuredClone(oldCollection.fields)
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

/**
 * SIDE EFFECT:  what it was asked to say of the place stays, on `description`'s `about`:  read only, rows at a time,
 * how often it's checked (`--read-only`, `--rows`, `--check-every`).  Each later update carries them over.
 */
function keepAsked(
  description: PlaceDescription,
  { readOnly, rows, checkEvery }: Pick<PlaceDescription["about"], "readOnly" | "rows" | "checkEvery">
): void {
  Object.assign(description.about, withDefined({ readOnly, rows, checkEvery }))
}

/** SIDE EFFECT:  `description` says which session it was read as, by name, never its values. */
function noteSignedIn(description: PlaceDescription, signedIn: string | undefined): void {
  if (signedIn) description.about.signedIn = signedIn
}
