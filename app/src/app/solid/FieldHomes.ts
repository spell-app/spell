import { SP } from "spell/parser/spell"
import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { SourceHomes, type FieldHomes as Homes, type HomeFile, type MadeAt } from "spell/app/lsp/SourceHomes"
import { editor } from "spell/app/app/editor"

/****************
 * ### `FieldHomes`
 * Where the Inspector's fields live in the program's source, for each thing it shows:  the line that made it, its type's
 * default (`SourceHomes.fieldHomes()`).
 * - Asked of the code's language service (`spell/fieldHomes`, `editor.askLanguage`):  the language worker's where it
 *   parses the project, so the page needs no parse of its own for them (epic `solid-2-final` T36).
 *   - Answers come a moment later:  `of()` says nothing till then, and `followers` hear each answer, so what's drawn
 *     from it is drawn again.
 *   - Each home holds the text it was read at (`seen`);  one whose text has changed since is asked again.
 *   - The Inspector's own edits move the homes along with them (`edited()`), so a dragged slider's writes keep
 *     their homes, in order, with no answer to wait for.
 * - Where there's no language service yet (the code editor isn't loaded), read from the page's own parse at once,
 *   as before.
 * - Kept for the current project only:  another project shown lets go of them all.
 * - Plain TypeScript, no Solid:  `InspectorWrites` reads it;  `Inspector` follows it.
 ****************/
export class FieldHomes {
  /**
   * Where `names` of `thing` live, if they're known and still where they were read;  else `undefined`, and they're
   * asked for.
   * - NEVER throws.
   */
  static of(thing: object, names: readonly string[]): Homes | undefined {
    if (!editor.askLanguage) return FieldHomes.readHere(thing, names)
    const entry = FieldHomes.entryOf(thing)
    for (const name of names) entry.names.add(name)
    const { homes } = entry
    if (homes && !homes.behind && names.every((name) => name in homes.start) && FieldHomes.isStill(homes)) return homes
    FieldHomes.ask(thing, entry)
    return undefined
  }

  /**
   * The types the current project has only one thing of (`solitaire is an app`):  `InspectorWrites.isOneOfAKind()`.
   * - `undefined` until the language service has said, and asked for then.
   */
  static onlyTypes(thing: object): readonly string[] | undefined {
    if (!editor.askLanguage) return FieldHomes.onlyTypesHere()
    const answer = FieldHomes.entryOf(thing).homes?.onlyTypes ?? FieldHomes.known?.onlyTypes
    if (!answer) FieldHomes.ask(thing, FieldHomes.entryOf(thing))
    return answer
  }

  /**
   * Resolves once `thing`'s homes for `names` have been asked and answered:  at once when they're known.
   * - NEVER rejects.
   */
  static asked(thing: object, names: readonly string[]): Promise<void> {
    if (FieldHomes.of(thing, names)) return Promise.resolve()
    return FieldHomes.entryOf(thing).asking ?? Promise.resolve()
  }

  /**
   * Run `write` once `thing`'s homes are known:  at once if they are, else after the answer, in the order asked.
   * - What runs late runs with `late` set, so it doesn't wait again.
   */
  static whenKnown(thing: object, write: (late: boolean) => void): void {
    const entry = FieldHomes.entryOf(thing)
    if (!entry.waiting.length && !entry.asking) return write(false)
    entry.waiting.push(() => write(true))
    FieldHomes.ask(thing, entry)
  }

  /**
   * The Inspector changed file `path`:  `removed` characters at `at` became `inserted` ones, giving `text`.
   * - Every home known in that file moves along with the change;  one the change was inside now holds its new text.
   * - A field that wasn't written yet, now written by the change, is asked again:  its home has a new shape.
   */
  static edited(path: string, text: string, at: number, removed: number, inserted: number): void {
    const change = { at, removed, inserted }
    for (const entry of FieldHomes.entries.values()) {
      const { homes } = entry
      if (!homes) continue
      for (const [name, home] of Object.entries(homes.making)) {
        if (!home || home.file !== path) continue
        if (home.kind === "notWritten" && SourceHomes.touches(home.anchor, change)) {
          entry.homes = undefined
          break
        }
        homes.making[name] = SourceHomes.moved(home, change, text)
      }
      if (!entry.homes) continue
      for (const [name, home] of Object.entries(homes.start)) {
        if (home?.file === path) homes.start[name] = SourceHomes.moved(home, change, text)
      }
    }
  }

  /** Called after each answer, so what's drawn from the homes is drawn again. */
  static readonly followers = new Set<() => void>()

  ////////////////
  // ## Asking
  ////////////////

  /** Ask the language service for `entry`'s homes, unless it's asking already. */
  private static ask(thing: object, entry: Entry): void {
    if (entry.asking) return
    const ask = editor.askLanguage
    const files = FieldHomes.filesHere()
    const made = madeAt(thing, files)
    const file = made ? FieldHomes.spellFileNamed(made.path) : editor.project && editor.languageFileOf(editor.project)
    if (!ask || !file) return
    const names = [...entry.names]
    entry.asking = ask(file, "spell/fieldHomes", { made, typeNames: typeNamesOf(thing), names })
      .then((homes) => {
        if (homes) {
          entry.homes = homes
          FieldHomes.known = homes
        }
      })
      .catch((error: unknown) => console.error("FieldHomes:  couldn't ask where the fields live", error))
      .finally(() => {
        entry.asking = undefined
        const waiting = entry.waiting.splice(0)
        for (const write of waiting) write()
        for (const follower of FieldHomes.followers) follower()
      })
  }

  /** Are all of `homes` still where they were read, in the files' text now? */
  private static isStill(homes: Homes): boolean {
    const texts = new Map(FieldHomes.filesHere().map((file) => [file.path, file.contents]))
    const all = [...Object.values(homes.making), ...Object.values(homes.start)]
    return all.every((home) => !home || SourceHomes.isStill(home, texts.get(home.file) ?? ""))
  }

  ////////////////
  // ## Read on the page
  ////////////////

  /** `names` of `thing`'s homes read from the page's own parse:  where no language service is loaded yet. */
  private static readHere(thing: object, names: readonly string[]): Homes {
    const files = FieldHomes.filesHere()
    return { ...SourceHomes.fieldHomes(files, madeAt(thing, files), typeNamesOf(thing), names), onlyTypes: undefined }
  }

  /** The types the current project has only one thing of, from the page's own parse. */
  private static onlyTypesHere(): string[] {
    const variables = editor.project?.scope?.variables?.get() ?? []
    return variables.flatMap((variable) =>
      variable.kind === "only" && typeof variable.datatype === "string" ? [variable.datatype] : []
    )
  }

  /** The current project's spell files, as `SourceHomes` reads them:  their text as the page has it now. */
  static filesHere(): HomeFile[] {
    return (editor.project?.spellFiles ?? []).flatMap((file) =>
      file.contents === undefined ? [] : [{ path: pathOf(file), contents: file.contents, match: file.match }]
    )
  }

  /** The current project's spell file the compiler's marks call `path`. */
  private static spellFileNamed(path: string): SP.SpellFile | undefined {
    return editor.project?.spellFiles.find((file) => pathOf(file) === path) as SP.SpellFile | undefined
  }

  ////////////////
  // ## The entries
  ////////////////

  /** `thing`'s entry, made if need be;  another project's let go of first. */
  private static entryOf(thing: object): Entry {
    if (FieldHomes.project !== editor.project) {
      FieldHomes.project = editor.project
      FieldHomes.entries.clear()
      FieldHomes.known = undefined
    }
    let entry = FieldHomes.entries.get(thing)
    if (!entry) FieldHomes.entries.set(thing, (entry = { names: new Set(), waiting: [] }))
    return entry
  }

  /** The project the entries are of. */
  private static project: SP.SpellProject | undefined

  /** What's known of each thing the Inspector showed. */
  private static readonly entries = new Map<object, Entry>()

  /** The last answer:  the project's `onlyTypes`, for a thing not asked about yet. */
  private static known: Homes | undefined
}

////////////////
// ## Types
////////////////

/** What's known, and asked, of one thing's homes. */
type Entry = {
  /** the fields ever asked about */
  names: Set<string>
  /** the last answer */
  homes?: Homes
  /** the question on its way */
  asking?: Promise<void>
  /** writes waiting for the answer, in order */
  waiting: (() => void)[]
}

////////////////
// ## Helpers
////////////////

/** Where `thing` was made, as the compiler marked it, among `files`. */
function madeAt(thing: object, files: readonly HomeFile[]): MadeAt | undefined {
  const place = SourceMarks.placeOfThing(thing)
  const file = place && files.find((each) => each.path === place.path)
  if (!place || !file) return undefined
  return {
    path: place.path,
    offset: SourceEdits.offsetAt(file.contents, { line: place.line, character: place.column })
  }
}

/** `file`'s name in its project, as the compiler's marks name it. */
function pathOf(file: SP.AnySpellFile): string {
  return SP.SpellLocation.filePathOf(file.path)?.replace(/^\//, "") ?? file.path
}

/** The names of `thing`'s class and those it inherits, its own first:  as the type's written in spell. */
export function typeNamesOf(thing: object): string[] {
  const names: string[] = []
  for (
    let proto = Object.getPrototypeOf(thing) as object | null;
    proto && proto !== Object.prototype;
    proto = Object.getPrototypeOf(proto)
  ) {
    const { name } = proto.constructor
    if (name) names.push(name)
  }
  return names
}
