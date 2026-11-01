import { fieldNamed } from "spell/parser/spell/rules/places/PlaceDetail"

import type { CollectionDescription, FieldDescription, PlaceDescription } from "./ingest.types"

/** What each thing a field can hold is, in a type's line. */
const SPELL_TYPES: Readonly<Partial<Record<FieldDescription["type"], string>>> = {
  text: "text",
  number: "a number",
  "yes or no": "yes or no",
  date: "a date",
  // what isn't one of the place's own types:  its address, as text
  link: "text",
  "list of links": "a list of text",
  "list of text": "a list of text",
  "list of numbers": "a list of numbers"
}

/** A row's id, in a place that isn't told otherwise. */
const USUAL_ID = "id"

/** The field a row usually says its version in. */
const VERSION_FIELD = "version"

/** One line the tool wrote, with what it's about:  so a later look can tell which line to change. */
export type SpellLine = {
  /** What it's about, the same from look to look:  `field:films:title`. */
  key: string
  /** The line, without its tab. */
  text: string
}

/** A type's lines. */
export type TypeLines = {
  /** The collection it's for, by what Spell calls it. */
  collection: string
  /** Its first line. */
  header: string
  /** The lines under it. */
  lines: SpellLine[]
}

/** The Spell for a place:  its line, what's under it, and each type. */
export type SpellParts = {
  /** The place's first line. */
  header: string
  /** The lines under it. */
  placeLines: SpellLine[]
  /** Each type. */
  types: TypeLines[]
}

/**
 * The Spell for a description, in the settled words (`agents/coherence/words.md`, "the details under a place").
 * - `withKey`:  `false`, no key line:  a read through it here sends the key by itself, as nothing holds one in a program.
 * - Only what's said differently from the usual needs a line, except each collection's address, which shows what's there.
 */
export function spellPartsFor(
  { about, collections, checkEverySeconds }: PlaceDescription,
  { withKey = true }: { withKey?: boolean } = {}
): SpellParts {
  const { name, kind, address, keySecret } = about
  const shown = Object.entries(collections).filter(([, collection]) => !collection.leftOut)
  const every = shown.map(([, collection]) => collection)
  const placeLines: SpellLine[] = []
  if (withKey && keySecret) placeLines.push({ key: "key", text: `- its key is the secret "${keySecret}"` })
  const sameId = sameOfEvery(every, ({ idField }) => idField)
  const isSheet = kind === "sheet" || kind === "google sheet"
  if (sameId && (isSheet || sameId !== USUAL_ID)) placeLines.push({ key: "id", text: `- its id is its "${sameId}"` })
  const rowsAt = sameOfEvery(every, (collection) => collection.rowsAt)
  if (rowsAt) placeLines.push({ key: "rows", text: `- its rows are its "${rowsAt}"` })
  const nextAt = kind === "web server" ? sameOfEvery(every, (collection) => collection.nextAt) : undefined
  if (nextAt) placeLines.push({ key: "next", text: `- its next page is its "${nextAt}"` })
  if (every.length && every.every(({ fields }) => fields[VERSION_FIELD]?.type === "number")) {
    placeLines.push({ key: "version", text: `- its version is its "${VERSION_FIELD}"` })
  }
  if (checkEverySeconds !== undefined) {
    placeLines.push({ key: "check", text: `- check it every ${checkEverySeconds} seconds` })
  }
  for (const [collection, description] of shown) {
    if (isSheet || !description.at || description.at === collection) continue
    placeLines.push({ key: `at:${collection}`, text: `- ${collection.replace(/_/g, " ")} live at "${description.at}"` })
    if (!sameId && description.idField && description.idField !== USUAL_ID) {
      const line = `- ${articled(description.type)}'s id is its "${description.idField}"`
      placeLines.push({ key: `id:${collection}`, text: line })
    }
  }
  // a sheet reads no such line:  `whatSpellCantSay()` says so
  if (!isSheet)
    for (const [collection, description] of shown) placeLines.push(...fieldNameLines(collection, description))
  return {
    header: `${name} is ${articled(kind)} at "${address}":`,
    placeLines,
    types: shown.map(([collection, description]) => typeLines(collection, description, name, collections))
  }
}

/** The lines that say what the source calls a field, when Spell's name for it isn't that. */
function fieldNameLines(collection: string, description: CollectionDescription): SpellLine[] {
  return Object.entries(description.fields).flatMap(([field, { words, leftOut, type, wordsInQuotes }]) => {
    if (isLeftOut(field, description, leftOut, type) || fieldNamed(words) === field) return []
    const named = wordsInQuotes ? `"${words}"` : words
    const text = `- ${articled(description.type)}'s ${named} is its "${field}"`
    return [{ key: `name:${collection}:${field}`, text }]
  })
}

/** A type's lines. */
function typeLines(
  collection: string,
  description: CollectionDescription,
  place: string,
  collections: Readonly<Record<string, CollectionDescription>>
): TypeLines {
  const lines: SpellLine[] = [{ key: `lives:${collection}`, text: `- it lives in ${place}` }]
  for (const [field, about] of Object.entries(description.fields)) {
    if (isLeftOut(field, description, about.leftOut, about.type)) continue
    const line = `- its "${about.words}" is ${typeWordsFor(about, collections)}`
    lines.push({ key: `field:${collection}:${field}`, text: `${line}${commentFor(about, collections)}` })
  }
  return {
    collection,
    header: `${/^[aeiou]/i.test(description.type) ? "an" : "a"} "${description.type}" is a view:`,
    lines
  }
}

/** Does the type leave this field out:  its id, which every thing has;  what Spell can't hold;  what a person or the compiler left out? */
function isLeftOut(
  field: string,
  { idField }: CollectionDescription,
  leftOut: string | undefined,
  type: FieldDescription["type"]
): boolean {
  return field === idField || !!leftOut || !SPELL_TYPES[type]
}

/**
 * What a field is, in a type's line.
 * - A link to one of the place's own types is that type:  `a planet`, `a list of films`, so reading it follows the address (`core.linked()`).
 *   Anywhere else, it's only an address:  text.
 */
function typeWordsFor(
  { type, linksTo }: FieldDescription,
  collections: Readonly<Record<string, CollectionDescription>>
): string {
  const target = linksTo === undefined ? undefined : collections[linksTo]
  if (!target || target.leftOut) return SPELL_TYPES[type]!
  if (type === "link") return articled(target.type)
  if (type === "list of links") return `a list of ${linksTo!.replace(/_/g, " ")}`
  return SPELL_TYPES[type]!
}

/** What a person should know, on the line:  what Spell reads differently from what's there. */
function commentFor(
  { type, linksTo, writtenAsText, noNumberWords }: FieldDescription,
  collections: Readonly<Record<string, CollectionDescription>>
): string {
  const target = linksTo === undefined ? undefined : collections[linksTo]
  if (target && !target.leftOut && (type === "link" || type === "list of links")) return ""
  if (type === "link") return "  // an address"
  if (type === "list of links") return "  // each an address"
  if (!writtenAsText) return ""
  const none = noNumberWords?.length ? `;  ${noNumberWords.map((word) => `"${word}"`).join(", ")} reads as nothing` : ""
  return `  // written as text there${none}`
}

/** The one value of `read` every collection has:  `undefined` when they differ, or any has none. */
function sameOfEvery<Value>(
  collections: readonly CollectionDescription[],
  read: (collection: CollectionDescription) => Value | undefined
): Value | undefined {
  const values = new Set(collections.map(read))
  return values.size === 1 ? [...values][0] : undefined
}

/** `word` with its article. */
export function articled(word: string): string {
  return `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`
}

/** `parts` as text. */
export function spellTextOf({ header, placeLines, types }: SpellParts): string {
  const place = [header, ...placeLines.map(({ text }) => `\t${text}`)].join("\n")
  const each = types.map(({ header: first, lines }) => [first, ...lines.map(({ text }) => `\t${text}`)].join("\n"))
  return `${[place, ...each].join("\n\n")}\n`
}

/** The place a line in `text` declares at this address, by name, English or Spanish:  `undefined` if it has none. */
export function placeLineAt(text: string, address: string): string | undefined {
  return placesIn(text).find((place) => sameAddress(place.address, address))?.name
}

/** Is the place's name taken in `text` by another address? */
export function nameIsTaken(text: string, name: string): boolean {
  return placesIn(text).some((place) => place.name === name)
}

/** Every place's line in `text`. */
function placesIn(text: string): Array<{ name: string; address: string }> {
  return [...text.matchAll(PLACE_LINE)].map((match) => ({ name: match[1]!.trim(), address: match[2]! }))
}

/** A place's line, as far as saying which it is:  in either language. */
const PLACE_LINE = /^([^\s"/][^"\n]*?) (?:is|es) (?:an?|una?) [^"\n]+? (?:at|from|en|desde) "([^"\n]+)"/gm

/** The same address, whatever ends it. */
function sameAddress(a: string, b: string): boolean {
  return a.replace(/\/+$/, "") === b.replace(/\/+$/, "")
}

////////////////
// ## Looking again
////////////////

/** What merging a new look into a file did. */
export type SpellMerge = {
  /** The file now. */
  text: string
  /** What changed, in words for people. */
  changed: string[]
  /** What it couldn't change for them, in words for people. */
  couldnt: string[]
}

/**
 * The Spell file with what's changed since the last look, and everything else as it was.
 * - `before`:  what the tool wrote last time;  `after`:  what it would write now.
 * - A line differs only if the tool's own line differs:  every line a person wrote or changed is theirs, and stays.
 * - A line that's gone from the source:
 *   - still as the tool wrote it, and nothing uses it:  it goes
 *   - something uses it, by its words, here or in another file beside it:  it stays, and it says so
 * - A line a person changed, whose field has changed too:  theirs stays, and it says so.
 * - A type that's gone stays:  removing a program's type is a person's call.
 * - `usesOf`:  where these words are used, in lines the tool didn't write.
 */
export function mergedSpell(
  text: string,
  before: SpellParts,
  after: SpellParts,
  usesOf: (words: string, own: ReadonlySet<string>) => boolean
): SpellMerge {
  const merge: SpellMerge = { text, changed: [], couldnt: [] }
  const lines = text.split("\n")
  const own = new Set(allLines(before).map((line) => line.text))
  const placeAt = lines.findIndex((line) => line === before.header)
  if (placeAt < 0) {
    merge.couldnt.push(`The place's line isn't as it was written, so nothing under it was changed:  ${before.header}`)
    return merge
  }
  // the place's lines
  mergeBlock({ lines, blockAt: placeAt, before: before.placeLines, after: after.placeLines, merge, own, usesOf })
  // each type, and a new one at the end
  for (const type of after.types) {
    const was = before.types.find(({ collection }) => collection === type.collection)
    if (!was) {
      lines.push("", type.header, ...type.lines.map((line) => `\t${line.text}`))
      merge.changed.push(`New collection:  ${type.collection}, as "${type.header}".`)
      continue
    }
    const blockAt = lines.findIndex((line) => line === was.header)
    if (blockAt < 0) {
      merge.couldnt.push(`"${was.header}" isn't in the file as it was written, so its lines weren't changed.`)
      continue
    }
    mergeBlock({ lines, blockAt, before: was.lines, after: type.lines, merge, own, usesOf })
  }
  for (const type of before.types) {
    if (after.types.some(({ collection }) => collection === type.collection)) continue
    merge.couldnt.push(
      `The collection "${type.collection}" is gone from the source;  its type stays, for you to remove:  ${type.header}`
    )
  }
  merge.text = lines.join("\n")
  return merge
}

/** What `mergeBlock()` works on. */
type BlockMerge = {
  /** The file's lines:  changed. */
  lines: string[]
  /** Where the block's first line is. */
  blockAt: number
  /** The lines the tool wrote last time. */
  before: readonly SpellLine[]
  /** The lines it would write now. */
  after: readonly SpellLine[]
  /** What's being said. */
  merge: SpellMerge
  /** Every line the tool wrote. */
  own: ReadonlySet<string>
  /** See `mergedSpell()`. */
  usesOf: (words: string, own: ReadonlySet<string>) => boolean
}

/** SIDE EFFECT:  one block's lines, added, changed and gone:  see `mergedSpell()`. */
function mergeBlock({ lines, blockAt, before, after, merge, own, usesOf }: BlockMerge): void {
  const wereBy = new Map(before.map((line) => [line.key, line.text]))
  for (const line of after) {
    const was = wereBy.get(line.key)
    if (was === line.text) continue
    if (was === undefined) {
      lines.splice(endOfBlock(lines, blockAt), 0, `\t${line.text}`)
      merge.changed.push(`Added:  ${line.text}`)
      continue
    }
    const at = lineAt(lines, blockAt, was)
    if (at < 0) {
      merge.couldnt.push(`It would say "${line.text}", but you've changed that line, so it stays as you wrote it.`)
      continue
    }
    const words = wordsIn(was)
    if (words && usesOf(words, own)) {
      merge.couldnt.push(
        `It would say "${line.text}", but "${words}" is used, as it was:  it stays, for you to change.`
      )
      continue
    }
    lines[at] = `\t${line.text}`
    merge.changed.push(`Changed:  ${line.text}`)
  }
  const nowKeys = new Set(after.map((line) => line.key))
  for (const { key, text } of before) {
    if (nowKeys.has(key)) continue
    const at = lineAt(lines, blockAt, text)
    if (at < 0) continue
    const words = wordsIn(text)
    if (words && usesOf(words, own)) {
      merge.couldnt.push(
        `The source no longer has what this line reads, and "${words}" is used, so it stays, for you to change:  ${text}`
      )
      continue
    }
    lines.splice(at, 1)
    merge.changed.push(`Removed:  ${text}`)
  }
}

/** The words a line is about:  a property's, or what a source's name maps to. */
function wordsIn(line: string): string | undefined {
  return /^- its "([^"]+)" is /.exec(line)?.[1] ?? /^- an? .+?'s "?(.+?)"? is its "/.exec(line)?.[1]
}

/** Where `text` is, in the block starting here:  `-1` when it isn't. */
function lineAt(lines: readonly string[], blockAt: number, text: string): number {
  const end = endOfBlock(lines, blockAt)
  for (let at = blockAt + 1; at < end; at++) if (lines[at] === `\t${text}`) return at
  return -1
}

/** Just past the block's last indented line. */
function endOfBlock(lines: readonly string[], blockAt: number): number {
  let end = blockAt + 1
  for (let at = end; at < lines.length; at++) {
    const line = lines[at]!
    if (line.startsWith("\t")) end = at + 1
    else if (line.trim()) break
  }
  return end
}

/** Every line, the headers too. */
function allLines({ header, placeLines, types }: SpellParts): SpellLine[] {
  return [
    { key: "place", text: header },
    ...placeLines,
    ...types.flatMap((type) => [{ key: `type:${type.collection}`, text: type.header }, ...type.lines])
  ]
}
