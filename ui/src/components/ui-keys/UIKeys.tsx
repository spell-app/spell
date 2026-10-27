import { For } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E, UI } from "spell-ui/core"
import { keysVocabulary, type KeyCapText } from "./UIKeys.en"

import keysCSS from "./UIKeys.css?inline"

/****************
 * ### `<ui-keys>`
 * The component behind `<ui-keys>`:  a keyboard shortcut as key caps (epic `ui-gaps` P9).
 *
 * - `<ui-keys shortcut="mod+S">`:  ⌘ S on a Mac, Ctrl S elsewhere, the caps 1px apart.
 *   - Read as the runtime's `Chord` reads every shortcut (`UI.keyboard.chord()`):
 *     `mod` (or `modifier`) is ⌘ on a Mac and Ctrl elsewhere;  `meta` is the Meta key itself.
 *   - Its keys in the order written;  two shortcuts, a space apart (`"mod+Z shift+mod+Z"`), draw both.
 *   - A shortcut it can't read draws nothing, and warns.
 * - Spell UI's ONE set of key caps (`capsOf()`):  `<ui-action>` draws its shortcut's through it too.
 *   - A symbol where the keyboard prints one (⌘ ⇧ ↩ on a Mac, the arrows everywhere),
 *     else a word in the page's language (Ctrl, Shift:  its texts).
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

  /**
   * Each shortcut written, read for this keyboard:  `"mod+S shift+mod+Z"` => two chords.
   * - A shortcut it can't read (`hyper+K`) is left out, with a warning.
   * - Once the runtime has loaded (the content draws then):  none before.
   */
  @E.derived
  get chords(): readonly E.Chord[] {
    if (!this.isReady) return []
    const isApple = this.isApple
    const chords: E.Chord[] = []
    for (const text of (this.shortcut ?? "").split(/[\s,]+/).filter(Boolean)) {
      try {
        chords.push(UI.keyboard.chord(text, { isApple }))
      } catch (error) {
        E.Warnings.warn("<ui-keys>", `can't read the shortcut ${JSON.stringify(text)}`, error)
      }
    }
    return chords
  }

  /** What a screen reader says:  "Command S, or Command Shift Z". */
  get spokenName(): string | undefined {
    const spoken = this.chords.map((chord) => this.spokenChord(chord))
    return spoken.length ? spoken.join(`, ${this.translationForKey("or")} `) : undefined
  }

  render(): JSX.Element {
    return (
      <kbd class={this.rootClass} part={this.partForName("keys")} aria-label={this.spokenName} role="img">
        <For each={this.chords}>
          {(chord) => (
            <span class={CHORD} aria-hidden="true">
              <For each={this.capsFor(chord)}>
                {(cap) => (
                  <kbd class={KEY} part={this.partForName("key")}>
                    {cap}
                  </kbd>
                )}
              </For>
            </span>
          )}
        </For>
      </kbd>
    )
  }

  /** What `chord`'s caps show on this keyboard:  `mod+S` => `⌘ S` or `Ctrl S`. */
  capsFor(chord: E.Chord): string[] {
    return UIKeys.capsOf(chord, this.isApple, (word) => this.translationForKey(word))
  }

  /** What a screen reader says for `chord`:  its modifiers as words ("Command", "Control"), then its key's cap. */
  private spokenChord(chord: E.Chord): string {
    const spoken = this.isApple ? APPLE_SPOKEN : OTHER_SPOKEN
    const words = chord.modifiers.map((modifier) => this.translationForKey(spoken[modifier]))
    return [...words, this.capsFor(chord).at(-1)].join(" ")
  }

  /**
   * The caps that draw `chord` on a Mac (`isApple`) or elsewhere:  its modifiers in the order written, then its key.
   * - Each a symbol, or a word through `translate`:  the drawing component's texts (`keyShift` => "Shift").
   * - A key the table has no cap for:  a letter upper-cased (`S`), else the key as written (`PageUp`).
   * - Spell UI's ONE set of caps:  `<ui-action>` draws its shortcut's through it too, its vocabulary holding the same
   *   words (`keyCapTexts`).
   * - STATIC:  pure.
   */
  static capsOf(chord: E.Chord, isApple: boolean, translate: (word: KeyCapText) => string): string[] {
    const caps = isApple ? APPLE_CAPS : OTHER_CAPS
    const { key, keyText } = chord
    const keyCap = capOf(key, key.length === 1 ? key.toUpperCase() : keyText)
    return [...chord.modifiers.map((modifier) => capOf(modifier, modifier)), keyCap]

    /** `name`'s cap from the table, else `written`. */
    function capOf(name: string, written: string): string {
      const cap = caps[name]
      if (cap === undefined) return written
      return typeof cap === "string" ? cap : translate(cap.word)
    }
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

/** A key's cap:  a symbol, drawn as it is;  or a word, by the text the page's language says it with. */
type Cap = string | { readonly word: KeyCapText }

/** A Mac's caps, by the key's name as `Chord` reads it (a modifier, or the lowercased `KeyboardEvent.key`). */
const APPLE_CAPS: Readonly<Record<string, Cap>> = {
  meta: "⌘",
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
  enter: "↩",
  escape: "esc",
  tab: "⇥",
  backspace: "⌫",
  delete: "⌦",
  " ": { word: "keySpace" },
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→"
}

/** Everyone else's caps:  words, but for the arrows. */
const OTHER_CAPS: Readonly<Record<string, Cap>> = {
  meta: { word: "keyMeta" },
  ctrl: { word: "keyControl" },
  alt: { word: "keyAlt" },
  shift: { word: "keyShift" },
  enter: { word: "keyEnter" },
  escape: { word: "keyEscape" },
  tab: { word: "keyTab" },
  backspace: { word: "keyBackspace" },
  delete: { word: "keyDelete" },
  " ": { word: "keySpace" },
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→"
}

/** A Mac's modifiers, as a screen reader says them (text keys). */
const APPLE_SPOKEN: Readonly<Record<E.ChordModifier, "command" | "control" | "option" | "shift">> = {
  meta: "command",
  ctrl: "control",
  alt: "option",
  shift: "shift"
}

/** Everyone else's modifiers, as a screen reader says them (text keys). */
const OTHER_SPOKEN: Readonly<Record<E.ChordModifier, "control" | "alt" | "shift" | "meta">> = {
  meta: "meta",
  ctrl: "control",
  alt: "alt",
  shift: "shift"
}
