import type { CDPSession } from "playwright"
import { describe, expect, test } from "vite-plus/test"

import { HeapGrowth, type HeapSnapshotJSON } from "spell/app/cli/perf/HeapGrowth"

/**
 * A tiny heap snapshot in Chrome's layout:  a root holding `count` Matches, each through a `Map`'s table, and a string.
 * - Node:  type, name, id, self_size, edge_count;  edge:  type, name_or_index, to_node (a node's place in `nodes`).
 */
function snapshotWith(count: number): HeapSnapshotJSON {
  const strings = ["", "(root)", "Map", "Match", "table", 'hello "quoted" \\ text']
  // the root, then the map, then the string, then the Matches:  5 numbers a node
  const nodes = [0, 1, 1, 0, 2, 3, 2, 3, 16, count, 2, 5, 5, 10, 0]
  // the root's two edges, to the map and the string;  then the map's, to each Match
  const edges = [2, 2, 5, 3, 4, 10]
  for (let index = 0; index < count; index++) {
    nodes.push(3, 3, 7 + index * 2, 40, 0)
    edges.push(3, 4, (3 + index) * 5)
  }
  return {
    snapshot: {
      meta: {
        node_fields: ["type", "name", "id", "self_size", "edge_count"],
        node_types: [["hidden", "array", "string", "object"], "string", "number", "number", "number"],
        edge_fields: ["type", "name_or_index", "to_node"],
        edge_types: [["context", "element", "property", "internal", "weak"], "string_or_number", "node"]
      }
    },
    nodes,
    edges,
    strings
  }
}

/** A CDP session that streams `snapshot`'s text in chunks of `size` characters as it's asked for one. */
function fakeSession(snapshot: HeapSnapshotJSON, size: number): CDPSession {
  const listeners: Array<(event: { chunk: string }) => void> = []
  const { snapshot: header, nodes, edges, strings } = snapshot
  const counts = { node_count: nodes.length / 5, edge_count: edges.length / 3 }
  const text =
    `{"snapshot":${JSON.stringify({ ...header, ...counts })},\n"nodes":[${Array.from(nodes).join(",")}],\n` +
    `"edges":[${Array.from(edges).join(",\n")}],\n"trace_tree":[[1,[2]]],"samples":[],\n"strings":${JSON.stringify(strings)}}`
  return {
    on: (_event: string, listener: (event: { chunk: string }) => void) => listeners.push(listener),
    off: () => {},
    send: async (method: string) => {
      if (method !== "HeapProfiler.takeHeapSnapshot") return {}
      for (let at = 0; at < text.length; at += size)
        for (const listener of listeners) listener({ chunk: text.slice(at, at + size) })
      return {}
    }
  } as unknown as CDPSession
}

describe("HeapGrowth", () => {
  test("counts each kind of node, and what holds them", () => {
    const census = HeapGrowth.censusOf(snapshotWith(3))
    expect(census.kinds.get("object Match")).toEqual({ count: 3, size: 120, heldBy: { "object Map.table": 3 } })
    expect(census.kinds.get("string")?.count).toBe(1)
  })

  test("lists what grew most, by size, with its holders' growth", () => {
    const rows = HeapGrowth.grewMost(HeapGrowth.censusOf(snapshotWith(2)), HeapGrowth.censusOf(snapshotWith(5)))
    expect(rows[0]).toEqual({ kind: "object Match", bytes: 120, count: 3, heldBy: ["object Map.table (+3)"] })
  })

  test("reads a snapshot as it streams in, split anywhere:  the same as reading it whole", async () => {
    const snapshot = snapshotWith(4)
    const whole = HeapGrowth.censusOf(snapshot)
    for (const size of [1, 7, 64, 100_000]) {
      const streamed = await HeapGrowth.snapshot(fakeSession(snapshot, size))
      expect(streamed.kinds).toEqual(whole.kinds)
    }
  })
})
