import type { JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"
import { diagramNodeVocabulary } from "./UIDiagramNode.en"

import diagramNodeCSS from "./UIDiagramNode.css?inline"

/**
 * What a `<ui-diagram-node>` tells its diagram when what it holds changes size:  plumbing, like the platform's
 * `slotchange`.
 * - Bubbles to the diagram, which measures again, and lays its box out at the new size.
 */
export const DIAGRAM_NODE_RESIZED = "ui-diagram-node-resized"

/** A `<ui-diagram-node>` DOM element, typed. */
export type DOMDiagramNodeElement = E.DOMElement<UIDiagramNode>

/****************
 * ### `<ui-diagram-node>`
 * The component behind `<ui-diagram-node>`:  what one box of a `<ui-diagram>` holds, in place of its texts.
 *
 *     <div class="ui diagram node" part="content"><slot/></div>    (over its box in the drawing)
 *
 * - `name` says which box:  a node's `name` in the diagram's spec.
 * - A real element, in the page, so it keeps its state and events:  a `<ui-shape>` flips in it.
 * - The diagram measures it (`contentSize`), sizes the box to it, and says where its box is (`placement`);
 *   it says when its size changes (`DIAGRAM_NODE_RESIZED`), so the box and its lines follow.
 ****************/
export class UIDiagramNode extends E.UIComponent<typeof diagramNodeVocabulary> {
  @E.proto static vocabulary = diagramNodeVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "diagram-node": diagramNodeCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Where its diagram put its box's top left corner, in percent of the drawing;  `undefined`:  not placed yet. */
  @E.state accessor placement: DiagramNodePlacement | undefined = undefined

  /** The box around what it holds. */
  private contentBox: HTMLElement | undefined

  /** What it holds in pixels, before the drawing's scale;  `undefined` before it's laid out. */
  get contentSize(): { width: number; height: number } | undefined {
    const box = this.contentBox
    if (!box?.offsetWidth) return undefined
    return { width: box.offsetWidth, height: box.offsetHeight }
  }

  /** While it's in the page:  says when what it holds changes size (a flip, an image loading). */
  @E.onChange("isConnected", "isReady")
  protected watchContentSize(isConnected: boolean, isReady: boolean) {
    const box = this.contentBox
    if (!isConnected || !isReady || !box) return
    const observer = new ResizeObserver(() => {
      this.domElement.dispatchEvent(new Event(DIAGRAM_NODE_RESIZED, { bubbles: true }))
    })
    observer.observe(box)
    return () => observer.disconnect()
  }

  render(): JSX.Element {
    return (
      <div
        ref={(box: HTMLDivElement) => (this.contentBox = box)}
        class={[this.rootClass, { [PLACED]: !!this.placement }, this.resizeClass]}
        part={this.partForName("content")}
        style={this.placementStyle()}
      >
        <slot />
      </div>
    )
  }

  /**
   * Which way people may resize it:  `resize-both`, `resize-horizontally`, `resize-vertically`, or none.
   * - Its own `resizable`, not the shared one:  its host draws nothing (`display: contents`), so its content box
   *   resizes;  read with the shared one's words (`E.MoveAndResize.wayOf()`).
   */
  get resizeClass(): string | undefined {
    const way = E.MoveAndResize.wayOf(this.resizable)
    return way && `resize-${way}`
  }

  /**
   * Is the point `x`, `y` (the page's) on its resize grip, the bottom right corner?
   * - So the diagram leaves a press there to the browser, which resizes it, and doesn't drag the box.
   */
  isOnResizeGrip(x: number, y: number): boolean {
    if (!this.resizeClass || !this.contentBox) return false
    const box = this.contentBox.getBoundingClientRect()
    return x > box.right - RESIZE_GRIP_PX && y > box.bottom - RESIZE_GRIP_PX
  }

  /** Where `placement` says. */
  private placementStyle(): JSX.CSSProperties | undefined {
    const placement = this.placement
    return placement && { left: `${placement.left}%`, top: `${placement.top}%` }
  }

  /**
   * Is `child` a `<ui-diagram-node>`, in any language?
   * - Before the runtime loads, the canonical tag only:  the translations are its.
   */
  static isNode(child: Node): child is DOMDiagramNodeElement {
    if (child.nodeType !== ELEMENT_NODE) return false
    const name = (child as Element).localName
    return (
      name === diagramNodeVocabulary.tag ||
      ("vocabulary" in UI && UI.vocabulary.canonicalTagFor(name) === diagramNodeVocabulary.tag)
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIDiagramNode extends E.AttributeValues<typeof diagramNodeVocabulary> {}

/** Where a box's content goes, its top left corner, in percent of the drawing. */
export type DiagramNodePlacement = {
  readonly left: number
  readonly top: number
}

/** How far in from its bottom right corner a press is on its resize grip. */
const RESIZE_GRIP_PX = 16

/** Class word of a content box the diagram has placed. */
const PLACED = "placed"

/** `Node.ELEMENT_NODE`:  no DOM global in shared code (`AGENTS.md`, SSR). */
const ELEMENT_NODE = 1
