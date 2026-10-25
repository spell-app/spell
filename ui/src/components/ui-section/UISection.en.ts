/**
 * The English vocabulary of `<ui-section>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell-ui/vocabulary`).
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-section color="teal" dividing sticky>` => `ui teal dividing sticky section`.
 * - Not class words, which the component draws or reads instead:
 *   - the strings and numbers:  `label`, `hint`, `description`, `level`, `badge`, `offset`, `height`
 *   - the booleans:  `collapsible`, `collapsed`
 *   - `fold-icon`
 * - `source` (`UIT.LoadableBody*`):  the content comes from a file the first time the section unfolds.
 *   Spread in here, so a subclass reusing this vocabulary (`<ui-panel>`) has it too.
 * - `collapsed` is CONTROLLED, like the accordion's `open`:  set it to fold or unfold.
 *   `ui-opening` / `ui-closing` can veto a person's change.
 * - Its words match `<ui-field>`'s (epic `property-editor` P10, decision Q12):
 *   - `label`, `hint`, `description`
 *   - events in pairs:  `ui-closing` then `ui-closed`
 *   - states `nested` and `in-group`
 *   - Its old words (`header`, `subhead`, `info`, `ui-opening`, `ui-closing`, `ui-loaded`) went in epic `repo-split` P14 (Q45).
 */

import type { E } from "spell-ui/core"
import * as UIT from "spell-ui/components/components.types"

/****************
 * ### `sectionVocabulary`
 * The names of `<ui-section>`, a titled block of content that can fold.
 * Its `<section class="ui … section" part="section">` holds:
 * - its title bar:  `<hN>` with the icon, label and a fold button, then the badge and actions
 * - an optional hint, then the content
 ****************/
export const sectionVocabulary = {
  tag: "ui-section",
  topics: ["layout", "containers"],
  aka: ["section", "panel", "collapsible", "disclosure", "fieldset", "expander"],
  // a title over its content, as a segment's skeleton
  skeleton: "header, paragraph",
  noun: "section",
  description: "A section is a titled block of content that can close and keep its title in view.",
  attributes: [
    {
      name: "label",
      group: "name",
      kind: "string",
      description: 'Title text;  a slotted `slot="label"` is the rich version (code, links).'
    },
    {
      name: "hint",
      group: "form",
      kind: "string",
      description: 'Smaller text under the title;  scrolls away with the content, never sticks.  Or `slot="hint"`.'
    },
    {
      name: "level",
      group: "appearance",
      kind: "enum",
      values: ["1", "2", "3", "4", "5", "6"],
      description:
        "Heading level of the title (`<h1>` ... `<h6>`);  default:  the enclosing section's level + 1, else 2 " +
        "(under the page's `h1`)."
    },
    {
      name: "parent",
      group: "layout",
      kind: "string",
      description:
        "Id of the `<ui-section>` (or `<ui-sections>`) this one nests in, when it's written outside it " +
        '(`parent="setup"`):  it joins it, in page order, as if nested there.'
    },
    {
      name: "icon",
      group: "content",
      kind: "icon",
      description: 'Icon name, before the title;  a slotted `slot="icon"` (a `<ui-icon>`, anything) replaces it.'
    },
    {
      name: "badge",
      group: "content",
      kind: "string",
      description: 'A small pill after the title, e.g. a count (`3/7`);  `slot="badge"` is the rich version.'
    },
    {
      name: "description",
      group: "content",
      kind: "string",
      description:
        "A tip about the section, shown under the title bar while the pointer is on the title (or the open / close button " +
        'has keyboard focus);  it describes the title.  `slot="description"` is the rich version (bold words, line ' +
        "breaks)."
    },
    {
      name: "collapsible",
      group: "behaviour",
      kind: "boolean",
      description:
        "The title opens and closes the content:  a button with `aria-expanded`.  Default:  on inside " +
        '`<ui-sections collapsing>`, sub-sections included;  `collapsible="false"` opts out there.'
    },
    {
      name: "collapsed",
      group: "states",
      kind: "boolean",
      description:
        "Closed:  only the title shows.  Controlled:  set it to close or open;  `ui-opening` / `ui-closing` can veto " +
        "a person's changes.  Find-in-page opens a match."
    },
    {
      name: "fold-icon",
      group: "appearance",
      kind: "enum",
      values: ["start", "end"],
      description:
        "With `collapsible`:  where the open / close chevron sits:  `start`, before the title (the default), or `end`, at " +
        "the far end of the title bar, after the badge and actions (a click on it closes and opens too)."
    },
    {
      name: "sticky",
      group: "behaviour",
      kind: "keyOnly",
      description:
        "The title bar sticks while the section is on screen;  a sticky section inside another sticks just below " +
        "its title."
    },
    {
      name: "offset",
      group: "layout",
      kind: "number",
      default: 0,
      description:
        "With `sticky`:  pixels between the top edge and a TOP-LEVEL section's stuck title (e.g. a page header's " +
        "height);  nested sections work theirs out."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Hue of the title (and of the rule or box edge)."
    },
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Text size of the CONTENT, `mini` ... `massive`;  the title keeps its level's size."
    },
    { name: "dividing", group: "appearance", kind: "keyOnly", description: "A rule under the title." },
    { name: "block", group: "layout", kind: "keyOnly", description: "The title bar in a tinted box." },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["bordered", "styled", "raised", "basic"],
      // each word draws itself:  no key after it
      classes: {},
      replaces: [
        { from: "bordered", value: "bordered" },
        { from: "styled", value: "styled" },
        { from: "raised", value: "raised" },
        { from: "basic", value: "basic" }
      ],
      description:
        "The look, several words at once:  `bordered` (a box around the section, as a segment), `styled` (boxed " +
        "as a styled accordion:  a tinted title bar over padded content), `raised` (with a box:  lifted with a " +
        "shadow), `basic` (no box, rule or tint, whatever else is set).  Old names:  `bordered`, `styled`, " +
        "`raised`, `basic`."
    },
    {
      name: "padding",
      group: "layout",
      kind: "valueOnly",
      values: ["compact", "md", "lg"],
      classes: { md: "padded", lg: "very padded" },
      replaces: [
        { from: "compact", value: "compact" },
        { from: "padded", value: "md", values: { very: "lg" } }
      ],
      description:
        "`compact`:  less padding and space around the title;  `md` / `lg`:  more padding in the content.  Old " +
        'names:  `compact`, `padded` (`padded="very"` is `lg`).'
    },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["both", "top", "bottom"],
      classes: { both: "attached", top: "top attached", bottom: "bottom attached" },
      replaces: [{ from: "attached", value: "both" }],
      description:
        "With a box:  joined edge to edge with the box above (`top`), below (`bottom`), or both (`both`, between " +
        "two).  Old name:  `attached` (bare is `both`)."
    },
    {
      name: "scrolling",
      group: "layout",
      kind: "keyOrValueAndKey",
      values: ["short", "very short", "long", "very long"],
      description: "The content has a capped height and scrolls;  `short` ... `very long` scale the cap."
    },
    {
      name: "height",
      group: "layout",
      kind: "string",
      description:
        "The content's cap, any CSS length (`20em`, `300px`):  above it the content scrolls (implies `scrolling`)."
    },
    {
      name: "align",
      group: "layout",
      kind: "textAlign",
      values: ["left", "center", "right"],
      replaces: ["text-align"],
      description: "Aligns the TITLE `left`, `center` or `right`.  Old name:  `text-align`."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds:  the dark scheme." },
    {
      name: "loading",
      group: "states",
      kind: "keyOnly",
      description: "Dims the content under a spinner;  `aria-busy`."
    },
    {
      name: "disabled",
      group: "states",
      kind: "keyOnly",
      description: "Dimmed and inert;  can't be closed or opened."
    },
    ...UIT.SourceBodyAttributes
  ],
  events: [
    {
      name: "ui-opening",
      detail: "{ open: boolean, section: Element, originalEvent?: Event }",
      cancelable: true,
      description:
        "About to open:  the title was activated, or find-in-page matched inside (not cancelable then, " +
        "`cancelable: false`).  Cancel to stay closed."
    },
    {
      name: "ui-opened",
      detail: "{ open: boolean, section: Element }",
      description: "Opened, by any route:  the title, the page removing `collapsed`, find-in-page."
    },
    {
      name: "ui-closing",
      detail: "{ open: boolean, section: Element, originalEvent?: Event }",
      cancelable: true,
      description: "About to close:  the title was activated.  Cancel to stay open."
    },
    {
      name: "ui-closed",
      detail: "{ open: boolean, section: Element }",
      description: "Closed, by any route:  the title, or the page setting `collapsed`."
    },
    ...UIT.SourceBodyEvents
  ],
  slots: [
    { name: "", description: "The content:  anything, nested `<ui-section>`s included." },
    { name: "label", description: "Rich title, instead of the `label` attribute." },
    { name: "hint", description: "Rich hint, instead of the `hint` attribute." },
    { name: "icon", description: "Icon before the title, instead of the `icon` attribute (a `<ui-icon>`, an image)." },
    { name: "badge", description: "Rich badge, instead of the `badge` attribute (e.g. a `<ui-label>`)." },
    { name: "actions", description: "Controls at the right of the title bar (buttons, a menu);  never close it." },
    { name: "description", description: "Rich tip, instead of the `description` attribute (bold words, line breaks)." }
  ],
  parts: [
    { name: "section", description: "The section box." },
    { name: "title", description: "The title bar:  sticks with `sticky`." },
    { name: "heading", description: "The `<h1>` ... `<h6>`." },
    {
      name: "toggle",
      description: "With `collapsible`:  the `<button>` inside the heading that opens and closes the section."
    },
    {
      name: "fold-icon",
      description:
        'With `collapsible`:  the chevron, in the toggle;  with `fold-icon="end"`, at the end of the title bar.'
    },
    { name: "icon", description: "The icon box." },
    { name: "header", description: "The title text box." },
    { name: "badge", description: "The badge pill." },
    { name: "actions", description: "The actions box, at the right of the title bar." },
    {
      name: "tip",
      description: "With `description`:  the tip, under the title bar, shown on hover and keyboard focus."
    },
    { name: "subhead", description: "The hint under the title." },
    { name: "content", description: "The content box:  `size`, `scrolling` and `height` apply here." },
    ...UIT.SourceBodyParts
  ],
  states: [
    { name: "collapsed", description: "Closed." },
    { name: "stuck", description: "With `sticky`:  the title bar is stuck to the top." },
    { name: "animated", description: "Opens and closes with a height transition (`interpolate-size`)." },
    { name: "nested", description: "Nested in another section." },
    { name: "in-group", description: "Directly in a `<ui-sections>` group (no section between)." },
    {
      name: "in-section",
      description: "Directly in another section (its part's state);  `nested` counts one through a group too."
    },
    { name: "in-sections", description: "Directly in a `<ui-sections>` group (its part's state), as `in-group`." },
    { name: "inverted", description: "In the dark scheme." },
    { name: "loading", description: "Busy:  `loading`, or a `source` body that is slow to arrive." },
    { name: "disabled", description: "Dimmed and inert." },
    ...UIT.SourceBodyStates
  ],
  texts: [
    { key: "loading", text: "Loading…", description: "Announced while `loading`." },
    { key: "closeSection", text: "Close this section", description: "Tooltip of the open / close button while open." },
    { key: "openSection", text: "Open this section", description: "Tooltip of the open / close button while closed." },
    ...UIT.SourceFailureTexts
  ],
  ownsParts: ["section"]
} as const satisfies E.ComponentVocabulary
