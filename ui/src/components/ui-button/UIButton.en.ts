/**
 * Every name `<ui-button>`, `<ui-buttons>` and `<ui-or>` use:  tags, attributes (kind + allowed values),
 * events, slots, parts, states, texts.  Schema:  `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-button size="small" primary basic>` => `ui small basic primary button`.  `UIButton.css` keys on those words.
 * - Group context needs NO element help:  `<ui-buttons basic>` renders `ui basic buttons`,
 *   and `UIButton.css` hands the look to its children through inherited tokens.
 * - `primary` / `secondary` / `positive` / `negative` are values of `color` (epic `ui-gaps` P4, Owen's request r1);
 *   their old switches (`<ui-button primary>`) still work, and every colour remaps `--ui-color` (`colors.css`).
 * - The looks are words of `appearance` (`basic`, `tertiary`, `circular`), the padding a value of `padding`;
 *   each old switch still works, through the attribute's `replaces`.
 */

import type { E } from "spell-ui/core"
import { ATTACH_CLASSES, COLOR_SWITCHES } from "./UIButton.types"

/****************
 * ### `<ui-button>`
 * A button:  a semantic `<button>` (or `<a>` with `link`) in the shadow root.
 ****************/
export const buttonVocabulary = {
  tag: "ui-button",
  formControl: true,
  topics: ["buttons", "basic", "controls", "forms", "elements"],
  aka: ["btn", "action", "submit", "link button"],
  skeleton: "inline 6 x 2.5",
  noun: "button",
  plural: "buttons",
  description: "A button indicates a possible action.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      default: "medium",
      description: "How big it is, from `mini` to `massive`.  The default is `medium`."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      replaces: COLOR_SWITCHES,
      description:
        "Its hue:  it fills the button, or only its ring and text when `basic`.  " +
        "`primary` and `secondary` are the brand's colours.  " +
        "`positive` and `negative` say what pressing it does.  " +
        "Those four also work written alone, their old names."
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      // the words are the classes:  no key after them (`ClassBuilder`)
      classes: {},
      values: ["basic", "tertiary", "circular"],
      replaces: [
        { from: "basic", value: "basic" },
        { from: "tertiary", value: "tertiary" },
        { from: "circular", value: "circular" }
      ],
      description:
        "The look, several words at once.  " +
        "`basic` is less pronounced:  transparent, with a hairline ring.  " +
        "`tertiary` is the least:  text only, underlined on hover.  " +
        "`circular` is pill-shaped, and round when it holds only an icon.  " +
        "Each word also works written alone, its old name."
    },
    {
      name: "inverted",
      group: "appearance",
      kind: "keyOnly",
      description: "For dark backgrounds:  an outline that fills on hover."
    },
    {
      name: "toggle",
      group: "appearance",
      kind: "keyOnly",
      description:
        "Each click turns `selected` on or off, and `aria-pressed` with it.  " +
        "It sends `ui-selected` or `ui-deselected` as it turns."
    },
    {
      name: "selected",
      group: "states",
      kind: "keyOnly",
      key: "active",
      replaces: ["active"],
      description: "Pressed / on;  with `toggle`, in the positive colour.  Its old name is `active`."
    },
    {
      name: "active-text",
      group: "states",
      kind: "string",
      description:
        "The text shown while `selected`, instead of the content:  `Following`.  " +
        "It's Fomantic's `state` behaviour.  " +
        "With either state text the label says the state, so a toggle button leaves `aria-pressed` off " +
        "(WAI-ARIA APG)."
    },
    {
      name: "inactive-text",
      group: "states",
      kind: "string",
      description:
        "The text shown while NOT `selected`, instead of the content:  `Follow`.  " +
        "It's Fomantic's `state` behaviour, as `active-text` is."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Can't be used;  dimmed and inert." },
    {
      name: "loading",
      group: "states",
      kind: "keyOnly",
      description: "Shows a spinner in place of the content;  `aria-busy`."
    },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Takes the full width of its container." },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["none", "compact"],
      classes: { none: "unpadded" },
      replaces: [
        { from: "compact", value: "compact" },
        { from: "unpadded", value: "none" }
      ],
      description:
        "Room inside it:  `compact` (reduced) or `none` (hugs its content).  Old names:  `compact`, `unpadded`."
    },
    {
      name: "wrap",
      group: "appearance",
      kind: "keyOnly",
      key: "wrapped",
      replaces: ["wrapped"],
      description:
        "Lets a long text wrap onto more lines.  Without it, a button's text stays on one line.  " +
        "Its old name is `wrapped`."
    },
    {
      name: "ellipsis",
      group: "appearance",
      kind: "keyOnly",
      description:
        "One line, cut off with `…` where it doesn't fit.  " +
        "It needs a width to cut at:  `fluid`, a width of its own, or a narrow parent (it's never wider than that)."
    },
    {
      name: "labeled",
      group: "appearance",
      kind: "keyOrValueAndKey",
      values: ["left", "right"],
      description:
        'With `icon`, the icon gets a block of its own:  at the start, or at the end with `labeled="right"`.  ' +
        'With `badge`, it picks which side the badge goes:  the end, or the start with `labeled="left"`.'
    },
    {
      name: "reveal",
      group: "appearance",
      kind: "valueOnly",
      values: ["slide", "fade", "vertical"],
      classes: { slide: "animated", fade: "fade animated", vertical: "vertical animated" },
      replaces: [{ from: "animated", value: "slide" }],
      description:
        "On hover, it brings the `icon` slot in over the content, the way its value names:  `slide` is sideways.  " +
        "Its old name is `animated`."
    },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["both", "top", "bottom", "left", "right"],
      classes: ATTACH_CLASSES,
      replaces: [{ from: "attached", value: "both" }],
      description:
        "Joins it to the edge of a segment or another element:  the side its value names, or `both`.  " +
        "Its old name is `attached`."
    },
    {
      name: "icon",
      group: "content",
      kind: "icon",
      description:
        "Its icon, by name:  Font Awesome's, or Fomantic's aliases.  " +
        "With no text, it's an icon button, with square padding (the `icon` class).  " +
        "With `labeled`, it's a `labeled icon` button."
    },
    {
      name: "icon-position",
      group: "content",
      kind: "enum",
      values: ["left", "right"],
      description:
        "Which side of the text the icon goes:  `left` (the default) or `right`.  " +
        "`right` is Fomantic's right icon, as in `Next →`.  " +
        "The space between them is `--ui-button-icon-spacing`.  " +
        "A labeled icon block takes its side from `labeled` instead."
    },
    {
      name: "label",
      group: "content",
      kind: "string",
      replaces: ["content"],
      description:
        "The button's text, written as an attribute instead of in the default slot.  " +
        "Children in the slot win.  " +
        "Its old name is `content`.  " +
        "NOTE:  `label` used to be the joined badge, which is `badge` now."
    },
    {
      name: "badge",
      group: "content",
      kind: "string",
      description:
        "A badge joined to the button, such as a count:  it draws a `ui labeled button` round the button.  " +
        "It used to be `label`, which is the button's text now, so it has no old name."
    },
    {
      name: "type",
      group: "appearance",
      kind: "enum",
      values: ["button", "submit", "reset"],
      default: "button",
      description: "What it does in a form, as the native `<button type>`.  `submit` calls `form.requestSubmit()`."
    },
    {
      name: "commandfor",
      group: "behaviour",
      kind: "string",
      property: "commandFor",
      description:
        "The id of the element `command` acts on, as the native `<button commandfor>`.  " +
        "It's looked up in the button's own tree.  " +
        "The inner button gets the element itself (`commandForElement`), since a shadow button can't see " +
        "a light-DOM id.  " +
        "In a browser without invoker commands (`UI.browser.supports.invokers`), " +
        "a click runs the built-in commands itself."
    },
    {
      name: "command",
      group: "behaviour",
      kind: "string",
      description:
        "The invoker command to run, as the native `<button command>`.  " +
        "A dialog takes `show-modal / close / request-close`, " +
        "a popover `show-popover / hide-popover / toggle-popover`.  " +
        "Any other is a custom `--name`, which the target hears as a `command` event.  " +
        "`<ui-modal>` answers `--show / --close / --toggle`."
    },
    {
      name: "link",
      group: "link",
      kind: "string",
      replaces: ["href"],
      description: "Renders a link (`<a>`) styled as a button.  Its old name is `href`."
    },
    { name: "target", group: "link", kind: "string", description: "Link target, with `link`." },
    {
      name: "download",
      group: "link",
      kind: "string",
      description:
        "With `link`:  downloads the file instead of opening it, as the native `<a download>`;  a value names the " +
        "saved file."
    },
    {
      name: "name",
      group: "name",
      kind: "string",
      description: "Form field name submitted with the button's `value`."
    },
    {
      name: "value",
      group: "form",
      kind: "string",
      description: "Form value submitted when this button submits the form."
    }
  ],
  events: [
    {
      name: "ui-selected",
      detail: "{ active: true, originalEvent?: Event }",
      description: "A `toggle` button turned `selected` on.  NOTE: plain clicks are the native `click`."
    },
    {
      name: "ui-deselected",
      detail: "{ active: false, originalEvent?: Event }",
      description: "A `toggle` button turned `selected` off."
    }
  ],
  slots: [
    { name: "", description: "Content, usually text;  instead of the `label` attribute." },
    { name: "icon", description: "Icon, instead of the `icon` attribute;  the hidden content of `reveal`." },
    { name: "label", description: "The joined badge's content, instead of the `badge` attribute." }
  ],
  parts: [
    { name: "button", description: "The inner `<button>` (or `<a>`)." },
    { name: "icon", description: "The icon box." },
    { name: "label", description: "The joined badge of a `badge` button." }
  ],
  states: [
    { name: "active", description: "Pressed / on (`selected`)." },
    { name: "disabled", description: "Can't be used." },
    { name: "loading", description: "Busy." },
    { name: "fluid", description: "The host is block-level:  `fluid`, or attached top, bottom or both (`attach`)." },
    { name: "ellipsis", description: "Cuts its text off with `…`:  the host is never wider than its parent." }
  ],
  texts: [{ key: "loading", text: "Loading…", description: "Announced while `loading`." }]
} as const satisfies E.ComponentVocabulary
