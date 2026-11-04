import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/****************
 * ### `SpellDeclarationPlaces`
 * Where each of a project's declarations is written, as its parser saw it (epic `editor` P23, Q31):
 * every type, property, method, event and ability, with its file and lines.
 * - The editor's side bar reads them to show a type's events, abilities and actions, and the code of each:
 *   never by matching the words of the text, so every one is found, in every language.
 * - Worked out as the project compiles, from each file's parse:  a statement's rule says what it declares
 *   (`getDeclaration()`), the scope it opens says which type it's about (`P.SubjectScope`).
 * - Written into the program's source map as `x_spellDeclarations`, beside its drawn parts' places:
 *   the build folder's, never what ships.
 * - Each type also lists the project's types it USES, from what it declares:  its supertype, the type of its items,
 *   and its members' value and parameter types (Q33).  What a method's body uses isn't counted yet.
 ****************/
export class SpellDeclarationPlaces {
  /**
   * Where everything `files` declare is written, in file order, each file by the name `nameOf()` gives its path.
   * - `files`:  the project's spell files, parsed (`match`), with the text they were parsed from (`parseText`).
   */
  static of(
    files: readonly { match?: P.Match; parseText?: string }[],
    nameOf: (path: string) => string = (path) => path
  ): SP.SpellDeclarationPlace[] {
    const places: SP.SpellDeclarationPlace[] = []
    const named = new Map<string, Set<string>>()
    for (const file of files) {
      const match = file.match
      const path = match?.getScopeOfType(P.FileScope)?.path
      if (!match || !path) continue
      const lineStarts = P.getLineStarts(file.parseText ?? match.inputText)
      const lineOf = (offset: number) => P.positionForOffset(lineStarts, offset)
      SpellDeclarationPlaces.walk(match, { path: nameOf(path), lineOf, places, named }, undefined)
    }
    SpellDeclarationPlaces.noteUses(places, named)
    return places
  }

  /** The declarations in `block`, each one's body's too, into `into.places`. */
  private static walk(
    block: P.Match,
    into: {
      path: string
      lineOf: (offset: number) => { line: number; ch: number }
      places: SP.SpellDeclarationPlace[]
      /** the type names each type's declarations name, by the type's class name */
      named: Map<string, Set<string>>
    },
    of: string | undefined
  ): void {
    for (const item of block.matched) {
      if (!(item instanceof P.Match)) continue
      if (item.rule.name === BLOCK) {
        SpellDeclarationPlaces.walk(item, into, of)
        continue
      }
      const statement = item.data.statement as P.Match | undefined
      if (!statement) continue
      const subject = subjectOf(statement)
      const place = SpellDeclarationPlaces.placeOf(item, statement, { ...into, of, subject })
      if (place) {
        into.places.push(place)
        const owner = place.kind === "type" ? place.name : place.of
        if (owner) {
          const names = into.named.get(owner) ?? new Set<string>()
          for (const name of typesNamedBy(statement)) names.add(name)
          into.named.set(owner, names)
        }
      }
      const body = statement.data.body as P.Match | undefined
      // a type's members, and a method's own;  never an `if`'s or a loop's:  their names aren't the file's
      if (body?.rule.name === BLOCK && (place?.kind === "type" || isAboutAType(statement))) {
        SpellDeclarationPlaces.walk(body, into, subject ?? of)
      }
    }
  }

  /** What `statement`, on `line`, declares, and where:  `undefined` for none, or a local variable. */
  private static placeOf(
    line: P.Match,
    statement: P.Match,
    {
      path,
      lineOf,
      of: owner,
      subject: typeName
    }: {
      path: string
      lineOf: (offset: number) => { line: number; ch: number }
      /** the type the block it's in is about */
      of: string | undefined
      /** the type its own body is about, for a type */
      subject: string | undefined
    }
  ): SP.SpellDeclarationPlace | undefined {
    const declaration = statement.rule.getDeclaration(statement)
    // a rule may say it's an ability or an event the person writes, whatever it declares (a list guard is a method)
    const { isAbility, isEvent } = statement.rule as P.Rule & { isAbility?: boolean; isEvent?: boolean }
    if (!isAbility && !isEvent && (!declaration || declaration.kind === "variable")) return undefined
    const { start, end } = line
    if (start === undefined || end === undefined) return undefined
    const from = lineOf(start)
    const kind: SP.SpellDeclarationPlace["kind"] = isAbility ? "ability" : isEvent ? "event" : declaration!.kind
    // a top-level function belongs to no type, even written under one
    const of = kind === "type" || kind === "function" ? undefined : (declaration?.of ?? owner)
    const body = statement.data.body as P.Match | undefined
    const code = body?.start !== undefined ? lineOf(body.start) : undefined
    return definedOnly({
      kind,
      name:
        kind === "type"
          ? (typeName ?? P.typeCase(declaration!.name))
          : isAbility || isEvent || !declaration
            ? wordsOf(statement)
            : declaration.name,
      of: of && P.typeCase(of),
      path,
      line: from.line,
      column: from.ch,
      endLine: lineOf(end).line,
      // its code, when it starts on its own first line after its words:  `- on click play it`
      codeColumn: code && code.line === from.line ? code.ch : undefined,
      output: kind === "type" ? undefined : declarationOf(statement)?.output,
      // `to test ...`:  the test methods written beside a type, for its Tests pane
      test: (statement.groups as { asTest?: unknown }).asTest ? (true as const) : undefined
    })
  }

  /**
   * Each type's `uses`:  the project's other types its declarations name, from `named` (its own and its members').
   * - What they name:  its supertype, the type of its items, its properties' and its methods' parameters' types.
   * - NOT what a method's body uses yet.
   */
  private static noteUses(places: SP.SpellDeclarationPlace[], named: Map<string, Set<string>>): void {
    const types = new Set(places.filter((place) => place.kind === "type").map((place) => place.name))
    for (const type of places) {
      if (type.kind !== "type") continue
      const uses = [...(named.get(type.name) ?? [])].filter((name) => types.has(name) && name !== type.name)
      if (uses.length) type.uses = uses
    }
  }
}

/** The type names `statement`'s declaration says, as class names:  `["Pile"]` for `a card belongs to one pile`. */
function typesNamedBy(statement: P.Match): string[] {
  const declaration = declarationOf(statement)
  if (!declaration) return []
  const said = [
    declaration.superType,
    declaration.itemType,
    declaration.datatype,
    declaration.returns,
    ...(declaration.params ?? []).map((param) => param.datatype)
  ]
  return said.filter((name): name is string => typeof name === "string" && !!name).map((name) => P.typeCase(name))
}

/** A statement opening a block of a type's members, `a card:`:  its body's scope is about the type. */
function isAboutAType(statement: P.Match): boolean {
  return subjectOf(statement) !== undefined
}

/** The type `statement`'s body is about, by class name:  `Card` for `a card:` or `a card is a thing`. */
function subjectOf(statement: P.Match): string | undefined {
  const scope = (statement.data.body as { scope?: unknown } | undefined)?.scope
  return scope instanceof P.SubjectScope ? scope.subject : undefined
}

/** The declaration `statement` makes, for its supertype:  `undefined` if it can't say. */
function declarationOf(statement: P.Match): SP.SpellDeclaration | undefined {
  try {
    return SP.SpellDeclarations.declarationFor(statement)
  } catch {
    return undefined
  }
}

/** An ability's words, up to its condition:  `clickable when`, `it is draggable`. */
function wordsOf(statement: P.Match): string {
  const text = statement.inputText.split("\n")[0]!.trim()
  const body = statement.data.body as P.Match | undefined
  const bodyText = body?.inputText.split("\n")[0]?.trim()
  return (bodyText && text.endsWith(bodyText) ? text.slice(0, -bodyText.length) : text).replace(/[:\s]+$/, "").trim()
}

/** `props` without the keys whose value is `undefined`. */
function definedOnly<T extends object>(props: T): T {
  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)) as T
}

/** A block of statements' rule. */
const BLOCK = "block"
