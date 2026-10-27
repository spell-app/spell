import { E } from "spell/ui/core"

/****************
 * ### `ParentLink`
 * The `parent` attribute:  an element written anywhere on the page joins the container with that id,
 * as if it were nested there.
 * - `<ui-tab parent="types">` joins `<ui-tabs id="types">`;  `<ui-step>` a `<ui-steps>`;
 *   `<ui-section>` another `<ui-section>` (or a `<ui-sections>`).
 * - How:  the element MOVES into its container, so the page's tree is the nested one,
 *   and everything that reads the tree (the tabs' panes, the keyboard order, folding, a table of contents) just works.
 *   The HTML file keeps it flat.
 * - When:  once the page is read (`DOMContentLoaded`), so every element naming the container is there;
 *   they join it together, in page order:
 *   - those written BEFORE the container go before its own children
 *   - those written after it go after them
 * - A container that isn't there:  warns once per id, and the element stays where it is.
 *   It keeps watching (one `MutationObserver` per root), and joins the container if it arrives later.
 * - Each family's component holds one, and calls `follow()` from an `@onChange("isConnected", "parent")` method.
 * - Plain DOM:  no Solid, no component;  it never runs on a server, where nothing connects.
 ****************/
export class ParentLink {
  /** The element that joins its container. */
  private readonly domElement: Element

  /** The `parent` attribute's name on this tag (translated on a translated tag:  `padre`). */
  private readonly attribute: string

  constructor(props: ParentLinkProps) {
    this.domElement = props.domElement
    this.attribute = props.attribute
  }

  /**
   * Join the container whose id is `id`, once the page is read;  nothing without one.
   * - Returns the cleanup:  stop waiting for the container (the element left the page, or `parent` changed).
   * - SIDE EFFECT:  moves the element, and every other one of its tag naming the same container, into it.
   * - NEVER throws.
   */
  follow(id: string | undefined): (() => void) | undefined {
    if (!id) return undefined
    let isStopped = false
    let stopWatching: (() => void) | undefined
    ParentLink.whenPageRead(this.domElement.ownerDocument, () => {
      if (isStopped || !this.domElement.isConnected) return
      if (this.join(id)) return
      ParentLink.warnMissing(id, this.domElement.localName, this.attribute)
      stopWatching = ParentLink.watch(this.root, () => !this.domElement.isConnected || this.join(id))
    })
    return () => {
      isStopped = true
      stopWatching?.()
    }
  }

  /**
   * Move every element of this tag naming `id` into the container with that id, in page order.
   * - True when the container is there (whether or not anything moved).
   */
  private join(id: string): boolean {
    const root = this.root
    const container = root.getElementById(id)
    if (!container) return false
    const { attribute } = this
    const joiners = [...root.querySelectorAll(`${this.domElement.localName}[${attribute}]`)].filter(
      (joiner) => joiner.getAttribute(attribute) === id && !container.contains(joiner)
    )
    const before: Element[] = []
    const after: Element[] = []
    for (const joiner of joiners) {
      // a container inside its own joiner can't take it in
      if (joiner.contains(container)) {
        E.Warnings.warn(ParentLink.source(joiner.localName, attribute, id), "it holds that element;  it stays put")
      } else if (joiner.compareDocumentPosition(container) & Node.DOCUMENT_POSITION_FOLLOWING) before.push(joiner)
      else after.push(joiner)
    }
    if (before.length) container.prepend(...before)
    if (after.length) container.append(...after)
    return true
  }

  /** The document or shadow root the element is in:  where its container's id is looked up. */
  private get root(): Document | ShadowRoot {
    return this.domElement.getRootNode() as Document | ShadowRoot
  }

  ////////////////
  // ## Statics
  ////////////////

  /**
   * Run `fn` once `document` is read (`DOMContentLoaded`), else as soon as the running code finishes.
   * - Never right away:  `follow()` runs inside an effect, where moving an element mustn't happen.
   */
  private static whenPageRead(document: Document, fn: () => void) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true })
    else E.afterSolidUpdate(fn)
  }

  /** Warn that no element has id `id`, once per id.  Static:  once per page, however many elements name it. */
  private static warnMissing(id: string, tag: string, attribute: string) {
    if (ParentLink.warned.has(id)) return
    ParentLink.warned.add(id)
    E.Warnings.warn(
      ParentLink.source(tag, attribute, id),
      `no element has the id "${id}";  it stays where it is, and joins one if it arrives`
    )
  }

  /** How a warning names the element:  `<ui-tab parent="types">`. */
  private static source(tag: string, attribute: string, id: string): string {
    return `<${tag} ${attribute}="${id}">`
  }

  /**
   * Call `tryJoin` on every change to `root`'s tree or ids, until it returns true (joined, or left the page);
   * returns a function that stops.
   * - Static:  one observer per root, shared by every element waiting there.
   */
  private static watch(root: Document | ShadowRoot, tryJoin: () => boolean): () => void {
    let waiting = ParentLink.waiting.get(root)
    if (!waiting) {
      const waits = new Set<() => boolean>()
      const observer = new MutationObserver(() => {
        for (const wait of [...waits]) if (wait()) waits.delete(wait)
        if (!waits.size) ParentLink.stopWatching(root)
      })
      observer.observe(root, { childList: true, subtree: true, attributeFilter: ["id"] })
      waiting = { waits, observer }
      ParentLink.waiting.set(root, waiting)
    }
    const { waits } = waiting
    waits.add(tryJoin)
    return () => {
      waits.delete(tryJoin)
      if (!waits.size) ParentLink.stopWatching(root)
    }
  }

  /** Stop observing `root`. */
  private static stopWatching(root: Document | ShadowRoot) {
    ParentLink.waiting.get(root)?.observer.disconnect()
    ParentLink.waiting.delete(root)
  }

  /** Forget which ids were warned about, for tests. */
  static reset() {
    ParentLink.warned.clear()
  }

  /** Ids already warned about.  Static:  the warning is once per page. */
  private static readonly warned = new Set<string>()

  /** Each root's observer and the elements waiting in it.  Static:  one observer per root, page-wide. */
  private static readonly waiting = new WeakMap<Node, { waits: Set<() => boolean>; observer: MutationObserver }>()
}

/** What a `ParentLink` is for. */
export type ParentLinkProps = {
  /** the element that joins its container */
  domElement: Element
  /** the `parent` attribute's name on its tag:  `component.elementDefinition.localAttribute("parent")` */
  attribute: string
}
