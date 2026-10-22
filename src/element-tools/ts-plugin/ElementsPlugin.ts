/// <reference types="node" />

import type * as ts from "@typescript/typescript6"
import { dirname, resolve } from "node:path"

import { suggest } from "spell-kit/util/string"
import { ELEMENTS_PLUGIN_CODES, ELEMENTS_PLUGIN_SOURCE, type ElementDoc } from "spell-kit/element-tools/tools.types"

import { ElementCatalog } from "./ElementCatalog"

/****************
 * ### `ElementsPlugin`
 * A TypeScript language-service plugin:  what the JSX types can't say about custom elements, in `.tsx` files.
 * - `slot="` on a child of a custom element completes the PARENT tag's slots, with their descriptions;
 *   a slot the parent doesn't have is a warning.
 * - `part="` in a component's own JSX (a file in its family's folder) completes that component's parts;
 *   a part it doesn't list is a warning.
 * - A DASHED attribute a custom tag doesn't have (`<ui-button text-alin="left">`) is a warning,
 *   with a "did you mean" when one is close:  TypeScript never checks a dashed name in JSX.
 * - Its data:  the Custom Elements Manifests of the program's packages (`ElementCatalog`), so any set that ships one.
 * - tsserver loads it through `plugin.cjs`, from a tsconfig's `compilerOptions.plugins`;
 *   `tsc` never runs plugins, so `yarn ts` is unaffected.
 * - Gets TypeScript itself from tsserver (`init()`), and imports only its types:
 *   the plugin MUST use the TypeScript that's running it.
 * - Which children a tag takes isn't checked:  no vocabulary says so yet.
 ****************/
export class ElementsPlugin {
  /** The TypeScript running the plugin:  tsserver's. */
  readonly typescript: typeof ts

  /** The language service the plugin wraps. */
  readonly languageService: ts.LanguageService

  /** The elements the program's packages ship. */
  readonly catalog: ElementCatalog

  /** Where to log:  tsserver's log, in VS Code "TypeScript:  Open TS Server log". */
  private readonly log: (message: string) => void

  constructor(props: ElementsPluginProps) {
    this.typescript = props.typescript
    this.languageService = props.languageService
    this.log = props.log ?? (() => {})
    this.catalog = props.catalog ?? new ElementCatalog({ from: props.projectDir, log: this.log })
    this.log(`custom element manifests:  ${this.catalog.manifestFiles.join(", ") || "none"}`)
  }

  /**
   * The plugin module tsserver asks for:  `plugin.cjs` exports this.
   * - `create()` runs once per project, with that project's language service.
   */
  static init(modules: { typescript: typeof ts }): ts.server.PluginModule {
    const typescript = modules.typescript
    return {
      create: (info) =>
        new ElementsPlugin({
          typescript,
          languageService: info.languageService,
          projectDir: info.project.getCurrentDirectory(),
          log: (message) => info.project.projectService.logger.info(`${ELEMENTS_PLUGIN_SOURCE}:  ${message}`)
        }).decorated()
    }
  }

  /**
   * The language service with the plugin's completions, details and warnings added to TypeScript's own.
   * - Every other method is the wrapped service's, unchanged.
   */
  decorated(): ts.LanguageService {
    const service = this.languageService
    const decorated = { ...service }
    decorated.getCompletionsAtPosition = (fileName, position, options, formatting) => {
      const prior = service.getCompletionsAtPosition(fileName, position, options, formatting)
      return this.safely(prior, () => this.completionsAt(fileName, position, prior))
    }
    decorated.getCompletionEntryDetails = (fileName, position, entryName, ...rest) =>
      this.safely(undefined, () => this.detailsAt(fileName, position, entryName)) ??
      service.getCompletionEntryDetails(fileName, position, entryName, ...rest)
    decorated.getSemanticDiagnostics = (fileName) => {
      const prior = service.getSemanticDiagnostics(fileName)
      return this.safely(prior, () => [...prior, ...this.warningsFor(fileName)])
    }
    return decorated
  }

  ////////////////
  // ## Completions
  ////////////////

  /**
   * TypeScript's completions at `position`, with the slots or parts the plugin knows put first.
   * - `undefined` stays `undefined` where the cursor isn't in a `slot="..."` or `part="..."` the plugin knows.
   */
  completionsAt(
    fileName: string,
    position: number,
    prior?: ts.WithMetadata<ts.CompletionInfo>
  ): ts.WithMetadata<ts.CompletionInfo> | undefined {
    const value = this.valueAt(fileName, position)
    const choices = value && this.choicesFor(value)
    if (!value || !choices?.docs.length) return prior

    const replacementSpan = wordSpanAt(value, position)
    const entries: ts.CompletionEntry[] = choices.docs.map((doc, index) => ({
      name: doc.name,
      kind: this.typescript.ScriptElementKind.string,
      kindModifiers: "",
      sortText: `0${String(index).padStart(3, "0")}`,
      replacementSpan,
      labelDetails: { description: choices.label }
    }))
    const ours = new Set(entries.map((it) => it.name))
    const theirs = prior?.entries.filter((it) => !ours.has(it.name)) ?? []
    return {
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: false,
      ...prior,
      entries: [...entries, ...theirs]
    }
  }

  /** The details of completion `entryName` at `position`, when it's one of the plugin's:  its description. */
  detailsAt(fileName: string, position: number, entryName: string): ts.CompletionEntryDetails | undefined {
    const value = this.valueAt(fileName, position)
    const choices = value && this.choicesFor(value)
    const doc = choices?.docs.find((it) => it.name === entryName)
    if (!doc) return undefined
    return {
      name: entryName,
      kind: this.typescript.ScriptElementKind.string,
      kindModifiers: "",
      displayParts: [{ kind: "text", text: `${value!.kind} "${entryName}" of ${choices!.label}` }],
      documentation: doc.description ? [{ kind: "text", text: doc.description }] : []
    }
  }

  ////////////////
  // ## Warnings
  ////////////////

  /**
   * The plugin's warnings for `fileName`:
   * - each `slot="..."` the parent tag doesn't have, and each `part="..."` its component doesn't list
   *   (a value written as an expression, `slot={name}`, isn't checked)
   * - each dashed attribute a custom tag doesn't have
   * - JSX files only
   */
  warningsFor(fileName: string): ts.Diagnostic[] {
    const sourceFile = this.sourceFileOf(fileName)
    if (!sourceFile || sourceFile.languageVariant !== this.typescript.LanguageVariant.JSX) return []
    const warnings: ts.Diagnostic[] = []
    const visit = (node: ts.Node) => {
      if (this.typescript.isJsxAttribute(node)) {
        const value = this.valueOf(sourceFile, node)
        if (value) warnings.push(...this.warningsForValue(value))
        const unknown = this.unknownAttributeWarning(sourceFile, node)
        if (unknown) warnings.push(unknown)
      }
      this.typescript.forEachChild(node, visit)
    }
    visit(sourceFile)
    return warnings
  }

  /** The warnings for one attribute's value:  one per name it doesn't know. */
  private warningsForValue(value: AttributeValue): ts.Diagnostic[] {
    // a tag whose manifest lists no slots (or no parts) says nothing:  no warning
    const choices = this.choicesFor(value)
    if (!choices || (!choices.docs.length && !choices.hasDefaultSlot)) return []
    const known = new Set(choices.docs.map((it) => it.name))
    return wordsOf(value)
      .filter((word) => !known.has(word.text))
      .map((word) => ({
        category: this.typescript.DiagnosticCategory.Warning,
        code: value.kind === "slot" ? ELEMENTS_PLUGIN_CODES.unknownSlot : ELEMENTS_PLUGIN_CODES.unknownPart,
        source: ELEMENTS_PLUGIN_SOURCE,
        file: value.sourceFile,
        start: word.start,
        length: word.text.length,
        messageText: unknownMessage(value.kind, word.text, choices)
      }))
  }

  /**
   * A warning when `attribute` is a dashed name its custom tag doesn't have, e.g. `text-alin` on `<ui-button>`.
   * - Allowed besides the tag's attributes:  `data-*`, `aria-*`, and `on-<event>` for each event it dispatches
   *   (`on-ui-change`).
   * - Namespaced names (`on:click`, `prop:value`) and undashed ones are TypeScript's to check.
   * - A tag the catalog doesn't know, or whose manifest lists no attributes, says nothing:  no warning.
   */
  private unknownAttributeWarning(sourceFile: ts.SourceFile, attribute: ts.JsxAttribute): ts.Diagnostic | undefined {
    if (!this.typescript.isIdentifier(attribute.name)) return undefined
    const name = attribute.name.text
    if (!name.includes("-") || ALWAYS_ALLOWED.test(name)) return undefined
    const tagName = attribute.parent.parent.tagName.getText(sourceFile)
    const element = tagName.includes("-") ? this.catalog.elementFor(tagName) : undefined
    if (!element?.attributes.length) return undefined
    const eventProps = element.events.map((it) => `on-${it}`)
    if (element.attributes.includes(name) || eventProps.includes(name)) return undefined

    const guess = suggest(name, name.startsWith("on-") ? eventProps : element.attributes)
    return {
      category: this.typescript.DiagnosticCategory.Warning,
      code: ELEMENTS_PLUGIN_CODES.unknownAttribute,
      source: ELEMENTS_PLUGIN_SOURCE,
      file: sourceFile,
      start: attribute.name.getStart(sourceFile),
      length: name.length,
      messageText: `<${tagName}> has no attribute "${name}"` + (guess ? `;  did you mean "${guess}"?` : "")
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
      const tagName = parentTagOf(this.typescript, value)
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
    const className = classNameOf(this.typescript, value.attribute)
    const owners = family.filter((it) => it.className === className)
    const elements = owners.length ? owners : family
    return {
      label: elements.map((it) => `<${it.tagName}>`).join(" or "),
      docs: uniqueByName(elements.flatMap((it) => it.parts)),
      hasDefaultSlot: false
    }
  }

  ////////////////
  // ## Finding the attribute
  ////////////////

  /** The `slot` or `part` attribute value the cursor is in, at `position` of `fileName`. */
  private valueAt(fileName: string, position: number): AttributeValue | undefined {
    const sourceFile = this.sourceFileOf(fileName)
    if (!sourceFile) return undefined
    const typescript = this.typescript
    const find = (node: ts.Node): ts.Node | undefined => {
      if (position <= node.getStart(sourceFile) || position > node.end) return undefined
      return typescript.forEachChild(node, find) ?? node
    }
    const literal = find(sourceFile)
    if (!literal || !typescript.isStringLiteral(literal) || !typescript.isJsxAttribute(literal.parent)) return undefined
    const value = this.valueOf(sourceFile, literal.parent)
    return value && position <= value.end ? value : undefined
  }

  /** `attribute`'s value, when it's a `slot` or `part` attribute written as a string. */
  private valueOf(sourceFile: ts.SourceFile, attribute: ts.JsxAttribute): AttributeValue | undefined {
    const literal = attribute.initializer
    if (!literal || !this.typescript.isStringLiteral(literal)) return undefined
    const kind = attribute.name.getText(sourceFile)
    if (kind !== "slot" && kind !== "part") return undefined
    const start = literal.getStart(sourceFile) + 1
    const isTerminated = literal.end - start >= 1 && sourceFile.text[literal.end - 1] === sourceFile.text[start - 1]
    return { kind, sourceFile, attribute, start, end: isTerminated ? literal.end - 1 : literal.end }
  }

  /** The program's current source file `fileName`. */
  private sourceFileOf(fileName: string): ts.SourceFile | undefined {
    return this.languageService.getProgram()?.getSourceFile(fileName)
  }

  /** `work()`'s result, or `fallback` when it throws:  the plugin NEVER breaks the editor. */
  private safely<T>(fallback: T, work: () => T): T {
    try {
      return work()
    } catch (error) {
      this.log(`failed:  ${(error as Error).stack ?? error}`)
      return fallback
    }
  }
}

/** How to make an `ElementsPlugin`. */
export type ElementsPluginProps = {
  /** The TypeScript running the plugin. */
  typescript: typeof ts
  /** The language service to wrap. */
  languageService: ts.LanguageService
  /** The project's folder:  its `tsconfig.json`'s;  the catalog reads the package at or above it. */
  projectDir: string
  /** The catalog to use instead of one read from `projectDir`. */
  catalog?: ElementCatalog
  /** Where to log;  default:  nowhere. */
  log?: (message: string) => void
}

////////////////
// ## Helpers
////////////////

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

/** The whitespace-separated words of `value`, each with its offset in the file:  `part="a b"` names two parts. */
function wordsOf(value: AttributeValue): { text: string; start: number }[] {
  const text = value.sourceFile.text.slice(value.start, value.end)
  return [...text.matchAll(/\S+/g)].map((match) => ({ text: match[0], start: value.start + match.index }))
}

/** The span of the word the cursor is in (or at the end of), for a completion to replace. */
function wordSpanAt(value: AttributeValue, position: number): ts.TextSpan {
  const text = value.sourceFile.text
  let start = position
  let end = position
  while (start > value.start && /\S/.test(text[start - 1]!)) start--
  while (end < value.end && /\S/.test(text[end]!)) end++
  return { start, length: end - start }
}

/**
 * The tag of the element `value`'s element is a child of, e.g. `ui-panel`.
 * - Through the JSX that keeps it a child:  `{...}`, `( )`, `a && <b>`, `a ? <b> : <c>`, `<>...</>`
 * - `undefined` at the top of a render, or inside a component call (`<For>`'s callback).
 */
function parentTagOf(typescript: typeof ts, value: AttributeValue): string | undefined {
  const opening = value.attribute.parent.parent
  let node: ts.Node = typescript.isJsxSelfClosingElement(opening) ? opening : opening.parent
  do node = node.parent
  while (
    typescript.isJsxExpression(node) ||
    typescript.isParenthesizedExpression(node) ||
    typescript.isBinaryExpression(node) ||
    typescript.isConditionalExpression(node) ||
    typescript.isJsxFragment(node)
  )
  return typescript.isJsxElement(node) ? node.openingElement.tagName.getText(value.sourceFile) : undefined
}

/** The name of the class `node` is in, e.g. `UIPanel`;  `undefined` outside a named class. */
function classNameOf(typescript: typeof ts, node: ts.Node): string | undefined {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (typescript.isClassLike(parent) && parent.name) return parent.name.text
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
