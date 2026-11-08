import { escapeHTML } from "spell/util/string"

import type { DiagramDrawing, DiagramShape } from "./diagram.types"

/****************
 * ### `DiagramSVG`
 * A diagram laid out, written as an SVG file:  what "Save as SVG" downloads, and a picture a doc can hold.
 * - The same file the NERD skill's script writes:  `width` and `height` in points that match the `viewBox`,
 *   so Confluence and other editors size it right;  a white background;  every colour written on its shape.
 * - Text:  `font` names the family, the script's own by default.
 * - PURE:  text in, text out, no DOM.  `UIDiagram` draws the same shapes live.
 ****************/
export class DiagramSVG {
  /** `drawing` as a whole SVG file. */
  static of(drawing: DiagramDrawing, font = DEFAULT_FONT): string {
    const { x, y, width, height } = drawing
    const body = drawing.shapes.map((shape) => DiagramSVG.shape(shape, font)).join("\n")
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width)}pt" height="${Math.round(height)}pt" ` +
      `viewBox="${round(x)} ${round(y)} ${round(width)} ${round(height)}">\n${body}\n</svg>\n`
    )
  }

  /** One shape, as its element. */
  private static shape(shape: DiagramShape, font: string): string {
    const paint = DiagramSVG.paint(shape)
    switch (shape.type) {
      case "rect":
        return (
          `<rect x="${round(shape.x)}" y="${round(shape.y)}" width="${round(shape.width)}" ` +
          `height="${round(shape.height)}" rx="${shape.rx}"${paint}/>`
        )
      case "path":
        return `<path d="${shape.d}"${paint}/>`
      case "arrow":
        return `<polygon points="${shape.points.map(([px, py]) => `${round(px)},${round(py)}`).join(" ")}"${paint}/>`
      case "text":
        return (
          `<text x="${round(shape.x)}" y="${round(shape.y)}" font-family="${escapeHTML(font)}" font-size="${shape.size}" ` +
          `font-weight="${shape.weight}"${paint}${shape.italic ? ' font-style="italic"' : ""}>${escapeHTML(shape.text)}</text>`
        )
    }
  }

  /** A shape's fill, stroke and dashes, as attributes. */
  private static paint(shape: DiagramShape): string {
    const stroke = shape.stroke ? ` stroke="${shape.stroke}" stroke-width="${shape.type === "path" ? 1.3 : 1.2}"` : ""
    const dash = shape.dash ? ` stroke-dasharray="${shape.dash}"` : ""
    return ` fill="${shape.fill ?? "none"}"${stroke}${dash}`
  }
}

/** The NERD skill's own font list. */
const DEFAULT_FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif"

/** A number to a tenth. */
function round(value: number): string {
  return String(Math.round(value * 10) / 10)
}
