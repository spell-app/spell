import chalk from "chalk"

import { CLI } from "spell/cli"
import {
  CodeMap,
  DocsMap,
  Graphify,
  MAP_KINDS,
  mapStatus,
  nodesNamed,
  type MapKind,
  type MapNode,
  type MapStatus
} from "spell/cli/map"

/**
 * `spell map <verb>`:  a map of every repo's code, and one of the docs, to ask "what already does this?" and "which
 * pages say X?" (epic `coherence` P1).  The work:  `spell/cli/map`.
 * - `install`:  graphify, which maps the code, with uv;  OPTIONAL:  nothing else needs it
 * - `status`:  whether graphify is there, and each map's age
 * - `build [code|docs]`:  build the maps (default both);  the code map needs graphify, the docs map doesn't
 * - `query <words...>`:  a question in words, graphify's own (`--budget` caps the answer)
 * - `explain <name>`:  a thing, and everything linked to it:  `spell map explain PrefStore`
 * - `uses <name>`:  what uses it:  `spell map uses "readJSON5File()"`
 * - `--docs`:  ask the docs map instead:  `spell map explain readJSON5File --docs` lists the pages that name it
 * - A map older than the newest commit of what it maps is rebuilt before it's asked.
 * - Which checkout:  the nearest kit from the current folder (`findCheckout(KIT_MARKER)`).
 * - Throws `CliError` for an unknown verb or map, or when graphify is needed and isn't installed.
 */
export async function mapCommand(verb = "status", words: string[] = [], options: CLI.MapOptions = {}): Promise<number> {
  const maps = new Maps(CLI.findCheckout(CLI.KIT_MARKER))
  switch (verb) {
    case "install":
      return Graphify.install()
    case "status":
      return maps.printStatus(options)
    case "build":
      return maps.build(kindsOf(words[0]), options)
    case "query":
    case "explain":
    case "uses": {
      if (!words.length) throw new CLI.CliError(`spell map ${verb}:  say what to ask about`)
      const kind: MapKind = options.docs ? "docs" : "code"
      return maps.ask(kind, verb, words, options)
    }
    default:
      throw new CLI.CliError(`unknown verb '${verb}':  install, status, build, query, explain, uses`)
  }
}

/****************
 * ### `Maps`
 * The checkout's two maps, for `spell map`'s verbs.
 ****************/
class Maps {
  readonly code: CodeMap
  readonly docs: DocsMap

  constructor(readonly checkout: string) {
    this.code = new CodeMap(checkout)
    this.docs = new DocsMap(checkout, this.code.repos)
  }

  /** Whether graphify is installed, and each map's age. */
  get status(): MapStatus {
    const roots = this.code.repos.map((repo) => repo.root)
    return {
      graphify: Graphify.program,
      maps: [
        mapStatus("code", this.code.file, roots),
        mapStatus("docs", this.docs.file, this.docs.contentFolder ? [...roots, this.docs.contentFolder] : roots)
      ]
    }
  }

  /** Print `status`. */
  printStatus(options: CLI.MapOptions): number {
    const status = this.status
    if (options.json) {
      CLI.out(JSON.stringify(status, null, 2))
      return CLI.EXIT.OK
    }
    CLI.out(
      status.graphify
        ? `graphify:  ${status.graphify}`
        : `graphify:  ${chalk.yellow("not installed")} (spell map install)`
    )
    for (const map of status.maps) {
      const age = map.builtAt ? `built ${map.builtAt}, ${map.nodes} things, ${map.links} links` : "never built"
      CLI.out(`${map.kind} map:  ${age}${map.stale ? chalk.yellow(" -- stale") : ""}  (${CLI.relativePath(map.file)})`)
    }
    return CLI.EXIT.OK
  }

  /** Build the `kinds` maps, saying what each holds. */
  build(kinds: readonly MapKind[], options: CLI.MapOptions): number {
    const built = kinds.map((kind) => {
      const graph = kind === "code" ? this.code.build((repo) => CLI.err(`mapping ${repo.name} ...`)) : this.docs.build()
      return { kind, nodes: graph.nodes.length, links: graph.links.length }
    })
    if (options.json) CLI.out(JSON.stringify(built, null, 2))
    else for (const map of built) CLI.out(`${map.kind} map:  ${map.nodes} things, ${map.links} links`)
    return CLI.EXIT.OK
  }

  /** Ask map `kind` one of graphify's questions, rebuilding it first when it's stale. */
  ask(kind: MapKind, verb: string, words: string[], options: CLI.MapOptions): Promise<number> {
    Graphify.need()
    const status = this.status.maps.find((map) => map.kind === kind)!
    if (status.stale) {
      CLI.err(`the ${kind} map is stale:  building it first ...`)
      this.build([kind], {})
    }
    const file = kind === "code" ? this.code.file : this.docs.file
    const asked = words.join(" ")
    if (verb === "query")
      return Graphify.ask("query", file, [asked, ...(options.budget ? ["--budget", options.budget] : [])])
    const id = this.idOf(file, asked)
    return verb === "explain"
      ? Graphify.ask("explain", file, [id])
      : Graphify.ask("affected", file, [id, "--depth", "1"])
  }

  /**
   * The id of the ONE thing of map `file` named `name`, for graphify:  its own lookup also matches longer names.
   * - throws `CliError` for none, or for several in files not named for it, listing them with their ids
   */
  private idOf(file: string, name: string): string {
    const [first, ...others] = nodesNamed(file, name)
    if (!first) throw new CLI.CliError(`nothing in the map is named '${name}'`, CLI.EXIT.ERRORS)
    const named = (node: MapNode) =>
      node.source_file
        ?.split("/")
        .pop()
        ?.replace(/\.\w+$/, "") === name.replace(/\(\)$/, "")
    if (!others.length || (named(first) && !others.some(named))) return first.id
    const list = [first, ...others].map(
      (node) => `  ${node.id}  ${node.source_file ?? ""}:${node.source_location ?? ""}`
    )
    throw new CLI.CliError(`several things are named '${name}':  pass one's id\n${list.join("\n")}`, CLI.EXIT.ERRORS)
  }
}

/** The maps `which` names:  `code`, `docs`, or both when none. */
function kindsOf(which: string | undefined): readonly MapKind[] {
  if (!which) return MAP_KINDS
  if (!(MAP_KINDS as readonly string[]).includes(which))
    throw new CLI.CliError(`unknown map '${which}':  ${MAP_KINDS.join(", ")}`)
  return [which as MapKind]
}
