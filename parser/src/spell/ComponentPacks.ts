/**
 * The component packs a spellx drawing names its components from, by their BARE names (epic `elemental-spell` P7, Q46):
 * `<button>` is a pack's button, `ui-button`;  `<botón>` in a Spanish file, its Spanish tag, `es-boton`.
 * - spellx has no native HTML (Q46, C1):  every tag in a drawing is a spell word, one of the project's own views, or a
 *   pack's component.
 * - Registered by whoever can read a pack's names:  spell-parser never imports Spell UI, so spell-app registers it,
 *   from Spell UI's catalog and dictionaries (`spell-app/spaces`, as it registers spell's project groups).
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
}
