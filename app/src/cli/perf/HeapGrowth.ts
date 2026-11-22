import { createWriteStream, mkdirSync } from "node:fs"
import { join } from "node:path"

import type { CDPSession } from "playwright"

/****************
 * ### `HeapGrowth`
 * What grew on a page's heap over a leak loop:  a heap snapshot before and after, the things in them counted by kind,
 * and the 10 kinds that grew most, each with what holds them (epic `solid-2-final` P10).
 * - A kind is a snapshot node's type and name:  `object Match`, `closure draw`, `string`, `code (compiled code)`.
 * - What holds them:  the kinds of the nodes pointing at the after snapshot's nodes of that kind, most first,
 *   e.g. `Map (table)`, `SpellFile.match`.
 * - Both snapshots are saved, when `saveTo` names a folder:  for Chrome's Memory tab, to look closer.
 *   - The editor's are 400-500 MB each.
 * - Read as it streams in (`SnapshotReader`), never as one string:  the editor's is near the longest string node
 *   can hold, and `JSON.parse()` of it failed.
 * - Plain node, no browser of its own:  the CDP session is the caller's (`PerfBrowser`).
 ****************/
export class HeapGrowth {
  /**
   * A snapshot of the page's heap, after a full garbage collection.
   * - `saveTo`, `name`:  written there as `<name>.heapsnapshot` too.
   */
  static async snapshot(cdp: CDPSession, saveTo?: string, name = "heap"): Promise<HeapCensus> {
    await cdp.send("HeapProfiler.enable")
    await cdp.send("HeapProfiler.collectGarbage")
    await cdp.send("HeapProfiler.collectGarbage")
    const reader = new SnapshotReader()
    if (saveTo) mkdirSync(saveTo, { recursive: true })
    const file = saveTo ? createWriteStream(join(saveTo, `${name}.heapsnapshot`)) : undefined
    const onChunk = ({ chunk }: { chunk: string }) => {
      reader.read(chunk)
      file?.write(chunk)
    }
    cdp.on("HeapProfiler.addHeapSnapshotChunk", onChunk)
    try {
      await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false })
    } finally {
      cdp.off("HeapProfiler.addHeapSnapshotChunk", onChunk)
      await new Promise((resolve) => (file ? file.end(resolve) : resolve(undefined)))
    }
    return HeapGrowth.censusOf(reader.snapshot())
  }

  /**
   * Every kind of node in `snapshot`, counted and sized, and what points at each kind.
   * - Pure.
   */
  static censusOf(snapshot: HeapSnapshotJSON): HeapCensus {
    const { meta } = snapshot.snapshot
    const nodeFields = meta.node_fields
    const edgeFields = meta.edge_fields
    const nodeTypes = meta.node_types[nodeFields.indexOf("type")] as string[]
    const edgeTypes = meta.edge_types[edgeFields.indexOf("type")] as string[]
    const [typeAt, nameAt, sizeAt, edgesAt] = ["type", "name", "self_size", "edge_count"].map((field) =>
      nodeFields.indexOf(field)
    ) as [number, number, number, number]
    const [edgeTypeAt, edgeNameAt, toAt] = ["type", "name_or_index", "to_node"].map((field) =>
      edgeFields.indexOf(field)
    ) as [number, number, number]
    const { nodes, edges, strings } = snapshot
    const nodeWidth = nodeFields.length
    const edgeWidth = edgeFields.length
    const nodeCount = nodes.length / nodeWidth
    const kindOf = new Array<string>(nodeCount)
    const kinds = new Map<string, HeapKind>()
    for (let node = 0; node < nodeCount; node++) {
      const at = node * nodeWidth
      const type = nodeTypes[nodes[at + typeAt]!]!
      const name =
        type === "string" || type === "concatenated string" || type === "sliced string"
          ? ""
          : strings[nodes[at + nameAt]!]!
      const kind = name ? `${type} ${name.slice(0, 80)}` : type
      kindOf[node] = kind
      const entry = kinds.get(kind) ?? { count: 0, size: 0, heldBy: {} }
      entry.count++
      entry.size += nodes[at + sizeAt]!
      kinds.set(kind, entry)
    }
    let edge = 0
    for (let node = 0; node < nodeCount; node++) {
      const parent = kindOf[node]!
      const edgeCount = nodes[node * nodeWidth + edgesAt]!
      for (let index = 0; index < edgeCount; index++, edge += edgeWidth) {
        const edgeType = edgeTypes[edges[edge + edgeTypeAt]!]!
        if (edgeType === "weak" || edgeType === "shortcut") continue
        const child = kindOf[edges[edge + toAt]! / nodeWidth]!
        const named = edgeType === "property" || edgeType === "context" || edgeType === "internal"
        const via = named ? `${parent}.${String(strings[edges[edge + edgeNameAt]!]).slice(0, 40)}` : parent
        const heldBy = kinds.get(child)!.heldBy
        heldBy[via] = (heldBy[via] ?? 0) + 1
      }
    }
    return { kinds }
  }

  /**
   * The `top` kinds that grew most from `before` to `after`, by size, each with its 3 commonest holders after.
   * - Pure.
   */
  static grewMost(before: HeapCensus, after: HeapCensus, top = 10): HeapGrowthRow[] {
    const rows: HeapGrowthRow[] = []
    for (const [kind, now] of after.kinds) {
      const was = before.kinds.get(kind) ?? { count: 0, size: 0, heldBy: {} }
      const grew = now.size - was.size
      if (grew <= 0) continue
      const heldBy = Object.entries(now.heldBy)
        .map(([holder, count]) => ({ holder, grew: count - (was.heldBy[holder] ?? 0) }))
        .filter((it) => it.grew > 0)
        .sort((a, b) => b.grew - a.grew)
        .slice(0, 3)
        .map(({ holder, grew: count }) => `${holder} (+${count})`)
      rows.push({ kind, bytes: grew, count: now.count - was.count, heldBy })
    }
    return rows.sort((a, b) => b.bytes - a.bytes).slice(0, top)
  }
}

/** A heap snapshot as Chrome writes it:  flat arrays, described by `snapshot.meta`. */
export type HeapSnapshotJSON = {
  snapshot: {
    meta: {
      node_fields: string[]
      node_types: Array<string[] | string>
      edge_fields: string[]
      edge_types: Array<string[] | string>
    }
  }
  nodes: ArrayLike<number>
  edges: ArrayLike<number>
  strings: string[]
}

/** Every kind of node in a snapshot, by kind -- see `HeapGrowth.censusOf()`. */
export type HeapCensus = { kinds: Map<string, HeapKind> }

/** One kind of node in a snapshot. */
export type HeapKind = {
  /** how many */
  count: number
  /** their own bytes, all together */
  size: number
  /** how many edges reach them from each kind of node (and the edge's name, if any) */
  heldBy: Record<string, number>
}

/** One kind that grew over a loop -- see `HeapGrowth.grewMost()`. */
export type HeapGrowthRow = {
  /** `object Match`, `closure draw` ... */
  kind: string
  /** how many bytes more */
  bytes: number
  /** how many more of them */
  count: number
  /** what holds the new ones, most first:  `object Map.table (+120)` */
  heldBy: string[]
}

/**
 * A heap snapshot read as Chrome streams it, chunk by chunk:  its `snapshot` header, `nodes`, `edges` and `strings`.
 * - The numbers go straight into typed arrays sized by the header's counts;  every other array is skipped.
 * - Assumes Chrome's layout:  the header first, then `"nodes":[`, and no strings in the arrays it skips.
 */
class SnapshotReader {
  /** Take the next chunk of the snapshot's text. */
  read(chunk: string): void {
    for (let at = 0; at < chunk.length;) at = this.step(chunk, at)
  }

  /** The snapshot, once every chunk is read;  throws if it never got as far as its nodes. */
  snapshot(): HeapSnapshotJSON {
    if (!this.header) throw new Error("HeapGrowth:  the heap snapshot ended before its nodes")
    return { snapshot: this.header, nodes: this.nodes, edges: this.edges, strings: this.strings }
  }

  /** Read on from `at` in `chunk`;  answers where it got to. */
  private step(chunk: string, at: number): number {
    switch (this.mode) {
      case "header":
      case "between": {
        this.text += chunk.slice(at)
        // the header's own arrays (`node_fields` ...) come first:  it ends where `nodes` starts
        const found = (this.mode === "header" ? NODES_START : ARRAY_START).exec(this.text)
        if (!found) {
          // keep only what a key split across chunks needs
          if (this.mode === "between") this.text = this.text.slice(-40)
          return chunk.length
        }
        const after = this.text.slice(found.index + found[0].length)
        if (this.mode === "header") {
          const header = JSON.parse(`${this.text.slice(0, found.index).replace(/,\s*$/, "")}}`) as {
            snapshot: HeapSnapshotJSON["snapshot"] & { node_count: number; edge_count: number }
          }
          this.header = header.snapshot
          const { meta, node_count: nodeCount, edge_count: edgeCount } = header.snapshot
          this.nodes = new Uint32Array(nodeCount * meta.node_fields.length)
          this.edges = new Uint32Array(edgeCount * meta.edge_fields.length)
        }
        const key = found[1]!
        this.mode = key === "nodes" || key === "edges" ? "numbers" : key === "strings" ? "strings" : "skip"
        this.target = key === "edges" ? this.edges : this.nodes
        this.filled = 0
        this.depth = 1
        this.text = ""
        // what came after the key in this chunk:  read on, from what's left of it
        this.read(after)
        return chunk.length
      }
      case "numbers": {
        for (; at < chunk.length; at++) {
          const code = chunk.charCodeAt(at)
          if (code >= 48 && code <= 57) {
            this.number = this.number * 10 + code - 48
            this.inNumber = true
            continue
          }
          if (this.inNumber) this.target[this.filled++] = this.number
          this.number = 0
          this.inNumber = false
          if (code === 93 /* ] */) {
            this.mode = "between"
            return at + 1
          }
        }
        return at
      }
      case "skip": {
        for (; at < chunk.length; at++) {
          const char = chunk[at]
          if (char === "[") this.depth++
          else if (char === "]" && --this.depth === 0) {
            this.mode = "between"
            return at + 1
          }
        }
        return at
      }
      case "strings": {
        for (; at < chunk.length; at++) {
          const char = chunk[at]!
          if (this.inString) {
            this.string += char
            if (this.escaped) this.escaped = false
            else if (char === "\\") this.escaped = true
            else if (char === '"') {
              this.strings.push(JSON.parse(this.string) as string)
              this.string = ""
              this.inString = false
            }
          } else if (char === '"') {
            this.inString = true
            this.string = '"'
          } else if (char === "]") {
            this.mode = "done"
            return chunk.length
          }
        }
        return at
      }
      default:
        return chunk.length
    }
  }

  /** what it's reading now */
  private mode: "header" | "between" | "numbers" | "skip" | "strings" | "done" = "header"

  /** text kept while looking for the next array's key */
  private text = ""

  private header: HeapSnapshotJSON["snapshot"] | undefined
  private nodes = new Uint32Array(0)
  private edges = new Uint32Array(0)
  private strings: string[] = []

  /** the array the numbers go into, and how far it's filled */
  private target = this.nodes
  private filled = 0

  /** the number being read, digit by digit */
  private number = 0
  private inNumber = false

  /** how deep in a skipped array */
  private depth = 0

  /** the string being read, with its quotes, as JSON */
  private string = ""
  private inString = false
  private escaped = false
}

/** The start of one of a snapshot's arrays:  its key, e.g. `"nodes":[`. */
const ARRAY_START = /"(\w+)"\s*:\s*\[/

/** Where the header ends:  the `nodes` array starts. */
const NODES_START = /"(nodes)"\s*:\s*\[/
