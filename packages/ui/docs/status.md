# Status

Checklist of every component in [`docs/plan.md`](plan.md), with what's done, in progress, deferred.  Kept up to date
as work lands ([AGENTS.md](../AGENTS.md)).  Last updated 2026-09-29.

## Working on now

- Nothing in progress.  **popup** and **modal** landed 2026-09-29 (working tree, not committed yet).

## Legend

✅ done · 🚧 in progress · ⬜ not started · 💤 deferred on purpose (see "Deferred") · — not applicable

- **Phase** = the plan's build order:  **A** foundation components, **B** views and remaining static
  components, **C** behaviour components.  Phase D (site, hardening, release) is its own table below.
- **Tests** = passing browser tests in the family folder (elements, CSS, fallback);  every family's element test runs
  axe on each `examples/elements/*.html`.
- **Size** = the family's OWN code, min + gzip kB (classes + CSS + vocabulary + fallback), from `yarn measure`;
  shared `core` (14.9 kB), `forms` (7.3 kB) and the base library are counted once per page, not here.
- **Keys** = keyboard walkthrough tests (the plan's "keyboard per APG");  "native" = the shadow markup is a native
  control (`<button>`, `<a>`) whose keyboard behaviour is the browser's.
- **Docs** = page on the Astro site (`site/src/content/components/`);  ✅ links to the page's source.
- **Visual** = screenshot tests, light + dark:  deferred (💤) for EVERY family to Phase D.

NOTE:  links are relative, so they work on GitHub and in VS Code.  In VS Code's Markdown preview, `.mdx` / source
links open in an editor tab;  `.md` links do too because `.vscode/settings.json` sets
`markdown.preview.openMarkdownLinks` to `inEditor`.

## Components

| Component | Phase | Tags | Status | Tests | Size | Keys | Docs | Visual | Notes |
|---|:-:|---|:-:|--:|--:|:-:|:-:|:-:|---|
| icon | A | `ui-icon`, `ui-icons` | ✅ | 47 | 5.72 | — | [✅](../site/src/content/components/icon.mdx) | 💤 | one ES module per glyph (FA7);  [`docs/icons.md`](icons.md) |
| button | A | `ui-button`, `ui-buttons`, `ui-or` | ✅ | 79 | 11.77 | native | [✅](../site/src/content/components/button.mdx) | 💤 | |
| label | A | `ui-label`, `ui-labels` | ✅ | 59 | 8.06 | — | [✅](../site/src/content/components/label.mdx) | 💤 | |
| content parts | A | `ui-content`, `ui-header`, `ui-description`, `ui-meta`, `ui-extra`, `ui-actions`, `ui-title`, `ui-summary`, `ui-date`, `ui-author`, `ui-avatar`, `ui-detail`, `ui-value` | ✅ | 99 | 14.41 | — | [✅](../site/src/content/components/parts.mdx) | 💤 | styled by owner context |
| divider | A | `ui-divider` | ✅ | 30 | 3.77 | — | [✅](../site/src/content/components/divider.mdx) | 💤 | |
| segment | A | `ui-segment`, `ui-segments` | ✅ | 56 | 7.19 | — | [✅](../site/src/content/components/segment.mdx) | 💤 | |
| container | A | `ui-container` | ✅ | 26 | 3.20 | — | [✅](../site/src/content/components/container.mdx) | 💤 | |
| grid | A | `ui-grid`, `ui-row`, `ui-column` | ✅ | 69 | 7.78 | — | ⬜ | 💤 | stackable / doubling by container query |
| image | A | `ui-image`, `ui-images` | ✅ | 49 | 5.48 | — | ⬜ | 💤 | |
| text | A | `ui-text` | ✅ | 32 | 2.70 | — | ⬜ | 💤 | |
| flag | A | `ui-flag` | ✅ | 38 | 6.05 | — | ⬜ | 💤 | |
| loader | A | `ui-loader` | ✅ | 37 | 4.21 | — | ⬜ | 💤 | |
| placeholder | A | `ui-placeholder` (+ `-header`, `-paragraph`, `-line`, `-image`) | ✅ | 40 | 5.82 | — | ⬜ | 💤 | |
| input | A | `ui-input`, `ui-textarea` | ✅ | 62 | 10.11 | ✅ | ⬜ | 💤 | form-associated |
| checkbox | A | `ui-checkbox`, `ui-radio` | ✅ | 54 | 9.11 | ✅ | ⬜ | 💤 | standard / radio / slider / toggle;  `checked` aliases `selected` |
| form | A | `ui-form`, `ui-field`, `ui-fields` | ✅ | 52 | 10.52 | ✅ | ⬜ | 💤 | Fomantic's validation rules |
| message | A | `ui-message` | ✅ | 50 | 5.60 | — | ⬜ | 💤 | |
| item | A | `ui-item` | ✅ | 31 | 4.77 | — | ⬜ | 💤 | ONE generic item for dropdown / list / menu (and the Items view);  `active` aliases `selected` |
| list | A | `ui-list` | ✅ | 75 | 6.75 | ✅ | ⬜ | 💤 | |
| table | A | `ui-table` | ✅ | 76 | 13.36 | ✅ | ⬜ | 💤 | native `<table>` in light DOM;  data mode (`rows`, `columnDefs`), sorting |
| menu | A | `ui-menu` | ✅ | 71 | 9.78 | ✅ | ⬜ | 💤 | `<nav>` by default, `interactive` menubar;  nested `ui-menu` = sub-menu |
| breadcrumb | A | `ui-breadcrumb`, `ui-breadcrumb-section` | ✅ | 36 | 4.99 | native | ⬜ | 💤 | |
| card | B | `ui-card`, `ui-cards` | ⬜ | | | | | | |
| items (view) | B | `ui-items` + the generic `ui-item` | ⬜ | | | | | | no second item tag (decided 2026-09-29) |
| feed | B | `ui-feed` | ⬜ | | | | | | |
| comment | B | `ui-comment`, `ui-comments` | ⬜ | | | | | | |
| statistic | B | `ui-statistic`, `ui-statistics` | ⬜ | | | | | | |
| step | B | `ui-step`, `ui-steps` | ⬜ | | | | | | |
| rail | B | `ui-rail` | ⬜ | | | | | | |
| reveal | B | `ui-reveal` | ⬜ | | | | | | |
| ad | B | `ui-ad` | ⬜ | | | | | | |
| emoji | B | `ui-emoji` | ⬜ | | | | | | |
| dropdown | C | `ui-dropdown` (+ `ui-item`) | ✅ | 60 | 16.27 | ✅ | [✅](../site/src/content/components/dropdown.mdx) | 💤 | built early, as the benchmark component |
| popup | C | `ui-popup`, `[data-tooltip]` | ✅ | 71 | 7.99 | ✅ | ⬜ | 💤 | popover host, CSS anchor positioning only (Fomantic's 8 positions + 4 of ours, flips);  `on` hover / focus / click / manual;  tooltip or non-modal dialog ARIA;  CSS-only tooltip in `native.css` |
| modal | C | `ui-modal`, `UI.modals.*` | ✅ | 61 | 8.41 | ✅ | ⬜ | 💤 | native `<dialog>` + `showModal()`, `::backdrop` dimmer;  `closedby`, approve / deny, `--show` invoker command;  `UI.modals.confirm/alert/prompt` |
| transition | C | `ui-transition` | ⬜ | | | | | | `UI.transitions` service exists |
| dimmer | C | `ui-dimmer` | ⬜ | | | | | | modal uses `<dialog>::backdrop` instead |
| select | C | `ui-select` | ⬜ | | | | | | customizable `<select>` + fallback |
| search | C | `ui-search` | ⬜ | | | | | | |
| flyout | C | `ui-flyout` | ⬜ | | | | | | |
| sidebar | C | `ui-sidebar`, `ui-pushable`, `ui-pusher` | ⬜ | | | | | | |
| accordion | C | `ui-accordion` | ⬜ | | | | | | |
| tab | C | `ui-tabs`, `ui-tab`, `ui-tab-pane` | ⬜ | | | | | | |
| progress | C | `ui-progress` | ⬜ | | | | | | |
| rating | C | `ui-rating` | ⬜ | | | | | | |
| slider | C | `ui-slider` | ⬜ | | | | | | |
| calendar | C | `ui-calendar` | ⬜ | | | | | | Temporal polyfill |
| toast | C | `ui-toast`, `UI.toast()` | ⬜ | | | | | | `UI.toasts` service stub exists |
| sticky | C | `ui-sticky` | ⬜ | | | | | | |
| embed | C | `ui-embed` | ⬜ | | | | | | |
| shape | C | `ui-shape` | ⬜ | | | | | | |
| nag | C | `ui-nag` | ⬜ | | | | | | |
| visibility | C | `ui-visibility`, `UI.observeVisibility()` | ⬜ | | | | | | |
| api | C | `UI.api` | ✅ | | | | ⬜ | — | runtime service;  no element |
| state | C | (behaviour util) | ⬜ | | | | | | |

## Foundation

| Piece | Status | Notes |
|---|:-:|---|
| `@spell/solid-element` fork | ✅ | 145 tests;  upgrade, forms, lifecycle, error boundary, HMR, event-target and slot-owner fixes |
| upstream PRs for the fork | 💤 | outlined in [`packages/solid-element/UPSTREAM.md`](../packages/solid-element/UPSTREAM.md);  nothing filed without Owen's go-ahead |
| element core (`core`, `forms` entries) | ✅ | 14.9 kB + 7.3 kB |
| `UI` runtime (lazy) | ✅ | 27.7 kB, budget < 50 kB;  [`docs/runtime.md`](runtime.md) |
| icons | ✅ | 20.5 kB lazy alias / name data;  [`docs/icons.md`](icons.md) |
| styles, tokens, utilities, themes | ✅ | OKLCH, `light-dark()`, contrast-picked foregrounds |
| native fallbacks | ✅ | every family;  [`docs/fallback.md`](fallback.md) |
| hot reload | ✅ | `yarn test:hmr` |
| framework hosts (vanilla, React, Vue, Solid 2) | ✅ | `yarn smoke`, 8 pages |
| SSR / declarative shadow DOM | ✅ | render only, no hydration |

## Phase D -- site, hardening, release

| Item | Status | Notes |
|---|:-:|---|
| docs pages | 🚧 | 8 of 24 families:  [button](../site/src/content/components/button.mdx), [container](../site/src/content/components/container.mdx), [divider](../site/src/content/components/divider.mdx), [dropdown](../site/src/content/components/dropdown.mdx), [icon](../site/src/content/components/icon.mdx), [label](../site/src/content/components/label.mdx), [parts](../site/src/content/components/parts.mdx), [segment](../site/src/content/components/segment.mdx) |
| theming guide | ✅ | [`site/src/pages/theming.mdx`](../site/src/pages/theming.mdx), [`docs/theming.md`](theming.md) |
| translation contract | ✅ | [`docs/translation.md`](translation.md) (design only) |
| kitchen sink | ⬜ | |
| visual tests + cross-browser baselines | 💤 | ALL families, deferred here (Owen, 2026-09-29) |
| cross-browser test runs (firefox, webkit) | ⬜ | `yarn test:all` exists, not in the routine |
| axe audit of every example | ✅ | runs in each family's element test |
| bundle-size report | ✅ | [`docs/report.md`](report.md) (`yarn report`) |
| README | ✅ | [`README.md`](../README.md) |
| CHANGELOG | ⬜ | |
| npm publish dry run | ⬜ | |

## Deferred

Decided or knowingly left for later;  each should be picked up where noted.

- **Visual (screenshot) tests** for every family, light and dark -- Phase D (Owen, 2026-09-29).
- **Custom-elements manifest:**  the plan's API tables were to come from one;  the site builds them from the
  vocabulary files instead ([`VocabularyTable.astro`](../site/src/components/VocabularyTable.astro)).  Revisit in
  Phase D if a manifest is wanted for editors.
- **Upstream PRs** for the fork -- outlined only, filed only on Owen's go-ahead.
- **Translated tag sets** (`<ie-tarjeta>`) -- designed ([`docs/translation.md`](translation.md)), not built.
- **Hydration** of server-rendered elements -- SSR renders; the client re-renders.
- **List / menu:**  other components inside items (labels, buttons, inputs), Fomantic's fixed-menu examples.
- **Table:**  virtualization of large data tables, `rowspan` when counting columns.
- **Dimmer as its own element** -- modal uses `<dialog>::backdrop` for now.
- **Popup:**  Fomantic settings with no element equivalent yet -- `exclusive`, `hideOnScroll`, `offset` /
  `distanceAway`, `lastResort`, `boundary`;  `hoverable: false` (hover popups are always hoverable, WCAG 1.4.13);
  touch-specific triggers;  show / hide METHODS on the host (`open` is the API);  an arrow that follows a flip in
  browsers without anchored container queries.
- **Modal:**  `allowMultiple: false` (modals always stack), `detachable`, `observeChanges`, `blurring` / inverted
  dimmers, `legacy`;  the close icon OUTSIDE the box (the dialog clips it);  `UI.modals.*` with custom buttons
  beyond ok / cancel;  a slotted `<ui-header>` pushing past the close icon (parts don't know about it).

## To review (Owen)

Built, but flagged for Owen's review before it's treated as settled.

- **Modal `closedby="any | closerequest | none"`** -- a new attribute name for Fomantic's `closable` dismissal
  setting (clicking the dimmer, Escape), borrowed from native `<dialog closedby>`;  `closable` now means only the
  close icon ([`docs/grammar.md`](grammar.md) "Modals").  Flagged 2026-09-30.
- **Modal `--show` / `--close` invoker commands** -- a native `<button commandfor="id" command="--show">` opens a
  modal with no JS.  Open questions:  `<ui-button>` doesn't forward `commandfor` / `command` to its inner
  `<button>` yet;  browsers older than invoker commands (in our targets:  Chrome 125-134) get a dead button, with
  no `UI.browser.supports` flag.  Flagged 2026-09-30.
- **Popup hover behaviour** -- a hover popup always stays open while the pointer is over it (WCAG 1.4.13:
  hoverable, dismissible with Escape, persistent);  Fomantic's default `hoverable: false` closed it when the
  pointer left the target, and there is no attribute to get that back.  Keep it always-on, or add an opt-out?
  ([`docs/grammar.md`](grammar.md) "Popups").  Flagged 2026-09-30.

## Budgets

- **Average component ≤ 4 kB gzip (plan) -- currently over:**  the families above average 7.7 kB own code.
  Gzipped separately, an average family is classes 3.1 kB, CSS 2.4 kB (a full port of Fomantic's variations),
  native fallback 1.7 kB, vocabulary 1.4 kB.  Not yet decided whether to raise the budget or trim.
- Lazy runtime chunk < 50 kB gzip -- 27.7 kB.
