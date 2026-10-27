/**
 * The English vocabulary of `<ui-progress>`:  every name the tag uses.
 * - Its tag, attributes (each with its kind and allowed values), events, slots, parts, states and texts.
 *   The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - The attributes become Fomantic's class words, in Fomantic's order (`ClassBuilder`):
 *   `<ui-progress size="small" color="teal" active indicating attach="top">` =>
 *   `ui small teal active indicating top attached progress`.
 * - `state` and `speed` are `kind: "valueOnly"`:  each emits its value alone, as Fomantic writes `success` / `slow`.
 * - `value` / `percent` are STRINGS:  one number, or a comma list for several bars (`value="10,20,30"`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `progressVocabulary`
 * The names of `<ui-progress>`, a progress bar:  `<div class="ui … progress" part="progress">`,
 * holding one `bar` per value (with an optional `bar-text`) and a `label` below them.
 ****************/
export const progressVocabulary = {
  tag: "ui-progress",
  topics: ["progress", "loading", "feedback", "status", "modules"],
  aka: ["progress bar", "meter", "percent bar", "upload progress"],
  skeleton: "2 tall",
  noun: "progress",
  description: "A progress bar shows the progression of a task.",
  attributes: [
    { name: "size", group: "appearance", kind: "size", description: "Bar height and text size, `mini` ... `massive`." },
    { name: "color", group: "appearance", kind: "color", description: "Hue of the bar." },
    {
      name: "state",
      group: "form",
      kind: "valueOnly",
      values: ["success", "warning", "error"],
      description:
        "Outcome, tinting bar and label;  stops the animations.  Without it a single bar turns `success` at 100%."
    },
    {
      name: "speed",
      group: "states",
      kind: "valueOnly",
      values: ["slow", "fast"],
      description: "With `indeterminate`:  a `slow` or `fast` animation;  absent is normal."
    },
    { name: "active", group: "states", kind: "keyOnly", description: "Shows activity:  a pulse runs along the bar." },
    {
      name: "appearance",
      group: "appearance",
      kind: "multiple",
      values: ["basic"],
      classes: {},
      replaces: [{ from: "basic", value: "basic" }],
      description: "`basic`:  no background behind the bar.  Old name:  `basic`."
    },
    { name: "disabled", group: "states", kind: "keyOnly", description: "Dimmed, animations stopped." },
    {
      name: "indicating",
      group: "appearance",
      kind: "keyOnly",
      description: "The bar's colour follows the percentage, red through green."
    },
    { name: "inverted", group: "appearance", kind: "keyOnly", description: "For dark backgrounds." },
    {
      name: "align",
      group: "layout",
      kind: "valueOnly",
      values: ["right"],
      classes: { right: "right aligned" },
      replaces: [{ from: "right-aligned", value: "right" }],
      description:
        "`right`:  the bar grows from the right;  its text sits at its left end.  Old name:  `right-aligned`."
    },
    {
      name: "indeterminate",
      group: "states",
      kind: "keyOrValueAndKey",
      values: ["filling", "sliding", "swinging"],
      description: "Unknown progress:  a pulsing full bar, or a `filling` / `sliding` / `swinging` one."
    },
    {
      name: "attach",
      group: "layout",
      kind: "valueOnly",
      values: ["both", "top", "bottom"],
      classes: { both: "attached", top: "top attached", bottom: "bottom attached" },
      replaces: [{ from: "attached", value: "both" }],
      description:
        "A thin line joined to the edge of the content above (`bottom`, or `both`) or below (`top`).  " +
        "Old name:  `attached`."
    },
    {
      name: "value",
      group: "form",
      kind: "string",
      description: "Amount done:  a number, or a comma list for several bars.  A share of `total`, else a percentage."
    },
    {
      name: "total",
      group: "content",
      kind: "number",
      description: "What `value` counts up to;  unset, `value` is a percentage."
    },
    {
      name: "percent",
      group: "content",
      kind: "string",
      description: "Percentage done, bypassing `value` / `total`;  a comma list for several bars."
    },
    {
      name: "precision",
      group: "behaviour",
      kind: "number",
      default: 0,
      description: "Decimal places shown in texts."
    },
    {
      name: "bar-text",
      group: "appearance",
      kind: "enum",
      values: ["percent", "ratio"],
      description: "Text inside the bar:  `percent` (`45%`) or `ratio` (`9 of 20`, needs `total`);  unset, none."
    },
    {
      name: "bar-colors",
      group: "content",
      kind: "string",
      description: "Hue per bar, space or comma separated, e.g. `red green blue`;  each wins over `color`."
    },
    {
      name: "label",
      group: "name",
      kind: "string",
      description: "Label under the bar;  `{percent}`, `{value}`, `{total}`, `{left}` are filled in."
    }
  ],
  events: [
    {
      name: "ui-changed",
      detail: "{ percent: number, percents: number[], value?: number, total?: number }",
      description: "The percentage changed (after the first render)."
    },
    {
      name: "ui-completed",
      detail: "{ value?: number, total?: number }",
      description: "The percentage reached 100."
    }
  ],
  slots: [{ name: "", description: "Label content (rich version of `label`);  also the accessible name." }],
  parts: [
    { name: "progress", description: "The track holding the bars." },
    { name: "bar", description: "One bar." },
    { name: "bar-text", description: "Text inside a bar (`bar-text`)." },
    { name: "label", description: "The label under the track." }
  ],
  states: [
    { name: "active", description: "Shows activity." },
    { name: "indeterminate", description: "Unknown progress." },
    { name: "complete", description: "At 100%." },
    { name: "disabled", description: "Dimmed." }
  ],
  texts: [
    { key: "progressPercent", text: "{percent}%", description: '`bar-text="percent"` and the spoken value.' },
    { key: "progressRatio", text: "{value} of {total}", description: '`bar-text="ratio"`.' }
  ]
} as const satisfies E.ComponentVocabulary
