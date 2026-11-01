import type { JSX } from "@solidjs/web"

import { E, UI } from "spell/ui/core"
import { treeNodeVocabulary } from "./UITreeNode.en"
import type { TreeDiagramNode } from "./UITreeDiagram.types"

import treeNodeCSS from "./UITreeNode.css?inline"

/**
 * What a `<ui-tree-node>` tells its diagram when what it holds changes size:  plumbing, like the platform's `slotchange`.
 * - Bubbles to the diagram, which measures again.
 */
export const TREE_NODE_RESIZED = "ui-tree-node-resized"

/** A `<ui-tree-node>` DOM element, typed. */
export type DOMTreeNodeElement = E.DOMElement<UITreeNode>

/****************
 * ### `<ui-tree-node>`
 * The component behind `<ui-tree-node>`:  one node of a `<ui-tree-diagram>` written as nested tags (epic
 * `elemental-spell` P32).
 *
 *     <div class="ui tree node" part="content"><slot/></div>    (what it holds, over its box in the drawing)
 *     <slot/>                                                   (the nodes under it)
 *
 * - It draws no box:  the diagram reads it into plain data (`nodeFrom()`), and draws it with the rest of the tree.
 * - Its own text is its label, unless `label` says.
 * - Any other element inside it shows over its box:  a real element, in the page, so it keeps its state and events.
 *   - The diagram measures it (`contentSize`), leaves room in the box, and says where it goes (`placement`).
 * - Slots by hand (`slotAssignment` `"manual"`, the platform's):  the same children, split into two slots.
 ****************/
export class UITreeNode extends E.UIComponent<typeof treeNodeVocabulary> {
  @E.proto static vocabulary = treeNodeVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "tree-node": treeNodeCSS },
    delegatesFocus: false,
    slotAssignment: "manual" as const
  } satisfies Partial<E.ElementSetup>

  /** Where the diagram put what it holds, in percent of the drawing;  `undefined`:  not shown (it's folded away). */
  @E.state accessor placement: TreeNodePlacement | undefined = undefined

  /** The children it was given:  nodes and everything else. */
  @E.watches({ childList: true })
  get children(): readonly ChildNode[] {
    return [...this.domElement.childNodes]
  }

  /** The nodes under it. */
  get nodeChildren(): Element[] {
    return this.children.filter((child): child is Element => UITreeNode.isNode(child))
  }

  /** What shows in its box, besides its label:  nothing when it's only text, which is its label. */
  get contentChildren(): ChildNode[] {
    return UITreeNode.contentOf(this.domElement)
  }

  /** The box around what it holds. */
  private contentBox: HTMLElement | undefined
  private contentSlot: HTMLSlotElement | undefined
  private nodesSlot: HTMLSlotElement | undefined

  /** What it holds in pixels, before the drawing's scale;  `undefined` when it holds nothing, or it isn't laid out. */
  get contentSize(): { width: number; height: number } | undefined {
    const box = this.contentBox
    if (!box || !this.contentChildren.length || !box.offsetWidth) return undefined
    return { width: box.offsetWidth, height: box.offsetHeight }
  }

  /** Hand each child to its slot;  what it holds may have changed size. */
  @E.onChange("children", "isReady")
  protected onChildrenChanged(_children: readonly ChildNode[], isReady: boolean) {
    if (!isReady) return
    this.contentSlot?.assign(...(this.contentChildren as (Element | Text)[]))
    this.nodesSlot?.assign(...this.nodeChildren)
    this.domElement.dispatchEvent(new Event(TREE_NODE_RESIZED, { bubbles: true }))
  }

  /** While it's in the page:  says when what it holds changes size (an image loads, a closed section opens). */
  @E.onChange("isConnected", "isReady")
  protected watchContentSize(isConnected: boolean, isReady: boolean) {
    const box = this.contentBox
    if (!isConnected || !isReady || !box) return
    const observer = new ResizeObserver(() => {
      this.domElement.dispatchEvent(new Event(TREE_NODE_RESIZED, { bubbles: true }))
    })
    observer.observe(box)
    return () => observer.disconnect()
  }

  render(): JSX.Element {
    return (
      <>
        <div
          ref={(box: HTMLDivElement) => (this.contentBox = box)}
          class={[this.rootClass, { [PLACED]: !!this.placement }]}
          part={this.partForName("content")}
          style={this.placementStyle()}
        >
          <slot ref={(slot: HTMLSlotElement) => (this.contentSlot = slot)} />
        </div>
        <slot ref={(slot: HTMLSlotElement) => (this.nodesSlot = slot)} />
      </>
    )
  }

  /** Where `placement` says. */
  private placementStyle(): JSX.CSSProperties | undefined {
    const placement = this.placement
    return placement && { left: `${placement.left}%`, top: `${placement.top}%` }
  }

  ////////////////
  // ## Reading nodes
  ////////////////

  /**
   * Is `child` a `<ui-tree-node>`, in any language?
   * - Before the runtime loads, the canonical tag only:  the translations are its.
   * - By `localName`:  a static server render's children are linkedom elements.
   */
  static isNode(child: Node): child is Element {
    if (child.nodeType !== ELEMENT_NODE) return false
    const name = (child as Element).localName
    return name === treeNodeVocabulary.tag || ("vocabulary" in UI && UI.vocabulary.canonicalTagFor(name) === treeNodeVocabulary.tag)
  }

  /** The first `<ui-tree-node>` child of `domElement`:  a diagram's root. */
  static firstNodeOf(domElement: Element): Element | undefined {
    return [...domElement.children].find((child) => UITreeNode.isNode(child))
  }

  /**
   * `element` and the nodes under it as plain data, what a diagram draws;  each node keeps its `element`.
   * - NEVER throws.
   */
  static nodeFrom(element: Element): TreeDiagramNode {
    const value = (name: string) => {
      const found = UITreeNode.value(element, name)
      return typeof found === "string" && found ? found : undefined
    }
    const children = [...element.children].filter((child) => UITreeNode.isNode(child)).map(UITreeNode.nodeFrom)
    const color = value("color")
    const kind = value("kind")
    const detail = value("detail")
    const edgeLabel = value("edge-label")
    const title = value("hover-text")
    return {
      label: value("label") ?? UITreeNode.textOf(element),
      element,
      ...(detail && { detail }),
      ...(edgeLabel && { edgeLabel }),
      ...(title && { title }),
      ...(color && { color }),
      ...(kind && { kind }),
      ...(UITreeNode.isFolded(element) && { folded: true }),
      ...(children.length && { children })
    }
  }

  /** What `element` holds besides its nodes, when an element's among it:  else nothing, its text being its label. */
  static contentOf(element: Element): ChildNode[] {
    const held = [...element.childNodes].filter(
      (child) =>
        !UITreeNode.isNode(child) &&
        (child.nodeType === ELEMENT_NODE || (child.nodeType === TEXT_NODE && !!child.textContent?.trim()))
    )
    return held.some((child) => child.nodeType === ELEMENT_NODE) ? held : []
  }

  /** `element`'s own text:  its text children, not the nodes under it;  `""` when it holds an element too. */
  private static textOf(element: Element): string {
    if (UITreeNode.contentOf(element).length) return ""
    let text = ""
    for (const child of element.childNodes) if (child.nodeType === TEXT_NODE) text += child.textContent
    return text.trim().replace(/\s+/g, " ")
  }

  /** Is `element` written `folded`? */
  private static isFolded(element: Element): boolean {
    const value = UITreeNode.value(element, "folded")
    return value === true || value === "" || value === "true"
  }

  /**
   * Attribute `name` of `element`, by its canonical name;  before its family loads, the attribute's text.
   * - NEVER throws:  a pending element has no definition yet (`valueNamed()` throws then).
   */
  private static value(element: Element, name: string): string | boolean | undefined {
    try {
      const value = (element as Element & { valueNamed?: (name: string) => unknown }).valueNamed?.(name)
      if (value !== undefined) return value as string | boolean
    } catch {
      // pending:  its text, below
    }
    return element.getAttribute(name) ?? undefined
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UITreeNode extends E.AttributeValues<typeof treeNodeVocabulary> {}

/** Where what a node holds goes, its centre, in percent of the drawing. */
export type TreeNodePlacement = {
  readonly left: number
  readonly top: number
}

/** Class word of a content box the diagram has placed. */
const PLACED = "placed"

/** `Node.ELEMENT_NODE` and `Node.TEXT_NODE`:  no DOM global in shared code (`AGENTS.md`, SSR). */
const ELEMENT_NODE = 1
const TEXT_NODE = 3
