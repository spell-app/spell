# Theming `@spell/ui`

How the CSS foundation fits together:  tokens, remaps, layers, the app stylesheet, utilities and themes.
Everything lives in `src/styles/`;  the design rationale is in `plan.md` ("CSS system").

## The pieces

| Sheet | What | Layer |
|---|---|---|
| `layers.css` | the layer order;  MUST be first in every tree scope | -- |
| `reset.css` | box-sizing / margin reset for shadow markup (`:host`-scoped, never touches the page) | `ui.reset` |
| `tokens.css` * | type, spacing, radii, borders, ink + text / border alphas, shadows, motion, z-index, breakpoints | `ui.tokens` |
| `colors.css` * | palette, semantic and neutral colours, colour remaps, `ui-text/bg/border-<colour>` | `ui.tokens`, `ui.utilities` |
| `sizes.css` * | size ratios, size remaps, `ui-font-size-*`, spacing utilities | `ui.tokens`, `ui.utilities` |
| `animations.css` | the transition catalogue (`ui-fade-up-in` ...) and its hooks | `ui.utilities` |
| `utilities.css` | layout / text / theme / visibility utilities | `ui.utilities` |
| `typography.css` | page typography, opt-in with `class="ui-typography"` | `ui.base` |
| `native.css` | native markup slotted into components, the CSS-only tooltip, `ui-native` | `ui.components` |
| `themes/classic.css` | Fomantic's original look | `ui.theme` |
| `themes/dark.css` | force the dark scheme page-wide | `ui.theme` |
| `media.css` | `@custom-media --ui-mobile` ... (build-time only) | -- |
| `ui.css` | one `@import` entry of the page set, for pages without the runtime | -- |

\* GENERATED from `styles.vocabulary.en.ts` by `yarn gen:styles` -- never edit them by hand.  The generated
files are committed, so consumers need no build step;  `styles.test.ts` fails when they're stale.

`$/styles` exports each sheet as text (`tokensCSS` ...), plus `foundationCSS` (adoption order for the document
AND every shadow root) and `pageCSS` (foundation + typography + native, for the document only).

## Units

- NEVER `rem`:  the host page can redefine it.  The ONE absolute length is `--ui-font-size` (px, default
  `16px`);  everything else is `em` of the local font size, or px for hairlines and shadows.
- A component root sets `font-size: calc(var(--ui-font-size) * var(--ui-scale, 1))` and uses `em` inside.
- Scale a whole region by overriding `--ui-font-size` on a wrapper;  components inside follow.

## Layers

```css
@layer ui.reset, ui.tokens, ui.base, ui.components, ui.utilities, ui.theme, ui.app;
```

- Later layers win regardless of specificity;  unlayered page CSS beats all of them.
- Each component adds `ui.components.<name>.types / content / variations / states`, so states beat
  variations without `!important`.
- `layers.css` must be adopted FIRST into the document and into every shadow root (each is its own scope).

## Tokens

- Declared on `:root`, plus a `:host` copy guarded by `@container not style(--ui-sheet-<name>: loaded)`:
  - where the page loaded the sheet, the guard is false, `:host` declares nothing, and page / wrapper
    overrides inherit into components
  - where it didn't (detached rendering), the component's own adopted copy supplies the defaults
  - an unguarded `:host { --ui-font-size: 16px }` would instead block every wrapper override
- Colours are `light-dark()` token streams, resolved where they're USED, so `color-scheme` on any subtree flips
  every colour below it -- in the page and through shadow boundaries.
- The concrete per-scheme bases (`--ui-red-on-light`, `--ui-red-on-dark`) are registered with `@property`
  (`<color>`), so they animate and type-check.  The `light-dark()` tokens themselves are NOT:  a registered
  `<color>` resolves `light-dark()` where it's declared (`:root`), freezing the page's scheme into `.ui-dark`
  subtrees.  NOTE: `@property` only registers from the document -- rules inside shadow-root sheets are ignored.

### Colour tokens

For every hue (`red orange yellow olive green teal blue violet purple pink brown grey black`), the aliases
(`primary` -> `blue`, `secondary` -> `black`) and the semantic colours (`positive negative info warning`,
with `success` / `error` as aliases):

| Token | Meaning | Fomantic |
|---|---|---|
| `--ui-red` | the colour, `light-dark(var(--ui-red-on-light), var(--ui-red-on-dark))` | `@red` / `@lightRed` |
| `--ui-red-hover / -focus / -down / -active` | states (darken + saturate;  `black` lightens) | `@redHover` ... |
| `--ui-red-text / -header / -border / -background` | roles, per scheme | `@redTextColor` ... |
| `--ui-red-inverted` | the colour on dark surfaces, whatever the scheme | `@lightRed` |

Neutrals:  `--ui-background`, `--ui-surface`, `--ui-surface-muted`, `--ui-surface-strong`, `--ui-highlight`,
`--ui-ink`, `--ui-text-color` / `--ui-text-{dark,muted,light,unselected,hovered,pressed,selected,disabled}`
(+ `--ui-text-inverted-*`), `--ui-border-color[-strong|-internal|-selected|-selected-strong|-disabled]`,
`--ui-link[-hover]`, `--ui-focus-color`, `--ui-focus-border`.

## Remaps

Component CSS never names a hue.  A colour class re-points the GENERIC tokens, and one rule set consumes them:

```css
/* generated, colors.css */
.ui.red, .ui-red {
  --ui-color: var(--ui-red);
  --ui-color-text: var(--ui-red-text);
  /* ... -header, -border, -background, -inverted */
}
/* generated once for every colour:  states + contrast derive from --ui-color on the same element */
.ui.red, .ui-red, .ui.orange, /* ... */ {
  --ui-color-hover: oklch(from var(--ui-color) calc(l - 0.05) calc(c * 1.1) h);
  --ui-color-contrast: oklch(from var(--ui-color) clamp(0, (0.72 - l) * 1000, 1) 0 0);
}

/* component CSS (e.g. button.css) */
.ui.button { background: var(--ui-color, var(--ui-button-background)); color: var(--ui-color-contrast, inherit); }
.ui.button:hover { background: var(--ui-color-hover, var(--ui-button-hover-background)); }
```

- Contract for components:  READ `--ui-color*` with a fallback for the uncoloured look;  NEVER declare them
  (remaps live in `ui.tokens`, below components, so a component declaration would override the colour class).
- Sizes work the same way:  `.ui.large, .ui-large { --ui-scale: var(--ui-size-large) }`;  `.medium` emits
  `--ui-scale: 1`, a no-op that also resets a size inherited from a wrapper.
- The generic tokens INHERIT:  `<div class="ui-red">` recolours every component inside it (that's the point of
  the `ui-<hue>` utility).  A component that must not inherit a parent's colour resets it on its own `:host`.
- `data-variation="red small"` (tooltips / popups) sets `--ui-variation-color` / `--ui-variation-scale`
  instead, so a coloured tooltip never recolours the element it hangs off.

## The app stylesheet (`#ui-app-stylesheet`)

The contract (the runtime's `Styles` service implements it):

- The page has at most ONE `<link>` or `<style>` with `id="ui-app-stylesheet"`.  It may `@import` anything else.
- The runtime mirrors it into one shared constructable sheet and appends it LAST to every component's
  `adoptedStyleSheets`:  tokens -> component -> utilities -> app stylesheet.  Later edits, a late insertion
  and `<link>` loads are picked up.
- Put overrides in `@layer ui.app` (or leave them unlayered to beat everything).  Inside shadow roots the
  class grammar is Fomantic's, so the override language is the one you know:

```css
/* #ui-app-stylesheet */
@layer ui.app {
  .ui.primary.button { border-radius: var(--ui-radius-pill); }
  .ui.card > .content > .header { letter-spacing: 0.01em; }
}
```

## Overriding colours

Globally -- one base token re-colours the hue everywhere, derived states and roles included:

```css
@layer ui.app {
  :root {
    --ui-red-on-light: oklch(0.58 0.22 20);
    --ui-red-on-dark: oklch(0.72 0.17 20);
    --ui-primary: var(--ui-violet);           /* re-point an alias */
    --ui-primary-inverted: var(--ui-violet-inverted);
  }
}
```

Hand-tune one role for one hue (themes do this, e.g. classic's yellow text):

```css
:root { --ui-yellow-text: oklch(0.62 0.13 80); }
```

Per region -- tokens inherit, so override them on a wrapper:

```html
<section style="--ui-font-size: 18px; --ui-radius: 0">...</section>
<section class="ui-dark">...</section>           <!-- whole region in the dark scheme -->
```

Per instance -- set the generic tokens on an UNCOLOURED component;  they inherit into its shadow:

```html
<ui-button style="--ui-color: hotpink; --ui-color-hover: deeppink; --ui-color-contrast: white">Hot</ui-button>
```

- Don't combine it with `color="..."`:  the inner `.ui.red` element's remap re-declares `--ui-color`,
  which beats the inherited value.
- Derived states only come for free where a remap runs (they're derived from `--ui-color` on the element with
  the colour class), so set the ones you need.

NOTE: re-pointing a BASE on an intermediate element (`.card { --ui-red: hotpink }`) changes `--ui-red` below it,
but not the derived `--ui-red-hover` / `-text` (custom properties substitute `var()` where they're declared,
at `:root`).  Override `--ui-color*` there instead, or the base on `:root`.

## Utilities

`utilities.css` (hand-written) plus the generated colour / size parts;  all `ui-*`, all in `ui.utilities`,
adopted into the page and every shadow root:

- layout:  `ui-stack`, `ui-cluster`, `ui-split` (`ui-split:row` / `ui-split:column`), `ui-flank`
  (`:start` / `:end`), `ui-frame` (`:square` / `:landscape` / `:portrait`), `ui-grid` (`--min-column-size`),
  `ui-span-grid`, `ui-gap-<space>`, `ui-align-items-*`, `ui-align-self-*`, `ui-justify-content-*`,
  `ui-flex-wrap` / `-nowrap`
- sizing:  `ui-w-1/2 1/3 2/3 1/4 3/4 full auto fit`, `ui-h-full auto fit`, `ui-m[-side]-<space>`,
  `ui-p[-side]-<space>` with sides `b i bs be is ie`
- text:  `ui-body` / `ui-heading` / `ui-caption` (+ `-<size>`), `ui-font-size-<size>`, `ui-font-weight-*`, `ui-bold`,
  `ui-italic`, `ui-muted`, `ui-text-{start,center,end,justify,nowrap,balance,pretty,truncate}`,
  `ui-text-{uppercase,lowercase,capitalize}`, `ui-link`, `ui-link-plain`, `ui-list-plain`
- colour:  `ui-<colour>` (remap), `ui-text-<colour>`, `ui-bg-<colour>` (the pale background role),
  `ui-border-<colour>`
- theme:  `ui-light`, `ui-dark`, `ui-invert` (flips relative to its parent, via a style query on `--ui-scheme`)
- shape:  `ui-rounded-{s,m,l,pill,circle,square}`
- misc:  `ui-prose` / `ui-not-prose`, `ui-visually-hidden[-force]`, `ui-cloak` (hides undefined elements,
  2s cap), `ui-hidden`, `ui-block`, `ui-flex`, `ui-hidden-{mobile,tablet,computer}`

`<space>` is `3xs 2xs xs s m l xl 2xl 3xl`;  `<size>` is `mini tiny small medium large big huge massive`.

## Themes

A theme is a sheet of token overrides in `@layer ui.theme`, loaded on the page after the foundation.
Tokens inherit into shadow roots, so components follow without adopting anything.

- `themes/classic.css`:  Lato, 14px, Fomantic's size ratios, original palette (as OKLCH), hand-picked text and
  background tints, emotive message colours, 4px radii, flat shadows.  Loads no font -- add Lato yourself.
- `themes/dark.css`:  `color-scheme: dark` on `:root`.  Every colour token is a `light-dark()` pair, so forcing
  the scheme IS the dark token set.  Tune one value with its `-on-dark` base.

Dark mode by default follows the OS (`color-scheme: light dark` on `:root`, in `ui.tokens` so a page's own
`color-scheme` wins).  A light-only page sets `:root { color-scheme: light }` or `class="ui-light"`.

## Build notes

- `@custom-media` (`media.css`) and the `@import`s in `utilities.css` / `native.css` / `ui.css` need Lightning CSS
  (Vite's `css.transformer: "lightningcss"` with `drafts.customMedia`).  Raw, those rules are dropped.
- `css.lightningcss.targets` MUST be modern browsers (the platform the plan assumes).  With Vite's default
  targets Lightning CSS lowers `light-dark()` into `--lightningcss-light` variables substituted at `:root`,
  which breaks `.ui-dark` subtrees, and adds hex / `lab()` fallbacks for every OKLCH literal.
