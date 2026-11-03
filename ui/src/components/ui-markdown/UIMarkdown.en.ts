/**
 * The English vocabulary of `<ui-markdown>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - The source pieces (`source`, `load`, `ui-loaded` ... `ui-error`, the loader and error parts, the states and texts)
 *   are shared with `<ui-include>` and `<ui-code>`:  `UIT.Source*`, which `LoadableComponent` reads.
 */

import type { E } from "spell/ui/core"
import * as UIT from "spell/ui/components/components.types"

/****************
 * ### `markdownVocabulary`
 * The names of `<ui-markdown>`, GitHub-flavoured markdown rendered:
 * the element's own text or a `source` file, its code blocks as `<ui-code>`;
 * `sanitized` runs it through DOMPurify;  `editable` edits its text where it's drawn (⌥-click),
 * `editable="tabs"` adds Write / Preview tabs.
 ****************/
export const markdownVocabulary = {
  tag: "ui-markdown",
  icon: "markdown",
  topics: ["text", "typography", "data display"],
  aka: ["markdown", "md", "gfm", "readme", "rich text", "prose"],
  skeleton: "header, 4 line paragraph",
  noun: "markdown",
  description:
    "Markdown renders GitHub-flavoured markdown -- tables, task lists, code blocks -- from the element's own text or a file on this site.",
  attributes: [
    ...UIT.SourceAttributes,
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Text size, as Fomantic's sizes;  default `medium`."
    },
    {
      name: "breaks",
      group: "appearance",
      kind: "boolean",
      description: "A single newline is a line break, as in GitHub comments;  default off, as in GitHub files."
    },
    {
      name: "heading-offset",
      group: "appearance",
      kind: "number",
      property: "headingLevelOffset",
      default: 0,
      description:
        "Levels to shift headings by, e.g. `1`:  `#` becomes `<h2>`, to sit under the page's own heading.  Property " +
        "`headingLevelOffset`:  `headingOffset` is WebKit's native `headingoffset`."
    },
    {
      name: "skip-title",
      group: "behaviour",
      kind: "boolean",
      description:
        "Drop the text's leading `#` title (an `h1` first thing in the text), e.g. when the page shows its own " +
        "headline above a README.  The text itself is unchanged:  `content`, `save()` and the editor keep it."
    },
    {
      name: "editable",
      group: "behaviour",
      kind: "keyOrValueAndKey",
      values: ["tabs"],
      description:
        "Edit the text where it's drawn:  ⌥-click (Alt-click) a paragraph, a heading, a list item or a table cell, " +
        "and it becomes a box holding its markdown;  Enter or a click away keeps it, Tab moves to the next, Escape " +
        "puts it back, and 5 seconds without typing keeps it too.  Holding ⌥ outlines what can be edited.  " +
        '`editable="tabs"`:  Write / Preview tabs instead, a text box for the whole markdown and its preview.  ' +
        "Each edit is a `ui-changed`, and `save()` writes it:  in place, each edit is saved as it's kept."
    },
    {
      name: "sanitized",
      group: "advanced",
      kind: "boolean",
      description:
        "Sanitize the rendered markup with DOMPurify (its own lazy chunk, loaded only then):  no scripts, event " +
        "handlers or `javascript:` links.  Set it for text you didn't write;  without it, raw HTML is kept as written."
    }
  ],
  events: [
    ...UIT.SourceEvents,
    {
      name: "ui-drawn",
      detail: "{ headings: { level: number, text: string, id: string }[] }",
      description:
        "Rendered;  `headings` (also the `headings` property) lists its headings, e.g. for a table of contents."
    }
  ],
  slots: [],
  parts: [
    ...UIT.SourceParts,
    { name: "body", description: "The `<article>` holding the rendered markdown." },
    { name: "tabs", description: '`editable="tabs"`:  the Write / Preview tab list.' },
    { name: "tab", description: '`editable="tabs"`:  each tab button.' },
    { name: "editor", description: '`editable="tabs"`:  the `<textarea>` holding the markdown.' },
    { name: "edit-box", description: "`editable`:  the box a piece becomes while it's edited in place, holding its markdown." }
  ],
  states: [
    ...UIT.SourceStates,
    { name: "placing", description: "`editable`:  ⌥ is held, so what can be edited in place is outlined." },
    { name: "editing", description: "`editable`:  a piece is being edited in place." }
  ],
  texts: [
    ...UIT.SourceTexts,
    { key: "write", text: "Write", description: '`editable="tabs"`:  the editing tab.' },
    { key: "preview", text: "Preview", description: '`editable="tabs"`:  the preview tab.' },
    { key: "editor", text: "Markdown", description: '`editable="tabs"`:  accessible name of the text box.' },
    { key: "editBox", text: "Edit {kind}", description: "`editable`:  accessible name of the box a piece becomes." },
    { key: "paragraph", text: "paragraph", description: "`editable`:  a paragraph, in `editBox`." },
    { key: "heading", text: "heading", description: "`editable`:  a heading, in `editBox`." },
    { key: "item", text: "list item", description: "`editable`:  a list item, in `editBox`." },
    { key: "cell", text: "table cell", description: "`editable`:  a table cell, in `editBox`." }
  ]
} as const satisfies E.ComponentVocabulary
