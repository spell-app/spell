/**
 * The types of the code family that the component and its highlighter (`CodeHighlighter`, `CodeEngine`) share.
 * - Types only:  nothing here runs.
 */

////////////////
// ## Highlighting
////////////////

/** What a highlight came to (`CodeHighlighter.highlight()`). */
export type Highlighted = {
  /** the code as HTML:  escaped text in `hljs-*` spans */
  html: string
  /** what it was coloured as;  `undefined` for plain text */
  language?: string
  /** guessed, not asked for */
  detected: boolean
  /** the code drawn whole by its language (`CodeLanguage.draw`):  `html` is the drawing, no lines to number */
  isDrawn?: boolean
  /** the CSS a drawing's classes need */
  styles?: string
}

/** How `CodeHighlighter.highlight()` may colour. */
export type HighlightOptions = {
  /** take a language's whole drawing, when it has one (`CodeLanguage.draw`), over its coloured lines */
  drawing?: boolean
}
