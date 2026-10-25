import { untrack } from "solid-js"

import type { E } from "spell/element"
// Import directly to avoid circular import:  the decorator runs as the class is defined
import { Reactive, state } from "./Reactive"

/****************
 * ### `Disclosure`
 * ONE open / closed state, for anything that shows and hides a box:
 * a fold, a section, a popover, an overlay (epic `coherence` P8).
 * - A component holds one as a field, handed what differs:
 *   ```ts
 *   readonly disclosure = new E.Disclosure({ component: this, member: "isOpen" })
 *   ```
 * - What it does, the same everywhere:
 *   - the open state:  `isOpen`, read from where the component keeps it (below)
 *   - a guarded request to open or close (`request()`, `toggle()`):
 *     the component's `ui-opening` / `ui-closing` first, which a listener may cancel, then the change
 *   - the after-event, `ui-opened` / `ui-closed` (`sendAfter()`), where the vocabulary has one
 *   - the trigger's `aria-expanded` (`ariaExpanded`)
 *   - the box's `hidden="until-found"` while closed (`hidden`),
 *     and find-in-page opening it (`revealOnMatch`, the box's ref:  the browser's `beforematch`)
 * - Where the state lives, the first of these that's given:
 *   1. `member`:  a member of the component, `@controlled` (`isOpen`, from `open`) or `@state`;
 *      a `@controlled` one changes through `requestChange()`, so the page's own value wins.
 *      `memberMeans: "closed"` for one that's true while closed (a section's `isCollapsed`, from `collapsed`).
 *   2. `kept`:  outside it, read and written through two functions (an element's own `open` attribute)
 *   3. its own, starting as `initial()` says and following it until a request changes it
 * - Each component keeps its own public names:  the Disclosure only sends the events its vocabulary declares,
 *   with the detail it's handed (`detail()`).
 *   No component, no events:  a fold only its reader opens.
 * - It knows nothing of what opening shows:  a popover, an animation, focus going back
 *   are the component's (`onChange()`), or Spell UI's popover panel's on top of it.
 ****************/
export class Disclosure {
  constructor(private readonly setup: DisclosureSetup = {}) {}

  ////////////////
  // ## Open or closed
  ////////////////

  /**
   * Is it open?  Tracked.
   * - `setup.isOpen()` when given:  a section that can't fold is always open.
   */
  get isOpen(): boolean {
    const { setup } = this
    if (setup.isOpen) return setup.isOpen()
    return this.storedOpen
  }

  /** Where the state lives:  the member, `kept`, or its own (`toggled`, else `initial()`). */
  private get storedOpen(): boolean {
    const { component, member, memberMeans, kept, initial } = this.setup
    if (component && member) {
      const value = !!(component as unknown as Record<string, unknown>)[member]
      return memberMeans === "closed" ? !value : value
    }
    if (kept) return kept.isOpen()
    return this.toggled ?? initial?.() ?? false
  }

  /** Its own state, once a request changed it;  `undefined` until then (`initial()` stands). */
  @state private accessor toggled: boolean | undefined = undefined

  /**
   * Open or close as a person would;  true when it changed.
   * - Nothing when it's already so, or `canChange(open)` says no.
   * - The component's `ui-opening` / `ui-closing` first, where its vocabulary has it:  cancelling it changes nothing.
   *   A `@controlled` member changes through `requestChange()`:  a page that sets it while handling the event wins.
   * - `beforeChange(open)` once the event went through, then the change, then `onChange(open)`:
   *   what the component does as it opens or closes.
   * - Untracked:  call it from a handler.
   */
  request(open: boolean, originalEvent?: Event): boolean {
    return untrack(() => {
      if (open === this.isOpen) return false
      const { setup } = this
      if (setup.canChange && !setup.canChange(open)) return false
      const announce = () => {
        const isAllowed = this.send(open ? OPENING : CLOSING, open, originalEvent)
        if (isAllowed) setup.beforeChange?.(open)
        return isAllowed
      }
      const { component, member, memberMeans } = setup
      let isApplied: boolean
      if (component && member && Reactive.isControlled(component, member)) {
        const next = memberMeans === "closed" ? !open : open
        isApplied = component.requestChange(member as never, next as never, announce)
      } else {
        isApplied = announce()
        if (isApplied) this.write(open)
      }
      if (isApplied) setup.onChange?.(open)
      return isApplied
    })
  }

  /** Open if closed, close if open, as a person would (`request()`);  true when it changed. */
  readonly toggle = (originalEvent?: Event): boolean => this.request(!untrack(() => this.isOpen), originalEvent)

  /** Open, as a person would (`request()`);  true when it was closed. */
  readonly open = (originalEvent?: Event): boolean => this.request(true, originalEvent)

  /** Close, as a person would (`request()`);  true when it was open. */
  readonly close = (originalEvent?: Event): boolean => this.request(false, originalEvent)

  /**
   * Send `ui-opened` / `ui-closed`, where the vocabulary has it:  the change is done
   * (an overlay's animation has ended, a section has folded).
   * - The component says when:  only it knows when its change ends.
   * - `originalEvent`:  the person's action, when the change is done at once (a code pane's button).
   */
  sendAfter(open: boolean, originalEvent?: Event): void {
    this.send(open ? OPENED : CLOSED, open, originalEvent, { after: true })
  }

  /**
   * It has opened or closed already, by no request:  the browser did it (find-in-page, a dialog's own Escape).
   * - So follow:  `ui-opening` / `ui-closing` after the fact, NOT cancelable (it's done), then the change,
   *   then `onChange(open)`.
   * - Nothing when it's already so.
   */
  adopt(open: boolean, originalEvent?: Event): void {
    untrack(() => {
      if (open === this.isOpen) return
      this.send(open ? OPENING : CLOSING, open, originalEvent, { cancelable: false })
      this.write(open)
      this.setup.onChange?.(open)
    })
  }

  /** Write the state where it lives, with no event. */
  private write(open: boolean) {
    const { component, member, memberMeans, kept } = this.setup
    if (component && member) {
      ;(component as unknown as Record<string, unknown>)[member] = memberMeans === "closed" ? !open : open
    } else if (kept) kept.setOpen(open)
    else this.toggled = open
  }

  ////////////////
  // ## The trigger and the box
  ////////////////

  /** The trigger's `aria-expanded`;  tracked. */
  get ariaExpanded(): "true" | "false" {
    return this.isOpen ? "true" : "false"
  }

  /** The box's `hidden`:  `until-found` while closed, so find-in-page still reaches its text;  tracked. */
  get hidden(): typeof UNTIL_FOUND | undefined {
    return this.isOpen ? undefined : UNTIL_FOUND
  }

  /**
   * The box's ref:  find-in-page matched inside it while closed, and the browser has revealed it (`beforematch`).
   * - So it opens (`adopt()`):  `ui-opening` after the fact, NOT cancelable, as the match is already showing.
   */
  readonly revealOnMatch = (box: HTMLElement) => {
    box.addEventListener("beforematch", () => this.adopt(true))
  }

  ////////////////
  // ## Events
  ////////////////

  /**
   * Send event `name` from the component, when its vocabulary has it;  false when a listener cancelled it.
   * - `cancelable`:  as the vocabulary says, unless `false` here (`adopt()`'s).
   * - `after`:  an after-event, its detail `afterDetail()`'s when given.
   */
  private send(name: string, open: boolean, originalEvent?: Event, { cancelable, after }: SendOptions = {}) {
    const { component, detail, afterDetail } = this.setup
    if (!component || !component.vocabulary.events.some((event) => event.name === name)) return true
    const eventDetail =
      after && afterDetail ? afterDetail(open) : detail ? detail(open, originalEvent) : { open, originalEvent }
    if (cancelable !== false) return component.send(name as never, eventDetail)
    const init = { bubbles: true, composed: true, cancelable: false, detail: eventDetail }
    return component.domElement.dispatchEvent(new CustomEvent(component.elementDefinition.event(name), init))
  }
}

/** What a `Disclosure` is handed:  every key optional. */
export type DisclosureSetup = {
  /** the component whose events it sends, and whose `member` holds the state;  none:  no events */
  component?: E.UIComponent
  /** the component's member holding the state:  `@controlled` (`isOpen`) or `@state` */
  member?: string
  /** `"closed"`:  `member` is true while closed (`isCollapsed`).  Default:  `"open"`. */
  memberMeans?: "open" | "closed"
  /** the state kept outside it, when there's no `member` */
  kept?: KeptOpen
  /** its own state's starting value, followed until a request changes it.  Default:  closed. */
  initial?: () => boolean
  /** open?  When that's more than where the state lives (a section that can't fold is always open);  tracked */
  isOpen?: () => boolean
  /** may it open (`true`) or close (`false`) now?  Default:  always */
  canChange?: (open: boolean) => boolean
  /** each event's detail.  Default:  `{ open, originalEvent }` */
  detail?: (open: boolean, originalEvent?: Event) => object
  /** the after-events' detail (`ui-opened` / `ui-closed`), when not `detail()`'s:  `{ visible }` */
  afterDetail?: (open: boolean) => object
  /** a request is going ahead (its event wasn't cancelled), just before the change:  measure the page first */
  beforeChange?: (open: boolean) => void
  /** a request (or find-in-page) opened or closed it:  what opening resets, where focus goes */
  onChange?: (open: boolean) => void
}

/** Where a `Disclosure` keeps its state when it's not in itself:  an element's own `open` attribute. */
export type KeptOpen = {
  /** open?  tracked */
  isOpen: () => boolean
  /** a request opened or closed it */
  setOpen: (open: boolean) => void
}

/** How `Disclosure.send()` sends one. */
type SendOptions = {
  /** `false`:  not cancelable, whatever the vocabulary says */
  cancelable?: false
  /** an after-event:  `afterDetail()` */
  after?: boolean
}

/** The events, by their English names:  the vocabulary's own spelling goes out (`send()`). */
const OPENING = "ui-opening"
const CLOSING = "ui-closing"
const OPENED = "ui-opened"
const CLOSED = "ui-closed"

/** The `hidden` value that find-in-page still searches. */
const UNTIL_FOUND = "until-found"
