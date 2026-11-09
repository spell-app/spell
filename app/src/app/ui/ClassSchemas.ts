import { schemaOf, type PropInfo } from "spell/util"
import type { P } from "spell/parser/parser"
import type { V } from "spell/ui/api"

/****************
 * ### `ClassSchemas`
 * A spell class, as what `<ui-property-editor>` reads (a `PropertySchema`):  one attribute per declared property.
 *
 * - It's the app's, not Spell UI's:  Spell UI never imports spell's packages, and the app may import both.
 *   - That's epic `property-editor` Q16, "for now".
 *   - Its todo T6 weighs going through the class's JSON Schema instead.
 * - What it reads is what the compiled class declares of each property (`schemaOf()`):
 *   its type, its legal values, its default, a list's item type.
 *   - A superclass's properties come first;  a subclass's declaration of the same name wins.
 *   - Each type, as a form edits it:
 *     - `text`, `number`, `date` as they are
 *     - spell's `choice` (a yes or no) as `boolean`
 *     - legal values as a `choice`
 *     - a list as a `list` of its item's type
 *     - a class name as a nested `thing`
 * - No labels yet:  a form makes them from the names (`listsStartAt` => `Lists start at`).
 * - A built-in template's property, in a program of another language:  its values in that language's words
 *   (`valueLabels`, `up` shows as `arriba`;  epic `language` T73), from `templateWordsOf()`.
 * - STATIC and instance-free:  it keeps nothing between calls.
 ****************/
export class ClassSchemas {
  /**
   * `Class`'s declared properties, as a property schema named for it.
   * - `root`:  its program's root scope (`SP.Language.rootScopeFor()`), whose words its built-in templates' values
   *   show in;  none:  each value as it is.
   */
  static fromClass(Class: Function, root?: P.Scope): V.PropertySchema {
    const words = root ? ClassSchemas.templateWordsOf(Class, root) : new Map()
    return { name: Class.name, attributes: ClassSchemas.attributesOf(Class, words) }
  }

  /**
   * What a program's language calls the built-in templates' properties `Class` inherits, by each one's name in the
   * class:  `direction` => `{ name: "dirección", values: { up: "arriba", down: "abajo" } }` in Spanish, for
   * a `Carta` that's a `vista reversible`.
   * - Read from `root`'s types:  each class of `Class`'s chain that `root` knows by its class name (`TwoSidedView`),
   *   and each of its properties that compiles by another name (`P.ScopeVariable.output`).
   * - English, whose names are the class's own:  none.
   */
  static templateWordsOf(Class: Function, root: P.Scope): Map<string, TemplateWords> {
    const words = new Map<string, TemplateWords>()
    for (let each: Function | undefined = Class; each?.name; each = Object.getPrototypeOf(each) as Function) {
      const type = root.types?.get(each.name, "LOCAL_ONLY")
      if (!type) continue
      for (const variable of type.variables.get()) {
        if (!variable.output || variable.output === variable.name || words.has(variable.output)) continue
        const values = Object.fromEntries(
          Object.entries(variable.valueOutputs ?? {}).map(([said, value]) => [value, said])
        )
        words.set(variable.output, { name: variable.name, values })
      }
    }
    return words
  }

  /** One attribute per property `Class` declares, inherited ones first. */
  private static attributesOf(Class: Function, words: Map<string, TemplateWords>): V.AttributeSpec[] {
    const attributes: V.AttributeSpec[] = []
    for (const [name, info] of ClassSchemas.declaredProps(Class)) {
      attributes.push(ClassSchemas.attributeOf(name, info, words.get(name)))
    }
    return attributes
  }

  /** One declared property, as an attribute;  `said`:  its values in its program's words. */
  private static attributeOf(name: string, info: PropInfo, said?: TemplateWords): V.AttributeSpec {
    const values = ClassSchemas.legalValues(info)
    const type: V.ValueType = values ? "choice" : ClassSchemas.typeOf(info.type)
    const spec: Writable<V.AttributeSpec> = { name, kind: KIND_FOR_TYPE[type], type, description: "" }
    if (values) spec.values = values.map(String)
    if (values && said && Object.keys(said.values).length) spec.valueLabels = said.values
    if (isPlainDefault(info.default)) spec.default = info.default
    if (type === "list" && info.itemType) spec.of = ClassSchemas.typeOf(info.itemType)
    // what its value must be, as the type says in spell (epic `property-editor` P9)
    if (info.rules?.length) spec.rules = info.rules
    return spec
  }

  /** A spell type's name, as a form edits it:  a capitalised name is a class, a nested `thing`. */
  private static typeOf(spellType: string | undefined): V.ValueType {
    if (!spellType) return "data"
    if (spellType in VALUE_TYPES) return VALUE_TYPES[spellType]!
    return /^[A-Z]/.test(spellType) ? "thing" : "data"
  }

  /** `info`'s legal values, when they're all plain values (text, numbers, yes or no):  else `undefined`. */
  private static legalValues(info: PropInfo): readonly unknown[] | undefined {
    const values = typeof info.oneOf === "function" ? info.oneOf() : info.oneOf
    if (!values?.length || !values.every((value) => value === null || typeof value !== "object")) return undefined
    return values.filter((value) => value !== null)
  }

  /** Every property `Class` declares, inherited and its own, by name:  a superclass's first. */
  private static declaredProps(Class: Function): Map<string, PropInfo> {
    const chain: ReturnType<typeof schemaOf>[] = []
    for (let schema: ReturnType<typeof schemaOf> | undefined = schemaOf(Class); schema; schema = schema.parent)
      chain.unshift(schema)
    const props = new Map<string, PropInfo>()
    for (const schema of chain) for (const [name, info] of schema.declared) props.set(name, info)
    return props
  }
}

/** What a program's language calls a built-in template's property -- see `ClassSchemas.templateWordsOf()`. */
export type TemplateWords = {
  /** Its name in the program's language, `dirección`. */
  name: string
  /** Each of its values in that language, by the class's value:  `{ up: "arriba" }`. */
  values: Record<string, string>
}

/** An `AttributeSpec` being built:  its fields writable. */
type Writable<T> = { -readonly [K in keyof T]: T[K] }

/** Spell's value types, as a form edits them:  spell's `choice` is a yes or no. */
const VALUE_TYPES: Record<string, V.ValueType> = {
  text: "text",
  number: "number",
  choice: "boolean",
  date: "date",
  list: "list"
}

/** The kind an attribute read from a class gets, by its value's type:  property-only, never a CSS class word. */
const KIND_FOR_TYPE: Record<V.ValueType, V.AttributeKind> = {
  text: "string",
  number: "number",
  boolean: "boolean",
  date: "string",
  choice: "enum",
  icon: "icon",
  sides: "json",
  list: "json",
  thing: "json",
  data: "json"
}

/** A default an attribute can hold as it is:  text, a number, yes / no. */
function isPlainDefault(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
}
