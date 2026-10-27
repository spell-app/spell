/**
 * The English vocabulary of `<ui-steps>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Class words come out through `ClassBuilder`, in Fomantic's grammar:
 *   `<ui-steps ordered direction="vertical-right" widths="3">` => `ui ordered right vertical three steps`;
 *   `<ui-step selected completed>` => `completed active step` (a step has no `ui`, as Fomantic's `.ui.steps > .step`).
 *   `UIStep.css` keys on those words.
 * - Chosen state:  `selected` is canonical (`AGENTS.md`), its class word Fomantic's `active`;
 *   an `active` ATTRIBUTE is accepted as an alias (the element reads it raw, through `attributes`).
 *   The selected step is the CURRENT one:  `aria-current="step"`.
 * - Content is the generic parts, owned by the step (`ownsParts`):  `<ui-content>`, `<ui-title>`,
 *   `<ui-description>`;  or the shorthands `header` (the title -- NOT `title`, the global tooltip attribute and an
 *   `HTMLElement` property, as the popup's `header`) and `description`.
 */

import type { E } from "spell/ui/core"
import * as UIT from "spell/ui/components/components.types"

/****************
 * ### `stepsVocabulary`
 * The names of `<ui-steps>`, a step group:  `<ol class="ui ... steps" part="steps" role="list">` around the slot.
 ****************/
export const stepsVocabulary = {
  tag: "ui-steps",
  topics: ["navigation", "progress", "status", "elements"],
  aka: ["stepper", "wizard", "progress steps", "checkout steps"],
  skeleton: "5 tall",
  noun: "steps",
  description: "A set of steps shows the progress of an activity in a series of steps.",
  attributes: [
    {
      name: "size",
      group: "appearance",
      kind: "size",
      description: "Size of every step, `mini` ... `massive`;  `medium` is the default."
    },
    {
      name: "color",
      group: "appearance",
      kind: "color",
      description: "Circular steps:  hue of the rings of the current and completed steps (default the positive colour)."
    },
    {
      name: "ordered",
      group: "appearance",
      kind: "keyOnly",
      description: "Numbers each step;  a completed step shows a check instead."
    },
    {
      name: "direction",
      group: "layout",
      kind: "valueOnly",
      values: ["horizontal", "vertical", "vertical-right"],
      classes: { horizontal: "", "vertical-right": "right vertical" },
      replaces: [{ from: "vertical", value: "vertical", values: { right: "vertical-right" } }],
      description:
        "Which way the steps run:  `horizontal` (the default), `vertical` (stacked top to bottom), or " +
        "`vertical-right`, for a group on the right of its content (arrow at left).  Its old name was `vertical` " +
        '(`vertical="right"`).'
    },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["circular"],
      // its words are Fomantic's classes as they are
      classes: {},
      replaces: [{ from: "circular", value: "circular" }],
      description:
        "The look:  `circular` -- Fomantic's circular steps:  a ring per step on a connecting line, the content " +
        "beside it.  Its old name was the bare `circular` switch."
    },
    { name: "fluid", group: "layout", kind: "keyOnly", description: "Takes the full width of its container." },
    {
      name: "equal",
      group: "layout",
      kind: "keyOnly",
      description:
        "Every step the same width, from the steps themselves (no count):  each as wide as the widest;  with " +
        "`fluid`, an equal share of the row each.  Not for `vertical` or `circular` steps (already alike)."
    },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["both", "top", "bottom"],
      classes: { both: "attached", top: "top attached", bottom: "bottom attached" },
      replaces: [{ from: "attached", value: "both" }],
      description:
        "Joined to a segment below (`both`, `top`) or above (`bottom`), overlapping its border.  " +
        "Its old name was `attached`."
    },
    {
      name: "unstackable",
      group: "layout",
      kind: "keyOnly",
      description:
        "Never stacks;  by default steps stack below 768px of the group's width (or the screen's:  `stack-with`)."
    },
    {
      name: "stackable",
      group: "layout",
      kind: "valueAndKey",
      values: ["tablet"],
      description:
        "`stackable=\"tablet\"`:  stacks below 992px (of the group's width, or the screen's), not just 768px."
    },
    {
      name: "stack-with",
      group: "layout",
      kind: "enum",
      values: UIT.StackWithValues,
      description:
        'What stacking (and `stackable="tablet"`) measures:  `container` (the default) -- the group\'s own ' +
        "width;  `page` -- the screen's, as in Fomantic.  Unset:  the page-wide `--ui-stack-with` token " +
        "decides (`<ui-root stack-with>`)."
    },
    {
      name: "widths",
      group: "appearance",
      kind: "width",
      widthClass: "",
      values: ["1", "2", "3", "4", "5", "6", "7", "8"],
      description:
        'Older, count-based alias of `equal fluid`:  divides the group evenly between N steps (`widths="3"` => ' +
        "`three steps`)."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds." }
  ],
  events: [],
  slots: [{ name: "", description: "`<ui-step>`s." }],
  parts: [{ name: "steps", description: "The group box (an `<ol>`)." }],
  states: [
    { name: "steps", description: "ALWAYS set:  the host is a block and the size container `stackable` answers." },
    {
      name: "block",
      description:
        "Set while the group is block-level (`fluid`, or `circular` and not `vertical`):  the HOST carries its outer margin, so it collapses with the content above."
    },
    {
      name: "circular",
      description: 'Set while `appearance="circular"`:  with `block`, the host keeps both margins, even first or last.'
    }
  ],
  texts: []
} as const satisfies E.ComponentVocabulary
