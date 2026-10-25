import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, extname } from "node:path"

import { bareName } from "./importLinks"
import type { MapFileStatus, MapGraph, MapKind, MapNode } from "./map.types"

/**
 * Reading a map file:  its age and size, whether it's stale (what `spell map status` prints, and what `spell map
 * query` checks before it asks), and its things by name.
 */

/**
 * Map `file`'s status:  when it was built, its size, and whether anything in `roots` was committed after.
 * - `roots`:  the git repos it maps
 * - NEVER throws:  a map it can't read is reported unbuilt, so stale
 */
export function mapStatus(kind: MapKind, file: string, roots: string[]): MapFileStatus {
  if (!existsSync(file)) return { kind, file, stale: true }
  const builtAt = statSync(file).mtimeMs
  try {
    const graph = JSON.parse(readFileSync(file, "utf8")) as MapGraph
    return {
      kind,
      file,
      builtAt: new Date(builtAt).toISOString(),
      nodes: graph.nodes.length,
      links: graph.links.length,
      stale: newestCommitAt(roots) > builtAt
    }
  } catch {
    return { kind, file, stale: true }
  }
}

/**
 * The things of map `file` named `name` EXACTLY, ignoring a call's `()` and a method's `.`:  `Tokenizer` is the class,
 * never `MarkdownTokenizer`, which graphify's own lookup would match too.
 * - `name` may be a node's id, as `spell map` lists them:  `spell-parser::src_parser_tokenizer_tokenizer_tokenizer`
 * - Several:  the ones in a file named for it first (`Tokenizer` in `Tokenizer.ts`)
 */
export function nodesNamed(file: string, name: string): MapNode[] {
  const graph = JSON.parse(readFileSync(file, "utf8")) as MapGraph
  const byId = graph.nodes.find((node) => node.id === name)
  if (byId) return [byId]
  const wanted = bareName(name)
  const found = graph.nodes.filter((node) => bareName(node.label) === wanted)
  const named = (node: MapNode) =>
    node.source_file ? basename(node.source_file, extname(node.source_file)) === wanted : false
  return [...found.filter(named), ...found.filter((node) => !named(node))]
}

/** When the newest commit of `roots` was made, in ms;  0 when none is a git repo. */
export function newestCommitAt(roots: string[]): number {
  let newest = 0
  for (const root of roots) {
    try {
      const seconds = Number(
        execFileSync("git", ["-C", root, "log", "-1", "--format=%ct"], { encoding: "utf8" }).trim()
      )
      newest = Math.max(newest, seconds * 1000)
    } catch {
      // not a git repo:  nothing to compare
    }
  }
  return newest
}
