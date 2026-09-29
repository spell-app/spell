import type { ReactiveController, ReactiveControllerHost } from "lit"

import { OwnerContext, type OwnerMatch } from "$/elements"

import type { OwnerControllerOptions, OwnerTracker } from "./elements.types"
import { PartOwners } from "./PartOwners"

/**
 * Lit controller that keeps an element's OWNER current:  the nearest component whose vocabulary `ownsParts`
 * includes `noun` (`PartOwners.find()`), mirrored as `:state(in-<owner>)` on the host.
 * - Resolves on connect (so a reparented element re-resolves), when an owner registers late, and when a slot
 *   it's assigned to changes (`UIElement` reports every `slotchange` in its shadow root to `PartOwners`).
 * - Sets the STATE only, never the `in-<owner>` class:  that class exists for static markup (`parts.css`).
 * - Re-renders the host when the owner changes:  an owned header renders a bare `.header`.
 * - Used by `ContentPart`, and by the components that are sometimes someone's part:  `<ui-icon>` (in
 *   `<ui-icons>`), `<ui-label>` (a statistic's label).
 */
export class OwnerController implements ReactiveController, OwnerTracker {
  /** the element looking for its owner */
  readonly element: HostElement
  /** current owner, `undefined` when standalone */
  owner: OwnerMatch | undefined

  /** part noun to look up owners for */
  private readonly noun: string
  private readonly options: OwnerControllerOptions

  constructor(host: HostElement, noun: string, options: OwnerControllerOptions = {}) {
    this.element = host
    this.noun = noun
    this.options = options
    host.addController(this)
  }

  /** Owner noun, e.g. `card`;  `undefined` when standalone. */
  get ownerNoun(): string | undefined {
    return this.owner?.ownerNoun
  }

  hostConnected() {
    PartOwners.connect(this)
    this.resolveOwner()
  }

  hostDisconnected() {
    PartOwners.disconnect(this)
  }

  /** Look the owner up again;  on a change, swap the `in-<owner>` state and re-render. */
  resolveOwner() {
    let match = PartOwners.find(this.element, this.noun)
    if (match && this.options.direct && !this.isDirect(match.owner)) match = undefined
    const previous = this.owner
    if (previous?.owner === match?.owner && previous?.ownerNoun === match?.ownerNoun) return
    const states = this.element.internals.states as Set<string> | undefined
    if (previous) states?.delete(OwnerContext.stateName(previous.ownerNoun))
    if (match) states?.add(OwnerContext.stateName(match.ownerNoun))
    this.owner = match
    this.element.requestUpdate()
    this.options.onChange?.()
  }

  /** Is `owner` the element's light-DOM parent, or the host that rendered it? */
  private isDirect(owner: Element): boolean {
    const root = this.element.getRootNode()
    return this.element.parentElement === owner || (root instanceof ShadowRoot && root.host === owner)
  }
}

/** What `OwnerController` needs of its host:  a Lit element with `ElementInternals` (states). */
type HostElement = ReactiveControllerHost & HTMLElement & { readonly internals: ElementInternals }
