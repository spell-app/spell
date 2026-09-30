# Icon data pipeline

`src/icons/` is the DATA layer for icons:  Font Awesome 7 Free's icon paths, plus enough alias vocabulary
that Fomantic's names (`setting`, `sign in`, `mail outline`, ...) keep working.  It has no UI of its own --
`ui-icon` (`src/components/icon/`, not built yet per `docs/plan.md`) will be the component that calls it.

## Regenerating

```sh
yarn gen:icons
```

`IconGenerator` (`scripts/gen-icons.ts`) does three things:

1. Downloads Font Awesome 7 Free's `metadata/icons.json` (~5 MB, from the `7.x` branch) to a cache OUTSIDE
   the repo (`$TMPDIR/spell-ui-fa7-icons.json` by default, override with `FA_METADATA_PATH`) -- it's large,
   third-party, and not ours to commit.
2. Reads (never writes) `reference/Fomantic-UI/src/themes/default/elements/icon.variables`, the read-only
   Fomantic clone's LESS source for its `@icon-map` family, to derive Fomantic's alias vocabulary.
3. Writes, after deleting `src/icons/glyphs/` (so a dropped icon doesn't linger):
   - `src/icons/glyphs/<style>/<name>.js`:  one ES module per free icon, `export default [width, height, "path"]`
   - `src/icons/data/{aliases,fomantic-aliases,fomantic-clashes,names,search}.json`:  compact JSON, no header
     (comments aren't valid JSON;  this file is the regeneration record)

Re-run it whenever Font Awesome ships new icons, or the Fomantic reference clone updates its icon variables.

**Generated files are COMMITTED**, like the JSON before them:  installs and CI need no network, and a diff shows
exactly which icons a Font Awesome upgrade added or redrew.  `.oxfmtrc.json` ignores `src/icons/data/**` and
`src/icons/glyphs/**`, so `yarn review` never reformats them.

## Output files and sizes

Measured at Font Awesome 7.3.1.

| Files | Count | Raw | Gzip | Loaded |
| --- | ---: | ---: | ---: | --- |
| `glyphs/solid/*.js` | 1,422 | 768 KB | - | lazy, one `import()` per icon drawn |
| `glyphs/regular/*.js` | 169 | 101 KB | - | same |
| `glyphs/brands/*.js` | 572 | 549 KB | - | same |
| **all glyphs** | **2,163** | **1,418 KB** (8.7 MB allocated on disk) | 478 KB as one stream, 770 KB per-file | |
| `data/names.json` (`{ solid, regular, brands }` name lists) | 1 | 28.6 KB | 9.2 KB | lazy, `Icons.#loadNames()` |
| `data/aliases.json` (FA7's own aliases) | 1 | 18.0 KB | 7.6 KB | lazy, `Icons.#loadAliases()` |
| `data/fomantic-aliases.json` | 1 | 20.3 KB | 9.5 KB | lazy, same |
| `data/fomantic-clashes.json` (opt-in, see "Clashes") | 1 | 0.6 KB | 0.6 KB | lazy, same |
| `data/search.json` (docs site only) | 1 | 93.9 KB | - | lazy, docs site only |

None of it is in the initial JS bundle.  What a page pays (gzip, HTTP/2, no aliases involved):

- `Icons` code 1.7 KB, `names.json` 9.2 KB, and ~0.2-0.6 KB per glyph:  **~11 KB for one icon, ~15 KB for ten**.
  (Before, one icon cost 26 KB and ten cost 358 KB:  see "Loading strategies".)
- A name that needs an alias (`setting`, `mail outline`, `cog`) also loads the three alias maps:  +~27 KB, once.
  `Icons.get()` skips them for an exact Font Awesome name (`user`, `github`), except under
  `<html ui-icon-names="fomantic">`, which can remap exact names.

### Why these data files

- `names.json`:  telling a bare `github` (brands) from `user` (solid) needs the name lists, `Icons.names(style)`
  feeds the docs icon browser, and it lets `get()` answer `undefined` for an unknown name WITHOUT a 404 request.
  It replaces the old 37 KB `solid.json` chunk index and the whole-style `regular.json` / `brands.json` loads.
- Alias maps are lazy for the same reason as before (`spike/lit/REPORT.md` "(j)" item 4):  a static import would
  land ~14 KB gzip of vocabulary in the eager chunk of every component that can render an icon.
- `search.json`:  solid-only `name -> search terms`, first 5 terms per icon (`SEARCH_TERMS_CAP`), 93.9 KB, just under
  the 100 KB budget.  Font Awesome's full terms are ~200 KB.  NOTE:  FA7 roughly doubled terms per icon, so new
  icons can push this over -- `buildSearchIndex()` then SKIPS the file and the generator says so (the docs
  site would fall back to name-only search).  `Icons.ts` never imports it.
- Removed with the chunked layout:  `solid.json`, `solid-*.json`, `regular.json`, `brands.json` and the generated
  `data/index.ts` (`CHUNK_LOADERS`, a literal-specifier map that existed only to stop Vite globbing `data/`).

## Loading

`Icons.get(name, style?)`:

1. Explicit `style` is trusted before aliasing (`("apple", "brands")` is the Apple logo).
2. Otherwise an exact Font Awesome name is looked up directly (solid, then brands).
3. Otherwise `resolve()` applies Fomantic and Font Awesome aliases, `outline`, and word reordering.
4. The result is checked against `names.json`, then `import()`s
   `new URL("glyphs/<style>/<name>.js", import.meta.url)`.

The URL is computed from the name, with `/* @vite-ignore */`:  there is NO name -> loader map.  A bundler
therefore neither inlines the glyphs nor emits 2,000 entries (verified with a `vite build` of `src/icons/index.ts`
alone:  the output is `index.js` 4.3 KB plus the four data chunks, no per-icon anything).  The module system is the
cache:  a URL evaluates once per page, even across two bundles that share the same `glyphs/`.  A failed import is
forgotten, so a later `get()` retries.

`Icons.register(name, data, style = "solid")` adds a glyph to the same cache without any request.

`Icons.glyphBase` (default `""`) overrides the directory, e.g. a CDN:  `Icons.glyphBase = "https://cdn.example.com/ui/glyphs/"`.

## Shipping icons

The glyph files must be served NEXT TO THE BUILT MODULE that contains `Icons`:  `glyphs/` beside the emitted chunk.

- **Library build (`@spell/ui`)**:  a tiny inline plugin in `vite.config.ts` emits `src/icons/glyphs/**` to
  `dist/glyphs/**` (see "Build change" below).  `Icons` ends up in `dist/index.js` or a chunk beside it, so
  `import.meta.url` resolves `dist/glyphs/`.  MUST NOT set `chunkFileNames` to a subdirectory without also
  setting `Icons.glyphBase`.
- **Consumer that bundles `@spell/ui`**:  the bundler moves `Icons` into the app's output, away from
  `node_modules/@spell/ui/dist/glyphs/`.  Copy that directory next to the app's chunks (a
  `vite-plugin-static-copy` rule, Rolldown `emitFile`, or a build step), or serve it anywhere and set
  `Icons.glyphBase`.  Every icon in `glyphs/` may be requested (runtime names), so ship the whole directory
  (1.4 MB raw, ~480 KB compressed), or...
- **Tree-shakable path for apps that use a few known icons**:  no `glyphs/` deployment at all.

  ```ts
  import { Icons } from "@spell/ui/icons"
  import user from "@spell/ui/icons/glyphs/solid/user.js"
  import github from "@spell/ui/icons/glyphs/brands/github.js"

  Icons.register("user", user)
  Icons.register("github", github, "brands")
  ```

  The bundler includes just those files (three icons ~1.2 KB of JS), and `peek()` / `get()` answer them
  synchronously / without a request.  TypeScript needs a declaration for the `.js` glyph modules:

  ```ts
  declare module "@spell/ui/icons/glyphs/*.js" {
    const data: readonly [width: number, height: number, path: string]
    export default data
  }
  ```

  (In this repo it is `src/icons/glyphs.d.ts`, for `$/icons/glyphs/*.js`.)
- **Dev / tests**:  Vite serves `src/icons/glyphs/` directly, so nothing is copied.
- **Cross-origin hosting** needs CORS (module scripts).
- Package exports (`package.json`) should map `"./icons/glyphs/*": "./dist/glyphs/*"` so the static-import path
  works.

### Build change (`vite.config.ts`)

```ts
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"

/** Copies `src/icons/glyphs/**` to `dist/glyphs/**`, next to the chunks, where `Icons` looks via `import.meta.url`. */
function emitGlyphs(): Plugin {
  const root = fileURLToPath(new URL("./src/icons/glyphs", import.meta.url))
  return {
    name: "spell-emit-glyphs",
    apply: "build",
    generateBundle() {
      for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith(".js")) continue
        const file = path.join(entry.parentPath, entry.name)
        this.emitFile({ type: "asset", fileName: `glyphs/${path.relative(root, file)}`, source: readFileSync(file) })
      }
    }
  }
}
// plugins: [standardDecorators(), emitGlyphs(), dts(...)]
```

Verified in a scratch lib build of `src/icons/index.ts`:  2,163 files in `dist/glyphs/`, `Icons` reads
`new URL(`glyphs/${r}.js`, e.glyphBase || e.#_)` with no per-icon map.

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
     `remove`/`delete`/`close` -> `xmark`, `checkmark` -> `check`, `dropdown` -> `caret-down`, ...).
     27 of these CLASH with a Font Awesome name and live in `fomantic-clashes.json` instead -- see "Clashes".
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

### Clashes:  Font Awesome wins, Fomantic is opt-in

DECISION (2026-09-29):  Font Awesome names are canonical and win a clash.  A CLASH is a Fomantic name
whose dashed form is ALREADY a Font Awesome name or alias for a DIFFERENT icon -- 27 of them at FA 7.3.1:

| Typed | Font Awesome (default) | Fomantic (opt-in) |
| --- | --- | --- |
| `x` | `x` (the letter) | `xmark` (close) |
| `warning` | `triangle-exclamation` | `exclamation` |
| `sign in` / `sign out` | `arrow-right-to-bracket` / `arrow-right-from-bracket` | `right-to-bracket` / `right-from-bracket` |
| `desktop`, `computer` | `desktop`, `computer` | `display` |
| `apple`, `zoom` | the brand logos | `apple-whole`, `magnifying-glass-plus` |
| ... | | |

(full list:  the generator prints it;  the data is `fomantic-clashes.json`)

- `gen-icons.ts` writes the clashes to `fomantic-clashes.json` and leaves them OUT of `fomantic-aliases.json`.
- A page opts into Fomantic's meaning with `<html ui-icon-names="fomantic">` (`ICON_NAMES_ATTRIBUTE`,
  read as `Icons.preferredNames`).  Any other value, or none, means Font Awesome.
  - An attribute rather than a JS setting:  it's there before any script runs, and survives SSR.
  - Read on EVERY lookup, so flipping it affects later lookups only -- icons already drawn keep their meaning.
  - One choice per page;  anyone needing a particular icon can always use an unambiguous name (`xmark`).
- Why Font Awesome by default:  it's the vocabulary people search for, and ~26% of FA7 icons (570 of
  2,163) have NO Fomantic name at all, so FA names have to work regardless.
- `Icons.test.ts` checks EVERY FA7 name and alias resolves to Font Awesome's own target by default.

### Spaces ~== dashes

`Icons.resolve()` splits on spaces AND dashes, so `tablet button` ~== `tablet-button`, and `sign-in`
~== `sign in` (the same clash rule applies to both spellings).  No Fomantic name contains a dash and no
FA7 name ends in `-outline`, so neither spelling can be misread.

### Word order, as a last resort

DECISION (2026-09-29):  a name found nowhere is tried with its words in ANY order, when those words name
exactly one icon -- `button tablet` -> `tablet-button`.  Why:  Fomantic reads thing-first (`check circle`,
`arrow circle down`) where FA6+ reads modifier-first (`circle-check`, `circle-arrow-down`), so this lets
Fomantic-style phrasing reach the 570 FA7 icons Fomantic never named.

- LAST resort:  an exact name, Fomantic alias or FA alias always wins over a reordering.
- Ambiguous word sets stay as typed and find nothing, rather than silently picking one -- 8 at FA 7.3.1:
  `arrow-{up,down}-{a-z,z-a,1-9,9-1,wide-short,short-wide}`, `left-right` / `right-left`, and
  `martini-glass` / `glass-martini` (an FA alias for `martini-glass-empty`).
- Index built on first use from the solid index (already loaded to infer style) + `aliases.json`.  No new
  data file.
  - covers solid + regular:  every regular icon also exists in solid
  - covers brands only through FA's aliases (`github square` -> `square-github`);  the full brand list is
    the 560 KB `brands.json`, too big to load just for this
  - `Icons.test.ts` checks no real brand name is ever redirected
- `peek()` reorders only once the solid index is loaded -- before that it has nothing to reorder against.

`Icons.resolve()`'s order: split on spaces / dashes -> strip a trailing `outline` word (Fomantic's
regular-style modifier, no separate alias needed) -> `fomantic-clashes.json` (only when the page opts in)
-> `fomantic-aliases.json` -> `aliases.json` -> the dashed name, if the solid index knows it -> the one
icon its words name in any order -> else the dashed name as typed.  A name found nowhere still resolves
(best-effort `style: "solid"` or `"brands"`), so `get()` simply returns `undefined` rather than
`resolve()` throwing.

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
  icon is already loaded or `register()`ed (e.g. after `Icons.preload()` from a parent list).
- `name` is Fomantic-or-FA7 vocabulary either way -- the component never needs to know which; that's
  exactly what `Icons.resolve()` is for.
- `Icons.svgString()` is there for a component that builds its shadow root from one big template literal
  instead of DOM APIs -- not needed if `ui-icon` uses `svg()` directly, as sketched above.

## Loading strategies

Historical record of WHY the layout above was chosen.  "Today" / candidate 1 below is the PREVIOUS chunked-JSON
layout (removed);  candidate 2 is what `src/icons/` now does.

Experiment behind this section:  `spike/icons/`, removed from the tree;  restore it with
`git checkout archive/spikes -- spike/icons` (`yarn build`, `yarn measure`, `yarn test` there;  raw numbers in
`spike/icons/results.json`).  Measured 2026-09-29 with Font Awesome Free
**7.3.1** (`@fortawesome/fontawesome-free@7.3.1`, which DOES ship `svgs/{solid,regular,brands}/*.svg`), Chromium
153 headless via Playwright 1.63, a local static server with gzip on.

### Candidates

1. **Today**:  `Icons.get()` from `$/icons`, 23 chunked JS files Vite emits from the JSON.
2. **One ES module per icon**:  `icons/<style>/<name>.js` = `export default [w, h, "path"]`, generated from the same
   metadata `scripts/gen-icons.ts` uses;  the loader computes the URL from the canonical name.
3. **One SVG file per icon**, the npm package's files untouched:
   - **3a**:  `mask-image: url(...)` + `background: currentColor` on an inner `<span class="glyph">`, no JS but
     setting `--x-icon`.
   - **3b**:  `fetch()` + inline `<svg>` with an in-memory cache.

Each is a small `x-icon-<variant>` element with an open shadow root and the `ui-icon` markup contract
(`<span class="ui icon" part="icon">`, accessible name on the host via `ElementInternals`).  The page draws the
first N of a fixed list of 50 distinct icons (2 brands and 2 regular among the first 10), as markup.

### Method

- **Cold**:  fresh browser context, CDP cache disabled, server sends `no-store`.  **Warm**:  same context loads the
  page once, then again with immutable caching (so "warm" ~== an in-session revisit, partly served by Chromium's
  memory cache).
- Median of 5 loads per cell.  Bytes = sum of CDP `encodedDataLength` (headers + gzip body);  requests = what the
  browser sent, incl. the page itself, the element bundle and its shared chunk (the `0 icons` rows are that
  baseline, 3 requests).
- Time in ms from navigation start.  "First / all icons" = two frames after the first / last icon was ready.
  NOTE: the mask variant has no load event, so its "ready" is the Resource Timing `responseEnd` of the file
  (an approximation).
- Network profiles:  `h2 + 40 ms RTT, 20 Mbit/s` (below, the realistic one), `h1 + 40 ms` (6 connections per
  host), and unthrottled loopback for both (in `results.json`;  everything paints in ~40 ms there, so it only
  confirms the request and byte counts).

### Bytes, requests and time (HTTP/2, 40 ms, 20 Mbit/s)

| Candidate | Icons | Requests | KB (gzip, wire) | First icon ms | All icons ms | Warm: all icons ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1. today (chunked JS) | 0 (page only) | 3 | 3.6 | - | - | - |
|  | 1 | 5 | 26.4 | 294 | 294 | 92 |
|  | 10 | 12 | 357.8 | 263 | 382 | 88 |
|  | 50 | 21 | 485.2 | 257 | 441 | 91 |
| 2. ES module per icon | 0 (page only) | 3 | 1.9 | - | - | - |
|  | 1 | 4 | 2.2 | 228 | 228 | 88 |
|  | 10 | 13 | 5.0 | 234 | 236 | 91 |
|  | 50 | 53 | 15.4 | 237 | 263 | 93 |
| 3a. SVG as CSS mask | 0 (page only) | 3 | 2.2 | - | - | - |
|  | 1 | 4 | 2.6 | 205 | 205 | 89 |
|  | 10 | 13 | 7.2 | 221 | 221 | 88 |
|  | 50 | 53 | 24.9 | 213 | 254 | 95 |
| 3b. SVG fetch + inline | 0 (page only) | 3 | 2.0 | - | - | - |
|  | 1 | 4 | 2.5 | 220 | 220 | 87 |
|  | 10 | 13 | 7.0 | 239 | 239 | 91 |
|  | 50 | 53 | 24.8 | 220 | 254 | 91 |

### Same, HTTP/1.1 (40 ms):  time until all icons are painted

| Candidate | 10 icons: all ms | 50 icons: all ms | 50 icons: KB |
| --- | ---: | ---: | ---: |
| 1. today (chunked JS) | 371 | 447 | 489.1 |
| 2. ES module per icon | 267 | 603 | 25.8 |
| 3a. SVG as CSS mask | 257 | 621 | 34.5 |
| 3b. SVG fetch + inline | 269 | 622 | 34.3 |

Warm runs cost one request (the page) for every candidate:  all four are equally fast once cached.

### On disk

| Asset set | Files | Raw KB | Sum of per-file gzip KB | Allocated on disk KB | Loader code (gzip B) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1. today (`data` chunks) | 23 | 1556.5 | 512.6 | 1620.0 | 2048 |
| 2. ES modules | 2163 | 1418.2 | 713.2 | 8712.0 | 285 |
| 3. SVG files as shipped (incl. alias copies) | 2883 | 2591.4 | 1452.0 | 11600.0 | 564 |
| 3. SVG files, canonical names only | 2163 | 2016.0 | 1121.4 | 8720.0 | 403 |

- The npm package ships **alias copies** (`ad.svg`, `add.svg`, ... 720 extra files):  FA aliases already resolve by
  file name for candidate 3;  Fomantic's aliases still need `Icons.resolve()`.
- "Allocated" counts whole 4 KB blocks:  ~2,000 tiny files take 4-6x their payload on disk (matters for
  `node_modules`, Docker layers, not for transfer).

### Two bundles on one page

Two separately built apps (`/a/`, `/b/`), each drawing the same 10 icons, cold, HTTP/2:

| Candidate | Requests: 1 bundle | Requests: 2 bundles | KB: 1 bundle | KB: 2 bundles | Same URL fetched twice? |
| --- | ---: | ---: | ---: | ---: | --- |
| 1. today (chunked JS) | 12 | 23 | 357.8 | 715.1 | no |
| 2. ES module per icon | 13 | 15 | 5.0 | 6.4 | no |
| 3a. SVG as CSS mask | 13 | 15 | 7.2 | 8.9 | no |
| 3b. SVG fetch + inline | 13 | 25 | 7.0 | 13.5 | yes, 10 icons |

- `today`:  each bundle has its own chunk URLs, so the ~350 KB is fetched twice.
- Candidates 2 and 3a share by URL (module map, image cache) as long as both use the SAME base URL for the icon
  files;  a bundler that copies icons next to each app breaks that.
- 3b's in-memory cache is per bundle;  only a warm HTTP cache dedupes it.

### Qualitative checks

| | 1. today | 2. ES module | 3a. mask | 3b. fetch + inline |
| --- | --- | --- | --- | --- |
| Shadow root, light + dark `color-scheme`, glyph = `currentColor` (`yarn test`, 50 icons) | pass | pass | pass | pass |
| `ui-icon` markup contract | `<svg>` | `<svg>` | needs an inner element (the mask would also clip the root's `circular` / `bordered` / `inverted` background);  `> svg` rules retargeted | `<svg>` (the file's own `<!--! -->` comment comes along) |
| Bundler includes only the icons an app names | no:  all 23 chunks are emitted | yes:  static `import user from ".../user.js"` tree-shakes to the named paths (3 icons = ~1.2 KB of JS) | yes, via `?url` (3 icons = 3 files, or `data:` URIs under 4 KB) | same as 3a |
| Runtime names (`name="..."`) in a bundled app | all chunks bundled | URL is invisible to the bundler:  copy the whole set, or import named icons statically | same | same |
| Works with JS off / in SSR output | no | no | yes (plain CSS + image request) | no |
| Cross-origin hosting | n/a (same bundle) | needs CORS (module scripts) | needs CORS for `mask-image` | needs CORS for `fetch` |
| Needs a `variant` / name index | solid index (37.5 KB raw) to guess solid vs brands | needs the style;  a bare `github` needs a small names list or a 404 retry | same | same |

- Not tested here:  `forced-colors` (Windows high contrast) turns `background` into a system colour, so the mask
  glyph would very likely render as a box or vanish;  an `<svg>` with `fill: currentColor` keeps working.

### Licence

- Font Awesome Free icons are **CC BY 4.0**, which requires attribution.  Every one of the 2,883 shipped SVGs
  carries a comment:  `<!--! Font Awesome Free 7.3.1 by @fontawesome - https://fontawesome.com License -
  https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License) Copyright 2026
  Fonticons, Inc. -->` (211 bytes each, ~0.6 MB in total;  25% of the per-file-gzipped SVG set:  1,452 KB with,
  1,083 KB without).
- The package's `LICENSE.txt` says the embedded comments are sufficient attribution and that they "ask that you do
  not actively work to remove them from files".  That is a request, not a licence condition:  CC BY needs
  attribution reasonable to the medium (a notice in the package / an about page), which `src/icons/LICENSE.md`
  already is for the JSON data.  Not legal advice.
- Candidate 3 keeps the comments (we would ship the files as they are).  Candidates 1 and 2 have no per-file
  comment (generated from metadata):  attribution rests on `LICENSE.md`, same as today.

### Recommendation

**Status (2026-09-29):  adopted and implemented** -- see "Loading" and "Shipping icons" above.  The delivery form chosen was
the computed URL (last bullet below), not a template `import()`.  Below is the recommendation as written.

**Adopt candidate 2, one ES module per icon**, behind the existing `Icons` API (`get`, `peek`, `resolve`, `svg`,
`svgString` unchanged;  the lazy alias maps stay).

- Transfer:  10 icons incl. a brand logo cost 5 KB instead of 358 KB, and a page with one icon is 2.2 KB instead of 26.4 KB
  (today needs the 37 KB solid index, THEN the chunk:  two sequential round trips before the first icon).  The
  price is one request per icon (53 vs 21 for 50 icons):  free on HTTP/2 (263 ms vs 441 ms for 50), but
  1.35x slower than today on HTTP/1.1 (603 vs 447 ms) when a page draws 50 distinct icons at once.
- Only candidate that lets an app bundle exactly the icons it names (static imports tree-shake), shares by URL
  across two bundles, and keeps the `<svg>` contract and the `currentColor` behaviour unchanged.
- Candidate 3a is the pick only if icons MUST show without JS (SSR / static HTML):  zero-JS and simplest, but
  1.6x the bytes of 2, an inner-element contract change, and the `forced-colors` risk.  3b has no advantage over 2.
- Migration effort for `src/icons/` (about a day, no component changes):
  - `scripts/gen-icons.ts`:  replace chunk packing (`MAX_CHUNK_BYTES`, `solid.json`, `CHUNK_LOADERS` index) with
    one `<style>/<name>.js` per icon, plus a names list (docs icon browser, solid-vs-brands guess);  ~60 lines.
  - `Icons.ts`:  `#loadChunk` / `#loadSolidIndex` / `#lookup` become a per-name `import()` cache (`peek()` keeps
    reading a plain `Map`);  ~80 lines.
  - Decide the delivery form:  a template `import(`./icons/${style}/${name}.js`)` (Vite emits one lazy chunk per
    icon, 2,163 small files in `dist/`, like today's chunks it is all-or-nothing for app bundlers), or a URL
    computed against a configurable base like this experiment (files copied by the app, shared across bundles).
  - `Icons.test.ts` and this document.
