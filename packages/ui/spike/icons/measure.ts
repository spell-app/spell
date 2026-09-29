/**
 * `yarn measure`:  runs every candidate through headless chromium and writes `results.json`.
 * - Matrix:  protocol (`h1`, `h2`) x network (`local`, `net`) x candidate x icon count (0 = baseline page, 1, 10, 50)
 *   x cold / warm, `RUNS` loads each, median timings.
 * - Also:  disk sizes, bundler probes, two bundles on one page, licence facts.
 */
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium } from "playwright"

import { CANDIDATES, ICONS } from "./icon-list.ts"
import { Probes } from "./Probes.ts"
import { Runner, type Load, type Profile } from "./Runner.ts"
import type { Protocol } from "./TestServer.ts"

const HERE = fileURLToPath(new URL("./", import.meta.url))
const DIST = path.join(HERE, "dist")
/** Loads per cell;  timings are the median, counts and bytes are identical across runs. */
const RUNS = Number(process.env.RUNS ?? 5)
/** Icon counts measured (0 = the page with no icons, the baseline to subtract). */
const COUNTS = [0, 1, 10, 50]
const COMBOS: { protocol: Protocol; profile: Profile }[] = [
  { protocol: "h2", profile: "net" },
  { protocol: "h1", profile: "local" },
  { protocol: "h2", profile: "local" },
  { protocol: "h1", profile: "net" }
]

/** Median of `values`. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]!
}

/** `RUNS` loads of one cell, collapsed:  counts from the first, timings the median. */
async function cell(
  runner: Runner,
  variant: string,
  n: number,
  mode: "cold" | "warm",
  profile: Profile,
  two = false
): Promise<Load & { runs: number }> {
  const loads: Load[] = []
  for (let i = 0; i < RUNS; i++) loads.push(await runner.load(variant, n, mode, profile, two))
  const first = loads[0]!
  const pick = (key: "firstPaint" | "allPainted" | "loadEvent") =>
    loads.every((load) => load[key] !== undefined) ? round(median(loads.map((load) => load[key]!))) : undefined
  // NOTE: served / bytes can differ run to run in warm mode (cache commits);  report the median of those too.
  return {
    ...first,
    requests: median(loads.map((load) => load.requests)),
    served: median(loads.map((load) => load.served)),
    wireBytes: median(loads.map((load) => load.wireBytes)),
    bodyBytes: median(loads.map((load) => load.bodyBytes)),
    firstPaint: pick("firstPaint"),
    allPainted: pick("allPainted"),
    loadEvent: pick("loadEvent")!,
    errors: [...new Set(loads.flatMap((load) => load.errors))],
    runs: loads.length
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

/** `STATIC_ONLY=1 yarn measure`:  refresh disk / bundler / licence facts in the existing `results.json`, skip the browser matrix. */
const STATIC_ONLY = process.env.STATIC_ONLY === "1"
const results: Record<string, unknown> = STATIC_ONLY
  ? JSON.parse(readFileSync(path.join(HERE, "results.json"), "utf8"))
  : {
      generated: new Date().toISOString(),
      runsPerCell: RUNS,
      node: process.version,
      playwright: JSON.parse(readFileSync(path.join(HERE, "node_modules/playwright/package.json"), "utf8"))
        .version as string,
      fontAwesome: JSON.parse(readFileSync(path.join(DIST, "build-info.json"), "utf8")).fontAwesome as string,
      iconList: ICONS.map((icon) => `${icon.variant}/${icon.name}`),
      notes: {
        cold: "fresh context, CDP cache disabled, server `cache-control: no-store`",
        warm: "same context loads the page once unmeasured, then again with immutable caching",
        bytes: "`wireBytes` = sum of CDP encodedDataLength (headers + gzip body);  `bodyBytes` = gzip bodies as served",
        time: "ms from navigation start;  `firstPaint`/`allPainted` = two frames after the first/last icon was ready",
        net: "local = loopback;  net = 40 ms RTT, 20 Mbit/s down, 10 Mbit/s up (CDP emulation)"
      }
    }

const matrix: Record<string, Record<string, Record<string, { cold: Load; warm: Load }>>> = {}
for (const { protocol, profile } of STATIC_ONLY ? [] : COMBOS) {
  const key = `${protocol}-${profile}`
  console.log(`== ${key}`)
  const runner = await Runner.start(DIST, protocol)
  matrix[key] = {}
  for (const candidate of CANDIDATES) {
    matrix[key][candidate.id] = {}
    for (const n of COUNTS) {
      const cold = await cell(runner, candidate.id, n, "cold", profile)
      const warm = await cell(runner, candidate.id, n, "warm", profile)
      matrix[key][candidate.id]![String(n)] = { cold, warm }
      console.log(
        `${candidate.id.padEnd(7)} n=${String(n).padEnd(2)} cold ${cold.requests} req ${cold.wireBytes} B ${cold.firstPaint}/${cold.allPainted} ms | warm ${warm.served} served ${warm.allPainted} ms`
      )
    }
  }
  await runner.stop()
}
if (!STATIC_ONLY) results.matrix = matrix

// Two bundles on one page, each drawing the same 10 icons.
const twoBundles: Record<string, unknown> = {}
{
  const runner = await Runner.start(DIST, "h2")
  for (const candidate of STATIC_ONLY ? [] : CANDIDATES) {
    const one = await cell(runner, candidate.id, 10, "cold", "local")
    const two = await cell(runner, candidate.id, 10, "cold", "local", true)
    const warmTwo = await cell(runner, candidate.id, 10, "warm", "local", true)
    const unique = new Set(two.servedPaths).size
    twoBundles[candidate.id] = {
      oneBundleCold: { served: one.served, wireBytes: one.wireBytes },
      twoBundlesCold: { served: two.served, wireBytes: two.wireBytes, duplicatePaths: two.servedPaths.length - unique },
      twoBundlesWarm: { served: warmTwo.served, wireBytes: warmTwo.wireBytes },
      wireBytesRatio: round(two.wireBytes / one.wireBytes),
      errors: two.errors
    }
    console.log(`two bundles ${candidate.id}:`, JSON.stringify(twoBundles[candidate.id]))
  }
  await runner.stop()
}
if (!STATIC_ONLY) results.twoBundles = twoBundles

const probes = new Probes()
results.disk = probes.disk()
results.bundling = await probes.bundling()
results.licence = probes.licence()
results.chromium = await (async () => {
  const browser = await chromium.launch()
  const version = browser.version()
  await browser.close()
  return version
})()

writeFileSync(path.join(HERE, "results.json"), JSON.stringify(results, null, 2) + "\n")
console.log("wrote results.json")
