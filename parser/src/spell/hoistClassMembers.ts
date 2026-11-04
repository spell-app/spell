/**
 * Moves each class member into its class's body, so compiled spell reads like hand-written JS:
 * `export class Card extends Thing { get color() {...} ... }` rather than a bare class patched from below.
 * - Spell lets you declare a member anywhere after -- or before -- its class, even in another file of the
 *   project, e.g. `Card.move_to_$pile` in `Pile.spell`.
 * - A member whose class ISN'T among the statements given stays where it is, patched onto its class:
 *   `Card.prototype.play = function () {...}`.  See `P.ASTClassMember`.
 *   - A class from another project gets a class of our own first, so its members move into that:
 *     `subclassImportedTypes()` (epic `language` P26).
 */
import { P } from "spell/parser/parser"

/**
 * `files`' statements, with every member of a class declared in them moved into that class's body.
 * - Called on each block's statements (`SP.Block.getAST()`), then across a project's files
 *   (`SP.SpellProject.combineCompiled()`) -- a class from one file gets members from the others.
 * - A MEMBER is a statement whose code is all `P.ASTClassMember`s of ONE class, e.g. `Block.getAST()`'s group
 *   for a declaring line:  its docstring, its `SPELL: DECLARES` comment, then its code.
 *   - They go in in the order given:  file order, then source order, a blank line between each.
 *   - Comments directly above it go with it, e.g. a `## properties of cards` banner -- past a heading's
 *     `P.ASTHeadingInvocation`, which stays where it is.
 * - A class declared twice gets them in its first declaration.
 * - NEVER mutates what it's given:  ASTs are memoized per match, and shared with the editor.
 *   A class which gets members is a NEW `P.ASTClassDeclaration`, and so is each group holding it.
 * - Calling it again on its own output is fine:  a class which already has members just gets more.
 */
export function hoistClassMembers(files: HoistableStatement[][]): HoistableStatement[][] {
  const classNames = new Set<string>()
  for (const statements of files) {
    for (const statement of statements) forEachClass(statement, (declaration) => classNames.add(declaration.type.name))
  }
  if (!classNames.size) return files

  const members = new Map<string, ClassBodyItem[]>()
  const remaining = files.map((statements) => {
    const kept: HoistableStatement[] = []
    // comments, blank lines and headings since the last statement -- the comments go with a member below them
    let pending: HoistableStatement[] = []
    let removed = false
    for (const statement of statements) {
      if (
        statement instanceof P.ASTComment ||
        statement instanceof P.ASTBlankLine ||
        statement instanceof P.ASTHeadingInvocation
      ) {
        pending.push(statement)
        continue
      }
      const typeName = memberOf(statement)
      if (typeName && classNames.has(typeName)) {
        const firstComment = pending.findIndex((item) => item instanceof P.ASTComment)
        const carried = firstComment < 0 ? [] : pending.slice(firstComment)
        kept.push(...(firstComment < 0 ? pending : pending.slice(0, firstComment)))
        // a heading's call stays put, however it's placed among the comments
        kept.push(...carried.filter((item) => item instanceof P.ASTHeadingInvocation))
        const moved = carried.filter((item) => !(item instanceof P.ASTHeadingInvocation))
        addMember(members, typeName, [...moved, statement])
        removed = true
      } else {
        kept.push(...pending, statement)
      }
      pending = []
    }
    kept.push(...pending)
    return removed ? tidyBlankLines(kept) : kept
  })
  if (!members.size) return files
  return remaining.map((statements) => statements.map((statement) => withMembers(statement, members)))
}

/**
 * `files`' statements, with a class of our own for each IMPORTED type they add members to (epic `language` P26):
 * `export class Card extends CardsCard {...}`, so the library's own `Card` is never changed.
 * - e.g. Solitaire's `to play a card:`, for a cards library's `Card`:  Solitaire's `Card` extends the library's.
 * - Each class is a declaration of the type by its own name, extending ITSELF (`superType` is `type`):
 *   a writer reads that as "the imported class of that name" -- see `P.WriterProject.importedBases`.
 *   - Then `hoistClassMembers()` moves its members in, as for any class of the project.
 * - They go at the top of the first file, `files[into]`:  the program may make one anywhere.
 * - Members are found as `hoistClassMembers()` finds them, plus a patched one (`P.ASTPatchedMember`).
 * - Only for a type `scope`'s import layer brought (`P.ImportScope.origins`), by the name it was exported by:
 *   NOT a renamed one (`Card:Playingcard`), nor one the files declare themselves.
 * - Returns the names subclassed too, e.g. `["Card"]`.
 * - NEVER mutates what it's given.
 */
export function subclassImportedTypes(
  files: HoistableStatement[][],
  scope: P.Scope | undefined,
  into = 0
): { files: HoistableStatement[][]; names: string[] } {
  const imports = importLayerOf(scope)
  if (!imports?.origins.size || !files[into]) return { files, names: [] }
  const declared = new Set<string>()
  for (const statements of files) {
    for (const statement of statements) forEachClass(statement, (declaration) => declared.add(declaration.type.name))
  }
  const firstMember = new Map<string, HoistableStatement>()
  const note = (statement: HoistableStatement) => {
    const typeName = statement instanceof P.ASTPatchedMember ? statement.member.typeName : memberOf(statement)
    if (typeName) {
      if (!firstMember.has(typeName)) firstMember.set(typeName, statement)
    } else if (statement instanceof P.ASTStatementGroup) {
      statement.statements?.forEach(note)
    }
  }
  files.forEach((statements) => statements.forEach(note))
  const subclasses: HoistableStatement[] = []
  for (const [name, statement] of firstMember) {
    const type = imports.types.get(name, "LOCAL_ONLY")
    if (declared.has(name) || !type || type.runtimeName || !imports.origins.has(name)) continue
    const typeExpression = new P.ASTTypeExpression(statement.match, { name })
    subclasses.push(new P.ASTClassDeclaration(statement.match, { type: typeExpression, superType: typeExpression }))
    subclasses.push(new P.ASTBlankLine(statement.match))
  }
  if (!subclasses.length) return { files, names: [] }
  const names = subclasses.flatMap((it) => (it instanceof P.ASTClassDeclaration ? [it.type.name] : []))
  return {
    files: files.map((statements, index) => (index === into ? [...subclasses, ...statements] : statements)),
    names
  }
}

/** The import layer above `scope`, if any:  what its project imports from other projects. */
function importLayerOf(scope: P.Scope | undefined): P.ImportScope | undefined {
  for (let layer = scope; layer; layer = layer.parentScope) if (layer instanceof P.ImportScope) return layer
  return undefined
}

/** What a block holds, e.g. `P.ASTStatementGroup.statements`. */
export type HoistableStatement = NonNullable<P.ASTStatementGroupProps["statements"]>[number]

/** What goes in a class's body -- see `P.ASTClassDeclaration.members`. */
type ClassBodyItem = NonNullable<P.ASTClassDeclarationProps["members"]>[number]

/** Call `callback` for each class declared in `statement`, looking inside groups -- NOT nested blocks. */
function forEachClass(statement: HoistableStatement, callback: (declaration: P.ASTClassDeclaration) => void) {
  if (statement instanceof P.ASTClassDeclaration) callback(statement)
  else if (statement instanceof P.ASTStatementGroup) statement.statements?.forEach((it) => forEachClass(it, callback))
}

/**
 * `statement`'s comments, blank lines and class members, in order, looking inside groups.
 * - `undefined` if it holds anything else, e.g. a class declaration or an assignment.
 */
function classBodyItems(statement: HoistableStatement): ClassBodyItem[] | undefined {
  if (statement instanceof P.ASTClassMember || statement instanceof P.ASTComment) return [statement]
  if (statement instanceof P.ASTBlankLine) return [statement]
  if (!(statement instanceof P.ASTStatementGroup)) return undefined
  const items: ClassBodyItem[] = []
  for (const it of statement.statements ?? []) {
    const itsItems = classBodyItems(it)
    if (!itsItems) return undefined
    items.push(...itsItems)
  }
  return items
}

/** Name of the ONE class `statement` declares members of, if it's nothing but those -- see `classBodyItems()`. */
function memberOf(statement: HoistableStatement): string | undefined {
  const members = classBodyItems(statement)?.filter((item) => item instanceof P.ASTClassMember)
  const typeName = members?.[0]?.typeName
  if (!typeName || !members!.every((member) => member.typeName === typeName)) return undefined
  return typeName
}

/**
 * SIDE EFFECT:  adds `statements` -- a member and the comments above it -- to `members` for class `typeName`,
 * after a blank line if it has some already.
 */
function addMember(members: Map<string, ClassBodyItem[]>, typeName: string, statements: HoistableStatement[]) {
  const items = statements.flatMap((statement) => classBodyItems(statement) ?? [])
  const existing = members.get(typeName)
  if (!existing) members.set(typeName, items)
  else existing.push(new P.ASTBlankLine(statements[0]!.match), ...items)
}

/**
 * `statement` with `members` in its class's body -- itself if it declares no class which has any.
 * - SIDE EFFECT:  takes a class's members out of `members`, so a second declaration of it gets none.
 */
function withMembers(statement: HoistableStatement, members: Map<string, ClassBodyItem[]>): HoistableStatement {
  if (statement instanceof P.ASTClassDeclaration) {
    const added = members.get(statement.type.name)
    if (!added) return statement
    members.delete(statement.type.name)
    const separator = statement.members?.length ? [new P.ASTBlankLine(statement.match)] : []
    return statement.withMembers([...separator, ...added])
  }
  if (!(statement instanceof P.ASTStatementGroup) || !statement.statements) return statement
  const statements = statement.statements.map((it) => withMembers(it, members))
  if (statements.every((it, index) => it === statement.statements![index])) return statement
  return new P.ASTStatementGroup(statement.match, { statements })
}

/**
 * `statements` tidied where members were taken out:
 * - no blank lines at either end, two in a row, or right after a heading's `P.ASTHeadingInvocation`
 * - no heading's call with nothing but another's after it -- the heading's lines went with the member below it,
 *   and the next heading's call would override it anyway
 */
function tidyBlankLines(statements: HoistableStatement[]): HoistableStatement[] {
  const headed = statements.filter((statement, index) => {
    if (!(statement instanceof P.ASTHeadingInvocation)) return true
    const next = statements.slice(index + 1).find((it) => !(it instanceof P.ASTBlankLine))
    return !(next instanceof P.ASTHeadingInvocation)
  })
  const tidy = headed.filter((statement, index) => {
    if (!(statement instanceof P.ASTBlankLine)) return true
    const before = headed[index - 1]
    return !(before instanceof P.ASTBlankLine || before instanceof P.ASTHeadingInvocation)
  })
  while (tidy[0] instanceof P.ASTBlankLine) tidy.shift()
  while (tidy.at(-1) instanceof P.ASTBlankLine) tidy.pop()
  return tidy
}

/**
 * `statements` -- a FILE's top level -- with each class declared after its first running code moved up above it.
 * - So the program can use a type declared further down as it loads:
 *   `the stock is a new stock pile` above `a stock pile is a pile`.
 * - Why:  spell lets a line name a type declared anywhere in the project (its types are stubbed first);
 *   javascript and Python run a file top to bottom, and a class doesn't exist before its declaration.
 * - Classes keep their order, each with its own docstring (in its line's group).
 * - Everything else stays where it was:  banners, headings' calls and the code under them.
 *   So a heading still names the things its code makes, for the Thing Explorer.
 * - Running code:  any statement but a class declaration and the quiet ones (`isQuiet()`), e.g. comments.
 * - NEVER mutates what it's given.
 */
export function hoistClassDeclarations(statements: HoistableStatement[]): HoistableStatement[] {
  const firstCode = statements.findIndex((statement) => !isQuiet(statement) && !declaresClass(statement))
  if (firstCode < 0) return statements
  const rest = statements.slice(firstCode)
  const moved = rest.filter(declaresClass)
  if (!moved.length) return statements
  const blank = (statement: HoistableStatement) => new P.ASTBlankLine(statement.match)
  return tidyBlankLines([
    ...statements.slice(0, firstCode),
    blank(moved[0]!),
    ...moved.flatMap((statement) => [statement, blank(statement)]),
    ...rest.filter((statement) => !declaresClass(statement))
  ])
}

/**
 * Is `statement` QUIET:  does it run nothing that could need a class declared below it?
 * - comments, blank lines, headings' calls
 * - a member patched onto a class declared elsewhere, e.g. a property a `set` declared, at a file's top
 *   (a member of a class declared further down this file has moved into it already:  `hoistClassMembers()`)
 * - a group of only those
 */
function isQuiet(statement: HoistableStatement): boolean {
  if (statement instanceof P.ASTStatementGroup) return (statement.statements ?? []).every(isQuiet)
  return (
    statement instanceof P.ASTComment ||
    statement instanceof P.ASTBlankLine ||
    statement instanceof P.ASTHeadingInvocation ||
    statement instanceof P.ASTPatchedMember
  )
}

/** Does `statement` declare a class, and nothing else that runs?  e.g. a type's line, its comments in a group. */
function declaresClass(statement: HoistableStatement): boolean {
  if (statement instanceof P.ASTClassDeclaration) return true
  if (!(statement instanceof P.ASTStatementGroup)) return false
  const items = statement.statements ?? []
  return items.some(declaresClass) && items.every((item) => isQuiet(item) || declaresClass(item))
}
