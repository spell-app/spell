/****************
 * ### The element tools' types
 * Shapes shared by the kit's element tools (`src/element-tools/`) and the repos that call them:
 * - the component packs' reports and their error
 * - what the JSX help (`jsx-help/`) knows of an element, and its warnings' codes
 * - At the BOTTOM of the tools' import graph:  types, constants and one error class, nothing else,
 *   so every tool (and spell-app's `spell pack`, through `spell/element-tools/tools.types`)
 *   imports it without loading another.
 * - Spell UI's own tools keep their shapes in its `tools/tools.types.ts`.
 ****************/

////////////////
// ## Component packs (`ComponentPack`, `spell-pack`)
////////////////

/**
 * What `ComponentPack.build()` wrote.
 * - `files`:  absolute paths:  the pack's generated files, then its set's docs data folder when it has one
 * - `tags`:  every tag of the pack, sorted;  `hash`:  its sources' (`ComponentPack.hash()`)
 */
export type ComponentPackBuild = { pack: string; files: string[]; tags: string[]; hash: string }

/** What `ComponentPack.check()` found:  each generated file that isn't current;  none means current. */
export type ComponentPackCheck = { pack: string; hash: string; stale: ComponentPackStale[] }

/** One stale generated file:  its absolute path, and why, e.g. `built from older sources`. */
export type ComponentPackStale = { file: string; reason: string }

/**
 * Thrown by `ComponentPack` when a pack can't be read or built:  a folder that isn't a pack, a tag without the pack's
 * prefix, an import the page can't share, or a docs data builder that failed.
 * - `spell-pack` prints its message and exits 1;  `spell pack` turns it into its own error.
 */
export class ComponentPackError extends Error {}
ComponentPackError.prototype.name = "ComponentPackError"

////////////////
// ## The JSX help (`jsx-help/`)
////////////////

/**
 * One custom element, as the JSX help knows it:  read from a package's Custom Elements Manifest.
 * - `folder`:  its family's folder, absolute:  where its own JSX (its render) lives, so where its parts are named
 */
export type CatalogElement = {
  /** Its tag, e.g. `ui-panel`. */
  tagName: string
  /** Its class's name, e.g. `UIPanel`:  tells which class in a family's folder renders it. */
  className: string
  /** Absolute folder of its family, e.g. `.../ui/src/components/ui-panel`. */
  folder: string
  /** Its slots, the default one (`""`) included when the manifest lists it. */
  slots: ElementDoc[]
  /** Its parts (`part="..."`, `::part(...)`). */
  parts: ElementDoc[]
  /** Its attributes' names, e.g. `vertical-align`. */
  attributes: string[]
  /** The names of the events it dispatches, e.g. `ui-changed`. */
  events: string[]
}

/** A slot or a part:  its name, and what it's for. */
export type ElementDoc = { name: string; description?: string }

/** The `source` of every warning the JSX help gives, shown in VS Code's Problems list. */
export const ELEMENT_HELP_SOURCE = "spell-elements"

/**
 * The codes of the JSX help's warnings:  far above TypeScript's own (1-18000 errors, 80000s suggestions),
 * so they never read as TypeScript's.
 * - `unknownSlot`:  `slot="..."` names a slot the parent tag doesn't have
 * - `unknownPart`:  `part="..."` names a part the component doesn't list
 * - `unknownAttribute`:  a dashed attribute (`text-alin="left"`) the tag doesn't have
 */
export const ELEMENT_HELP_CODES = { unknownSlot: 970_001, unknownPart: 970_002, unknownAttribute: 970_003 } as const
