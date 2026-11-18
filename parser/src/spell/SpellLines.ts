/**
 * A line of Spell read on its own, outside any file:  its match tree, its Spell tree and its javascript.
 * - What `spell parse` and `spell repl` read a line with, and the editor's Spell Console (epic `editor` P32):
 *   ONE way to read a typed line, in the terminal and the editor alike.
 * - Reads in a scope of its own (`lineScope()`), so nothing typed lands in a project.
 * - Plain text in, plain data out:  colouring for a terminal is the command line's own (`spell/app/cli`).
 */
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/** Rules a line is tried as, in order, when no `rule` is given:  `block` for several lines. */
const LINE_RULES = ["statement", "expression"]

/**
 * What reading a line gave.
 * - `rule`:  the rule that matched, or the last one tried
 * - `tree`:  the match tree, one line per match -- see `matchTree()`
 * - `spellTree`:  the Spell tree its AST makes, as `<ui-tree-diagram>` draws it -- see `P.TreeWriter`
 * - `compiled`:  its javascript, unless it didn't match, or compiling threw
 * - `error`:  why not
 */
export type ParsedLine = {
  text: string
  rule: string
  tree: string[]
  spellTree?: P.TreeNode
  compiled?: string
  error?: string
}

/**
 * A fresh scope to read lines in:  inside `project`'s, so its types and phrases are known;
 * with none, a bare one with only Spell's own rules.
 * - Lines read in it may declare things for later lines -- see `parseLine()`'s `commit`.
 * - `project` must have parsed, e.g. `CliSession.parse()`, or the editor's compile.
 */
export function lineScope(project?: SP.SpellProject): P.Scope {
  if (!project?.scope) return SP.spellParser.getScope("cli")
  return new P.ProjectScope({ name: "cli", parentScope: project.scope })
}

/**
 * Read `text` in `scope` as `rule` -- or, with none, as each of `LINE_RULES` until one matches (`block` if it's
 * several lines) -- then compile it.
 * - `commit`:  declare what it declares in `scope`, for later lines, as a project's statements do:
 *   `x is 3`, then `x + 4`.
 * - NEVER throws:  a failure is in the result's `error`.
 * - Words it couldn't read at the end are a failure too, `Don't understand "in the columns"`, as on a line of a file:
 *   their tree is kept, to show how far it read.
 */
export function parseLine(
  text: string,
  scope: P.Scope,
  { rule, commit = false }: { rule?: string; commit?: boolean } = {}
): ParsedLine {
  const rules = rule ? [rule] : text.trim().includes("\n") ? ["block"] : LINE_RULES
  let tried = rules[0]!
  let match: P.Match | undefined
  try {
    for (tried of rules) {
      match = SP.spellParser.parse(text, tried, scope)
      if (match) break
    }
  } catch (error) {
    return { text, rule: tried, tree: [], error: error instanceof Error ? error.message : String(error) }
  }
  if (!match) return { text, rule: tried, tree: [], error: `Doesn't parse as ${rules.join(" or ")}` }

  const tree = matchTree(match)
  // words it didn't read are an error, as on a line of a file:  never silently dropped (epic `language` I152)
  const left = rules.includes("block") ? "" : unreadWords(text, match, scope)
  if (left) {
    const error = SP.Language.of(scope).parserMessage("dont-understand", { text: left })
    return { text, rule: tried, tree, error }
  }
  try {
    if (commit) scope.parser?.commit(match)
    const spellTree = P.TreeWriter.treeOf(match.AST)
    return { text, rule: tried, tree, spellTree, compiled: String(match.compile()) }
  } catch (error) {
    return { text, rule: tried, tree, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * `match` as an indented tree, one line per match:  `group: rule › choice  text`.
 * - `group`:  the name its parent gave it, when that says more than its rule's name
 * - `› choice`:  which rule a `Choice` picked, e.g. `statement › print`
 * - `text`:  what it matched
 */
export function matchTree(match: P.Match, depth = 0): string[] {
  const name = match.rule.name ?? match.rule.constructor.name
  const choice = match.choiceRule && match.choiceRule !== name ? `${match.choiceRule} › ` : ""
  const group = match.matchGroup && match.matchGroup !== name && match.matchGroup !== match.choiceRule
  const label = `${group ? `${match.matchGroup}: ` : ""}${choice}${name}`
  const lines = [`${"  ".repeat(depth)}${label}  ${match.inputText.trim()}`]
  for (const child of match.matched) if (child instanceof P.Match) lines.push(...matchTree(child, depth + 1))
  return lines
}

/** The words at the end of `text` that `match` didn't read:  `""` when it read them all, or only a comment. */
function unreadWords(text: string, match: P.Match, scope: P.Scope): string {
  const read = match.inputText.trim()
  const all = text.trim()
  const left = all.startsWith(read) ? all.slice(read.length).trim() : ""
  const tokens = left ? (scope.parser?.tokenize(left) ?? []) : []
  return tokens.every((token) => token instanceof P.CommentToken) ? "" : left
}
