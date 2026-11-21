import type { PlaceDescription } from "./ingest.types"

/****************
 * ### `PlaceWords`
 * A person's words in a place's Spell file, `<Name>.api.spell`:  what its reference page shows beside what the ingest
 * found, and where an edit of them goes (epic `data` P53, Q99, Q100).
 * - The place's own prose:  the `--` lines right after its line, `netbox is a web server at "..."`.
 * - A type's or a field's words:  the `--` lines on the lines right inside it, which Spell already reads as its
 *   description (epic `language` P48).
 * - The ingest's dated marks, `-- NEW as of 2026-11-18`, `-- APPARENTLY DELETED as of 2026-11-18`, are read apart from
 *   the words:  a page shows them as a label, and an edit of the words keeps them (`MARKS`).
 * - Plain text in, plain text out, as `mergedSpell()` reads the file:  no parser, so a page in a browser reads it as it
 *   comes.  English and Spanish lines alike.
 * - Static and instance-free on purpose:  it holds nothing, and every caller has its own text.
 ****************/
export class PlaceWords {
  /**
   * Every person's words in `text`, a place's Spell file:  the place's, each type's by its quoted name, each of its
   * fields' by theirs.
   * - A thing with no words still has an entry, so an edit knows where they'd go.
   * - Only the first place in the file:  a place's Spell file holds one.
   */
  static of(text: string): WordsInFile {
    const lines = text.split("\n")
    const words: WordsInFile = { types: {} }
    let type: TypeWords | undefined
    for (let at = 0; at < lines.length; at++) {
      const line = lines[at]!
      if (!words.place && PLACE_LINE.test(line)) {
        words.place = PlaceWords.wordsUnder(lines, at, "\t")
        type = undefined
        continue
      }
      const header = TYPE_HEADER.exec(line)?.[1]
      if (header) {
        type = { ...PlaceWords.wordsUnder(lines, at, "\t"), fields: {} }
        words.types[header] = type
        continue
      }
      if (line.trim() && !line.startsWith("\t")) type = undefined
      const field = type && FIELD_LINE.exec(line)?.[1]
      if (type && field) type.fields[field] = PlaceWords.wordsUnder(lines, at, "\t\t")
    }
    return words
  }

  /**
   * The edit that makes `words` the words of `thing` in `text`:  its `--` lines replaced, or new ones put right under
   * its line;  empty `words`, its lines gone.
   * - The ingest's marks stay, after the words, as the parser reads the first comment as its description.
   * - Each line of `words` a `--` line of its own, at the thing's indent.
   * - throws `TypeError` when `thing` isn't in `text`
   */
  static edit(text: string, thing: WordsTarget, words: string): WordsEdit {
    const found = PlaceWords.of(text)
    const at =
      thing.kind === "place"
        ? found.place
        : thing.kind === "type"
          ? found.types[thing.type]
          : found.types[thing.type]?.fields[thing.field]
    if (!at) throw new TypeError(`PlaceWords.edit():  ${describe(thing)} isn't in this file;  update the place first`)
    const lines = text.split("\n")
    const offsetOf = (line: number) => lines.slice(0, line).reduce((sum, each) => sum + each.length + 1, 0)
    const said = words
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    const newText = said.map((line) => `${at.indent}-- ${line}\n`).join("")
    const start = offsetOf(at.line)
    return { start, end: start + at.wordLines.reduce((sum, each) => sum + each.length + 1, 0), newText }
  }

  /** `text` with `edit` made. */
  static applied(text: string, edit: WordsEdit): string {
    return text.slice(0, edit.start) + edit.newText + text.slice(edit.end)
  }

  /**
   * How a place's Spell file `text` and its `description` agree, for `spell place check` (epic `data` P53):
   * - `stale`:  a list the description has and the file has no type for:  a reference page would show it, the Spell
   *   can't read it;  `spell place update` writes it
   * - `unwritten`:  fields the description has and the file has no line for, by `<list>.<field>`:  not a fault, as a
   *   person may take a line out (a later look keeps it out), but its words can't be written either
   * - `orphaned`:  a person's words whose thing the description no longer has:  nothing left for them to explain
   * - `wordless`:  how many lists and fields have no words yet, of how many:  not a fault, a count
   * - A list or field the Spell leaves out on purpose (`leftOut`), or a row's id, is never counted.
   */
  static check(text: string, description: Pick<PlaceDescription, "collections">): WordsCheck {
    const found = PlaceWords.of(text)
    const check: WordsCheck = {
      stale: [],
      orphaned: [],
      unwritten: [],
      wordless: { lists: 0, fields: 0, ofLists: 0, ofFields: 0 }
    }
    const types = new Set<string>()
    for (const [key, collection] of Object.entries(description.collections)) {
      if (collection.leftOut) continue
      types.add(collection.type)
      const type = found.types[collection.type]
      check.wordless.ofLists++
      if (!type) {
        check.stale.push(`The list ${key} has no type in the Spell:  a "${collection.type}".`)
        continue
      }
      if (!type.words) check.wordless.lists++
      const fields = new Set<string>()
      for (const [name, field] of Object.entries(collection.fields)) {
        // a row's id is Spell's own, never a line of its type
        if (field.leftOut || name === (collection.idField ?? "id")) continue
        fields.add(field.words)
        const line = type.fields[field.words]
        if (!line) {
          check.unwritten.push(`${key}.${field.words}`)
          continue
        }
        check.wordless.ofFields++
        if (!line.words) check.wordless.fields++
      }
      for (const [field, words] of Object.entries(type.fields)) {
        if (words.words && !fields.has(field)) {
          check.orphaned.push(`Words for "${field}" of ${key}, which the source no longer has:  ${words.words}`)
        }
      }
    }
    for (const [type, words] of Object.entries(found.types)) {
      if (words.words && !types.has(type)) {
        check.orphaned.push(`Words for the type "${type}", which the source no longer has:  ${words.words}`)
      }
    }
    return check
  }

  /** The mark the ingest writes in `lang`:  `NEW as of 2026-11-18`. */
  static markFor(is: WordsMark["is"], date: string, lang = "en"): string {
    return `${(MARKS[lang] ?? MARKS.en!)[is]} ${date}`
  }

  /** Is `line` (its `--` and indent off, or not) one of the ingest's marks? */
  static isMark(line: string): boolean {
    return !!PlaceWords.markIn(line)
  }

  ////////////////
  // ## Reading
  ////////////////

  /** The words on the `--` lines right under line `at`, at `indent`, and the marks among them. */
  private static wordsUnder(lines: readonly string[], at: number, indent: string): ThingWords {
    const said: string[] = []
    const wordLines: string[] = []
    const marks: WordsMark[] = []
    let next = at + 1
    for (; next < lines.length; next++) {
      const line = lines[next]!
      if (!line.startsWith(`${indent}--`) || line.startsWith(`${indent}\t`)) break
      const words = line.slice(indent.length + 2).trim()
      const mark = PlaceWords.markIn(words)
      if (mark) marks.push(mark)
      else {
        said.push(words)
        wordLines.push(line)
      }
    }
    // the words go first, the marks after them:  an edit replaces only the words' lines
    const firstWords = lines.slice(at + 1, next).findIndex((line) => !PlaceWords.isMark(line.trim().slice(2).trim()))
    return {
      words: said.join("\n"),
      marks,
      line: firstWords < 0 ? at + 1 : at + 1 + firstWords,
      wordLines: firstWords < 0 ? [] : wordLines,
      indent
    }
  }

  /**
   * The mark `words` is (its `--` off, or not), in any language:  `undefined` when it's a person's words.
   * - The parser reads a field's marks with it too, off its parsed lines (`SP.PlaceFieldMarks`).
   */
  static markIn(words: string): WordsMark | undefined {
    const text = words.replace(/^--\s*/, "")
    for (const said of Object.values(MARKS)) {
      for (const is of ["new", "gone"] as const) {
        if (text.startsWith(`${said[is]} `)) return { is, date: text.slice(said[is].length + 1).trim() }
      }
    }
    return undefined
  }
}

/** Every person's words in a place's Spell file:  `PlaceWords.of()`. */
export type WordsInFile = {
  /** The place's own prose:  `undefined` in a file with no place's line. */
  place?: ThingWords
  /** Each type's, by its quoted name:  `job`. */
  types: Record<string, TypeWords>
}

/** A type's words, and its fields'. */
export type TypeWords = ThingWords & {
  /** Each field's, by its quoted words:  `status`, `display url`. */
  fields: Record<string, ThingWords>
}

/** One thing's words, and where they are. */
export type ThingWords = {
  /** Its words, a line each:  `""` for none. */
  words: string
  /** The ingest's marks on it, oldest first. */
  marks: WordsMark[]
  /** The line its words start on, from 0:  where they'd go, when it has none. */
  line: number
  /** The lines its words are on now, as written. */
  wordLines: string[]
  /** Its lines' indent:  a tab under the place and a type, two under a field. */
  indent: string
}

/** What `PlaceWords.check()` found. */
export type WordsCheck = {
  /** What the description has that the Spell doesn't, in words for people. */
  stale: string[]
  /** A person's words whose thing is gone, in words for people. */
  orphaned: string[]
  /** Fields the description has and the Spell has no line for:  `people.url`. */
  unwritten: string[]
  /** How many lists and fields in the Spell have no words yet, of how many. */
  wordless: { lists: number; fields: number; ofLists: number; ofFields: number }
}

/** One of the ingest's dated marks:  `-- NEW as of 2026-11-18`. */
export type WordsMark = {
  /** `new`:  the ingest found it new;  `gone`:  it couldn't find it any more. */
  is: "new" | "gone"
  /** When it looked:  `2026-11-18`. */
  date: string
}

/** What `PlaceWords.edit()` changes the words of. */
export type WordsTarget =
  | { kind: "place" }
  | { kind: "type"; type: string }
  | { kind: "field"; type: string; field: string }

/** An edit of a file's text:  `start` to `end` replaced by `newText`, offsets from 0. */
export type WordsEdit = { start: number; end: number; newText: string }

/** The ingest's marks, in each language a place's Spell is written in. */
const MARKS: Readonly<Record<string, Readonly<Record<WordsMark["is"], string>>>> = {
  en: { new: "NEW as of", gone: "APPARENTLY DELETED as of" },
  es: { new: "NUEVO desde el", gone: "AL PARECER BORRADO desde el" }
}

/** A place's line, in either language:  `netbox is a web server at "..."`, `estrellas es un servidor web en "..."`. */
const PLACE_LINE = /^[^\s"/-][^"\n]*? (?:is|es) (?:an?|una?) [^"\n]+? (?:at|from|en|desde) "[^"\n]+"/

/** A type's first line, in either language:  `a "job" is a thing`, `una "película" es una cosa`. */
const TYPE_HEADER = /^(?:an?|una?|el|la) "([^"]+)" (?:is|es) /

/** A field's line in a type, in either language:  `its "status" is ...`, `su "status" es ...`. */
const FIELD_LINE = /^\t(?:- )?(?:its|su) "([^"]+)" /

/** `thing`, for an error. */
function describe(thing: WordsTarget): string {
  if (thing.kind === "place") return "The place's line"
  return thing.kind === "type" ? `The type "${thing.type}"` : `The field "${thing.field}" of "${thing.type}"`
}
