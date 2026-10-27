import { P } from "spell-parser/parser"

/**
 * What the javascript writers (`P.JSWriter`, `P.TSWriter`) read off a spell tree:  pure helpers, nothing written.
 * - What a node is (`isCoreCall()`, `isTight()` ...)
 * - What a datatype is, as `JSWriter.kindOf()` says it
 * - The `core` helpers both writers say their own way
 * - How an element's attribute is named on the page (`attributeName()`)
 * - Not in the barrel:  the writers' own.
 */

/** `node` without the parentheses around it. */
export function unwrapped(node: P.ASTExpression): P.ASTExpression {
  while (node instanceof P.ASTParenthesizedExpression) node = node.expression
  return node
}

/** Does `node` bind at least as tightly as `.`, so nothing needs parentheses around it?  A name, a read, a call ... */
export function isTight(node: P.ASTExpression): boolean {
  return !(
    node instanceof P.ASTInfixExpression ||
    node instanceof P.ASTTernaryExpression ||
    node instanceof P.ASTNotExpression ||
    node instanceof P.ASTAwaitExpression ||
    node instanceof P.ASTMethodDefinition ||
    node instanceof P.ASTNewInstanceExpression ||
    node instanceof P.ASTJSXElement
  )
}

/** Is `node` a `core` method's result, maybe in parens?  `@spell/core` types those `unknown`. */
export function isCoreCall(node: P.ASTNode): boolean {
  while (node instanceof P.ASTParenthesizedExpression) node = node.expression
  return node instanceof P.ASTScopedMethodInvocation && node.thing instanceof P.ASTCoreExpression
}

/** Is `node` the number `value` written out, e.g. `-1`? */
export function isNumber(node: P.ASTExpression | undefined, value: number): boolean {
  const inner = node && unwrapped(node)
  return inner instanceof P.ASTNumericLiteral && Number(inner.value) === value
}

/** Is `value` member `name` read off something, e.g. `the name of the pile` for `name`? */
export function readsMember(value: P.ASTExpression, name: string): boolean {
  const inner = unwrapped(value)
  return inner instanceof P.ASTPropertyExpression && inner.property.value === name
}

/** The one kind in `kinds`, e.g. `"text"` -- `undefined` if there's more than one, or one can't be told. */
export function alike(kinds: Set<string | undefined>): string | undefined {
  const [kind] = kinds
  return kinds.size === 1 ? kind : undefined
}

/**
 * What a new list says it holds:  `a new list of piles` => `new List({ instanceType: "Pile" })` => `"Pile"`.
 * - `undefined` for a list that doesn't say, or anything else made.
 */
export function newListItemName(node: P.ASTNewInstanceExpression): string | undefined {
  if (node.type.name !== "List") return undefined
  const itemType = node.props?.properties.find(
    (property): property is P.ASTObjectLiteralProperty =>
      property instanceof P.ASTObjectLiteralProperty && property.property.value === "instanceType"
  )?.value
  return itemType instanceof P.ASTStringLiteral && itemType.quote ? itemType.value : undefined
}

////////////////
// ## Kinds of value
////////////////

/**
 * What a value of spell's `datatype` is, as `JSWriter.kindOf()` says it, e.g. a variable's, a method's.
 * - `undefined` for a list:  it may be a `List` or an array.
 */
export function kindFromDatatype(datatype: P.Datatype | RegExpConstructor | undefined): string | undefined {
  if (typeof datatype !== "string" || !datatype || datatype.startsWith("list")) return undefined
  if (datatype === "text" || datatype === "character") return "text"
  if (datatype === "number" || datatype === "integer") return "number"
  if (datatype === "choice") return "choice"
  return /^\p{Lu}/u.test(datatype) ? datatype : undefined
}

/**
 * What a PROPERTY declared as spell's `datatype` holds, as `JSWriter.kindOf()` says it:
 * as `kindFromDatatype()`, plus the class spell's own `thing`, `app` and `date` are (`Thing`, `App`, `Date`).
 * - `undefined` for nothing, a list, or a name that isn't a class's.
 */
export function kindOfType(datatype: P.Datatype | RegExpConstructor | undefined): string | undefined {
  if (typeof datatype !== "string" || !datatype || datatype.startsWith("list")) return undefined
  if (Object.hasOwn(BUILT_IN_KINDS, datatype)) return BUILT_IN_KINDS[datatype as P.Datatype]
  return /^\p{Lu}[\p{L}\p{M}\d_]*$/u.test(datatype) ? datatype : undefined
}

/** Is `datatype` one spell knows:  built in, a list, or a type in PascalCase?  See `kindOfType()`. */
export function isKnownType(datatype: P.Datatype | RegExpConstructor | undefined): boolean {
  if (typeof datatype !== "string" || !datatype) return false
  return (
    datatype.startsWith("list") ||
    Object.hasOwn(BUILT_IN_KINDS, datatype) ||
    /^\p{Lu}[\p{L}\p{M}\d_$]*$/u.test(datatype)
  )
}

/** What each of spell's built-in datatypes holds, as `kindOfType()` says it. */
const BUILT_IN_KINDS: Record<P.Datatype, string | undefined> = {
  text: "text",
  character: "text",
  number: "number",
  integer: "number",
  choice: "choice",
  date: "Date",
  nothing: undefined,
  thing: "Thing",
  app: "App",
  list: undefined
}

////////////////
// ## `core` helpers
////////////////

/**
 * A `core` helper written with an operator, which needs parentheses as an operand:  see `JSWriter.tight()`.
 * - Test it on `topLevelOf()` the text:  an `===` inside a callback, `core.filter(xs, (x) => x === y)`, isn't one.
 */
export const LOOSE_CORE_CALL = /^!|^typeof |\s(?:===|!==|instanceof)\s/

/**
 * `text`, a piece of code, without what's inside its brackets:  its top level,
 * e.g. `core.filter` for `core.filter(xs, (x) => x === y)`.
 * - Brackets inside quotes count too:  only for a quick look, as `LOOSE_CORE_CALL`'s.
 */
export function topLevelOf(text: string): string {
  let depth = 0
  let top = ""
  for (const char of text) {
    if (OPENERS.includes(char)) depth++
    if (depth === 0) top += char
    if (CLOSERS.includes(char)) depth = Math.max(0, depth - 1)
  }
  return top
}

/** Brackets that open and close a nested piece of code -- see `topLevelOf()`. */
const OPENERS = "([{"
const CLOSERS = ")]}"

/** Spell's events, through `@spell/core`'s own `on()`, `trigger()` ... -- see `JSWriter.eventCall()`. */
export const EVENTS = new Set(["on", "off", "once", "trigger", "send"])

/** `core` helpers worth importing by name, e.g. `positionOf(Card.Ranks, this.rank)`. */
export const IMPORTED_HELPERS = new Set(["positionOf"])

/** `@spell/core`'s template tags, imported by name, e.g. `css` for a view type's style sheet. */
export const TEMPLATE_TAGS = new Set(["css"])

////////////////
// ## Drawing
////////////////

/**
 * The page's name for attribute `name` of element `tag`, as both writers write it.
 * - `holdsObject`:  may its value hold an object (`ProgramWriter.mayHoldObject()`)?
 * - `className` => `class`, `htmlFor` => `for`
 * - a camelCase attribute of an HTML tag, lowercased:  `colSpan` => `colspan`
 * - on a tag with a dash (`<ui-form>`), a value that may hold an object is a PROPERTY,
 *   `prop:value`:  an attribute holds only text, and `prop:` keeps it out of server-rendered HTML.
 *   - Text, a number or yes / no that can change stays a plain name, `selected={...}`:
 *     our elements take it as their attribute, and a server render shows it (epic `solid-17`, J12 B).
 *   - A handler (`onClick`), a dashed name (`aria-label`) and `ATTRIBUTES_ONLY` stay attributes.
 * - Decided when it compiles.
 *   Before epic `output-targets` P20, compiled javascript drew with `@spell/core`'s `element()` (now deprecated),
 *   which decided it as it drew.
 */
export function attributeName(tag: string, name: string, holdsObject: boolean): string {
  if (name === "className") return "class"
  if (name === "htmlFor") return "for"
  if (tag.includes("-")) {
    const isProperty = !name.startsWith("on") && !name.includes("-") && !ATTRIBUTES_ONLY.has(name)
    return isProperty && holdsObject ? `prop:${name}` : name
  }
  if (!name.startsWith("on") && /\p{Ll}\p{Lu}/u.test(name)) return name.toLowerCase()
  return name
}

/** The kinds of value an attribute holds as it is, as `ProgramWriter.kindOf()` says them:  see `attributeName()`. */
export const PLAIN_KINDS: ReadonlySet<string> = new Set(["text", "number", "choice"])

/** What stays an attribute on a tag with a dash, whatever its value:  see `attributeName()`. */
export const ATTRIBUTES_ONLY = new Set(["class", "className", "style", "id", "slot", "part"])

////////////////
// ## Modules
////////////////

/** An import from another project:  `import { Card, play_it as play } from "@spell/project/..."`. */
export const PROJECT_IMPORT = /^import \{ ([^}]*) \} from "(@spell\/project\/[^"]*)"$/gm

/** The import from `@spell/core`:  `import { core, Thing, List, App, h } from "@spell/core"`. */
export const CORE_IMPORT = /^import \{ ([^}]*) \} from "@spell\/core"$/m

/**
 * `code` with its `@spell/core` import naming only the spell classes the rest of it uses,
 * e.g. no `Page` in a program with no page (epic `elemental-spell` I2).
 * - Every program's header names them all (`SP.SpellProject.importsOf()`):  it's written before the code is.
 * - A class is used when its name is a word of the rest of `code`:  one a comment names is kept, harmlessly.
 * - `core` and the helpers stay:  `JSWriter.module()` adds a helper only when the code calls it.
 */
export function withUsedCoreClasses(code: string): string {
  const classes = new Set(Object.values(P.BUILT_IN_CLASS_NAMES))
  return code.replace(CORE_IMPORT, (_line, imported: string) => {
    const rest = code.replace(CORE_IMPORT, "")
    const used = imported.split(/,\s*/).filter((name) => !classes.has(name) || new RegExp(`\\b${name}\\b`).test(rest))
    return `import { ${used.join(", ")} } from "@spell/core"`
  })
}

/**
 * Each class `code` imports from another project, by its name here => [its module, its name there],
 * e.g. `Card` => `["@spell/project/owen@spell/cards", "Card"]`.
 */
export function importedClasses(code: string): Map<string, [string, string]> {
  const imported = new Map<string, [string, string]>()
  for (const [, names, from] of code.matchAll(PROJECT_IMPORT)) {
    for (const name of names!.split(/,\s*/)) {
      const [there, here = there] = name.split(/\s+as\s+/) as [string, string?]
      if (/^\p{Lu}/u.test(there)) imported.set(here, [from!, there])
    }
  }
  return imported
}

/**
 * The project view class `node` is in, as its `static elementTag = core.defineElement(this, "Solitaire")`
 * names it, e.g. `Solitaire` -- `undefined` for a class that isn't drawable (epic `drawable-thing` P10).
 */
export function elementProjectOf(node: P.ASTClassDeclaration): string | undefined {
  for (const member of node.members ?? []) {
    const project = elementTagProject(member)
    if (project !== undefined) return project
  }
  return undefined
}

/**
 * The project `member` names, when it's a view class's `static elementTag = core.defineElement(this, "...")`:
 * the line the page defines the type's element from -- `undefined` for any other member.
 * - Javascript's own, written as it is:  a target with no page of its own leaves it out (Python's program side).
 */
export function elementTagProject(member: P.ASTNode): string | undefined {
  const found = defineElementOf(member)
  return found ? (JSON.parse(found[1]!) as string) : undefined
}

/**
 * The tag's own word view class `node` names, when it isn't the class's:  `App` for an app's
 * `core.defineElement(this, "Solitaire", "App")`, its tag `<solitaire-app>` -- `undefined` for any other class.
 */
export function elementNameOf(node: P.ASTClassDeclaration): string | undefined {
  for (const member of node.members ?? []) {
    if (defineElementOf(member)) return elementTagName(member)
  }
  return undefined
}

/**
 * The tag's own word `member` names, when it's a view class's `static elementTag = core.defineElement(...)` naming
 * one:  `App` for `core.defineElement(this, "Solitaire", "App")` -- `undefined` for any other member.
 */
export function elementTagName(member: P.ASTNode): string | undefined {
  const name = defineElementOf(member)?.[2]
  return name === undefined ? undefined : (JSON.parse(name) as string)
}

/** `member`'s `core.defineElement(...)`, matched by `DEFINE_ELEMENT` -- `undefined` for any other member. */
function defineElementOf(member: P.ASTNode): RegExpExecArray | undefined {
  if (!(member instanceof P.ASTStaticDefinition) || member.name !== "elementTag") return undefined
  return (member.value instanceof P.ASTStringLiteral && DEFINE_ELEMENT.exec(member.value.value)) || undefined
}

/** What a view class's `elementTag` is:  `core.defineElement(this, "<project>")`, or `(this, "<project>", "<name>")`. */
const DEFINE_ELEMENT = /^core\.defineElement\(this, ("(?:[^"\\]|\\.)*")(?:, ("(?:[^"\\]|\\.)*"))?\)$/
