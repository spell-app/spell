import { OwnerContext, type OwnerMatch } from "$/elements"
import type { ComponentVocabulary } from "$/vocabulary"

import type { OwnerTracker } from "./elements.types"

/**
 * Page-wide registry behind owner context:  which tags own which parts, which tags are components at all,
 * and which owned elements are connected right now.
 * - Filled by `UIElement.define()`:  every registered tag (canonical or translated) is recorded as a
 *   component, and one whose vocabulary lists `ownsParts` becomes an owner of those nouns.
 * - `find()` wraps `OwnerContext.find()` with a `barrier` at any registered component that is neither an
 *   owner of the part nor a part itself, so a header inside a segment inside a card stays standalone (as
 *   Fomantic's child combinators have it).  Unregistered custom elements (an app's own wrappers) don't block.
 * - Keeps the connected `OwnerTracker`s (`OwnerController`s), so a late owner registration or a `slotchange`
 *   re-resolves them.
 * - Static-only, like `Icons`:  one registry per page.
 * - NOTE: by TAG, not by instance:  an owner is found before it upgrades, so upgrade order doesn't matter.
 */
export class PartOwners {
  /** part noun => (owner tag => owner noun) */
  private static readonly owners = new Map<string, Map<string, string>>()
  /** registered component tag => is it a content part */
  private static readonly components = new Map<string, boolean>()
  /** connected trackers, one per element that resolves an owner */
  private static readonly connected = new Set<OwnerTracker>()

  ////////////////
  // ## Registration
  ////////////////

  /**
   * Record `tag` as a component with `vocabulary`;  `part` marks a content part (transparent to the climb).
   * - SIDE EFFECT:  a new owner re-resolves every connected owned element, since one may now have an owner.
   */
  static register(tag: string, vocabulary: ComponentVocabulary, part = false) {
    PartOwners.components.set(tag, part)
    if (!vocabulary.ownsParts?.length) return
    for (const noun of vocabulary.ownsParts) {
      let owners = PartOwners.owners.get(noun)
      if (!owners) PartOwners.owners.set(noun, (owners = new Map()))
      owners.set(tag, vocabulary.noun)
    }
    for (const tracker of PartOwners.connected) tracker.resolveOwner()
  }

  ////////////////
  // ## Lookup
  ////////////////

  /** Nearest owner of `element` for part `noun`, climbing the flat tree;  see class docs for the barrier. */
  static find(element: Element, noun: string): OwnerMatch | undefined {
    const owners = PartOwners.owners.get(noun)
    if (!owners) return undefined
    return OwnerContext.find(element, owners, { barrier: PartOwners.isBarrier })
  }

  /** Is `element` a registered component that isn't a content part?  (Owners are matched before this.) */
  static isBarrier(element: Element): boolean {
    return PartOwners.components.get(element.localName) === false
  }

  ////////////////
  // ## Connected elements
  ////////////////

  /** Track `tracker` while its element is connected. */
  static connect(tracker: OwnerTracker) {
    PartOwners.connected.add(tracker)
  }

  /** Stop tracking `tracker`. */
  static disconnect(tracker: OwnerTracker) {
    PartOwners.connected.delete(tracker)
  }

  /**
   * A slot's assignment changed:  re-resolve every tracked element in or under `assigned`.
   * - Needed because an element is never told that it was re-slotted, only its new slot is (`slotchange`).
   */
  static reslotted(assigned: readonly Element[]) {
    if (!assigned.length) return
    for (const tracker of PartOwners.connected) {
      const { element } = tracker
      if (assigned.some((node) => node === element || node.contains(element))) tracker.resolveOwner()
    }
  }
}
