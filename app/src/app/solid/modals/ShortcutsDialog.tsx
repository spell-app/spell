import { createMemo, createSignal, For, Show } from "solid-js"
import { render } from "@solidjs/web"

import { UI as SpellUI, UIKeys } from "spell/ui"
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
 *   (`<ui-keys>`), the same caps the menus draw.
 *   - ⌘ ⇧ ⌥ on a Mac, Ctrl, Shift and Alt elsewhere;  a key that's another on a Mac (`mac`) shows that one there.
 * - A search field at the top, focused as it opens:  it narrows the rows to those whose name, heading or keys
 *   as drawn match ("save", "debug", "F5", "⌘S", "Ctrl S");  nothing found, it says so.
 * - A list to read:  no key changes here (Q48;  epic `editor` T112 holds that).
 * - Closes like every dialog:  its ✕, or Escape (`closedby="closerequest"`:  a click on the dimmer does nothing).
 * - Scrolls inside itself, the search field staying put, on a short window.
 * - Show one with `openShortcuts()`, which mounts it and cleans up.
 ****************/
export function ShortcutsDialog(props: ShortcutsDialogProps) {
  const [words, setWords] = createSignal("")
  const isApple = () => (props.platform ? props.platform === APPLE : SpellUI.browser.isApple)
  const rows = createMemo(() => shortcutRows(isApple()))
  /** The groups with a row matching what's typed, each with just those rows. */
  const shown = createMemo(() => {
    const query = searchText(words())
    return groupsOf(rows().filter((row) => !query || matches(row, query, isApple())))
  })
  let search: HTMLElement | undefined
  return (
    <ui-modal
      class="ShortcutsDialog"
      size="small"
      closedby="closerequest"
      closable=""
      heading={appTexts.text("shortcuts")}
      visible=""
      ref={(element: HTMLElement) => {
        element.addEventListener("ui-opened", () => search?.focus(), { once: true })
        element.addEventListener("ui-closed", () => props.onClose(), { once: true })
      }}
    >
      <ui-content>
        <ui-input
          class="ShortcutsSearch"
          icon="search"
          icon-position="left"
          aria-label={appTexts.text("shortcutsSearch")}
          placeholder={appTexts.text("shortcutsSearch")}
          ref={(element: HTMLElement) => {
            search = element
            on<{ value: string }>("ui-typed", (event) => setWords(event.detail.value))(element)
          }}
        />
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
                        <ui-keys shortcut={row.shortcut} platform={props.platform} />
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
      </ui-content>
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
  if (isOpen) return
  isOpen = true
  try {
    await uiReady
    const root = document.createElement("div")
    root.className = "ShortcutsDialogRoot"
    document.body.append(root)
    await new Promise<void>((resolve) => {
      const dispose = render(() => <ShortcutsDialog platform={props.platform} onClose={finish} />, root)

      /** Unmount, then resolve. */
      function finish() {
        dispose()
        root.remove()
        resolve()
      }
    })
  } finally {
    isOpen = false
  }
}

/** Is the dialog showing?  `openShortcuts()` opens one at a time. */
let isOpen = false

////////////////
// ## Rows
////////////////

/**
 * The dialog's rows, from `EDITOR_HOTKEYS`, in its order:  one per name in a group.
 * - Shortcuts with the same name and group are one row, their keys a space apart:  Delete is Backspace and Delete.
 * - Each key as a Mac (`isApple`) or another keyboard has it:  a shortcut's `mac`, when it has one, on a Mac.
 * - Pure:  the coverage test reads it too.
 */
export function shortcutRows(isApple: boolean): ShortcutRow[] {
  const rows: ShortcutRow[] = []
  for (const hotkey of Object.values(EDITOR_HOTKEYS) as ListedHotkey[]) {
    const shortcut = (isApple && hotkey.mac) || hotkey.shortcut
    const same = rows.find((row) => row.group === hotkey.group && row.name === hotkey.name)
    if (same) same.shortcut += ` ${shortcut}`
    else rows.push({ group: hotkey.group, name: hotkey.name, where: hotkey.where, shortcut })
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
  /** Its keys, in Spell UI's words, a space apart:  `<ui-keys shortcut>`. */
  shortcut: string
}

/** `rows` under their headings, in `HOTKEY_GROUPS`' order;  a group with none left out. */
function groupsOf(rows: readonly ShortcutRow[]): { group: HotkeyGroup; rows: ShortcutRow[] }[] {
  return (Object.keys(HOTKEY_GROUPS) as HotkeyGroup[])
    .map((group) => ({ group, rows: rows.filter((row) => row.group === group) }))
    .filter((group) => group.rows.length)
}

/**
 * Does `row` match `query` (`searchText()`'s):  its name, its heading, or its keys as drawn?
 * - Keys as drawn:  each chord's caps run together (`⌘S`), a space apart (`Ctrl S`) or joined by `+` (`Ctrl+S`).
 * - In the page's language:  the words it shows.
 */
function matches(row: ShortcutRow, query: string, isApple: boolean): boolean {
  const texts = [appTexts.text(row.name), appTexts.text(HOTKEY_GROUPS[row.group]), ...capsTexts(row.shortcut, isApple)]
  return texts.some((text) => searchText(text).includes(query))
}

/** `shortcut`'s chords as their caps are drawn:  `mod+S` => `⌘S`, `⌘ S`, `⌘+S` on a Mac. */
function capsTexts(shortcut: string, isApple: boolean): string[] {
  return shortcut
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((text) => {
      const chord = SpellUI.keyboard.chord(text, { isApple })
      const caps = UIKeys.capsOf(chord, isApple, (word) => SpellUI.i18n.t(word, undefined, KEYS_TAG))
      return [caps.join(""), caps.join(" "), caps.join("+")]
    })
}

/** What's typed or shown, for matching:  lower case, its spaces one each. */
function searchText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase()
}

/** The key caps' tag, whose texts hold their words (Ctrl, Shift ...). */
const KEYS_TAG = "ui-keys"
