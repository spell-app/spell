import { E } from "spell/ui/core"

/****************
 * ### `AddressParameter`
 * Keeps one element's value in its page's address, so Back and Forward step through it,
 * and a link to the page opens it showing that value.
 * - Where in the address (`AddressPlace`):
 *   - a query parameter, `?server=met&s=van+gogh`:  `parameter="server"` on `<ui-tabs>` or any form control
 *   - or the hash, `#value`:  `<ui-tabs history>`
 * - `record()`:  the value settled (a tab chosen, a search left to rest) -- a new history entry,
 *   when the address changes.
 *   - Every other parameter, and the hash, are kept;  an empty value takes its parameter out.
 * - `follow()`:  while the element is connected,
 *   - opening the page shows the value the address holds
 *   - Back and Forward (`popstate`, and `hashchange` for the hash) show the value of the entry they reach:
 *     its value in the address, else the value the element started with
 *   - showing a value is the component's own (`show`):  it changes as a person's change would, events and all,
 *     so a form, and a Spell program, hear it;  the change it makes is NOT recorded again
 * - The page globals (`window`, `location`, `history`) are the element's document's,
 *   so an element in an iframe follows its own frame.
 * - Plain DOM:  no Solid, so it holds no reactive state;  the component calls it from its own effects.
 ****************/
export class AddressParameter {
  constructor(props: AddressParameterProps) {
    this.props = props
  }

  /** What it's handed:  the element, and how to read and show its value. */
  private readonly props: AddressParameterProps

  /** Showing a value from the address:  its change isn't recorded again. */
  private isShowing = false

  /** The value the element had when it started following:  what an entry without the parameter shows. */
  private startingText: string | undefined

  /**
   * Follow `place` while the element is connected:  show the value the address holds now (once the page's own
   * updates have run, so a form has bound the element first), then each one Back and Forward reach.
   * - Returns the cleanup, for the component's effect;  `undefined` place:  nothing, no cleanup.
   */
  follow(place: AddressPlace | undefined): (() => void) | undefined {
    if (!place) return undefined
    this.startingText = this.props.read()
    const listeners = new AbortController()
    const onNavigate = (event: Event) => this.showAddress(place, event)
    const types = "hash" in place ? HASH_EVENTS : QUERY_EVENTS
    for (const type of types) this.view.addEventListener(type, onNavigate, { signal: listeners.signal })
    const cancelOpening = E.soon(() => this.showAddress(place))
    return () => {
      cancelOpening()
      listeners.abort()
    }
  }

  /**
   * The value settled:  put it in the address as a new history entry (`history.pushState()`).
   * - A microtask later, so a control that announces its change before applying it (a checkbox) is read after.
   * - Nothing when the address already says so, or while showing a value from the address
   *   (a value shown from the address is what it holds, so a later record of it changes nothing either).
   * - NEVER throws.
   */
  record(place: AddressPlace | undefined) {
    if (!place || this.isShowing) return
    E.afterSolidUpdate(() => {
      const { history, location } = this.view
      const href = AddressParameter.hrefWith(location, place, this.props.read())
      if (href !== location.href) history.pushState(history.state, "", href)
    })
  }

  /** Show the value `place` holds in the address now, else the starting value;  nothing when it shows already. */
  private showAddress(place: AddressPlace, event?: Event) {
    const text = AddressParameter.textIn(this.view.location, place) ?? this.startingText
    if ((text ?? "") === (this.props.read() ?? "")) return
    this.isShowing = true
    try {
      this.props.show(text, event)
    } finally {
      this.isShowing = false
    }
  }

  /** The element's window:  its document's. */
  private get view(): Window {
    return this.props.domElement.ownerDocument.defaultView ?? window
  }

  /**
   * The value `place` holds in `location`, or `undefined` when it has none.
   * - Static:  reads only its arguments.
   */
  static textIn(location: Location | URL, place: AddressPlace): string | undefined {
    if ("parameter" in place) return new URLSearchParams(location.search).get(place.parameter) ?? undefined
    const hash = location.hash.slice(1)
    if (!hash) return undefined
    try {
      return decodeURIComponent(hash)
    } catch {
      return hash
    }
  }

  /**
   * `location`'s address with `text` at `place`:  every other parameter, and the hash, kept;
   * an empty `text` takes a parameter out.
   * - Static:  reads only its arguments.
   */
  static hrefWith(location: Location | URL, place: AddressPlace, text: string | undefined): string {
    const url = new URL(location.href)
    if ("hash" in place) url.hash = text ? encodeURIComponent(text) : ""
    else if (text) url.searchParams.set(place.parameter, text)
    else url.searchParams.delete(place.parameter)
    return url.href
  }
}

/** What `AddressParameter` is handed. */
export type AddressParameterProps = {
  /** the element whose value it keeps:  its document's window is the one followed */
  domElement: Element
  /** the value now, as text;  `undefined` or `""` for none */
  read: () => string | undefined
  /**
   * Show `text` (`undefined`:  the starting value was none), as a person's change would, events and all.
   * - `event`:  the `popstate` / `hashchange` that asked, if any (a page opened on the address has none).
   */
  show: (text: string | undefined, event?: Event) => void
}

/** Where in the address a value lives:  a query parameter (`?name=value`), or the hash (`#value`). */
export type AddressPlace = { readonly parameter: string } | { readonly hash: true }

/** Events that move the query:  Back and Forward. */
const QUERY_EVENTS = ["popstate"] as const

/** Events that move the hash:  Back and Forward, and a link to `#value`. */
const HASH_EVENTS = ["hashchange", "popstate"] as const
