import { SP } from "spell/parser/spell"
import type { PropertyOrigin } from "spell/ui/components/ui-property-editor/UIPropertyEditor.types"
import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import { SourceEdits, type AttributeValue, type TextSpan } from "spell/app/lsp/SourceEdits"
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
import { FieldHomes } from "./FieldHomes"

/**
 * What a change in the Inspector does to the program's source (epic `editor`, "Side-bar edits write the source").
 * - The field has already written the running app:  this adds the same change to the file's text, as a step of
 *   `editor.history`.
 * - Each field acts on its home (`SourceHomes`):  written or not yet on its tag;  and for a thing, by what the person
 *   chose (`InspectorScope`), asked of the language worker (`FieldHomes`):
 *   - "This one":  the line that made it, adding it there if the line doesn't say it
 *   - "All of them":  its type's default, and every thing still holding the old one
 * - A thing made in a loop has no line of its own, so "This one" writes nothing:  it's there to play with.
 * - A type whose `when creating a ...` sets a property sets it AFTER what the line says (`Thing`'s constructor), so a line can't
 *   change it:  "This one" writes nothing there, and says only "All of them" can.
 * - What a line says is the line's:  "All of them" can't reach it, so that field is read only there, with a way to the code.
 * - Code, or nothing to change:  nothing is written, and it answers why, for the Inspector to say.
 * - Plain TypeScript, no Solid:  `<ui-property-editor>`'s `ui-changed` calls it.
 */
export class InspectorWrites {
  /**
   * Field `name` of what's inspected became `value`:  write it to the source.
   * - `element`:  the drawn element, when it's one;  `value` of a thing's field when it isn't.
   * - Answers what couldn't be written, for the Inspector's note;  `undefined` when it was, or will be.
   * - A thing's field whose homes aren't known yet (`FieldHomes`) is written once they are, in the order changed:
   *   what can't be written then is told to `whenNotWrittenLate`.
   * - NEVER throws:  a failure is logged, and the running app keeps the change.
   */
  static written(part: WrittenPart, name: string, value: unknown, scope: InspectorScope): NotWritten | undefined {
    try {
      if (part.element && !SpellElement.thingOf(part.element))
        return InspectorWrites.writeTag(part.element, name, value)
      const thing = part.value
      if (FieldHomes.of(thing, [name])) return InspectorWrites.writeProperty(thing, name, value, scope)
      FieldHomes.whenKnown(thing, (late) => {
        const why = InspectorWrites.writeProperty(thing, name, value, scope)
        if (why && late) InspectorWrites.whenNotWrittenLate?.(part, name, why)
      })
      return undefined
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
    const homes = FieldHomes.of(thing, [name])
    if (!homes) return { reason: "running" }
    if (scope === "this") {
      if (!InspectorWrites.hasOwnLine(thing) || !made) return { reason: "playing" }
      if (homes.start[name]) return { reason: "typeSets" }
      const onTag = tagHomeOf(made, name)
      if (onTag) return InspectorWrites.writeMadeByTag(made.file, onTag, thing, name, value)
      const home = homes.making[name]
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
    const home = homes.start[name]
    const onTag = made && tagHomeOf(made, name)
    if (!home && made && onTag && onTag.kind !== "notWritten") {
      return { reason: "expression", file: made.file.path, span: onTag.anchor }
    }
    const onLine = made && !onTag && homes.making[name]
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
   * Property `name` of `thing`, made by a tag in a drawing (`<foundation "clubs" suit=clubs/>`), became `value`:
   * the tag's attribute says it, as its own line would (epic `language` I143).
   * - Keeps the attribute as written:  a bare word stays bare;  a new one is bare for a choice's word
   *   (`suit=hearts`), else quoted.
   */
  private static writeMadeByTag(
    made: HomeFile & { file: SP.AnySpellFile },
    home: FieldHome,
    thing: object,
    name: string,
    value: unknown
  ): NotWritten | undefined {
    if (home.kind === "expression") return { reason: "expression", file: made.path, span: home.span }
    if (home.place !== "attribute") return { reason: "running" }
    const quote = literalStyleOf(thing, name, value) === "word" ? "bare" : '"'
    const edits = SourceEdits.settingAttribute(made.contents, home.opening, name, value as AttributeValue, quote)
    InspectorWrites.apply(made.file, { anchor: home.anchor, edits }, name)
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
   * Can field `name` of `part` be written now?  A drawn element's always;  a thing's once where it lives is known
   * (`FieldHomes`).
   */
  static knowsHomes(part: WrittenPart, name: string): boolean {
    if (part.element && !SpellElement.thingOf(part.element)) return true
    return !!FieldHomes.of(part.value, [name])
  }

  /**
   * Is `thing` the only one its program can have of its type, so "this one" and "all of them" are the same?
   * (epic `editor` I183)
   * - A one of a kind:  a type and its one thing declared together, `solitaire is an app`,
   *   `leaderboard is a page`, a site, a place (`family cookbook is a web server at ...`).
   *   The parse says so:  its thing is a variable of kind `only` in the project's scope, as the language worker
   *   answers (`FieldHomes.onlyTypes()`);  until it has, no.
   * - The program's app (`core.RUNTIME.app`), however it's declared:  a program has one app.
   *   So it holds before any parse, while the program runs from a kept compile.
   */
  static isOneOfAKind(thing: object): boolean {
    if (runtimeCore()?.RUNTIME?.app === thing) return true
    return FieldHomes.onlyTypes(thing)?.includes(thing.constructor.name) ?? false
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
   * - A thing's field whose homes aren't known yet (`FieldHomes`) is reset once they are.
   * - NEVER throws:  a failure is logged, and nothing changes.
   */
  static reset(part: WrittenPart, name: string): void {
    try {
      if (part.element && !SpellElement.thingOf(part.element)) return InspectorWrites.resetTag(part.element, name)
      const thing = part.value
      if (FieldHomes.of(thing, [name])) return InspectorWrites.resetProperty(thing, name)
      FieldHomes.whenKnown(thing, () => InspectorWrites.resetProperty(thing, name))
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

  /**
   * Take property `name` off the line that made `thing`, or the tag that made it, and put it back to its type's default.
   */
  private static resetProperty(thing: object, name: string): void {
    const files = homeFiles()
    const made = madeAt(thing, files)
    const homes = FieldHomes.of(thing, [name])
    if (!made || !homes) return
    const onTag = tagHomeOf(made, name)
    const home = !onTag && homes.making[name]
    const file = made.file.file
    const text = file.contents ?? ""
    // made by a tag:  its attribute goes;  by a line:  what the line says of it
    const edits =
      onTag?.kind === "written" && onTag.place === "attribute"
        ? SourceEdits.settingAttribute(text, onTag.opening, name, undefined)
        : home && home.kind !== "notWritten" && home.removal
          ? [SourceEdits.replacing(text, home.removal, "")]
          : undefined
    const anchor = onTag ? onTag.anchor : home ? home.anchor : undefined
    if (!edits || !anchor) return
    const record = thing as Record<string, unknown>
    const old = record[name]
    const start = homes.start[name]
    const live =
      start?.kind === "default"
        ? (way: "undo" | "redo") => {
            const text = textAt(fileOf(files, start.file).contents ?? "", start.span)
            record[name] = way === "undo" ? old : SourceHomes.valueOfLiteral(text, start.style)
          }
        : undefined
    live?.("redo")
    InspectorWrites.apply(file, { anchor, edits, live, isReset: true }, name)
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
    const path = pathOf(file)
    FieldHomes.edited(path, after, anchor.start, change.before.length, change.after.length)
    editor.history.change(change, {
      title: InspectorWrites.titleOf(name),
      // a run of changes to this field folds into one step;  a reset is a step of its own
      target: step.isReset ? undefined : `${file.path}:${anchor.start}:${name}`,
      live
    })
  }

  /** An undo step's title for a change to field `name`. */
  static titleOf(name: string): string {
    return appTexts.text("changeField", { field: wordsOfName(name) })
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
  static fileNamed(path: string): SP.AnySpellFile | undefined {
    const project = editor.project
    return (
      project?.spellFiles.find((file) => pathOf(file) === path) ??
      // a property editors file, `Card.editor.spell`:  Spell to look at, but never compiled (epic `editor` P35)
      project?.files.find((file) => SP.isPropertyEditorsName(file.path) && pathOf(file) === path)
    )
  }

  /** `file`'s path as a drawn part's place names it, from its project:  `Card.editor.spell`. */
  static pathOf(file: SP.AnySpellFile): string {
    return pathOf(file)
  }

  /**
   * Told what a change written late couldn't write (`written()`):  the Inspector shows it as it would at once.
   * - `undefined`:  nobody listening, so it's only not written.
   */
  static whenNotWrittenLate: ((part: WrittenPart, name: string, why: NotWritten) => void) | undefined = undefined
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
  // its type's `when creating a ...` sets it after the line that made this one:  only all of them can change it
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

/** The project's spell files, their text as the page has it:  never its parse, which is the language worker's. */
function homeFiles(): (HomeFile & { file: SP.AnySpellFile })[] {
  return (editor.project?.spellFiles ?? []).flatMap((file) =>
    file.contents === undefined ? [] : [{ path: pathOf(file), contents: file.contents, file }]
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

/**
 * Where property `name` is on the tag that made a thing, as a drawing's tag makes the member it names
 * (`<foundation "clubs" suit=clubs/>` ~== `"clubs" is a new foundation with suit = clubs`):
 * `undefined` when a line made it, not a tag.
 */
function tagHomeOf(made: NonNullable<ReturnType<typeof madeAt>>, name: string): FieldHome | undefined {
  const { contents } = made.file
  return contents[made.offset] === "<" ? SourceHomes.ofAttribute(contents, made.offset, name) : undefined
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
  if (!place || !file) return originOfDefault(element, name)
  const text = file.contents ?? ""
  const opening = SourceEdits.offsetAt(text, { line: place.line, character: place.column })
  const home = name === TEXT_FIELD ? SourceHomes.ofTagText(text, opening) : SourceHomes.ofAttribute(text, opening, name)
  if (!home) return originOfDefault(element, name)
  if (home.kind === "expression")
    return { kind: "inherited", from: appTexts.text("inspectorOriginCode"), action: SHOW_CODE }
  if (home.kind === "written") {
    const canReset = home.place === "attribute"
    return { kind: "here", from: appTexts.text("inspectorOriginHere"), action: canReset ? RESET : undefined }
  }
  return originOfDefault(element, name) ?? { kind: "inherited", from: appTexts.text("inspectorOriginNotSet") }
}

/**
 * Attribute `name` of `element`, when its value is the program's widget default (`<ui-defaults>`, epic `language` P29):
 * "From ui-defaults, in Theme.spell", the file that says it;  `undefined` when no default gives it.
 * - The running program's defaults (`core.uiDefaults()`), by the element's own tag (`ui-button`, for `<es-boton>`).
 */
export function originOfDefault(element: Element, name: string): PropertyOrigin | undefined {
  if (element.hasAttribute(name)) return undefined
  const file = defaultsFileOf(element, name)
  return file ? { kind: "inherited", from: appTexts.text("inspectorOriginDefaults", { file }) } : undefined
}

/** The file whose `<ui-defaults>` gives `element` attribute `name`, as the running program says;  `undefined` for none. */
function defaultsFileOf(element: Element, name: string): string | undefined {
  const component = (element as Element & { component?: { vocabulary?: { tag?: string } } }).component
  const tag = component?.vocabulary?.tag ?? element.localName
  return runtimeCore()?.uiDefaults()?.sources[tag]?.[name]
}

/** Where property `name` of `thing` comes from, seen from `scope`. */
function originOfProperty(thing: object, name: string, scope: InspectorScope): PropertyOrigin | undefined {
  const files = homeFiles()
  const made = madeAt(thing, files)
  // what made it says:  its tag in a drawing, or its line;  nothing said till the language worker has said
  const homes = FieldHomes.of(thing, [name])
  if (!homes) return undefined
  const onTag = made && tagHomeOf(made, name)
  const onLine = made && !onTag ? (homes.making[name] ?? undefined) : onTag
  const says = onLine && onLine.kind !== "notWritten"
  const start = homes.start[name]
  if (scope === "all") {
    // what the type sets, it sets after the line
    if (start?.kind === "expression") {
      return { kind: WORKED_OUT, from: appTexts.text("inspectorOriginCode"), action: SHOW_CODE }
    }
    if (start) return { kind: "here", from: appTexts.text("inspectorOriginAll", { type: start.typeName }) }
    if (says) return { kind: WORKED_OUT, from: appTexts.text("inspectorOriginLine"), action: SHOW_CODE }
    // a one of a kind's "all" is itself (the app's score):  changed as it runs, its not-saved icon saying it won't
    // be kept (epic `editor` I242, I244);  for many, it would change only the one selected, so it stays read only
    const from = appTexts.text("inspectorOriginNoStart")
    if (InspectorWrites.isOneOfAKind(thing)) {
      return { kind: "inherited", from, unsaved: appTexts.text("inspectorNotSavedNoStart") }
    }
    return { kind: WORKED_OUT, from }
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

/** A field's name for a step's title:  `shortName` => `Short Name`. */
function wordsOfName(name: string): string {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2")
  return words.replace(/(^| )(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase())
}
