import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { bodiesIn } from "./Translator"
import type { SourceFile } from "./translate.types"

/**
 * The SHAPE CHECK of a translation (epic `spanish` P26):  does each translated line compile to the same program as
 * its source line, names and texts aside?
 * - Statement by statement:  line `i` of a source file against line `i` of its translation (one line out for each
 *   line in), each compiled on its own in its scope, its javascript's `shapeOf()` compared.
 *   - Where their javascript differs goes with each mismatch (`difference`), for a person or the fix-up.
 * - So a line that reads and runs, and lints clean, but MEANS something else is caught and named:
 *   `si no está boca arriba` written for `if it is face up`.
 * - A statement with a body compiles its body too:  a mismatch is blamed on the deepest line that differs,
 *   so `if ...:` isn't blamed for a wrong line inside it.
 * - Skips a line that doesn't parse in either language:  lint names those.
 * - Pure:  both sides already parsed, each in its own project.  The command runs it after each check of the
 *   translation (`translateProject()`), and sends each mismatch to the fix-up pass.
 */
export class ShapeCheck {
  /** How many statements were compared, the last time. */
  statements = 0

  /**
   * Each line of `translations` whose shape differs from its source's in `sources`, file by file:
   * `pairs` maps each source path (`/Card.spell`) to its translation's (`/Carta.es.spell`).
   * - A file with no translation is left out.
   */
  compare(sources: SourceFile[], translations: SourceFile[], pairs: Map<string, string>): ShapeMismatch[] {
    this.statements = 0
    const mismatches: ShapeMismatch[] = []
    for (const source of sources) {
      const path = pairs.get(source.path)
      const translation = translations.find((file) => file.path === path)
      if (!path || !source.match || !translation?.match) continue
      const ours = statementLines(source.match)
      const theirs = statementLines(translation.match)
      const differs = new Set<number>()
      const found: ShapeMismatch[] = []
      for (const [line, { statement }] of ours) {
        const other = theirs.get(line)?.statement
        if (!other || isParseError(statement) || isParseError(other)) continue
        this.statements++
        const englishJs = compiled(statement)
        const translatedJs = compiled(other)
        const english = shapeOf(englishJs)
        const translated = shapeOf(translatedJs)
        if (english === translated) continue
        differs.add(line)
        found.push({
          path,
          line,
          english,
          translated,
          difference: differenceOf(oneLine(englishJs), oneLine(translatedJs))
        })
      }
      // the deepest line that differs:  a statement whose body holds one isn't blamed for it
      mismatches.push(...found.filter(({ line }) => !ours.get(line)!.body.some((inner) => differs.has(inner))))
    }
    return mismatches
  }
}

/** A translated line that compiles to a different program than its source line. */
export type ShapeMismatch = {
  /** The translation's path, `/Carta.es.spell`. */
  path: string
  /** Its line, from 0:  its source's too. */
  line: number
  /** The source line's shape. */
  english: string
  /** The translated line's shape. */
  translated: string
  /** Where their javascript first differs, each side's, for a person or the fix-up:  `(column) =>` vs `() =>`. */
  difference: { english: string; translated: string }
}

/**
 * `js`'s shape:  its names and texts each one placeholder, its comments out --
 * so two programs that differ only in their names' language compare equal.
 * - A template text is one text, its values inside it too:  `${color} joker` and `comodín ${color}` are the same.
 */
export function shapeOf(js: string): string {
  return js
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")
    .replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "TEXT")
    .replace(/[\p{L}_$][\p{L}\p{N}_$]*/gu, "NAME")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * `statement` compiled as if it were the whole project, in its scope (`P.JSWriter.writeMatch()`);
 * `NO COMPILE` if it won't compile.
 * - Not `statement.compile()`:  a writer that knows no project writes some loops by what it last saw
 *   (`for ... of` once, `forEachSequential()` the next), so two compiles of one program could differ.
 */
function compiled(statement: P.Match): string {
  try {
    const js = P.JSWriter.instance.writeMatch(statement)
    return typeof js === "string" ? js : "NO COMPILE"
  } catch {
    return "NO COMPILE"
  }
}

/** `js` on one line, its spaces collapsed. */
function oneLine(js: string): string {
  return js.replace(/\s+/g, " ").trim()
}

/**
 * Where `a` and `b` (two statements' javascript) first differ, a little of each around it:
 * after their common start, before their common end.
 */
function differenceOf(a: string, b: string): { english: string; translated: string } {
  let start = 0
  while (start < a.length && a[start] === b[start]) start++
  let end = 0
  while (end < a.length - start && end < b.length - start && a.at(-1 - end) === b.at(-1 - end)) end++
  const around = (text: string) => {
    const from = Math.max(0, start - DIFFERENCE_CONTEXT)
    const to = Math.min(text.length, Math.max(text.length - end, start) + DIFFERENCE_CONTEXT)
    return `${from > 0 ? "…" : ""}${text.slice(from, to)}${to < text.length ? "…" : ""}`
  }
  return { english: around(a), translated: around(b) }
}

/** How many characters of javascript to show each side of a difference. */
const DIFFERENCE_CONTEXT = 30

/** Is `match` a line that didn't parse? */
function isParseError(match: P.Match): boolean {
  return match.rule instanceof SP.ParseError
}

/**
 * Each statement in `block` (a file's `block` match) by its line, with the lines of every statement in its body:
 * the deepest first, as `ShapeCheck.compare()` blames them.
 */
function statementLines(block: P.Match): Map<number, { statement: P.Match; body: number[] }> {
  const lines = new Map<number, { statement: P.Match; body: number[] }>()
  const visit = (each: P.Match): number[] => {
    const inside: number[] = []
    for (const item of each.matched) {
      if (!(item instanceof P.Match)) continue
      if (item.rule instanceof SP.Block) {
        inside.push(...visit(item))
        continue
      }
      const statement = item.matched.find(
        (child): child is P.Match =>
          child instanceof P.Match && child.ruleName !== "comment" && child.ruleName !== "blank_line"
      )
      if (!statement) continue
      const line = item.line ?? 0
      const body = bodiesIn(statement).flatMap(visit)
      lines.set(line, { statement, body })
      inside.push(line, ...body)
    }
    return inside
  }
  visit(block)
  return lines
}
