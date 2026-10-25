/// <reference types="node" />

import ts from "@typescript/typescript6"
import { dirname, resolve } from "node:path"

import { suggest } from "spell/util/string"
import { ELEMENT_HELP_CODES, type ElementDoc } from "spell/element-tools/tools.types"

import type { ElementCatalog } from "./ElementCatalog"

/****************
 * ### `JsxElementHelp`
 * What the JSX types can't say about custom elements, in a `.tsx` or `.jsx` file:
 * completions and warnings, as plain data, for any editor to show.
 * - `slot="` on a child of a custom element completes the PARENT tag's slots, with their descriptions;
 *   a slot the parent doesn't have is a warning.
 * - `part="` in a component's own JSX (a file in its family's folder) completes that component's parts;
 *   a part it doesn't list is a warning.
 * - A DASHED attribute a custom tag doesn't have (`<ui-button text-alin="left">`) is a warning,
 *   with a "did you mean" when one is close:  TypeScript never checks a dashed name in JSX.
 * - Its data:  the Custom Elements Manifests of the file's packages (`ElementCatalog`), so any set that ships one.
 * - Who shows it:  spell-app's VS Code extension (`ElementsHelp`, in its `vscode/`), beside TypeScript 7's own help.
 * - Reads the JSX with TypeScript 6's JavaScript API (`@typescript/typescript6`), one file at a time:
 *   no program, no types, so it's quick enough for every keystroke.
 *   - TypeScript 7 has no JavaScript API yet;  the extension bundles this one.
 * - Which children a tag takes isn't checked:  no vocabulary says so yet.
 ****************/
export class JsxElementHelp {
  /** The elements the file's packages ship. */
  readonly catalog: ElementCatalog

  constructor(props: JsxElementHelpProps) {
    this.catalog = props.catalog
  }

  /** Whether `fileName` is a JSX file this helps with:  `.tsx` or `.jsx`. */
  static isJsxFile(fileName: string): boolean {
    return JSX_FILE.test(fileName)
  }

  ////////////////
  // ## Completions
  ////////////////

  /**
   * The slots or parts to offer at `position` (an offset in `file.text`), when the cursor is in a
   * `slot="..."` or `part="..."` this knows;  else `undefined`.
   */
  completionsAt(file: JsxFile, position: number): ElementCompletions | undefined {
    const value = this.valueAt(file, position)
    const choices = value && this.choicesFor(value)
    if (!value || !choices?.docs.length) return undefined
    return { kind: value.kind, label: choices.label, ...wordSpanAt(value, position), names: choices.docs }
  }

  ////////////////
  // ## Warnings
  ////////////////

  /**
   * The warnings for `file`:
   * - each `slot="..."` the parent tag doesn't have, and each `part="..."` its component doesn't list
   *   (a value written as an expression, `slot={name}`, isn't checked)
   * - each dashed attribute a custom tag doesn't have
   * - none for a file that isn't `.tsx` or `.jsx`
   */
  warningsFor(file: JsxFile): ElementWarning[] {
    const sourceFile = this.sourceFileFor(file)
    if (!sourceFile) return []
    const warnings: ElementWarning[] = []
    const visit = (node: ts.Node) => {
      if (ts.isJsxAttribute(node)) {
        const value = valueOf(sourceFile, node)
        if (value) warnings.push(...this.warningsForValue(value))
        const unknown = this.unknownAttributeWarning(sourceFile, node)
        if (unknown) warnings.push(unknown)
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return warnings
  }

  /** The warnings for one attribute's value:  one per name it doesn't know. */
  private warningsForValue(value: AttributeValue): ElementWarning[] {
    // a tag whose manifest lists no slots (or no parts) says nothing:  no warning
    const choices = this.choicesFor(value)
    if (!choices || (!choices.docs.length && !choices.hasDefaultSlot)) return []
    const known = new Set(choices.docs.map((it) => it.name))
    return wordsOf(value)
      .filter((word) => !known.has(word.text))
      .map((word) => ({
        code: value.kind === "slot" ? ELEMENT_HELP_CODES.unknownSlot : ELEMENT_HELP_CODES.unknownPart,
        start: word.start,
        length: word.text.length,
        message: unknownMessage(value.kind, word.text, choices)
      }))
  }

  /**
   * A warning when `attribute` is a dashed name its custom tag doesn't have, e.g. `text-alin` on `<ui-button>`.
   * - Allowed besides the tag's attributes:
   *   `data-*`, `aria-*`, and `on-<event>` for each event it dispatches (`on-ui-changed`).
   * - Namespaced names (`on:click`, `prop:value`) and undashed ones are TypeScript's to check.
   * - A tag the catalog doesn't know, or whose manifest lists no attributes, says nothing:  no warning.
   */
  private unknownAttributeWarning(sourceFile: ts.SourceFile, attribute: ts.JsxAttribute): ElementWarning | undefined {
    if (!ts.isIdentifier(attribute.name)) return undefined
    const name = attribute.name.text
    if (!name.includes("-") || ALWAYS_ALLOWED.test(name)) return undefined
    const tagName = attribute.parent.parent.tagName.getText(sourceFile)
    const element = tagName.includes("-") ? this.catalog.elementFor(tagName) : undefined
    if (!element?.attributes.length) return undefined
    const eventProps = element.events.map((it) => `on-${it}`)
    if (element.attributes.includes(name) || eventProps.includes(name)) return undefined

    const guess = suggest(name, name.startsWith("on-") ? eventProps : element.attributes)
    return {
      code: ELEMENT_HELP_CODES.unknownAttribute,
      start: attribute.name.getStart(sourceFile),
      length: name.length,
      message: `<${tagName}> has no attribute "${name}"` + (guess ? `;  did you mean "${guess}"?` : "")
    }
  }

  ////////////////
  // ## What a value may be
  ////////////////

  /**
   * The names `value` may take, and who they belong to.
   * - A slot:  the PARENT element's named slots, when the parent is a custom element the catalog knows.
   * - A part:  the parts of the component whose family's folder holds the file;
   *   of the class the JSX is in, when it's one of them, else of every element of that family.
   */
  private choicesFor(value: AttributeValue): Choices | undefined {
    if (value.kind === "slot") {
      const tagName = parentTagOf(value)
      const parent = tagName?.includes("-") ? this.catalog.elementFor(tagName) : undefined
      if (!parent) return undefined
      return {
        label: `<${parent.tagName}>`,
        docs: parent.slots.filter((it) => it.name),
        hasDefaultSlot: parent.slots.some((it) => !it.name)
      }
    }
    const family = this.catalog.elementsIn(dirname(resolve(value.sourceFile.fileName)))
    if (!family.length) return undefined
    const className = classNameOf(value.attribute)
    const owners = family.filter((it) => it.className === className)
    const elements = owners.length ? owners : family
    return {
      label: elements.map((it) => `<${it.tagName}>`).join(" or "),
      docs: uniqueByName(elements.flatMap((it) => it.parts)),
      hasDefaultSlot: false
    }
  }

  ////////////////
  // ## Reading the file
  ////////////////

  /** The `slot` or `part` attribute value the cursor is in, at `position` of `file`. */
  private valueAt(file: JsxFile, position: number): AttributeValue | undefined {
    const sourceFile = this.sourceFileFor(file)
    if (!sourceFile) return undefined
    const find = (node: ts.Node): ts.Node | undefined => {
      if (position <= node.getStart(sourceFile) || position > node.end) return undefined
      return ts.forEachChild(node, find) ?? node
    }
    const literal = find(sourceFile)
    if (!literal || !ts.isStringLiteral(literal) || !ts.isJsxAttribute(literal.parent)) return undefined
    const value = valueOf(sourceFile, literal.parent)
    return value && position <= value.end ? value : undefined
  }

  /**
   * `file` parsed, with its nodes' parents set;  `undefined` when it isn't a JSX file.
   * - The last file parsed is kept:  completions ask again for the same text as you type in one value.
   */
  private sourceFileFor(file: JsxFile): ts.SourceFile | undefined {
    if (!JsxElementHelp.isJsxFile(file.fileName)) return undefined
    const last = this.lastParsed
    if (last?.fileName === file.fileName && last.text === file.text) return last
    const scriptKind = file.fileName.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TSX
    this.lastParsed = ts.createSourceFile(file.fileName, file.text, ts.ScriptTarget.Latest, true, scriptKind)
    return this.lastParsed
  }

  /** The last file `sourceFileFor()` parsed. */
  private lastParsed: ts.SourceFile | undefined
}

/** How to make a `JsxElementHelp`. */
export type JsxElementHelpProps = {
  /** The elements the file's packages ship:  `new ElementCatalog({ from: <the file's folder> })`. */
  catalog: ElementCatalog
}

/** A JSX file to help with:  its absolute path (`.tsx` or `.jsx`) and its current text, saved or not. */
export type JsxFile = { fileName: string; text: string }

/**
 * The slots or parts to offer where the cursor is.
 * - `start`, `length`:  the word to replace, an offset in the file's text
 * - `names`:  in the order to show them, each with its description
 */
export type ElementCompletions = {
  kind: "slot" | "part"
  /** Whose names they are, e.g. `<ui-panel>`, or `<ui-tab> or <ui-tabs>`. */
  label: string
  start: number
  length: number
  names: ElementDoc[]
}

/**
 * One warning:  a slot, part or dashed attribute the tag doesn't have.
 * - `code`:  one of `ELEMENT_HELP_CODES`
 * - `start`, `length`:  the name's offset in the file's text
 */
export type ElementWarning = { code: number; start: number; length: number; message: string }

////////////////
// ## Helpers
////////////////

/** The files this helps with. */
const JSX_FILE = /\.[jt]sx$/

/** Dashed attributes every tag takes:  `data-*`, `aria-*`. */
const ALWAYS_ALLOWED = /^(data|aria)-/

/**
 * A `slot="..."` or `part="..."` value, as written in a JSX file.
 * - `start`, `end`:  its text's offsets in the file, inside the quotes
 */
type AttributeValue = {
  kind: "slot" | "part"
  sourceFile: ts.SourceFile
  attribute: ts.JsxAttribute
  start: number
  end: number
}

/**
 * The names a value may take:  `docs`.
 * - `label`:  whose they are, e.g. `<ui-panel>`
 * - `hasDefaultSlot`:  a slot's parent has its default slot
 */
type Choices = { label: string; docs: ElementDoc[]; hasDefaultSlot: boolean }

/** `attribute`'s value, when it's a `slot` or `part` attribute written as a string. */
function valueOf(sourceFile: ts.SourceFile, attribute: ts.JsxAttribute): AttributeValue | undefined {
  const literal = attribute.initializer
  if (!literal || !ts.isStringLiteral(literal)) return undefined
  const kind = attribute.name.getText(sourceFile)
  if (kind !== "slot" && kind !== "part") return undefined
  const start = literal.getStart(sourceFile) + 1
  const isTerminated = literal.end - start >= 1 && sourceFile.text[literal.end - 1] === sourceFile.text[start - 1]
  return { kind, sourceFile, attribute, start, end: isTerminated ? literal.end - 1 : literal.end }
}

/** The whitespace-separated words of `value`, each with its offset in the file:  `part="a b"` names two parts. */
function wordsOf(value: AttributeValue): { text: string; start: number }[] {
  const text = value.sourceFile.text.slice(value.start, value.end)
  return [...text.matchAll(/\S+/g)].map((match) => ({ text: match[0], start: value.start + match.index }))
}

/** The span of the word the cursor is in (or at the end of), for a completion to replace. */
function wordSpanAt(value: AttributeValue, position: number): { start: number; length: number } {
  const text = value.sourceFile.text
  let start = position
  let end = position
  while (start > value.start && /\S/.test(text[start - 1]!)) start--
  while (end < value.end && /\S/.test(text[end]!)) end++
  return { start, length: end - start }
}

/**
 * The tag of the parent of the element `value` is on, e.g. `ui-panel`.
 * - Looks up through the JSX that keeps it a child:  `{...}`, `( )`, `a && <b>`, `a ? <b> : <c>`, `<>...</>`
 * - `undefined` at the top of a render, or inside a component call (`<For>`'s callback).
 */
function parentTagOf(value: AttributeValue): string | undefined {
  const opening = value.attribute.parent.parent
  let node: ts.Node = ts.isJsxSelfClosingElement(opening) ? opening : opening.parent
  do node = node.parent
  while (
    ts.isJsxExpression(node) ||
    ts.isParenthesizedExpression(node) ||
    ts.isBinaryExpression(node) ||
    ts.isConditionalExpression(node) ||
    ts.isJsxFragment(node)
  )
  return ts.isJsxElement(node) ? node.openingElement.tagName.getText(value.sourceFile) : undefined
}

/** The name of the class `node` is in, e.g. `UIPanel`;  `undefined` outside a named class. */
function classNameOf(node: ts.Node): string | undefined {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isClassLike(parent) && parent.name) return parent.name.text
  }
  return undefined
}

/** `docs` without repeats:  the first of each name. */
function uniqueByName(docs: ElementDoc[]): ElementDoc[] {
  const seen = new Set<string>()
  return docs.filter((it) => !seen.has(it.name) && seen.add(it.name))
}

/** The warning's text, e.g. `<ui-modal> has no slot "acions";  its slots:  header, actions`. */
function unknownMessage(kind: AttributeValue["kind"], name: string, choices: Choices): string {
  const owner = choices.label
  const names = choices.docs.map((it) => it.name).join(", ")
  if (kind === "slot") {
    if (!names) return `${owner} has no slot "${name}":  only its default slot`
    return `${owner} has no slot "${name}";  its slots:  ${names}`
  }
  return `${owner} has no part "${name}";  its parts:  ${names}`
}
