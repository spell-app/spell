import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, extname, join } from "node:path"

import { readJSON5File } from "spell/util/node/json5"
import { CLI } from "spell/cli"

import { Graphify } from "./Graphify"
import { bareName, importsOf, moduleFileFor } from "./importLinks"
import {
  MAP_FOLDER,
  MAP_ORIGIN,
  type ImportStatement,
  type MapGraph,
  type MapLink,
  type MapNode,
  type MappedRepo
} from "./map.types"

/****************
 * ### `CodeMap`
 * The code map:  every repo's code in ONE graph, which graphify's questions run on
 * (`spell map query`, `explain`, `uses`).
 * - Each repo is mapped by graphify on its own (`Graphify.mapRepo()`):  graphify skips what git ignores, so a map
 *   of the kit alone has none of its child repos.
 * - Then merged:  each repo's ids prefixed with its name (`spell-ui::...`), as graphify's own `merge-graphs` does.
 * - Then linked:  graphify can't follow our package-name imports (`spell/util/node/json5`), so the merge reads each
 *   file's imports and adds the links itself (`importsOf()`):
 *   - `imports_from`:  the file to the module it imports
 *   - `uses`:  the file to each name it takes, found in that module, or in the folder a barrel exports
 *     (`import { P } from "spell-parser/parser"`, then `P.Tokenizer`:  a link to `Tokenizer`)
 * - Written to the checkout's `graphify-out/code.json` (git-ignored).
 ****************/
export class CodeMap {
  constructor(readonly checkout: string) {}

  /** The map's file, in the checkout's root. */
  get file(): string {
    return join(this.checkout, MAP_FOLDER, CODE_FILE)
  }

  /** The repos it covers, lowest first:  the kit, then each child repo `repos.json5` lists that's in the checkout. */
  get repos(): MappedRepo[] {
    const names = readJSON5File<{ repos?: { name: string }[] }>(join(this.checkout, CLI.KIT_MARKER)).repos ?? []
    const repos = [{ name: "spell", folder: "" }, ...names.map(({ name }) => ({ name, folder: name }))]
    return repos.flatMap(({ name, folder }) => {
      const root = join(this.checkout, folder)
      const manifest = join(root, "package.json")
      if (!existsSync(manifest)) return []
      const packageName = (JSON.parse(readFileSync(manifest, "utf8")) as { name: string }).name
      return [{ name, root, folder, packageName }]
    })
  }

  /**
   * Map every repo with graphify, then merge and link them, and write the map.
   * - `onRepo`:  told as each repo starts, for progress
   * - throws `CliError` when graphify isn't installed
   */
  build(onRepo: (repo: MappedRepo) => void = () => {}): MapGraph {
    const repos = this.repos
    for (const repo of repos) {
      onRepo(repo)
      Graphify.mapRepo(repo.root)
    }
    const graph = this.merge(repos.map((repo) => ({ repo, graph: readGraph(join(repo.root, MAP_FOLDER, REPO_FILE)) })))
    mkdirSync(dirname(this.file), { recursive: true })
    writeFileSync(this.file, JSON.stringify(graph))
    return graph
  }

  /**
   * `graphs`, one per repo, as ONE map:  prefixed, then linked across repos (above).
   * - Reads each code file's imports from the checkout.
   * - NEVER throws for a file it can't read:  it's left unlinked.
   */
  merge(graphs: Array<{ repo: MappedRepo; graph: MapGraph }>): MapGraph {
    const nodes: MapNode[] = []
    const links: MapLink[] = []
    for (const { repo, graph } of graphs) {
      const prefix = (id: string) => `${repo.name}::${id}`
      const inRepo = (path?: string) => (path && repo.folder ? `${repo.folder}/${path}` : path)
      for (const node of graph.nodes)
        nodes.push({ ...node, id: prefix(node.id), repo: repo.name, source_file: inRepo(node.source_file) })
      for (const link of graph.links)
        links.push({
          ...link,
          source: prefix(link.source),
          target: prefix(link.target),
          source_file: inRepo(link.source_file)
        })
    }
    const linked = this.linkImports(
      graphs.map(({ repo }) => repo),
      nodes
    )
    return {
      directed: true,
      nodes: dropResolved(nodes, linked.resolved),
      links: [...unresolvedOnly(links, linked.resolved), ...linked.links]
    }
  }

  /** The links our package-name imports make (`imports_from`, `uses`), and the placeholder nodes they replace. */
  private linkImports(repos: MappedRepo[], nodes: MapNode[]): { links: MapLink[]; resolved: Set<string> } {
    const index = new SymbolIndex(nodes)
    const links: MapLink[] = []
    const resolved = new Set<string>()
    for (const file of index.files) {
      if (!CODE_EXTENSIONS.has(extname(file.source_file!))) continue
      const text = readSource(join(this.checkout, file.source_file!))
      if (!text) continue
      for (const statement of importsOf(text)) {
        const target = moduleFileFor(statement.from, repos, (path) => index.fileNode(path) !== undefined)
        if (!target) continue
        const placeholder = index.placeholder(file.repo!, statement.from)
        if (placeholder) resolved.add(placeholder.id)
        links.push(link(file, index.fileNode(target)!, "imports_from", statement.line))
        const used = index.usesOf(statement, target, text)
        for (const symbol of new Set(used.values())) links.push(link(file, symbol, "uses", statement.line))
        for (const [local, base] of used)
          for (const { name, line } of subclassesOf(text, local)) {
            const subclass = index.classIn(file.source_file!, name)
            if (subclass) links.push(link(subclass, base, "inherits", line))
          }
      }
    }
    return { links, resolved }
  }
}

/** The merged code map's file name, in the checkout's `graphify-out/`. */
const CODE_FILE = "code.json"

/** The file graphify writes in each repo's `graphify-out/`. */
const REPO_FILE = "graph.json"

/** The files whose imports the merge reads. */
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"])

/****************
 * ### `SymbolIndex`
 * The merged map's nodes, looked up by file and by name, for linking imports.
 ****************/
class SymbolIndex {
  /** Each file's own node, by path from the checkout's root. */
  private readonly fileNodes = new Map<string, MapNode>()
  /** Each file's symbols (not the file itself), by path from the checkout's root. */
  private readonly symbols = new Map<string, MapNode[]>()
  /** Every symbol but methods, by bare name (`readJSON5File`). */
  private readonly byName = new Map<string, MapNode[]>()
  /** graphify's placeholder node for an import it couldn't follow, by repo and module:  `spell\0spell/cli`. */
  private readonly placeholders = new Map<string, MapNode>()

  constructor(nodes: MapNode[]) {
    for (const node of nodes) {
      const path = node.source_file
      if (node.id.startsWith(`${node.repo}::ref_`)) this.placeholders.set(`${node.repo}\0${node.label}`, node)
      if (!path || node.file_type !== "code") continue
      // a file's own node:  its name, or with its folder when two files share one (`cli/repos.ts`)
      if (node.label === basename(path) || node.label.endsWith(`/${basename(path)}`)) {
        this.fileNodes.set(path, node)
        continue
      }
      this.symbols.set(path, [...(this.symbols.get(path) ?? []), node])
      if (!node.label.startsWith(".")) {
        const name = bareName(node.label)
        this.byName.set(name, [...(this.byName.get(name) ?? []), node])
      }
    }
  }

  /** graphify's placeholder for module `from`, imported in `repo`. */
  placeholder(repo: string, from: string): MapNode | undefined {
    return this.placeholders.get(`${repo}\0${from}`)
  }

  /** Every file's own node. */
  get files(): MapNode[] {
    return [...this.fileNodes.values()]
  }

  /** The node of the file at `path`, from the checkout's root. */
  fileNode(path: string): MapNode | undefined {
    return this.fileNodes.get(path)
  }

  /**
   * The symbols `statement` takes from `module`, by the name the file reads each by (`readJSON5File`, `P.Tokenizer`):  in the module itself, else in its folder (a barrel's).
   * - A namespace (`* as X`, or any name the file reads as `P.member`):  each member it reads, in `text`.
   * - A name found twice in the folder:  the one in a file named for it (`Tokenizer` in `Tokenizer.ts`), else none.
   */
  usesOf(statement: ImportStatement, module: string, text: string): Map<string, MapNode> {
    const found = new Map<string, MapNode>()
    for (const { name, local, namespace } of statement.names) {
      // read as `P.member`:  a namespace, whatever graphify made of `export * as P` in the barrel
      const members = membersRead(text, local)
      if (namespace || members.length) {
        for (const member of members) {
          const each = this.symbolIn(module, member)
          if (each) found.set(`${local}.${member}`, each)
        }
        continue
      }
      const symbol = this.symbolIn(module, name)
      if (symbol) found.set(local, symbol)
    }
    return found
  }

  /** The class named `name` declared in file `path`. */
  classIn(path: string, name: string): MapNode | undefined {
    return this.symbols.get(path)?.find((node) => node.label === name)
  }

  /** Symbol `name` of `module`, else of the folder it's in. */
  private symbolIn(module: string, name: string): MapNode | undefined {
    const own = this.symbols.get(module)?.find((node) => bareName(node.label) === name)
    if (own) return own
    const folder = `${dirname(module)}/`
    const matches = (this.byName.get(name) ?? []).filter((node) => node.source_file!.startsWith(folder))
    if (matches.length === 1) return matches[0]
    return matches.find((node) => basename(node.source_file!, extname(node.source_file!)) === name)
  }
}

/**
 * The classes `text` declares that extend `base`, as the file reads it:  `class MarkdownTokenizer extends P.Tokenizer`.
 * - graphify links a subclass to a base class in the same file, or imported by `./Peer`, but not by package name.
 */
function subclassesOf(text: string, base: string): Array<{ name: string; line: number }> {
  const pattern = new RegExp(
    `\\bclass\\s+(\\w+)(?:<[^>{]*>)?\\s+extends\\s+${base.replace(".", "\\.")}\\b(?![.\\w])`,
    "g"
  )
  return [...text.matchAll(pattern)].map((match) => ({
    name: match[1]!,
    line: text.slice(0, match.index).split("\n").length
  }))
}

/** The members `text` reads of namespace `local`:  `P.Tokenizer`, `P.Rule` => `Tokenizer`, `Rule`. */
function membersRead(text: string, local: string): string[] {
  return [...new Set([...text.matchAll(new RegExp(`\\b${local}\\.(\\w+)`, "g"))].map((match) => match[1]!))]
}

/** A link of ours, from `from` to `to`, at `line` of `from`'s file. */
function link(from: MapNode, to: MapNode, relation: string, line: number): MapLink {
  return {
    source: from.id,
    target: to.id,
    relation,
    confidence: "EXTRACTED",
    source_file: from.source_file,
    source_location: `L${line}`,
    _origin: MAP_ORIGIN
  }
}

/** `nodes` without the placeholder nodes graphify made for imports we resolved. */
function dropResolved(nodes: MapNode[], resolved: Set<string>): MapNode[] {
  return nodes.filter((node) => !resolved.has(node.id))
}

/** `links` without those to placeholder nodes we resolved:  ours replace them. */
function unresolvedOnly(links: MapLink[], resolved: Set<string>): MapLink[] {
  return links.filter((each) => !resolved.has(each.target))
}

/** A repo's graphify map;  throws when it's missing, naming it. */
function readGraph(file: string): MapGraph {
  if (!existsSync(file)) throw new Error(`no map at ${file}:  graphify didn't write one`)
  return JSON.parse(readFileSync(file, "utf8")) as MapGraph
}

/** A source file's text;  `undefined` when it can't be read. */
function readSource(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8")
  } catch {
    return undefined
  }
}
