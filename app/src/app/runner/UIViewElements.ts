import { camelCase } from "spell/util"
import { E } from "spell/ui/core"
import { RootLoader } from "spell/ui/components/ui-root"
import type { Core } from "spell/parser/core"
import { SpellElement } from "./SpellElement"

/****************
 * ### `UIViewElements`
 * The element of a Spell type built on a Spell UI element:
 * `a "netlist column" is a ui tree view` in a project called Harbor draws as `<harbor-netlist-column>`,
 * a `<ui-tree>` of its own.
 *
 * - Its component is a subclass of the element's (`UITree`), found by its tag once its family has loaded:
 *   - its vocabulary is the element's, under the type's tag
 *   - each attribute the type gives its own value is that attribute's default:
 *     `its appearance is columns` makes `appearance="columns"` the default
 *   - its sheet is the element's, then the type's own `<css>` (`SpellElement.cssOf()`)
 *   - each hook the type overrides (`rowClass`, its `to give the row class of (an item)`) calls the type's method
 * - The type's thing:  the one the program drew (`draw the netlist column`), else one the element makes for itself,
 *   whose methods the hooks call.
 * - Defined by `SpellElement.defineFor()`, which `core.elementDefiner` calls for every view class:
 *   it hands a class with a Spell UI element (`core.uiElementOf()`) here.
 * - A program run again keeps the tag:  the hooks call the latest class's methods, and its sheet is replaced.
 * - NEVER value-imports `spell/parser/core`:  part of `spell-runtime.js`, as `SpellElement` is.
 ****************/
export class UIViewElements {
  /**
   * Make `tag` the element of view class `Class`, built on Spell UI's `uiElement`, e.g. `ui-tree`.
   * - The first time:  loads the element's family, then defines the tag.
   * - Again (a program run again):  the latest class from then on, its sheet in place of the old one.
   * - NEVER throws:  a tag that can't be defined says so in the console, and draws as an unknown tag.
   */
  static defineFor(tag: string, Class: Function, core: Core, uiElement: string): void {
    const known = VIEWS.get(tag)
    VIEWS.set(tag, { Class, core })
    if (known) {
      SpellElement.restyle(tag, SpellElement.cssOf(Class))
      return
    }
    UIViewElements.define(tag, Class, uiElement).catch((error: unknown) =>
      console.error(`UIViewElements:  <${tag}> can't be built on <${uiElement}>`, error)
    )
  }

  /** Load `uiElement`'s family, then define `tag` on its component. */
  private static async define(tag: string, Class: Function, uiElement: string): Promise<void> {
    await RootLoader.loadTag(uiElement)
    const Base = E.UIComponent.registry.components.get(uiElement)
    if (!Base) throw new TypeError(`UIViewElements.define():  <${uiElement}> isn't one of Spell UI's elements`)
    UIViewElements.componentFor(tag, Class, Base).define()
  }

  /**
   * The component class of `tag`, on `Base`, the Spell UI element's component:  see the class docs.
   * - It changes only the element's vocabulary, its sheets and its hooks.
   */
  private static componentFor(tag: string, Class: Function, Base: E.UIComponentClass): { define(): unknown } {
    const vocabulary: E.ComponentVocabulary = Base.prototype.vocabulary
    const defaults = UIViewElements.defaultsOf(Class, vocabulary.attributes)
    const ownVocabulary = {
      ...vocabulary,
      tag,
      noun: Class.name,
      attributes: vocabulary.attributes.map((spec: E.AttributeSpec) =>
        defaults.has(spec.name) ? { ...spec, default: defaults.get(spec.name) } : spec
      )
    } as unknown as typeof SpellElement.vocabulary
    // typed as a component that draws, as every defined one does:  `SpellElement` stands in for `UITree`
    const BaseClass = Base as unknown as typeof SpellElement
    const Component = class extends BaseClass {
      @E.proto static vocabulary = ownVocabulary
      // the sheet is named for the tag, so `SpellElement.restyle()` replaces it when the program runs again
      @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
        styleSheets: { ...BaseClass.prototype.elementSetup.styleSheets, [tag]: SpellElement.cssOf(Class) }
      }
    }
    for (const { name } of vocabulary.hooks ?? []) UIViewElements.overrideHook(Component.prototype, name)
    return Component
  }

  /**
   * `prototype`'s hook `name` (`rowClass`) calls the type's method of that name, on its thing, when it has one;
   * else the element's own.
   */
  private static overrideHook(prototype: object, name: string): void {
    const own = (Object.getPrototypeOf(prototype) as Record<string, (...args: unknown[]) => unknown>)[name]
    Object.defineProperty(prototype, name, {
      configurable: true,
      writable: true,
      value(this: E.UIComponent, ...args: unknown[]) {
        const thing = UIViewElements.thingOf(this) as Record<string, unknown> | undefined
        const method = thing?.[name]
        return typeof method === "function" ? method.apply(thing, args) : own?.apply(this, args)
      }
    })
  }

  /**
   * The type's thing behind `component`:  the one the program drew it with (its element's `thing`),
   * else one it made for itself, of the latest class.
   */
  private static thingOf(component: E.UIComponent): object | undefined {
    const { thing } = component.domElement as { thing?: unknown }
    if (thing && typeof thing === "object") return thing
    const view = VIEWS.get(component.domElement.localName)
    if (!view) return undefined
    const made = OWN_THINGS.get(component)
    if (made?.constructor === view.Class) return made
    const fresh = new (view.Class as new () => object)()
    OWN_THINGS.set(component, fresh)
    return fresh
  }

  /**
   * The attributes view class `Class` gives its own value, by its getters (`its appearance is columns`):
   * `appearance` => `columns`.
   * - Each read on the class's prototype, never a thing:  a getter that reads the thing's state gives no default.
   */
  private static defaultsOf(
    Class: Function,
    attributes: readonly E.AttributeSpec[]
  ): Map<string, string | number | boolean> {
    const defaults = new Map<string, string | number | boolean>()
    const probe = Object.create(Class.prototype as object) as Record<string, unknown>
    for (const { name } of attributes) {
      const getter = UIViewElements.getterOf(Class, camelCase(name))
      if (!getter) continue
      try {
        const value = getter.call(probe)
        if (["string", "number", "boolean"].includes(typeof value))
          defaults.set(name, value as string | number | boolean)
      } catch (ignored) {
        // it reads the thing's own state:  no default
      }
    }
    return defaults
  }

  /** `Class`'s own getter `property`, or one of its super-classes' up to (not including) Spell's `View`. */
  private static getterOf(Class: Function, property: string): (() => unknown) | undefined {
    for (let at = Class.prototype as object | null; at && at !== Object.prototype; at = Object.getPrototypeOf(at)) {
      const getter = Object.getOwnPropertyDescriptor(at, property)?.get
      if (getter) return getter
    }
    return undefined
  }
}

/** Each tag built on a Spell UI element, with its latest class and the runtime it came from. */
const VIEWS = new Map<string, { Class: Function; core: Core }>()

/** The thing each element made for itself, when the program didn't draw it with one. */
const OWN_THINGS = new WeakMap<object, object>()
