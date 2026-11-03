/**
 * The types of the markdown family that the component, its renderer and its engines share.
 * - Pure data:  `import type` only, so node can load it (`yarn site:data`),
 *   and the engines (built ALONE by the docs bundler) pull in nothing with it.
 * - The constants only `UIMarkdown` reads live below that class.
 */

////////////////
// ## Rendering
////////////////

/** One heading of the rendered markdown. */
export type MarkdownHeading = {
  /** `1` ... `6`, after `heading-offset` */
  level: number
  /** its text */
  text: string
  /** its `id` (GitHub's slug), so `#id` links reach it */
  id: string
}

/** How to render. */
export type MarkdownOptions = {
  /** a single newline is a `<br>` */
  breaks: boolean
  /** levels to shift headings by */
  headingOffset: number
  /** sanitize the markup (`MarkdownSanitizer`, loaded on first use) */
  sanitized: boolean
  /**
   * mark each piece that can be edited in place with its place's number (`data-ui-place`), and return the places
   * (`editable`);  an engine that can't leaves them out, and nothing is editable in place
   */
  places?: boolean
}

/** What an engine's render came to. */
export type MarkdownResult = {
  /** the markup, NOT sanitized:  the element sanitizes it when `sanitized` */
  html: string
  /** every heading, in order */
  headings: MarkdownHeading[]
  /** `places`:  each editable piece's place in the text, by the number its element is marked with */
  places?: MarkdownPlace[]
}

////////////////
// ## Editing in place
////////////////

/** The kinds of piece `editable` edits in place. */
export type MarkdownPlaceKind = "paragraph" | "heading" | "item" | "cell"

/**
 * Where one piece's own text sits in the markdown (`MarkdownSource`):  a paragraph, a heading's words, a list
 * item's line, a table cell's text.
 */
export type MarkdownPlace = {
  /** what kind of piece */
  kind: MarkdownPlaceKind
  /** offset of its first character in the text */
  start: number
  /** offset just after its last */
  end: number
}

/**
 * What renders markdown:  marked (`MarkdownEngine`), or a subclass's own engine (`UIMarkdown.loadEngine()`),
 * e.g. the app's `<spell-markdown>`'s, spell's.
 */
export type MarkdownRendering = {
  /**
   * Its markup holds `ui-*` elements (`<ui-table>`, `<ui-checkbox>` ...):  `sanitized` keeps them.
   * Default:  `false`, plain HTML (marked).
   */
  readonly drawsUITags?: boolean
  /** `text` rendered as `options` say. */
  render(text: string, options: MarkdownOptions): MarkdownResult
}
