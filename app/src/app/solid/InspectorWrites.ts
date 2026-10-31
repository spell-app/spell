import { SP } from "spell/parser/spell"
import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import { SourceEdits, type TextSpan } from "spell/app/lsp/SourceEdits"
import { SourceHomes, type FileHome, type FieldHome } from "spell/app/lsp/SourceHomes"
import { editor, runtimeCore } from "spell/app/app/editor"
import { textAt, type TextChange } from "spell/app/app/EditorHistory"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { SpellElement } from "spell/app/app/runner/SpellElement"

/**
 * What a change in the Inspector does to the program's source (epic `editor`, "Side-bar edits write the source").
 * - The field has already written the running app:  this adds the same change to the file's text, as a step of
 *   `editor.history`.
 * - Each field acts on its home (`SourceHomes`):  written or not yet on its tag, on the line that made the thing,
 *   its type's default.
 * - Code, or set while running:  nothing is written, and it answers why, for the Inspector to say.
 * - Plain TypeScript, no Solid:  `<ui-property-editor>`'s `ui-changed` calls it.
 */
export class InspectorWrites {
  /**
   * Field `name` of what's inspected became `value`:  write it to the source.
   * - `element`:  the drawn element, when it's one;  `value` of a thing's field when it isn't.
   * - Answers what couldn't be written, for the Inspector's note;  `undefined` when it was.
   * - NEVER throws:  a failure is logged, and the running app keeps the change.
   */
  static written(part: WrittenPart, name: string, value: unknown): NotWritten | undefined {
    try {
      return part.element && !SpellElement.thingOf(part.element)
        ? InspectorWrites.writeTag(part.element, name, value)
        : InspectorWrites.writeProperty(part.value, name, value)
    } catch (error) {
      console.error(`InspectorWrites.written():  couldn't write ${name} to the source:`, error)
      return { reason: "running" }
    }
  }

  ////////////////
  // ## A drawn element's
  ////////////////

  /** Attribute (or text) `name` of drawn `element` became `value`. */
  private static writeTag(element: Element, name: string, value: unknown): NotWritten | undefined {
    const place = SourceMarks.placeOfDrawn(element)
    const file = place && InspectorWrites.fileNamed(place.path)
    if (!place || !file) return { reason: "running" }
    const text = file.contents ?? ""
    const opening = SourceEdits.offsetAt(text, { line: place.line, character: place.column })
    const home =
      name === TEXT_FIELD ? SourceHomes.ofTagText(text, opening) : SourceHomes.ofAttribute(text, opening, name)
    if (!home) return { reason: "running" }
    if (home.kind === "expression") return { reason: "expression", file: place.path, span: home.span }
    InspectorWrites.apply(file, home, name, value)
    return undefined
  }

  ////////////////
  // ## A thing's
  ////////////////

  /** Property `name` of `thing` became `value`. */
  private static writeProperty(thing: object, name: string, value: unknown): NotWritten | undefined {
    const files = editor.project?.spellFiles ?? []
    const homeFiles = files.flatMap((file) =>
      file.contents === undefined ? [] : [{ path: pathOf(file), contents: file.contents, match: file.match, file }]
    )
    const place = SourceMarks.placeOfThing(thing)
    const madeFile = place && homeFiles.find((file) => file.path === place.path)
    const made = place &&
      madeFile && {
        path: place.path,
        offset: SourceEdits.offsetAt(madeFile.contents, { line: place.line, character: place.column })
      }
    const home = SourceHomes.ofProperty(homeFiles, { made, typeNames: typeNamesOf(thing), name })
    if (home.kind === "running") return { reason: "running" }
    if (home.kind === "expression") return { reason: "expression", file: home.file, span: home.span }
    const file = homeFiles.find((each) => each.path === home.file)!.file
    const live = home.kind === "default" ? InspectorWrites.baseEdit(thing, name, file, home, value) : undefined
    InspectorWrites.apply(file, home, name, value, live)
    return undefined
  }

  /**
   * A change to a type's default shows on every thing still holding the old one, as the recompile's carrying over would
   * hide it:  those things keep their values.
   * - Sets them now, and answers how to put them back.
   */
  private static baseEdit(
    thing: object,
    name: string,
    file: SP.AnySpellFile,
    home: Extract<FileHome, { style: unknown }>,
    value: unknown
  ) {
    const old = SourceHomes.valueOfLiteral(textAt(file.contents ?? "", home.span), home.style)
    const sameType = (each: object) => each instanceof (thing.constructor as new () => object)
    const allOfType = () => (runtimeCore()?.things.all() ?? []).filter(sameType) as unknown as Record<string, unknown>[]
    const setAll = (from: unknown, to: unknown) => {
      for (const each of allOfType()) if (each[name] === from) each[name] = to
    }
    setAll(old, value)
    return (way: "undo" | "redo") => (way === "undo" ? setAll(value, old) : setAll(old, value))
  }

  ////////////////
  // ## Making the edit
  ////////////////

  /** Make the edit `home` calls for, as a step of `editor.history`. */
  private static apply(
    file: SP.AnySpellFile,
    home: FieldHome,
    name: string,
    value: unknown,
    live?: (way: "undo" | "redo") => void
  ): void {
    const text = file.contents ?? ""
    if (home.kind === "expression") return
    const after = SourceEdits.applied(text, InspectorWrites.editsFor(text, home, value))
    const grown = after.length - text.length
    const { anchor } = home
    const change: TextChange = {
      file,
      at: anchor.start,
      before: textAt(text, anchor),
      after: after.slice(anchor.start, anchor.end + grown)
    }
    if (change.before === change.after) return
    editor.history.change(change, {
      title: appTexts.text("changeField", { field: wordsOfName(name) }),
      // a run of changes to this field folds into one step
      target: `${file.path}:${anchor.start}:${name}`,
      live
    })
  }

  /** The edits writing `value` to `home`. */
  private static editsFor(text: string, home: Exclude<FieldHome, { kind: "expression" }>, value: unknown) {
    if (home.place === "attribute") {
      return SourceEdits.settingAttribute(text, home.opening, home.word, value as string | number | boolean)
    }
    if (home.place === "text") return [SourceEdits.replacing(text, home.span, String(value))]
    return [SourceEdits.replacing(text, home.span, SourceHomes.literalFor(value, home.style))]
  }

  /** The program's spell file the compiler's marks call `path`. */
  private static fileNamed(path: string): SP.AnySpellFile | undefined {
    return editor.project?.spellFiles.find((file) => pathOf(file) === path)
  }
}

////////////////
// ## Types
////////////////

/** What `InspectorWrites.written()` is told about what's inspected. */
export type WrittenPart = {
  /** its element, when it's drawn */
  element?: Element
  /** the thing or element its fields are bound to */
  value: object
}

/** Why a change wasn't written to the source, and where to look. */
export type NotWritten =
  | { reason: "running" }
  | {
      reason: "expression"
      /** the file holding the code */
      file: string
      /** the code */
      span: TextSpan
    }

////////////////
// ## Helpers
////////////////

/** The field for an element's own text:  `<Inspector>`'s text row. */
const TEXT_FIELD = "textContent"

/** `file`'s name in its project, as the compiler's marks name it. */
function pathOf(file: SP.AnySpellFile): string {
  return SP.SpellLocation.filePathOf(file.path)?.replace(/^\//, "") ?? file.path
}

/** The names of `thing`'s class and those it inherits, its own first:  as the type's written in spell. */
function typeNamesOf(thing: object): string[] {
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

/** A field's name for a step's title:  `shortName` => `Short Name`. */
function wordsOfName(name: string): string {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2")
  return words.replace(/(^| )(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase())
}
