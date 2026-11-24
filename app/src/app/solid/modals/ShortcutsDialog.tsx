import { createMemo, createSignal, For, Show } from "solid-js"
import { render } from "@solidjs/web"

import { UI as SpellUI, UIKeys, type Chord } from "spell/ui"
import { appTexts } from "spell/app/app/ui/AppTexts"
import type { AppTextKey } from "spell/app/app/ui/AppTexts.en"
import { uiReady } from "spell/app/app/solid/loadUI"
import { on } from "spell/app/app/solid/on"
import { EDITOR_HOTKEYS, HOTKEY_GROUPS, type HotkeyGroup, type ListedHotkey } from "spell/app/app/pages/editorHotkeys"

import "./ShortcutsDialog.css"

/****************
 * ### `<ShortcutsDialog>`
 * Help › Keyboard Shortcuts (epic `editor` P36):  every shortcut the editor has, in one dialog to read.
 * - Its rows are the editor's ONE list of shortcuts, `EDITOR_HOTKEYS`, the list its keys run from and its menus show:
 *   a shortcut added there shows here, with no second edit (`shortcutRows()`).
 * - Grouped by where the keys work (`HOTKEY_GROUPS`):  each group a heading, then its rows.
 * - Each row:  what its key does, a note when it works only some of the time, then its keys as key caps
 *   (`<ui-keys>`), the same caps the menus draw, larger and bold here.
 *   - ⌘ ⇧ ⌥ on a Mac, Ctrl, Shift and Alt elsewhere;  a key that's another on a Mac (`mac`) shows that one there.
 *   - Several keys that do the same thing (Delete:  ⌫ or ⌦) each on a line of its own, "or" before the next.
 * - A search field in its title bar, beside its title, focused as it opens (I268):
 *   it narrows the rows to those whose name, heading or keys match ("save", "debug", "F5", "⌘S", "Ctrl S", "Cmd S");
 *   a key, only as a whole chord (J225);
 *   nothing found, it says so.
 * - Its rows on the page's plain surface, not the dialog's see-through glass, so they read easily (I268).
 * - A list to read:  no key changes here (Q48;  epic `editor` T112 holds that).
 * - Closes like every dialog:  its ✕, or Escape (`closedby="closerequest"`:  a click on the dimmer does nothing).
 * - Its rows scroll inside it, the title bar staying put;  the scroll bar at its right edge.
 * - Show one with `openShortcuts()`, which mounts it and cleans up.
 ****************/
export function ShortcutsDialog(props: ShortcutsDialogProps) {
  const [words, setWords] = createSignal("")
  const isApple = () => (props.platform ? props.platform === APPLE : SpellUI.browser.isApple)
  const rows = createMemo(() => shortcutRows(isApple()))
  /** The groups with a row matching what's typed, each with just those rows. */
  const shown = createMemo(() => {
    const query = searchText(words())
    const chord = typedChord(query, isApple())
    return groupsOf(rows().filter((row) => !query || matches(row, query, chord, isApple())))
  })
  let search: HTMLElement | undefined
  return (
    <ui-modal
      class="ShortcutsDialog"
      size="small"
      closedby="closerequest"
      closable=""
      aria-label={appTexts.text("shortcuts")}
      visible=""
      ref={(element: HTMLElement) => {
        element.addEventListener("ui-opened", () => search?.focus(), { once: true })
        element.addEventListener("ui-closed", () => props.onClose(), { once: true })
      }}
    >
      <div class="ShortcutsHeader">
        <h2 class="ShortcutsTitle">{appTexts.text("shortcuts")}</h2>
        <ui-input
          class="ShortcutsSearch"
          type="search"
          icon="search"
          icon-position="left"
          size="small"
          aria-label={appTexts.text("shortcutsSearch")}
          placeholder={appTexts.text("shortcutsSearch")}
          ref={(element: HTMLElement) => {
            search = element
            on<{ value: string }>("ui-typed", (event) => setWords(event.detail.value))(element)
          }}
        />
      </div>
      <div class="ShortcutsList">
        <For each={shown()} keyed={(group) => group.group}>
          {(group) => (
            <section class="ShortcutsGroup" data-group={group().group}>
              <h3>{appTexts.text(HOTKEY_GROUPS[group().group])}</h3>
              <ul>
                <For each={group().rows}>
                  {(row) => (
                    <li class="ShortcutsRow" data-name={row.name}>
                      <span class="ShortcutsWhat">
                        <span class="ShortcutsName">{appTexts.text(row.name)}</span>
                        <Show when={row.where}>
                          {(where) => <span class="ShortcutsWhere">{appTexts.text(where())}</span>}
                        </Show>
                      </span>
                      <span class="ShortcutsKeys">
                        <For each={row.shortcuts}>
                          {(shortcut, index) => (
                            <span class="ShortcutsChord">
                              <Show when={index() > 0}>
                                <span class="ShortcutsOr">{appTexts.text("shortcutsOr")}</span>
                              </Show>
                              <ui-keys shortcut={shortcut} platform={props.platform} />
                            </span>
                          )}
                        </For>
                      </span>
                    </li>
                  )}
                </For>
              </ul>
            </section>
          )}
        </For>
        <Show when={!shown().length}>
          <p class="ShortcutsNone">{appTexts.text("shortcutsNoMatch", { words: words().trim() })}</p>
        </Show>
      </div>
    </ui-modal>
  )
}

/** Props for `<ShortcutsDialog>`. */
export type ShortcutsDialogProps = {
  /** Whose keys to draw:  a Mac's (`apple`) or everyone else's (`other`).  Default:  the reader's own. */
  platform?: ShortcutsPlatform
  /** Called once it has closed. */
  onClose: () => void
}

/** A keyboard the dialog draws keys for:  `<ui-keys platform>`'s words. */
export type ShortcutsPlatform = typeof APPLE | "other"

/** `ShortcutsPlatform`'s Mac. */
const APPLE = "apple"

/**
 * Show the Keyboard Shortcuts dialog;  resolves once it has closed.
 * - Behind `editor.showShortcuts()`:  Help › Keyboard Shortcuts, and ?.
 * - SIDE EFFECT:  a `<div class="ShortcutsDialogRoot">` in `<body>` holding it, until it closes.
 * - One at a time:  asked again while it's open (? pressed with the focus off its search field), it does nothing.
 * - Waits for `uiReady`:  `<ui-modal>` and `<ui-keys>` must be defined before it opens.
 */
export async function openShortcuts(props: { platform?: ShortcutsPlatform } = {}): Promise<void> {
  if (document.querySelector(`.${ROOT_CLASS}`)) return
  // in the page at once, so a second call while Spell UI loads finds it
  const root = document.createElement("div")
  root.className = ROOT_CLASS
  document.body.append(root)
  try {
    await uiReady
  } catch (error) {
    root.remove()
    throw error
  }
  return new Promise<void>((resolve) => {
    const dispose = render(() => <ShortcutsDialog platform={props.platform} onClose={finish} />, root)

    /** Unmount, then resolve. */
    function finish() {
      dispose()
      root.remove()
      resolve()
    }
  })
}

/** What holds the dialog in `<body>`:  `openShortcuts()` opens one at a time. */
const ROOT_CLASS = "ShortcutsDialogRoot"

////////////////
// ## Rows
////////////////

/**
 * The dialog's rows, from `EDITOR_HOTKEYS`, in its order:  one per name in a group.
 * - Shortcuts with the same name and group are one row, with each one's keys:  Delete is Backspace or Delete.
 * - Each key as a Mac (`isApple`) or another keyboard has it:  a shortcut's `mac`, when it has one, on a Mac.
 * - Pure:  the coverage test reads it too.
 */
export function shortcutRows(isApple: boolean): ShortcutRow[] {
  const rows: ShortcutRow[] = []
  for (const hotkey of Object.values(EDITOR_HOTKEYS) as ListedHotkey[]) {
    const shortcut = (isApple && hotkey.mac) || hotkey.shortcut
    const same = rows.find((row) => row.group === hotkey.group && row.name === hotkey.name)
    if (same) same.shortcuts.push(shortcut)
    else rows.push({ group: hotkey.group, name: hotkey.name, where: hotkey.where, shortcuts: [shortcut] })
  }
  return rows
}

/** One row of the dialog:  what a key does, where, and its keys. */
export type ShortcutRow = {
  /** Where it works:  its heading. */
  group: HotkeyGroup
  /** What it does:  a key of the editor's texts. */
  name: AppTextKey
  /** Where it works, when that's narrower than its group. */
  where?: AppTextKey
  /** Each shortcut that does it, in Spell UI's words:  a `<ui-keys shortcut>` each. */
  shortcuts: string[]
}

/** `rows` under their headings, in `HOTKEY_GROUPS`' order;  a group with none left out. */
function groupsOf(rows: readonly ShortcutRow[]): { group: HotkeyGroup; rows: ShortcutRow[] }[] {
  return (Object.keys(HOTKEY_GROUPS) as HotkeyGroup[])
    .map((group) => ({ group, rows: rows.filter((row) => row.group === group) }))
    .filter((group) => group.rows.length)
}

/**
 * Does `row` match `query` (`searchText()`'s):  its name, its heading, or its keys as drawn?
 * - Words:  anywhere in its name or heading, in the page's language.
 * - Keys as drawn, a whole chord:  its caps run together (`⌘S`), a space apart (`Ctrl S`) or joined by `+`
 *   (`Ctrl+S`);  whole, so "Ctrl S" isn't Ctrl Shift R's too.
 * - Or keys named either way (`chord`, `typedChord()`'s):  "Cmd S" is ⌘S, "Option Cmd N" ⌥⌘N, "Shift Ctrl R"
 *   Ctrl Shift R, in any order;  still the whole chord.
 */
function matches(row: ShortcutRow, query: string, chord: Chord | undefined, isApple: boolean): boolean {
  const words = [appTexts.text(row.name), appTexts.text(HOTKEY_GROUPS[row.group])]
  if (words.some((text) => searchText(text).includes(query))) return true
  return row.shortcuts.some((shortcut) =>
    chordsOf(shortcut, isApple).some(
      (it) =>
        capsTexts(it, isApple).some((text) => searchText(text) === query) ||
        (chord !== undefined && sameChord(it, chord))
    )
  )
}

/** `shortcut`'s chords, read for a Mac (`isApple`) or another keyboard:  `"mod+alt+ArrowUp mod+alt+ArrowDown"` => two. */
function chordsOf(shortcut: string, isApple: boolean): Chord[] {
  return shortcut
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => SpellUI.keyboard.chord(text, { isApple }))
}

/** `chord` as its caps are drawn:  `mod+S` => `⌘S`, `⌘ S`, `⌘+S` on a Mac. */
function capsTexts(chord: Chord, isApple: boolean): string[] {
  const caps = UIKeys.capsOf(chord, isApple, (word) => SpellUI.i18n.t(word, undefined, KEYS_TAG))
  return [caps.join(""), caps.join(" "), caps.join("+")]
}

/**
 * What's typed (`searchText()`'s), read as a chord:  "cmd s", "⌥⌘N", "ctrl + shift + r";  `undefined` when it isn't one.
 * - Modifiers as words a chord reads (Ctrl, Control, Cmd, Command, Alt, Option, Shift, Mod) or as a Mac's symbols,
 *   a space or `+` between them.
 * - NEVER throws.
 */
function typedChord(query: string, isApple: boolean): Chord | undefined {
  if (!query) return undefined
  const spaced = query.replace(/[⌘⌥⇧⌃]/g, (symbol) => ` ${MODIFIER_SYMBOLS[symbol]} `)
  const parts = spaced.split(/[\s+]+/).filter(Boolean)
  if (!parts.length) return undefined
  try {
    return SpellUI.keyboard.chord(parts.join("+"), { isApple })
  } catch {
    // not a chord:  words only
    return undefined
  }
}

/** Are `a` and `b` the same keys:  the same key, with the same modifiers in any order? */
function sameChord(a: Chord, b: Chord): boolean {
  return (
    a.key === b.key && a.modifiers.length === b.modifiers.length && a.modifiers.every((it) => b.modifiers.includes(it))
  )
}

/** A Mac's modifier symbols, as the modifiers a chord reads. */
const MODIFIER_SYMBOLS: Readonly<Record<string, string>> = { "⌘": "meta", "⌥": "alt", "⇧": "shift", "⌃": "ctrl" }

/** What's typed or shown, for matching:  lower case, its spaces one each. */
function searchText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase()
}

/** The key caps' tag, whose texts hold their words (Ctrl, Shift ...). */
const KEYS_TAG = "ui-keys"
