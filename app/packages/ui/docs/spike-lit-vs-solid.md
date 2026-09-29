# Milestone 0: Lit vs Solid, side by side

Both spikes built the same `ui-button` (+ `ui-buttons`, `ui-or`) and `ui-dropdown` (+ `ui-item`) on the same foundation (`src/`), the same CSS, the same vocabularies, the same tests and demo pages. Full reports: `spike/lit/REPORT.md`, `spike/solid/REPORT.md`. Measured 2026-09-29.

## Numbers

| Criterion | Lit 3.3.3 | `@solidjs/element` 2.0.0-rc.11 |
|---|---|---|
| `ui-button` alone, gzip, excl. runtime + icon data | **27.3 KB** | 47.7 KB |
| `ui-button` + `ui-dropdown`, gzip | **47.9 KB** | 70.1 KB |
| Library runtime inside that | 6–7 KB | 24.2 KB |
| Per keystroke, 1000 options (avg / max) | **0.78 / 4.8 ms** | 1.6 / 4.3 ms (1.3 / 3.9 prod) |
| First open, 1000 rows | **12.6 ms** | 16–17 ms |
| Tests | 57 pass | 79 pass |
| Element core LOC (base classes) | ~740 | ~1180 |
| Dropdown LOC | 746 | 811 + 126 |
| Frameworks (vanilla, React 19, Vue 3, Solid 1.9) | all pass | all pass |
| Forms (`formAssociated`, `setValidity`, reset, fieldset) | no friction | works, but only by bypassing `customElement()` (~40 LOC re-implementing its registration) |
| `delegatesFocus`, ElementInternals | native options | hand-rolled in a host base class |
| SSR / Declarative Shadow DOM | real: `@lit-labs/ssr` renders DSD; 3 one-line guards | DIY: `renderToString` against a stub host; re-renders on upgrade, no hydration |
| Translation hook (`ie-boton`, `rojo`→`red`, `ie-cambio`) | works (5-line subclass) | works (second definition) |
| Duplicate runtime on one page | works; dev-only warning | Solid 1.9 host works; Solid 2 host untested |
| Error isolation | per element | **one uncaught error halts every Solid element on the page** |
| Dev-server perf | as prod | ~5× slower than prod (diagnostics + performance tracks) |
| Attribute parsing quirks | none (`useDefault` caveat with `undefined` starts) | `component-register` parses bare booleans as false, reflects `"true"`, drops pre-upgrade properties — all worked around |
| Dependency status | stable; SSR is a Labs package | 12 RCs in 7 weeks; README is the 1.x one; `component-register` single-maintainer, last release 2025-09 |

Both spikes needed the same platform workarounds (submit-button form value trick, disabled `role=option` for "no results", host `aria-label` forwarding), so those are not library differences.

## Reading

- **Size.** Solid's reactive core + web runtime + element layer is 24 KB gzip against Lit's 6 KB. That difference alone is larger than the whole `ui-button` on Lit. Solid's fine-grained model did not buy a smaller output, because our components are class-driven (`ClassBuilder` over the whole vocabulary) rather than deep signal graphs.
- **Speed.** Both are far under 16 ms per keystroke; Lit was faster on this workload. Fine-grained reactivity is not the bottleneck; keyed row diffing is, and both do it.
- **Fit with the conventions.** Lit is class-based; `UIElement.for(vocabulary)` derives typed properties from the vocabulary in one line and standard decorators plus `@proto` just work. Solid's unit is a render function, so the spike wrapped it in a controller class and then hit two Solid 2 rules (eager memos, no writes in owned scopes) that fight class inheritance and constructor initialisation.
- **Platform integration.** Everything we lean on (formAssociated, ElementInternals, `delegatesFocus`, upgrade backstop, SSR) is native to Lit and had to be re-implemented around `component-register` for Solid.
- **Failure mode.** A library that ships ~50 components cannot accept "one bug in any element freezes all of them on the page". This is the single strongest reason.
- **Maintenance.** Lit is stable and widely used for exactly this. `@solidjs/element` is an RC on an RC with stale docs and a thin, single-maintainer custom-element layer.

## Recommendation

**Lit 3.3.3, standard decorators.** Keep the Solid spike in git history as a reference for the fine-grained pattern, delete `spike/solid/` from the tree, and promote `spike/lit/src/elements/*` to `src/elements/` (as `UIElement`, `VocabularyProperties`, `FormElement`, `IconRenderer`) and its two components to `src/components/{button,dropdown}/`.

Carry over from the spike reports, regardless of library:
- The slot-fallback vs child-selector CSS contract (fixed in `src/components/*/*.css`).
- `Icons.ts` alias maps must load lazily and `search.json` must not be bundled (fixed).
- Palette contrast is a token problem, logged in `CODE-DEBT.md`.
- Component `texts` should be registered with `UI.i18n` when a class is defined.
- `.dropdown.icon` must stay `:empty` unless the `icon` slot is occupied.
- The `left labeled` example needs an accessible name.
- Runtime chunk is 27 KB gzip against a 20 KB budget: `colors.css` dominates; revisit after the palette work.
