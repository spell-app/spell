/*! Derived from `@solidjs/element` and `component-register`:  MIT licence, (c) Ryan Carniato. */
import { DelegatedEvents, getDelegatedRoot, registerDelegatedRoot, unregisterDelegatedRoot } from "@solidjs/web"

/****************
 * ### `ShadowEvents`
 * Keeps Solid's event delegation from leaking out of an element's shadow root.
 * - What Solid does:  each element's render root is a delegation container.
 *   - ONE listener per event type on the shadow root runs the component's `onClick` / `onInput` ... handlers,
 *     by walking the event's composed path.
 *   - That walk (dom-expressions `eventHandler`) leaves its state ON THE EVENT OBJECT:
 *   - `target`:  redefined as an own property while walking,
 *     and "restored" to the value it read on entry -- the INNER node (`<input>`), frozen.
 *     - Every listener outside the shadow root that runs later sees it instead of the retargeted host,
 *       e.g. a page `input` listener on `<ui-input>` gets `<input>`.
 *   - `currentTarget`:  an own getter returning wherever the walk stopped (the inner node), for every later listener.
 *   - `_$SOLID_EVENT_OWNER` (the "already walked up to here" marker):  set to the shadow root.
 *     - Every OUTER container (a Solid app's root, an enclosing element's shadow root)
 *       checks `container.contains(marker)`, which does not cross shadow boundaries, and DROPS the event.
 *     - So a Solid app's `<ui-button onClick>`, or any handler above a nested element,
 *       never runs for events from inside that element.
 * - What this class does:  it wraps the render root's delegated listener (`bridge()`):
 *   - after it:
 *     - own `target` / `currentTarget` deleted (the platform's retargeting getters are back)
 *     - the host's own delegated handler run when the next walker would skip it
 *     - the marker moved to the host
 *   - before it:  when an inner element's root already walked part of the path,
 *     Solid resumes right after that part (a one-shot `composedPath()` slice),
 *     instead of dropping the event or walking it twice
 * - It also keeps each shadow root to the event kinds it USES (epic `solid-2-final` P8, part 1 of Q22):
 *   - Solid adds its listener for a kind to EVERY container the first time anything on the page uses that kind:
 *     the editor's 5,594 elements held about 28,700 listeners, most for kinds nothing inside them handles.
 *   - So the bridge HOLDS Solid's listener for a kind back,
 *     and adds it to the root the first time a node in that root is given a handler of that kind.
 *   - Solid's own listener is told apart from a component's by how Solid adds it (`noteAdded()`):
 *     a capture-phase reset listener for the kind (one function, the same on every root), then its listener.
 *     Both are held, and added together.
 *   - How it hears of a handler:  Solid gives the node its handler as `node._$$click = handler`;
 *     a setter for each kind on `Element.prototype` (`watchHandlers()`) notes the node, then steps aside
 *     (an own property from then on, so Solid reads and rewrites it as before).
 *   - A node given its handler before it's in a root (still in its template's fragment) waits a moment:
 *     its root is looked up again a microtask later, and again before any event of that kind reaches the page
 *     (one capturing listener per kind on the document, added only once a node has waited).
 *   - So `<ui-icon>`, `<ui-text>` and every root without a handler hold no delegated listener at all;
 *     a root that uses a kind gets Solid's own listener, behind the same bridge:  nothing about order changes.
 * - Cost:  one wrapper call per delegated event per render root on its path.
 *   - A `composedPath()` only for nested roots, or when the host itself has a delegated handler.
 * - HACK:  reads dom-expressions internals, as of `@solidjs/web` 2.0.4 (`ShadowEvents.test.tsx` fails when they move):
 *   - a container's listener for a kind is added right after a capture-phase reset listener for it
 *     (`attachDelegatedEvent()`), the reset ONE function for every container:  how Solid's listener is told apart
 *     - rc.21 handed back the container's state from `registerDelegatedContainer()`, its `handlers` map;
 *       2.0 returns nothing, and finds roots by their owners itself (`registerDelegatedRoot()` counts them)
 *   - `_$SOLID_EVENT_OWNER` (the marker) and `_$$<type>` / `_$$<type>Data` (a node's delegated handler)
 *   - a node's handler is SET as `node._$$<type> = handler` (dom-expressions `addEvent()`), which the setter hears
 *   - What 2.0.4 does itself now:  its walk deletes the `target` / `currentTarget` it set (the restore is fixed);
 *     but an outer container still drops an event from inside a shadow root (`contains()` stops there),
 *     which is why the bridge stays
 *   - If Solid itself adds a container's listener only for the kinds used inside it, the holding goes
 * - REJECTED (epic `solid-2-final` P22, Q22 part 2):  ONE listener per kind for the whole page, under a `<ui-root>`,
 *   each render root an OWNER of the root's container (`registerDelegatedContainer(root, renderRoot)`).
 *   - It cut 1,000 delegated listeners to 4 on 250 elements with handlers, but every test here run that way failed three:
 *     - an event that isn't composed, sent inside a shadow root, never reached the page's listener
 *     - a handler's `stopPropagation()` no longer stopped a page listener on the host:  Solid ran at the top, last
 *     - handlers above a Solid `render()` inside a shadow root were dropped (the outer `contains()` again)
 *   - Its details page:  `epics/solid-2-final/details/element-base.html`, "One listener for the whole page".
 * - STATIC and instance-free:  one set of bridged roots per page.
 * - Began as solid-element's fix 10 (numbered in its old `UPSTREAM.md`),
 *   moved here as is (epic `spell-element`, Q10).
 ****************/
export class ShadowEvents {
  /** Register `root` as a delegation root, as `registerDelegatedRoot()` does, with the shadow-safe bridge. */
  static register(root: HTMLElement | ShadowRoot) {
    ShadowEvents.watchHandlers()
    if (!bridged.has(root)) ShadowEvents.bridge(root)
    // every delegated listener added while Solid registers the root is Solid's own
    registering = root
    try {
      registerDelegatedRoot(root as HTMLElement)
    } finally {
      registering = undefined
    }
  }

  /** Undo `register()`. */
  static unregister(root: HTMLElement | ShadowRoot) {
    unregisterDelegatedRoot(root)
  }

  /**
   * Wrap Solid's delegated listeners on `root`.
   * - Every `addEventListener()` of a function for a type Solid may delegate (`DelegatedEvents`)
   *   goes through a wrapper.
   * - At call time, the wrapper recognises Solid's own listener (`solidListeners`) and runs `before()` / `after()`
   *   around it.
   * - SIDE EFFECT:  own `addEventListener` / `removeEventListener` on the root instance.
   *   Other listeners (a component's `renderRoot.addEventListener(...)`) pass straight through.
   * - Why not a listener of our own:  Solid attaches per event type LAZILY
   *   (the first `onPointerMove` anywhere on the page adds one to every container),
   *   so nothing of ours could be ordered after it.
   */
  private static bridge(root: HTMLElement | ShadowRoot) {
    bridged.add(root)
    const add = root.addEventListener
    const remove = root.removeEventListener
    // one wrapper per listener, whatever the type (it checks `event.type` when called);
    // weak, so the listeners Solid drops on every re-render go with their wrappers
    const wrappers = new WeakMap<EventListener, EventListener>()
    const shadow = root instanceof ShadowRoot
    const wrapperFor = (listener: EventListener) => {
      let wrapper = wrappers.get(listener)
      if (!wrapper) wrappers.set(listener, (wrapper = wrap(listener)))
      return wrapper
    }
    const used = new Set<string>()
    // Solid's listener for each kind, and the kinds whose reset was just added (its listener comes next)
    const solids = new Map<string, EventListener>()
    solidListeners.set(root, solids)
    const resetAdded = new Set<string>()
    // before the reset is known:  a capture listener for a kind, which Solid's listener may follow
    const maybeReset = new Map<string, EventListener>()
    // a shadow root holds Solid's listeners for a kind until a node inside uses it;  an element root never does
    if (shadow) {
      kindsInUse.set(root, {
        used,
        use(type) {
          if (used.has(type)) return
          used.add(type)
          const listener = solids.get(type)
          if (!listener) return
          if (solidReset) add.call(root, type, solidReset, true)
          add.call(root, type, wrapperFor(listener))
        }
      })
    }
    /**
     * Whether `listener` is one of Solid's for `type`, as Solid adds them (`attachDelegatedEvent()`):
     * its capture-phase reset, then its listener, one call after the other.
     * - The reset is learned the first time Solid adds one:  while a root is registered, every capture listener for a
     *   kind is Solid's;  otherwise (a kind first delegated after every root was registered) the capture listener
     *   that Solid's listener comes straight after.
     *   - Until then that first reset goes on as it is, and comes off again when the root holds the kind.
     */
    const isSolids = (type: string, listener: EventListener, capture: boolean): boolean => {
      const maybe = maybeReset.get(type)
      maybeReset.delete(type)
      if (capture) {
        if (listener === solidReset || (registering === root && !solidReset)) {
          solidReset = listener
          resetAdded.add(type)
          return true
        }
        if (!solidReset) maybeReset.set(type, listener)
        return false
      }
      if (!resetAdded.delete(type) && registering !== root) {
        if (!maybe) return false
        solidReset = maybe
        if (shadow && !used.has(type)) remove.call(root, type, maybe, true)
      }
      solids.set(type, listener)
      return true
    }
    Object.defineProperties(root, {
      addEventListener: {
        configurable: true,
        value(
          type: string,
          listener: EventListenerOrEventListenerObject | null,
          options?: boolean | AddEventListenerOptions
        ) {
          const capture = options === true
          if (typeof listener !== "function" || (options !== undefined && !capture) || !DelegatedEvents.has(type)) {
            return add.call(root, type, listener!, options)
          }
          const isSolid = isSolids(type, listener, capture)
          // Solid's own, for a kind nothing inside uses yet:  held, `use()` adds them
          if (shadow && isSolid && !used.has(type)) return
          if (capture) return add.call(root, type, listener, true)
          return add.call(root, type, wrapperFor(listener))
        }
      },
      removeEventListener: {
        configurable: true,
        value(
          type: string,
          listener: EventListenerOrEventListenerObject | null,
          options?: boolean | EventListenerOptions
        ) {
          const wrapper = options === undefined ? wrappers.get(listener as EventListener) : undefined
          if (solids.get(type) === listener) solids.delete(type)
          return remove.call(root, type, wrapper ?? listener!, options)
        }
      }
    })

    /** `listener`, with the bridge around it when it is Solid's. */
    function wrap(listener: EventListener): EventListener {
      return function (this: unknown, event: Event) {
        if (solids.get(event.type) !== listener) return listener.call(this, event)
        if (shadow) ShadowEvents.before(event as Walked, root as ShadowRoot)
        try {
          listener.call(this, event)
        } finally {
          ShadowEvents.after(event as Walked, root)
        }
      }
    }
  }

  /**
   * Before Solid walks `root`'s part of the path:
   * when an inner root already walked part of it, resume right after that part.
   * - Solid's own resume can't:
   *   - it drops a marker the container doesn't `contains()`:
   *     every node inside an inner shadow root, and a slotted host
   *   - it resumes at the marker's PARENT when the marker is the target
   * - So:  clear the marker (a fresh walk) and hand Solid's single `composedPath()` call the unwalked rest.
   *   The override removes itself on that call, so handlers see the real path.
   */
  private static before(event: Walked, root: ShadowRoot) {
    const marker = event[OWNER]
    if (!marker || marker === true) return
    const walked = progress.get(event)
    // ours, unless a plain Solid container walked in between:  then its owner is the last walked node
    const last = walked?.marker === marker ? walked.node : marker
    // a container inside this root (a portal target, a nested `render()`):  Solid's resume handles it
    if (last !== walked?.node && root.contains(last)) return
    const path = event.composedPath()
    const index = path.indexOf(last)
    if (index < 0) return
    const rest = path.slice(index + 1)
    delete event[OWNER]
    Object.defineProperty(event, "composedPath", {
      configurable: true,
      value() {
        ShadowEvents.unwalk(event, "composedPath")
        return rest
      }
    })
  }

  /**
   * After Solid walked `root`'s part of the path:
   * put the event back the way the platform had it, and hand the walk on at the host.
   * - `delete` removes only OWN properties, so the prototype's retargeting `target` / `currentTarget` return.
   * - The host's own delegated handler (`<ui-button onClick>` from the enclosing Solid code)
   *   runs from here when the next walker is a plain Solid container:  that one would resume at the host's PARENT.
   *   - It runs as the event reaches the host (`runAtHost()`), not at once:
   *     a listener on this root after Solid's may still stop the event here
   *     (`<ui-button>` pressing its inner button keeps that second click inside), and then it never runs.
   *   - An enclosing element's root walks it itself (`before()` resumes at the host).
   * - The marker becomes the host
   *   (or, when the host ran here and the event came from slotted light content, the host's parent):
   *   a node the enclosing containers DO contain, so they resume instead of dropping.
   */
  private static after(event: Walked, root: HTMLElement | ShadowRoot) {
    ShadowEvents.unwalk(event, "target", "currentTarget", "composedPath")
    if (!(root instanceof ShadowRoot) || event[OWNER] !== root || event.cancelBubble) return
    const host = root.host as unknown as Delegating
    // the platform's `target` here is retargeted to this root's tree:  outside it means slotted light content
    const slotted = !root.contains(event.target as Node)
    let last: Node = root
    if (host[`${HANDLER}${event.type}`] !== undefined && !ShadowEvents.bridgeWalksNext(event, root, host)) {
      ShadowEvents.runAtHost(event, host)
      last = host
    }
    const marker = last === host && slotted ? (ShadowEvents.parentOf(host) ?? true) : host
    event[OWNER] = marker
    progress.set(event, { node: last, marker })
  }

  /** Whether the next container on the path after `host` is another element's render root (not plain Solid). */
  private static bridgeWalksNext(event: Event, root: ShadowRoot, host: Node): boolean {
    const path = event.composedPath()
    const start = path.indexOf(root) + 1
    const next = path.findIndex((node, index) => index > start && ShadowEvents.listens(node as Node, event.type))
    if (next < 0) return false
    const parent = ShadowEvents.parentOf(host)
    const plain = parent ? getDelegatedRoot(parent as HTMLElement) : undefined
    const index = plain ? path.indexOf(plain) : -1
    return index < 0 || next <= index
  }

  /** Whether `node` is a bridged root with Solid's listener for `type` on it (not held back). */
  private static listens(node: Node, type: string): boolean {
    if (!bridged.has(node)) return false
    const kinds = kindsInUse.get(node)
    return !kinds || kinds.used.has(type)
  }

  ////////////////
  // ## Only the kinds a root uses
  ////////////////

  /**
   * Hear every node given a delegated handler:  a setter for each kind Solid delegates, on `Element.prototype`.
   * - Solid sets `node._$$click = handler` (`addEvent()`);  the setter makes that an OWN property of the node,
   *   so every later read and write is a plain one, then notes the node (`noteHandler()`).
   * - No getter:  a node without a handler reads `undefined`, as before.
   * - SIDE EFFECT:  page-wide, as this file loads:  an element may draw before its root is registered
   *   (its content is built inside its error boundary first).
   *   - Where there is no DOM yet (node), the first `register()` installs it.
   * - And again at every `register()`, for the kinds Solid delegates SINCE (`watched`):  a bundle that loads each
   *   family on first use (the docs bundle, epic `solid-2-final` P7) runs a family's `delegateEvents(["click"])` long
   *   after the first element drew;  unwatched, its buttons' handlers reached no listener, and no fold folded.
   */
  static watchHandlers() {
    if (typeof Element === "undefined") return
    for (const type of DelegatedEvents) {
      if (watched.has(type)) continue
      watched.add(type)
      const key = `${HANDLER}${type}`
      Object.defineProperty(Element.prototype, key, {
        configurable: true,
        set(this: Element, value: unknown) {
          Object.defineProperty(this, key, { configurable: true, enumerable: true, writable: true, value })
          if (value != null) ShadowEvents.noteHandler(this, type)
        }
      })
    }
  }

  /** `node` was given a handler for `type`:  its root starts listening, or it waits until it's in one. */
  private static noteHandler(node: Element, type: string) {
    const root = node.getRootNode()
    const kinds = kindsInUse.get(root)
    if (kinds) kinds.use(type)
    // not in a root yet, or in a shadow root not registered yet:  look again in a moment
    else if (!(root instanceof Document)) ShadowEvents.wait(node, type)
  }

  /**
   * `node` isn't in a root yet (its template is still being drawn):  look again a microtask later,
   * and before any event of `type` reaches the page (a capturing listener on its document, once per kind).
   */
  private static wait(node: Element, type: string) {
    waiting.push({ node: new WeakRef(node), type })
    if (!isSettleQueued) {
      isSettleQueued = true
      queueMicrotask(settle)
    }
    // the page's document, not the node's:  a node cloned from a template belongs to the template's until inserted
    const document = node.ownerDocument.defaultView?.document ?? globalThis.document
    let kinds = capturing.get(document)
    if (!kinds) capturing.set(document, (kinds = new Set()))
    if (kinds.has(type)) return
    kinds.add(type)
    document.addEventListener(type, settle, { capture: true })
  }

  /**
   * Run `host`'s delegated handler for `event` as the event reaches `host`:  a one-time listener there.
   * - A listener added to a node while an event is on its way there still hears that event.
   * - The platform's own `addEventListener()`, past any the host has of its own (`<ui-card>`'s wraps its clicks).
   * - An event stopped before the host leaves the listener for the next event of its type, which it ignores.
   */
  private static runAtHost(event: Walked, host: Delegating) {
    const listener = (heard: Event) => {
      if (heard === event) ShadowEvents.runHandler(event, host)
    }
    EventTarget.prototype.addEventListener.call(host, event.type, listener, { once: true })
  }

  /** Run `node`'s delegated handler for `event`, as dom-expressions' `handleNode()` does. */
  private static runHandler(event: Walked, node: Delegating) {
    const key = `${HANDLER}${event.type}`
    const handler = node[key] as EventListener | EventListenerObject | undefined
    if (!handler || (node as { disabled?: boolean }).disabled) return
    const data = node[`${key}Data`]
    Object.defineProperty(event, "target", { configurable: true, value: node })
    Object.defineProperty(event, "currentTarget", { configurable: true, value: node })
    try {
      if (data !== undefined) (handler as unknown as (data: unknown, event: Event) => void).call(node, data, event)
      else if (typeof handler === "function") handler.call(node, event)
      else handler.handleEvent(event)
    } finally {
      ShadowEvents.unwalk(event, "target", "currentTarget")
    }
  }

  /** Delete OWN properties `keys` of `event`:  the prototype's (the platform's) getters show through again. */
  private static unwalk(event: Event, ...keys: string[]) {
    for (const key of keys) delete (event as unknown as Record<string, unknown>)[key]
  }

  /** The node Solid's walk visits after `node`. */
  private static parentOf(node: Node): Node | null {
    return (node as Delegating)._$host ?? node.parentNode ?? (node as { host?: Node }).host ?? null
  }
}

////////////////
// ## State
////////////////

/** dom-expressions' `$$EVENT_OWNER`:  the owner (container) whose walk last handled the event. */
const OWNER = "_$SOLID_EVENT_OWNER"

/** dom-expressions' `EVENT_KEY`:  `node._$$click` is a node's delegated `click` handler. */
const HANDLER = "_$$"

/** Render roots with the bridge installed. */
const bridged = new WeakSet<Node>()

/** The root `register()` is registering:  every delegated listener added meanwhile is Solid's. */
let registering: Node | undefined

/** Each bridged shadow root's kinds in use (`used`), and `use(type)`, which adds Solid's held listener. */
const kindsInUse = new WeakMap<Node, { used: Set<string>; use(type: string): void }>()

/** The kinds `watchHandlers()` has put a setter on `Element.prototype` for. */
const watched = new Set<string>()

/** Nodes given a handler before they were in a root, and its kind:  `settle()` looks again. */
let waiting: { node: WeakRef<Element>; type: string }[] = []

/** Whether a microtask's `settle()` is on its way. */
let isSettleQueued = false

/** Per document, the kinds with a capturing `settle()` listener on it. */
const capturing = new WeakMap<Document, Set<string>>()

/**
 * Look again for the root of every node still waiting (`ShadowEvents.wait()`).
 * - A listener added to a root while an event is on its way there still hears that event:
 *   the platform reads a node's listeners as the event reaches it.
 * - A node still in no root keeps waiting, weakly:  one never drawn is let go.
 */
function settle() {
  isSettleQueued = false
  if (!waiting.length) return
  const list = waiting
  waiting = []
  for (const { node: ref, type } of list) {
    const node = ref.deref()
    if (!node) continue
    const root = node.getRootNode()
    // a shadow root still not registered is someone else's:  nothing of ours to add
    if (root instanceof ShadowRoot) kindsInUse.get(root)?.use(type)
    else if (!(root instanceof Document)) waiting.push({ node: ref, type })
  }
}

/** Each bridged root's delegated listeners of Solid's, by kind:  told apart as they're added (`bridge()`). */
const solidListeners = new WeakMap<Node, Map<string, EventListener>>()

/**
 * Solid's capture-phase reset listener, ONE function on every container (dom-expressions `resetDelegatedEvent`):
 * learned the first time a root is registered.
 */
let solidReset: EventListener | undefined

ShadowEvents.watchHandlers()

/**
 * Per event in flight, what the last bridged root did.
 * - `node`:  last composed-path node walked (the root, or its host when the bridge ran the host's handler)
 * - `marker`:  the marker it left;  a different marker later means a plain Solid container walked since
 */
const progress = new WeakMap<Event, { node: Node; marker: Node | true }>()

////////////////
// ## Types
////////////////

/** An event as Solid's walk leaves it. */
type Walked = Event & { [OWNER]?: Node | true; composedPath: () => EventTarget[] }

/** A node that may carry delegated handlers, `_$$<type>` / `_$$<type>Data`, or a `_$host` redirect. */
type Delegating = Node & Record<string, unknown> & { _$host?: Node }
