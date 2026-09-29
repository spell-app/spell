# Icon data pipeline

`src/icons/` is the DATA layer for icons:  Font Awesome 7 Free's icon paths, plus enough alias vocabulary
that Fomantic's names (`setting`, `sign in`, `mail outline`, ...) keep working. It has no UI of its own --
`ui-icon` (`src/components/icon/`, not built yet per `docs/plan.md`) will be the component that calls it.

## Regenerating

```sh
yarn tsx scripts/gen-icons.ts
```

`IconGenerator` (`scripts/gen-icons.ts`) does three things:

1. Downloads Font Awesome 7 Free's `metadata/icons.json` (~5 MB, from the `7.x` branch) to a cache OUTSIDE
   the repo (`$TMPDIR/spell-ui-fa7-icons.json` by default, override with `FA_METADATA_PATH`) -- it's large,
   third-party, and not ours to commit.
2. Reads (never writes) `reference/Fomantic-UI/src/themes/default/elements/icon.variables`, the read-only
   Fomantic clone's LESS source for its `@icon-map` family, to derive Fomantic's alias vocabulary.
3. Writes every file under `src/icons/data/` as compact (no whitespace) JSON -- generated data, so no
   header comment; this file is the regeneration record instead.

Re-run it whenever Font Awesome ships new icons, or the Fomantic reference clone updates its icon variables.

## Output files and sizes

Sizes below are what ships:  `.oxfmtrc.json` ignores `src/icons/data/`, so the compact JSON
`gen-icons.ts` writes is final.  Measured at Font Awesome 7.3.1.

| File | Bytes | Loaded |
| --- | ---: | --- |
| `solid.json` (index: name -> chunk) | 37,535 | lazy, dynamic `import()` |
| `solid-0-b.json` .. `solid-w-z.json` (16 chunks) | 8.0–50.8 KB each | lazy, one chunk per lookup |
| `regular.json` | 103,625 | lazy |
| `brands.json` | 560,557 | lazy |
| `aliases.json` (FA7's own aliases) | 18,383 | **static** import |
| `fomantic-aliases.json` | 21,379 | **static** import |
| `search.json` (docs site only) | 96,204 | lazy, docs site only |

Total `src/icons/data/`: ~1.6 MB, none of it in the initial JS bundle except the two small alias maps
(~39.8 KB combined -- see "The 40 KB line" below).

### A papercut: oxfmt reformats generated JSON

**Resolved:**  `.oxfmtrc.json` now lists `src/icons/data/**` in `ignorePatterns`, so none of this happens
any more.  The budgets below still carry the margin it needed -- kept so chunk file names don't churn.
History, as first written:

`.oxfmtrc.json`'s `ignorePatterns` doesn't exclude `src/icons/data/` (and isn't this pipeline's to edit --
outside the file scope for this work), so `yarn format` / `yarn review` pretty-prints every file in there
same as source. For a `[width, height, path]` tuple, the long `path` string forces the array past the
120-column print width, so oxfmt explodes it across 5 lines -- about +22 bytes/icon. For a flat
`name -> alias` map it's cheaper per entry but there are more entries, landing at a similar +12-15%
overall. Logged in `PAPERCUTS.md`. Two consequences `gen-icons.ts` accounts for:

- `MAX_CHUNK_BYTES` (52 KB, of the COMPACT write) is well under the 60 KB target specifically so the chunk
  still fits once oxfmt reformats it -- see its docstring in `gen-icons.ts`.
- `SEARCH_TERMS_CAP` (5 terms/icon, not 6) is similarly tuned against the POST-format size, not the
  compact one `buildSearchIndex()` first measures.

If `gen-icons.ts` is ever run standalone (skipping `yarn review`), the on-disk files will be a few percent
SMALLER (compact) than the table above until the next full `yarn review` reformats them -- still correct,
just under-budget rather than at it.

### Chunking `solid.json`

~1,420 free solid icons average ~550 bytes each (compact) as a `[width, height, path]` tuple -- the brief's
"~200 icons per chunk" would put a chunk at ~120 KB, well over its own "~60 KB" cap, so `IconGenerator`
packs by BYTE SIZE instead, in alphabetical order, landing at ~80-105 icons/chunk (16 chunks). Several
single letters (`b`, `c`, `f`, `h`, `p`, `s`, `t`) hold more than one chunk's worth of icons alone, so a
chunk boundary sometimes falls mid-letter -- its file name then uses a 2-character prefix
(`solid-ba-bu.json`) instead of 1 (`solid-b-c.json`). **The file name is only a human-readable hint** --
the actual name -> chunk routing is `solid.json`, never parsed from the file name. Re-running the
generator can shift these boundaries (Font Awesome adds icons over time), which renames some chunk files;
`IconGenerator.removeStaleChunks()` deletes whichever `solid-*.json` files from the PREVIOUS run are no
longer in the new chunk set, so old boundaries don't linger on disk unreferenced.

### The 40 KB "static import" line

The brief suggested keeping `solid.json` + `aliases.json` + `fomantic-aliases.json` + regular's names as
static imports if their combined size is under 40 KB. In practice:

- `regular.json` and `brands.json` are NOT "small" the way the brief assumed -- 104 KB and 561 KB. They're
  lazy like every solid chunk, same as the brief's own "dynamic `import()`, Vite code-splits JSON" mechanism
  already implies for any per-style file.
- `aliases.json` + `fomantic-aliases.json` alone are ~39.8 KB -- just under the 40 KB line (they were
  ~44.6 KB, over it, while oxfmt still reformatted them).  `Icons.ts` imports them statically either way:
  they're the only two files it
  ever bundles, `Icons.resolve()` needs them for the common case (alias lookup, `outline` word) to stay
  synchronous, and lazy-loading two ~20 KB lookup maps just to shave the total under an approximate 40 KB
  guideline would make every icon resolution async for no real benefit.
- `solid.json` (37.5 KB) is NOT bundled statically, even though grouping it with the two alias maps was
  what the brief's "under 40 KB together" had in mind. It's used for two things, both already inside
  `get()`'s async path: routing a solid-style lookup to its chunk, and (in `resolve()`) telling a bare,
  style-less name apart from a brands-only one. Neither needs to be synchronous, so there was no reason to
  force it into the initial bundle.

Net effect: `Icons.resolve()` and `Icons.names()` are `async` (see `Icons.ts`'s docstrings for why), and
`Icons.peek()` is the fully-synchronous, cache-only escape hatch for a caller (e.g. a render function) that
can't await -- it answers from whatever a previous `get()` / `preload()` already loaded, `undefined` otherwise.

### `search.json`

Solid-only, for a future docs-site icon search. Font Awesome's full `search.terms` for every free solid
icon comes to 200,774 bytes compact -- double the 100 KB budget -- so `IconGenerator` caps each icon at
its first 5 terms (`SEARCH_TERMS_CAP`), landing at 96,204 bytes, just under 100 KB.  NOTE:  FA7 roughly
doubled the terms per icon, so new icons can push this over -- `buildSearchIndex()` then SKIPS the file
and the generator reports it. `Icons.ts` never imports this file: it exists for the docs site build only.

## Alias strategy

**Font Awesome 7 names are canonical.** Everything else is an alias resolved down to one:

1. `aliases.json` -- Font Awesome's OWN alternate names for an icon it renamed or merged
   (`cog` -> `gear`, `times` -> `xmark`, `contact-book` -> `address-book`, ...). Straight from
   `icons.json`'s `aliases.names` field, free icons only.
2. `fomantic-aliases.json` -- Fomantic-UI's class-name vocabulary, where it differs from the FA7 name.
   Derived from `reference/Fomantic-UI/src/themes/default/elements/icon.variables`'s `@icon-map`,
   `@icon-aliases-map`, `@icon-deprecated-map`, `@icon-outline-map` (+ its aliases), `@icon-brand-map`
   (+ its aliases) -- 1,789 Fomantic class names total (`_` -> space, e.g. `address_book` -> `"address book"`).
   Matched to a canonical name by UNICODE CODEPOINT: Fomantic's LESS still points at Font Awesome 5's
   private-use codepoints, which usually still identify the same icon in FA7's `unicode` metadata field,
   or in `aliases.unicodes.primary` -- where FA7 keeps the codepoints of icons it MERGED into another
   (`user alternate` -> `user`, since FA7 folded `user-large` into `user`;  same for `user alternate slash`,
   `headphones alternate`, `handshake alternate slash`).
   - **1,058 already matched their FA7 name exactly** (`"caret down"` -> `caret-down`) -- no alias entry
     needed; `Icons.resolve()`'s kebab-case fallback already gets these right.
   - **729 needed an alias entry** (`setting` -> `gear`, `settings` -> `gears`, `mail` -> `envelope`,
     `remove`/`delete`/`close` -> `xmark`, `checkmark` -> `check`, `dropdown` -> `caret-down`,
     `sign in` -> `right-to-bracket`, `sign out` -> `right-from-bracket`, ...).
   - **21 resolved via `MANUAL_OVERRIDES`** in `gen-icons.ts`.  20 because FA6 reassigned their codepoint entirely,
     most often onto the plain ASCII character for a "keyboard symbol" icon (`plus` is now literally `"+"`,
     `question` is `"?"`), so the old FA5 codepoint doesn't appear anywhere in FA6+ metadata. Each entry
     was checked by hand against `icons.json` (`add` -> `plus`, `dollar`/`usd` -> `dollar-sign`,
     `help` -> `question`, `warning` -> `exclamation`, `desktop`/`computer` -> `display`,
     `dashboard`/`tachometer_alternate` -> `gauge`, `cloud_download(_alternate)` -> `cloud-arrow-down`,
     `cloud_upload(_alternate)` -> `cloud-arrow-up`, `hospital_alternate` -> `hospital`,
     `medium_m` -> `medium`, `slack_hash` -> `slack`, `snapchat_ghost` -> `snapchat`,
     `telegram_plane` -> `telegram`, `font_awesome_flag` -> `font-awesome`, `percentage` -> `percent`).
     The 21st is a STAND-IN, not a rename:  FA7 Free dropped `vector-square` entirely, so
     `vector_square` -> `object-group` (chosen by hand;  `draw-square` would be closer but is Pro-only).
   - **0 need the kebab-case name fallback** any more.  Under FA6 11 did:  the "keyboard symbol" icons
     (`asterisk`, `at`, `equals`, `greater-than`, `hashtag`, `less-than`, ...) whose glyph FA6 moved onto
     the literal ASCII character.  FA7 lists their old codepoints in `aliases.unicodes.primary`, so they
     now match by codepoint -- to the same names, and still with no alias entry written.
   - **2 stayed unresolved**: `"acquisitions incorporated"` (`\f6af`) and `"penny arcade"` (`\f704`) --
     both brand icons Font Awesome Free (6 and 7) no longer ships at all (checked directly: no free icon in
     `icons.json` carries either codepoint or a plausibly-renamed name). No entry was invented for these;
     a caller using either Fomantic name gets `undefined` back from `get()`, same as any unknown name.

`Icons.resolve()`'s order: strip a trailing `outline` word (Fomantic's regular-style modifier, no separate
alias needed) -> `fomantic-aliases.json` -> `aliases.json` -> else treat the kebab-cased name as already
correct. A name found nowhere still resolves (best-effort `style: "solid"` or `"brands"`), so `get()`
simply returns `undefined` rather than `resolve()` throwing.

## License attribution

See `src/icons/LICENSE.md` for the full text. Summary: 
- Icon DATA is [Font Awesome 7 Free](https://fontawesome.com)
  - CC BY 4.0 icons, MIT code 
  - no font files are redistributed, only path data.
- The alias-name MAPPING in `fomantic-aliases.json` is derived from [Fomantic-UI](https://github.com/fomantic/Fomantic-UI) 
  - MIT
  - original file which is never itself copied or redistributed.

## How `ui-icon` will consume this

Sketch (component doesn't exist yet -- `docs/plan.md`'s milestone list has it under `elements/icon`):

```ts
// src/components/icon/icon.ts (future)
import { Icons } from "$/icons"

class UIIcon extends E.UIElement {
  async connectedCallback() {
    super.connectedCallback()
    const data = await Icons.get(this.name, this.style) // vocabulary-driven `name` / `style` attributes
    if (data) this.shadowRoot!.replaceChildren(Icons.svg(data, { label: this.label }))
  }
}
```

Key points for that component:

- First paint shouldn't need to await anything (per `AGENTS.md`'s "first paint MUST NOT need a rich
  property" rule) -- `ui-icon` should render nothing or a sized placeholder synchronously, then swap in the
  real `<svg>` once `Icons.get()` resolves. `Icons.peek()` lets it skip the placeholder entirely when the
  icon's chunk is already warm (e.g. after `Icons.preload()` from a parent list).
- `name` is Fomantic-or-FA7 vocabulary either way -- the component never needs to know which; that's
  exactly what `Icons.resolve()` is for.
- `Icons.svgString()` is there for a component that builds its shadow root from one big template literal
  instead of DOM APIs -- not needed if `ui-icon` uses `svg()` directly, as sketched above.
