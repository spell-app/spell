/**
 * Spell's GRAMMAR, the half of the language that parses:  every rule, assembled into `spellParser`, and English's pack
 * (epic `solid-2-final` P20).
 * - The barrel (`spell/parser/spell`) is the OTHER half, what holds a project:  its files, addresses, names, project
 *   file and compile cache.  It never imports the grammar, so a page can hold a project without downloading it.
 * - The grammar comes in one of two ways:
 *   - up front, a side-effect import:  `import "spell/parser/spell/languages/all"` (node programs and tests, which
 *     read every language), or `"spell/parser/spell/languages/en"` (the editor's language worker, the element
 *     builds' grammar bundle)
 *   - on first use:  `await SP.loadGrammar()`, before anything parses;  `SpellProject`'s parse and compile load it
 *     themselves, as does `SP.Language.load()`.  A page that loads it so says how, once:
 *     `import "spell/parser/spell/grammarOnFirstUse"` (the editor, `<spell-editor>`, a layout's spell)
 *     - NOT the barrel itself:  its `import()` would split the language worker's grammar into chunks of their own,
 *       12 KB brotli more (measured, P20)
 * - What the rules export is here as LIVE bindings, set as the grammar loads (`installGrammar()`, at the end of
 *   `rules/index.ts`):  `SP.spellParser`, `SP.Block`, `SP.ParseError` ...
 *   - Before then each is a stand-in that throws, saying to load the grammar:  never a silent `undefined`.
 * - Types only from `./rules`:  importing its code would bring the grammar back into every page.
 */
import { LoadOnce } from "spell/util"
import { P } from "spell/parser/parser"

import type * as Rules from "./rules"

////////////////
// ## The rules' exports, live
////////////////

/** The shared `SpellParser` with every spell rule:  the language's default parser, English's. */
export let spellParser: typeof Rules.spellParser = notLoaded("spellParser")
/** The fallback rule for "couldn't parse this":  so a parse error can be made by hand. */
export let ParseError: typeof Rules.ParseError = notLoaded("ParseError")
export type ParseError = Rules.ParseError
/** Parse a bare expression string with the default parser. */
export let parseExpression: typeof Rules.parseExpression = notLoaded("parseExpression")
/** Lock in a statement parsed on its own, e.g. `SpellParser.commit()`. */
export let commitStatement: typeof Rules.commitStatement = notLoaded("commitStatement")
/** The base class of spell's statements -- see `SpellStatement.statementRuleOf()`. */
export let SpellStatement: typeof Rules.SpellStatement = notLoaded("SpellStatement")
export type SpellStatement<
  Groups extends string | P.AnyGroups = P.AnyGroups,
  MatchData extends P.AnyMatchData = P.AnyMatchData
> = Rules.SpellStatement<Groups, MatchData>
/** The structural rules:  a block of lines, and one line. */
export let Block: typeof Rules.Block = notLoaded("Block")
export type Block = Rules.Block
export let BlockLine: typeof Rules.BlockLine = notLoaded("BlockLine")
export type BlockLine = Rules.BlockLine
/** The word rule with one meaning, `negated`:  so a translation registers its own -- see `Negatable`. */
export let Negatable: typeof Rules.Negatable = notLoaded("Negatable")
export type Negatable = Rules.Negatable
/** Spell's own JSX tags in `scope`, e.g. `<children/>`, for an editor to offer. */
export let spellTagsIn: typeof Rules.spellTagsIn = notLoaded("spellTagsIn")
/** The actions an `<action "...">` may name -- see `ActionButton.actionsIn()`. */
export let ActionButton: typeof Rules.ActionButton = notLoaded("ActionButton")
export type ActionButton = Rules.ActionButton
/** Spell's JSX, e.g. for an editor to draw a project's own views as the compiler decides them. */
export let SpellJSX: typeof Rules.SpellJSX = notLoaded("SpellJSX")
export type SpellJSX = Rules.SpellJSX
/** Is `tag` a component's bare name? */
export let isBareComponentName: typeof Rules.isBareComponentName = notLoaded("isBareComponentName")
/** A type's `<markdown>` description, shown where its docstring shows -- e.g. hover. */
export let MarkdownDescription: typeof Rules.MarkdownDescription = notLoaded("MarkdownDescription")
export type MarkdownDescription = Rules.MarkdownDescription
/** A drawing's `<markdown>`:  a `<spell-viewer>` layout splits its holes the same way -- see `partsOf()`. */
export let MarkdownBlock: typeof Rules.MarkdownBlock = notLoaded("MarkdownBlock")
export type MarkdownBlock = Rules.MarkdownBlock
/** A site's lines naming its parts, for an editor's rename (epic `mockup` P6). */
export let ShowSitePart: typeof Rules.ShowSitePart = notLoaded("ShowSitePart")
export type ShowSitePart = Rules.ShowSitePart
export let SiteAddressOf: typeof Rules.SiteAddressOf = notLoaded("SiteAddressOf")
export type SiteAddressOf = Rules.SiteAddressOf
/** What a member read found, as noted while parsing:  the language server asks it. */
export let MemberReadExpression: typeof Rules.MemberReadExpression = notLoaded("MemberReadExpression")
export type MemberReadExpression<
  Groups extends string | P.AnyGroups = P.AnyGroups,
  MatchData extends P.AnyMatchData = P.AnyMatchData
> = Rules.MemberReadExpression<Groups, MatchData>
export type DocComment = Rules.DocComment
export type SpellTag = Rules.SpellTag
export type JSXMatchData = Rules.JSXMatchData

/** What the rules hand over as they load:  every live binding above. */
export type Grammar = {
  spellParser: typeof Rules.spellParser
  ParseError: typeof Rules.ParseError
  parseExpression: typeof Rules.parseExpression
  commitStatement: typeof Rules.commitStatement
  SpellStatement: typeof Rules.SpellStatement
  Block: typeof Rules.Block
  BlockLine: typeof Rules.BlockLine
  Negatable: typeof Rules.Negatable
  spellTagsIn: typeof Rules.spellTagsIn
  ActionButton: typeof Rules.ActionButton
  SpellJSX: typeof Rules.SpellJSX
  isBareComponentName: typeof Rules.isBareComponentName
  MarkdownDescription: typeof Rules.MarkdownDescription
  MarkdownBlock: typeof Rules.MarkdownBlock
  ShowSitePart: typeof Rules.ShowSitePart
  SiteAddressOf: typeof Rules.SiteAddressOf
  MemberReadExpression: typeof Rules.MemberReadExpression
}

////////////////
// ## Loading
////////////////

/**
 * Set every live binding above:  called once, by `rules/index.ts` as it finishes loading.
 * - SIDE EFFECT:  `hasGrammar()` is `true` from now on.
 */
export function installGrammar(grammar: Grammar): void {
  ;({
    spellParser,
    ParseError,
    parseExpression,
    commitStatement,
    SpellStatement,
    Block,
    BlockLine,
    Negatable,
    spellTagsIn,
    ActionButton,
    SpellJSX,
    isBareComponentName,
    MarkdownDescription,
    MarkdownBlock,
    ShowSitePart,
    SiteAddressOf,
    MemberReadExpression
  } = grammar)
  installed = true
}

/** Is the grammar here, so `SP.spellParser` and the rest can be read now? */
export function hasGrammar(): boolean {
  return installed
}

/**
 * Load the grammar, if it isn't here yet:  the rules and English's parser, as their own chunk in a browser.
 * - And HTML's entity table (`P.HTMLEntities.load()`), even when the grammar came up front.
 * - How:  what `grammarLoadsWith()` was handed (`spell/parser/spell/grammarOnFirstUse`).
 * - Every caller gets the same load (`LoadOnce`);  once it's in, it costs nothing.
 * - throws what the load threw:  a page that can't fetch its chunk
 * - throws a `TypeError` where nothing said how to load it
 */
export async function loadGrammar(): Promise<void> {
  // HTML's entity table, which a drawing's text decodes with, loads beside it (epic `solid-2-final` I64)
  const entities = P.HTMLEntities.load()
  if (installed) return await entities
  const load = loader
  if (!load) {
    throw new TypeError(
      'loadGrammar():  nothing says how to load spell\'s grammar here;  import "spell/parser/spell/grammarOnFirstUse", ' +
        'or "spell/parser/spell/languages/en" up front'
    )
  }
  await Promise.all([grammarLoads.get("en", load), entities])
}

/**
 * Say how `loadGrammar()` loads the grammar on first use:  `() => import("spell/parser/spell/languages/en")`.
 * - Called once, by `spell/parser/spell/grammarOnFirstUse`, which a page imports for its side effect.
 */
export function grammarLoadsWith(load: () => Promise<unknown>): void {
  loader = load
}

let installed = false

/** How the grammar loads on first use -- see `grammarLoadsWith()`. */
let loader: (() => Promise<unknown>) | undefined

/** The one load of the grammar's chunk. */
const grammarLoads = new LoadOnce<string, unknown>()

/**
 * A stand-in for rule export `name` until the grammar loads:  any use of it throws, saying what to do.
 * - Used as a function, a class (`new`, `instanceof`) or an object (any property):  all throw.
 */
function notLoaded<T>(name: string): T {
  const fail = (): never => {
    throw new TypeError(
      `SP.${name}:  spell's grammar isn't loaded yet;  \`await SP.loadGrammar()\` first, ` +
        `or import "spell/parser/spell/languages/all" in a node program`
    )
  }
  return new Proxy(function standIn() {}, {
    // a symbol (`Symbol.hasInstance` aside) or `then`:  asked by whatever inspects a module, so not a use
    get: (target, key) =>
      (typeof key === "symbol" && key !== Symbol.hasInstance) || key === "then" ? undefined : fail(),
    apply: fail,
    construct: fail,
    has: fail,
    set: fail,
    getPrototypeOf: fail
  }) as T
}
