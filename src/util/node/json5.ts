/**
 * Reading and writing JSON5 so its COMMENTS stay:  the one helper every JSON5 edit goes through.
 * - In util so every tool that writes JSON5 may import it, from the bottom of the stack:
 *   spaces' people and projects, the component sets' site data (whose writers are in ui), the app's, brand's and
 *   spell-epic's site data, and the server's `DataFile`.
 *   - Born in spaces (epic `people-and-orgs` P8, decisions Q4 and J41);  in the kit's assembler from epic `epic-workflow`
 *     P20;  here since epic `repo-split` P1, so its users need util, not the assembler.
 * - `spell/util/node/json5`, never the `spell/util` barrel:  `src/node/` is util's node-only corner, which ui never imports.
 *
 * ```ts
 * json5Edited('{\n  // who\n  "name": "Owen"\n}', { name: "O" })
 * // => '{\n  // who\n  "name": "O"\n}'
 * ```
 *
 * - It writes a WHOLE value at a time (Owen's pick, decision J41), and removes any key the value leaves out.
 *   So an edit reads the file, changes the object, and writes all of it back.
 *   - An array is matched item by item, by position:
 *     a comment inside an item stays with that POSITION when an item before it comes or goes.
 * - It only touches the text of what changed:  `Json5Editor`, below, edits the source in place.
 * - Spell writes the JSON-compatible part of JSON5:  keys and text in double quotes, no trailing commas;
 *   a person's comments, wherever they are, stay.
 *   - Unless their key goes too:  the comments above a removed key, and the one beside it, go with it.
 * - NODE ONLY:  `node/` is util's node-only corner, though only reading files here needs node.
 * - Imports only `json5` and node's own modules, so plain `node` loads it;  NEVER an `enum` or a parameter property.
 */
import { existsSync, readFileSync } from "node:fs"

import JSON5 from "json5"

/**
 * `source` (a JSON5 file's text) with its value replaced by `value`:
 * - every comment, and every key `value` keeps, where it was
 * - a key `value` leaves out, gone;  a new one added at the end
 * - a key holding `undefined` is left as it is in `source`
 * - An empty `source`:  `value` alone, two-space indented.
 * - throws `SyntaxError` when `source` won't read as JSON5
 */
export function json5Edited(source: string, value: object): string {
  if (!source.trim()) return `${JSON.stringify(value, null, 2)}\n`
  const text = new Json5Editor(source).edited(value)
  return text.endsWith("\n") ? text : `${text}\n`
}

/**
 * JSON5 file `file`, read.
 * - Throws `SyntaxError` naming the file when it won't read as JSON5;  node's own error when it isn't there.
 */
export function readJSON5File<T = unknown>(file: string): T {
  const text = readFileSync(file, "utf8")
  try {
    return JSON5.parse(text) as T
  } catch (error) {
    throw new SyntaxError(`${file}:  ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
}

/**
 * What a GENERATOR writes over a JSON5 file that held `before`, its own output being `text` (plain JSON):
 * - `text` itself, in the generator's own layout, while `before` is plain JSON too (or empty):
 *   nobody has written a comment into it.
 * - Once somebody has (`before` reads only as JSON5):  `before` edited to `text`'s value (`json5Edited()`),
 *   so their comments stay.
 * - Unchanged values leave `before` as it was, comments and all:  a generator's `--check` stays quiet.
 *
 * ```ts
 * keepingComments('{\n  // why\n  "a": 1\n}\n', '{\n  "a": 2\n}\n')
 * // => '{\n  // why\n  "a": 2\n}\n'
 * ```
 */
export function keepingComments(before: string, text: string): string {
  if (!before.trim() || isPlainJSON(before)) return text
  return json5Edited(before, JSON5.parse(text) as object)
}

/**
 * `keepingComments()` over file `file` as it is now (none yet:  `text`).
 * - A file that isn't `.json5`:  `text` as it is, so a generator may pass every file it writes through this.
 * - Throws `SyntaxError` naming the file when it holds JSON5 that won't read.
 */
export function keepingCommentsIn(file: string, text: string): string {
  if (!file.endsWith(".json5")) return text
  const before = existsSync(file) ? readFileSync(file, "utf8") : ""
  try {
    return keepingComments(before, text)
  } catch (error) {
    throw new SyntaxError(`${file}:  ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
}

/** Whether `text` reads as plain JSON:  no comments, no JSON5-only syntax. */
function isPlainJSON(text: string): boolean {
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

/** Where a comment ends:  `found` plus `extra` (the closing `*\/`), or the text's end when it was never closed. */
export function commentEnd(found: number, text: string, extra = 0): number {
  return found === -1 ? text.length : found + extra
}

/** Where the string starting at `start` ends, its closing quote included. */
export function stringEnd(text: string, start: number): number {
  const quote = text[start]
  let at = start + 1
  while (at < text.length && text[at] !== quote) at += text[at] === "\\" ? 2 : 1
  return Math.min(at + 1, text.length)
}

/** Where the bare value (a number, `true`, an unquoted key) starting at `start` ends. */
export function wordEnd(text: string, start: number): number {
  let at = start
  while (at < text.length && !/[\s,:{}[\]"'/]/.test(text[at]!)) at++
  return Math.max(at, start + 1)
}

/****************
 * ### `Json5Editor`
 * One JSON5 text, turned into another value by changing only the parts of the text that differ.
 * - Reads the text into a tree of where each thing is (`Json5Node`), then walks it beside the new value,
 *   collecting edits (`Json5Edit`) which are applied together.
 * - So what didn't change keeps its exact text:  a value that's the same leaves the file as it was.
 * - Written for Spell (epic `epic-engine` P67) when json5-writer, on an old jscodeshift, was most of what
 *   `npm install` warned about.
 * - The text is checked first (`JSON5.parse()`), so the reading here can assume it's good.
 ****************/
class Json5Editor {
  /** The source text. */
  readonly text: string
  /** Where the reading has got to. */
  private at = 0
  /** The changes to make to `text`. */
  private readonly edits: Json5Edit[] = []

  constructor(text: string) {
    this.text = text
  }

  /** The text, changed to hold `value`.  Throws `SyntaxError` when it won't read as JSON5. */
  edited(value: unknown): string {
    const parsed: unknown = JSON5.parse(this.text)
    this.skipTrivia()
    this.editNode(this.readNode(), parsed, value, "")
    return this.applied()
  }

  ////////////////
  // ## Reading
  ////////////////

  /** The value at `at`:  moves `at` past it. */
  private readNode(): Json5Node {
    const start = this.at
    const char = this.text[start]
    if (char === "{" || char === "[") return this.readContainer(start, char === "{" ? "object" : "array")
    this.at = char === '"' || char === "'" ? stringEnd(this.text, start) : wordEnd(this.text, start)
    return { kind: "scalar", start, end: this.at, members: [], looseComments: 0 }
  }

  /** The object or array whose bracket is at `start`. */
  private readContainer(start: number, kind: "object" | "array"): Json5Node {
    const close = kind === "object" ? "}" : "]"
    const node: Json5Node = { kind, start, end: start, members: [], looseComments: 0 }
    this.at = start + 1
    for (;;) {
      const comments = this.skipTrivia()
      if (this.text[this.at] === close) {
        node.looseComments += comments.length
        this.at++
        node.end = this.at
        return node
      }
      const leading = comments.filter((each) => each.ownLine)
      node.looseComments += comments.length - leading.length
      node.members.push(this.readMember(kind, leading))
    }
  }

  /** The key and value (or the array's item) at `at`, with the comma and the comment beside it. */
  private readMember(kind: "object" | "array", leading: Json5Comment[]): Json5Member {
    const start = this.at
    let key: string | undefined
    if (kind === "object") {
      const char = this.text[start]
      this.at = char === '"' || char === "'" ? stringEnd(this.text, start) : wordEnd(this.text, start)
      key = Object.keys(JSON5.parse(`{${this.text.slice(start, this.at)}:0}`) as object)[0]
      this.skipTrivia()
      this.at++ // the colon
      this.skipTrivia()
    }
    const value = this.readNode()
    const member: Json5Member = { key, start: leading[0]?.start ?? start, value, end: value.end }
    const afterValue = this.at
    this.skipTrivia()
    if (this.text[this.at] === ",") {
      member.commaAt = this.at
      this.at++
      member.end = this.at
    } else this.at = afterValue
    this.takeCommentBeside(member)
    return member
  }

  /** A comment on the same line, just after `member`, is part of it. */
  private takeCommentBeside(member: Json5Member): void {
    let at = this.at
    while (this.text[at] === " " || this.text[at] === "\t") at++
    if (!this.text.startsWith("//", at) && !this.text.startsWith("/*", at)) return
    this.at = at
    this.at = this.commentEndAt(at)
    member.end = this.at
  }

  /** Past whitespace and comments:  the comments, each saying if it's on a line of its own. */
  private skipTrivia(): Json5Comment[] {
    const comments: Json5Comment[] = []
    let ownLine = false
    while (this.at < this.text.length) {
      const char = this.text[this.at]!
      if (char === "\n") ownLine = true
      if (/\s/.test(char)) this.at++
      else if (this.text.startsWith("//", this.at) || this.text.startsWith("/*", this.at)) {
        const start = this.at
        this.at = this.commentEndAt(start)
        comments.push({ start, ownLine })
        ownLine = false
      } else break
    }
    return comments
  }

  /** Where the comment starting at `start` ends;  a line comment's newline isn't part of it. */
  private commentEndAt(start: number): number {
    return this.text.startsWith("//", start)
      ? commentEnd(this.text.indexOf("\n", start), this.text)
      : commentEnd(this.text.indexOf("*/", start + 2), this.text, 2)
  }

  ////////////////
  // ## Editing
  ////////////////

  /**
   * Make `node`, which holds `old`, hold `_value`.
   * - `indent`:  the indent of `node`'s line, to print a new value at;  `undefined`:  print it on one line
   */
  private editNode(node: Json5Node, old: unknown, _value: unknown, indent: string | undefined): void {
    const value = plainValue(_value)
    if (node.kind !== "scalar" && node.kind === kindOf(value)) return this.editContainer(node, old, value, indent)
    if (node.kind === "scalar" && kindOf(value) === "scalar" && Object.is(old, value ?? null)) return
    this.replace(node, value, indent)
  }

  /** Make the object or array `node`, which holds `old`, hold `value`. */
  private editContainer(node: Json5Node, old: unknown, value: unknown, indent: string | undefined): void {
    const pairs = node.kind === "array" ? this.arrayPairs(node, value as unknown[]) : this.objectPairs(node, value)
    const kept = pairs.filter((pair) => pair.kept)
    const added = node.kind === "array" ? this.addedItems(node, value as unknown[]) : this.addedKeys(node, value)
    if (!kept.length && !node.looseComments) {
      if (node.members.length || added.length) this.replace(node, value, indent)
      return
    }
    const multiline = this.text.slice(node.start, node.end).includes("\n")
    const memberIndent = multiline ? this.memberIndent(node) : undefined
    node.members.forEach((member, index) => {
      const pair = pairs[index]!
      if (!pair.kept) return this.removeMember(member)
      const needsComma = pair !== kept.at(-1) || added.length > 0
      if (needsComma && member.commaAt === undefined) this.edit(member.value.end, member.value.end, ",")
      if (!needsComma && member.commaAt !== undefined && member !== node.members.at(-1))
        this.edit(member.commaAt, member.commaAt + 1, "")
      if (pair.keep) return
      const oldValue =
        member.key === undefined ? (old as unknown[])[index] : (old as Record<string, unknown>)[member.key]
      this.editNode(member.value, oldValue, pair.value, memberIndent)
    })
    if (added.length)
      this.addMembers(node, kept.at(-1) ? node.members[pairs.indexOf(kept.at(-1)!)] : undefined, added, memberIndent)
  }

  /** What becomes of each of an object's keys:  a key `value` hasn't is gone;  one holding `undefined`, kept as it is. */
  private objectPairs(node: Json5Node, value: unknown): Json5Pair[] {
    const target = value as Record<string, unknown>
    return node.members.map((member) => {
      const has = Object.hasOwn(target, member.key!)
      return { kept: has, keep: has && target[member.key!] === undefined, value: has ? target[member.key!] : undefined }
    })
  }

  /** What becomes of each of an array's items:  matched by position;  those past `value`'s end are gone. */
  private arrayPairs(node: Json5Node, value: unknown[]): Json5Pair[] {
    return node.members.map((_, index) => ({ kept: index < value.length, keep: false, value: value[index] ?? null }))
  }

  /** The keys of `value` that `node` hasn't:  as they'll be written. */
  private addedKeys(node: Json5Node, value: unknown): Json5Added[] {
    const had = new Set(node.members.map((member) => member.key))
    return Object.entries(value as Record<string, unknown>)
      .filter(([key, each]) => !had.has(key) && each !== undefined)
      .map(([key, each]) => ({ key, value: each }))
  }

  /** The items of `value` past the end of `node`. */
  private addedItems(node: Json5Node, value: unknown[]): Json5Added[] {
    return value.slice(node.members.length).map((each) => ({ value: each ?? null }))
  }

  /** Add `added` after `last`, the last member staying;  `undefined`:  just inside the closing bracket. */
  private addMembers(
    node: Json5Node,
    last: Json5Member | undefined,
    added: Json5Added[],
    indent: string | undefined
  ): void {
    const printed = added.map((each) => this.printMember(each, indent))
    const inside = indent === undefined ? ", " : `,\n${indent}`
    if (last) {
      const start = indent === undefined ? " " : `\n${indent}`
      this.edit(last.end, last.end, start + printed.join(inside))
      return
    }
    const close = node.end - 1
    const lineStart = this.lineStartOf(close)
    if (indent !== undefined && !this.text.slice(lineStart, close).trim())
      this.edit(lineStart, lineStart, `${indent}${printed.join(inside)}\n`)
    else this.edit(close, close, `${printed.join(inside)} `)
  }

  /** `added` as its text. */
  private printMember(added: Json5Added, indent: string | undefined): string {
    const printed = printValue(added.value, indent)
    return added.key === undefined ? printed : `${JSON.stringify(added.key)}: ${printed}`
  }

  /** Remove `member`, with the comments above and beside it, and its line when it had that to itself. */
  private removeMember(member: Json5Member): void {
    const lineStart = this.lineStartOf(member.start)
    const lineEnd = this.lineEndOf(member.end)
    if (!this.text.slice(lineStart, member.start).trim() && !this.text.slice(member.end, lineEnd).trim()) {
      this.edit(lineStart, Math.min(lineEnd + 1, this.text.length), "")
      return
    }
    let start = member.start
    while (start > 0 && (this.text[start - 1] === " " || this.text[start - 1] === "\t")) start--
    this.edit(start, member.end, "")
  }

  /** Put `value`'s text where `node` is. */
  private replace(node: Json5Node, value: unknown, indent: string | undefined): void {
    this.edit(node.start, node.end, printValue(value, indent))
  }

  /** The indent `node`'s members are written at:  its first's, else one level in from its closing bracket. */
  private memberIndent(node: Json5Node): string {
    const first = node.members[0]
    if (first) {
      const before = this.text.slice(this.lineStartOf(first.start), first.start)
      if (!before.trim()) return before
    }
    return `${this.indentOfLine(node.end - 1)}  `
  }

  /** The white space that starts the line `offset` is on. */
  private indentOfLine(offset: number): string {
    return /^[ \t]*/.exec(this.text.slice(this.lineStartOf(offset)))![0]
  }

  /** Where the line `offset` is on starts. */
  private lineStartOf(offset: number): number {
    return this.text.lastIndexOf("\n", offset - 1) + 1
  }

  /** Where the line `offset` is on ends, before its newline. */
  private lineEndOf(offset: number): number {
    return commentEnd(this.text.indexOf("\n", offset), this.text)
  }

  ////////////////
  // ## Applying
  ////////////////

  /** Note a change to `text`, from `start` up to `end`. */
  private edit(start: number, end: number, text: string): void {
    this.edits.push({ start, end, text })
  }

  /** `text` with every edit made.  Insertions at a place come before what's removed there;  otherwise in order made. */
  private applied(): string {
    const edits = [...this.edits].sort((a, b) => a.start - b.start || a.end - b.end)
    let out = ""
    let cursor = 0
    for (const edit of edits) {
      out += this.text.slice(cursor, Math.max(cursor, edit.start)) + edit.text
      cursor = Math.max(cursor, edit.end)
    }
    return out + this.text.slice(cursor)
  }
}

/** `value` as JSON would see it:  what its `toJSON()` gives, when it has one. */
function plainValue(value: unknown): unknown {
  return typeof (value as { toJSON?: unknown } | null)?.toJSON === "function"
    ? (value as { toJSON(): unknown }).toJSON()
    : value
}

/** Which of the three shapes `value` is. */
function kindOf(value: unknown): Json5Node["kind"] {
  if (Array.isArray(value)) return "array"
  return typeof value === "object" && value !== null ? "object" : "scalar"
}

/** `value` as JSON text:  laid out at `indent`, or all on one line when that's `undefined`. */
function printValue(value: unknown, indent: string | undefined): string {
  if (indent === undefined) return JSON.stringify(value) ?? "null"
  return (JSON.stringify(value, null, 2) ?? "null").replaceAll("\n", `\n${indent}`)
}

/** A change to the text:  `text` in place of what's from `start` up to `end`. */
type Json5Edit = { start: number; end: number; text: string }

/** A comment:  where it starts, and whether it's on a line of its own. */
type Json5Comment = { start: number; ownLine: boolean }

/** A value in the text:  where it is, and for an object or array, what's in it. */
type Json5Node = {
  kind: "scalar" | "object" | "array"
  start: number
  end: number
  members: Json5Member[]
  /** comments in it that belong to no member */
  looseComments: number
}

/** An object's key and value, or an array's item. */
type Json5Member = {
  /** the key, as read;  `undefined` for an array's item */
  key: string | undefined
  /** where it starts, the comments above it included */
  start: number
  value: Json5Node
  /** where its comma is, if it has one */
  commaAt?: number
  /** where it ends, its comma and the comment beside it included */
  end: number
}

/** What becomes of a member. */
type Json5Pair = {
  /** still there */
  kept: boolean
  /** left exactly as it is */
  keep: boolean
  /** what it holds now */
  value: unknown
}

/** A new member. */
type Json5Added = { key?: string; value: unknown }
