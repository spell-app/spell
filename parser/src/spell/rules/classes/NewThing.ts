import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `new_thing` rule:  `a new object` -- constructs `type` (optionally `with`/`where`/`whose` `props`).
 * - NOTE: we assume that all types take an object of properties????
 * - Compiles to `new Type(...)`, e.g. `a new Thing with a = 1, b = yes` => `new Thing({ a: 1, b: true })`.
 * - A built-in member given in another language's words goes by its own name (epic `spanish` P15):
 *   `una nueva pila con nombre = "mazo"` => `new Pila({ name: "mazo" })` -- see `noteBuiltInNames()`.
 */
export class NewThing extends SpellStatement<"type|props?", { builtInNames?: Record<string, string> }> {
  @proto static alias = "expression"

  /** Notes the built-in members its props name in the language's own words -- see `noteBuiltInNames()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match) NewThing.noteBuiltInNames(match)
    return match
  }

  /** The type it makes, e.g. `Card`, `thing`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return SP.typeName(`${match.groups.type.value}`)
  }

  getAST(match: P.MatchFor<this>): P.ASTNewInstanceExpression {
    const { type, props } = match.groups
    return new P.ASTNewInstanceExpression(match, {
      type: P.matchAST<P.ASTTypeExpression>(type),
      props: NewThing.renamed(P.matchAST<P.ASTObjectLiteral>(props), match.data.builtInNames)
    })
  }

  ////////////////
  // ## Built-in members in the language's own words
  ////////////////

  /**
   * SIDE EFFECT:  notes each prop naming a built-in member in the language's own words, by the member's name,
   * in `match.data.builtInNames`, e.g. `{ nombre: "name" }` for `una nueva pila con nombre = "mazo"`.
   * - Only for a type spell knows comes from a built-in one:  see `SP.builtInStoredMember()`.
   * - A lookup:  call it WHILE PARSING.
   */
  private static noteBuiltInNames(match: P.MatchFor<NewThing>): void {
    const { scopeType } = (match.groups.type.data ?? {}) as { scopeType?: unknown }
    if (!(scopeType instanceof P.TypeScope)) return
    for (const item of match.groups.props?.items ?? []) {
      const key = `${(item.groups.property as P.Match | undefined)?.value ?? ""}`
      const name = key
        ? (SP.builtInStoredMember(scopeType, key)?.name ?? NewThing.storedNameAhead(match, scopeType, key))
        : undefined
      if (name && name !== key) match.data.builtInNames = { ...match.data.builtInNames, [key]: name }
    }
  }

  /**
   * The member `key` names in the language's own words, for a type used above its declaration (a stub):
   * e.g. `name` for `nombre`, in `- su "reserva" es una nueva pila de reserva con nombre = "reserva"`.
   * - Its super-types aren't known yet, so any built-in type's `stored` member, by the language's words for it:
   *   `nombre` compiles to `name` everywhere (J68).
   * - `undefined` for a type spell knows, or a word that's no built-in member's.
   */
  private static storedNameAhead(match: P.MatchFor<NewThing>, type: P.TypeScope, key: string): string | undefined {
    if (!type.stub) return undefined
    const words = SP.Language.of(match.scope).words.builtInMembers ?? {}
    const english = Object.keys(words).find((it) => words[it]!.includes(key))
    const isStored = SP.BUILT_IN_TYPE_TABLE.some((entry) =>
      entry.members.some((member) => member.stored && member.words === english)
    )
    return english && isStored ? SP.builtInMemberName(english) : undefined
  }

  /** `props`, each prop `names` holds going by the member's name instead:  `{ nombre: "mazo" }` => `{ name: "mazo" }`. */
  private static renamed(
    props: P.ASTObjectLiteral | undefined,
    names: Record<string, string> | undefined
  ): P.ASTObjectLiteral | undefined {
    if (!props || !names) return props
    const properties = props.properties.map((it) => {
      if (!(it instanceof P.ASTObjectLiteralProperty) || !names[it.property.value]) return it
      return new P.ASTObjectLiteralProperty(it.match, { property: names[it.property.value]!, value: it.value })
    })
    return new P.ASTObjectLiteral(props.match, { properties })
  }

  ////////////////
  // ## Names given in so many words
  //  So `tableau T1` can warn when two things are named T1 (epic `drawable-thing` P19):  see `named_thing`.
  ////////////////

  /**
   * The name `match` gives the thing it makes, in so many words:  `"T1"` for `a new tableau with name = "T1"`.
   * - `undefined` if `match` isn't a new thing, gives no name, or works its name out as the program runs,
   *   e.g. `a new tableau with name = ("T" + the number)`.
   */
  static nameGivenBy(match: P.Match | undefined): string | undefined {
    if (!match?.is(NewThing)) return undefined
    const { props } = match.groups
    for (const property of props?.items ?? []) {
      const { property: key, value } = property.groups as { property?: P.Match; value?: P.Match }
      const said = `${key?.value}`
      if ((match.data.builtInNames?.[said] ?? said) !== "name" || !value) continue
      const ast = P.matchAST(value)
      return ast instanceof P.ASTStringLiteral ? ast.value : undefined
    }
    return undefined
  }

  /**
   * Remember that `statement` names the thing it makes, when its `value` is a new thing given a name in so many words,
   * e.g. `set t1 to a new tableau with name = "T1"`, `get a new foundation with name = "clubs"`.
   * - Called from those statements' `mutateScope()`:  `assignment` and `get`.
   *   - A new thing made anywhere else, e.g. added straight to a list, isn't counted:  the warning stays careful.
   * - Kept for its type, and each super-type the project declares:  so `pile T1` counts a tableau named T1.
   * - Journaled, as any scope change:  incremental parsing takes it back.
   * - An earlier parse of the same statement is replaced, not counted twice (`P.TypeScope.sameStatement()`).
   */
  static noteNameGiven(value: P.Match, statement: P.Match): void {
    const name = NewThing.nameGivenBy(value)
    const { scopeType } = (value.groups.type as P.Match | undefined)?.data ?? {}
    if (name === undefined || !(scopeType instanceof P.TypeScope)) return
    for (const type of scopeType.chain()) {
      // the project's own types only:  a built-in type's record is shared by every project
      if (!type.declaredBy) continue
      const previous = NAMES_GIVEN.get(type)
      const kept = (previous ?? []).filter((given) => !P.TypeScope.sameStatement(given.statement, statement))
      const next = [...kept, { name, statement }]
      NAMES_GIVEN.set(type, next)
      statement.scope.parser?.journal?.record({
        undo: () => (previous ? NAMES_GIVEN.set(type, previous) : NAMES_GIVEN.delete(type)),
        redo: () => NAMES_GIVEN.set(type, next)
      })
    }
  }

  /** How many statements the project has naming a thing of `type`, or a sub-type, `name` -- see `noteNameGiven()`. */
  static namesGiven(type: P.TypeScope, name: string): number {
    return (NAMES_GIVEN.get(type) ?? []).filter((given) => given.name === name).length
  }
}

/** The names each type's things are given in so many words, and the statements giving them -- see `noteNameGiven()`. */
const NAMES_GIVEN = new WeakMap<P.TypeScope, Array<{ name: string; statement: P.Match }>>()
