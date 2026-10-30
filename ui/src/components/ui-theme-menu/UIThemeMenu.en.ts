/**
 * The English vocabulary of `<ui-theme-menu>`:  every name the tag uses.
 * - Its tag, attributes, events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Class words:  `inverted` (`ui inverted themes`), for dark backgrounds.
 * - Pure data:  `import type` only, so node loads it (`yarn site:data`, `yarn gen:root`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `themeMenuVocabulary`
 * The names of `<ui-theme-menu>`, a page's theme and light / dark, remembered per viewer:
 * - a palette button opening a small overlay with Light | Dark | Auto and Spell's themes
 * - or a theme dropdown, for a page's masthead
 * - or a sun / moon button alone
 * - or that overlay's panel alone, drawn in place in a sub-menu of another menu
 ****************/
export const themeMenuVocabulary = {
  tag: "ui-theme-menu",
  topics: ["controls", "selection", "menus"],
  aka: ["theme picker", "theme switcher", "dark mode toggle", "colour scheme", "appearance", "skin"],
  skeleton: "inline 5 x 2.25",
  noun: "themes",
  description:
    "A theme menu switches the page between light and dark, and picks its theme from Spell's own, and remembers " +
    "both for the next page.",
  attributes: [
    {
      name: "show",
      kind: "enum",
      values: ["both", "theme", "scheme", "menu"],
      default: "both",
      description:
        "Which controls to show:  `both` (the palette button, whose overlay picks the theme and light / dark), " +
        "`scheme` (a light / dark button alone), `theme` (a theme dropdown) or `menu` (the overlay's panel alone, drawn " +
        "in place:  the body of a sub-menu in another menu, which calls `focusChosen()` as it opens it)."
    },
    {
      name: "size",
      kind: "size",
      description: "Size of the buttons (or the dropdown), `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "inverted",
      kind: "keyOnly",
      description: "For dark backgrounds (a dark header or side panel):  light buttons, an inverted dropdown."
    },
    {
      name: "compact",
      kind: "keyOnly",
      description:
        'With `show="theme"`:  the dropdown is an icon-only palette button, its text (`Spell theme`) its tooltip ' +
        "and name, for a masthead's row of icon buttons."
    },
    {
      name: "bench",
      kind: "string",
      description:
        "Where the site with the theme bench starts (`http://127.0.0.1:4747`), for its Theme bench row, which opens " +
        "Spell UI's theme bench page there in a new window, in the theme chosen;  none given:  this page's own site;  " +
        "`none`:  no row."
    },
    {
      name: "bench-page",
      kind: "string",
      description:
        "Which of the theme bench's pages it opens showing alone (`app`, `epic`, `ui`, `notebook`):  the place " +
        "this menu is on;  none given:  read from the page's address, else `app`."
    }
  ],
  events: [
    {
      name: "ui-changed",
      detail:
        "{ theme: string, tint?: string, scheme: 'light' | 'dark' | 'system', shown: 'light' | 'dark', originalEvent?: Event }",
      description:
        "The viewer picked a theme, a tint or a scheme here;  `theme` is a `UI.themes` name, `tint` one of Spell UI's " +
        "colours (none:  the theme as it is);  " +
        "`scheme` is `system` while following the OS, and `shown` the scheme the page shows.  Fired after the " +
        "choice is stored and while its sheets load."
    }
  ],
  slots: [
    {
      name: "end",
      description:
        "At the foot of the palette's panel, under the themes and Theme bench:  a row of the page's own, " +
        "e.g. the Spell editor's 'Edit theme...'.  Styled as a theme's row.  Not in the theme list's arrow keys."
    }
  ],
  parts: [
    { name: "controls", description: "The wrapper around the controls." },
    {
      name: "scheme",
      description: 'The light / dark `<button>` (`show="scheme"`):  a sun or a moon, the scheme the page shows.'
    },
    { name: "palette", description: "The `<button>` opening the overlay." },
    { name: "overlay", description: 'The overlay, a `<ui-popup open-on="click">`;  its box is `::part(popup)`.' },
    { name: "menu", description: "The overlay's theme list (`role=menu`)." },
    { name: "option", description: "One theme in the list (`role=menuitemradio`)." },
    { name: "schemes", description: "The overlay's Light | Dark | Auto control (`role=radiogroup`)." },
    { name: "scheme-option", description: "One choice in it (`role=radio`):  an icon and its name." },
    { name: "tip", description: 'A button\'s tooltip, a `<ui-popup inverted size="mini">`.' },
    { name: "theme", description: 'The theme `<ui-dropdown>` (`show="theme"`).' },
    { name: "bench", description: "The overlay's Theme bench row, a link opening it in a new window." },
    {
      name: "tints",
      description:
        "The tint row, under the themes (`<ui-hue-swatches>`):  none first, then every colour the chosen theme takes."
    }
  ],
  states: [
    { name: "dark", description: "The page shows the dark scheme (chosen, or the OS's while following it)." },
    { name: "following", description: "The scheme follows the OS (nothing chosen, or Auto)." },
    { name: "open", description: "The overlay is open." },
    { name: "menu", description: 'It draws its panel in place, inside a host\'s menu (`show="menu"`).' }
  ],
  texts: [
    { key: "themeLabel", text: "{title} theme", description: "The dropdown's text:  the chosen theme." },
    {
      key: "themeName",
      text: "Theme",
      description: "Accessible name of the theme dropdown, and the overlay's header."
    },
    { key: "spellDescription", text: "The Spell brand", description: "Under `Spell` in the list." },
    {
      key: "glassDescription",
      text: "Translucent glass on a solid page",
      description: "Under `Glass` in the list."
    },
    { key: "fruityDescription", text: "Glass on a pastel wallpaper", description: "Under `Fruity` in the list." },
    { key: "merlotDescription", text: "A wine-dark studio", description: "Under `Merlot` in the list." },
    { key: "paperDescription", text: "Warm and bookish, for reading", description: "Under `Paper` in the list." },
    { key: "midnightDescription", text: "Dark first, calm and glowing", description: "Under `Midnight` in the list." },
    {
      key: "crispDescription",
      text: "High contrast, for anyone who needs it",
      description: "Under `Crisp` in the list."
    },
    { key: "popDescription", text: "Playful and colourful", description: "Under `Pop` in the list." },
    { key: "matrixDescription", text: "A dark ops console", description: "Under `Matrix` in the list." },
    { key: "toDark", text: "Switch to dark", description: "The light / dark button's name, while the page is light." },
    { key: "toLight", text: "Switch to light", description: "The light / dark button's name, while the page is dark." },
    {
      key: "palette",
      text: "Theme and light / dark:  {title}, {scheme}",
      description:
        "The palette button's name and tooltip:  the chosen theme and scheme (`light`, `dark` or `auto`'s text)."
    },
    { key: "overlayName", text: "Theme and colour scheme", description: "Accessible name of the overlay." },
    { key: "schemeName", text: "Light or dark", description: "Accessible name of the overlay's scheme control." },
    { key: "light", text: "Light", description: "The scheme control's light choice." },
    { key: "dark", text: "Dark", description: "The scheme control's dark choice." },
    { key: "auto", text: "Auto", description: "The scheme control's choice that follows the device's scheme." },
    { key: "bench", text: "Theme bench", description: "The row opening the theme bench." },
    {
      key: "benchTip",
      text: "Open the theme bench in a new window, in this theme",
      description: "Its tooltip."
    },
    {
      key: "tinted",
      text: "{title} - {tint}",
      description:
        "A theme in a tint (epic `debut` P23), in the dropdown's text and the palette's name:  `Glass - Pink`."
    },
    { key: "tintName", text: "Tint", description: "The tint row's heading and accessible name." },
    { key: "noTint", text: "No tint:  the theme as it is", description: "The tint row's first swatch." },
    { key: "red", text: "Red", description: "A tint's name:  the colour's." },
    { key: "orange", text: "Orange", description: "A tint's name:  the colour's." },
    { key: "yellow", text: "Yellow", description: "A tint's name:  the colour's." },
    { key: "olive", text: "Olive", description: "A tint's name:  the colour's." },
    { key: "green", text: "Green", description: "A tint's name:  the colour's." },
    { key: "teal", text: "Teal", description: "A tint's name:  the colour's." },
    { key: "blue", text: "Blue", description: "A tint's name:  the colour's." },
    { key: "violet", text: "Violet", description: "A tint's name:  the colour's." },
    { key: "purple", text: "Purple", description: "A tint's name:  the colour's." },
    { key: "pink", text: "Pink", description: "A tint's name:  the colour's." },
    { key: "brown", text: "Brown", description: "A tint's name:  the colour's." },
    { key: "grey", text: "Grey", description: "A tint's name:  the colour's." },
    { key: "black", text: "Black", description: "A tint's name:  the colour's." }
  ]
} as const satisfies E.ComponentVocabulary
