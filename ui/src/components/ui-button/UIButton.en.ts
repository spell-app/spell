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
      description: "Size, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      replaces: COLOR_SWITCHES,
      description:
        "Hue;  fills the button (or its ring and text when `basic`).  `primary` and `secondary` are the brand's, " +
        "`positive` and `negative` say what pressing it does.  Old names:  `primary`, `secondary`, `positive`, " +
        "`negative` written alone."
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
        "The look, several words at once:  `basic` (less pronounced:  transparent with a hairline ring), " +
        "`tertiary` (least pronounced:  text only, underlined on hover), `circular` (pill shaped;  round when it " +
        "holds only an icon).  Old names:  `basic`, `tertiary`, `circular` written alone."
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
      description: "Toggles `selected` on click, with `aria-pressed`;  dispatches `ui-selected` / `ui-deselected`."
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
        "Fomantic's `state` behaviour:  the text while `selected` (`Following`), instead of the content.  With " +
        "either state text the label carries the state, so a `toggle` drops `aria-pressed` (WAI-ARIA APG)."
    },
    {
      name: "inactive-text",
      group: "states",
      kind: "string",
      description: "Fomantic's `state` behaviour:  the text while NOT `selected` (`Follow`), instead of the content."
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
        'With `icon`:  the icon in its own block, `labeled` (start) or `labeled="right"`.  ' +
        'With `badge`:  which side the badge goes, `labeled` (end) or `labeled="left"`.'
    },
    {
      name: "reveal",
      group: "appearance",
      kind: "valueOnly",
      values: ["slide", "fade", "vertical"],
      classes: { slide: "animated", fade: "fade animated", vertical: "vertical animated" },
      replaces: [{ from: "animated", value: "slide" }],
      description:
        "Brings the `icon` slot in over the content on hover:  `slide` (sideways), `fade` or `vertical`.  " +
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
        "Joined to the edge of a segment or another element:  `top`, `bottom`, `left`, `right`, or `both`.  " +
        "Its old name is `attached`."
    },
    {
      name: "floated",
      group: "layout",
      kind: "valueAndKey",
      values: "floats",
      description: "Floats `left` or `right`."
    },
    {
      name: "icon",
      group: "content",
      kind: "icon",
      description:
        "Icon name (Font Awesome, Fomantic aliases allowed).  With no text content the button gets the " +
        "`icon` class (square padding);  with `labeled` it becomes a `labeled icon` button."
    },
    {
      name: "icon-position",
      group: "content",
      kind: "enum",
      values: ["left", "right"],
      description:
        "Which side of the text the icon goes:  `left` (default) or `right` (Fomantic's `right` icon, e.g. " +
        "`Next →`), spaced by `--ui-button-icon-spacing`.  A `labeled` icon block takes its side from `labeled`."
    },
    {
      name: "label",
      group: "content",
      kind: "string",
      replaces: ["content"],
      description:
        "Shorthand for the button's text, instead of the default slot;  slotted children win.  " +
        "Its old name is `content`.  NOTE:  `label` used to be the joined badge, now `badge`."
    },
    {
      name: "badge",
      group: "content",
      kind: "string",
      description:
        "Shorthand for a joined badge, e.g. a count;  renders `ui labeled button` around the button.  " +
        "It was `label` (no old name:  `label` is the text now)."
    },
    {
      name: "type",
      group: "appearance",
      kind: "enum",
      values: ["button", "submit", "reset"],
      default: "button",
      description: "Form behaviour, as the native `<button type>`;  `submit` calls `form.requestSubmit()`."
    },
    {
      name: "commandfor",
      group: "behaviour",
      kind: "string",
      property: "commandFor",
      description:
        "Invoker commands, as the native `<button commandfor>`:  the id of the element `command` acts on, looked up " +
        "in the button's own tree (the inner `<button>` gets it as `commandForElement`, since a shadow button can't " +
        "see a light-DOM id).  Without browser support (`UI.browser.supports.invokers`) a click runs the built-in " +
        "commands itself."
    },
    {
      name: "command",
      group: "behaviour",
      kind: "string",
      description:
        "Invoker commands, as the native `<button command>`:  `show-modal` / `close` / `request-close` on a " +
        "`<dialog>`, `show-popover` / `hide-popover` / `toggle-popover` on a popover, or a custom `--name` that " +
        "the target hears as a `command` event (`<ui-modal>` answers `--show`, `--close`, `--toggle`)."
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
    { name: "fluid", description: "The host is block-level:  `fluid`, or `attach` `top` / `bottom` / `both`." },
    { name: "left-floated", description: 'The host floats left (`floated="left"`).' },
    { name: "right-floated", description: 'The host floats right (`floated="right"`).' },
    { name: "ellipsis", description: "Cuts its text off with `…`:  the host is never wider than its parent." }
  ],
  texts: [{ key: "loading", text: "Loading…", description: "Announced while `loading`." }]
} as const satisfies E.ComponentVocabulary
