/**
 * The English vocabulary of `<ui-theme-editor>`:  every name the tag uses.
 * - Its tag, attributes, events, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Most of it is TEXTS:  the bar, the Basics, the token tree, the sample app, each translated in
 *   `UIThemeEditor.es.ts`.
 * - Pure data:  `import type` only, so node loads it (`yarn site:data`, `yarn gen:root`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `themeEditorVocabulary`
 * The names of `<ui-theme-editor>`:  a theme's big choices and every token it sets, real pages (or a sample app)
 * wearing it live in light and dark, and the theme as a theme file to copy.
 ****************/
export const themeEditorVocabulary = {
  tag: "ui-theme-editor",
  topics: ["forms", "controls", "typography"],
  aka: [
    "theme editor",
    "theme builder",
    "theme bench",
    "theme creator",
    "theme generator",
    "style editor",
    "design tokens",
    "token tuner"
  ],
  skeleton: "30 tall",
  noun: "theme editor",
  description:
    "A theme editor makes a theme from an existing one:  pick its colours, fonts and shapes, or set any token by " +
    "hand, watch real pages follow in light and dark, then copy the theme file or keep it in the browser.",
  attributes: [
    {
      name: "base",
      group: "link",
      kind: "string",
      description: "The theme to start from (`fruity`, `spell` ...).  None:  the page's own theme, else `fruity`."
    },
    {
      name: "value",
      group: "form",
      kind: "json",
      reflect: false,
      description:
        'The theme to start with, as `ThemeChoices` (`{"primary": "pink", "corners": "soft"}`).  None:  the ' +
        "theme being made in this browser, else the one kept (`SavedTheme`), else the base theme as it is."
    },
    {
      name: "pages",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "PROPERTY:  the real pages to preview, each in a frame wearing the theme as it changes (`PreviewPage[]`:  " +
        "`id`, `label`, `url`, `width`, `reach`, `icon` ...).  None:  a sample app, and the page itself " +
        "wears the theme."
    }
  ],
  events: [
    {
      name: "ui-changed",
      detail: "{ value: ThemeChoices, css: string }",
      description: "A choice changed:  `value` is every choice now, `css` the theme's sheet, worn over its base."
    },
    {
      name: "ui-copied",
      detail: "{ text: string }",
      description: "Copy changes put the theme file's JSON5 on the clipboard."
    },
    {
      name: "ui-saved",
      detail: "{ value?: ThemeChoices, css: string }",
      description:
        "Stop using forgot the theme kept in this browser (`SavedTheme`), which the Spell editor wore over its base;  " +
        "`value` is never sent now."
    }
  ],
  slots: [],
  parts: [
    { name: "editor", description: "The whole editor:  the bar, the preview, and the side column." },
    {
      name: "bar",
      description:
        "The top bar, one line:  its title, Light / Dark / Both, the pages on or off, the theme, how they show."
    },
    { name: "basics", description: "The Basics:  the theme's name and base, and its big choices." },
    { name: "tokens", description: "Every token, in the theme file's groups." },
    { name: "token", description: "One token's row:  its name, which pages read it, its control." },
    { name: "pages", description: "The previewed pages' grid." },
    { name: "page", description: "One previewed page:  its title row and its frames." },
    { name: "preview", description: "The sample app, light and dark, when no pages are given." },
    { name: "changes", description: "The theme file's text, with Copy changes." }
  ],
  states: [{ name: "changed", description: "Something is changed:  a Basic, or a token set by hand." }],
  texts: [
    { key: "label", text: "Theme editor", description: "The bar's title, and the editor's accessible name." },
    {
      key: "lede",
      text: "Tune a token and watch them all follow.",
      description: "The title's tooltip."
    },
    { key: "theme", text: "Theme", description: "The bar's theme row:  the theme it builds on." },
    { key: "basics", text: "Basics", description: "The side column's first section:  the big choices." },
    {
      key: "basicsTip",
      text: "A theme is the look of an app:  its colours, fonts and shapes.  Each choice here sets many tokens.",
      description: "The Basics' tip."
    },
    { key: "name", text: "Name", description: "The theme's name field." },
    { key: "nameTip", text: "Names the file:  <name>.theme.json5.", description: "The name field's tip." },
    { key: "defaultName", text: "My theme", description: "The name a new theme starts with." },
    { key: "base", text: "Builds on", description: "The base theme field." },
    {
      key: "baseTip",
      text: "The theme yours changes.  Each choice is a change to it;  the rest stays as it is.",
      description: "The base theme field's tip."
    },
    { key: "color", text: "Color", description: "The colour band." },
    { key: "colorTip", text: "The colour of each job in the app, in light and dark.", description: "Its tip." },
    { key: "primary", text: "Primary", description: "The primary colour field." },
    {
      key: "primaryTip",
      text: "The main action colour:  buttons, checkmarks, progress and focus.",
      description: "Its tip."
    },
    { key: "secondary", text: "Secondary", description: "The secondary colour field." },
    { key: "secondaryTip", text: "Second-choice buttons and quieter highlights.", description: "Its tip." },
    { key: "background", text: "Background", description: "The background tint field." },
    {
      key: "backgroundTip",
      text: "Tints the page behind everything, and the wallpaper of a theme that has one.",
      description: "Its tip."
    },
    { key: "own", text: "Theme's own", description: "A choice that keeps what the base theme has." },
    { key: "red", text: "Red", description: "A colour's name." },
    { key: "orange", text: "Orange", description: "A colour's name." },
    { key: "yellow", text: "Yellow", description: "A colour's name." },
    { key: "olive", text: "Olive", description: "A colour's name." },
    { key: "green", text: "Green", description: "A colour's name." },
    { key: "teal", text: "Teal", description: "A colour's name." },
    { key: "blue", text: "Blue", description: "A colour's name." },
    { key: "violet", text: "Violet", description: "A colour's name." },
    { key: "purple", text: "Purple", description: "A colour's name." },
    { key: "pink", text: "Pink", description: "A colour's name." },
    { key: "brown", text: "Brown", description: "A colour's name." },
    { key: "grey", text: "Grey", description: "A colour's name." },
    { key: "black", text: "Black", description: "A colour's name." },
    { key: "type", text: "Type", description: "The type band." },
    {
      key: "typeTip",
      text: "The fonts and the text size.  Every font is already on people's computers:  nothing downloads.",
      description: "Its tip."
    },
    { key: "headingFont", text: "Headings", description: "The heading font field." },
    { key: "headingFontTip", text: "The font of titles and headings.", description: "Its tip." },
    { key: "bodyFont", text: "Body", description: "The body font field." },
    { key: "bodyFontTip", text: "The font of everything else:  labels, buttons, paragraphs.", description: "Its tip." },
    { key: "system", text: "System", description: "A font:  the platform's own (San Francisco on a Mac)." },
    { key: "rounded", text: "Rounded", description: "A font:  the platform's rounded one." },
    { key: "serif", text: "Palatino", description: "A font:  Palatino, Spell's serif." },
    { key: "georgia", text: "Georgia", description: "A font." },
    { key: "humanist", text: "Optima", description: "A font:  Optima, else Candara." },
    { key: "verdana", text: "Verdana", description: "A font." },
    { key: "mono", text: "Monospace", description: "A font:  the platform's monospace." },
    { key: "textSize", text: "Text size", description: "The text size field." },
    {
      key: "textSizeTip",
      text: "The size of everyday text.  Everything else grows and shrinks with it, headings and buttons included.",
      description: "Its tip."
    },
    {
      key: "reset",
      text: "Reset",
      description: "A button that puts one choice, or one token, back to the theme's own."
    },
    { key: "shape", text: "Shape", description: "The shape band." },
    { key: "shapeTip", text: "How rounded things are, and how much they lift off the page.", description: "Its tip." },
    { key: "corners", text: "Corners", description: "The corners field." },
    { key: "cornersTip", text: "How rounded buttons, fields and cards are.", description: "Its tip." },
    { key: "sharp", text: "Sharp", description: "A corner choice." },
    { key: "soft", text: "Soft", description: "A corner choice, and a depth choice." },
    { key: "round", text: "Round", description: "A corner choice." },
    { key: "pill", text: "Pill", description: "A corner choice." },
    { key: "depth", text: "Depth", description: "The depth field." },
    { key: "depthTip", text: "How far cards, menus and popups lift off the page.", description: "Its tip." },
    { key: "flat", text: "Flat", description: "A depth choice." },
    { key: "lifted", text: "Lifted", description: "A depth choice." },
    { key: "glass", text: "Glass", description: "The glass field (the glass themes:  glass, fruity)." },
    { key: "glassTip", text: "How much of the page shows through cards, menus and panels.", description: "Its tip." },
    { key: "clear", text: "Clear", description: "A glass choice." },
    { key: "frosted", text: "Frosted", description: "A glass choice." },
    { key: "solid", text: "Solid", description: "A glass choice." },
    { key: "forget", text: "Stop using", description: "The button that forgets the kept theme." },
    {
      key: "forgetTip",
      text: "Forget the theme kept in this browser:  the Spell editor stops wearing it",
      description: "Its tooltip."
    },
    { key: "startOver", text: "Start over", description: "The button that drops every change." },
    {
      key: "startOverTip",
      text: "Drop every change but the name and the theme it builds on",
      description: "Its tooltip."
    },
    { key: "pages", text: "Pages", description: "Accessible name of the bar's page toggles." },
    { key: "showPageTip", text: "Show {page}", description: "A page's toggle, while it's off." },
    { key: "hidePageTip", text: "Hide {page}", description: "A page's toggle, while it's on." },
    { key: "themeTip", text: "Build on {theme}", description: "Each theme in the bar's theme row:  its tooltip." },
    { key: "schemes", text: "Schemes", description: "Accessible name of the schemes' menu." },
    { key: "both", text: "Both", description: "Light and dark side by side:  pages, samples and token values." },
    { key: "bothTip", text: "Light and dark side by side", description: "Its tooltip." },
    { key: "light", text: "Light", description: "Light alone;  the light half of a pair;  the light sample's label." },
    { key: "lightTip", text: "Light only", description: "Its tooltip." },
    { key: "dark", text: "Dark", description: "Dark alone;  the dark half of a pair;  the dark sample's label." },
    { key: "darkTip", text: "Dark only", description: "Its tooltip." },
    { key: "phone", text: "Phone", description: "The bar's toggle:  every page at a phone's width." },
    {
      key: "phoneTip",
      text: "Phone:  every page at a phone's width, in its phone layout",
      description: "The phone toggle's tooltip."
    },
    {
      key: "swap",
      text: "Swap light and dark",
      description: "The bar's button, beside Both:  every pair's light and dark sides change places."
    },
    {
      key: "swapTip",
      text: "Light dark · dark light:  the darks side by side.  Press to put the lights side by side",
      description: "Its tooltip, while not swapped."
    },
    {
      key: "swappedTip",
      text: "Dark light · light dark:  the lights side by side.  Press to put the darks side by side",
      description: "Its tooltip, while swapped."
    },
    {
      key: "moveTip",
      text: "Drag to move this page;  or Alt+← / Alt+→",
      description: "A page's title row's tooltip:  how to move it in the grid."
    },
    {
      key: "scrollBack",
      text: "Scroll back",
      description: "The bar's ‹, while some of its row is out of sight before."
    },
    { key: "scrollOn", text: "Scroll on", description: "The bar's ›, while some of its row is out of sight after." },
    { key: "reload", text: "Reload", description: "Reload one page's frames (its title row's icon)." },
    { key: "reloadTip", text: "Reload this page", description: "Its tooltip:  the other pages stay as they are." },
    { key: "open", text: "Open in a tab", description: "Open a page in a tab of its own." },
    {
      key: "openTip",
      text: "Open this page in a tab of its own, in the theme and scheme shown",
      description: "Its tooltip."
    },
    {
      key: "loadingPage",
      text: "Loading the page…",
      description: "Over a page's frame until it's drawn in the theme."
    },
    { key: "unreachable", text: "This page can't be reached.", description: "A page's frame, when it isn't running." },
    { key: "tokens", text: "Every token", description: "The side column's token tree." },
    {
      key: "tokensTip",
      text: "Each token the theme sets, as its file nests them.  One set here wins over the Basics.",
      description: "The token tree's tip."
    },
    { key: "themeTitle", text: "{theme} Theme", description: "The token tree's header:  the theme shown." },
    { key: "searchTip", text: "Search the tokens", description: "The header's search toggle:  the search row." },
    {
      key: "infoTip",
      text: "Read by, and what the marks mean",
      description: "The header's info toggle:  the pane of which pages read each token, and the marks."
    },
    { key: "find", text: "Find a token", description: "Placeholder of the token filter." },
    { key: "loading", text: "Reading the theme files…", description: "Shown while the theme files load." },
    { key: "failed", text: "The theme files didn't load:  {error}", description: "Shown when they can't." },
    { key: "groupOwn", text: "The theme's own", description: "Group:  the theme's private tokens (`own`)." },
    { key: "groupTypography", text: "Type", description: "Group:  `typography`." },
    { key: "groupSizes", text: "Sizes", description: "Group:  `sizes`." },
    { key: "groupSpacing", text: "Spacing", description: "Group:  `spacing`." },
    { key: "groupRadii", text: "Corners", description: "Group:  `radii`." },
    { key: "groupText", text: "Text", description: "Group:  `text`." },
    { key: "groupSurfaces", text: "Surfaces", description: "Group:  the page, panels and bars (`surfaces`)." },
    { key: "groupBorders", text: "Borders", description: "Group:  `borders`." },
    { key: "groupBrand", text: "Brand and focus", description: "Group:  `brand`." },
    { key: "groupSemantic", text: "Feedback", description: "Group:  positive, negative ... (`semantic`)." },
    { key: "groupHues", text: "Palette", description: "Group:  the named hues (`hues`)." },
    { key: "groupShadows", text: "Shadows", description: "Group:  `shadows`." },
    { key: "groupCode", text: "Code", description: "Group:  `code`, the code's colours (epic `debut` P22)." },
    { key: "groupMotion", text: "Motion", description: "Group:  `motion`." },
    { key: "groupComponents", text: "Components", description: "Group:  each family's own tokens (`components`)." },
    {
      key: "pageOwn",
      text: "The {page}'s own",
      description:
        "Group:  a previewed page's own tokens (the editor's `--spell-*`), in its own sheet, not a theme file."
    },
    { key: "buildsOn", text: "Builds on", description: "The marks' legend:  what the theme shown extends." },
    { key: "foundation", text: "Spell UI", description: "What a theme that extends none builds on." },
    { key: "setHere", text: "Set here", description: "A token this theme sets (●), and the button that sets it here." },
    {
      key: "setHereTip",
      text: "Set it in this theme, as it is now",
      description: "The Set here button's tooltip:  the value doesn't change."
    },
    {
      key: "setHereMark",
      text: "Set here:  this theme gives the value",
      description: "The filled dot's tooltip."
    },
    { key: "fromBase", text: "from {base}", description: "A token the theme leaves to what it builds on (○)." },
    {
      key: "fromMark",
      text: "From {base}:  inherited, untouched",
      description: "The hollow dot's tooltip."
    },
    { key: "backToBase", text: "Back to {base}'s value", description: "Drop this theme's own value of a token." },
    { key: "pointsAt", text: "points at", description: "A token whose value is another token's (↳)." },
    { key: "derived", text: "derived", description: "A token worked out from others (ƒ)." },
    { key: "over", text: "over", description: 'A colour mix in words:  "accent 15% over clear".' },
    { key: "clearWord", text: "clear", description: "`transparent`, in a colour mix in words." },
    { key: "amount", text: "Amount", description: "Accessible name of a colour mix's amount slider." },
    {
      key: "groupCount",
      text: "{set} set here · {from} from {base}",
      description: "A group's title band:  how many of its tokens the theme sets."
    },
    { key: "setHereOnly", text: "Set here only", description: "The filter's chip:  only the tokens set here." },
    {
      key: "setHereOnlyTip",
      text: "Only the tokens this theme sets:  what it changes on {base}",
      description: "The chip's tooltip."
    },
    {
      key: "pointerAll",
      text: "Change {place} for everything using it",
      description: "A pointer's pick:  change the token it points at."
    },
    { key: "pointerThis", text: "Set this one", description: "A pointer's pick:  set this token alone." },
    { key: "cancel", text: "Cancel", description: "Drop a pick." },
    { key: "usedBy", text: "Used by:  {tokens}", description: "A colour's tooltip:  the tokens pointing at it." },
    { key: "expandAll", text: "Expand all", description: "The token tree's toggle, while a branch is folded." },
    { key: "collapseAll", text: "Collapse all", description: "The token tree's toggle, once every branch is open." },
    { key: "readBy", text: "Read by", description: "Accessible name of a token's row of the pages that read it." },
    { key: "readsTip", text: "{place} reads it", description: "A reader's tip:  the page reads the token." },
    {
      key: "overridesTip",
      text: "{place} reads it (also set on its own elements)",
      description: "A reader's tip:  the page also sets the token below its root, where the theme doesn't reach."
    },
    {
      key: "overridesLegend",
      text: "the page also sets it on its own elements",
      description: "The legend's half dot:  what it marks on an icon."
    },
    {
      key: "overridesLegendTip",
      text: "The page also sets it on its own elements:  a theme doesn't reach those",
      description: "The legend's half dot's tip."
    },
    {
      key: "split",
      text: "Split into light / dark",
      description: "Give a token a light and a dark value of its own, each with its own control."
    },
    { key: "alpha", text: "Opacity", description: "Accessible name of a colour's opacity slider." },
    { key: "value", text: "Value", description: "Accessible name of a token's text field." },
    {
      key: "unset",
      text: "Not set in {theme}:  each element's own",
      description: "A token's empty field:  the theme doesn't set it, so each element uses its own default."
    },
    { key: "changes", text: "Changes", description: "The theme file's section." },
    { key: "copy", text: "Copy changes", description: "The copy button:  the theme file's JSON5." },
    { key: "copied", text: "Copied", description: "The copy button, just after copying." },
    { key: "noChanges", text: "No changes yet:  this is {base} as it is.", description: "The changes, while none." },
    {
      key: "fileMade",
      text: "a theme on {base}, made with Spell UI's theme editor.",
      description: "The theme file's first comment, after its file name."
    },
    {
      key: "fileMerge",
      text: 'Save it beside the themes, or merge its values into {base}.theme.json5 (and drop "extends").',
      description: "The theme file's second comment:  how to use it."
    },
    {
      key: "sheetMade",
      text: "made with Spell UI's theme editor.",
      description: "The sheet's first comment, after its file name."
    },
    {
      key: "sheetBase",
      text: 'On the {base} theme:  apply it first (UI.themes.apply("{base}")), then this sheet.',
      description: "The sheet's second comment:  which theme it changes."
    },
    {
      key: "pageOwnSheet",
      text: "the previewed pages' own tokens, for their own sheets",
      description: "The comment over the rule of the pages' own tokens."
    },
    { key: "appTitle", text: "Habit Tracker", description: "The sample app's title." },
    { key: "today", text: "Today", description: "The sample app's card title." },
    { key: "habitWater", text: "Drink water", description: "A sample habit." },
    { key: "habitRead", text: "Read", description: "A sample habit." },
    { key: "habitMove", text: "Move", description: "A sample habit." },
    { key: "newHabit", text: "New habit…", description: "The sample app's field placeholder." },
    { key: "add", text: "Add", description: "The sample app's primary button." },
    { key: "remind", text: "Remind me", description: "The sample app's toggle." },
    { key: "basicButton", text: "Basic", description: "The sample app's basic button." },
    { key: "live", text: "Live", description: "A sample label." },
    { key: "streak", text: "7-day streak.", description: "The sample message's bold start." },
    { key: "streakMore", text: "Keep it going:  one habit left today.", description: "The rest of the message." },
    { key: "progress", text: "Today's habits", description: "Name of the sample progress bar." }
  ]
} as const satisfies E.ComponentVocabulary
