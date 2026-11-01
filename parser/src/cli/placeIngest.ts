/**
 * `spell place ingest`:  the terminal's and the disk's half of looking at a data source (epic `data` P18).
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
import { schemaOf, whileOnlyShowing } from "spell/util/reactive"
import { CLI } from "spell/cli"
import { PlaceIngest } from "spell/parser/spell/ingest/PlaceIngest"
import {
  IngestStopped,
  type AskSomeone,
  type IngestFiles,
  type IngestResult,
  type PlaceDescription,
  type ReadOfType,
  type ReadThrough
} from "spell/parser/spell/ingest/ingest.types"

import { claudeRunnerFor } from "./claudeRunners"

/** What a read through the Spell asks for of each type:  a page, not the whole of it. */
const READ_ROWS = 5

/** What's at the top of a description, the first time it's written. */
const DESCRIPTION_HEAD = `// What \`spell place ingest\` found.  \`spell place ingest --update\` looks again, and changes what it wrote.
// A key of your own here, and a comment, stays;  so do the words a field or a collection goes by.
`

/** `spell place ingest`'s flags. */
export type PlaceIngestOptions = {
  kind?: string
  into?: string
  update?: string
  name?: string
  keySecret?: string
  docs?: string
  collections?: string
  ai?: boolean
}

/**
 * Run the command:  its exit code.
 * - `EXIT.ERRORS` when something needs a person:  it couldn't change a line for them.
 * - throws `CliError` for whatever stopped it, having written nothing
 */
export async function placeIngest(address: string | undefined, options: PlaceIngestOptions): Promise<number> {
  const { kind, into, update, name, keySecret, docs, collections, ai = true } = options
  const chosen = ai ? claudeRunnerFor(process.env, { ai }) : undefined
  const ingest = new PlaceIngest({
    fetch: fetchWithFiles(globalThis.fetch),
    ask: askAtTerminal,
    files: diskFiles,
    readThrough: readThroughSpell,
    keyNamed: (secret) => process.env[secret],
    say: (line) => CLI.err(line),
    ...(chosen && { claude: chosen.run, claudeVia: chosen.via })
  })
  try {
    if (update) {
      const results = await ingest.update(update, { ...(address && { address }) })
      results.forEach(printUpdate)
      return results.some(({ couldntChange }) => couldntChange.length) ? CLI.EXIT.ERRORS : CLI.EXIT.OK
    }
    if (!address) throw new CLI.CliError("which source?  spell place ingest <address>, or --update <file>")
    const result = await ingest.add({
      address,
      ...withValues({ kind, into, name, keySecret, docs }),
      ...(collections && { collections: collections.split(",").map((each) => each.trim()) })
    })
    printAdded(result)
    return CLI.EXIT.OK
  } catch (error) {
    if (error instanceof IngestStopped) throw new CLI.CliError(error.message)
    throw error
  }
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
    existsSync(path) ? (JSON5.parse(readFileSync(path, "utf8")) as PlaceDescription) : undefined,
  writeDescription: async (path, description) => {
    const text = existsSync(path)
      ? json5Edited(readFileSync(path, "utf8"), description)
      : `${DESCRIPTION_HEAD}${JSON.stringify(description, null, 2)}\n`
    writeFileSync(path, text)
  },
  descriptionsBeside: async (path) => {
    const start = `${basename(path).replace(/\.spell$/, "")}.`
    return filesBeside(path)
      .filter((name) => name.startsWith(start) && name.endsWith(".place.json5"))
      .map((name) => join(dirname(path), name))
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
 * - Each read asks for a page, not every row.
 * - For as long as it runs, `fetch` is the one it's handed, so it can't write, and it stops at a size;
 *   and a relative address means here, as no page says where it is.
 * - What the program complains of on the console is collected:  `Expected weird to be type 'number', got: 30-165`.
 * - So is a declared field no row filled:  the line that names it may be wrong.
 * - Every field is asked for:  what a type's `select` leaves out is what the program reads, and this one reads none.
 * - NEVER throws for a read that fails:  see `ReadThrough`.
 */
export const readThroughSpell: ReadThrough = async ({ spell, types, fetch }) => {
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
        const list = await core.savedThings(Class, { page: { size: READ_ROWS } })
        byType[words] = { rows: list.items.length }
        for (const field of fieldsNeverFilled(Class, list.items))
          complaints.push(`No row read filled ${words}'s "${field}".`)
      } catch (error) {
        byType[words] = problem(error)
      }
    }
    return { byType, complaints }
  } finally {
    globalThis.fetch = held.fetch
    Object.assign(globalThis, { location: held.location })
    console.warn = held.warn
    console.error = held.error
  }
}

/** Each field `Class` declares that all of `things` left at its usual value. */
function fieldsNeverFilled(Class: new () => unknown, things: readonly unknown[]): string[] {
  if (!things.length) return []
  const usual = new Class() as Record<string, unknown>
  const isFilled = (value: unknown, field: string) => {
    if (value instanceof Date) return true
    if (value && typeof value === "object" && "items" in value) return (value.items as unknown[]).length > 0
    return value !== usual[field] && value !== undefined
  }
  return [...schemaOf(Class).declared.keys()].filter(
    // only looking:  a field holding an address isn't following it
    (field) =>
      !things.some((thing) =>
        isFilled(
          whileOnlyShowing(() => (thing as Record<string, unknown>)[field]),
          field
        )
      )
  )
}

////////////////
// ## What it says
////////////////

/** What adding it did. */
function printAdded({ wrote, file, descriptionPath, description, spell, warnings }: IngestResult): void {
  if (!wrote) {
    CLI.out(
      `${file} already has ${description.about.name}:  nothing changed.  To look again:  spell place ingest --update ${file}`
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
