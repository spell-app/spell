import { For } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E, UI } from "spell-ui/core"
import { keysVocabulary } from "./UIKeys.en"

import keysCSS from "./UIKeys.css?inline"

/****************
 * ### `<ui-keys>`
 * The component behind `<ui-keys>`:  a keyboard shortcut as key caps (epic `ui-gaps` P9).
 *
 * - `<ui-keys shortcut="mod+S">`:  ⌘ S on a Mac, Ctrl S elsewhere, the caps 1px apart.
 *   - `mod` (or `modifier`) is ⌘ on a Mac and Ctrl elsewhere, as the runtime's `Chord` reads it;
 *     `meta` is the Meta key itself.
 *   - Two shortcuts, a space apart (`"mod+Z shift+mod+Z"`), draw both.
 * - Screen readers hear words, not symbols:  the whole is named "Command S" (`aria-label`, its texts translatable),
 *   the caps hidden.
 * - Whose keyboard:  the reader's (`UI.browser.isApple`, once the runtime has loaded), or `platform`.
 * - It only DRAWS a shortcut:  listening for it is the page's (`UI.keyboard`).
 ****************/
export class UIKeys extends E.UIComponent<typeof keysVocabulary> {
  @E.proto static vocabulary = keysVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { keys: keysCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** A Mac's keys:  `platform="apple"`, or the reader's own Apple device. */
  get isApple(): boolean {
    const { platform } = this
    if (platform === APPLE) return true
    if (platform === OTHER) return false
    return this.isReady && UI.browser.isApple
  }

  /** Each shortcut written, as its keys:  `"mod+S shift+mod+Z"` => `[["mod", "S"], ["shift", "mod", "Z"]]`. */
  @E.derived
  get chords(): readonly (readonly string[])[] {
    return (this.shortcut ?? "")
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((chord) => UIKeys.keysOf(chord))
  }

  /** What a screen reader says:  "Command S, or Command Shift Z". */
  get spokenName(): string | undefined {
    const spoken = this.chords.map((keys) => keys.map((key) => this.spokenKey(key)).join(" "))
    return spoken.length ? spoken.join(`, ${this.translationForKey("or")} `) : undefined
  }

  render(): JSX.Element {
    return (
      <kbd class={this.rootClass} part={this.partForName("keys")} aria-label={this.spokenName} role="img">
        <For each={this.chords}>
          {(keys) => (
            <span class={CHORD} aria-hidden="true">
              <For each={keys}>
                {(key) => (
                  <kbd class={KEY} part={this.partForName("key")}>
                    {this.capFor(key)}
                  </kbd>
                )}
              </For>
            </span>
          )}
        </For>
      </kbd>
    )
  }

  /** What one key's cap shows:  `mod` => ⌘ or Ctrl, `up` => ↑, `s` => S. */
  capFor(key: string): string {
    return UIKeys.capOf(key, this.isApple)
  }

  /** What a screen reader says for one key:  `mod` => "Command" or "Control", a letter as itself. */
  private spokenKey(key: string): string {
    const name = UIKeys.nameOf(key)
    const text = (this.isApple ? APPLE_SPOKEN : OTHER_SPOKEN)[name]
    if (text) return this.translationForKey(text)
    return this.capFor(key)
  }

  /**
   * One shortcut's keys, as written:  `"shift+mod+Z"` => `["shift", "mod", "Z"]`;  `"mod++"` ends in the `+` key.
   * - Spell UI's one reading of a shortcut's keys, with `nameOf()`:  `<ui-action>` draws its caps through it too.
   * - STATIC:  pure.
   */
  static keysOf(chord: string): string[] {
    return chord.split(/(?<=.)\+/).filter(Boolean)
  }

  /**
   * A key's name, lowercased, its aliases resolved:  `Cmd` => `meta`, `modifier` => `mod`, `Esc` => `escape`.
   * - STATIC:  pure.
   */
  static nameOf(key: string): string {
    const name = key.trim().toLowerCase()
    return ALIASES[name] ?? name
  }

  /**
   * What `key`'s cap shows on a Mac (`isApple`) or elsewhere:  `mod` => ⌘ or Ctrl, `meta` => ⌘ or Meta, `s` => S.
   * - Spell UI's one set of caps:  `<ui-action>` draws its shortcut's through it too.
   * - STATIC:  pure.
   */
  static capOf(key: string, isApple: boolean): string {
    const name = UIKeys.nameOf(key)
    const caps = isApple ? APPLE_CAPS : OTHER_CAPS
    return caps[name] ?? (name.length === 1 ? name.toUpperCase() : key.trim())
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIKeys extends E.AttributeValues<typeof keysVocabulary> {}

/** `platform`'s Mac. */
const APPLE = "apple"

/** `platform`'s everyone else. */
const OTHER = "other"

/** A chord's box. */
const CHORD = "chord"

/** One cap's class. */
const KEY = "key"

/** Other spellings of a key's name. */
const ALIASES: Record<string, string> = {
  modifier: "mod",
  cmd: "meta",
  command: "meta",
  control: "ctrl",
  option: "alt",
  esc: "escape",
  return: "enter",
  arrowup: "up",
  arrowdown: "down",
  arrowleft: "left",
  arrowright: "right",
  del: "delete",
  spacebar: "space",
  " ": "space"
}

/** A Mac's caps. */
const APPLE_CAPS: Record<string, string> = {
  mod: "⌘",
  meta: "⌘",
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
  enter: "↩",
  escape: "esc",
  tab: "⇥",
  backspace: "⌫",
  delete: "⌦",
  space: "Space",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→"
}

/** Everyone else's caps. */
const OTHER_CAPS: Record<string, string> = {
  mod: "Ctrl",
  meta: "Meta",
  ctrl: "Ctrl",
  alt: "Alt",
  shift: "Shift",
  enter: "Enter",
  escape: "Esc",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Del",
  space: "Space",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→"
}

/** A Mac's modifiers, as text keys. */
const APPLE_SPOKEN: Record<string, "command" | "control" | "option" | "shift"> = {
  mod: "command",
  meta: "command",
  ctrl: "control",
  alt: "option",
  shift: "shift"
}

/** Everyone else's modifiers, as text keys. */
const OTHER_SPOKEN: Record<string, "control" | "alt" | "shift" | "meta"> = {
  mod: "control",
  meta: "meta",
  ctrl: "control",
  alt: "alt",
  shift: "shift"
}
