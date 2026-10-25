/**
 * Types and constants for `spell map` (`spell/cli/map`):  the maps' file shape, where they live, and what
 * `spell map status` reports.
 * - Runtime-light:  no imports at all, so every file of the folder takes it first.
 */

////////////////
// ## The map file
////////////////

/**
 * A map:  graphify's graph file, node-link JSON (networkx's), which `graphify query` / `explain` / `affected` read.
 * - `nodes`, `links`:  its things and how they're related
 * - `directed`:  `true`:  each link reads from `source` to `target`
 * - The code map is graphify's own, merged across repos;  the docs map is ours (`DocsMap`), in the same shape.
 */
export type MapGraph = {
  directed: boolean
  nodes: MapNode[]
  links: MapLink[]
}

/**
 * One thing in a map:  a file, a class, a function, a page, a heading, a name a page mentions.
 * - `id`:  unique in its map;  in the merged code map, prefixed with its repo:  `spell-ui::src_runtime_sources`
 * - `label`:  what people call it, and what `graphify explain "<label>"` finds it by:  `readJSON5File()`, `PrefStore`
 * - `file_type`:  graphify's kind:  `code`, `document`, `concept` ...
 * - `source_file`:  its file, relative to the checkout's root:  `spell-ui/src/runtime/Sources.ts`
 * - `source_location`:  its line, `L30`
 * - `repo`:  the repo it's in, as `repos.json5` names it;  the kit's:  `spell`
 * - Other keys graphify writes are kept as they are.
 */
export type MapNode = {
  id: string
  label: string
  file_type: string
  source_file?: string
  source_location?: string
  repo?: string
  [key: string]: unknown
}

/**
 * A link between two things of a map.
 * - `relation`:  graphify's (`calls`, `contains`, `imports_from` ...), or ours:
 *   - `uses`:  a file uses a name another module exports (`MAP_ORIGIN`'s links, `CodeMap`)
 *   - `links_to`, `mentions`, `contains`:  the docs map's (`DocsMap`)
 * - `confidence`:  graphify's `EXTRACTED` (read from the source), `INFERRED` ...
 */
export type MapLink = {
  source: string
  target: string
  relation: string
  confidence: string
  source_file?: string
  source_location?: string
  [key: string]: unknown
}

////////////////
// ## Where maps live
////////////////

/** The two maps:  the code of every repo, and the docs (epic pages, guides, READMEs). */
export const MAP_KINDS = ["code", "docs"] as const

/** One of `MAP_KINDS`. */
export type MapKind = (typeof MAP_KINDS)[number]

/**
 * The folder graphify writes into, in each repo it maps:  git-ignored there.
 * - The checkout's root holds the merged maps too:  `code.json`, `docs.json`.
 */
export const MAP_FOLDER = "graphify-out"

/** graphify's package, as `uv tool install` takes it (the open-source engine:  never the hosted site). */
export const GRAPHIFY_PACKAGE = "graphifyy"

/** Marks the links and nodes `spell map` adds to graphify's, so a reader can tell them apart. */
export const MAP_ORIGIN = "spell-map"

////////////////
// ## Status
////////////////

/**
 * `spell map status`:  whether graphify is installed, and each map's age.
 * - `graphify`:  its program's path;  none:  not installed
 */
export type MapStatus = {
  graphify?: string
  maps: MapFileStatus[]
}

/**
 * One map's file, as `spell map status` reports it.
 * - `builtAt`:  when it was written;  none:  never built
 * - `stale`:  something it maps changed after it was built:  `spell map query` rebuilds it first
 */
export type MapFileStatus = {
  kind: MapKind
  file: string
  builtAt?: string
  nodes?: number
  links?: number
  stale: boolean
}

////////////////
// ## Linking imports across repos
////////////////

/**
 * One import (or re-export) statement of a file, as `importsOf()` reads it.
 * - `from`:  the module, as written:  `spell/util/node/json5`, `./Peer`
 * - `names`:  what it takes, by their names in the module (`b` of `{ b as c }`);  a namespace's (`* as X`, or a
 *   barrel's `{ P }`) is its local name, and `namespace` is `true`
 * - `line`:  its first line, from 1
 */
export type ImportStatement = {
  from: string
  names: ImportedName[]
  line: number
}

/**
 * A name an import takes.
 * - `name`:  in the module;  `local`:  in the importing file
 * - `namespace`:  `* as X`:  the file reads it as `X.member`
 */
export type ImportedName = {
  name: string
  local: string
  namespace?: boolean
}

/**
 * A repo the code map covers.
 * - `name`:  as `repos.json5` names it;  the kit's:  `spell`
 * - `root`:  its folder, absolute
 * - `folder`:  that, relative to the checkout's root;  the kit's:  `""`
 * - `packageName`:  its npm package's, which other repos import it by:  `spell`, `spell-ui`
 */
export type MappedRepo = {
  name: string
  root: string
  folder: string
  packageName: string
}
