/**
 * The English vocabulary of `<ui-theme-token>`:  every name the tag uses.
 * - The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Pure data:  `import type` only, so node loads it (`yarn site:data`, `yarn gen:root`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `themeTokenVocabulary`
 * The names of `<ui-theme-token>`:  one token of a theme, in `<ui-theme-editor>`'s token tree:  where its value comes
 * from, its colour chips, and a drawer to edit it.
 ****************/
export const themeTokenVocabulary = {
  tag: "ui-theme-token",
  topics: ["forms", "controls"],
  aka: ["theme token", "design token", "token row", "css variable", "custom property editor"],
  skeleton: "2 tall",
  noun: "theme token",
  description:
    "A theme token is one token of a theme being made:  where its value comes from, its value as colour chips in " +
    "light and dark, and, under its name, a drawer to change it.",
  attributes: [
    {
      name: "row",
      group: "content",
      kind: "json",
      reflect: false,
      description:
        "PROPERTY:  what to draw, as `TokenRow` (its name, where its value comes from, its value in each scheme, " +
        "what its drawer offers).  `<ui-theme-editor>` works it out."
    }
  ],
  events: [
    {
      name: "ui-changed",
      detail: '{ token: string, value: string, scheme?: "light" | "dark" }',
      description: "Its drawer set a value:  for `scheme` alone, or (none) for both."
    },
    {
      name: "ui-command",
      detail: '{ token: string, command: "open" | "reset" | "set here" | "split" | "show", place?: string }',
      description:
        "Its name opened or closed its drawer (`open`), a button was pressed (`reset`, `set here`, `split`), or a " +
        "link to another token (`show`, its `place`)."
    }
  ],
  slots: [],
  parts: [
    { name: "row", description: "The row:  its mark, name, readers, buttons and values." },
    { name: "drawer", description: "The drawer under the name, while it's open." }
  ],
  states: [
    { name: "here", description: "The theme sets the token (●)." },
    { name: "open", description: "Its drawer is open." }
  ],
  texts: [
    { key: "setHere", text: "Set here", description: "The button that sets the token in this theme, as it is." },
    { key: "setHereTip", text: "Set it in this theme, as it is now", description: "Its tooltip." },
    { key: "split", text: "Split into light / dark", description: "Give the token a light and a dark value." },
    { key: "edit", text: "Edit {token}", description: "The name's button:  opens the drawer." },
    { key: "light", text: "Light", description: "The light value's name." },
    { key: "dark", text: "Dark", description: "The dark value's name." },
    { key: "base", text: "Base", description: "A mix's base colour." },
    { key: "mixIn", text: "Mixed in", description: "A mix's colour mixed in over the base." },
    { key: "amount", text: "Amount", description: "How much of it is mixed in." },
    { key: "pointsAt", text: "Points at", description: "A pointer's target, in the drawer." },
    {
      key: "pointsAtTip",
      text: "Its value is that token's:  change that one, or set this one here",
      description: "Its tip."
    },
    { key: "value", text: "Value", description: "A value's field." },
    { key: "alpha", text: "Opacity", description: "A colour's opacity field." },
    { key: "readBy", text: "Read by", description: "The pages that read the token." },
    { key: "clear", text: "clear", description: "`transparent`, as a mix's base." }
  ]
} as const satisfies E.ComponentVocabulary
