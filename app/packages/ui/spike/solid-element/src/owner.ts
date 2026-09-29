/*!
 * @spell/solid-element -- MIT licence.
 * A fork of `@solidjs/element` and `component-register` (MIT, (c) Ryan Carniato).
 */

/**
 * FIX 8 -- the Solid owner an element adopts, found across shadow roots.
 * - Solid's compiler stamps `_$owner` (the current owner) on custom elements and `<slot>`s it creates;  an
 *   element renders under the nearest stamped ancestor, so app context reaches it.
 * - `@solidjs/element`'s walk followed `parentNode` only, which ends at a `ShadowRoot`:  an element created
 *   inside another element's shadow root WITHOUT JSX (`innerHTML`, `document.createElement`, a template clone)
 *   lost all context from the page.  Here the walk continues at the shadow root's host.
 * - Kept from rc.11:  `withSolid` falls back to an ownerless root when the found owner belongs to a different copy
 *   of Solid (solidjs/solid#3053).
 */

import type { Owner } from "solid-js"

/** A node that may carry Solid's owner stamp. */
type Stamped = Node & { _$owner?: Owner; assignedSlot?: Stamped | null; host?: Stamped }

/** Nearest `_$owner` for `element`:  its slot, then ancestors (and their slots) across shadow roots, then its own. */
export function lookupOwner(element: Element): Owner | undefined {
  const start = element as Stamped
  if (start.assignedSlot?._$owner) return start.assignedSlot._$owner
  let next = start.parentNode as Stamped | null
  while (next) {
    if (next._$owner) return next._$owner
    if (next.assignedSlot?._$owner) return next.assignedSlot._$owner
    // a ShadowRoot (nodeType 11 with a host) continues at its host;  NEVER read `host` elsewhere (`<a>.host` is a URL part)
    next = (next.parentNode ?? (next.nodeType === 11 ? next.host : null) ?? null) as Stamped | null
  }
  return start._$owner
}
