import { camelCase, elementTagFor } from "spell/util"
import { P } from "spell-parser/parser"
import type { TranslationNames } from "./TranslationNames"
import type { MissingName, UIVocabulary } from "./translate.types"

/**
 * The names of the ELEMENTS a project draws with, in the other language (epic `spanish` P25):
 * its tags, their attributes and their values -- in its JSX, and in its style sheets' selectors.
 * - Spell UI's tags through Spell UI's own dictionaries (`UIVocabulary`, spell-app's):
 *   `<ui-text color="red">` => `<es-texto color="rojo">`, `<ui-item kind="header">` => `<es-elemento clase="encabezado">`.
 *   - A text people read (`aria-label`, `content` ...) through the project's dictionary's texts:
 *     `aria-label="Auto play"` => `aria-label="Jugar solo"`.
 *   - `part` names one of the project's own parts:  through its names, `part="picture"` => `part="imagen"`.
 *   - A form control's `name` binds it to a property of the thing the form shows (epic `spanish` P28):
 *     through the project's names, as compiled code names the property, `name="newTaskName"` => `name="nombreNuevaTarea"`.
 * - The project's own views by their types' names in the other language, as compiled code names them:
 *   `<solitaire-tableau layout="stacked">` => `<solitario-columna disposición="apilada">`.
 * - Anything else stays as written:  plain HTML (`<div class="Board">`), names it doesn't know.
 * - Pure:  the vocabulary is handed in, so spell-parser never imports Spell UI.
 */
export class ElementNames {
  /** The project's names dictionary. */
  readonly names: TranslationNames
  /** Spell UI's names in the other language, if the command has them. */
  readonly ui: UIVocabulary | undefined
  /** Each of the project's own tags (`solitaire-tableau`) in the other language (`solitario-columna`). */
  private readonly ownTags: Map<string, string>
  /** The names asked for since the last `takeMissed()` and not found:  kept as written, so no line's TODO. */
  private missed: MissingName[] = []

  constructor({
    names,
    ui,
    projectName
  }: {
    names: TranslationNames
    ui?: UIVocabulary
    projectName?: { ours: string; theirs: string }
  }) {
    this.names = names
    this.ui = ui
    this.ownTags = new Map()
    if (!projectName) return
    for (const [words, type] of Object.entries(names.data.types)) {
      if (!type.name || type.name === "TODO") continue
      const ours = elementTagFor(projectName.ours, P.classCase(words))
      const theirs = P.Inflector.using(names.to.inflector, () =>
        elementTagFor(projectName.theirs, P.classCase(type.name))
      )
      this.ownTags.set(ours, theirs)
    }
  }

  ////////////////
  // ## Names
  ////////////////

  /** `tag` in the other language:  Spell UI's, else one of the project's own;  `undefined` to keep it. */
  tag(tag: string): string | undefined {
    return this.ui?.tag(tag) ?? this.ownTags.get(tag)
  }

  /**
   * Attribute `attribute` of element `tag` (as written in OUR language), and its text `value`, in the other language.
   * - `value` stays as written where nothing translates it.
   * - The names it asks the dictionary for and doesn't find are NOT the dictionary's missing:  they stay as written,
   *   noted in `takeMissed()`, so the names pass asks for them all the same.
   */
  attribute(tag: string, attribute: string, value?: string): { attribute: string; value?: string } {
    const isText = TEXT_ATTRIBUTES.has(attribute)
    const isPart = attribute === "part"
    // a form control's `name`, not one that names one of its own values (`<ui-icon name="star">`)
    const isBinding = BINDING_ATTRIBUTES.has(attribute) && !!value && !this.takesValues(tag, attribute)
    let name = attribute
    let translated = value
    if (this.ui?.tag(tag)) {
      const localized = this.ui.attribute(tag, attribute, isText || isPart ? undefined : value)
      if (localized) {
        name = localized.attribute
        if (!isText && !isPart) translated = localized.value
      }
    } else if ((this.ownTags.has(tag) || tag === "") && !isText && !isPart) {
      name = this.quietly(() => this.names.name(attribute)) ?? attribute
      translated = value && (this.quietly(() => this.names.name(value)) ?? value)
    }
    if (isText && value) translated = this.quietly(() => this.names.text(value)) ?? value
    if (isPart && value) translated = this.quietly(() => this.names.name(value)) ?? value
    if (isBinding) translated = this.boundProperty(value) ?? value
    return { attribute: name, value: translated }
  }

  /**
   * The property `value` names in a form control's `name` (`newTaskName`, `title`), in the other language,
   * as compiled code names it:  `nombreNuevaTarea`, `título`;  `undefined` if the project declares no such name.
   * - Its words as written, else split where a capital starts one (`stock pile` is `stockPile` in code).
   * - Only the project's own names:  a field's name the program never declares stays as written, quietly.
   */
  boundProperty(value: string): string | undefined {
    const words = value.replace(/(?<=\p{Ll})(?=\p{Lu})/gu, " ").toLowerCase()
    const found = [value, words].find((each) => this.names.hasOwnName(each))
    if (!found) return undefined
    const translated = this.quietly(() => this.names.name(found))
    return translated && camelCase(translated.trim().replace(/\s+/g, "-"))
  }

  /** `lookup()`'s answer;  any name it asked for and didn't find is noted in `takeMissed()`, not as missing. */
  private quietly<T>(lookup: () => T): T {
    const before = this.names.missing.length
    const found = lookup()
    this.missed.push(...this.names.missing.splice(before))
    return found
  }

  /** The names asked for and not found since the last call:  see `attribute()`. */
  takeMissed(): MissingName[] {
    const missed = this.missed
    this.missed = []
    return missed
  }

  /** Does `attribute` of Spell UI's `tag` take only the values it names?  Then a text in it is one of them. */
  takesValues(tag: string, attribute: string): boolean {
    return !!this.ui?.tag(tag) && this.ui.hasValues(tag, attribute)
  }

  ////////////////
  // ## Style sheets
  ////////////////

  /**
   * `css` with each selector's names in the other language:  its tags, attribute selectors and `::part()`s.
   * - `ui-item[kind="header"]` => `es-elemento[clase="encabezado"]`;  `[layout="vertical"]` => `[disposición="vertical"]`
   *   (an attribute with no tag is taken as one of the project's own things');  `::part(placeholder)` => `::part(marcador)`.
   * - Comments, declarations and custom properties (`--ui-grid-gutter`) stay as they are.
   * - Nested rules too:  a selector is what comes before a `{`, after the last `;`, `{` or `}`.
   */
  translateStyles(css: string): string {
    // comments out of the way first:  they may hold anything
    const comments: string[] = []
    const masked = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => `\uE000${comments.push(comment) - 1}\uE000`)
    const translated = masked.replace(/(^|[;{}])([^;{}]*)(?=\{)/g, (_, before: string, selector: string) =>
      selector.trimStart().startsWith("@") ? `${before}${selector}` : `${before}${this.translateSelector(selector)}`
    )
    return translated.replace(/\uE000(\d+)\uE000/g, (_, at: string) => comments[Number(at)]!)
  }

  /** One selector list's names in the other language:  see `translateStyles()`. */
  translateSelector(selector: string): string {
    // each compound selector:  a tag, then its attribute selectors and pseudo-elements
    return selector.replace(
      /(?<![\w-])([a-z][\w-]*-[\w-]+)?((?:\[[^\]]*\]|::?[\w-]+(?:\([^)]*\))?|[.#][\w-]+)*)/g,
      (whole, tag: string | undefined, rest: string) => {
        if (!tag && !rest) return whole
        const theirTag = tag ? (this.tag(tag) ?? tag) : ""
        const translatedRest = rest
          .replace(
            /\[([\w-]+)(?:([~|^$*]?=)"?([^"\]]*)"?)?\]/g,
            (_, name: string, operator?: string, value?: string) => {
              const localized = this.attribute(tag ?? "", name, operator ? value : undefined)
              return operator ? `[${localized.attribute}${operator}"${localized.value}"]` : `[${localized.attribute}]`
            }
          )
          .replace(
            /::part\(([\w-]+)\)/g,
            (_, part: string) => `::part(${this.attribute(tag ?? "", "part", part).value})`
          )
        return `${theirTag}${translatedRest}`
      }
    )
  }
}

/** The attributes whose value names a property the element is bound to:  a form control's `name`. */
const BINDING_ATTRIBUTES = new Set(["name"])

/** The attributes whose value is a text people read:  translated as the project's texts are. */
const TEXT_ATTRIBUTES = new Set([
  "aria-label",
  "aria-description",
  "title",
  "alt",
  "placeholder",
  "label",
  "content",
  "header",
  "tooltip",
  "description",
  "caption"
])
