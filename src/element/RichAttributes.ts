import { camelCase } from "spell-kit/util/string"
import type { E } from "spell-kit/element"

/****************
 * ### `RichAttributes`
 * Turns a function or an object given to an attribute of a dashed tag into a listener or a property:
 * what Solid hands our elements for a plain JSX prop.
 * - `<ui-select on-ui-change={f}>`:  a listener for the element's `ui-change` event
 *   - on a translated tag, its own name for that event (`ElementDefinition.event()`), given the tag's `definition`
 * - `<ui-tree-diagram tree={tree}>`, `options={[...]}`:  the element's PROPERTY, `el.tree = tree`
 * - Text stays an attribute, as the browser has it.
 *
 * - Why:  Solid 2 sets a prop it doesn't know with `setAttribute(name, value)`, the value as it is,
 *   and the browser would turn a function or object into text.
 *   - So our JSX needs no `prop:` and no `on:` (epic `solid-17`, Q3 C and Q4).
 *
 * - Two places catch these values:
 *   - a defined element:  its own `setAttribute()` (`DOMElement`)
 *   - an element whose tag isn't defined yet (its pack still loading):
 *     a page-wide patch on the browser's `setAttribute()`,
 *     which HOLDS the values until the element connects as one of ours (`replay()`)
 *
 * - `<ui-root pure>` turns the patch off for the whole page:
 *   - the patch looks for it each time it would hold a value,
 *     and puts the browser's own `setAttribute()` back the first time it finds it
 *   - so a `<ui-root pure>` the app draws itself comes too late for what the patch held before it
 *   - With `pure`, a function or object given to a tag not defined yet becomes text, as in plain Solid.
 *   - Defining every tag up front, from `<ui-root>`'s catalog, would fix that (epic `solid-17`, Q5).
 *     Not built:  see the epic's judgement call on it.
 *
 * - STATIC and instance-free:  what it keeps per element is in three `WeakMap`s.
 * - Imports only util's `string` and its own types:  `DOMElement` imports it, never the other way round.
 ****************/
export class RichAttributes {
  /** Is `value` one we take:  a function or an object, `null` aside?  Text, numbers and booleans stay attributes. */
  static isRich(value: unknown): boolean {
    return typeof value === "function" || (typeof value === "object" && value !== null)
  }

  /**
   * `element`'s attribute `name` was given `value` (`isRich()`):  listen, or set the property.
   * - `on-<event>`:  replaces the listener a former value added.
   * - Anything else:  the property its vocabulary names (`attributeNamed()`), else `name` camelCased.
   */
  static apply(element: Element, name: string, value: unknown, definition?: E.ElementDefinition) {
    if (name.startsWith(EVENT_PREFIX)) {
      return RichAttributes.listen(element, name, value as EventListenerOrEventListenerObject, definition)
    }
    ;(element as unknown as Record<string, unknown>)[RichAttributes.propertyFor(name, definition)] = value
    ;(propertiesSet.get(element) ?? propertiesSet.set(element, new Set()).get(element)!).add(name)
  }

  /**
   * `element`'s attribute `name` was removed:  drop the listener a value added, or the property it set.
   * - NEVER throws.
   */
  static clear(element: Element, name: string, definition?: E.ElementDefinition) {
    held.get(element)?.delete(name)
    const listener = listeners.get(element)?.get(name)
    if (listener) {
      element.removeEventListener(listener.type, listener.listener)
      listeners.get(element)!.delete(name)
    }
    if (propertiesSet.get(element)?.delete(name)) {
      ;(element as unknown as Record<string, unknown>)[RichAttributes.propertyFor(name, definition)] = undefined
    }
  }

  /**
   * Give `element` again what the page-wide patch held for it before its tag was defined:  call as it connects.
   * - Before its component is built, so the component starts with them,
   *   as with properties set before the upgrade.
   */
  static replay(element: Element, definition?: E.ElementDefinition) {
    const values = held.get(element)
    if (!values) return
    held.delete(element)
    for (const [name, value] of values) RichAttributes.apply(element, name, value, definition)
  }

  /**
   * Does attribute `name` of `element` name a property of its family's own script API,
   * so even TEXT for it goes to the property (`<ui-code content={markup}>`, `<epic-text-box value={text}>`)?
   * - The family's API:  a property with a setter on a class between the tag's own and `Base` (`DOMElement`),
   *   e.g. `DOMLoadableElement.content`.
   *   - Not the tag's own class:  its vocabulary's properties are attributes already.
   * - Never a vocabulary attribute, nor anything of `Base`'s or the browser's.
   */
  static isScriptApi(element: Element, name: string, Base: Function, definition?: E.ElementDefinition): boolean {
    if (!definition || definition.attributeNamed(name)) return false
    const property = camelCase(name)
    let prototype = Object.getPrototypeOf(Object.getPrototypeOf(element) as object) as object | null
    while (prototype && prototype !== Base.prototype) {
      if (Object.getOwnPropertyDescriptor(prototype, property)?.set) return true
      prototype = Object.getPrototypeOf(prototype) as object | null
    }
    return false
  }

  /**
   * First connect:  each attribute in `element`'s markup that names its family's script API (`isScriptApi()`)
   * sets that property, `<ui-code content="...">` as `code.content = "..."`.
   */
  static readScriptApiAttributes(element: Element, Base: Function, definition?: E.ElementDefinition) {
    for (const { name, value } of [...element.attributes]) {
      if (RichAttributes.isScriptApi(element, name, Base, definition))
        RichAttributes.apply(element, name, value, definition)
    }
  }

  ////////////////
  // ## The page-wide patch
  ////////////////

  /**
   * Patch the browser's `setAttribute()` and `removeAttribute()`, once,
   * so an element whose tag isn't defined yet keeps the functions and objects it's given (`held`).
   * - Only a dashed tag, not defined, given a rich value:  everything else goes straight to the browser.
   * - SIDE EFFECT, on the whole page:  `Element.prototype` changes.
   * - Called as this file loads, in a browser only.
   */
  static installPatch() {
    const Element = globalThis.Element
    if (!Element || patched) return
    const prototype = Element.prototype
    const { setAttribute, removeAttribute } = prototype
    patched = { setAttribute, removeAttribute }
    prototype.setAttribute = function (this: Element, name: string, value: string) {
      if (RichAttributes.isRich(value) && isUndefinedTag(this) && !RichAttributes.isPure()) {
        return void (held.get(this) ?? held.set(this, new Map()).get(this)!).set(name, value)
      }
      setAttribute.call(this, name, value)
    }
    prototype.removeAttribute = function (this: Element, name: string) {
      held.get(this)?.delete(name)
      removeAttribute.call(this, name)
    }
  }

  /**
   * Has the page asked for no patch (`<ui-root pure>`)?
   * - SIDE EFFECT:  the first time it has, the browser's own calls are put back.
   */
  static isPure(): boolean {
    if (!patched || !globalThis.document?.querySelector(PURE_ROOT)) return false
    Object.assign(globalThis.Element.prototype, patched)
    patched = undefined
    return true
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Listen for `name`'s event (`on-ui-change` => `ui-change`, localized) with `listener`, replacing a former one. */
  private static listen(
    element: Element,
    name: string,
    listener: EventListenerOrEventListenerObject,
    definition?: E.ElementDefinition
  ) {
    const event = name.slice(EVENT_PREFIX.length)
    const type = definition?.event(event) ?? event
    RichAttributes.clear(element, name, definition)
    element.addEventListener(type, listener)
    ;(listeners.get(element) ?? listeners.set(element, new Map()).get(element)!).set(name, { type, listener })
  }

  /** The property attribute `name` sets:  its vocabulary's (`attributeNamed()`), else `name` camelCased. */
  private static propertyFor(name: string, definition?: E.ElementDefinition): string {
    return definition?.attributeNamed(name)?.property ?? camelCase(name)
  }
}

/** Is `element` a dashed tag nobody has defined yet? */
function isUndefinedTag(element: Element): boolean {
  return element.localName.includes("-") && !customElements.get(element.localName)
}

/** The attribute prefix that makes a listener:  `on-ui-change`. */
const EVENT_PREFIX = "on-"

/** The page saying "no patch":  `<ui-root pure>`. */
const PURE_ROOT = "ui-root[pure]"

/** Values the patch held for elements not defined yet, by attribute name, until `replay()`. */
const held = new WeakMap<Element, Map<string, unknown>>()

/** The listeners `on-*` attributes added, by attribute name, so a new value replaces the old one. */
const listeners = new WeakMap<Element, Map<string, { type: string; listener: EventListenerOrEventListenerObject }>>()

/** The attribute names whose values went to a property, so removing the attribute clears it. */
const propertiesSet = new WeakMap<Element, Set<string>>()

/** The browser's own calls while the patch is in, to put back (`isPure()`). */
let patched: Pick<Element, "setAttribute" | "removeAttribute"> | undefined

RichAttributes.installPatch()
