import type { SP } from "spell/parser/spell"
import type { PG } from "spell/parser/page"

/**
 * A page file, read:  its CHUNK TREE, what's wrong in it, and where things are (epic `elemental-spell` P3).
 * - Made by `PG.PageView.read()`;  everything in it is as the file says, nothing compiled.
 * - For an agent or a tool walking a file:  `walk()` visits every node, `toOutline()` prints one line per node.
 */
export class PageFile {
  /** its path, if it has one */
  readonly path: string | undefined
  /** its text */
  readonly text: string
  /** the language it's written in */
  readonly language: SP.Language
  /** its pages and what's around them, in order */
  readonly nodes: PG.PageNode[]
  /** what's wrong in it, in the order it was found */
  readonly diagnostics: PG.PageDiagnostic[]

  constructor(props: PageFileProps) {
    this.path = props.path
    this.text = props.text
    this.language = props.language
    this.nodes = props.nodes
    this.diagnostics = props.diagnostics
  }

  /** Its pages, in order. */
  get pages(): PG.PageHead[] {
    return this.nodes.filter((node): node is PG.PageHead => node.kind === "page")
  }

  /** Its errors:  the diagnostics that mean it says something else than it seems to. */
  get errors(): PG.PageDiagnostic[] {
    return this.diagnostics.filter((diagnostic) => diagnostic.severity === "error")
  }

  /** The line and column of `offset`, both from 1. */
  positionOf(offset: number): PG.PagePosition {
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
  *walk(): Generator<PageWalkStep> {
    const visit = function* (nodes: PG.PageNode[], depth: number, parent?: PG.PageNode): Generator<PageWalkStep> {
      for (const node of nodes) {
        yield { node, depth, parent }
        yield* visit(childrenOf(node), depth + 1, node)
      }
    }
    yield* visit(this.nodes, 0)
  }

  /**
   * The file as an outline, one line per node:  its kind, its word as written, its name or phrase, where it is,
   * then its attributes -- e.g. `page <page> "counter notebook" 1:1-12:4 notebook`.
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
  private outlineOf(node: PG.PageNode): string {
    const at = this.spanText(node.span)
    switch (node.kind) {
      case "page":
        return [
          `page <${node.word}>`,
          node.name !== undefined ? quoted(node.name) : undefined,
          at,
          ...node.attributes.map(attributeText)
        ]
          .filter(Boolean)
          .join(" ")
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
      case "block":
        return `block ${node.type} <${node.word}> ${at}`
      case "loop":
        return `loop ${node.type} <${node.word}> ${quoted(node.phrase)} ${at}`
    }
  }

  /** A span as `line:column-line:column`. */
  private spanText(span: PG.PageSpan) {
    const start = this.positionOf(span.start)
    const end = this.positionOf(span.end)
    return `${start.line}:${start.column}-${end.line}:${end.column}`
  }
}

/** What a `PageFile` is made of -- see `PG.PageView`. */
export type PageFileProps = {
  /** its path, if it has one */
  path: string | undefined
  /** its text */
  text: string
  /** its language */
  language: SP.Language
  /** its chunk tree */
  nodes: PG.PageNode[]
  /** what's wrong in it */
  diagnostics: PG.PageDiagnostic[]
}

/** One step of `PageFile.walk()`:  a node, how deep it is, and what it's in. */
export type PageWalkStep = {
  /** the node */
  node: PG.PageNode
  /** 0 for the file's own nodes, one more for each node it's inside */
  depth: number
  /** the node it's in;  `undefined` at the top */
  parent: PG.PageNode | undefined
}

/** The nodes inside `node`:  an if-chain's branches, any other's `children`, none for a leaf. */
export function childrenOf(node: PG.PageNode): PG.PageNode[] {
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
function attributeText(attribute: PG.PageAttribute) {
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
