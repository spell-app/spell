import { PART_STATIC_CLASS_PREFIX } from "$/components/components.types"
import { PART_VOCABULARIES } from "$/components/parts/parts.vocabulary.en"
import type { ComponentVocabulary } from "$/vocabulary"
import { PartOwners } from "../../elements"

/**
 * Stand-in OWNERS for the demo and tests:  `<x-card>`, `<x-feed>`, `<x-statistic>` ... until the real card,
 * feed and statistic components land.
 * - Light DOM only, no styles of their own:  the parts inside are its children, exactly as they'd be slotted
 *   into a real owner's root, and the example sets the owner's layout and owner tokens inline (as the
 *   class-grammar fragments do).
 * - Owns every part whose vocabulary lists `in-<noun>` as a state;  a statistic also owns `label`.
 * - NOTE: registered with `PartOwners` like a real owner, so the parts' lookup is the production path.
 */
export class OwnerStub extends HTMLElement {
  /** Define `x-<noun>` for every owner noun the part vocabularies name.  Idempotent. */
  static defineAll() {
    for (const [noun, parts] of OwnerStub.ownersByNoun()) OwnerStub.define(noun, parts)
  }

  /** Define `x-<noun>` owning `parts`.  Idempotent. */
  static define(noun: string, parts: readonly string[]) {
    const tag = `${STUB_PREFIX}-${noun}`
    if (customElements.get(tag)) return
    const vocabulary: ComponentVocabulary = {
      tag,
      noun,
      attributes: [],
      events: [],
      slots: [],
      parts: [],
      states: [],
      texts: [],
      ownsParts: parts
    }
    PartOwners.register(tag, vocabulary)
    customElements.define(tag, class extends OwnerStub {})
  }

  /** Owner noun => the part nouns it owns, from the parts' `in-<owner>` states. */
  private static ownersByNoun(): Map<string, string[]> {
    const owners = new Map<string, string[]>([["statistic", ["label"]]])
    for (const vocabulary of PART_VOCABULARIES) {
      for (const { name } of vocabulary.states) {
        // `in-<owner>` states;  `header` and `label` are real owners already
        const noun = name.slice(PART_STATIC_CLASS_PREFIX.length)
        if (!name.startsWith(PART_STATIC_CLASS_PREFIX) || noun === "header" || noun === "label") continue
        owners.set(noun, [...(owners.get(noun) ?? []), vocabulary.noun])
      }
    }
    return owners
  }
}

/** Stub tags are `x-<noun>`, never `ui-*`, so they can't collide with a real component. */
const STUB_PREFIX = "x"
