import type { SP } from "spell/parser/spell"
import type { SX } from "spell/parser/spellx"

/**
 * A `.spellx` file, read:  its CHUNK TREE, what's wrong in it, and where things are (epic `elemental-spell` P3).
 * - Made by `SX.SpellxView.read()`;  everything in it is as the file says, nothing compiled.
 * - For an agent or a tool walking a file:  `walk()` visits every node, `toOutline()` prints one line per node.
 */
export class SpellxFile {
  /** its path, if it has one */
  readonly path: string | undefined
  /** its text */
  readonly text: string
  /** the language it's written in */
  readonly language: SP.Language
  /** its templates and prose, in order */
  readonly nodes: SX.SpellxNode[]
  /** what's wrong in it, in the order it was found */
  readonly diagnostics: SX.SpellxDiagnostic[]

  constructor(props: SpellxFileProps) {
    this.path = props.path
    this.text = props.text
    this.language = props.language
    this.nodes = props.nodes
    this.diagnostics = props.diagnostics
  }

  /** Its templates, in order. */
  get templates(): SX.SpellxTemplate[] {
    return this.nodes.filter((node): node is SX.SpellxTemplate => node.kind === "template")
  }

  /** Its errors:  the diagnostics that mean it says something else than it seems to. */
  get errors(): SX.SpellxDiagnostic[] {
    return this.diagnostics.filter((diagnostic) => diagnostic.severity === "error")
  }

  /**
   * Template `template`'s members by GROUP, in order (epic `elemental-spell` P16):  each `<group "...">` and the
   * members after it, up to the next, as text sits under a heading.
   * - First, with no `group`, the members before any group:  left out when there are none.
   * - A member saying `group="direction"` is that group's, wherever it's written:  listed with it, in its place among
   *   that group's members.  A group it names that's never declared gets an entry of its own, with no `group` node.
   * - Members:  its declarations (not the groups themselves), handlers and notes;  prose and code are left out.
   */
  static groupsOf(template: SX.SpellxTemplate): SpellxGroup[] {
    const groups: SpellxGroup[] = [{ name: undefined, members: [] }]
    const named = (name: string) => {
      let group = groups.find((each) => each.name === name)
      if (!group) groups.push((group = { name, members: [] }))
      return group
    }
    let current = groups[0]!
    for (const node of template.children) {
      if (node.kind === "declaration" && node.type === "group") {
        current = named(node.name ?? "")
        current.group = node
        continue
      }
      if (node.kind !== "declaration" && node.kind !== "handler" && node.kind !== "note") continue
      const own = node.kind === "note" ? undefined : node.attributes.find((each) => each.name === "group")?.value
      ;(own ? named(own) : current).members.push(node)
    }
    return groups[0]!.members.length ? groups : groups.slice(1)
  }

  /** The line and column of `offset`, both from 1. */
  positionOf(offset: number): SX.SpellxPosition {
    const starts = (this._lineStarts ??= lineStartsOf(this.text))
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const middle = (low + high + 1) >> 1
      if (starts[middle]! <= offset) low = middle
      else high = middle - 1
    }
    return { line: low + 1, column: offset - starts[low]! + 1 }
  }
  private _lineStarts: number[] | undefined;

  /**
   * Every node, depth first, in the file's order:  each with how deep it is and what it's in.
   * - An if-chain's branches are its children;  every other node's are its `children`.
   */
  *walk(): Generator<SpellxWalkStep> {
    const visit = function* (nodes: SX.SpellxNode[], depth: number, parent?: SX.SpellxNode): Generator<SpellxWalkStep> {
      for (const node of nodes) {
        yield { node, depth, parent }
        yield* visit(childrenOf(node), depth + 1, node)
      }
    }
    yield* visit(this.nodes, 0)
  }

  /**
   * The file as an outline, one line per node:  its kind, its word as written, its name or phrase, where it is,
   * then its attributes -- e.g. `declaration property <property> "suit" 9:2-12:4 one-of="clubs, ..."`.
   * - For tests, and for a person or agent reading a file's shape at a glance.
   * - Its diagnostics follow, one a line, after `--`.
   */
  toOutline(): string {
    const lines = [...this.walk()].map(({ node, depth }) => "  ".repeat(depth) + this.outlineOf(node))
    if (this.diagnostics.length) {
      lines.push("--")
      for (const { severity, message, span } of this.diagnostics)
        lines.push(`${severity} ${this.spanText(span)}  ${message}`)
    }
    return lines.join("\n")
  }

  ////////////////
  // ## The outline's lines
  ////////////////

  /** One node's outline line, without its indent. */
  private outlineOf(node: SX.SpellxNode): string {
    const at = this.spanText(node.span)
    switch (node.kind) {
      case "template":
      case "declaration":
        return [
          `${node.kind} ${node.type} <${node.word}>`,
          node.name !== undefined ? quoted(node.name) : undefined,
          node.kind === "declaration" && node.selfClosing ? "/>" : undefined,
          at,
          ...node.attributes.map(attributeText)
        ]
          .filter(Boolean)
          .join(" ")
      case "handler":
        return [
          `handler ${node.type} <${node.word}> ${quoted(node.phrase)} ${at}`,
          ...node.attributes.map(attributeText)
        ].join(" ")
      case "note":
        return `note ${node.type} <${node.word}> ${at} ${quoted(node.text)}`
      case "prose":
        return `prose ${at} ${quoted(node.text)}`
      case "code":
        return `code ${node.lines.length} line${node.lines.length === 1 ? "" : "s"} ${at} ${quoted(node.lines[0]?.text ?? "")}`
      case "element":
        return [
          `element <${node.name}>`,
          node.selfClosing ? "/>" : undefined,
          at,
          ...node.attributes.map(attributeText)
        ]
          .filter(Boolean)
          .join(" ")
      case "text":
        return `text ${at} ${quoted(node.text)}`
      case "hole":
        return `hole {${node.code}} ${at}`
      case "choice":
        return `choice ${node.branches.length} branch${node.branches.length === 1 ? "" : "es"} ${at}`
      case "branch":
        return [`branch ${node.type} <${node.word}>`, node.phrase !== undefined ? quoted(node.phrase) : undefined, at]
          .filter(Boolean)
          .join(" ")
      case "loop":
        return `loop ${node.type} <${node.word}> ${quoted(node.phrase)} ${at}`
      case "place":
        return `place <${node.word}> ${quoted(node.name)} ${at}`
    }
  }

  /** A span as `line:column-line:column`. */
  private spanText(span: SX.SpellxSpan) {
    const start = this.positionOf(span.start)
    const end = this.positionOf(span.end)
    return `${start.line}:${start.column}-${end.line}:${end.column}`
  }
}

/** What a `SpellxFile` is made of -- see `SX.SpellxView`. */
/** A group of a template's members:  see `SpellxFile.groupsOf()`. */
export type SpellxGroup = {
  /** its name, `direction`;  none for the members before any group */
  name: string | undefined
  /** its `<group>` tag, with its `description=`;  none for a group only a member names */
  group?: SX.SpellxDeclaration
  /** its members, in order */
  members: SX.SpellxNode[]
}

export type SpellxFileProps = {
  /** its path, if it has one */
  path: string | undefined
  /** its text */
  text: string
  /** its language */
  language: SP.Language
  /** its chunk tree */
  nodes: SX.SpellxNode[]
  /** what's wrong in it */
  diagnostics: SX.SpellxDiagnostic[]
}

/** One step of `SpellxFile.walk()`:  a node, how deep it is, and what it's in. */
export type SpellxWalkStep = {
  /** the node */
  node: SX.SpellxNode
  /** 0 for the file's own nodes, one more for each node it's inside */
  depth: number
  /** the node it's in;  `undefined` at the top */
  parent: SX.SpellxNode | undefined
}

/** The nodes inside `node`:  an if-chain's branches, any other's `children`, none for a leaf. */
export function childrenOf(node: SX.SpellxNode): SX.SpellxNode[] {
  if (node.kind === "choice") return node.branches
  return "children" in node ? node.children : []
}

/** The longest a quoted text gets in an outline before it's cut. */
const OUTLINE_TEXT_LENGTH = 48

/** `text` quoted for an outline:  its first line, cut short. */
function quoted(text: string) {
  const first = text.split("\n")[0]!
  const cut = first.length > OUTLINE_TEXT_LENGTH ? `${first.slice(0, OUTLINE_TEXT_LENGTH)}…` : first
  return JSON.stringify(cut + (text.includes("\n") && cut === first ? "…" : ""))
}

/** An attribute for an outline:  `word="value"`, `word={spell}`, a bare `word`;  its English name after, if other. */
function attributeText(attribute: SX.SpellxAttribute) {
  const name = attribute.name === attribute.word ? attribute.word : `${attribute.word}(${attribute.name})`
  if (attribute.value === undefined) return name
  if (attribute.quote === "{") return `${name}={${attribute.value}}`
  return `${name}=${quoted(attribute.value)}`
}

/** The offset each line of `text` starts at. */
function lineStartsOf(text: string) {
  const starts = [0]
  for (let index = text.indexOf("\n"); index >= 0; index = text.indexOf("\n", index + 1)) starts.push(index + 1)
  return starts
}
