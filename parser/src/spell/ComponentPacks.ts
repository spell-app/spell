/**
 * The component packs a spellx drawing names its components from, by their BARE names (epic `elemental-spell` P7, Q46):
 * `<button>` is a pack's button, `ui-button`;  `<botón>` in a Spanish file, its Spanish tag, `es-boton`.
 * - spellx has no native HTML (Q46, C1):  every tag in a drawing is a spell word, one of the project's own views, or a
 *   pack's component.
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

  /** `packNames` as an error says what it searched, e.g. `spell-ui`, or `spell-ui (not loaded)`. */
  static searched(packNames: readonly string[] = this.DEFAULT): string {
    return packNames.map((name) => (this.packs.has(name) ? name : `${name} (not loaded)`)).join(", ")
  }
}

/**
 * A pack of components, as spellx looks names up in it -- see `ComponentPacks`.
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
   * One attribute of an app's widget defaults, as written in `language`, in the pack's own names
   * (`ComponentPacks.readDefault()`):
   * `({ tag: "es-boton", attribute: "apariencia", value: "píldora" }, "es")` =>
   * `{ tag: "ui-button", attribute: "appearance", value: "pill" }`.
   * - Its tag as a page writes it (`ui-button`, `es-boton`), or bare as spellx does (`button`, `botón`).
   * - Left out:  the pack can't check defaults, and each is taken as written.
   */
  readDefault?(sample: DefaultSample, language: string): DefaultReading
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
