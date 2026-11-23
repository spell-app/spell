import type { SkeletonSpec } from "spell/element/vocabulary.types"

/**
 * The component packs a drawing names its components from, by their BARE names (epic `elemental-spell` P7, Q46):
 * `<button>` is a pack's button, `ui-button`;  `<botón>` in a Spanish file, its Spanish tag, `es-boton`.
 * - A page has no native HTML (Q46, C1):  every tag in its drawings is a spell word, one of the project's own views,
 *   or a pack's component.
 *   - In plain Spell, a bare name no pack has is the web's own element.
 * - Registered by whoever can read a pack's names:  spell-parser never imports Spell UI, so spell-app registers it,
 *   from Spell UI's catalog and dictionaries (`spell/app/spaces`, as it registers spell's project groups).
 * - Which packs a project draws with:  its project file's `packs` (`ProjectManifestJSON5.packs`), else `DEFAULT`;
 *   the first pack that has a name wins.
 */
export class ComponentPacks {
  /** The packs a project draws with when its project file names none. */
  static readonly DEFAULT: readonly string[] = ["spell-ui"]

  /** Every registered pack, by its name. */
  private static readonly packs = new Map<string, ComponentPack>()

  /**
   * Register `pack`, replacing one of the same name.
   * - SIDE EFFECT:  every later lookup sees it.
   */
  static register(pack: ComponentPack): void {
    this.packs.set(pack.name, pack)
  }

  /**
   * Load what every registered pack needs to read `language`, past English:  its words for it, which may load on
   * first use (epic `solid-2-final` P11:  Spell UI's Spanish dictionary).
   * - `SP.Language.loadFor()` calls it, before a program in that language is read.
   */
  static async loadLanguage(language: string): Promise<void> {
    await Promise.all([...this.packs.values()].map((pack) => pack.loadLanguage?.(language) ?? Promise.resolve()))
  }

  /** The pack called `name`, if one is registered. */
  static named(name: string): ComponentPack | undefined {
    return this.packs.get(name)
  }

  /**
   * The tag of the component bare `word` names, in `language` (`"en"`, `"es"`), from the first of `packNames` that
   * has it:  `("button", "en")` => `"ui-button"`;  `undefined` if none does.
   * - A pack that isn't registered is skipped:  the error names what was searched (`searched()`).
   */
  static tagFor(word: string, language: string, packNames: readonly string[] = this.DEFAULT): string | undefined {
    for (const name of packNames) {
      const tag = this.packs.get(name)?.tagFor(word, language)
      if (tag) return tag
    }
    return undefined
  }

  /**
   * The pack's own (English) tag that `tag` stands for in `language`, from the first of `packNames` that knows it:
   * `("es-barra-herramientas", "es")` => `"ui-toolbar"`;  `undefined` if none does.
   * - `tag` as a page writes it (`ui-toolbar`, `es-barra-herramientas`), or bare as a drawing does (`toolbar`).
   * - So a rule about one of the pack's components finds it in every language:  a Spanish `<barra-herramientas>`'s
   *   actions are its items, as an English `<toolbar>`'s are (`SpellJSX.markMenuRows()`).
   */
  static canonicalTagFor(
    tag: string,
    language: string,
    packNames: readonly string[] = this.DEFAULT
  ): string | undefined {
    for (const name of packNames) {
      const canonical = this.packs.get(name)?.canonicalTagFor?.(tag, language)
      if (canonical) return canonical
    }
    return undefined
  }

  /**
   * What `sample`, one attribute of an app's widget defaults as written in `language`, means in the first of
   * `packNames` that has its tag (epic `language` P29, `ui_defaults`):  its tag, attribute and value in the pack's
   * own (English) names, or what's wrong with it.
   * - `undefined` when no pack registered can read defaults (none loaded, as in spell-parser's own tests):
   *   the sample is then taken as written.
   */
  static readDefault(
    sample: DefaultSample,
    language: string,
    packNames: readonly string[] = this.DEFAULT
  ): DefaultReading | undefined {
    let reading: DefaultReading | undefined
    for (const name of packNames) {
      const read = this.packs.get(name)?.readDefault?.(sample, language)
      if (!read) continue
      if (!("problem" in read) || read.problem !== "unknown-tag") return read
      reading ??= read
    }
    return reading
  }

  /**
   * `sample`, an attribute written in `language` on one of a pack's tags, in the pack's own (English) names,
   * from the first of `packNames` that can read it (epic `language` P53):
   * `({ tag: "ui-button", attribute: "tamano", value: "grande" }, "es")` => `{ attribute: "size", value: "large" }`.
   * - What `<acción>` draws its button with:  a Spanish program writes Spell UI's Spanish names on it,
   *   which compile to the English ones its `<ui-button>` reads.
   * - `undefined` when no pack registered reads it:  the attribute is then taken as written.
   */
  static readAttribute(
    sample: DefaultSample,
    language: string,
    packNames: readonly string[] = this.DEFAULT
  ): AttributeReading | undefined {
    for (const name of packNames) {
      const read = this.packs.get(name)?.readAttribute?.(sample, language)
      if (read) return read
    }
    return undefined
  }

  /**
   * The name `language` writes the pack's own (English) attribute `attribute` by, on `tag` (a page's tag, `es-modal`,
   * or the pack's own), from the first of `packNames` that knows it:  `("es-modal", "heading", "es")` => `"encabezado"`.
   * - What a tag's quoted word fills, in a drawing in another language than English (epic `language` P61):
   *   `<modal "ganaste">` is `<es-modal encabezado="ganaste">`.
   * - `undefined` when no pack registered knows it:  the English name is then written.
   */
  static attributeNameFor(
    tag: string,
    attribute: string,
    language: string,
    packNames: readonly string[] = this.DEFAULT
  ): string | undefined {
    for (const name of packNames) {
      const local = this.packs.get(name)?.attributeNameFor?.(tag, attribute, language)
      if (local) return local
    }
    return undefined
  }

  /**
   * What the components of the first of `packNames` that can say are, written in `language`:
   * for an editor's completions and hovers on a drawing's tags (epic `editor` P28).
   * - `undefined` while none can say yet:  a pack may load its help as it's first asked (`ComponentPack.help()`).
   */
  static help(language: string, packNames: readonly string[] = this.DEFAULT): ComponentHelp | undefined {
    for (const name of packNames) {
      const help = this.packs.get(name)?.help?.(language)
      if (help) return help
    }
    return undefined
  }

  /**
   * The component bare `noun` names in `language`, as a Spell type is built on it, from the first of `packNames` that
   * has it:  `("tree", "en")` => `<ui-tree>`, its attributes and its hooks.
   * - What `a "netlist column" is a ui tree view` reads (`SP.UIViews`).
   * - `undefined` when no pack registered has it.
   */
  static viewBaseFor(
    noun: string,
    language: string,
    packNames: readonly string[] = this.DEFAULT
  ): ComponentViewBase | undefined {
    for (const name of packNames) {
      const base = this.packs.get(name)?.viewBaseFor?.(noun, language)
      if (base) return base
    }
    return undefined
  }

  /**
   * The skeleton of `tag` (a page's tag, or bare), from the first of `packNames` that has one:  what `<ui-root
   * display="skeleton">` draws for it, its vocabulary's `skeleton`;  `undefined` for none.
   * - What a bare `loading="skeleton"` draws while what's in the element waits.
   */
  static skeletonFor(
    tag: string,
    language: string,
    packNames: readonly string[] = this.DEFAULT
  ): SkeletonSpec | undefined {
    for (const name of packNames) {
      const skeleton = this.packs.get(name)?.skeletonFor?.(tag, language)
      if (skeleton) return skeleton
    }
    return undefined
  }

  /**
   * The name `language` writes the pack's slot `slot` by, on `tag` (a page's tag, or bare), from the first of
   * `packNames` that knows it;  `undefined` where `tag` has no such slot.
   * - What tells a pane (with `loading` and `error` slots) from any other element, for `<loading>` and `<failed>`
   *   inside it (`SpellJSX`).
   */
  static slotNameFor(
    tag: string,
    slot: string,
    language: string,
    packNames: readonly string[] = this.DEFAULT
  ): string | undefined {
    for (const name of packNames) {
      const local = this.packs.get(name)?.slotNameFor?.(tag, slot, language)
      if (local) return local
    }
    return undefined
  }

  /** `packNames` as an error says what it searched, e.g. `spell-ui`, or `spell-ui (not loaded)`. */
  static searched(packNames: readonly string[] = this.DEFAULT): string {
    return packNames.map((name) => (this.packs.has(name) ? name : `${name} (not loaded)`)).join(", ")
  }
}

/**
 * A pack of components, as a drawing looks names up in it -- see `ComponentPacks`.
 * - e.g. Spell UI's:  `{ name: "spell-ui", tagFor: (word, lang) => ... }`
 */
export type ComponentPack = {
  /** Its name, as a project file's `packs` lists it, e.g. `"spell-ui"`. */
  name: string
  /**
   * The tag of the component bare `word` names in `language`, e.g. `("text", "en")` => `"ui-text"`,
   * `("texto", "es")` => `"es-texto"`;  `undefined` if the pack has none.
   * - Accents count as written or not:  `botón` ~== `boton`.
   */
  tagFor(word: string, language: string): string | undefined
  /**
   * The pack's own (English) tag `tag` stands for in `language` (`ComponentPacks.canonicalTagFor()`):
   * `("es-barra-herramientas", "es")` => `"ui-toolbar"`;  `undefined` for none of the pack's.
   * - Left out:  the pack can't say, and a tag counts only as written.
   */
  canonicalTagFor?(tag: string, language: string): string | undefined
  /**
   * One attribute of an app's widget defaults, as written in `language`, in the pack's own names
   * (`ComponentPacks.readDefault()`):
   * `({ tag: "es-boton", attribute: "apariencia", value: "píldora" }, "es")` =>
   * `{ tag: "ui-button", attribute: "appearance", value: "pill" }`.
   * - Its tag as a page writes it (`ui-button`, `es-boton`), or bare as a drawing does (`button`, `botón`).
   * - Left out:  the pack can't check defaults, and each is taken as written.
   */
  readDefault?(sample: DefaultSample, language: string): DefaultReading
  /**
   * One attribute, as written in `language` on one of the pack's tags, in the pack's own names
   * (`ComponentPacks.readAttribute()`):  `undefined` for one it doesn't know, which is taken as written.
   * - Unlike `readDefault()`, it checks nothing:  any attribute the tag takes, content ones too (`icono`).
   * - Left out:  the pack can't read attributes, and each is taken as written.
   */
  readAttribute?(sample: DefaultSample, language: string): AttributeReading | undefined
  /**
   * The name `language` writes the pack's own (English) attribute `attribute` by, on its tag `tag`
   * (`ComponentPacks.attributeNameFor()`):  `("ui-modal", "heading", "es")` => `"encabezado"`;
   * `undefined` for a tag or attribute it doesn't know.
   * - Left out:  the pack can't say, and the English name is written.
   */
  attributeNameFor?(tag: string, attribute: string, language: string): string | undefined
  /**
   * The component bare `noun` names in `language`, as a Spell type is built on it (`ComponentPacks.viewBaseFor()`):
   * `("tree", "en")` => `{ tag: "ui-tree", attributes, hooks }`;  `undefined` for none of the pack's.
   * - Left out:  no type can be built on the pack's components.
   */
  viewBaseFor?(noun: string, language: string): ComponentViewBase | undefined
  /**
   * The skeleton of its tag `tag` in `language` (`ComponentPacks.skeletonFor()`):  its vocabulary's, as `<ui-root
   * display="skeleton">` draws it;  `undefined` for none.
   * - Left out:  a bare `loading="skeleton"` draws the shape of what's coming.
   */
  skeletonFor?(tag: string, language: string): SkeletonSpec | undefined
  /**
   * The name `language` writes its tag `tag`'s slot `slot` by (`ComponentPacks.slotNameFor()`);  `undefined` where
   * the tag has none.
   * - Left out:  no element has slots Spell fills, and `<loading>` / `<failed>` show in place of what waits.
   */
  slotNameFor?(tag: string, slot: string, language: string): string | undefined
  /**
   * What its components are, as `language` writes them in a drawing (`ComponentPacks.help()`).
   * - `undefined` until it has them:  the first call may start loading them, for a later one.
   * - Left out:  the pack can't say.
   */
  help?(language: string): ComponentHelp | undefined
  /**
   * Load its names in `language`, past English, before a program in it is read (`ComponentPacks.loadLanguage()`):
   * until then, `tagFor()` and the rest know none of them.
   * - Once per language:  every later call the same promise.
   * - Left out:  it has every language's names at once.
   */
  loadLanguage?(language: string): Promise<void>
}

/**
 * A pack's component as a Spell type is built on it, in one language (`ComponentPack.viewBaseFor()`):
 * `a "netlist column" is a ui tree view` is built on `<ui-tree>`.
 */
export type ComponentViewBase = {
  /** Its tag, the pack's own (English), e.g. `ui-tree`:  the element the type's element is built on. */
  tag: string
  /** Its attributes, each a property of the type, which its body may give its own value:  `its appearance is columns`. */
  attributes: readonly ComponentViewAttribute[]
  /** The methods a type built on it overrides, in this language's words:  `to give the row class of (an item)`. */
  hooks: readonly ComponentViewHook[]
}

/** One attribute of a `ComponentViewBase`, as a property of the type. */
export type ComponentViewAttribute = {
  /** Its name as the language writes it on the tag, e.g. `apariencia`, `column-titles`. */
  name: string
  /** Its name in the pack's own (English) words, e.g. `appearance`, when that differs. */
  output?: string
  /** The words it takes, as the language writes them, e.g. `["nav", "columns"]`;  none:  any. */
  values?: readonly string[]
  /** Each of `values` in the pack's own words, when they differ:  `{ columnas: "columns" }`. */
  valueOutputs?: Readonly<Record<string, string>>
}

/** One hook of a `ComponentViewBase`:  a method a type built on it overrides. */
export type ComponentViewHook = {
  /** The method's name, as the element has it, e.g. `rowClass`. */
  name: string
  /** Its words in the language, each argument in brackets:  `give the row class of (an item)`. */
  words: string
}

/** What a pack's components are, as a drawing in one language writes them:  `ComponentPack.help()`. */
export type ComponentHelp = {
  /** Each component, bare as a drawing writes it (`button`, `botón`), with what it is. */
  tags: readonly ComponentTagHelp[]
  /** The attributes of the component `tag` names, bare or as a page writes it;  `undefined` for none of the pack's. */
  attributesOf(tag: string): readonly ComponentAttributeHelp[] | undefined
}

/** One component, as `ComponentHelp` says what it is. */
export type ComponentTagHelp = {
  /** bare, as a drawing writes it:  `button`, `botón` */
  tag: string
  /** what it is, in one sentence */
  description?: string
  /** it holds nothing (no default slot):  written closed, `<icon />` (epic `editor` I70) */
  empty?: boolean
}

/** One attribute of a component, as `ComponentHelp` says what it is. */
export type ComponentAttributeHelp = {
  /** as the drawing's language writes it:  `color`, `tamano` */
  name: string
  /** what it is, in one sentence */
  description?: string
  /** the words it takes, as the drawing's language writes them:  `primary`, `rojo`;  none for any text */
  values: readonly string[]
  /** it takes no value:  written by its name alone, `fluid`, `disabled` (epic `editor` I70) */
  bare?: boolean
  /** its value can be picked rather than typed, in an editor (epic `editor` T61) */
  picker?: ComponentValuePicker
}

/**
 * How an attribute's value is picked, in an editor:  `ComponentAttributeHelp.picker`.
 * - `color`:  a palette of its `values`, each drawn in `colors`' colour (the same order)
 * - `icon`:  an icon picker, its value an icon's name
 * - `sound`:  a sound picker, its value a built-in sound's name, each listened to before it's picked
 *   (`play "card slide"`;  epic `mockup` P28)
 */
export type ComponentValuePicker =
  | {
      kind: "color"
      /** each of the attribute's `values`' colour, as CSS:  `var(--ui-red)` */
      colors: readonly string[]
    }
  | { kind: "icon" }
  | { kind: "sound" }

/** An attribute in a pack's own names, as `ComponentPacks.readAttribute()` reads it:  `size="large"`, `basic`. */
export type AttributeReading = {
  /** its name:  `size`, `basic` */
  attribute: string
  /** its value:  text, a number, or `true` for one written bare */
  value: string | number | boolean
}

/** One attribute of an app's widget defaults, as written:  `<ui-button appearance="pill"/>`'s `appearance`. */
export type DefaultSample = {
  /** the sample's tag, as written:  `ui-button`, `es-boton`, `button`, `botón` */
  tag: string
  /** the attribute, as written:  `appearance`, `apariencia` */
  attribute: string
  /** its value:  text as written, a number, or `true` for an attribute written bare (`fluid`) */
  value: string | number | boolean
}

/**
 * What a pack makes of a `DefaultSample`:  the same, in its own names;  or what's wrong with it, for the
 * compiler's error in the sample's language.
 */
export type DefaultReading =
  | {
      /** the tag's own name:  `ui-button` */
      tag: string
      /** the attribute's own name:  `appearance` */
      attribute: string
      /** the value as the element reads it:  `pill`, `true`, `2` */
      value: string | number | boolean
    }
  | { problem: "unknown-tag" }
  | {
      problem: "unknown-attribute"
      /** the tag as its language writes it, for the message:  `es-boton` */
      tag: string
      /** the attributes it does take, as its language writes them */
      attributes: string[]
    }
  | {
      problem: "content"
      /** the tag as its language writes it */
      tag: string
    }
  | {
      problem: "bad-value"
      /** the tag as its language writes it */
      tag: string
      /** the values it does take, as its language writes them;  none for a number or true / false */
      values: string[]
      /** what it takes, when it's no list:  `"number"`, `"true or false"`, `"no true or false"` */
      takes?: "number" | "boolean" | "text"
    }
