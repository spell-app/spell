import { upperFirst } from "spell/util"
import type { SP } from "spell/parser/spell"
import type { DesignBit } from "./Design"
import type { OwnView } from "./Palette"

/**
 * The drawings of a view, read from its file's text for Design's picker (epic `editor` P37, J237):
 * each `to draw ...` line of its type's block, in the file's own language.
 * - Read from the text, as the site's parts are (`SiteEdits`), so the picker follows each keystroke, before a parse.
 * - The words are the language's own, never a list of our own:
 *   - its type's line:  the language's `kindDeclaration` (`a "card" is a ...`, `una "carta" es una ...`)
 *   - a method's line:  its `methodLine` (`to ...`, `para ...`)
 *   - a drawing's:  the words of its drawing line (`page.twins.draw`):  `to draw it`, `para dibujar eso`,
 *     and Spanish's `para dibujarla`, its `it` fused onto the verb (`fusedIt`)
 *   - a side's:  its possessive word (`its`, `su`, one of its `pronouns`), then the side, which compiles by
 *     the name its built-in type gives it (`P.TypeScope.slotOutput()`):  Spanish's `frente` is the `front`
 * - No parser, no DOM, no Solid:  testable on its own.
 */
export class DesignDrawings {
  /**
   * The drawings of `view` in its file's `text`, in `language`:  each `to draw ...` line of its type's block,
   * with the lines under it.
   * - Its type's block:  from the top-level line naming it to the next top-level line;
   *   no such line, every drawing in the file.
   * - A side's row says the side as written (`Front`, `Frente`);  a plain drawing's, `plainLabel`.
   * - Lines from 0.
   */
  static in(text: string, view: OwnView, language: SP.Language, plainLabel: string): DesignBit[] {
    const words = language.words
    const lines = text.split("\n")
    const start = lines.findIndex((line) => isTop(line) && DesignDrawings.declares(line, view, words))
    const end = start < 0 ? lines.length : lines.findIndex((line, at) => at > start && isTop(line))
    const isTwoSided = view.classNames.includes(TWO_SIDED)
    const found: DesignBit[] = []
    for (let at = Math.max(start, 0); at < (end < 0 ? lines.length : end); at++) {
      const line = lines[at]!
      const drawing = DesignDrawings.drawingOf(line, words)
      if (!drawing) continue
      const indent = /^\s*/.exec(line)![0].length
      let last = at
      for (let next = at + 1; next < lines.length; next++) {
        const below = lines[next]!
        if (!below.trim()) continue
        if (/^\s*/.exec(below)![0].length <= indent) break
        last = next
      }
      const side = drawing.slot && isTwoSided ? DesignDrawings.sideOf(drawing.slot, language) : undefined
      found.push({
        kind: "drawing",
        key: `drawing:${drawing.written}`,
        label: drawing.slot ? upperFirst(drawing.slot) : plainLabel,
        written: drawing.written,
        lines: { start: at, end: last },
        side,
        name: view.classNames[0]
      })
    }
    return found
  }

  /** Does top-level `line` declare `view`'s type, as `language`'s `kindDeclaration` reads it?  A comment after it left out. */
  private static declares(line: string, view: OwnView, words: SP.LanguageWords): boolean {
    const { source, flags } = words.declarations.kindDeclaration
    const name = new RegExp(source, flags.replace("g", "")).exec(line.replace(COMMENT, ""))?.[2]
    return !!name && sameWords(name, view.name)
  }

  /**
   * What `line` draws, if it's a drawing's line:  its words as written, `to draw its front`, and its slot, `front`
   * (none for a plain `to draw it`).
   * - Any comment after it left out;  its `-` and quotes too (`- to "draw its front":`).
   */
  private static drawingOf(line: string, words: SP.LanguageWords): { written: string; slot?: string } | undefined {
    const said = line
      .replace(COMMENT, "")
      .replace(/^\s*(?:-\s+)?/, "")
      .replaceAll('"', "")
      .replace(/\s*:\s*$/, "")
      .trim()
    if (!words.declarations.methodLine.test(said)) return undefined
    const lead = drawingLead(words)
    if (!lead || !said.toLowerCase().startsWith(lead.toLowerCase())) return undefined
    const glued = /^\S*/.exec(said.slice(lead.length))![0]
    const rest = said
      .slice(lead.length + glued.length)
      .split(/\s+/)
      .filter(Boolean)
    // `para dibujarla`:  the language's `it` fused onto its verb;  `to drawer` is no drawing
    if (glued) {
      const verb = said.split(/\s+/)[lead.split(/\s+/).length - 1]!
      return !rest.length && words.fusedIt?.test(verb) ? { written: said } : undefined
    }
    const [possessive, ...slot] = rest
    const isSlot = !!possessive && slot.length > 0 && words.pronouns.has(possessive.toLowerCase())
    return { written: said, slot: isSlot ? slot.join(" ") : undefined }
  }

  /** The side `slot` is, by the name it compiles by:  `front` for Spanish's `frente`. */
  private static sideOf(slot: string, language: SP.Language): string {
    // a pack with no parser here yet is English, the grammar not loaded (epic `solid-2-final` P20):  its sides are
    // the names they compile by
    if (!language.hasParser) return slot
    return language.rootScope.types.get(TWO_SIDED)?.slotOutput(slot) ?? slot
  }
}

/** The built-in a view with a front and a back extends. */
const TWO_SIDED = "TwoSidedView"

/** A comment after a line's code. */
const COMMENT = /\s*(?:--|\/\/).*$/

/** Is `line` at a file's top, and not a comment? */
function isTop(line: string): boolean {
  return /^\S/.test(line) && !/^(?:#|--|\/\/)/.test(line)
}

/**
 * The words a drawing's line starts with, the language's drawing line without its `it`:  `to draw`, `para dibujar`.
 * - `undefined` for a language with no page words:  it lists no drawings.
 */
function drawingLead(words: SP.LanguageWords): string | undefined {
  return words.page?.twins.draw
    .replace(/\s*:\s*$/, "")
    .trim()
    .split(/\s+/)
    .slice(0, -1)
    .join(" ")
}

/** Do `a` and `b` say the same words, whatever their case and spacing? */
function sameWords(a: string, b: string): boolean {
  const plain = (words: string) =>
    words
      .trim()
      .toLowerCase()
      .split(/[\s-]+/)
      .join(" ")
  return plain(a) === plain(b)
}
