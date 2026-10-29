# Theming Spell UI

![The same header, three buttons, a search box and a toggle, drawn six ways:  with no theme, with the classic, github and material themes, with Spell's own theme, and with Spell's theme in dark mode](docs/images/themes.png)

_One block of markup, six looks, each under the call that made it:  screenshots of a running page._

Nothing in the markup changed between those panels.
`UI.themes.apply("github")` swapped one stylesheet, on the page and inside every component's shadow root at once;
the last panel added one class, `ui-dark`.

That's the big switch, and you may never need it.
Spell UI draws everything from CSS custom properties, the TOKENS,
so theming is mostly setting a few of them:  say how your look differs from the default, and stop.

You can also make a theme from your own colours, fonts and shapes, live, with `<ui-theme-editor>` (recipe 5),
and offer people Spell's themes on your own page with `<ui-theme-menu>` (recipe 3).

<details>
<summary>The markup in every panel, and how the pictures were taken</summary>

```html
<ui-header level="3">Account settings<ui-header>Manage your preferences</ui-header></ui-header>
<div class="row">
  <ui-button color="primary">Save</ui-button>
  <ui-button>Cancel</ui-button>
  <ui-button appearance="basic" icon="user">Profile</ui-button>
</div>
<div class="row">
  <ui-input icon="magnifying glass" placeholder="Search..." aria-label="Search"></ui-input>
  <ui-checkbox appearance="toggle" selected>Email me</ui-checkbox>
</div>
```

- Taken in headless Chromium, on Spell UI's theming page from the page server,
  with `UI.themes.apply()` called between the shots.
- `classic` has Lato added from Google Fonts:  the theme names the font, but loads none.

</details>

## If you've themed MUI or Tailwind, two things move

### Your selectors stop at the shadow root;  custom properties don't

Each `<ui-button>` draws a real `<button>` inside its shadow root, where the page's selectors can't reach.
With MUI you'd hand a `ThemeProvider` a `styleOverrides` entry;  with Tailwind, you'd put classes on the button.
Here there's no provider, and the inner `<button>` you'd put classes on is out of reach:
custom properties inherit through the shadow boundary, as `color` does, and every component reads its look from them.

That gets your values in.
What decides who wins is order:  every sheet, the page's and each shadow root's, sits in one of seven cascade layers,
declared the same way everywhere:

```css
@layer ui.reset, ui.tokens, ui.base, ui.components, ui.utilities, ui.theme, ui.app;
```

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif","fontSize":"15px","primaryColor":"#EFECFB","primaryBorderColor":"#6550CA","primaryTextColor":"#1A1C27","secondaryColor":"#F4F1E9","tertiaryColor":"#F7F6FC","lineColor":"#7F6FD6","textColor":"#7F6FD6","clusterBkg":"#F7F6FC","clusterBorder":"#B9B0E8","titleColor":"#1A1C27","edgeLabelBackground":"#F7F6FC","actorBkg":"#EFECFB","actorBorder":"#6550CA","actorTextColor":"#1A1C27","actorLineColor":"#9C90DE","signalColor":"#7F6FD6","signalTextColor":"#7F6FD6","labelBoxBkgColor":"#EFECFB","labelBoxBorderColor":"#6550CA","labelTextColor":"#1A1C27","loopTextColor":"#7F6FD6","noteBkgColor":"#F1E7D4","noteBorderColor":"#C9B48A","noteTextColor":"#1A1C27","activationBkgColor":"#DCD6F7","activationBorderColor":"#6550CA","sequenceNumberColor":"#FFFFFF"},"flowchart":{"curve":"basis","padding":12,"nodeSpacing":40,"rankSpacing":44}}}%%
flowchart TB
  reset["ui.reset<br/>box-sizing and margins, inside shadow roots"]
  tokens["ui.tokens<br/>the defaults:  every --ui-* token"]
  base["ui.base<br/>page typography, opt-in"]
  components["ui.components<br/>each family's own sheet"]
  utilities["ui.utilities<br/>the ui-* utility classes"]
  theme["ui.theme<br/>the theme you applied (recipe 3)"]
  app["ui.app<br/>your tokens and the app stylesheet (recipes 1, 2 and 4)"]
  page["your plain, unlayered CSS"]
  reset --> tokens --> base --> components --> utilities --> theme --> app --> page
  %% the Spell look:  yarn mermaid:pretty
  classDef default fill:#EFECFB,stroke:#6550CA,stroke-width:1.5px,color:#1A1C27,rx:8px,ry:8px
```

_Later layers win, whatever the specificity:  each says only what it changes, and your plain CSS wins over all seven._

- So a theme's `.ui.button` beats a component's own `.ui.primary.button:hover`, and nobody writes `!important`.
- Inside a family's sheet, four sub-layers do the same:  types, content, variations, states.
  A `:hover` beats `basic`, again without `!important`.
- The layer order is the first sheet in the page and in every shadow root:
  each shadow root fixes its own order from the first `@layer` it sees.

### A colour is one value, and the browser works out the rest

MUI's `createTheme()` runs your palette through JavaScript once, to make its `light`, `dark` and `contrastText`.
Here every shade is a CSS expression, worked out by the browser where it's used.
This is red, six of its fourteen tokens, from the generated [colour sheet](src/styles/colors.css):

```css
--ui-red-on-light: oklch(0.57 0.21 27);
--ui-red-on-dark: oklch(0.7 0.19 25);
--ui-red: light-dark(var(--ui-red-on-light), var(--ui-red-on-dark));
--ui-red-hover: oklch(from var(--ui-red) calc(l - 0.05) calc(c * 1.1) h);
--ui-red-text: light-dark(oklch(from var(--ui-red) min(l, 0.5) c h), oklch(from var(--ui-red) max(l, 0.78) c h));
--ui-red-on: light-dark(oklch(1 0 0), var(--ui-ink-on-light));
```

- Set red's two bases, `--ui-red-on-light` and `--ui-red-on-dark`, and ten of the other twelve follow:
  `--ui-red` itself;  its hover, focus, pressed and active shades;  its text, header, border and background;
  and its inverted colour.
- Every colour works this way:  thirteen hues, `red` to `black`;  `primary` and `secondary`, which point at blue
  and black until you re-point them;  and `positive`, `negative`, `info` and `warning`.
- They're OKLCH, so `l - 0.05` darkens a yellow about as much as it darkens a blue.
- **The two that don't follow:**  `-on` and `-inverted-on`, the text drawn ON the colour.
  - Each is white or ink, picked when the sheets were generated:
    the first that reaches WCAG AA's 4.5:1 on the colour and on its four states, in each scheme.
  - A [test](tests/styles/colors.contrast.test.ts) measures every pair from the computed tokens,
    so a palette change that breaks contrast fails, naming the colour.
  - Unlike MUI's `contrastText`, nothing recomputes it for you:  move a base far, and set its `-on` too.

## What ships:  tokens, dark mode and the themes

### About 400 tokens, and 1,200 more that belong to one family each

| Family | Tokens | Worth knowing |
| --- | --- | --- |
| type | `--ui-font-size`, `--ui-font-family`, `--ui-font-family-heading`, `--ui-font-family-mono`, `--ui-line-height` | `--ui-font-size` is `16px`, and every size scales from it in `em`, never `rem` |
| spacing | `--ui-space-3xs` ... `--ui-space-3xl` | nine steps, `0.125em` to `4em` |
| radius | `--ui-radius`;  `--ui-radius-s`, `-m`, `-l`, `-pill`, `-circle` | `--ui-radius` is `-m`, `0.375em` |
| shadows | `--ui-shadow-raised`, `-floating`, `-overlay` | |
| motion | `--ui-duration-fast`, `-normal`, `-slow`;  the `--ui-ease-*` curves | |
| colour | `--ui-primary`, `--ui-secondary`, every hue, each with its roles:  `-hover`, `-focus`, `-text`, `-border`, `-background`, `-inverted`, `-on` ... | three quarters of the 400, each a `light-dark()` pair or worked out from one |
| a family's own | `--ui-<tag>-*`:  `--ui-button-background`, `--ui-checkbox-mark-color` | 42 on `<ui-button>` alone;  each family's docs page lists its own on a Theming tab, with their defaults |

Why `em`:  Tailwind's `rem` sizes all follow the page's root font size.
Here a wrapper's `--ui-font-size: 20px` makes every component inside it bigger, and nothing outside it;
only hairlines, focus rings, shadows and breakpoints stay in `px`.

### Dark mode follows the operating system, and any element can overrule it

Every colour token is a `light-dark()` pair, resolved where it's USED, not where it's declared.
So the scheme can change at any element, and everything below it follows, through shadow roots:
- `class="ui-dark"` or `class="ui-light"` forces a scheme on a subtree;  `ui-invert` flips it back from its parent's
- `<ui-root theme="dark">` does the same for everything inside a root
- on `<html>`, `class="ui-dark"` turns the whole page dark, as the [dark sheet](src/styles/themes/dark.css) does
- `:root { color-scheme: light }` keeps a page light:  the library sets `light dark` in its tokens layer,
  so a page's own `color-scheme` wins

One name trips people up:  `theme` on `<ui-root>` is the colour SCHEME, `light` or `dark`.
A look like `github` is applied with `UI.themes.apply()` (recipe 3).

### The themes:  Spell's own nine, on `classic`

Each theme is one sheet in [the themes folder](src/styles/themes/), and there's no list of them anywhere else:
the runtime globs the folder, so dropping a `<name>.css` in makes a theme.
- `classic`:  Fomantic UI's original look (Lato, 14px, its palette, 4px radii), and the base every Fomantic theme
  sits on.
  It names Lato but loads no font:  add it yourself, or the system font stands in.
- Fomantic's 23 themes (`amazon` to `twitter`), ported once, are ARCHIVED in
  [the archive folder](src/styles/themes/archive/) (epic `debut` P17):
  - in no bundle (the runtime globs only the themes folder's top level), no menu and no test
  - kept only to copy from, the way they were ported (below)
- Spell's own nine, `themes.own`, the one set every place offers:
  - `spell`:  Spell's own look, and the docs site's default:  serif headings with italic ledes, Spell Purple,
    pill buttons, an aubergine dark mode, and the brand's warm and inverse surfaces for Spell's own pages.
    It ships no font either:  the serif is whichever Palatino the system has.
  - `glass`:  macOS today:  the system font, rounded rectangles, Apple's system colours,
    and GLASS:  cards, menus, popups and modals are translucent and blur what's behind them, on a solid page.
    - The glass is CSS alone (`backdrop-filter`);  without it the surfaces are still translucent, and still read.
  - `fruity`:  `glass` over a soft pastel wallpaper, three colour washes:  its file extends `glass`.
  - `merlot`:  a code studio in wine reds:  flat panels on hairlines a step off the page, no glass,
    a warm gold primary on deep wine in dark, a maroon one on rose-grey in light.
    It's tokens only so far:  every family keeps `classic`'s shapes.
  - `paper`:  warm and bookish, for reading:  a cream page, ink-brown text, an oxblood primary, a serif (Iowan Old
    Style, then Palatino) for what you read and the system sans for controls, hairlines, 4px corners;
    dark is lamplight, a deep brown page with cream text.
  - `midnight`:  dark first, calm and glowing:  a blue-black page, panels a clear step lighter with softly lit edges,
    a glowing teal primary;  light is dawn, a pale blue-grey with a deep teal.
  - `crisp`:  high contrast, for anyone who needs it:  pure white or pure black, one strong blue, 2px borders,
    a thick focus ring, no shadows and nothing see-through;  its text reaches 7:1 (WCAG AAA), not only 4.5:1.
  - `pop`:  playful and colourful:  the rounded system font, a hot pink primary, and a sticker look:
    thick ink outlines and a hard offset shadow on cards, panels and buttons;  dark is a deep plum page.
  - `matrix`:  a dark ops console:  a near-black green-grey page with a faint glow from the top, panels only just off
    it on hairlines and a slight lift, one mint accent, amber for what needs attention and coral for what's wrong,
    heavy tight headings in Inter (the one font a theme of the set ships:  self-hosted, latin only, fetched only
    when Matrix is applied), dim grey-green body text,
    and its labels (a table's header row, a `sub` header) in the monospace, uppercase;
    light is a cool grey-green with a deep mint.
  - Two more of Spell UI's font stacks came with them, for any theme to use:
    `--ui-font-family-serif` (Palatino first) and `--ui-font-family-rounded`.
  - A theme remembered under an old name comes back under its new one (`Themes.RENAMED`):
    `studio` as `merlot`, `spell-brand` as `spell`.
- Spell's own nine are written as data:  a theme file each, `<name>.theme.json5`, beside its sheet.
  - Its values sit in nested groups, as the token tables group them:  `surfaces > page`, `typography > family > body`.
    Each is one value, or a light one and a dark one.
  - A colour is written as hex, `#rrggbb`, or `#rrggbbaa` with its alpha:  `#ffffff59`, not `rgb(255 255 255 / 0.35)`.
    The writer refuses a plain `rgb()`, and names the hex to write.
  - `yarn gen:styles` writes the sheet from the file, and the sheet is committed:  edit the file, never the sheet.
  - What a value can't say (selectors, the glass blur, motion) stays CSS, in a rules sheet the file names.
  - VS Code completes and checks a theme file's names, from `theme.schema.json` beside it.
- Not a theme:  the dark sheet, a colour scheme you put on top of any of them (above).
  `classic` has no dark of its own, since Fomantic had none:  its dark colours are Fomantic's light hues.

The cost:  each theme is its own lazy chunk, fetched the first time it's applied
(`classic` 1.6 kB gzipped, `spell` 3.4, as `yarn measure` weighed them).

<details>
<summary>Every theme, in a line</summary>

"Page-wide" themes change the site's globals too (font, size, palette), so every component shifts a little;
the last column is what a theme restyles on purpose.

| Theme | Look | Restyles |
| --- | --- | --- |
| `spell` | Spell's own:  Palatino-family serif headings with italic ledes, a system sans body, Spell Purple, pill buttons, 16px cards, soft layered shadows, an aubergine dark mode.  Page-wide;  the docs site's default. | everything, through the global tokens |
| `glass` | macOS today:  the system font, 15px, 8px buttons and 14px cards, a violet accent, Apple's system colours;  translucent glass surfaces on a solid page.  Page-wide. | everything, through the global tokens;  card, segment, section, menu, popup, dropdown, modal and toast get the blur |
| `fruity` | `glass` over a soft pastel wallpaper:  three blurred colour washes behind the page.  Page-wide. | as `glass` |
| `paper` | Warm and bookish:  a cream page, ink-brown text, an oxblood primary, a serif for reading, hairlines and 4px corners;  dark a lamplit brown.  Page-wide. | everything, through the global tokens |
| `midnight` | Dark first:  a blue-black page, panels a step lighter with lit edges, a glowing teal primary, the system font, 10px corners;  light a pale blue-grey dawn.  Page-wide. | everything, through the global tokens |
| `crisp` | High contrast:  pure white or black, one strong blue, 2px borders, a thick focus ring, no shadows;  text at 7:1.  Page-wide. | everything, through the global tokens |
| `matrix` | A dark ops console:  a near-black green-grey page with a faint glow, panels only just off it on hairlines, one mint accent, amber and coral for warnings and errors, heavy tight headings in Inter (self-hosted), monospace labels, 8px controls and 14px cards;  light a cool grey-green.  Page-wide. | everything, through the global tokens;  table header rows and `sub` headers in the monospace |
| `pop` | Playful:  the rounded font, a hot pink primary, thick ink outlines and a hard offset shadow (a sticker look), 16px cards;  dark a deep plum.  Page-wide. | everything, through the global tokens;  filled buttons get the sticker |
| `merlot` | A code studio in wine reds:  the system font, flat panels joined by hairlines a step off the page, no glass;  a warm gold primary on deep wine in dark, a maroon one on pale rose-grey in light.  Page-wide;  tokens only so far. | everything, through the global tokens |
| `classic` | Fomantic's original look, and the base of every theme above:  Lato, 14px, Fomantic's palette and size ratios, 4px radii.  Page-wide. | everything, through the global tokens |

</details>

## Five recipes

### 1. Sitewide defaults:  tokens on `:root`

Set the global tokens in your app's layer, and every component follows:

```css
@layer ui.app {
  :root {
    --ui-primary: var(--ui-pink);
    --ui-primary-inverted: var(--ui-pink-inverted);
    --ui-secondary: var(--ui-grey);
    --ui-red-on-light: oklch(0.58 0.22 20);
    --ui-red-on-dark: oklch(0.72 0.17 20);
  }
}
```

- On a live page, the primary button went from blue, `oklch(0.55 0.16 250)`, to pink, `oklch(0.58 0.22 355)`;
  its hover and its dark-scheme colour came along with no other line.
- The red pair re-colours red in each scheme separately:  set only `-on-light`, and dark mode keeps the default red.
- `-inverted` is re-pointed by hand because three of primary's tokens point at blue's rather than derive:
  `-inverted`, `-on` and `-inverted-on`.
  Pink and blue both take white text in light and ink in dark, so `-on` can stay;
  re-point primary at yellow, which takes ink, and add `--ui-primary-on: var(--ui-yellow-on)`.
- In `ui.app`, it beats any theme you apply, and your plain CSS can still beat it.

### 2. One component's defaults:  its own tokens

Each family also reads tokens of its own, `--ui-<tag>-*`,
and you set them as widely or as narrowly as a selector reaches:

```css
/* every button */
:root { --ui-button-radius: 0; }

/* the buttons in a toolbar */
.toolbar { --ui-button-padding-inline: 0.75em; }

/* one kind of button, on its inner box */
ui-button.cta::part(button) { --ui-button-background: gold; }

/* the headers inside every card */
ui-card { --ui-card-header-color: var(--ui-violet-text); }
```

- All four ran on a live page:  the radius went from `6px` to `0`, the toolbar's padding from `24px` to `12px`,
  the `.cta` gold and the card's header violet.
- Tokens inherit into the shadow root, so they work anywhere above the box:
  `:root`, any ancestor, the element itself, or its `::part()`.
- **The exception:**  a variation that SWAPS a value wins over the token.
  `circular` stayed a pill under `--ui-button-radius: 0`;  restyle it with a plain property on its part:
  `ui-button[circular]::part(button) { border-radius: 0.5em }`.
- Never set the `--_ui-*` names you'll meet in the sheets:  they're each component's private plumbing,
  read from the public token.

### 3. Applying a theme:  one call, every shadow root

For a whole look rather than a few values, one call.
The runtime fetches the theme's sheet the first time it's asked for,
and adopts it into the page and every component's shadow root, the ones there now and the ones to come:

```js
import { UI } from "spell/ui/core"

const { themes } = await UI.load()
themes.own // Spell's own themes:  ["spell", "glass", "fruity", "merlot"]
await themes.apply("merlot") // classic, then merlot
await themes.apply("classic") // classic alone
await themes.apply("spell") // classic, then Spell's own look
await themes.apply(undefined) // no theme:  the plain default look
```

- Both sheets sit in `ui.theme`, `classic` first, so the theme wins every tie by coming second.
- One theme at a time:  each call replaces the last in place, and `apply(undefined)` takes both sheets away.
- Two calls racing:  the last one called wins, even when the first one's chunk arrives later.
- `themes.own` lists Spell UI's own nine themes, `spell`, `glass`, `fruity`, `merlot`, `paper`, `midnight`,
  `crisp`, `pop` and `matrix`:
  the theme menu (`<ui-theme-menu>`) lists them, and nothing else.
- A name it doesn't know throws a `TypeError` that lists the ones it does.
- To let people pick:  `<ui-theme-menu>`, one palette button holding Spell's nine themes and Light, Dark or Auto,
  remembered for each viewer (`ThemePreference`);  every Spell place shows it.
  - Its Theme bench row opens the theme bench in a new window, in the theme chosen.
- A page's address can say its theme and scheme for that visit:  `?theme=glass&scheme=dark`.
  - It wins over what the viewer chose there, and is never remembered:  picking from the menu still is.
  - A name that isn't a theme, or a scheme that isn't `light` or `dark`, is ignored with a warning.
  - `ThemePreference.addressWith(address, { theme, scheme })` writes one;  the theme bench's ↗ opens each page so.
  So does `apply("dark")`, since dark is a scheme (above):

  ```text
  Themes.apply():  `dark` isn't a theme;  pick `classic`, one of `own` or one of:  amazon, basic, bookish, ...
  ```

- A page with no runtime can link the sheets itself:  `ui.css`, then `classic.css` and the theme's own from `themes/`.
  Only the token half reaches inside components then:  the class-grammar half needs the runtime to adopt it.

### 4. Restyling the base styles:  the app stylesheet

For a change no token covers, write CSS against the markup INSIDE the components.
Give one `<style>` or `<link>` on the page the id `ui-app-stylesheet`,
and the runtime mirrors it into every component's shadow root, adopted last:

```html
<style id="ui-app-stylesheet">
  @layer ui.app {
    .ui.button {
      border-radius: 0; /* squares every button on the page */
    }
    .ui.card {
      box-shadow: none; /* flattens every card */
    }
  }
</style>
```

- The selectors are Fomantic's class grammar, the classes the components draw inside their shadow roots,
  so this is where Fomantic's `.overrides` files go.
- Both rules ran on a live page, from a `<style>` inserted after it loaded, and an edit to its text was picked up:
  the runtime watches for edits, a late insertion and a `<link>` that loads later.
- `@import`s are inlined:  every level from a same-origin `<link>`;  one level from a `<style>` or another site's sheet.
- Keep it in `@layer ui.app`, or leave it unlayered to beat every layer in the shadow root.
- **One page, one app stylesheet,** and an element that gains the id later, through `setAttribute()`, isn't noticed:
  insert it with the id already on.
- **A selector stops at its own shadow root:**  `.ui.card > .content > .header` never reaches a `<ui-card>`'s header,
  which draws in a shadow root of its own, `<ui-header>`'s.
  The family's token does it instead:  `--ui-card-header-color`, recipe 2.

<details>
<summary>Porting a Fomantic theme, in short</summary>

All 24 of Fomantic's looks, `classic` and the 23 themes now archived, were ported the same way;
the theming page on the docs site has the recipe step by step.

1. Read the theme in Fomantic's source:  its `globals/site.variables` first, then each component's `.variables`
   and `.overrides`.
   Only what's there is the theme.
2. Write ONE sheet in [the themes folder](src/styles/themes/), all inside `@layer ui.theme`, in two halves:
   - TOKENS on `:root`:  Fomantic's variables, as `--ui-*` globals and `--ui-<tag>-*` component tokens
   - OVERRIDES:  Fomantic's `.overrides`, as class-grammar rules (`.ui.button`) for the markup inside shadow roots
3. Scope the overrides:  `ui.theme` beats every component layer, states included,
   so write `.ui.button:not(.basic, .inverted, .tertiary)` where Fomantic meant that, not `.ui.button`.
4. Put what the theme really needs, a font or an image, in `themes/<name>/`, referenced relatively.
5. Test it:  a `describe("<name>.css")` in [the themes test](tests/styles/themes/themes.test.ts),
   with at least one computed style per component it touches, read inside the shadow root.

- The models:
  - `github.css`:  the site's globals and 15 components, tokens and overrides
  - `material.css`:  fonts, palette, the `-on` colours re-checked
  - `fomantic-classic.css`:  small, mostly overrides
- Not ported:  Fomantic's per-component `theme.config`;  its icon fonts (icons here are SVG packs);
  web fonts by `@import` (a runtime sheet drops `@import`, so the page loads its fonts).

</details>

### 5. Making a theme:  `<ui-theme-editor>`

To make a look of your own, start from one of Spell UI's and change what you like:

```html
<ui-theme-editor></ui-theme-editor>
```

- Its Basics pick the primary, secondary and background colours, the heading and body fonts, the text size,
  the corners, the depth and, on `fruity`, how much the glass shows through:  each sets many tokens.
- Under them, every token a theme sets, in the theme file's nested groups, light and dark side by side;
  a token set there wins over the Basics.
- The whole page wears the theme as you change it, and a sample app shows it in light and dark side by side.
  - Hand it `pages` (real pages, each in a frame) and it previews those instead, its own look staying put.
  - With pages, its view is in the page's address (`?theme=midnight&scheme=both&swap=1&pages=notebook,app&phone=1`):
    copy the link, and it opens the same.  A page is moved by dragging its title row, or Alt+← / Alt+→.
- What it makes is a theme FILE:  Copy changes gives its JSON5 (`extends` its base), colours in hex.
  - Its sheet (`el.css`):  the file's values on `:root`, in `@layer ui.app`.
    Apply its base first (`UI.themes.apply("fruity")`), then the sheet, and the page looks as it did in the editor.
- A theme kept in this browser from before:  the Spell editor wears it over its base, and any page can,
  `SavedTheme.restore()`;  Stop using forgets it.
- It starts from the page's theme, `fruity` when there's none;  `base` and `value` start it elsewhere.
- Its docs page, with the editor live:  `/components/ui/ui-theme-editor.html`.

## 🌱 Coming:  themes per component

- theme files per component, so one page can mix looks family by family

Today a page applies one theme at a time,
and mixes looks through component tokens, or by copying a theme's rules for one family into its app stylesheet.

<details>
<summary>More in the docs site</summary>

These pages are served by the page server, so they need a checkout and the page server running
([README-site.md](README-site.md)).
The second lives in the content folder, which a new checkout doesn't have.

- Theming, with a live theme gallery and every foundation token:  `/components/ui/theming.html`
- Spell UI's theming notes (the sheet table, component tokens, utilities, stacking):  `/guides/ui/notes/theming.md`

</details>

## See also

- [README.md](README.md):  Spell UI's front page, with `<ui-root>` and every way page CSS reaches inside a component
- [README-components.md](README-components.md):  every family, each with its own tokens on its docs page's Theming tab
- [README-runtime.md](README-runtime.md):  the sheets under every theme, and the `UI` runtime that applies them
- [README-migrating.md](README-migrating.md):  coming from Fomantic UI, whose themes and `.overrides` carry over
- [The kit's element framework](https://github.com/spell-app/spell/blob/main/README/element.md):  how each component's shadow root adopts these sheets
