import { SP } from "spell/parser/spell"
import type { PropertyOrigin } from "spell/ui/components/ui-property-editor/UIPropertyEditor.types"
import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import { SourceEdits, type TextSpan } from "spell/app/lsp/SourceEdits"
import {
  SourceHomes,
  type FileHome,
  type FieldHome,
  type HomeFile,
  type LiteralStyle,
  type MakingHome
} from "spell/app/lsp/SourceHomes"
import { editor, runtimeCore } from "spell/app/app/editor"
import { textAt, type TextChange } from "spell/app/app/EditorHistory"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { ClassSchemas } from "spell/app/app/ui/ClassSchemas"
import { SpellElement } from "spell/app/app/runner/SpellElement"

/**
 * What a change in the Inspector does to the program's source (epic `editor`, "Side-bar edits write the source").
 * - The field has already written the running app:  this adds the same change to the file's text, as a step of
 *   `editor.history`.
 * - Each field acts on its home (`SourceHomes`):  written or not yet on its tag;  and for a thing, by what the person
 *   chose (`InspectorScope`):
 *   - "This one":  the line that made it, adding it there if the line doesn't say it
 *   - "All of them":  its type's default, and every thing still holding the old one
 * - A thing made in a loop has no line of its own, so "This one" writes nothing:  it's there to play with.
 * - A type whose `to create it` sets a property sets it AFTER what the line says (`Thing`'s constructor), so a line can't
 *   change it:  "This one" writes nothing there, and says only "All of them" can.
 * - What a line says is the line's:  "All of them" can't reach it, so that field is read only there, with a way to the code.
 * - Code, or nothing to change:  nothing is written, and it answers why, for the Inspector to say.
 * - Plain TypeScript, no Solid:  `<ui-property-editor>`'s `ui-changed` calls it.
 */
export class InspectorWrites {
  /**
   * Field `name` of what's inspected became `value`:  write it to the source.
   * - `element`:  the drawn element, when it's one;  `value` of a thing's field when it isn't.
   * - Answers what couldn't be written, for the Inspector's note;  `undefined` when it was.
   * - NEVER throws:  a failure is logged, and the running app keeps the change.
   */
  static written(part: WrittenPart, name: string, value: unknown, scope: InspectorScope): NotWritten | undefined {
    try {
      return part.element && !SpellElement.thingOf(part.element)
        ? InspectorWrites.writeTag(part.element, name, value)
        : InspectorWrites.writeProperty(part.value, name, value, scope)
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
    InspectorWrites.apply(file, { anchor: home.anchor, edits: InspectorWrites.editsFor(file, home, value) }, name)
    return undefined
  }

  ////////////////
  // ## A thing's
  ////////////////

  /** Property `name` of `thing` became `value`, for "this one" or "all of them". */
  private static writeProperty(
    thing: object,
    name: string,
    value: unknown,
    scope: InspectorScope
  ): NotWritten | undefined {
    const files = homeFiles()
    const made = madeAt(thing, files)
    if (scope === "this") {
      if (!InspectorWrites.hasOwnLine(thing) || !made) return { reason: "playing" }
      if (SourceHomes.ofDefault(files, typeNamesOf(thing), name)) return { reason: "typeSets" }
      const home = SourceHomes.ofMaking(made.file, made.offset, name)
      if (!home) return { reason: "running" }
      if (home.kind === "expression") return { reason: "expression", file: home.file, span: home.span }
      const file = made.file.file
      if (home.kind === "notWritten") {
        const words = InspectorWrites.addedToMaking(file, home, thing, name, value)
        return words
          ? (InspectorWrites.apply(file, { anchor: home.anchor, edits: [words] }, name), undefined)
          : { reason: "running" }
      }
      InspectorWrites.apply(file, { anchor: home.anchor, edits: InspectorWrites.editsFor(file, home, value) }, name)
      return undefined
    }
    // all of them:  what the type sets;  else what a line says is that line's
    const home = SourceHomes.ofDefault(files, typeNamesOf(thing), name)
    const onLine = made && SourceHomes.ofMaking(made.file, made.offset, name)
    if (!home && onLine && onLine.kind !== "notWritten") {
      return { reason: "expression", file: onLine.file, span: lineSpan(onLine) }
    }
    if (!home) return { reason: "noStart" }
    if (home.kind === "expression") return { reason: "expression", file: home.file, span: home.span }
    const file = files.find((each) => each.path === home.file)!.file
    const live = home.kind === "default" ? InspectorWrites.baseEdit(thing, name, file, home, value) : undefined
    InspectorWrites.apply(file, { anchor: home.anchor, edits: InspectorWrites.editsFor(file, home, value), live }, name)
    return undefined
  }

  /**
   * Was `thing` the only one made by the line that made it?
   * - no:  made in a loop, so it has no line of its own;  no mark at all:  a widget or the runtime made it.
   * - Counts every thing, drawn or not.
   */
  static hasOwnLine(thing: object): boolean {
    const place = SourceMarks.placeOfThing(thing)
    if (!place) return false
    const things = (runtimeCore()?.things.all() ?? []) as unknown as object[]
    const sameLine = things.filter((each) => {
      const other = SourceMarks.placeOfThing(each)
      return other && other.path === place.path && other.line === place.line && other.column === place.column
    })
    return sameLine.length <= 1
  }

  /**
   * Which side a thing's switch starts on:  this one, for what has a line of its own;  else all of them,
   * unless nothing there can change, as for a card a deck makes in a loop:  then this one, to play with.
   */
  static startingScope(thing: object, names: readonly string[]): InspectorScope {
    if (InspectorWrites.hasOwnLine(thing)) return "this"
    const origins = InspectorWrites.originsOf({ value: thing }, names, "all")
    return names.some((name) => origins[name]?.kind !== "worked out") ? "all" : "this"
  }

  ////////////////
  // ## Where each field's value comes from
  ////////////////

  /**
   * Where each of `names` comes from, as `<ui-property-editor origins>` shows it.
   * - NEVER throws:  while the parse is behind the text, what's shown stays quiet.
   */
  static originsOf(part: WrittenPart, names: readonly string[], scope: InspectorScope): Record<string, PropertyOrigin> {
    const origins: Record<string, PropertyOrigin> = {}
    for (const name of names) {
      try {
        const origin =
          part.element && !SpellElement.thingOf(part.element)
            ? originOnTag(part.element, name)
            : originOfProperty(part.value, name, scope)
        if (origin) origins[name] = origin
      } catch (ignored) {
        // the parse is behind the text for a moment:  it's read again once it's parsed
      }
    }
    return origins
  }

  ////////////////
  // ## Reset
  ////////////////

  /**
   * Take field `name` off the source, so it's no longer set here, and the running app with it.
   * - NEVER throws:  a failure is logged, and nothing changes.
   */
  static reset(part: WrittenPart, name: string): void {
    try {
      if (part.element && !SpellElement.thingOf(part.element)) InspectorWrites.resetTag(part.element, name)
      else InspectorWrites.resetProperty(part.value, name)
    } catch (error) {
      console.error(`InspectorWrites.reset():  couldn't reset ${name}:`, error)
    }
  }

  /** Take attribute `name` off `element`'s tag, and off the element. */
  private static resetTag(element: Element, name: string): void {
    const place = SourceMarks.placeOfDrawn(element)
    const file = place && InspectorWrites.fileNamed(place.path)
    if (!place || !file) return
    const text = file.contents ?? ""
    const opening = SourceEdits.offsetAt(text, { line: place.line, character: place.column })
    const home = SourceHomes.ofAttribute(text, opening, name)
    if (home?.kind !== "written") return
    const old = element.getAttribute(name)
    const live = (way: "undo" | "redo") => {
      if (way === "undo" && old !== null) element.setAttribute(name, old)
      else element.removeAttribute(name)
    }
    live("redo")
    const edits = SourceEdits.settingAttribute(text, opening, name, undefined)
    InspectorWrites.apply(file, { anchor: home.anchor, edits, live, isReset: true }, name)
  }

  /** Take property `name` off the line that made `thing`, and put it back to its type's default. */
  private static resetProperty(thing: object, name: string): void {
    const files = homeFiles()
    const made = madeAt(thing, files)
    const home = made && SourceHomes.ofMaking(made.file, made.offset, name)
    if (!made || !home || home.kind === "notWritten" || !home.removal) return
    const file = made.file.file
    const record = thing as Record<string, unknown>
    const old = record[name]
    const start = SourceHomes.ofDefault(files, typeNamesOf(thing), name)
    const live =
      start?.kind === "default"
        ? (way: "undo" | "redo") => {
            const text = textAt(fileOf(files, start.file).contents ?? "", start.span)
            record[name] = way === "undo" ? old : SourceHomes.valueOfLiteral(text, start.style)
          }
        : undefined
    live?.("redo")
    const edits = [SourceEdits.replacing(file.contents ?? "", home.removal, "")]
    InspectorWrites.apply(file, { anchor: home.anchor, edits, live, isReset: true }, name)
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
      // a value its type declares (`its "layout" is stacked`) has no setter:  the recompile shows it
      for (const each of allOfType()) if (each[name] === from) Reflect.set(each, name, to)
    }
    setAll(old, value)
    return (way: "undo" | "redo") => (way === "undo" ? setAll(value, old) : setAll(old, value))
  }

  ////////////////
  // ## Making the edit
  ////////////////

  /** Make `edits`, as a step of `editor.history`. */
  private static apply(file: SP.AnySpellFile, step: EditStep, name: string): void {
    const text = file.contents ?? ""
    const { anchor, edits, live } = step
    const after = SourceEdits.applied(text, edits)
    const grown = after.length - text.length
    const change: TextChange = {
      file,
      at: anchor.start,
      before: textAt(text, anchor),
      after: after.slice(anchor.start, anchor.end + grown)
    }
    if (change.before === change.after) return
    editor.history.change(change, {
      title: appTexts.text("changeField", { field: wordsOfName(name) }),
      // a run of changes to this field folds into one step;  a reset is a step of its own
      target: step.isReset ? undefined : `${file.path}:${anchor.start}:${name}`,
      live
    })
  }

  /** The edits writing `value` to `home`. */
  private static editsFor(file: SP.AnySpellFile, home: Exclude<FieldHome, { kind: "expression" }>, value: unknown) {
    const text = file.contents ?? ""
    if (home.place === "attribute") {
      return SourceEdits.settingAttribute(text, home.opening, home.word, value as string | number | boolean)
    }
    if (home.place === "text") return [SourceEdits.replacing(text, home.span, String(value))]
    return [SourceEdits.replacing(text, home.span, SourceHomes.literalFor(value, home.style, languageOf(file)))]
  }

  /**
   * The edit adding `name = value` to a making's line:  `a new counter with count = 5`.
   * - `undefined`:  a file in another language, whose words for a property can't be made from its name.
   */
  private static addedToMaking(file: SP.AnySpellFile, home: MakingHome, thing: object, name: string, value: unknown) {
    if (languageOf(file) !== "en") return undefined
    const text = file.contents ?? ""
    const words = wordsOfName(name).toLowerCase()
    const said = `${words} = ${SourceHomes.literalFor(value, literalStyleOf(thing, name, value))}`
    return SourceEdits.replacing(text, { start: home.at, end: home.at }, home.hasWith ? `, ${said}` : ` with ${said}`)
  }

  /** The program's spell file the compiler's marks call `path`. */
  private static fileNamed(path: string): SP.AnySpellFile | undefined {
    return editor.project?.spellFiles.find((file) => pathOf(file) === path)
  }
}

////////////////
// ## Types
////////////////

/** What a change to a thing's field means:  to this one, or to all of its type (`<ScopeSwitch>`). */
export type InspectorScope = "this" | "all"

/** One change to a file, ready to be a step. */
type EditStep = {
  /** what finds it again */
  anchor: TextSpan
  /** the change */
  edits: ReturnType<typeof SourceEdits.replacing>[]
  /** what it does to the running app, and undoes */
  live?: (way: "undo" | "redo") => void
  /** it takes the field off the source:  never folded into the changes before it */
  isReset?: boolean
}

/** What `InspectorWrites.written()` is told about what's inspected. */
export type WrittenPart = {
  /** its element, when it's drawn */
  element?: Element
  /** the thing or element its fields are bound to */
  value: object
}

/** Why a change wasn't written to the source, and where to look. */
export type NotWritten =
  // the app set it as it ran
  | { reason: "running" }
  // this one of many, made in a loop:  a change to it is only to play with
  | { reason: "playing" }
  // no type starts it, so all of them have nothing to change
  | { reason: "noStart" }
  // its type's `to create it` sets it after the line that made this one:  only all of them can change it
  | { reason: "typeSets" }
  // nothing of it can change for all of them:  each one's values come from the code that makes it
  | { reason: "allFromCode" }
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

/** The language `file` is written in. */
function languageOf(file: SP.AnySpellFile): string {
  return file instanceof SP.SpellFile ? file.language.lang : "en"
}

/** The project's spell files, as `SourceHomes` reads them. */
function homeFiles(): (HomeFile & { file: SP.AnySpellFile })[] {
  return (editor.project?.spellFiles ?? []).flatMap((file) =>
    file.contents === undefined ? [] : [{ path: pathOf(file), contents: file.contents, match: file.match, file }]
  )
}

/** The file called `path`, among `files`. */
function fileOf(files: ReturnType<typeof homeFiles>, path: string): SP.AnySpellFile {
  return files.find((each) => each.path === path)!.file
}

/** Where `thing` was made, among `files`, as the compiler marked it. */
function madeAt(thing: object, files: ReturnType<typeof homeFiles>) {
  const place = SourceMarks.placeOfThing(thing)
  const file = place && files.find((each) => each.path === place.path)
  if (!place || !file) return undefined
  return { file, offset: SourceEdits.offsetAt(file.contents, { line: place.line, character: place.column }) }
}

/** What a home's value is written as:  its span, which `Inspector.showCode()` selects. */
function lineSpan(home: FileHome): TextSpan {
  return "span" in home ? home.span : home.anchor
}

/** How `value` is written for `thing`'s property `name`:  a word of its enumeration, when it has one. */
function literalStyleOf(thing: object, name: string, value: unknown): LiteralStyle {
  if (typeof value === "number") return "number"
  if (typeof value === "boolean") return "boolean"
  const spec = ClassSchemas.fromClass(thing.constructor).attributes.find((attribute) => attribute.name === name)
  return spec?.type === "choice" || spec?.values ? "word" : "text"
}

/** Where attribute `name` of drawn `element` comes from. */
function originOnTag(element: Element, name: string): PropertyOrigin | undefined {
  const place = SourceMarks.placeOfDrawn(element)
  const file = place && (editor.project?.spellFiles ?? []).find((each) => pathOf(each) === place.path)
  if (!place || !file) return undefined
  const text = file.contents ?? ""
  const opening = SourceEdits.offsetAt(text, { line: place.line, character: place.column })
  const home = name === TEXT_FIELD ? SourceHomes.ofTagText(text, opening) : SourceHomes.ofAttribute(text, opening, name)
  if (!home) return undefined
  if (home.kind === "expression")
    return { kind: "inherited", from: appTexts.text("inspectorOriginCode"), action: SHOW_CODE }
  if (home.kind === "written") {
    const canReset = home.place === "attribute"
    return { kind: "here", from: appTexts.text("inspectorOriginHere"), action: canReset ? RESET : undefined }
  }
  return { kind: "inherited", from: appTexts.text("inspectorOriginNotSet") }
}

/** Where property `name` of `thing` comes from, seen from `scope`. */
function originOfProperty(thing: object, name: string, scope: InspectorScope): PropertyOrigin | undefined {
  const files = homeFiles()
  const made = madeAt(thing, files)
  const onLine = made && SourceHomes.ofMaking(made.file, made.offset, name)
  const says = onLine && onLine.kind !== "notWritten"
  const start = SourceHomes.ofDefault(files, typeNamesOf(thing), name)
  if (scope === "all") {
    // what the type sets, it sets after the line
    if (start?.kind === "expression") {
      return { kind: WORKED_OUT, from: appTexts.text("inspectorOriginCode"), action: SHOW_CODE }
    }
    if (start) return { kind: "here", from: appTexts.text("inspectorOriginAll", { type: start.typeName }) }
    if (says) return { kind: WORKED_OUT, from: appTexts.text("inspectorOriginLine"), action: SHOW_CODE }
    return { kind: WORKED_OUT, from: appTexts.text("inspectorOriginNoStart") }
  }
  // this one
  if (!InspectorWrites.hasOwnLine(thing)) {
    return { kind: "inherited", from: appTexts.text(says ? "inspectorOriginLine" : "inspectorOriginNotSet") }
  }
  if (start) return { kind: "inherited", from: appTexts.text("inspectorOriginType", { type: start.typeName }) }
  if (says && onLine.kind === "expression") {
    return { kind: WORKED_OUT, from: appTexts.text("inspectorOriginCode"), action: SHOW_CODE }
  }
  if (says) return { kind: "here", from: appTexts.text("inspectorOriginHere"), action: RESET }
  return { kind: "inherited", from: appTexts.text("inspectorOriginNotSet") }
}

/** `PropertyOrigin`'s words used here. */
const WORKED_OUT = "worked out"
const RESET = "reset"
const SHOW_CODE = "show code"

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
