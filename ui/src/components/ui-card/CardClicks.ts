/****************
 * ### `CardClicks`
 * What makes a whole card clickable, for `UICard`:  a click anywhere on it is the card's,
 * unless it's on something interactive inside, which keeps it, or it ends a selection of text.
 * - By looking at the click's path, so nobody writing a card has to stop anything.
 * - Each click is seen, never stopped:  a button inside a card is handled further up the page
 *   (Solid hands out `onClick`s from its render root), so stopping it here would lose the button's own click.
 *   - So the card's own handlers are what's wrapped:  each only runs for a click that's the card's.
 *   - A link card's `<a>` is told not to follow (`preventDefault()`), only where the browser would.
 * - A card with an `onClick` (no `link`) gets what a link card has by itself:  one Tab stop, Enter:  `UICard.render()`.
 * - Plain DOM:  no Solid.  A control is known by what it's made of:  `isInteractive()`.
 ****************/
export class CardClicks {
  constructor(
    /** The `<ui-card>`. */
    private readonly host: HTMLElement,
    /** Hears when the card first has a click handler of its own. */
    private readonly noteHandler: () => void
  ) {
    // the plain one:  this listener isn't one of the card's own
    EventTarget.prototype.addEventListener.call(host, "click", this.keepLinkFromFollowing)
    EventTarget.prototype.addEventListener.call(host, "keydown", this.pressOnEnter)
    this.wrapHandlers()
  }

  /** Is this click the card's:  not on something interactive inside, and not the end of selecting its text? */
  isOwnClick(event: Event): boolean {
    return !this.interactiveOnPath(event) && !this.endsSelection()
  }

  /** The interactive thing inside the card this event went through, innermost first. */
  private interactiveOnPath(event: Event): Element | undefined {
    for (const target of event.composedPath()) {
      if (target === this.host) return undefined
      if (!(target instanceof Element)) continue
      if (isRootOf(target, this.host)) return undefined
      if (isInteractive(target)) return target
    }
    return undefined
  }

  /** Is there text selected in the card, as there is when a click ends a drag across it? */
  private endsSelection(): boolean {
    const selection = this.host.ownerDocument.getSelection()
    return !!selection && !selection.isCollapsed && selection.containsNode(this.host, true)
  }

  /** A click on a link card that isn't the card's, where nothing inside takes the browser's following:  it doesn't follow. */
  private readonly keepLinkFromFollowing = (event: Event): void => {
    if (this.isOwnClick(event)) return
    const inside = this.interactiveOnPath(event)
    if (!inside || !followsItself(inside)) event.preventDefault()
  }

  /** Enter on the card itself, when it isn't a link already:  as a link does, it clicks. */
  private readonly pressOnEnter = (event: Event): void => {
    const [target] = event.composedPath()
    if ((event as KeyboardEvent).key !== "Enter" || !(target instanceof HTMLElement)) return
    if (!isRootOf(target, this.host) || target.localName === "a") return
    event.preventDefault()
    target.click()
  }

  /**
   * Every click handler given to the card runs only for a click that's its own.
   * - Solid's `onClick`, and `addEventListener()`.
   * - HACK:  Solid keeps a delegated handler on the node, as `SOLID_CLICK`, and reads it there:
   *   an accessor is the one way to stand between.  `UICard.test.tsx` fails if that name changes.
   */
  private wrapHandlers(): void {
    const { host } = this
    const wrap = (handler: EventListenerOrEventListenerObject): EventListener => {
      const run = typeof handler === "function" ? handler : (event: Event) => handler.handleEvent(event)
      return (event) => {
        if (this.isOwnClick(event)) run.call(host, event)
      }
    }
    let delegated: EventListener | undefined
    const given = (host as unknown as Record<string, EventListener | undefined>)[SOLID_CLICK]
    const setDelegated = (handler: EventListener | undefined) => {
      delegated = handler && wrap(handler)
      if (handler) this.noteHandler()
    }
    setDelegated(given)
    Object.defineProperty(host, SOLID_CLICK, { configurable: true, get: () => delegated, set: setDelegated })
    const wrapped = new WeakMap<object, EventListener>()
    const { addEventListener, removeEventListener } = EventTarget.prototype
    host.addEventListener = (type: string, listener: EventListenerOrEventListenerObject | null, options?: unknown) => {
      if (type !== "click" || !listener) return addEventListener.call(host, type, listener, options as never)
      if (!wrapped.has(listener)) wrapped.set(listener, wrap(listener))
      this.noteHandler()
      addEventListener.call(host, type, wrapped.get(listener)!, options as never)
    }
    host.removeEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: unknown
    ) => {
      const each = (listener && wrapped.get(listener)) ?? listener
      removeEventListener.call(host, type, each, options as never)
    }
  }
}

/** Where Solid keeps a delegated `onClick`:  `EVENT_KEY` + the event's name, in `@solidjs/web`. */
const SOLID_CLICK = "_$$click"

/** What's interactive by its tag. */
const INTERACTIVE_TAGS = new Set(["a", "button", "input", "select", "textarea", "label", "summary", "option"])

/** What's interactive by its role. */
const INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "checkbox",
  "radio",
  "switch",
  "combobox",
  "listbox",
  "option",
  "menu",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "slider",
  "spinbutton",
  "searchbox",
  "textbox",
  "tab"
])

/** A button before its family has drawn it. */
const BUTTON_TAG = "ui-button"

/** What makes a custom element a control, when it's in its shadow root. */
const CONTROL_INSIDE =
  "button, a[href], input, select, textarea, [role=button], [role=combobox], [role=slider], [tabindex='0']"

/** Is `element` the card's own box, in `host`'s shadow root? */
function isRootOf(element: Element, host: Element): boolean {
  return element.getRootNode() === host.shadowRoot && element.matches("[part~=card]")
}

/**
 * Is `element` something a person presses, types in or moves:  by its tag, its role, or being a stop for Tab?
 * - A custom element by what it's made of:  a click on its own box, or one still loading its family, has none of that on its path.
 */
function isInteractive(element: Element): boolean {
  if (INTERACTIVE_TAGS.has(element.localName)) return true
  if (element.localName.includes("-")) {
    if (element.localName === BUTTON_TAG || (element.constructor as { formAssociated?: boolean }).formAssociated)
      return true
    if (element.shadowRoot?.querySelector(CONTROL_INSIDE)) return true
  }
  if ((element as HTMLElement).isContentEditable) return true
  const role = element.getAttribute("role")
  if (role && INTERACTIVE_ROLES.has(role)) return true
  const tabIndex = element.getAttribute("tabindex")
  return tabIndex !== null && Number(tabIndex) >= 0
}

/** Does the browser give `element` a click's default itself, so a link around it follows nothing? */
function followsItself(element: Element): boolean {
  const { localName } = element
  if (localName === "a") return element.hasAttribute("href")
  if (localName === "input")
    return /^(?:checkbox|radio|submit|reset|button|image|file|color)$/.test((element as HTMLInputElement).type)
  return localName === "button" || localName === "label" || localName === "summary"
}
