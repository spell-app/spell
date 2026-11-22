import type { PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser } from "./PerfBrowser"
import { focusLineTwo } from "./LeaksMeasure"

/**
 * CPU profiles (Chrome's `Profiler`) of the editor:  its load, then 60 keys typed into a comment.
 * - The 15 functions with the most SELF time, and self time by file.
 * - Measured on an UNMINIFIED build (`servers.editor` is one, `PerfBuilds`' `editor-unminified`), so the names read.
 */
export class CpuMeasure {
  /** The editor under `profile`. */
  static async measure(profile: PerfProfileName, servers: PerfServers): Promise<CpuResult> {
    const browser = await PerfBrowser.open("editor", profile, servers)
    try {
      const { cdp, page } = browser
      await cdp.send("Profiler.enable")
      await cdp.send("Profiler.setSamplingInterval", { interval: 200 })
      await cdp.send("Profiler.start")
      const times = await browser.load()
      const { profile: loadProfile } = await cdp.send("Profiler.stop")
      const result: CpuResult = { profile, tti: times.tti, load: selfTimes(loadProfile) }
      const hasCode = await page.evaluate(
        () => !!(window as unknown as { editor?: { shownCodeEditor?: unknown } }).editor?.shownCodeEditor
      )
      if (hasCode) {
        await page.evaluate(focusLineTwo)
        await cdp.send("Profiler.start")
        for (let index = 0; index < 60; index++) {
          await page.keyboard.type(TYPED[index % TYPED.length]!)
          await page.waitForTimeout(120)
        }
        await page.waitForTimeout(1500)
        const { profile: typingProfile } = await cdp.send("Profiler.stop")
        result.typing = selfTimes(typingProfile)
      }
      return result
    } finally {
      await browser.close()
    }
  }
}

/** What's typed while typing is profiled. */
const TYPED = " the quick brown fox jumps over the lazy dog and on"

/** Self time per function and per file, from one of Chrome's CPU profiles. */
function selfTimes(profile: CpuProfile): SelfTimes {
  const byId = new Map(profile.nodes.map((node) => [node.id, node]))
  const self = new Map<number, number>()
  const samples = profile.samples ?? []
  samples.forEach((sample, index) => {
    self.set(sample, (self.get(sample) ?? 0) + (profile.timeDeltas?.[index] ?? 0) / 1000)
  })
  const functions = new Map<string, number>()
  const files = new Map<string, number>()
  let total = 0
  for (const [id, time] of self) {
    const { callFrame } = byId.get(id)!
    total += time
    const file = callFrame.url.replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, "") || "(native)"
    const name = `${callFrame.functionName || "(anonymous)"}  ${file.split("/").pop()}:${callFrame.lineNumber + 1}`
    functions.set(name, (functions.get(name) ?? 0) + time)
    files.set(file, (files.get(file) ?? 0) + time)
  }
  const top = (map: Map<string, number>, count: number) =>
    [...map.entries()]
      .sort((one, other) => other[1] - one[1])
      .slice(0, count)
      .map(([name, time]) => ({ name, ms: Math.round(time), share: +((time / (total || 1)) * 100).toFixed(1) }))
  return { totalMs: Math.round(total), functions: top(functions, 15), files: top(files, 10) }
}

/** What `selfTimes()` reads of a CPU profile. */
type CpuProfile = {
  nodes: Array<{ id: number; callFrame: { functionName: string; url: string; lineNumber: number } }>
  samples?: number[]
  timeDeltas?: number[]
}

/** A profile's self time:  in all, the top functions, the top files. */
export type SelfTimes = {
  totalMs: number
  functions: Array<{ name: string; ms: number; share: number }>
  files: Array<{ name: string; ms: number; share: number }>
}

/** The editor's CPU, as it loads and as it's typed in. */
export type CpuResult = { profile: PerfProfileName; tti: number; load: SelfTimes; typing?: SelfTimes }
