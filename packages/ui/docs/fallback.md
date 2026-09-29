# Native fallbacks

What a host shows when its real render throws (plan-shared-runtime.md, 3a).  Library-neutral:  plain DOM,
no Lit / Solid, so both spikes render the same thing.

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
  `ContainerFallback`, `DividerFallback` (each in `src/components/<name>/<name>.fallback.ts`) and
  `ContentPartFallback` (`parts.fallback.ts`, keyed by the host's tag).
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
