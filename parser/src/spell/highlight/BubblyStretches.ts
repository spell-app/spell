import type {
  BubblyDrawing,
  BubblyLine,
  BubblyNode,
  BubblyPartOfSpeech,
  BubblyPiece,
  BubblyPieceKind,
  BubblyUnderline
} from "./highlight.types"

/****************
 * ### `BubblyStretches`
 * A `BubblyDrawing`'s lines as an editor marks them on its text:  one STRETCH per piece, in order, then one per
 * underline (`underline`), over the stretches it runs under.
 * - What an editor needs that the drawing leaves to the drawer:
 *   - a quoted input split in three:  its own `"`, its words, its closing `"` (`quote-open`, `input`, `quote-close`)
 *   - the name a head defines, `isName`:  its first quoted input (`"card"` in `a "card" is a view`),
 *     or a thing's bare one (`solitaire` in `solitaire is an app`)
 *   - a heading's `#`s apart from its words (`heading-mark`, then `heading`)
 *   - the part of speech of the band a head's stretches sit on:  `partOfSpeech`
 *   - each underline, ONE stretch from where its value or question starts to where it ends, so an editor draws it
 *     as one line, its dots even, never one per piece
 * - Read by both editors, so they mark the same stretches the same way (epic `language` P50, P51):
 *   - Monaco's `BubblyMarks` (the app), a line at a time (`ofLine()`), as it builds its shapes round them
 *   - the language server's `spell/bubbly` request, for VS Code's decorations, the whole drawing (`of()`)
 * - The page draws its own HTML from the drawing (`BubblyHtml`):  a page has no caret to keep on its letters.
 * - STATIC and instance-free:  pure data, no editor.
 ****************/
export class BubblyStretches {
  /** Every stretch of `drawing`, in order. */
  static of(drawing: BubblyDrawing): BubblyStretch[] {
    const stretches: BubblyStretch[] = []
    const walk = (nodes: BubblyNode[]) => {
      for (const node of nodes) {
        switch (node.kind) {
          case "gap":
            break
          case "line":
            stretches.push(...BubblyStretches.ofLine(drawing.text, node))
            break
          case "block":
            stretches.push(...BubblyStretches.ofLine(drawing.text, node.head, { band: node.partOfSpeech }))
            walk(node.body)
            break
        }
      }
    }
    walk(drawing.nodes)
    return stretches
  }

  /**
   * The stretches of `line`, a line of `text`.
   * - `band`:  the line is a declaration's head, on a band of this part of speech;
   *   its first quoted input is the name it defines;  a thing's first input, quoted or bare (`solitaire is an app`).
   */
  static ofLine(text: string, line: BubblyLine, { band }: { band?: BubblyPartOfSpeech } = {}): BubblyStretch[] {
    const stretches: BubblyStretch[] = []
    const add = (start: number, end: number, kind: BubblyStretchKind, more: Partial<BubblyStretch> = {}) => {
      if (end > start) stretches.push({ start, end, kind, ...(band ? { partOfSpeech: band } : {}), ...more })
    }
    let isFirstQuoted = !!band
    for (const piece of line.pieces) {
      const { start, end, kind } = piece
      if (kind === "input" || kind === "choice") {
        const isQuoted = BubblyStretches.isQuoted(text, piece)
        if (!isQuoted) {
          // a thing's head defines its name bare too:  `solitaire is an app` (epic `language` T131)
          const isName = isFirstQuoted && band === "thing" && kind === "input"
          add(start, end, kind, isName ? { isName } : {})
          if (isName) isFirstQuoted = false
          continue
        }
        add(start, start + 1, "quote-open")
        add(start + 1, end - 1, kind, { isQuoted, ...(isFirstQuoted ? { isName: true } : {}) })
        add(end - 1, end, "quote-close")
        isFirstQuoted = false
      } else if (kind === "heading") {
        // its `#`s faint, its words bold
        const marks = /^#+/.exec(text.slice(start, end))?.[0].length ?? 0
        add(start, start + marks, "heading-mark")
        add(start + marks, end, "heading")
      } else {
        add(start, end, kind)
      }
    }
    for (const { start, end, kind } of line.underlines) add(start, end, "underline", { underlines: kind })
    return stretches
  }

  /** Is `piece` of `text` a quoted input, `"card"`? */
  static isQuoted(text: string, piece: BubblyPiece): boolean {
    const words = text.slice(piece.start, piece.end)
    return piece.kind === "input" && words.length > 1 && words.startsWith('"') && words.endsWith('"')
  }
}

/** What a stretch is:  a piece's kind, one of a quoted input's own `"` marks, or an underline under several. */
export type BubblyStretchKind = BubblyPieceKind | "quote-open" | "quote-close" | "underline"

/** One stretch of a line, as an editor marks it:  offsets into the drawing's `text`. */
export type BubblyStretch = {
  /** first character */
  start: number
  /** one past the last */
  end: number
  /** what it is to a reader */
  kind: BubblyStretchKind
  /** on a declaration's band of this part of speech:  every stretch of a head */
  partOfSpeech?: BubblyPartOfSpeech
  /** a quoted input's words, its `"` marks apart */
  isQuoted?: boolean
  /** the name its head defines:  its first quoted input */
  isName?: boolean
  /** an underline's:  what it groups */
  underlines?: BubblyUnderline["kind"]
}
