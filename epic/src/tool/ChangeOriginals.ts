/****************
 * ### `ChangeOriginals`
 * The words a CHANGE MARK replaced (epic `epic-engine` I160), found by comparing its doc with an earlier version:
 * what `<epic-change was>` holds, the popup's "Originally".
 * - Owen, 2026-10-29:  "Should say original text for comparison";  the tool finds them, so no writer has to
 *   remember to (J-item:  an automatic way beats an attribute the agent must write)
 * - How:  the text around the mark is lined up with the same block's text in the earlier version, word by word
 *   (the longest common run of words), and what the earlier version had between the words just before the mark and
 *   just after it is what the mark replaced
 *   - the block:  the mark's nearest ancestor with an id that the earlier version has too (a paragraph, an item,
 *     a phase, an Overview part);  else the whole body
 *   - nothing there (new words), or the same words (the earlier version already had the mark):  no original from
 *     that version, and the next one is asked
 * - Which versions:  the caller's, newest first (`PlanDocFiles.edit()`:  the doc on disk before this edit, then its
 *   last commits), read only as needed
 * - Pure DOM:  works on any `Document`s (linkedom's in the tool);  NEVER throws
 ****************/
export class ChangeOriginals {
  /**
   * The words `change` replaced, as plain text, from the first of `earlier` that tells:  `undefined` when none
   * does, or the mark added new words.
   * - long ones cut to `MAX_LENGTH` characters, with `…`
   */
  static find(change: Element, earlier: Iterable<Document>): string | undefined {
    const words = ChangeOriginals.textOf(change)
    for (const document of earlier) {
      const original = ChangeOriginals.wordsBefore(change, document)
      if (original === undefined || original === words) continue
      return original ? ChangeOriginals.cut(original) : undefined
    }
    return undefined
  }

  /**
   * What `earlier` had where `change` is now:  the words, `""` for none (new words), `undefined` when its block
   * isn't there or the two are too far apart to line up.
   */
  static wordsBefore(change: Element, earlier: Document): string | undefined {
    const block = ChangeOriginals.blockIn(change, earlier)
    if (!block) return undefined
    const now = ChangeOriginals.tokens(block.now, change)
    const earlierTokens = ChangeOriginals.tokens(block.before)
    const before = earlierTokens.map((token) => token.word)
    const start = now.findIndex((token) => token.inMark)
    if (start < 0) return undefined
    let end = start
    while (end < now.length && now[end]!.inMark) end++
    const matches = ChangeOriginals.matching(
      now.map((token) => token.word),
      before
    )
    if (!matches) return undefined
    // the nearest words outside the mark that both versions share, and what lay between them
    let from = -1
    for (let i = start - 1; i >= 0; i--)
      if (matches[i] !== undefined) {
        from = matches[i]!
        break
      }
    let to = before.length
    for (let i = end; i < now.length; i++)
      if (matches[i] !== undefined) {
        to = matches[i]!
        break
      }
    if (to <= from + 1) return ""
    // the earlier text itself, from its first word to its last, punctuation and all
    const first = earlierTokens[from + 1]!
    const last = earlierTokens[to - 1]!
    return first.text.slice(first.start, last.end).split(/\s+/).filter(Boolean).join(" ")
  }

  ////////////////
  // ## Lining up
  ////////////////

  /**
   * For each word of `now`, the index of the word of `before` it's lined up with, or `undefined`:  the longest
   * common run of words, after the common start and end are taken off.
   * - `undefined` when what's left is too big to compare (`MAX_CELLS`)
   */
  private static matching(now: string[], before: string[]): (number | undefined)[] | undefined {
    const matches: (number | undefined)[] = Array.from({ length: now.length })
    let head = 0
    while (head < now.length && head < before.length && now[head] === before[head]) matches[head] = head++
    let tail = 0
    while (
      tail < now.length - head &&
      tail < before.length - head &&
      now[now.length - 1 - tail] === before[before.length - 1 - tail]
    ) {
      matches[now.length - 1 - tail] = before.length - 1 - tail
      tail++
    }
    const rows = now.length - head - tail
    const columns = before.length - head - tail
    if (!rows || !columns) return matches
    if (rows * columns > MAX_CELLS) return undefined
    // lengths[i][j]:  the longest common run of now[head + i ..] and before[head + j ..]
    const width = columns + 1
    const lengths = new Uint32Array((rows + 1) * width)
    for (let i = rows - 1; i >= 0; i--)
      for (let j = columns - 1; j >= 0; j--)
        lengths[i * width + j] =
          now[head + i] === before[head + j]
            ? lengths[(i + 1) * width + j + 1]! + 1
            : Math.max(lengths[(i + 1) * width + j]!, lengths[i * width + j + 1]!)
    for (let i = 0, j = 0; i < rows && j < columns;) {
      if (now[head + i] === before[head + j]) {
        matches[head + i] = head + j
        i++
        j++
      } else if (lengths[(i + 1) * width + j]! >= lengths[i * width + j + 1]!) i++
      else j++
    }
    return matches
  }

  /** The block holding `change`, and the same block in `earlier`:  by the nearest id both have, else the bodies. */
  private static blockIn(change: Element, earlier: Document): { now: Element; before: Element } | undefined {
    for (let element = change.parentElement; element; element = element.parentElement) {
      if (!element.id || !ID.test(element.id)) continue
      const before = earlier.querySelector(`[id="${element.id}"]`)
      if (before) return { now: element, before }
    }
    const now = change.ownerDocument.body
    return now && earlier.body ? { now, before: earlier.body } : undefined
  }

  /**
   * The words of `root`'s text, each marked when it's inside `change`, with where it lies in `text` (all of `root`'s
   * text nodes, a space between):  a word is its letters and digits, each other mark (`.`, `,`) a word of its own, so
   * "hover." lines up with "click" and ".".
   */
  private static tokens(root: Element, change?: Element): Token[] {
    const pieces: { text: string; inMark: boolean }[] = []
    const walk = (node: Node, inMark: boolean) => {
      if (node.nodeType === TEXT_NODE) pieces.push({ text: node.textContent ?? "", inMark })
      else if (node.nodeType === ELEMENT_NODE)
        for (const child of Array.from(node.childNodes)) walk(child, inMark || node === change)
    }
    walk(root, false)
    const text = pieces.map((piece) => piece.text).join(" ")
    const tokens: Token[] = []
    let offset = 0
    for (const piece of pieces) {
      for (const match of piece.text.matchAll(WORD))
        tokens.push({
          word: match[0],
          inMark: piece.inMark,
          text,
          start: offset + match.index,
          end: offset + match.index + match[0].length
        })
      offset += piece.text.length + 1
    }
    return tokens
  }

  /** `element`'s words, one space between. */
  private static textOf(element: Element): string {
    return (element.textContent ?? "").split(/\s+/).filter(Boolean).join(" ")
  }

  /** `text` cut to `MAX_LENGTH` characters, at a word, with `…`. */
  private static cut(text: string): string {
    if (text.length <= MAX_LENGTH) return text
    const cut = text.slice(0, MAX_LENGTH)
    return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), MAX_LENGTH / 2))}…`
  }
}

/** A word of a block's text (`tokens()`):  where it lies in `text`, and whether it's inside the mark. */
type Token = { word: string; inMark: boolean; text: string; start: number; end: number }

/** A word:  letters, digits and the marks inside words (`it's`, `epic-engine`);  else one other mark alone. */
const WORD = /[\p{L}\p{N}_'’-]+|[^\s\p{L}\p{N}_'’-]/gu

/** The longest original kept, in characters:  the popup's line, not the paragraph. */
const MAX_LENGTH = 300

/** The most words-times-words compared at once (4 million:  16 MB of lengths);  more, and that version is skipped. */
const MAX_CELLS = 4_000_000

/** An id the tool writes, safe in a selector. */
const ID = /^[\w-]+$/

/** `Node.TEXT_NODE`, `Node.ELEMENT_NODE`:  linkedom's nodes have no `Node` global in node. */
const TEXT_NODE = 3
const ELEMENT_NODE = 1
