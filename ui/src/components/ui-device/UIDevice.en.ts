/**
 * The English vocabulary of `<ui-device>`:  every name the tag uses.
 * The shape is `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `deviceVocabulary`
 * The names of `<ui-device>`:  a phone, tablet or desktop drawn round what it holds, at that device's size.
 ****************/
export const deviceVocabulary = {
  tag: "ui-device",
  icon: "mobile",
  topics: ["containers", "media", "overlays"],
  aka: ["device frame", "phone frame", "mockup", "device mockup", "screen preview", "simulator", "bezel"],
  noun: "device",
  partOfSpeech: "structure",
  description:
    "A device draws a phone, tablet or desktop round what it holds, at that device's screen size, " +
    "with buttons in its thick bottom edge.",
  skeleton: "12 x 24",
  attributes: [
    {
      name: "device",
      group: "appearance",
      kind: "enum",
      values: ["phone", "tablet", "desktop"],
      default: "phone",
      description:
        "Which device:  a `phone` (390 by 844), a `tablet` (820 by 1180) or a `desktop`, a laptop's screen " +
        "(1280 by 800).  What it holds is drawn at that size, scaled down to fit."
    },
    {
      name: "orientation",
      group: "appearance",
      kind: "enum",
      values: ["portrait", "landscape"],
      default: "portrait",
      description:
        "Held upright (`portrait`) or on its side (`landscape`).  A desktop is always wide, whatever this says."
    },
    {
      name: "controls",
      group: "behaviour",
      kind: "enum",
      values: ["all", "rotate", "device", "none"],
      default: "all",
      description:
        "Its own buttons in its bottom edge:  `all` -- Rotate and the phone / tablet / desktop switch;  " +
        "`rotate` or `device` -- only that one;  `none` -- neither.  A desktop never shows Rotate."
    },
    {
      name: "modal",
      group: "behaviour",
      kind: "boolean",
      description:
        "Shown as a modal:  the device alone, floating over the dimmed page, no box round it " +
        '(a `<ui-modal appearance="basic">`).  It then starts hidden, as a modal does:  `visible` shows it, and ' +
        "Escape, a click on the dimmer or a Cancel button hide it."
    },
    {
      name: "closedby",
      group: "behaviour",
      kind: "enum",
      values: ["any", "closerequest", "none"],
      default: "any",
      property: "closedBy",
      description:
        "With `modal`:  what dismisses it, as `<ui-modal closedby>`:  `any` -- Escape or a click on the dimmer;  " +
        "`closerequest` -- Escape only;  `none` -- only its own buttons."
    }
  ],
  events: [
    {
      name: "ui-changed",
      detail:
        '{ device: "phone" | "tablet" | "desktop", orientation: "portrait" | "landscape", originalEvent?: Event }',
      description:
        "A person changed the device or turned it, with its own buttons;  `device` and `orientation` say what it is now."
    },
    {
      name: "ui-opened",
      detail: "{ visible: true }",
      description: "With `modal`:  shown, its entry transition finished."
    },
    {
      name: "ui-closed",
      detail: "{ visible: false }",
      description: "With `modal`:  hidden, its exit transition finished."
    }
  ],
  slots: [
    { name: "", description: "What the device's screen shows, drawn at the screen's size." },
    {
      name: "buttons",
      description:
        "Buttons in its thick bottom edge, after its own:  a `cancel` (or `deny`) one hides a modal device, as a " +
        "modal's own does."
    }
  ],
  parts: [
    { name: "device", description: "The device's body, round the screen and the bottom edge." },
    { name: "screen", description: "The screen:  what the device holds, at the device's size." },
    { name: "buttons", description: "The thick bottom edge, holding its own buttons and the slotted ones." },
    { name: "rotate", description: "The Rotate button." },
    { name: "switch", description: "The phone / tablet / desktop switch." },
    { name: "modal", description: 'With `modal`:  the `<ui-modal appearance="basic">` it floats in.' }
  ],
  states: [
    { name: "phone", description: "It's a phone." },
    { name: "tablet", description: "It's a tablet." },
    { name: "desktop", description: "It's a desktop." },
    { name: "landscape", description: "It's on its side (a desktop always is)." }
  ],
  texts: [
    { key: "rotate", text: "Rotate", description: "The Rotate button's name and tooltip." },
    { key: "switch", text: "Device", description: "What a screen reader calls the phone / tablet / desktop switch." },
    { key: "phone", text: "Phone", description: "The switch's phone button." },
    { key: "tablet", text: "Tablet", description: "The switch's tablet button." },
    { key: "desktop", text: "Desktop", description: "The switch's desktop button." }
  ]
} as const satisfies E.ComponentVocabulary
