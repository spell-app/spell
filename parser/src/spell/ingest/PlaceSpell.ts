import { P } from "spell/parser/parser"
import { englishAgreement } from "spell/parser/spell/languages/en/agreement"
import { checkEveryInWords } from "spell/parser/spell/rules/places/CheckedEvery"
import { fieldNamed } from "spell/parser/spell/rules/places/PlaceDetail"
import { nameStyleLike, ourNameFor } from "spell/util/places/FieldNames"

import type { CollectionDescription, FieldDescription, PlaceDescription } from "./ingest.types"
import { isSpellsOwnType } from "./PlaceShape"

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

/** The most rows a list can say it has and still be read in one request, `it gives up to 2000 at a time`. */
const MOST_AT_A_TIME = 5000

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
  /** A type for what's inside a row, nowhere of its own:  known by its header, as several share a collection. */
  isInside?: boolean
  /** A type inside a row:  the fields it's written from, by the source's names, so a line Spell can't read is left out there. */
  insideFields?: Record<string, FieldDescription>
}

/** Is `after` the type `before` was:  a collection's own by its collection, one inside a row by its header. */
function isSameType(before: TypeLines, after: TypeLines): boolean {
  if (!!before.isInside !== !!after.isInside) return false
  return after.isInside ? before.header === after.header : before.collection === after.collection
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
  const { name, kind, address, keySecret, keyIfSet } = about
  const shown = Object.entries(collections).filter(([, collection]) => !collection.leftOut)
  const every = shown.map(([, collection]) => collection)
  const placeLines: SpellLine[] = []
  if (withKey && keySecret) {
    const ifSet = keyIfSet ? ", if it's set" : ""
    placeLines.push({ key: "key", text: `- its key is the secret "${keySecret}"${ifSet}` })
  }
  const sameId = sameOfEvery(every, ({ idField }) => idField)
  const isSheet = kind === "sheet" || kind === "google sheet"
  if (sameId && (isSheet || sameId !== USUAL_ID)) placeLines.push({ key: "id", text: `- its id is its "${sameId}"` })
  const rowsAt = sameOfEvery(every, (collection) => collection.rowsAt)
  if (rowsAt) placeLines.push({ key: "rows", text: `- its rows are ${fieldInWords(rowsAt)}` })
  const nextAt = kind === "web server" ? sameOfEvery(every, (collection) => collection.nextAt) : undefined
  if (nextAt) placeLines.push({ key: "next", text: `- its next page is ${fieldInWords(nextAt)}` })
  // every list that pages says its next page in its `Link` header, GitHub's way:  one with no pages asks nothing of it
  const paging = new Set(every.map((collection) => collection.paging).filter((each) => each !== "none"))
  if (kind === "web server" && !nextAt && paging.size === 1 && paging.has("link header")) {
    placeLines.push({ key: "next", text: `- its next page is in its "Link" header` })
  }
  // every list with more than a page can be asked for more at a time, and none is too big to read in one:
  // every name in one request
  const paged = every.filter(({ takesLimit }) => takesLimit !== undefined)
  const most = Math.max(...paged.map(({ rowsItSays }) => rowsItSays ?? Infinity))
  if (kind === "web server" && paged.length && paged.every(({ takesLimit }) => takesLimit) && most <= MOST_AT_A_TIME) {
    placeLines.push({ key: "size", text: `- it gives up to ${Math.ceil(most / 1000) * 1000} at a time` })
  }
  // every list gives only a little of each row:  what any of them gives, or its id when none gives more
  if (kind === "web server" && every.length && every.every(({ listsGive }) => listsGive)) {
    const given = [...new Set(every.flatMap(({ listsGive }) => listsGive!))]
    const fields = (given.length ? given : [sameId ?? USUAL_ID]).slice(0, 2).map((field) => `"${field}"`)
    placeLines.push({ key: "lists", text: `- its lists give only each one's ${fields.join(" and ")}` })
  }
  if (every.length && every.every(({ fields }) => fields[VERSION_FIELD]?.type === "number")) {
    placeLines.push({ key: "version", text: `- its version is its "${VERSION_FIELD}"` })
  }
  if (checkEverySeconds !== undefined) {
    placeLines.push({ key: "check", text: `- check it ${checkEveryInWords(checkEverySeconds)}` })
  }
  // how it spells a name and writes a number, when that isn't ours:  for a save, or a field it hasn't sent yet
  const namesLike = isSheet ? undefined : nameExampleOf(every)
  if (namesLike) placeLines.push({ key: "names", text: `- it writes names like "${namesLike}"` })
  const searches = searchLineOf(every)
  if (searches) placeLines.push({ key: "search", text: searches })
  const fieldsShown = every.flatMap(({ fields }) => Object.values(fields))
  if (fieldsShown.some(({ decimalComma }) => decimalComma)) {
    placeLines.push({ key: "numbers", text: '- it writes numbers like "1.200,5"' })
  }
  for (const [collection, description] of shown) {
    if (isSheet || !description.at || description.at === collection) continue
    // found by name, with no list:  where its name goes, `wiki pages are found at "/page/summary/{name}"`
    const where = /\{[^{}/]*\}/.test(description.at) ? "are found at" : "live at"
    placeLines.push({ key: `at:${collection}`, text: `- ${collectionWords(description)} ${where} "${description.at}"` })
    if (!sameId && description.idField && description.idField !== USUAL_ID) {
      const line = `- ${articled(description.type)}'s id is its "${description.idField}"`
      placeLines.push({ key: `id:${collection}`, text: line })
    }
  }
  return {
    header: `${name} is ${articled(kind)} at "${address}":`,
    placeLines,
    types: [
      ...shown.map(([collection, description]) => typeLines(collection, description, name, collections)),
      ...typesInside(shown, collections)
    ]
  }
}

/**
 * Where a field is that's inside others, in words, never with a dot:  `links.next` => `the "next" of its "links"`.
 * - The grammar refuses a dot in a field's name, so it's never suggested here.
 */
function fieldInWords(path: string): string {
  const [own, ...outer] = path.split(".").reverse()
  if (!outer.length) return `its "${own}"`
  const last = outer.pop()!
  return [own, ...outer].map((name) => `the "${name}" of`).join(" ") + ` its "${last}"`
}

/** Words a type's name can't hold, as they end a name in a line:  `evolves to`. */
const NOT_IN_A_TYPE_NAME = new Set([
  "to",
  "is",
  "of",
  "in",
  "on",
  "at",
  "by",
  "for",
  "from",
  "with",
  "and",
  "or",
  "the",
  "a",
  "an"
])

/**
 * What a type holding a field's object is called:  one of it, `parts` => `part`.
 * - Without a word a type's name can't hold:  `evolves to` => `evolves`.
 */
function typeInside(words: string): string {
  const parts = words.split(" ").filter((word) => !NOT_IN_A_TYPE_NAME.has(word))
  if (!parts.length) return "part"
  parts[parts.length - 1] = P.singularize(parts[parts.length - 1]!)
  return parts.join(" ")
}

/**
 * The type holding the objects a field of `owner` holds:  `thumbnail` for `thumbnail`, `stat` for a list of `stats`.
 * - A name a place's own type has, or one of Spell's (`type`), says whose it is:  PokéAPI's `types` of a `pokemon`
 *   are each a `pokemon type entry`, as its `type` collection is the `pokemon type`.
 */
function insideTypeFor(words: string, owner: string, own: ReadonlySet<string>): string {
  const one = typeInside(words)
  if (!own.has(one) && !isSpellsOwnType(one)) return one
  const owned = `${owner} ${one}`
  return own.has(owned) ? `${owned} entry` : owned
}

/**
 * A type for each object a field holds, its fields read in words:  `its "thumbnail" is a thumbnail`, `the source of its thumbnail`.
 * - Plain things, nowhere of their own:  each is inside the row it came in.
 * - The first with its name stands for all of them, and one inside it gets its own.
 * - A list of objects too:  `its "stats" is a list of stats`, each a `stat`.
 */
function typesInside(
  shown: ReadonlyArray<readonly [string, CollectionDescription]>,
  collections: Readonly<Record<string, CollectionDescription>>
): TypeLines[] {
  const types = new Map<string, TypeLines>()
  const own = new Set(shown.map(([, { type }]) => type))
  const add = (collection: string, owner: string, fields: Readonly<Record<string, FieldDescription>>) => {
    for (const { words: field, inside, leftOut } of Object.values(fields)) {
      if (!inside || leftOut) continue
      const words = insideTypeFor(field, owner, own)
      if (types.has(words)) continue
      const lines = Object.entries(inside).flatMap(([name, about]) => {
        if (about.leftOut || (!about.inside && !about.isItsOwner && !SPELL_TYPES[about.type])) return []
        const what = typeWordsFor(about, collections, words, own)
        return [
          {
            key: `inside:${words}:${about.words}`,
            text: `- its "${about.words}" is ${what}${storedAsFor(name, about)}`
          }
        ]
      })
      const header = `${articled(words).replace(words, `"${words}"`)} is a thing:`
      types.set(words, { collection, header, lines, isInside: true, insideFields: inside })
      add(collection, words, inside)
    }
  }
  for (const [collection, { fields, type }] of shown) add(collection, type, fields)
  return [...types.values()]
}

/**
 * What the source calls a field, when its words don't find it:  `, stored as "avg_ht"` on its own line.
 * - `hair_color`, `hairColor` and `Hair Color` all find `its "hair color"` by its words (`FieldNames`):  nothing to say.
 */
function storedAsFor(field: string, { words }: FieldDescription): string {
  return ourNameFor(field) === fieldNamed(words) ? "" : `, stored as "${field}"`
}

/**
 * One of the place's own field names of two words or more, if they're all spelled one way that isn't ours:  `hair_color`.
 * - What `it writes names like "hair_color"` says, so a save or a query names a field it hasn't sent yet the server's way.
 * - Spelled ours (`hairColor`), or several ways:  `undefined`.
 */
function nameExampleOf(collections: readonly CollectionDescription[]): string | undefined {
  const names = collections.flatMap(({ fields }) => Object.keys(fields)).filter((name) => nameStyleLike(name))
  const styles = new Set(names.map(nameStyleLike))
  return styles.size === 1 && !styles.has("camel") ? names[0] : undefined
}

/** A type's lines. */
function typeLines(
  collection: string,
  description: CollectionDescription,
  place: string,
  collections: Readonly<Record<string, CollectionDescription>>
): TypeLines {
  const lines: SpellLine[] = [{ key: `lives:${collection}`, text: `- it lives in ${place}` }]
  const own = new Set(Object.values(collections).map(({ type }) => type))
  for (const [field, about] of Object.entries(description.fields)) {
    if (isLeftOut(field, description, about.leftOut, about.type, about)) continue
    const what = typeWordsFor(about, collections, description.type, own)
    const line = `- its "${about.words}" is ${what}${nothingWordsFor(about)}${storedAsFor(field, about)}`
    lines.push({ key: `field:${collection}:${field}`, text: `${line}${commentFor(about, collections)}` })
  }
  return {
    collection,
    header: `${articled(description.type).replace(description.type, `"${description.type}"`)} is a thing:`,
    lines
  }
}

/** Does the type leave this field out:  its id, which every thing has;  what Spell can't hold;  what a person or the compiler left out? */
function isLeftOut(
  field: string,
  { idField, samples }: CollectionDescription,
  leftOut: string | undefined,
  type: FieldDescription["type"],
  about: FieldDescription
): boolean {
  // a thing found by name keeps its name a field too:  Wikipedia's `title`, its id, is what a page shows
  const isItsId = field === idField && !samples
  return isItsId || !!leftOut || (!SPELL_TYPES[type] && !about.inside && !about.isItsOwner)
}

/**
 * What a field is, in a type's line.
 * - A link to one of the place's own types is that type:  `a planet`, `a list of films`, so reading it follows the address (`core.linked()`).
 *   Anywhere else, it's only an address:  text.
 */
function typeWordsFor(
  { type, linksTo, inside, isListInside, isItsOwner, words }: FieldDescription,
  collections: Readonly<Record<string, CollectionDescription>>,
  owner: string,
  own: ReadonlySet<string>
): string {
  if (isItsOwner) return isListInside ? `a list of ${P.pluralize(owner)}` : articled(owner)
  if (inside) {
    const held = insideTypeFor(words, owner, own)
    return isListInside ? `a list of ${P.pluralize(held)}` : articled(held)
  }
  const target = linksTo === undefined ? undefined : collections[linksTo]
  if (!target || target.leftOut) return SPELL_TYPES[type]!
  if (type === "link") return articled(target.type)
  if (type === "list of links") return `a list of ${collectionWords(target)}`
  return SPELL_TYPES[type]!
}

/**
 * A number's words for none, as the source writes them:  ` or "unknown"`, ` or "n/a" or "unknown"`.
 * - Read as nothing, quietly, and what saving nothing writes back.  A number written as text needs nothing said:  it reads as one.
 */
function nothingWordsFor({ type, noNumberWords }: FieldDescription): string {
  const words = type === "number" ? (noNumberWords ?? []).filter((word) => word.trim()) : []
  return words.map((word) => ` or "${word}"`).join("")
}

/** What a person should know, on the line:  what Spell reads differently from what's there. */
function commentFor(
  { type, linksTo }: FieldDescription,
  collections: Readonly<Record<string, CollectionDescription>>
): string {
  const target = linksTo === undefined ? undefined : collections[linksTo]
  if (target && !target.leftOut && (type === "link" || type === "list of links")) return ""
  if (type === "link") return "  // an address"
  if (type === "list of links") return "  // each an address"
  return ""
}

/** The one value of `read` every collection has:  `undefined` when they differ, or any has none. */
function sameOfEvery<Value>(
  collections: readonly CollectionDescription[],
  read: (collection: CollectionDescription) => Value | undefined
): Value | undefined {
  const values = new Set(collections.map(read))
  return values.size === 1 ? [...values][0] : undefined
}

/**
 * What a program calls a collection:  its type, more than one, `characters` for a `character`.
 * - Not the source's own name for it, `people`:  a person may rename the type, and the collection goes with it.
 */
function collectionWords({ type }: CollectionDescription): string {
  return type
    .split(" ")
    .map((word, index, words) => (index === words.length - 1 ? P.pluralize(word) : word))
    .join(" ")
}

/** `word` with its article. */
export function articled(word: string): string {
  return `${englishAgreement.article("indefinite", word, undefined)} ${word}`
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

/** Every place's line in `text`:  its name and address. */
export function placesIn(text: string): Array<{ name: string; address: string }> {
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
 * - `written`:  the lines it wrote last time, as the description keeps them (`PlaceDescription.spell`):
 *   one written by an older version of the tool, in words it no longer writes, is put in today's (`inTodaysWords()`).
 */
export function mergedSpell(
  text: string,
  before: SpellParts,
  after: SpellParts,
  usesOf: (words: string, own: ReadonlySet<string>) => boolean,
  written: readonly string[] = []
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
    const was = before.types.find((each) => isSameType(each, type))
    if (!was) {
      lines.push("", type.header, ...type.lines.map((line) => `\t${line.text}`))
      merge.changed.push(
        type.isInside
          ? `New type inside:  "${type.header}".`
          : `New collection:  ${type.collection}, as "${type.header}".`
      )
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
    if (type.isInside || after.types.some((each) => isSameType(each, type))) continue
    merge.couldnt.push(
      `The collection "${type.collection}" is gone from the source;  its type stays, for you to remove:  ${type.header}`
    )
  }
  inTodaysWords(lines, written, after, merge)
  merge.text = lines.join("\n")
  return merge
}

/** A line under a place an older version wrote, naming a field the server spells differently:  `- a person's hair color is its "hair_color"`. */
const OLD_FIELD_NAME_LINE = /^- an? .+?'s "?.+?"? is its "[^"]+"$/

/**
 * SIDE EFFECT:  each line the tool wrote last time (`written`), in words it no longer writes, put in today's (epic `data` P23):
 * - a field's line, `- its "height" is a number  // written as text there`:  today's line for those words, in its type
 * - a line under the place naming a field's spelling there, `- a person's hair color is its "hair_color"`:  gone, as the
 *   field finds it by its words now, or says `stored as` on its own line
 * - A line a person changed isn't one it wrote, so it's never touched.
 */
function inTodaysWords(lines: string[], written: readonly string[], after: SpellParts, merge: SpellMerge): void {
  const wrote = new Set(written.map((line) => line.trim()))
  const today = new Set(allLines(after).map(({ text }) => text))
  const blocks = new Map<string, Map<string, string>>([[after.header, new Map()]])
  for (const type of after.types) {
    blocks.set(type.header, new Map(type.lines.flatMap(({ text }) => (wordsIn(text) ? [[wordsIn(text)!, text]] : []))))
  }
  let block: Map<string, string> | undefined
  for (let at = 0; at < lines.length; at++) {
    const line = lines[at]!
    if (!line.startsWith("\t")) {
      block = blocks.get(line)
      continue
    }
    const text = line.trim()
    if (!block || !wrote.has(text) || today.has(text)) continue
    const now = block.get(wordsIn(text) ?? "")
    if (now && /^- its "/.test(text)) {
      // today's line may be in already, added at the block's end as new:  it takes the old one's place
      const added = otherInBlock(lines, at, `\t${now}`)
      lines[at] = `\t${now}`
      if (added !== undefined) lines.splice(added, 1)
      if (added !== undefined && added < at) at--
      merge.changed.push(`In today's words:  ${now}`)
    } else if (OLD_FIELD_NAME_LINE.test(text)) {
      lines.splice(at--, 1)
      merge.changed.push(`Removed, as its field finds it by its words:  ${text}`)
    }
  }
}

/** Where else the block holding line `at` has `line`:  `undefined` if nowhere. */
function otherInBlock(lines: readonly string[], at: number, line: string): number | undefined {
  let start = at
  while (start > 0 && lines[start - 1]!.startsWith("\t")) start--
  for (let index = start; index < lines.length && lines[index]!.startsWith("\t"); index++) {
    if (index !== at && lines[index] === line) return index
  }
  return undefined
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
      // a person wrote it already, word for word:  nothing to add
      if (lineAt(lines, blockAt, line.text) >= 0) continue
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
    ...types.flatMap((type) => [
      { key: `type:${type.isInside ? type.header : type.collection}`, text: type.header },
      ...type.lines
    ])
  ]
}

/**
 * `- it searches names and titles with "search"`:  what every collection that searches searches by, when they share a parameter.
 * - `undefined` when none does, or they don't agree on the parameter.
 */
function searchLineOf(every: readonly CollectionDescription[]): string | undefined {
  const seen = every.flatMap(({ searchedBy, fields }) =>
    searchedBy ? [{ param: searchedBy.param, words: fields[searchedBy.field]?.words ?? searchedBy.field }] : []
  )
  const params = new Set(seen.map(({ param }) => param))
  if (!seen.length || params.size > 1) return undefined
  const words = [...new Set(seen.map(({ words }) => pluralWords(words)))]
  return `- it searches ${words.join(" and ")} with "${[...params][0]}"`
}

/** `words`, more than one:  `name` => `names`, `class` => `classes`. */
function pluralWords(words: string): string {
  return /(?:s|x|z|ch|sh)$/.test(words) ? `${words}es` : `${words}s`
}
