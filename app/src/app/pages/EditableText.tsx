import { createEffect, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

import { appTexts } from "spell/app/app/ui/AppTexts"
import { HomeArrangement } from "./HomeArrangement"

import "./EditableText.css"

/****************
 * ### `<EditableText>`
 * A piece of text changed where it is:  a card's title or tagline, a section's header or line,
 * while the home page is rearranged (epic `mockup` T51).
 * - A click (or Enter, from the keyboard) starts typing in it, everything in it selected.
 * - Enter or leaving it saves what's typed (`onSave`), Escape puts it back.
 * - `limit`:  past that many characters it's marked, and its tooltip says so:  never cut off, never refused.
 * - While typed in, nothing on the page drags (`HomeArrangement.editingText()`), so the mouse selects text.
 * - Its text is set by hand, not drawn:  what's typed changes the element's own text, which Solid would lose track of.
 ****************/
export function EditableText(props: EditableTextProps): JSX.Element {
  // read right after it's set (a key, a blur), so a plain flag;  its signal only draws it
  let editing = false
  const [isEditing, setEditing] = createSignal(false)
  const [length, setLength] = createSignal(0)
  let element!: HTMLSpanElement
  // the text shown follows `value` while it isn't being typed in
  createEffect(
    () => props.value,
    (value) => {
      if (!editing) showText(value)
    }
  )
  const isTooLong = () => props.limit !== undefined && length() > props.limit
  return (
    <span
      ref={(it) => (element = it)}
      class={["EditableText", props.class, { editing: isEditing(), "too-long": isTooLong() }]}
      role="textbox"
      tabindex="0"
      aria-label={props.label}
      data-placeholder={props.placeholder}
      title={
        isTooLong()
          ? appTexts.text("homeTextTooLong", { limit: String(props.limit) })
          : isEditing()
            ? undefined
            : appTexts.text("homeTextClickToChange")
      }
      onClick={(event) => {
        // never the card's or the header's own click:  it would open a project
        event.preventDefault()
        event.stopPropagation()
        if (!editing) start()
      }}
      onKeyDown={(event) => keyDown(event)}
      onInput={() => setLength(element.textContent?.length ?? 0)}
      onBlur={() => finish("save")}
    />
  )

  /** Show `text`, as it is now. */
  function showText(text: string) {
    element.textContent = text
    setLength(text.length)
  }

  /** Start typing in it, everything selected. */
  function start() {
    editing = true
    setEditing(true)
    HomeArrangement.editingText(true)
    element.contentEditable = "plaintext-only"
    element.focus()
    const range = document.createRange()
    range.selectNodeContents(element)
    const selection = getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }

  /** Stop typing:  keep what's typed (`"save"`), or put it back (`"cancel"`). */
  function finish(how: "save" | "cancel") {
    if (!editing) return
    editing = false
    setEditing(false)
    HomeArrangement.editingText(false)
    element.contentEditable = "false"
    const typed = (element.textContent ?? "").replace(/\s+/g, " ").trim()
    if (how === "save" && typed !== props.value) props.onSave(typed)
    showText(how === "save" && typed ? typed : props.value)
  }

  /** Enter saves, Escape puts it back;  Enter or Space on it from the keyboard starts typing. */
  function keyDown(event: KeyboardEvent) {
    if (!editing) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        event.stopPropagation()
        start()
      }
      return
    }
    // keys typed are the text's:  never a card's, a page's shortcut
    event.stopPropagation()
    if (event.key === "Enter") {
      event.preventDefault()
      finish("save")
      element.blur()
    } else if (event.key === "Escape") {
      event.preventDefault()
      finish("cancel")
      element.blur()
    }
  }
}

/** Props for `<EditableText>`. */
export type EditableTextProps = {
  /** What it says now. */
  value: string
  /** What's typed, kept:  trimmed, its spaces one;  `""` when it was emptied, which goes back to what it was. */
  onSave: (text: string) => void
  /** What it is, for a screen reader:  "Title", "Tagline". */
  label: string
  /** The most characters that fit:  past them it's marked, never refused.  Default:  no limit. */
  limit?: number
  /** What it says while empty, faint:  "Add a tagline".  Default:  nothing. */
  placeholder?: string
  /** More classes:  the card's `title`, `description`. */
  class?: string
}
