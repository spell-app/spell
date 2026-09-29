# Class grammar

How a component's attributes become Fomantic's class string inside its shadow root.
Implemented by `ClassBuilder` (`src/elements/ClassBuilder.ts`), driven by the component's vocabulary
(`<name>.vocabulary.en.ts`, schema in `src/vocabulary/vocabulary.types.ts`).

## Why keep the grammar

- Shadow markup keeps Fomantic's classes on semantic elements: `<button class="ui small primary button">`.
- The CSS is then a mechanical port of the `.less`, and the app stylesheet / `::part` override language
  is the vocabulary people already know.
- Fomantic matches multi-word phrases with substring selectors (`[class*="four wide"]`,
  `[class*="left floated"]`), so words must come out in a fixed order.  Attributes are therefore
  enumerated per kind, never free text.
- Class words are ALWAYS canonical English.  Translated attribute names and values are mapped back to
  canonical before they reach `ClassBuilder` (see `translation.md`).

## Shape

```
ui  <size>  <color>  <keyOnly...>  <valueAndKey / keyOrValueAndKey...>  <multiple...>  <width...>  <textAlign>  <verticalAlign>  <noun>  <extra>
```

- `ui` -- always, unless the vocabulary says `ui: false` (context-only parts such as `column`).
- size, then color -- value only.
- keyOnly -- ALPHABETICAL by canonical attribute name, so output doesn't depend on vocabulary order.
- valueAndKey and keyOrValueAndKey -- in VOCABULARY order (interleaved, as declared).
- multiple, width, textAlign, verticalAlign -- in vocabulary order within each kind.
- noun -- the vocabulary's `noun` (`button`, `card`, `column`).
- `extra` -- caller-supplied classes, e.g. a state like `active`.

Example, all at once:

```html
<ui-widget size="large" color="blue" basic fluid pointing="left" floated="right"
           only="mobile" width="8" text-align="center" vertical-align="top">
```

=> `ui large blue basic fluid left pointing right floated mobile only eight wide center aligned top aligned widget`

## Attribute kinds

Semantics are copied from SUI React's `classNameBuilders.js`.  The CSS word ("key") defaults to the attribute
name with `-` replaced by a space (`very-basic` => `very basic`);  a vocabulary can set `key` explicitly.

| Kind | SUI React | Attribute | Class |
|---|---|---|---|
| `size` | value only | `size="small"` | `small` |
| | | `size="medium"` | _(nothing -- default size)_ |
| `color` | value only | `color="red"` | `red` |
| `keyOnly` | `useKeyOnly` -- `val && key` | `basic` | `basic` |
| | | `very-basic` | `very basic` |
| `valueAndKey` | `useValueAndKey` -- `val && val !== true && "val key"` | `floated="left"` | `left floated` |
| | | `floated` (bare) | _(nothing)_ |
| `keyOrValueAndKey` | `useKeyOrValueAndKey` -- `val === true ? key : "val key"` | `pointing` | `pointing` |
| | | `pointing="left"` | `left pointing` |
| `multiple` | `useMultipleProp` | `only="mobile tablet"` | `mobile only tablet only` |
| | | `only="large screen"` | `large screen only` |
| | | `reversed="computer vertically"` | `computer vertically reversed` |
| `width` | `useWidthProp` (+ fractions, percentages) | `width="4"` | `four wide` |
| | | `columns="equal"` (`canEqual`) | `equal width` |
| `textAlign` | `useTextAlignProp` | `text-align="left"` | `left aligned` |
| | | `text-align="justified"` | `justified` |
| `verticalAlign` | `useVerticalAlignProp` | `vertical-align="middle"` | `middle aligned` |
| `boolean`, `enum`, `string`, `number`, `json` | -- | | _(no class; typed property only)_ |

`ClassBuilder.build()` takes PROPERTY values (after conversion), keyed by canonical attribute name:
`true` means "bare" for keyOnly / keyOrValueAndKey, a string / number is the value, falsy emits nothing.

## Widths

The attribute is `width`, NEVER `wide`.  It accepts:

| Form | Example | Columns (of 16) | Class |
|---|---|---|---|
| number | `width="4"` / `.width = 4` | 4 | `four wide` |
| word | `width="four"` | 4 | `four wide` |
| fraction | `width="1/4"`, `"3/4"` | 4, 12 | `four wide`, `twelve wide` |
| percentage | `width="25%"`, `"100%"` | 4, 16 | `four wide`, `sixteen wide` |
| equal | `columns="equal"` | -- | `equal width` (only where `canEqual`) |

- Inexact values (`1/3`, `33%` => 5.33) snap to the nearest column with a dev-time warning.
- Out of range (`0`, `17`, `2/1`) emits nothing, with a dev-time warning.
- `widthClass` on the attribute spec picks the words after the number, like SUI React's `useWidthProp`:
  `"wide"` (default) => `four wide`, `"column"` => `four column` (grid `columns`), `"wide computer"` =>
  `four wide computer` (responsive column widths), `""` => bare `four`.
- `ValueSets.columns(value)` does the parsing, so converters and validators agree with `ClassBuilder`.

## Booleans

Attribute value => boolean, via `Converters.boolean()`:

- absent => false
- `""`, `"true"`, `"yes"`, or the attribute's own name (`disabled="disabled"`) => true
- `"false"`, `"no"`, `"0"` => false -- Vue sends `open="false"` when it can't find a property
- any other present value => true (HTML presence semantics)
- reflection: true => `""`, false => attribute removed; NEVER `"false"`

keyOrValueAndKey attributes use `Converters.keyOrValue()`: bare / `"true"` / `"yes"` => `true`,
`"false"` / `"no"` => `false`, otherwise the (validated) value.

## `medium`

`medium` is a real size meaning "default".  It is accepted, validated and reflected like any other size,
but `ClassBuilder` emits NO class for it -- so `size="medium"` and no `size` render identically, and CSS never
needs a `.medium` rule.

## Value sets

Enumerated values are validated against shared sets in `ValueSets` (or an inline list in the vocabulary):

- `hues` -- `primary secondary red orange yellow olive green teal blue violet purple pink brown grey black`
  (extensible: `ValueSets.add("hues", ...)`)
- `sizes` -- `mini tiny small medium large big huge massive`
- `positions` -- `top left`, `top center`, `top right`, `bottom left`, `bottom center`, `bottom right`,
  `left center`, `right center`
- `attachments` -- `top`, `bottom`, `left`, `right`, `top left`, `top right`, `bottom left`, `bottom right`
- `alignments` -- `left center right justified`;  `verticalAlignments` -- `top middle bottom`
- `floats` -- `left right`;  `devices` -- `mobile tablet computer`, `large screen`, `widescreen`
- `widths` -- `1`..`16` (+ words, fractions, percentages)
- `booleans` -- `true false yes no`

Unknown values are dropped with a dev-time "did you mean" warning (`Converters.enumValue()`, Levenshtein via
`$/util`'s `suggest()`).
