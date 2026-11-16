import { P } from "spell/parser/parser"

/**
 * What changed in shared parse state when files parsed again, and which records took the place of which
 * (epic `language` P59).
 * - Why:  after an EARLIER file parses again (a member renamed, a kind added), a later file needn't, if what it looked
 *   up still finds the same:  `P.IncrementalProject` keeps it, its journal entries put back onto the new records,
 *   and what its lines point at moved from each old record to its new one -- see `keepPlan()`.
 * - `compare()` each file that parsed again:  its journal entries from before, against those from now.
 *   - A record in a scope list is the "same" as the one in its place by key, if it holds the same:
 *     its own fields, with each match, scope or record of the same parse written as what it is, not which one.
 *   - A field set on a record that outlives the parse (a type's `superType`), the same by its last value.
 *   - A rule, the same by its class and what it was made with.
 * - Knows nothing of files or projects:  each `P.Outline` asks it whether that file's lookups find something else.
 */
export class ParseDiff {
  /** Each list (or type, for its notes) whose items changed, and the keys that did -- `undefined`:  their order. */
  readonly changedKeys = new Map<object, Set<string | undefined>>()
  /** The records of each list whose key changed, from before and now:  what an outline's scan is asked about. */
  readonly changedItems = new Map<object, Set<unknown>>()
  /** Records whose own fields changed, e.g. a type's `superType`, or a list whose owner went away. */
  readonly changedRecords = new Set<object>()
  /** Each record, rule or match from before which has a new one in its place, and that one. */
  readonly replacements = new Map<object, object>()
  /** What a parse made before which has nothing in its place now:  nothing kept may point at it. */
  readonly gone = new Set<object>()
  /** Records a file that parsed again set fields on:  a kept file setting them too couldn't be put back on top. */
  readonly touched = new Set<object>()
  /**
   * Each rule added or taken away, by its name:  a line, anywhere, might read differently --
   * unless the rule can't match a word of it (`keepPlan()`).
   */
  readonly changedRules = new Map<string, P.Rule[]>()
  /** A change that didn't say what it was (`P.JournalChange.change`):  nothing can be kept. */
  isUnknown = false
  /** What `keepPlan()` walked already, this update:  a kept file's lines and records point at nothing gone. */
  private readonly walked = new Set<object>()

  /**
   * Can nothing be kept from a file with `text`, whatever it looked up?
   * - A change didn't say what it was, or a rule that changed might match some of `text`:
   *   it isn't a sequence whose required words `text` holds (`P.Sequence.requiredWords`).
   */
  keepsNothing(text: string): boolean {
    if (this.isUnknown) return true
    if (!this.changedRules.size) return false
    const words = new Set(text.toLowerCase().split(/[^\p{L}\p{N}_'-]+/u))
    const cantMatch = (rule: P.Rule) =>
      rule instanceof P.Sequence &&
      !!rule.requiredWords?.some((alternatives) =>
        alternatives.every((alternative) =>
          alternative
            .toLowerCase()
            .split(/\s+/)
            .some((word) => !words.has(word))
        )
      )
    return [...this.changedRules.values()].some((rules) => !rules.every(cantMatch))
  }

  /**
   * Add what changed between `before` and `after`:  the journal entries of a file's parse, or its stubs, then and now.
   * - `before`'s records are as its rewind left them:  each field set as it parsed comes from its entry.
   * - `oldMatch`, `newMatch`:  the file's match then and now, if it has one:  every match under the old one is gone,
   *   and every scope only the old one reached.
   */
  compare(before: P.JournalEntry[], after: P.JournalEntry[], oldMatch?: P.Match, newMatch?: P.Match): void {
    const old = changesIn(before)
    const now = changesIn(after)
    if (!old || !now) {
      this.isUnknown = true
      return
    }
    const oldItems = itemKeys(old)
    const newItems = itemKeys(now)
    const oldSign = new Signer(oldItems, old.assigns)
    const newSign = new Signer(newItems, now.assigns)

    // records in lists, by key
    for (const list of new Set([...old.lists.keys(), ...now.lists.keys()])) {
      const was = old.lists.get(list) ?? []
      const is = now.lists.get(list) ?? []
      const wasKeys = byKey(list, was)
      const isKeys = byKey(list, is)
      for (const key of new Set([...wasKeys.keys(), ...isKeys.keys()])) {
        const then = wasKeys.get(key) ?? []
        const nowItems = isKeys.get(key) ?? []
        const same =
          then.length === nowItems.length &&
          then.every((item, index) => oldSign.of(item) === newSign.of(nowItems[index]))
        if (!same) {
          this.changeKey(list, key)
          const changed = this.changedItems.get(list) ?? new Set()
          for (const item of [...then, ...nowItems]) changed.add(item)
          this.changedItems.set(list, changed)
        } else then.forEach((item, index) => item !== nowItems[index] && this.replacements.set(item!, nowItems[index]!))
      }
      if ([...wasKeys.keys()].join("\n") !== [...isKeys.keys()].join("\n")) this.changeKey(list, undefined)
    }
    for (const item of oldItems.keys()) if (!this.replacements.has(item) && !newItems.has(item)) this.gone.add(item)

    // fields set on records that outlive the parse
    for (const target of new Set([...old.assigns.keys(), ...now.assigns.keys()])) {
      if (oldItems.has(target) || newItems.has(target)) continue
      this.touched.add(target)
      const was = old.assigns.get(target)
      const is = now.assigns.get(target)
      for (const prop of new Set([...Object.keys(was?.last ?? {}), ...Object.keys(is?.last ?? {})])) {
        const then = was && prop in was.last ? was.last[prop] : is!.first[prop]
        const value = is && prop in is.last ? is.last[prop] : was!.first[prop]
        if (oldSign.of(then) !== newSign.of(value)) this.changedRecords.add(target)
      }
    }

    // rules, by name
    for (const name of new Set([...old.rules.keys(), ...now.rules.keys()])) {
      const was: P.Rule[] = old.rules.get(name) ?? []
      const is: P.Rule[] = now.rules.get(name) ?? []
      const same = was.length === is.length && was.every((rule, index) => oldSign.of(rule) === newSign.of(is[index]))
      if (same) {
        was.forEach((rule, index) => rule !== is[index] && this.replacements.set(rule, is[index]!))
        continue
      }
      // which rules were added or taken away:  by signature, each matched once;  a match is its replacement
      const left = is.map((rule) => newSign.of(rule) as string | undefined)
      const differing: P.Rule[] = []
      for (const rule of was) {
        const at = left.indexOf(oldSign.of(rule))
        if (at === -1) {
          differing.push(rule)
          this.gone.add(rule)
          continue
        }
        left[at] = undefined
        if (rule !== is[at]) this.replacements.set(rule, is[at]!)
      }
      differing.push(...is.filter((_, index) => left[index] !== undefined))
      const ruleName = name.split("\n")[1]!
      this.changedRules.set(ruleName, [...(this.changedRules.get(ruleName) ?? []), ...differing])
    }

    // notes on a type:  each value its own key
    for (const target of new Set([...old.notes.keys(), ...now.notes.keys()])) {
      const was = old.notes.get(target) ?? new Set()
      const is = now.notes.get(target) ?? new Set()
      for (const value of was) if (!is.has(value)) this.changeKey(target, String(value))
      for (const value of is) if (!was.has(value)) this.changeKey(target, String(value))
    }

    // matches and scopes the old parse made
    if (oldMatch) {
      const kept = new Set<object>()
      if (newMatch) eachMatch(newMatch, (match) => kept.add(match).add(match.scope))
      eachMatch(oldMatch, (match) => {
        if (!kept.has(match)) this.gone.add(match)
        if (!kept.has(match.scope)) this.gone.add(match.scope)
      })
    }
  }

  /**
   * How to keep a file whose journal entries are `entries` and whose lookups are `outline`:  the fields to point at
   * new records, as `[holder, key, value]` -- or `undefined` when it can't be kept, and must parse again.
   * - `roots`:  what holds its lines and records, e.g. its match;  everything under it is walked
   *   (each match's groups, data and AST), but not into scopes, rules, the parser or tokens.
   * - Can't be kept:
   *   - a lookup would find something else (`P.Outline.isAffectedBy()`)
   *   - an entry that didn't say what it changed, or set fields on a record a file that parsed again set too:
   *     put back, it would set them as they were
   *   - something under it points at what's gone
   * - Changes nothing:  the caller sets each field, then puts its entries back.
   */
  keepPlan(entries: P.JournalEntry[], outline: P.Outline, roots: unknown[], text: string): KeepPlan | undefined {
    if (this.keepsNothing(text)) return undefined
    if (outline.isAffectedBy(this)) return undefined
    const outgone = (it: unknown) => !!it && (this.gone.has(it as object) || this.replacements.has(it as object))
    for (const entry of entries) {
      if (!("undo" in entry)) continue
      const { change } = entry
      if (!change) return undefined
      if (change.kind === "list") {
        const owner = change.list.props.target as object | undefined
        if (outgone(owner) || change.items.some(outgone)) return undefined
      } else if (change.kind === "assign") {
        if (outgone(change.target) || this.touched.has(change.target)) return undefined
        roots.push(change.next)
      } else if (change.kind === "note" && outgone(change.target)) return undefined
      if (change.kind === "list") roots.push(...change.items)
    }
    return this.repoint(roots)
  }

  /** Walk `roots`, noting each field pointing at a record with a new one in its place:  `undefined` if one's gone. */
  private repoint(roots: unknown[]): KeepPlan | undefined {
    const plan: KeepPlan = []
    const stack = roots.filter(isWalkable)
    // only once it can be kept:  a walk given up on hasn't looked inside everything it passed
    const walked = new Set<object>()
    while (stack.length) {
      const holder = stack.pop()!
      if (this.walked.has(holder) || walked.has(holder)) continue
      walked.add(holder)
      if (holder instanceof Map || holder instanceof Set) {
        for (const value of holder.values()) {
          if (this.replacements.has(value) || this.gone.has(value)) return undefined
          if (isWalkable(value)) stack.push(value)
        }
        continue
      }
      for (const key of Object.keys(holder)) {
        const value = (holder as Record<string, unknown>)[key]
        if (!value || (typeof value !== "object" && typeof value !== "function")) continue
        const replacement = this.replacements.get(value)
        if (replacement) plan.push([holder, key, replacement])
        else if (this.gone.has(value)) return undefined
        else if (isWalkable(value)) stack.push(value)
      }
    }
    for (const holder of walked) this.walked.add(holder)
    return plan
  }

  /** Note `key` of `list` (or a type) changed:  `undefined` for their order. */
  private changeKey(list: object, key: string | undefined) {
    let keys = this.changedKeys.get(list)
    if (!keys) this.changedKeys.set(list, (keys = new Set()))
    keys.add(key)
  }
}

/** Fields to point at new records, to keep a file:  `[holder, key, value]` -- see `ParseDiff.keepPlan()`. */
export type KeepPlan = Array<[holder: object, key: string, value: object]>

////////////////
// ## Reading journal entries
////////////////

/** What one run of journal entries changed, by kind -- see `changesIn()`. */
type Changes = {
  /** Records added to each list, in order. */
  lists: Map<P.ScopeList, unknown[]>
  /** Fields set on each record:  the first value each had before, the last each was given. */
  assigns: Map<object, { first: Record<string, unknown>; last: Record<string, unknown> }>
  /** Rules added, by their parser's and their name:  `<parser id>\n<rule name>`. */
  rules: Map<string, P.Rule[]>
  /** Notes against each type. */
  notes: Map<object, Set<unknown>>
}

/** What `entries` changed -- `undefined` if one didn't say. */
function changesIn(entries: P.JournalEntry[]): Changes | undefined {
  const changes: Changes = { lists: new Map(), assigns: new Map(), rules: new Map(), notes: new Map() }
  for (const entry of entries) {
    if (!("undo" in entry)) continue
    const { change } = entry
    if (!change) return undefined
    if (change.kind === "list") {
      const items = changes.lists.get(change.list) ?? []
      changes.lists.set(change.list, [...items, ...change.items])
    } else if (change.kind === "assign") {
      const fields = changes.assigns.get(change.target) ?? { first: {}, last: {} }
      for (const [key, value] of Object.entries(change.previous)) if (!(key in fields.first)) fields.first[key] = value
      Object.assign(fields.last, change.next)
      changes.assigns.set(change.target, fields)
    } else if (change.kind === "rule") {
      const key = `${idOf(change.parser)}\n${change.ruleName}`
      changes.rules.set(key, [...(changes.rules.get(key) ?? []), change.rule])
    } else {
      const values = changes.notes.get(change.target) ?? new Set()
      values.add(change.value)
      changes.notes.set(change.target, values)
    }
  }
  return changes
}

/** Every record `changes` added to a list, and its key there. */
function itemKeys(changes: Changes): Map<object, string> {
  const keys = new Map<object, string>()
  for (const [list, items] of changes.lists) {
    for (const item of items) if (item && typeof item === "object") keys.set(item, list.getKeyFor(item) ?? "")
  }
  return keys
}

/** `items` of `list` by key, each key's in order;  keys in the order first added. */
function byKey(list: P.ScopeList, items: unknown[]): Map<string, unknown[]> {
  const keys = new Map<string, unknown[]>()
  for (const item of items) {
    const key = list.getKeyFor(item) ?? ""
    keys.set(key, [...(keys.get(key) ?? []), item])
  }
  return keys
}

/** Call `visit` with `match` and every match under it. */
function eachMatch(match: P.Match, visit: (match: P.Match) => void) {
  const stack: P.Match[] = [match]
  const seen = new Set<P.Match>()
  while (stack.length) {
    const at = stack.pop()!
    if (seen.has(at)) continue
    seen.add(at)
    visit(at)
    for (const it of at.matched ?? []) if (it instanceof P.Match) stack.push(it)
    for (const it of at.items ?? []) stack.push(it)
  }
}

/** May `keepPlan()` walk into `value`?  Not into scopes, rules, the parser or tokens:  they're shared, or ours. */
function isWalkable(value: unknown): value is object {
  return (
    !!value &&
    typeof value === "object" &&
    !(value instanceof P.Scope) &&
    !(value instanceof P.Rule) &&
    !(value instanceof P.Parser) &&
    !(value instanceof P.Token) &&
    !(value instanceof P.ScopeList)
  )
}

/** A number for `object`, the same each time it's asked:  so a signature can name it without walking it. */
function idOf(object: object): number {
  let id = IDS.get(object)
  if (id === undefined) IDS.set(object, (id = IDS_SO_FAR.next++))
  return id
}
const IDS = new WeakMap<object, number>()
const IDS_SO_FAR = { next: 1 }

/**
 * Writes what a value holds as text, so a record from one parse can be compared with one from another.
 * - A record the same parse added to a list is its key:  `record:<key>`, not walked again.
 *   Its fields are as they are now, then as the parse's own entries set them (`assigns`).
 * - A match is just `match`, a scope its class (a type, its name):  where it was parsed isn't what it holds.
 * - A rule is its class, its name and what it was made with;  a class or function, its name.
 * - Anything else that outlived the parse is itself, by `idOf()`.
 */
class Signer {
  /** Signatures worked out so far. */
  private readonly done = new Map<unknown, string>()

  constructor(
    private readonly items: Map<object, string>,
    private readonly assigns: Changes["assigns"]
  ) {}

  /** `value`'s signature:  equal for two parses' records that hold the same. */
  of(value: unknown, depth = 0): string {
    if (value === null || value === undefined) return String(value)
    if (typeof value !== "object" && typeof value !== "function") return JSON.stringify(value)
    if (depth > 0 && this.items.has(value)) return `record:${this.items.get(value)}`
    if (value instanceof P.Match) return "match"
    if (value instanceof P.TypeScope) return `type:${value.name}`
    if (value instanceof P.Scope) return `scope:${value.constructor.name}`
    if (value instanceof P.Token || value instanceof P.Parser || value instanceof P.ScopeList) return `#${idOf(value)}`
    if (typeof value === "function") {
      const made = value as { specializedFrom?: { name: string }; specializedWith?: unknown }
      if (!made.specializedFrom) return `function:${value.name}`
      return `class:${made.specializedFrom.name}(${this.of(made.specializedWith, depth + 1)})`
    }
    if (value instanceof P.Rule) {
      const made = value.constructor as unknown as { specializedWith?: unknown }
      const { syntax } = value as { syntax?: unknown }
      return `rule:${value.constructor.name}:${value.name}:${this.of(made.specializedWith, depth + 1)}:${String(syntax)}`
    }
    if (depth > 6) return `#${idOf(value)}`
    const known = this.done.get(value)
    if (known !== undefined) return known
    this.done.set(value, `#${idOf(value)}`)
    let signature: string
    if (Array.isArray(value)) signature = `[${value.map((it) => this.of(it, depth + 1)).join(",")}]`
    else if (value instanceof Map || value instanceof Set) signature = `#${idOf(value)}`
    else {
      const fields: Record<string, unknown> = { ...value, ...this.assigns.get(value)?.last }
      const keys = Object.keys(fields)
        .filter((key) => typeof fields[key] !== "function" && fields[key] !== undefined)
        .sort()
      signature = `${value.constructor?.name ?? "{}"}{${keys.map((key) => `${key}=${this.of(fields[key], depth + 1)}`).join(",")}}`
    }
    this.done.set(value, signature)
    return signature
  }
}
