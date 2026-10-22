import { UI, type E } from "spell-ui/core"
import { ComponentPacks } from "spell-ui/components/ui-components/ComponentPacks"
import { ROOT_CATALOG } from "./UIRoot.catalog"
import type { RootCatalogEntry } from "./UIRoot.types"

/**
 * Every family's barrel, loaded on demand (`import.meta.glob`, lazy):  `../ui-card/index.ts` => `import()` of it.
 * - A LITERAL glob, so each becomes a literal `import()`:
 *   the lib build reuses each family's own entry chunk (`ui-card.js`),
 *   and the docs' single-file bundle (`spell-epic/src/tools/bundle-spell-ui.js`) inlines them.
 * - Relative on purpose, the one `../` in `ui`'s components:
 *   Vite resolves a glob's literal pattern, not an alias,
 *   and its keys (`../ui-card/index.ts`) are what `load()` looks up.
 * - The root's own folder is left out:  it is loaded already.
 * - ONLY the library's families:  the docs site's bundle adds the doc-only `<ui-docs-*>` ones
 *   (`src/docs-components/`), through `add()` and `DocsFamilies`.
 *   - Why:  a glob of them HERE made each a dynamic entry of the lib build, importing the core and other families.
 *     Rolldown then moved core's modules out of `core.js`, into shared chunks every page loads
 *     (epic `wwod-spell-ui`, I12;  `yarn measure`'s `coreOutsideCore`).
 * - Above the class:  a module-level call, made once as the module loads.
 */
const FAMILIES = import.meta.glob(["../*/index.ts", "!../ui-root/index.ts"])

/**
 * The languages Spell UI ships, by language code:  each a lazy chunk of its whole dictionary.
 * - `<ui-root lang="es">` (or the document's `lang`) loads it, and names every tag in it (`useLanguage()`).
 */
const LANGUAGES: Readonly<Record<string, () => Promise<E.Dictionary>>> = {
  es: () => import("spell-ui/components/components.es").then(({ es }) => es)
}

/****************
 * ### `RootLoader`
 * Tag => family => `import()`, once per family for the whole page (every root shares the loads).
 * - Which family defines a tag comes from `ROOT_CATALOG` (generated from the vocabularies, `yarn gen:root`),
 *   never from guessing at the tag's name.
 * - The catalog knows the `<ui-docs-*>` tags too:
 *   they load only on a page whose bundle `add()`ed their families (the docs site's),
 *   and fail like any unknown family elsewhere.
 * - Component packs' tags (`<ui-components source>`) aren't imported here:
 *   a pack defines them all as its script registers it (`ComponentPacks`);
 *   this only answers for them (`entryOf()`, `undefinedTags()`).
 * - A page language's tags load the same way (`<es-boton>` => `ui-button`'s family),
 *   once a root has picked the language (`useLanguage()`).
 * - Static:  the loads are page-wide, shared by every root (and the docs site's router).
 ****************/
export class RootLoader {
  /** Folder => its import, started once.  Page-wide, never reset:  a family defines its tags once per page. */
  private static readonly loads = new Map<string, Promise<void>>()

  /** Folder => importer of its barrel, for the families a bundle added (`add()`).  Page-wide. */
  private static readonly added = new Map<string, () => Promise<unknown>>()

  /** A page language's tag => the canonical tag it stands for (`es-boton` => `ui-button`).  Page-wide. */
  private static readonly translatedTags = new Map<string, string>()

  /** Language code => its load, started once (`useLanguage()`).  Page-wide. */
  private static readonly languages = new Map<string, Promise<void>>()

  ////////////////
  // ## Tags
  ////////////////

  /** The folder (family) that defines `tag`;  `undefined` for a tag no family defines. */
  static folderFor(tag: string): string | undefined {
    return RootLoader.catalogEntry(tag)?.folder
  }

  /**
   * What a root knows about `tag` before it's defined:  Spell UI's catalog (a page language's tag too),
   * else a registered pack's.
   */
  static entryOf(tag: string): RootCatalogEntry | undefined {
    return RootLoader.catalogEntry(tag) ?? ComponentPacks.entryOf(tag)
  }

  /**
   * The distinct undefined tags under `root` that a root loads:
   * every `ui-*` one, a registered pack's, and those `alsoLoads` says yes to (a root's own:  `UIRoot.ownTagLoader()`).
   */
  static undefinedTags(root: ParentNode, alsoLoads?: (tag: string) => boolean): Set<string> {
    const tags = new Set<string>()
    for (const { localName } of root.querySelectorAll(":not(:defined)")) {
      const isOurs = localName.startsWith(TAG_PREFIX) || RootLoader.translatedTags.has(localName)
      if (isOurs || ComponentPacks.owns(localName) || alsoLoads?.(localName)) {
        tags.add(localName)
      }
    }
    return tags
  }

  ////////////////
  // ## Loading
  ////////////////

  /**
   * Import the family that defines `tag`, once;  `undefined` when no family does (a pack's tag:  its pack defines it).
   * - The promise rejects if the import fails, and stays rejected:  a failed tag stays failed.
   */
  static loadTag(tag: string): Promise<void> | undefined {
    const folder = RootLoader.folderFor(tag)
    return folder === undefined ? undefined : RootLoader.load(folder)
  }

  /**
   * Import `folder`'s family (which defines its tags), once.
   * - Rejects if it can't be imported, or no glob or `add()` knows the folder.
   */
  static load(folder: string): Promise<void> {
    let load = RootLoader.loads.get(folder)
    if (!load) {
      const importer = FAMILIES[`../${folder}/index.ts`] ?? RootLoader.added.get(folder)
      load = importer ? importer().then(() => undefined) : Promise.reject(RootLoader.noFamily(folder))
      RootLoader.loads.set(folder, load)
    }
    return load
  }

  ////////////////
  // ## Languages
  ////////////////

  /** Does Spell UI ship language `lang` (`es`, or `es-MX`'s `es`)?  English needs nothing:  it's built in. */
  static hasLanguage(lang: string): boolean {
    return Object.hasOwn(LANGUAGES, RootLoader.languageOf(lang))
  }

  /**
   * Make `lang` the page's language, once:  load its dictionary, define every component in it,
   * load its texts and switch the texts to it.
   * - `useLanguage("es")`:  `<es-boton>` works, and `UI.i18n` says "Cerrar".
   *   - The prefix is the language's code (`es`).
   *   - `UI.vocabulary.defineComponents()` and `UI.i18n.registerDictionary()` do the work;  `UI.i18n.locale`
   *     becomes `lang` as written (`es-MX`).
   * - Resolves at once for a language Spell UI doesn't ship (English included).
   * - The promise rejects if the dictionary can't be loaded, and stays rejected.
   */
  static useLanguage(lang: string): Promise<void> {
    const code = RootLoader.languageOf(lang)
    const loadDictionary = Object.hasOwn(LANGUAGES, code) ? LANGUAGES[code] : undefined
    if (!loadDictionary) return Promise.resolve()
    let load = RootLoader.languages.get(code)
    if (!load) {
      load = Promise.all([loadDictionary(), UI.load()]).then(([dictionary, ui]) => {
        for (const [canonical, name] of Object.entries(dictionary.tags ?? {})) {
          RootLoader.translatedTags.set(`${code}-${name}`, canonical)
        }
        ui.vocabulary.defineComponents({ prefix: code, dictionary })
        ui.i18n.registerDictionary(dictionary)
        ui.i18n.locale = lang
      })
      RootLoader.languages.set(code, load)
    }
    return load
  }

  ////////////////
  // ## Adding
  ////////////////

  /**
   * Let roots load more families:  `barrels`, a literal `import.meta.glob()` of family barrels
   * (`".../ui-docs-example/index.ts" => import()`), each keyed by its folder.
   * - Call it BEFORE a root needs one:  a tag whose family failed to load stays failed.
   */
  static add(barrels: Record<string, () => Promise<unknown>>): void {
    for (const [path, importer] of Object.entries(barrels)) {
      const folder = BARREL.exec(path)?.[1]
      if (folder) RootLoader.added.set(folder, importer)
    }
  }

  ////////////////
  // ## Internal
  ////////////////

  /** Spell UI's catalog entry for `tag`, or for the canonical tag a page language's tag stands for. */
  private static catalogEntry(tag: string): RootCatalogEntry | undefined {
    const canonical = RootLoader.translatedTags.get(tag) ?? tag
    return Object.hasOwn(ROOT_CATALOG, canonical) ? ROOT_CATALOG[canonical] : undefined
  }

  /** `es-MX` => `es`:  the language, without its region. */
  private static languageOf(lang: string): string {
    return lang.split("-")[0]!.toLowerCase()
  }

  /** The error for a folder no glob or `add()` knows. */
  private static noFamily(folder: string): Error {
    return new Error(`RootLoader.load():  no family "${folder}";  add() its barrel before a root needs its tags`)
  }
}

/** A family barrel's path:  its folder. */
const BARREL = /([\w-]+)\/index\.ts$/

/**
 * Prefix of the catalog's tags:
 * any other undefined tag (an app's own element) is not ours,
 * unless a registered pack's prefix starts it (`ComponentPacks.owns()`).
 */
const TAG_PREFIX = "ui-"
