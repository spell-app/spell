/****************
 * ### The element tools' types
 * Shapes shared by the kit's element tools (`src/element-tools/`) and the repos that call them:  the component packs'
 * reports and their error.
 * - At the BOTTOM of the tools' import graph:  types and one error class, nothing else, so every tool (and spell-app's
 *   `spell pack`, through `spell-kit/element-tools/tools.types`) imports it without loading another.
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
