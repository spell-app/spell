import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { clamp } from "spell/util/number"
import { E } from "spell/element"

import { epicCommentPaneVocabulary } from "./EpicCommentPane.en"

import paneCSS from "./EpicCommentPane.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicCommentPane`
 * The component behind `<epic-comment-pane>`:  the small floating pane Owen writes a NEW comment in (epic `airplane`
 * P11;  an element since epic `epic-engine` P3).  Once saved and closed, the comment is a thread (`<epic-thread>`).
 * - Fixed on the screen, under what Owen clicked or selected (`near`), above it when there's no room below, never
 *   past the window's edges;  the page never scrolls for it (Owen, 2026-10-10:  "don't scroll the page and lose
 *   context!").  It shows once placed (`:state(placed)`):  see-through before, its field already taking the focus.
 * - Owen DRAGS it by its header (not from a button there).
 * - Ivory, 8px inside on every side, lifted off the page by a shadow (Owen, 2026-10-10:  "make the modal bg beige so
 *   it stands out";  "reduce padding inside bullhorn frame to 8px");  no buttons below its text.
 * - Its header:  the bullhorn, the first words it's on (`headline`;  its tooltip `about`), the floppy once saved
 *   (`saved`, red when `failed`), the trash once saved (`deletable`), ×.
 * - Its field is slotted:  the comments' code saves what's typed, closes it (×, Escape, ⌘ Enter, the focus leaving),
 *   and deletes it;  this only says which button was pressed (`epic-comment-closing`, `epic-comment-removing`).
 ****************/
export class EpicCommentPane extends E.UIComponent<typeof epicCommentPaneVocabulary> {
  @E.proto static vocabulary = epicCommentPaneVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-comment-pane": paneCSS },
    aria: { role: "dialog" },
    // its field takes the focus;  a click on its header starts a drag, never focuses ×
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Put on the screen:  it shows. */
  @E.cssState("placed")
  @E.state
  accessor isPlaced = false

  /** Its header, once drawn:  what Owen drags it by. */
  private header: HTMLElement | undefined

  /** A drag under way:  where in the pane the pointer took it;  `undefined` otherwise. */
  private grip: { dx: number; dy: number } | undefined

  /** Its name, for a screen reader:  "Comment on “...”". */
  @E.aria("label")
  get ariaName(): string {
    return this.translationForKey("label", { headline: this.headline ?? "" })
  }

  render(): JSX.Element {
    return (
      <div class={PANE} part={this.partForName("base")}>
        <div
          ref={(header) => (this.header = header)}
          class={HEADER}
          part={this.partForName("header")}
          title={`${this.about ?? ""}\n${this.translationForKey("dragTip")}`}
          onPointerDown={this.onGrab}
          onPointerMove={this.onDrag}
          onPointerUp={this.onDrop}
          onPointerCancel={this.onDrop}
        >
          <ui-icon name="bullhorn" />
          <span class={HEADLINE}>{this.headline}</span>
          <Show when={this.saved}>
            <span class={FLOPPY} title={this.saved} data-failed={this.failed ? "" : undefined}>
              <ui-icon name="floppy disk outline" />
            </span>
          </Show>
          <Show when={this.deletable}>
            <ui-button
              class={TOOL}
              appearance="circular basic"
              size="mini"
              icon="trash can"
              title={this.translationForKey("deleteTitle")}
              aria-label={this.translationForKey("deleteLabel")}
              onClick={() => this.send("epic-comment-removing", {})}
            />
          </Show>
          <ui-button
            class={TOOL}
            appearance="circular basic"
            size="mini"
            icon="xmark"
            title={this.translationForKey("closeTitle")}
            aria-label={this.translationForKey("closeLabel")}
            onClick={() => this.send("epic-comment-closing", {})}
          />
        </div>
        <slot />
      </div>
    )
  }

  ////////////////
  // ## Placing it
  ////////////////

  /**
   * Once drawn, and whenever `near` changes:  under it, 8px down, else above it when there's no room below;  none:
   * centred, near the top.
   * - just before the next paint, once its field has drawn too:  its height is known
   */
  @E.onChange("isReady", "near")
  protected onNearChanged(ready: boolean, near: unknown) {
    if (!ready) return undefined
    return E.beforeNextPaint(() => this.placeNear(near as Near | undefined))
  }

  /** Put it under `near` (above when there's no room below);  none:  centred near the top. */
  private placeNear(near: Near | undefined) {
    const { width, height } = this.domElement.getBoundingClientRect()
    const left = near?.left ?? (innerWidth - width) / 2
    let top = near ? near.bottom + GAP : TOP_WITHOUT_NEAR
    if (near && top + height > innerHeight - GAP) top = near.top - height - GAP
    this.moveTo(left, top)
    this.isPlaced = true
  }

  /**
   * Put it at (`left`, `top`) on the screen, inside the window's edges, 8px in.
   * - bigger than the window:  its top left corner stays in, so its header (what drags it) is never out of reach
   */
  private moveTo(left: number, top: number) {
    const { width, height } = this.domElement.getBoundingClientRect()
    const style = this.domElement.style
    style.left = `${clamp(left, GAP, Math.max(GAP, innerWidth - width - GAP))}px`
    style.top = `${clamp(top, GAP, Math.max(GAP, innerHeight - height - GAP))}px`
  }

  ////////////////
  // ## Dragging it
  ////////////////

  /** A press on its header (not on a button there):  the drag starts, the pointer held by the header. */
  @E.untracked
  private readonly onGrab = (event: PointerEvent) => {
    if (event.button !== 0 || !this.header) return
    if (event.composedPath().some((target) => target instanceof Element && target.matches("ui-button"))) return
    event.preventDefault()
    const box = this.domElement.getBoundingClientRect()
    this.grip = { dx: event.clientX - box.left, dy: event.clientY - box.top }
    this.header.setPointerCapture(event.pointerId)
  }

  /** The pointer moving while held:  the pane follows it. */
  @E.untracked
  private readonly onDrag = (event: PointerEvent) => {
    if (this.grip) this.moveTo(event.clientX - this.grip.dx, event.clientY - this.grip.dy)
  }

  /** Let go:  it stays where it was dropped. */
  @E.untracked
  private readonly onDrop = () => {
    this.grip = undefined
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicCommentPane extends E.AttributeValues<typeof epicCommentPaneVocabulary> {}

/** What it opens near (`near`):  the box of what Owen clicked or selected, in the window's pixels. */
type Near = { left: number; top: number; bottom: number }

/** Between it and what it opens near, and the window's edges, px. */
const GAP = 8

/** Where it opens with nothing to open near, px from the top. */
const TOP_WITHOUT_NEAR = 80

/** Classes of its shadow markup (`EpicCommentPane.css`). */
const PANE = "pane"
const HEADER = "header"
const HEADLINE = "headline"
const FLOPPY = "floppy"
const TOOL = "tool"
