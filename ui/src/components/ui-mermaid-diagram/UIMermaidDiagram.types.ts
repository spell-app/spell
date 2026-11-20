/**
 * The types `<ui-mermaid-diagram>`'s files share:  the element, `MermaidDrawer` and the lazy `MermaidEngine`.
 * - PURE DATA, types only:  the engine's chunk and node's tools read it without loading the element.
 */

import type { SourceErrorCause } from "spell/ui/runtime/runtime.types"

/** What the element asks the engine to draw with. */
export type MermaidDrawRequest = {
  /** Mermaid's settings for this draw:  theme, its variables, look, layout, seed (Mermaid's `MermaidConfig`) */
  config: Record<string, unknown>
  /** the icons the text names, each with its `<svg>` from the page's packs (none:  not found) */
  icons: DiagramIcon[]
}

/** What a draw gives back. */
export type DrawnDiagram = {
  /** the drawing, as SVG text */
  svg: string
  /** what Mermaid read the text as:  `flowchart-v2`, `sequence`, `gantt` ... */
  diagramType: string
}

/** One icon a diagram's text names. */
export type DiagramIcon = {
  /** the prefix the text used, which Mermaid looks the icon up under:  `fa`, `far`, `fa7-free` */
  prefix: string
  /** the name the text used, after the prefix:  `car` */
  name: string
  /** the page's name for it, as `<ui-icon name>` takes it:  `car`, `heart outline`, `fa7-free:car` */
  pageName: string
  /** its `<svg>`, from the page's packs;  `undefined` until fetched, or when no pack has it */
  svg?: SVGSVGElement
}

/** What a failed draw's `SourceError` says, beside its `kind` (`render`). */
export type MermaidProblemCause = SourceErrorCause & {
  /** the line of the text Mermaid stopped at, counted from 1 */
  line?: number
  /** what Mermaid would have taken there, its first few tokens */
  expected?: string[]
  /** Mermaid couldn't tell what kind of diagram the text is */
  isUnknownKind?: boolean
}

/** A reader's picks from the menu, kept for one drawing. */
export type MermaidPicks = {
  /** the theme picked, or none */
  theme?: string
  /** light or dark picked (`auto`:  like the page), or none */
  scheme?: string
}
