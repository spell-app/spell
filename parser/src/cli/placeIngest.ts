/**
 * `spell place ingest` and `spell place update`:  the terminal's and the disk's half of looking at a data source (epic `data` P18).
 * - The steps are spell's `PlaceIngest`, which knows nothing of either:  here, only what it's handed, and what's printed.
 * - It asks at a terminal, and with none, it stops:  `askAtTerminal()`.
 * - Node only;  loaded when the command runs, as it loads all of spell.
 * - The read through the Spell runs `core` here, by itself, in this process:  `readThroughSpell()`.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import JSON5 from "json5"

import { json5Edited } from "spell/util/node/json5"
import { peekProp, schemaOf, whileOnlyShowing } from "spell/util/reactive"
import { CLI } from "spell/cli"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import {
  IngestStopped,
  type AskSomeone,
  type IngestFiles,
  type IngestResult,
  type PlaceDescription,
  type PlaceDescriptionOnDisk,
  type ReadOfType,
  type ReadThrough
} from "spell/parser/spell/ingest/ingest.types"

import { claudeRunnerFor } from "./claudeRunners"

/** What a read through the Spell asks for of each type:  a page, not the whole of it. */
const READ_ROWS = 5

/** What's at the top of a description, the first time it's written. */
const DESCRIPTION_HEAD = `// What \`spell place ingest\` found.  \`spell place update\` looks again, and changes what it wrote.
// A key of your own here, and a comment, stays;  so do the words a field or a collection goes by.
// What every collection has the same is in \`allCollections\`;  a collection's own setting wins.
`

/** The project's file:  see \`SP.PROJECT_FILE\`. */
const PROJECT_FILE = "__project.json5"

/** `spell place ingest`'s flags. */
export type PlaceIngestOptions = {
  kind?: string
  into?: string
  name?: string
  keySecret?: string
  signedIn?: string
  docs?: string
  collections?: string
  samples?: string
  pictures?: string
  tryWrites?: boolean
  ai?: boolean
}

/**
 * Run the command:  its exit code.
 * - `EXIT.ERRORS` when something needs a person:  it couldn't change a line for them.
 * - throws `CliError` for whatever stopped it, having written nothing
 */
export async function placeIngest(address: string, options: PlaceIngestOptions): Promise<number> {
  const { kind, into, name, keySecret, signedIn, docs, collections, samples, pictures, tryWrites, ai = true } = options
  return stoppedAsCliError(async () => {
    const ingest = await ingestFor(ai, !!signedIn)
    const result = await ingest.add({
      address,
      ...withValues({ kind, into, name, keySecret, signedIn, docs }),
      ...(collections && { collections: collectionsIn(collections) }),
      ...(samples && { samples: samples.split(",").map((each) => each.trim()) }),
      ...(pictures && { pictures: pictures.split(",").map((each) => each.trim()) }),
      ...(tryWrites && { triesWrites: true })
    })
    printAdded(result)
    return CLI.EXIT.OK
  })
}

/**
 * `spell place update <file>`:  look again at the place described beside it.  Its exit code.
 * - `EXIT.ERRORS` when it couldn't change a line for someone.
 * - throws `CliError` for whatever stopped it, having written nothing
 */
export async function placeUpdate(file: string, { ai = true }: { ai?: boolean }): Promise<number> {
  return stoppedAsCliError(async () => {
    const ingest = await ingestFor(ai, describesSession(file))
    const result = await ingest.update(file)
    printUpdate(result)
    return result.couldntChange.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
  })
}

/**
 * The steps, with the terminal and the disk:  asking an agent unless `ai` is off.
 * - `usesSession`:  loads the kept sessions, only then (the server's places are a lot to load).
 */
async function ingestFor(ai: boolean, usesSession: boolean): Promise<PlaceIngest> {
  const chosen = ai ? claudeRunnerFor(process.env, { ai }) : undefined
  const sessions = usesSession ? new (await import("spell/server/places")).PlaceSessions() : undefined
  return new PlaceIngest({
    fetch: fetchWithFiles(globalThis.fetch),
    ask: askAtTerminal,
    files: diskFiles,
    readThrough: readThroughSpell,
    keyNamed: (secret) => process.env[secret],
    ...(sessions && { sessionNamed: (place: string) => sessions.named(place) }),
    say: (line) => CLI.err(line),
    ...(chosen && { claude: chosen.run, claudeVia: chosen.via })
  })
}

/** Does the description beside `file` say it's read signed in?  So only then are the sessions loaded. */
function describesSession(file: string): boolean {
  const description = file.replace(/\.(?:spell|spellml)$/, ".json5")
  return existsSync(description) && /["']?signedIn["']?\s*:/.test(readFileSync(description, "utf8"))
}

/** `run`'s exit code, its `IngestStopped` a `CliError`.  - throws `CliError`, and whatever else `run` throws */
async function stoppedAsCliError(run: () => Promise<number>): Promise<number> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof IngestStopped) throw new CLI.CliError(error.message)
    throw error
  }
}

/** A piece of `--collections` that starts one of its own:  a path, or a name and a path. */
const NEW_COLLECTION = /^(?:[^=&?/]*=)?\//

/**
 * `--collections`, one entry each (epic `data` P33):
 * split at its commas, but a comma in a query's value stays in it,
 * as Open-Meteo's `forecasts=/v1/forecast?hourly=temperature_2m,precipitation` asks for both.
 * - After one with a query, a piece is a new one only when it's a path or a name and a path, `/x`, `x=/x`:
 *   else it's part of that query, `precipitation`, `wind_speed_10m&forecast_days=2`.
 */
export function collectionsIn(given: string): string[] {
  const entries: string[] = []
  for (const piece of given.split(",").map((each) => each.trim())) {
    const last = entries.at(-1)
    if (last?.includes("?") && !NEW_COLLECTION.test(piece)) entries[entries.length - 1] = `${last},${piece}`
    else entries.push(piece)
  }
  return entries
}

/** `values` without what's undefined. */
function withValues<Values extends Record<string, string | undefined>>(values: Values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value)) as {
    [Key in keyof Values]?: string
  }
}

////////////////
// ## What it's handed
////////////////

/** Asks at a terminal:  with none, there's no one to ask. */
export const askAtTerminal: AskSomeone = async ({ text, choices }) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return undefined
  if (choices)
    return CLI.choose(
      text,
      choices.map((choice) => ({ value: choice, label: choice }))
    )
  return (await CLI.ask(text)) || undefined
}

/** A `fetch` that also reads a local file, by its path or its `file:` address, as a CSV is often just there. */
export function fetchWithFiles(fetch: typeof globalThis.fetch): typeof globalThis.fetch {
  return async (input, init) => {
    const address = input instanceof Request ? input.url : `${input instanceof URL ? input.href : input}`
    if (/^https?:/i.test(address)) return fetch(input, init)
    const path = address.startsWith("file:") ? fileURLToPath(address) : address
    if (!existsSync(path)) return new Response(`no such file:  ${path}`, { status: 404 })
    const type = /\.csv$/i.test(path) ? "text/csv" : "text/plain"
    return new Response(readFileSync(path), { headers: { "content-type": type } })
  }
}

/** Its files, on disk. */
export const diskFiles: IngestFiles = {
  read: async (path) => (existsSync(path) ? readFileSync(path, "utf8") : undefined),
  write: async (path, text) => writeFileSync(path, text),
  readDescription: async (path) =>
    existsSync(path) ? (JSON5.parse(readFileSync(path, "utf8")) as PlaceDescriptionOnDisk) : undefined,
  writeDescription: async (path, description) => {
    const text = existsSync(path)
      ? json5Edited(readFileSync(path, "utf8"), description)
      : `${DESCRIPTION_HEAD}${JSON.stringify(description, null, 2)}\n`
    writeFileSync(path, text)
  },
  listInProject: async (file, path) => {
    const projectFile = join(dirname(file), PROJECT_FILE)
    if (!existsSync(projectFile)) return
    const text = readFileSync(projectFile, "utf8")
    const project = JSON5.parse(text) as { development?: { apis?: string[] } }
    const named = basename(path)
    const apis = project.development?.apis ?? []
    if (apis.some((each) => basename(each) === named)) return
    project.development = { ...project.development, apis: [...apis, named] }
    writeFileSync(projectFile, json5Edited(text, project))
  },
  otherSpellBeside: async (path) =>
    filesBeside(path)
      .filter((name) => name.endsWith(".spell") && name !== basename(path))
      .map((name) => readFileSync(join(dirname(path), name), "utf8"))
}

/** The files in `path`'s folder. */
function filesBeside(path: string): string[] {
  const folder = dirname(path)
  return existsSync(folder) ? readdirSync(folder) : []
}

/**
 * Compile the Spell and really read each type through it, on `core`:  the same place, the same row reading, as a page has.
 * - Each read asks for a page, not every row;  one that answers only a search searches, as a program has to.
 * - For as long as it runs, `fetch` is the one it's handed, so it can't write, and it stops at a size;
 *   and a relative address means here, as no page says where it is.
 * - What the program complains of on the console is collected:  `Expected weird to be type 'number', got: 30-165`.
 * - So is a declared field no row filled:  the line that names it may be wrong.
 * - Every field is asked for:  what a type's `select` leaves out is what the program reads, and this one reads none.
 * - NEVER throws for a read that fails:  see `ReadThrough`.
 */
export const readThroughSpell: ReadThrough = async ({
  spell,
  types,
  byName = {},
  bySearch = {},
  byQuery = {},
  fetch
}) => {
  const { core } = await import("spell/parser/core")
  const { runSpellFiles } = await import("spell/parser/spell/test/runSpell")
  const held = {
    fetch: globalThis.fetch,
    location: (globalThis as { location?: unknown }).location,
    warn: console.warn,
    error: console.error
  }
  const complaints: string[] = []
  const complain = (...said: unknown[]) => void complaints.push(said.map(String).join(" "))
  globalThis.fetch = fetch
  Object.assign(globalThis, { location: { href: pathToFileURL(`${process.cwd()}/`).href } })
  console.warn = complain
  console.error = complain
  try {
    const byType: Record<string, ReadOfType> = {}
    const problem = (error: unknown) => ({ rows: 0, problem: error instanceof Error ? error.message : String(error) })
    let classes: Record<string, unknown>
    try {
      core.resetRuntime()
      classes = runSpellFiles([{ path: "/Ingest.spell", contents: spell }])(Object.values(types).join(", "))
    } catch (error) {
      return { byType: Object.fromEntries(Object.keys(types).map((words) => [words, problem(error)])), complaints }
    }
    for (const [words, name] of Object.entries(types)) {
      try {
        const Class = classes[name] as (new () => unknown) & { savedIn: { select?: unknown } }
        delete Class.savedIn.select
        // found by name, with no list:  one read by a name it was looked at by
        const named = byName[words]
        if (named !== undefined) {
          const one = await core.savedThingWithId(Class, named)
          byType[words] = { rows: one ? 1 : 0 }
          for (const field of fieldsNeverFilled(Class, one ? [one] : []))
            complaints.push(`No row read filled ${words}'s "${field}".`)
          continue
        }
        // answering only a search:  searched, as a program has to
        const searched = bySearch[words]
        const search = searched && { search: { [searched.field]: searched.text } }
        // asked for by a query:  asked what it was looked at with, as a program has to
        const asked = byQuery[words]
        const filter = asked && { filter: { ...asked } }
        const list = await core.savedThings(Class, { page: { size: READ_ROWS }, ...search, ...filter })
        byType[words] = { rows: list.items.length }
        // a list that gives only names (`its lists give only each one's "name"`):  its first, read whole, says the rest
        const checked = givesOnly.test(spell) && list.items.length ? await readWhole(Class, list.items[0]!) : list.items
        for (const field of fieldsNeverFilled(Class, checked))
          complaints.push(`No row read filled ${words}'s "${field}".`)
      } catch (error) {
        byType[words] = problem(error)
      }
    }
    return { byType, complaints: withoutListsUnder(complaints, spell) }
  } finally {
    globalThis.fetch = held.fetch
    Object.assign(globalThis, { location: held.location })
    console.warn = held.warn
    console.error = held.error
  }
}

/** A place line saying a list is kept under each thing:  `a post's comments live at "/posts/{id}/comments"`. */
const LIST_UNDER = /^\s*- an? (.+)'s (.+) live at /gm

/**
 * `complaints`, less those of a list kept under each thing (epic `data` P30):
 * no row holds a post's comments, as they're read from the post's own address, the first time something reads them.
 */
function withoutListsUnder(complaints: readonly string[], spell: string): string[] {
  const under = [...spell.matchAll(LIST_UNDER)].map(
    ([, type, list]) =>
      `No row read filled ${type}'s "${list!.replace(/ (\p{L})/gu, (_, letter: string) => letter.toUpperCase())}".`
  )
  return complaints.filter((complaint) => !under.includes(complaint))
}

/** A place line saying its lists give only a little of each row:  `its lists give only each one's "name"`. */
const givesOnly = /^\s*- its lists give only each one's /m

/** How long it waits for a thing read whole, a tenth of a second at a time. */
const WHOLE_WAITS = 50

/**
 * `thing`, read whole:  reading the fields its list left out reads it from its address (`core`'s `listsGive`).
 * - Waits until one of them fills, or a while:  `[thing]` either way.
 */
async function readWhole(Class: new () => unknown, thing: unknown): Promise<unknown[]> {
  const unfilled = fieldsNeverFilled(Class, [thing])
  const before = unfilled.length
  if (!before) return [thing]
  // read for real, not only looking:  what asks for it whole
  void (thing as Record<string, unknown>)[unfilled[0]!]
  for (let waits = 0; waits < WHOLE_WAITS && fieldsNeverFilled(Class, [thing]).length === before; waits++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return [thing]
}

/**
 * Each field `Class` declares that none of `things` filled:  the server left it out, or sent nothing (`null`).
 * - Filled is what a row STORED (`peekProp()`), not a value unlike a new thing's (epic `data` I53):
 *   a yes or no that's no on every row, a count always 0, text always empty, are all the server's answer.
 * - A list is filled when one holds an item;  a date, when there is one.
 * - Only looking:  a field holding an address isn't following it.
 */
function fieldsNeverFilled(Class: new () => unknown, things: readonly unknown[]): string[] {
  if (!things.length) return []
  const usual = new Class() as Record<string, unknown>
  const isFilled = (thing: unknown, field: string) => {
    const value = whileOnlyShowing(() => (thing as Record<string, unknown>)[field])
    if (value instanceof Date) return true
    if (value && typeof value === "object" && "items" in value) return (value.items as unknown[]).length > 0
    const stored = peekProp<unknown>(thing, field)
    if (stored !== undefined) return stored !== null
    // nothing stored:  what it reads by itself, worked out from what is
    return value !== usual[field] && value !== undefined && value !== null
  }
  return [...schemaOf(Class).declared.keys()].filter((field) => !things.some((thing) => isFilled(thing, field)))
}

////////////////
// ## What it says
////////////////

/** What adding it did. */
function printAdded({ wrote, file, descriptionPath, description, spell, warnings }: IngestResult): void {
  if (!wrote) {
    CLI.out(
      `${file} already has ${description.about.name}:  nothing changed.  To look again:  spell place update ${file}`
    )
    return
  }
  CLI.out(`Added ${description.about.name} to ${file}.`)
  CLI.out(`Its description:  ${descriptionPath}`)
  CLI.out("")
  CLI.out(spell)
  printDescription(description, warnings)
}

/** What looking again did. */
function printUpdate({ file, descriptionPath, description, changes, couldntChange, warnings }: IngestResult): void {
  CLI.out(`Looked again at ${description.about.name}, for ${file}.  Its description:  ${descriptionPath}`)
  printList("What changed:", changes.length ? changes : ["Nothing."])
  if (couldntChange.length) printList("What it couldn't change for you:", couldntChange)
  printDescription(description, warnings)
}

/** What a run always says:  what it read through the Spell, and what Spell can't say. */
function printDescription(
  { collections, about, spellCantSay, notes }: PlaceDescription,
  warnings: readonly string[]
): void {
  CLI.out("")
  CLI.out(
    `Version:  ${about.version ? `${about.version.says} (${about.version.where})` : "it names none"}.  Looked at ${about.lookedAt}, shape ${about.fingerprint}.`
  )
  const reads = Object.entries(collections)
    .filter(([, { leftOut }]) => !leftOut)
    .map(
      ([name, { readThrough }]) =>
        `${name}:  ${readThrough?.rows ?? 0} rows${readThrough?.problem ? ` -- ${readThrough.problem}` : ""}`
    )
  printList("A read through the Spell found:", reads)
  if (spellCantSay.length) printList("What Spell can't say about it:", spellCantSay)
  if (notes.length) printList("To know:", notes)
  if (warnings.length) printList("Compiling says:", warnings)
}

/** A heading, and its lines as bullets. */
function printList(heading: string, lines: readonly string[]): void {
  CLI.out(heading)
  for (const line of lines) CLI.out(`- ${line}`)
}
