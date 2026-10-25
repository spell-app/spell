/**
 * The English vocabulary of `<ui-theme-editor>`:  every name the tag uses.
 * - Its tag, attributes, events, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Most of it is TEXTS:  the editor's panels, fields and choices, and the sample app its preview shows,
 *   each translated in `UIThemeEditor.es.ts`.
 * - Pure data:  `import type` only, so node loads it (`yarn site:data`, `yarn gen:root`).
 */

import type { E } from "spell-ui/core"

/****************
 * ### `themeEditorVocabulary`
 * The names of `<ui-theme-editor>`:  an inspector of a theme's colours, fonts and shapes,
 * a live preview of real elements in light and dark, and the theme as a stylesheet to copy.
 ****************/
export const themeEditorVocabulary = {
  tag: "ui-theme-editor",
  topics: ["forms", "controls", "typography"],
  aka: ["theme editor", "theme builder", "theme creator", "theme generator", "style editor", "design tokens"],
  skeleton: "30 tall",
  noun: "theme editor",
  description:
    "A theme editor makes a theme from an existing one:  pick its colours, fonts and shapes, watch real elements " +
    "follow in light and dark, then copy the stylesheet or keep it in the browser.",
  attributes: [
    {
      name: "base",
      group: "link",
      kind: "string",
      description:
        "The theme to start from (`fruity`, `spell` ...).  None:  the page's own theme, else `fruity`.  " +
        "Picking another one in the editor applies it to the page."
    },
    {
      name: "value",
      group: "form",
      kind: "json",
      reflect: false,
      description:
        'The theme to start with, as `ThemeChoices` (`{"primary": "pink", "corners": "soft"}`).  None:  the ' +
        "theme kept in this browser (`SavedTheme`), else the base theme as it is."
    }
  ],
  events: [
    {
      name: "ui-change",
      detail: "{ value: ThemeChoices, css: string }",
      description: "A choice changed:  `value` is every choice now, `css` the theme as a stylesheet."
    },
    {
      name: "ui-copy",
      detail: "{ css: string }",
      description: "Copy CSS put the stylesheet on the clipboard."
    },
    {
      name: "ui-save",
      detail: "{ value?: ThemeChoices, css: string }",
      description:
        "Use this theme kept it in the browser, for the Spell editor and any page that calls `SavedTheme.restore()`;  " +
        "no `value`:  Stop using forgot it."
    }
  ],
  slots: [],
  parts: [
    { name: "editor", description: "The whole editor:  the inspector beside the preview and the stylesheet." },
    { name: "inspector", description: "The inspector, a `<ui-panel>` of `<ui-property-editor>` fields." },
    { name: "preview", description: "The preview:  a sample app of real elements, in light and dark." },
    { name: "sheet", description: "The stylesheet section, with Copy CSS." }
  ],
  states: [{ name: "saved", description: "The theme it shows is the one kept in this browser (Use this theme)." }],
  texts: [
    { key: "theme", text: "Theme", description: "The inspector's title." },
    {
      key: "themeTip",
      text: "A theme is the look of an app:  its colours, fonts and shapes.  Start from one, and change what you like.",
      description: "The inspector's tip."
    },
    { key: "name", text: "Name", description: "The theme's name field." },
    { key: "nameTip", text: "Names the file:  themes/<name>.css.", description: "The name field's tip." },
    { key: "defaultName", text: "My theme", description: "The name a new theme starts with." },
    { key: "base", text: "Start from", description: "The base theme field." },
    {
      key: "baseTip",
      text: "The theme yours changes.  Each choice below is a change to it;  the rest stays as it is.",
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
    { key: "reset", text: "Reset", description: "A button that puts one choice back to the theme's own." },
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
    { key: "glass", text: "Glass", description: "The glass field (themes with glass:  fruity)." },
    { key: "glassTip", text: "How much of the page shows through cards, menus and panels.", description: "Its tip." },
    { key: "clear", text: "Clear", description: "A glass choice." },
    { key: "frosted", text: "Frosted", description: "A glass choice." },
    { key: "solid", text: "Solid", description: "A glass choice." },
    { key: "use", text: "Use this theme", description: "The button that keeps the theme in the browser." },
    {
      key: "useTip",
      text: "Keep it in this browser:  the Spell editor starts in it.",
      description: "Its tooltip."
    },
    { key: "inUse", text: "In use", description: "The use button, while the theme shown is the one kept." },
    { key: "forget", text: "Stop using", description: "The button that forgets the kept theme." },
    { key: "startOver", text: "Start over", description: "The button that drops every change." },
    { key: "preview", text: "Preview", description: "The preview's title." },
    { key: "previewMode", text: "Preview in", description: "Name of the Both / Light / Dark control." },
    { key: "both", text: "Both", description: "Preview choice:  light and dark side by side." },
    { key: "light", text: "Light", description: "Preview choice, and the light card's label." },
    { key: "dark", text: "Dark", description: "Preview choice, and the dark card's label." },
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
    { key: "progress", text: "Today's habits", description: "Name of the sample progress bar." },
    { key: "css", text: "CSS", description: "The stylesheet section's title." },
    { key: "copy", text: "Copy CSS", description: "The copy button." },
    { key: "copied", text: "Copied", description: "The copy button, just after copying." },
    {
      key: "sheetMade",
      text: "made with Spell UI's theme editor.",
      description: "The stylesheet's first comment, after its file name."
    },
    {
      key: "sheetBase",
      text: 'On the {base} theme:  apply it first (UI.themes.apply("{base}")), then this sheet.',
      description: "The stylesheet's second comment:  which theme it changes."
    },
    { key: "sheetEmpty", text: "No changes yet:  this is {base} as it is.", description: "The stylesheet, unchanged." }
  ]
} as const satisfies E.ComponentVocabulary
