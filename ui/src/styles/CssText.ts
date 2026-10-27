/****************
 * ### `CssText`
 * Reads CSS text by its brackets:  what's at its top level, outside every `( )` and `[ ]`, and where a bracket closes.
 * - ONE walk for every scan of selectors and values:  the static render's selectors (`StaticSelectors`), the design
 *   export's colours and themes (`DesignColor`, `DesignTokens`), the token tables (`FamilyTokens`, `ComponentTokens`).
 * - Quoted text (`[title="a)"]`, `url(")")`) and escaped characters (`\(`) never count as brackets.
 * - Pure text in, text out:  no DOM, no postcss, no imports, so browser code and node tools share it.
 *   Spell UI holds no parser of its own (nothing of spell), so this small reader is its one.
 * - Build / test time and the static render only:  left out of the `spell-ui/styles` barrel, import the leaf file.
 * - STATIC and instance-free on purpose:  a text is all it reads.
 ****************/
export class CssText {
  /**
   * Where the first character at `text`'s top level that passes `test` is, from `from`;  -1 for none.
   * - `last`:  the last one instead
   * - Brackets themselves are never tested.
   */
  static topLevel(
    text: string,
    test: (char: string, index: number) => boolean,
    { from = 0, last = false }: { from?: number; last?: boolean } = {}
  ): number {
    let found = -1
    for (const { index, char, depth } of CssText.walk(text, from)) {
      if (depth !== 0 || BRACKET.test(char) || !test(char, index)) continue
      if (!last) return index
      found = index
    }
    return found
  }

  /** Where the bracket opened at `open` (`(` or `[`) closes;  -1 when it never does. */
  static closing(text: string, open: number): number {
    for (const { index, char, depth } of CssText.walk(text, open)) {
      if (index > open && depth === 0 && CLOSE.test(char)) return index
    }
    return -1
  }

  /**
   * `text` split at top-level whitespace (or `separator`), brackets kept whole;  for whitespace, a top-level `/` is a
   * part of its own.
   * - e.g. `from var(--x) calc(l - 0.05) c h / 0.5` => `["var(--x)", "calc(l - 0.05)", "c", "h", "/", "0.5"]`
   * - Parts are trimmed;  empty ones dropped.
   */
  static splitTop(text: string, separator: " " | "," = " "): string[] {
    const parts: string[] = []
    let start = 0
    for (const { index, char, depth } of CssText.walk(text)) {
      if (depth !== 0 || BRACKET.test(char)) continue
      const splits = separator === "," ? char === "," : /\s/.test(char) || char === "/"
      if (!splits) continue
      cut(index)
      if (separator === " " && char === "/") parts.push("/")
      start = index + 1
    }
    cut(text.length)
    return parts

    /** The part from `start` to `end`, kept unless it's blank. */
    function cut(end: number) {
      const part = text.slice(start, end).trim()
      if (part) parts.push(part)
    }
  }

  /** Whether `text`'s brackets balance:  `var(--ui-x, a), b` cut out of a pair would not. */
  static isBalanced(text: string): boolean {
    let depth = 0
    for (const { char } of CssText.walk(text)) {
      if (OPEN.test(char)) depth++
      else if (CLOSE.test(char) && --depth < 0) return false
    }
    return depth === 0
  }

  /**
   * Each character of `text` from `from` that's outside quotes and not escaped, with its depth:  how many brackets
   * are open around it.  A bracket itself is at the depth outside it.
   */
  private static *walk(text: string, from = 0): Generator<{ index: number; char: string; depth: number }> {
    let depth = 0
    let quote: string | undefined
    for (let index = from; index < text.length; index++) {
      const char = text[index]!
      if (char === "\\") {
        index++
        continue
      }
      if (quote) {
        if (char === quote) quote = undefined
        continue
      }
      if (char === '"' || char === "'") {
        quote = char
        continue
      }
      if (OPEN.test(char)) {
        yield { index, char, depth }
        depth++
      } else if (CLOSE.test(char)) {
        depth--
        yield { index, char, depth }
      } else yield { index, char, depth }
    }
  }
}

/** An opening bracket. */
const OPEN = /[([]/

/** A closing bracket. */
const CLOSE = /[)\]]/

/** Any bracket. */
const BRACKET = /[()[\]]/
