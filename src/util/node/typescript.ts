/**
 * The ONE reader of our TypeScript (and javascript) source, for the tools that read code:
 * its syntax tree, its comments, its imports, and the docstring above any node (epic `coherence` P26).
 * - On oxc's parser, `parseSync()`, the one Vite+ ships:  a native parser, so a file reads in about a millisecond.
 * - What it gives:
 *   - `readTypeScript(file, text)`:  a `TypeScriptSource`, its `program` (ESTree, with offsets), `comments`, `imports`
 *   - `walk(node, visit)`:  every node inside one
 *   - `source.docstringOf(node)`:  the `/** ... *\/` right above a node, its stars gone
 * - OFFSETS only, never line numbers:  a reader that wants lines turns an offset into one itself
 *   (the parser's `P.positionForOffset()`;  this folder can't import the parser, which sits above it).
 * - Node only, and loads in plain `node` too (`spell/util/node/typescript.ts`):  it imports nothing of ours.
 * - Why one reader:  before it, four tools read code character by character, each blanking strings and comments its
 *   own way, and two more each kept their own copy of oxc's tree type.
 */
import { parseSync } from "vite-plus"

/**
 * `text`, the source of `file`, read.
 * - Its language from the file's extension:  `.tsx`, `.ts`, `.d.ts`, `.js`, `.jsx` ...;  anything else as TypeScript.
 * - NEVER throws:  what it couldn't read is in `errors`, the tree holding what it could.
 */
export function readTypeScript(
  file: string,
  text: string,
  { lang = langOf(file) }: ReadOptions = {}
): TypeScriptSource {
  return new TypeScriptSource(file, text, lang)
}

/****************
 * ### `TypeScriptSource`
 * One file's source, read:  its tree, comments and imports, and the docstring above any node.
 * - Made by `readTypeScript()`.
 * - Every position is an offset into `text`.
 ****************/
export class TypeScriptSource {
  /** The file, as the caller named it:  only its extension matters. */
  readonly file: string
  /** Its text, as read. */
  readonly text: string
  /** Its syntax tree:  ESTree, as oxc gives it, every node with `start` and `end`. */
  readonly program: SourceNode
  /** Every comment, in order, markers left off its `value`. */
  readonly comments: SourceComment[]
  /** Why it doesn't parse, if it doesn't:  oxc's messages;  `[]` when it does. */
  readonly errors: string[]

  /** oxc's lists of the module's imports and exports, for `imports`. */
  private readonly module: OxcModule

  constructor(file: string, text: string, lang: SourceLang) {
    const result = parseSync(file, text, { lang })
    this.file = file
    this.text = text
    this.program = result.program as unknown as SourceNode
    this.comments = result.comments
    this.errors = result.errors.map((error) => error.message)
    this.module = result.module
  }

  ////////////////
  // ## Imports
  ////////////////

  /**
   * Every import and re-export naming a module, in file order:  oxc's own list, so a string or comment never counts.
   * - `import { a, type B, c as d } from "m"`:  names `a`, `B`, `c` (local `d`)
   * - `import * as X from "m"`, `export * as X from "m"`:  one namespace name, `X`
   * - `import X from "m"`:  the default export, `default` (local `X`)
   * - `export { a as b } from "m"`:  `a` (local `b`, the name it's exported as)
   * - `export * from "m"`, `import "m"`:  no names
   * - `import("m")`, with a plain string:  `dynamic`, no names;  one with a computed name is left out
   * - NOT a type's `import("m").X`:  walk the tree for `TSImportType` (`DeclarationCheck` does)
   */
  get imports(): SourceImport[] {
    const found: SourceImport[] = []
    for (const statement of this.module.staticImports) {
      found.push({
        from: statement.moduleRequest.value,
        kind: "import",
        start: statement.start,
        end: statement.end,
        names: statement.entries.map(({ importName, localName, isType }) => ({
          name: importName.kind === "Default" ? "default" : (importName.name ?? localName.value),
          local: localName.value,
          ...(importName.kind === "NamespaceObject" && { namespace: true }),
          ...(isType && { isType })
        }))
      })
    }
    for (const statement of this.module.staticExports) {
      const from = statement.entries.find((entry) => entry.moduleRequest)?.moduleRequest?.value
      if (from === undefined) continue
      found.push({
        from,
        kind: "re-export",
        start: statement.start,
        end: statement.end,
        names: statement.entries.flatMap(({ importName, exportName, isType }): SourceImportName[] => {
          if (importName.kind === "All") return [{ name: exportName.name!, local: exportName.name!, namespace: true }]
          if (importName.kind !== "Name") return []
          return [{ name: importName.name!, local: exportName.name ?? importName.name!, ...(isType && { isType }) }]
        })
      })
    }
    for (const call of this.module.dynamicImports) {
      const literal = this.text.slice(call.moduleRequest.start, call.moduleRequest.end)
      if (!PLAIN_STRING.test(literal)) continue
      found.push({ from: literal.slice(1, -1), kind: "dynamic", start: call.start, end: call.end, names: [] })
    }
    return found.sort((a, b) => a.start - b.start)
  }

  ////////////////
  // ## Comments
  ////////////////

  /**
   * The docstring right above `node` (or a statement starting at offset `node`):  its text, its stars gone, trimmed.
   * - Right above:  nothing but white space between, blank lines too.
   * - A decorator is part of its node:  `/** ... *\/ @proto static x` documents `x`;
   *   one before `export` too, `/** ... *\/ @thing export class Card`.
   * - none:  `undefined`
   */
  docstringOf(node: SourceNode | number): string | undefined {
    const comment = this.docCommentOf(node)
    return comment && docstringText(comment.value)
  }

  /** The `/** ... *\/` comment right above `node` (or offset `node`), as `docstringOf()` finds it;  none:  `undefined`. */
  docCommentOf(node: SourceNode | number): SourceComment | undefined {
    const start = typeof node === "number" ? node : startOf(node)
    const comment = this.commentBefore(start)
    if (!comment || comment.type !== "Block" || !comment.value.startsWith("*")) return undefined
    return WHITE_SPACE.test(this.text.slice(comment.end, start)) ? comment : undefined
  }

  /**
   * The comments right above offset `start`, first first:  each on a line of its own, no blank line between them,
   * nor between the last and `start`'s line.
   * - e.g. the `// packs: ok -- ...` lines above a registration
   */
  commentsAbove(start: number): SourceComment[] {
    const above: SourceComment[] = []
    let at = this.text.lastIndexOf("\n", start - 1) + 1
    for (let index = this.commentIndexBefore(at); index >= 0; index--) {
      const comment = this.comments[index]!
      const lineStart = this.text.lastIndexOf("\n", comment.start - 1) + 1
      const between = this.text.slice(comment.end, at)
      if (!WHITE_SPACE.test(this.text.slice(lineStart, comment.start)) || !ONE_LINE_END.test(between)) break
      above.unshift(comment)
      at = lineStart
    }
    return above
  }

  /** The last comment ending at or before `start`;  none:  `undefined`. */
  private commentBefore(start: number): SourceComment | undefined {
    return this.comments[this.commentIndexBefore(start)]
  }

  /** The index of the last comment ending at or before `start`, a binary search;  none:  `-1`. */
  private commentIndexBefore(start: number): number {
    let low = 0
    let high = this.comments.length - 1
    let found = -1
    while (low <= high) {
      const middle = (low + high) >> 1
      if (this.comments[middle]!.end <= start) {
        found = middle
        low = middle + 1
      } else high = middle - 1
    }
    return found
  }
}

/**
 * Call `visit` for `node` and every node inside it, parents first, in source order.
 * - `visit` returning `false`:  the nodes inside that one are skipped.
 */
export function walk(node: SourceNode, visit: (node: SourceNode) => boolean | void): void {
  if (visit(node) === false) return
  for (const [key, value] of Object.entries(node)) {
    if (key === "parent") continue
    if (Array.isArray(value)) {
      for (const each of value) if (isSourceNode(each)) walk(each, visit)
    } else if (isSourceNode(value)) walk(value, visit)
  }
}

/** Where `node` starts, a decorator written before its `export` included:  `@thing export class Card`. */
function startOf(node: SourceNode): number {
  const [decorator] = ((node.declaration as SourceNode | null | undefined)?.decorators ?? []) as SourceNode[]
  return decorator ? Math.min(node.start, decorator.start) : node.start
}

/** Is `value` a node of a syntax tree? */
export function isSourceNode(value: unknown): value is SourceNode {
  return typeof value === "object" && value !== null && typeof (value as SourceNode).type === "string"
}

/** A `/** ... *\/` comment's `value` as text:  each line's leading `*`s and one space gone, trimmed. */
export function docstringText(value: string): string {
  return value
    .split("\n")
    .map((line) => line.replace(/^\s*\*+ ?/, ""))
    .join("\n")
    .trim()
}

/** The language oxc reads `file` as, from its extension. */
function langOf(file: string): SourceLang {
  if (/\.d\.[cm]?ts$/.test(file)) return "dts"
  const extension = /\.([cm]?[jt]sx?)$/.exec(file)?.[1]?.replace(/^[cm]/, "")
  return (extension as SourceLang | undefined) ?? "ts"
}

/** A module name written as a plain string:  `"m"`, `'m'`, or a template with no `${}`. */
const PLAIN_STRING = /^(["'`])[^"'`$]*\1$/

/** Only white space. */
const WHITE_SPACE = /^\s*$/

/** White space holding at most one line break:  the next line, no blank line between. */
const ONE_LINE_END = /^[^\S\n]*\n?[^\S\n]*$/

////////////////
// ## Types
////////////////

/** A node of the syntax tree:  ESTree (TypeScript's nodes too), as oxc gives it, with offsets into the text. */
export type SourceNode = { type: string; start: number; end: number; [key: string]: unknown }

/** A comment, as oxc gives it:  `value` without its markers (`//`, `/*`, `*\/`). */
export type SourceComment = { type: "Line" | "Block"; value: string; start: number; end: number }

/** One import or re-export of a module -- see `TypeScriptSource.imports`. */
export type SourceImport = {
  /** The module, as written:  `spell/util`, `./Peer`. */
  from: string
  /** `import ... from`, `export ... from`, or `import("...")`. */
  kind: "import" | "re-export" | "dynamic"
  /** Where the statement (or the `import()` call) starts. */
  start: number
  /** Just after it. */
  end: number
  /** What it names, in order;  none for `export *`, `import "m"` and `import()`. */
  names: SourceImportName[]
}

/** One name an import takes. */
export type SourceImportName = {
  /** Its name in the module:  `a`, or `default`;  a namespace's own name. */
  name: string
  /** Its name here:  `d` in `import { c as d }`;  a re-export's, the name it's exported as. */
  local: string
  /** `* as X`:  the whole module. */
  namespace?: true
  /** `type B`, or in an `import type`. */
  isType?: true
}

/** The languages oxc reads. */
export type SourceLang = "js" | "jsx" | "ts" | "tsx" | "dts"

/** What `readTypeScript()` takes. */
export type ReadOptions = {
  /** Its language;  default from the file's extension. */
  lang?: SourceLang
}

/** oxc's module record:  the module's imports and exports. */
type OxcModule = ReturnType<typeof parseSync>["module"]
