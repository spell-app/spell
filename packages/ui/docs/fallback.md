# Native fallbacks

What a host shows when its real render throws (plan-shared-runtime.md, 3a).  Library-neutral:  plain DOM,
no Solid, so it renders whatever broke the Solid render (the Lit spike rendered the same thing).

## API

```ts
// src/elements/NativeFallback.ts
static render(host, root, error?, internals?): NativeFallbackHandle
// handle: { dispose(): void, degraded: readonly string[] }
```

- `root.replaceChildren(...)`:  the component's adopted sheets stay, so the same `ui-*` classes and `part`s
  style the fallback.
- With `internals`, adds custom state `errored` (page styling).
- Form-associated hosts (`static formAssociated`) get real form behaviour through `internals`.
- Classes: `ButtonFallback`, `DropdownFallback`, `IconFallback`, `LabelFallback`, `SegmentFallback`,
  `ContainerFallback`, `DividerFallback`, `TextFallback`, `FlagFallback`, `LoaderFallback`, `MessageFallback`
  (each in `src/components/<name>/<name>.fallback.ts`), and one per family keyed by the host's tag:
  `ContentPartFallback` (`parts.fallback.ts`), `GridFallback`, `ImageFallback`, `PlaceholderFallback`,
  `BreadcrumbFallback`, `InputFallback` (input + textarea), `CheckboxFallback` (checkbox + radio), `FormFallback`
  (form, field, fields), `ItemFallback`, `ListFallback`, `MenuFallback`, `TableFallback`.
- Reads canonical English attribute names (a translated host maps them back first);  booleans go through
  `Converters` (`disabled="no"` is false).

## What each keeps and what degrades

| Family    | Keeps                                                                                       | Degrades                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| button    | `<button>` / `<a href>`, class grammar, `part`, `aria-*`, disabled, submit / reset with `name=value`, toggle `aria-pressed` + `active` | `ui-toggle` event, icon glyph and icon / label slots, joined `label`, `animated`, spinner;  a host `click` handler cannot `preventDefault()` submit |
| dropdown  | native `<select>` (`multiple`, placeholder option, optgroups), options from property and `<ui-item>`s, form value (`FormData` for multiple), validity, `host.value`, `ui-change` | search, `allow-additions`, `clearable`, `max-selections`, multiple-value labels, option icon / image / description, combobox keyboard pattern (native select's instead), `ui-open` / `-close` / `-search` / `-add` / `-remove`;  `readonly` becomes a disabled select |
| icon      | box, size / colour classes, `label` as `role=img` + hidden text, else `aria-hidden`         | the glyph (needs the icon data)                                                                                                                 |
| label     | `<span>` / `<a href>`, classes, `part`, slot, `detail`                                      | `removable` delete button and `ui-remove`, icon, image                                                                                          |
| segment, container | root `div`, classes, `part`, slot, `aria-busy` for `loading`                       | segment's inverted owner tokens (CSS side, none needed here)                                                                                    |
| divider   | `role=separator` (`none` when `hidden`), `aria-orientation`, classes, slot                  | `icon` shorthand                                                                                                                                |
| parts     | `div.<noun>`, standalone header as `<h1-6>` / `<a>`, owned header as `role=heading`        | `:state(in-<owner>)` styling;  owners known are only those in `parts` vocabularies                                                              |
| grid      | grid / row / column `div`s, classes (widths included), `part`, slot:  `grid.css` lays them out unchanged | --                                                                                                                                  |
| image     | `<img>` (`src`, `alt`, `width`, `height`, `loading`) or `<a href>` around it, classes, `part`;  `<ui-images>` group | --                                                                                                                          |
| text      | `<span>`, classes, `part`, slot                                                             | --                                                                                                                                              |
| flag      | emoji, `role=img` + `aria-label` (`Intl.DisplayNames` in the page language)                 | translated names of the non-country flags (English)                                                                                             |
| loader    | `role=status` + `aria-live=polite` on the root, `Loading…` name while empty, classes, slot  | translated name (English);  the name ignores later slot changes                                                                                 |
| placeholder | every shape's `div`, classes, `part`;  host `aria-hidden` + `:state(placeholder)`         | --                                                                                                                                              |
| message   | root, content block, `header` shorthand, slotted-icon box, close button with `ui-dismiss` + `hidden` | `icon` glyph, close glyph (`×`), translated `dismiss` label (English)                                                                  |
| breadcrumb | labelled `<nav>` + `<ol>`, text `divider` token, sections' divider + `<a>` / `aria-current` span, `role=listitem` | `divider-icon` (the text divider shows), translated `label` (English)                                                         |
| input     | `div.ui.input` + native `<input>` / `<textarea>` with the constraints, `label` shorthand as a joined label, form value + native validity, `host.value`, `ui-input` / `ui-change` | icon glyph and `icon` / `label` / `action` slots, corner labels, `rules`, `:state(invalid)`, value reset, Enter submission, `<label for>` names |
| checkbox  | `div.ui.checkbox` + native checkbox / radio + `<label for>` around the slot, `role=switch` toggles, form value + validity, `host.selected`, `ui-change`, `readonly` | radio grouping across elements and arrow keys, vetoing `ui-change`, `:state(invalid)`, state reset, `<label for>` names |
| form      | form / field / fields `div`s with classes, `part`, slot, `inert` when disabled;  the native `<form>` inside submits natively | validation (`rules`, prompts, events), `values` / `validate()` / `reset()` / `clear()`, `prevent-leaving` |
| item      | a bare `<slot>` unowned (a dropdown option);  in a `<ui-list>` / `<ui-menu>` parent:  `<a class="... item" href>` (`aria-current="page"` when selected) or `<div class="... item">`, `part`, slot, `role=listitem` host in a list | owner context through translated or slotted owners, `icon` / `image` shorthands, `link` / interactive `<button>`s, `menuitem` roles |
| list      | `<ul>` / `<ol>` (`ordered`) with `role=list`, class grammar, `part`, slot;  the sub-list form (`class="list"`) inside a `<ui-item>` / `<ui-list>` parent, an `<ol>` under an ordered list;  items via `ItemFallback` | `ui-select`;  sub-lists behind translated or slotted parents;  numbering / bullets still come from `list.css` |
| menu      | `<nav class="ui ... menu" part="menu" aria-label>` around the slot;  a sub-menu `<div class="[position] menu">` inside a `<ui-menu>` / `<ui-item>` parent | `interactive` (a `<nav>`, no menubar roles or roving focus), `ui-select`, sub-menus behind translated or slotted parents |
| table     | `div.scroller` part around the slot (a focusable, named `role=region` while `scrolling` / `overflowing`), class grammar mirrored onto the slotted `<table>` (author classes kept, re-applied on `className` rewrites) | sorting (`ui-sort`, `aria-sort`, focusable headers, `client-sort`), data mode (`rows` / `columnDefs`:  nothing renders without a slotted `<table>`), translated `label` (English), later attribute changes (read once) |

Everywhere:  `aria-labelledby` / `aria-describedby` idrefs dangle (they can't cross the shadow boundary),
properties other than dropdown `value` / `options` are not read (only reflected attributes).

## Bytes

esbuild, minify, `target es2022`, gzip level 9.  "Net" excludes the lowered-decorator helpers (about 2046 min /
1188 gzip, shared once per bundle) and shared code (`$/util`, `$/vocabulary`, `ClassBuilder`, the family's
vocabulary), which the real element already ships.

| Piece                       | min (B) | gzip (B) | net gzip (B) |
| --------------------------- | ------: | -------: | -----------: |
| `NativeFallback` (base)     |    3976 |     1990 |          802 |
| button                      |    3553 |     1863 |          675 |
| dropdown                    |    4845 |     2434 |         1246 |
| icon                        |    2652 |     1510 |          322 |
| label                       |    2685 |     1492 |          304 |
| parts (all 13)              |    2885 |     1587 |          399 |
| divider                     |    2492 |     1414 |          226 |
| segment                     |    2429 |     1383 |          195 |
| container                   |    2365 |     1342 |          154 |

All eight families together:  about 3.5 kB net gzip plus the base (0.8 kB).  Bundled standalone with everything
it needs (base, `ClassBuilder`, `$/util`, vocabulary), button is 6.7 kB gzip and dropdown 8.3 kB.
