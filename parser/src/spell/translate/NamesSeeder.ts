import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { TextLiteral } from "spell-parser/spell/rules/core"
import { Synonyms, Wording } from "spell-parser/spell/rules/expressions"
import { SubjectRule } from "spell-parser/spell/rules/types"
import { SpellJSX } from "spell-parser/spell/rules/JSX"
import { MethodSignature, QuotedMethodSignature, QuotedSignatureWords } from "spell-parser/spell/rules/methods"
import type { TranslationNames } from "./TranslationNames"
import type { SourceFile } from "./translate.types"

/**
 * Fills a names dictionary from a translation a PERSON made (epic `spanish` P24):
 * `spell translate Solitaire --to es --seed Solitario`, so the hand-made Solitario's names are reused.
 * - Reads the two projects side by side, file by file (each with the one it lines up with best), line by line:
 *   the lines lined up by what each is (a comment, a blank, a statement of which rule), so a line one has and the
 *   other doesn't (a comment split in two) only skips itself.
 * - Two lined-up statements give their names in pairs, slot by slot:  the same groups, `{type}` with `{type}`.
 *   - a type's (`carta`, with its gender from its declaration's article, `una "carta" es ...`)
 *   - a property's, variable's or value's (`rango`, `dama`)
 *   - a method's or phrase's words as declared (`voltearla boca arriba`)
 *   - a quoted text (`dama de espadas`), a comment
 * - Adds only what the dictionary lacks:  a name a person already chose stays.
 */
export class NamesSeeder {
  /** The dictionary to fill. */
  readonly names: TranslationNames
  /** How many names it added. */
  added = 0
  /** Each name's candidates so far, with how many lines said each:  the most said wins (`seed()`). */
  private votes = new Map<string, Map<string, number>>()

  constructor(names: TranslationNames) {
    this.names = names
  }

  /**
   * Add the names `theirs` (the hand-made translation's files) give `ours`:
   * each of ours with the one of theirs whose lines line up best with its own (`lineUp()`), not by their order.
   */
  seed(ours: SourceFile[], theirs: SourceFile[]): number {
    const unpaired = theirs.filter((file) => file.match)
    for (const file of ours) {
      if (!file.match) continue
      const ourLines = linesOf(file.match)
      const best = unpaired
        .map((other) => ({ other, score: lineUp(ourLines, linesOf(other.match!)).length }))
        .sort((a, b) => b.score - a.score)[0]
      if (!best?.score) continue
      unpaired.splice(unpaired.indexOf(best.other), 1)
      this.seedFile(file.match, best.other.match!)
    }
    // each name, the one most lines said
    for (const [words, candidates] of this.votes) {
      const [best] = [...candidates].sort((a, b) => b[1] - a[1])[0]!
      this.add("names", words, best)
    }
    return this.added
  }

  /** Add the names of each pair of lines `ours` and `theirs` (two files' `block` matches) line up. */
  seedFile(ours: P.Match, theirs: P.Match): void {
    const ourLines = linesOf(ours)
    const theirLines = linesOf(theirs)
    for (const [mine, other] of lineUp(ourLines, theirLines)) {
      if (mine.comment && other.comment) this.addComment(mine.comment, other.comment)
      if (mine.statement && other.statement) this.pair(mine.statement, other.statement, other.statement)
    }
  }

  ////////////////
  // ## Pairing matches
  ////////////////

  /** Add the names `ours` and `theirs`, two matches in the same place, hold;  `statement` is theirs's line. */
  pair(ours: P.Match, theirs: P.Match, statement: P.Match, slot?: string): void {
    if (ours.rule instanceof SpellJSX && theirs.rule instanceof SpellJSX) return this.pairJSX(ours, theirs, statement)
    if (ours.rule instanceof SpellJSX || theirs.rule instanceof SpellJSX) return
    if (isPhrase(ours) && isPhrase(theirs)) return this.add("phrases", unquoted(ours), this.unfused(unquoted(theirs)))
    // `to draw it` is `para dibujarla`:  a rule of its own in some languages, its words its `phrase`
    const theirPhrase = (theirs.groups as { phrase?: P.Match }).phrase
    const ourSignature = (ours.groups as { signature?: P.Match }).signature
    if (theirPhrase && ourSignature && isPhrase(ourSignature)) {
      this.add("phrases", unquoted(ourSignature), this.unfused(unquoted(theirPhrase)))
    }
    if (ours.rule instanceof TextLiteral && theirs.rule instanceof TextLiteral) {
      return this.add(slot === "alias" ? "phrases" : "texts", unquoted(ours), unquoted(theirs))
    }
    if (isLeaf(ours) && isLeaf(theirs)) return this.pairNames(ours, theirs, statement)
    const ourGroups = ours.groups as P.MatchGroups
    const theirGroups = theirs.groups as P.MatchGroups
    // a call of the project's own method:  its arguments only, its words are its declaration's
    const isCall = isCallOf(ours)
    for (const [name, value] of Object.entries(ourGroups)) {
      if (isCall && !CALL_GROUPS.includes(name)) continue
      const other = theirGroups[name]
      if (!value || !other) continue
      const mine = [value].flat()
      const others = [other].flat()
      mine.forEach((each, at) => {
        if (each !== ours && others[at] && others[at] !== theirs)
          this.pair(itemsIf(each), itemsIf(others[at]!), statement, name)
      })
      // a repeat's items, one by one:  `jack, queen or king`
      const ourItems = mine.filter((each) => each !== ours).flatMap(repeatItems)
      const theirItems = others.filter((each) => each !== theirs).flatMap(repeatItems)
      if (ourItems.length === theirItems.length)
        ourItems.forEach((each, at) => this.pair(each, theirItems[at]!, statement))
    }
    // a repeat itself, e.g. a list of values
    const ourItems = repeatItems(ours)
    const theirItems = repeatItems(theirs)
    if (ourItems.length && ourItems.length === theirItems.length) {
      ourItems.forEach((each, at) => this.pair(each, theirItems[at]!, statement))
    }
  }

  /** Add the name two leaves hold:  a type's (with its gender), else a name;  never a word of spell's own. */
  pairNames(ours: P.Match, theirs: P.Match, statement: P.Match): void {
    const { rule } = ours
    if (rule instanceof Wording || rule instanceof Synonyms || rule instanceof SubjectRule || rule.zeroWidth) return
    if ((rule as P.Pattern).VALUE_MAP && Object.keys((rule as P.Pattern).VALUE_MAP).length) return
    if (
      rule instanceof P.Literal ||
      rule instanceof P.Literals ||
      /^(?:number|method_keyword)$/.test(ours.ruleName ?? "")
    )
      return
    const mine = unquoted(ours)
    const other = unquoted(theirs)
    const { words } = this.names.from
    if (!/\p{L}/u.test(mine) || mine === "it" || words.blacklist[mine] || words.memberStopWords.has(mine)) return
    if (/type/.test(ours.ruleName ?? "")) {
      const { from, to } = this.names
      const singular = from.inflector.singularize(mine)
      if (from.typeWords[singular] || from.typeWords[mine]) return
      // a kind's values, `card ranks`:  the dictionary works it out from its type and its property
      if (singular.includes(" ") && this.names.data.types[singular.split(" ")[0]!]) return
      const gender = /quoted_type/.test(ours.ruleName ?? "") ? to.genderOf(firstWord(statement)) : undefined
      const existing = this.names.data.types[singular]
      if (existing && existing.name !== "TODO" && (existing.gender || !gender)) return
      this.names.add("types", singular, { name: to.inflector.singularize(other), ...(gender && { gender }) })
      if (!existing) this.added++
      return
    }
    const candidates = this.votes.get(mine) ?? new Map<string, number>()
    candidates.set(other, (candidates.get(other) ?? 0) + 1)
    this.votes.set(mine, candidates)
  }

  /** Add the texts and names two JSX elements hold:  their `{expressions}` and texts, in order, when as many. */
  pairJSX(ours: P.Match, theirs: P.Match, statement: P.Match): void {
    const ourParts = jsxParts(ours)
    const theirParts = jsxParts(theirs)
    if (ourParts.length !== theirParts.length) return
    ourParts.forEach((each, at) => {
      const other = theirParts[at]!
      if (each.text !== undefined && other.text !== undefined) this.add("texts", each.text, other.text)
      else if (each.match && other.match) this.pair(each.match, other.match, statement)
    })
  }

  /** `phrase` with `it` fused onto its verb (`voltearla`) written apart, as `voltear eso`:  fused again per type. */
  unfused(phrase: string): string {
    const { to } = this.names
    const itWord = [...(to.words.itWords ?? [])][0]
    if (!to.words.fusedIt || !itWord) return phrase
    return phrase
      .split(" ")
      .map((word) => {
        const verb = to.words.fusedIt!.exec(word)?.[1]
        return verb ? `${verb} ${itWord}` : word
      })
      .join(" ")
  }

  /** Add a comment's words, its marker off. */
  addComment(ours: P.Match, theirs: P.Match): void {
    const words = (match: P.Match) => match.inputText.trim().replace(/^(\/\/+|#+|--)\s*/, "")
    this.add("comments", words(ours), words(theirs))
  }

  /** Add `value` for `words` in section `kind`, unless there already. */
  add(kind: "names" | "phrases" | "texts" | "comments", words: string, value: string): void {
    const section = this.names.data[kind]
    if (!words || !value || (section[words] && section[words] !== "TODO")) return
    section[words] = value
    this.added++
  }
}

////////////////
// ## Lines
////////////////

/** One line of a file:  its statement and its comment, if any, and what kind of line it is. */
type SeedLine = { kind: string; statement?: P.Match; comment?: P.Match }

/** Every line of `block`, in order, the lines of each body below its statement's. */
function linesOf(block: P.Match): SeedLine[] {
  const lines: SeedLine[] = []
  const visit = (match: P.Match) => {
    for (const item of match.matched) {
      if (!(item instanceof P.Match)) continue
      if (item.rule instanceof SP.Block) {
        visit(item)
        continue
      }
      const children = item.matched.filter((each): each is P.Match => each instanceof P.Match)
      const comment = children.find((each) => each.ruleName === "comment")
      const statement = children.find((each) => each !== comment && each.ruleName !== "blank_line")
      const kind = statement ? `statement ${statementKind(statement)}` : comment ? "comment" : "blank"
      lines.push({ kind, statement, comment })
      if (statement) bodiesOf(statement).forEach(visit)
    }
  }
  visit(block)
  return lines
}

/** The `{expressions}` and texts of a JSX element, in order, at any depth. */
function jsxParts(match: P.Match): Array<{ match?: P.Match; text?: string }> {
  const parts: Array<{ match?: P.Match; text?: string }> = []
  const visit = (each: P.Match | undefined) => {
    if (!each) return
    const data = each.data as {
      expression?: P.Match
      statement?: P.Match
      attributes?: P.Match[]
      children?: P.Match[]
    }
    if (each.ruleName === "jsxText") {
      const text = each.inputText.trim()
      if (text) parts.push({ text })
      return
    }
    if (each.ruleName === "jsxExpression" || each.ruleName === "jsxAttribute") {
      const expression = data.expression ?? data.statement
      if (expression) parts.push({ match: expression })
      return
    }
    data.attributes?.forEach(visit)
    data.children?.forEach(visit)
  }
  visit(match)
  return parts
}

/** What a statement is, to line it up:  its rule's class, or `call` for a call of the project's own method. */
function statementKind(statement: P.Match): string {
  if (statement.rule.constructor.name === "DrawIt") return "ToDoSomething"
  return statement.rule.constructor.name.includes("$") || /^[a-z_]+$/.test(statement.rule.constructor.name)
    ? "call"
    : statement.rule.constructor.name
}

/** `ours` and `theirs` lined up by kind, their longest common run:  the pairs. */
function lineUp(ours: SeedLine[], theirs: SeedLine[]): Array<[SeedLine, SeedLine]> {
  const rows = ours.length + 1
  const columns = theirs.length + 1
  const lengths = Array.from({ length: rows }, () => new Array<number>(columns).fill(0))
  for (let i = ours.length - 1; i >= 0; i--) {
    for (let j = theirs.length - 1; j >= 0; j--) {
      lengths[i]![j] =
        ours[i]!.kind === theirs[j]!.kind
          ? lengths[i + 1]![j + 1]! + 1
          : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!)
    }
  }
  const pairs: Array<[SeedLine, SeedLine]> = []
  let i = 0
  let j = 0
  while (i < ours.length && j < theirs.length) {
    if (ours[i]!.kind === theirs[j]!.kind) pairs.push([ours[i++]!, theirs[j++]!])
    else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) i++
    else j++
  }
  return pairs
}

/** The bodies (`block` matches) in `statement`, not inside another body. */
function bodiesOf(statement: P.Match): P.Match[] {
  const bodies: P.Match[] = []
  const visit = (match: P.Match) => {
    for (const child of match.matched) {
      if (!(child instanceof P.Match)) continue
      if (child.rule instanceof SP.Block) bodies.push(child)
      else visit(child)
    }
  }
  visit(statement)
  return bodies
}

////////////////
// ## Helpers
////////////////

/** The groups a call of a project's own method holds its arguments in. */
const CALL_GROUPS = ["thisArg", "callArgs", "expression", "props"]

/** Is `match` a call of a method the project declared (a rule made while parsing, `turn_face_up`)? */
function isCallOf(match: P.Match): boolean {
  return statementKind(match) === "call"
}

/** Is `match` a method's or quoted phrase's words, as declared? */
function isPhrase(match: P.Match): boolean {
  const { rule } = match
  return (
    rule instanceof MethodSignature || rule instanceof QuotedMethodSignature || rule instanceof QuotedSignatureWords
  )
}

/** Does `match` hold no match below it? */
function isLeaf(match: P.Match): boolean {
  return !match.matched.some((each) => each instanceof P.Match) || match.rule instanceof SubjectRule
}

/** A repeat's items, without its delimiters;  none for a match that isn't a repeat. */
function repeatItems(match: P.Match): P.Match[] {
  if (!(match.rule instanceof P.Repeat)) return []
  return match.items ?? []
}

/** `match` itself, or a repeat's only item. */
function itemsIf(match: P.Match): P.Match {
  if (isPhrase(match)) return match
  const items = repeatItems(match)
  return items.length === 1 ? items[0]! : match
}

/** `match`'s text, its quotes off. */
function unquoted(match: P.Match): string {
  return match.inputText.trim().replace(/^"|"$/g, "")
}

/** The first word of `match`'s text, lowercased:  a declaration's article. */
function firstWord(match: P.Match): string {
  return match.inputText.trim().split(/\s+/)[0]!.toLowerCase()
}
