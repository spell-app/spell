import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/****************
 * ### `UIViews`
 * A type built on a Spell UI element, its line naming the element:
 * `a "netlist column" is a ui tree view` is a view whose element is a `<ui-tree>` of its own.
 *
 * ```spell
 * a "netlist column" is a ui tree view
 * 	its appearance is columns
 * 	to give the row class of (an item)
 * 		return "port"
 * ```
 *
 * - Its line names the element by its noun, as a drawing does (`<tree>`), in the language's words for it
 *   (`LanguageWords.uiViewName`):  English's `ui tree view`, Spanish's `vista ui de árbol`.
 *   - Every element of the project's packs (`SP.ComponentPacks.viewBaseFor()`):  `ui button view` too.
 * - The words name a TYPE, made the first time a line names it, in the project's scope:  `UiTreeView`.
 *   - A view, with a property for each of the element's attributes, so its body sets one as it sets any:
 *     `its appearance is columns`.
 *   - Its hooks are the element's (`hookFor()`):  a `to` line in their words overrides one, compiled under the
 *     element's own name for it, `rowClass(item)`.
 * - Compiled, a type built on it extends `View`, naming its element:  `static uiElement = "ui-tree"` (`CreateType`).
 *   The page builds its tag on that element (app's `SpellElement.defineFor()`).
 * - Spell never imports Spell UI:  what each element is comes from its component pack, which the app registers.
 * - STATIC and instance-free on purpose:  the types are each project's scope's, and the hooks are kept by type.
 ****************/
export class UIViews {
  /**
   * The type `words` name, a Spell UI element's view, e.g. `ui tree view` -- `undefined` if they name none.
   * - Tries the longest run of `words` first, as a type's name of several words is read (`SpellType`).
   * - SIDE EFFECT:  the first time, adds the type to the project's scope (the nearest `P.RootScope`), with its
   *   properties' rules on its parser, as an import's types are added (`SP.SpellDeclarations.load()`).
   * - A lookup:  call it WHILE PARSING.
   */
  static typeFor(scope: P.Scope, words: readonly string[]): { type: P.TypeScope; count: number } | undefined {
    const language = SP.Language.of(scope)
    const [before, after] = language.words.uiViewName.split("{noun}") as [string, string]
    const lowered = words.map((word) => word.toLowerCase())
    // cheap first:  the words the language says around the noun, e.g. `ui` ... `view`
    if (!lowered.join(" ").startsWith(before.trim())) return undefined
    const lead = before.trim() ? before.trim().split(" ").length : 0
    const tail = after.trim() ? after.trim().split(" ").length : 0
    for (let count = lowered.length; count > lead + tail; count--) {
      const run = lowered.slice(0, count).join(" ")
      if (!run.endsWith(after.trim())) continue
      const noun = run.slice(before.length, run.length - after.length).trim()
      if (!noun) continue
      const packs = (scope.parser as SP.SpellParser | undefined)?.packs ?? SP.ComponentPacks.DEFAULT
      const base = SP.ComponentPacks.viewBaseFor(noun, language.lang, packs)
      if (!base) continue
      const type = UIViews.typeOf(scope, base)
      if (type) return { type, count }
    }
    return undefined
  }

  /** Is `type` a Spell UI element's view itself, `UiTreeView`, not a type built on one? */
  static isUIView(type: P.TypeScope): boolean {
    return BASES.has(type)
  }

  /** The Spell UI element `type` is built on, its own or a super-type's:  `<ui-tree>` -- `undefined` if none. */
  static baseOf(type: P.TypeScope): SP.ComponentViewBase | undefined {
    for (const each of type.chain()) {
      const base = BASES.get(each)
      if (base) return base
    }
    return undefined
  }

  /**
   * The element's hook a method of `type` with `signature`'s words overrides -- `undefined` if none.
   * - Its words as the hook's are, each argument in brackets standing for its type:
   *   `to give the row class of (an item)` is `rowClass`, the hook's words `give the row class of (an item)`.
   * - Case and the article before an argument's type don't count.
   */
  static hookFor(type: P.TypeScope, signature: { methodBits: readonly string[] }): SP.ComponentViewHook | undefined {
    const base = UIViews.baseOf(type)
    if (!base?.hooks.length) return undefined
    const written = UIViews.wordsKey(signature.methodBits.join(" "))
    return base.hooks.find((hook) => UIViews.wordsKey(UIViews.hookBits(hook.words)) === written)
  }

  ////////////////
  // ## The types
  ////////////////

  /** `base`'s type in `scope`'s project, made there the first time (`typeFor()`). */
  private static typeOf(scope: P.Scope, base: SP.ComponentViewBase): P.TypeScope | undefined {
    const name = P.classCase(`${base.tag}-view`)
    const known = scope.getType(name)
    if (known && BASES.has(known)) return known
    const home = UIViews.homeOf(scope)
    if (!home) return undefined
    SP.SpellDeclarations.load(home, {
      from: `${UI_VIEWS_FROM}/${base.tag}`,
      declarations: UIViews.declarationsOf(name, base)
    })
    const type = home.types.get(name, "LOCAL_ONLY")
    if (type) BASES.set(type, base)
    return type
  }

  /** The nearest `P.RootScope` above `scope`, its project's:  where an import's types go too. */
  private static homeOf(scope: P.Scope): P.RootScope | undefined {
    for (let at: P.Scope | undefined = scope; at; at = at.parentScope) {
      if (at instanceof P.RootScope) return at
    }
    return undefined
  }

  /**
   * `base`'s type, `name`, as declarations:  a view, with a property for each of its attributes.
   * - An attribute of several words, `column-titles`, is said with spaces, `its column titles`,
   *   and compiled as one name, `columnTitles`, which the element reads.
   */
  private static declarationsOf(name: string, base: SP.ComponentViewBase): SP.SpellDeclarationsData {
    const properties = base.attributes.map(({ name: attribute, output, values, valueOutputs }) => ({
      property: attribute.replace(/-/g, "_"),
      ...(attribute.includes("-") && { asWritten: attribute.replace(/-/g, " ") }),
      of: name,
      ...(output && output !== attribute && { output: output.replace(/-/g, "_") }),
      ...(values?.length ? { enumeration: [...values] } : { datatype: "text" }),
      ...(valueOutputs && { enumerationOutputs: { ...valueOutputs } })
    }))
    return {
      spellVersion: SP.SPELL_VERSION,
      provides: [name],
      statements: [{ type: name, superType: "View" }, ...properties]
    }
  }

  ////////////////
  // ## Hooks' words
  ////////////////

  /** A hook's words as a signature's bits read:  each `(an item)` its type, `$item`. */
  private static hookBits(words: string): string {
    return words.replace(/\(\s*(?:\S+\s+)?([^)]+?)\s*\)/g, (_all, noun: string) => `$${noun.replace(/\s+/g, "_")}`)
  }

  /** `words` as two hooks' words compare:  lowercase, accents and an argument's own name aside. */
  private static wordsKey(words: string): string {
    return words.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim()
  }
}

/** Where a Spell UI element's type says it came from, for its records:  `@spell/ui/ui-tree`. */
const UI_VIEWS_FROM = "@spell/ui"

/** The element each Spell UI element's type is built on, by type:  kept, not in scope, as only spell reads it. */
const BASES = new WeakMap<P.TypeScope, SP.ComponentViewBase>()
