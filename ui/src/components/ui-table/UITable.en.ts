/**
 * The English vocabulary of `<ui-table>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar, and are MIRRORED onto the slotted
 *   `<table>` (see `UITable`):  `<ui-table size="small" celled appearance="very-basic" stuck="head first">` =>
 *   `ui small celled very basic head stuck first stuck table`.
 * - Row / cell classes (`positive`, `red marked`, `collapsing`, `four wide` ...) are the author's,
 *   on native `tr` / `td` / `th`:  no attribute here.
 * - NOTE: `columns` is Fomantic's (and `<ui-grid>`'s) equal-width COUNT (`four column`);
 *   the data-mode column list is `column-defs` (`columnDefs`), so the two never collide.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `tableVocabulary`
 * The names of `<ui-table>`, a native `<table>` (slotted, or rendered from `rows`) in Fomantic's table look.
 ****************/
export const tableVocabulary = {
  tag: "ui-table",
  topics: ["tables", "data display", "basic", "collections"],
  aka: ["data table", "data grid", "grid", "spreadsheet"],
  skeleton: "long line, 4 line paragraph",
  noun: "table",
  description: "A table displays a collection of data grouped into rows.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Text size, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Coloured top edge;  with `inverted`, a coloured fill."
    },
    { name: "celled", group: "layout", kind: "keyOnly", description: "Borders between cells." },
    { name: "collapsing", group: "layout", kind: "keyOnly", description: "As narrow as its content (`width: auto`)." },
    {
      name: "definition",
      group: "appearance",
      kind: "keyOnly",
      description: "First column is a definition column;  blank corner."
    },
    {
      name: "fixed",
      group: "layout",
      kind: "keyOnly",
      description: "`table-layout: fixed`;  overflowing cell text is cut with `…`."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds:  the dark scheme." },
    {
      name: "resizable",
      group: "behaviour",
      kind: "keyOnly",
      description: "With `scrolling`:  people can drag the height."
    },
    { name: "selectable", group: "behaviour", kind: "keyOnly", description: "Body rows highlight on hover." },
    {
      name: "single-line",
      group: "appearance",
      kind: "keyOnly",
      description: "No wrapping:  every cell's text stays on one line (`single line`)."
    },
    {
      name: "sortable",
      group: "behaviour",
      kind: "keyOnly",
      description:
        "Header cells sort the table:  click / Enter / Space dispatches `ui-sorting`;  the sorted one gets " +
        '`aria-sort`.  Opt a header out with `data-sortable="false"` (or Fomantic\'s `class="disabled"`).'
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["basic", "very-basic", "striped", "structured"],
      classes: { "very-basic": "very basic" },
      replaces: [
        { from: "basic", value: "basic", values: { very: "very-basic" } },
        { from: "striped", value: "striped" },
        { from: "structured", value: "structured" }
      ],
      description:
        "The look, several words at once:  `basic` (no header fill), `very-basic` (no outer border or edge " +
        "padding either), `striped` (every other body row tinted), `structured` (collapsed borders, for " +
        '`rowspan` / `colspan` headers).  Old names:  `basic` (`basic="very"`), `striped`, `structured`.'
    },
    {
      name: "unstackable",
      group: "layout",
      kind: "keyOnly",
      description: "Never stacks rows into blocks, even on a viewport below 768px."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["xs", "compact", "md", "lg"],
      classes: { xs: "very compact", md: "padded", lg: "very padded" },
      replaces: [
        { from: "compact", value: "compact", values: { very: "xs" } },
        { from: "padded", value: "md", values: { very: "lg" } }
      ],
      description:
        "Cell padding:  `xs` and `compact` less, `md` and `lg` more.  " +
        'Old names:  `compact` (`compact="very"` is `xs`), `padded` (`padded="very"` is `lg`).'
    },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["both", "top", "bottom"],
      classes: { both: "attached", top: "top attached", bottom: "bottom attached" },
      replaces: [{ from: "attached", value: "both" }],
      description:
        "Joins a segment or another table:  `both` (in the middle), `top` or `bottom`.  Old name:  `attached`."
    },
    {
      name: "stackable",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["tablet"],
      description:
        "Rows become blocks on a viewport below 768px (the default, `stackable`);  " +
        '`stackable="tablet"` also below 992px.  `stack-by="container"` follows the table\'s OWN width instead.'
    },
    {
      name: "stack-by",
      group: "layout",
      kind: "enum",
      values: ["viewport", "container", "none"],
      description:
        "What `stackable` measures:  the `viewport` (Fomantic's way, the default), the table's own width " +
        "(`container`:  a table in a narrow column of a wide screen), or nothing (`none`:  it never stacks, " +
        "as `unstackable`).  Also a token for a whole region or page:  `--ui-table-stack-by: container` " +
        "(or `none`);  the attribute wins.  Neither:  the page-wide `--ui-stack-with` " +
        "(`<ui-root stack-with>`;  `page` ~== `viewport`)."
    },
    {
      name: "scrolling",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["short", "very short", "long", "very long"],
      description:
        "Caps the height and scrolls, head and foot stuck;  `short` / `very short` / `long` / `very long` " +
        "change the cap.  The scroller becomes a focusable, named region."
    },
    {
      name: "overflowing",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["short", "very short", "long", "very long"],
      description: "Like `scrolling`, both ways, with nothing stuck;  same height steps."
    },
    {
      name: "stuck",
      group: "appearance",
      kind: "multiple",
      values: ["head", "foot", "first", "last"],
      description:
        'Sticky parts:  `stuck="head"` (the `thead`), `foot`, `first` / `last` column;  several at once, ' +
        'e.g. `stuck="head first"`.'
    },
    {
      name: "columns",
      group: "layout",
      kind: "width",
      values: "widths",
      widthClass: "column",
      description: "Equal-width column count, `1` ... `16` (or `1/4`, `25%`):  `four column`."
    },
    {
      name: "align",
      group: "layout",
      kind: "textAlign",
      replaces: ["text-align"],
      description: "Text alignment of every cell.  Old name:  `text-align`."
    },
    {
      name: "vertical-align",
      group: "layout",
      kind: "verticalAlign",
      description: "Vertical alignment of every cell."
    },
    {
      name: "sort-column",
      group: "behaviour",
      kind: "number",
      description:
        "Index of the sorted column (0-based, counting `colspan`s);  set by people's clicks unless the app " +
        "controls it."
    },
    {
      name: "sort-direction",
      group: "behaviour",
      kind: "enum",
      values: ["ascending", "descending"],
      description: "Direction of `sort-column`;  a newly sorted column starts `ascending`."
    },
    {
      name: "client-sort",
      group: "advanced",
      kind: "boolean",
      description:
        "Slotted tables:  reorder the `tbody` rows by the sorted column's cell text on `ui-sorting` (numeric-aware).  " +
        "Off, the app sorts its own rows."
    },
    {
      name: "column-defs",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "Data mode:  `TableColumn[]` (`key`, `header`, `textAlign`, `sortable`, `width`);  default the first " +
        "row's keys."
    },
    {
      name: "rows",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "Data mode:  `Record<string, unknown>[]`;  with no slotted `<table>`, the element renders one (text " +
        "only) into its light DOM."
    }
  ],
  events: [
    {
      name: "ui-sorting",
      detail: '{ column: number, key?: string, direction: "ascending" | "descending", originalEvent?: Event }',
      cancelable: true,
      description:
        "A header was activated;  `preventDefault()` keeps the current sort (and skips data / `client-sort` " +
        "reordering)."
    }
  ],
  slots: [{ name: "", description: "One native `<table>`." }],
  parts: [
    {
      name: "scroller",
      description:
        "Box around the slotted table;  scrolls (a focusable, named region) with `scrolling` / `overflowing`."
    }
  ],
  states: [
    {
      name: "attached",
      description: "Set while `attach` is set (any edge):  the host drops the outer margin it carries."
    },
    { name: "attached-top", description: "Set while `attach` is `top`:  the host keeps only its top margin." },
    {
      name: "attached-bottom",
      description: "Set while `attach` is `bottom`:  the host keeps only its bottom margin."
    }
  ],
  texts: [
    {
      key: "label",
      text: "Table",
      description: "Name of the scrolling region when the host has no `aria-label` and the table no `<caption>`."
    }
  ]
} as const satisfies E.ComponentVocabulary
