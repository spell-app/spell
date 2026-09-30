import type { IconData } from "$/core"

/****************
 * ### `BreadcrumbDivider`
 * Values of the divider tokens a breadcrumb publishes (`BREADCRUMB_DIVIDER_TOKENS`), as CSS text -- shared by
 * `<ui-breadcrumb>` and its native fallback, so plain DOM, no Solid.
 ****************/
export class BreadcrumbDivider {
  /** `text` as a CSS string:  quoted, with `\`, `"` and line breaks escaped (`\A `), e.g. `›` => `"›"`. */
  static cssString(text: string): string {
    return `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replace(LINE_BREAK, "\\A ")}"`
  }

  /** An icon's data as a CSS `url()` of a standalone SVG, for the divider's mask. */
  static svgUrl([width, height, path]: IconData): string {
    const svg = `<svg xmlns="${SVG_NS}" viewBox="0 0 ${width} ${height}"><path d="${path}"/></svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
  }
}

/** SVG namespace, for the data URL's root. */
const SVG_NS = "http://www.w3.org/2000/svg"

/** Line breaks, escaped in a CSS string. */
const LINE_BREAK = /\r\n|\r|\n/g
