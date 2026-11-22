import { setTimeout as sleep } from "node:timers/promises"
import os from "node:os"

import type { MachineState } from "./perf.types"

/**
 * This machine, as a measurement needs it QUIET:  its load, and a wait for it to fall.
 * - Busy:  a 1-minute load over half the CPU count (9 on an 18-core Mac).
 * - `waitForQuiet()` looks every 30s, for up to so many minutes;  still busy then, the run goes on, marked busy.
 * - Every load it sees is kept (`loadsSeen`):  a run that got busy half way is busy too.
 * - Times move with a busy machine;  bytes, heap, node and listener counts don't.
 */
export class PerfMachine {
  /** the 1-minute load past which the machine is busy */
  readonly busyLoad = os.cpus().length / 2

  /** every 1-minute load seen, from the first look */
  readonly loadsSeen: number[] = []

  /** how long `waitForQuiet()` waited, s */
  waitedSeconds = 0

  /** the 1-minute load now, noted in `loadsSeen` */
  get load(): number {
    const load = +os.loadavg()[0]!.toFixed(2)
    this.loadsSeen.push(load)
    return load
  }

  /** is the machine busy now? */
  get isBusy(): boolean {
    return this.load > this.busyLoad
  }

  /** was it busy at any look? */
  get wasBusy(): boolean {
    return Math.max(0, ...this.loadsSeen) > this.busyLoad
  }

  /** the machine now:  load averages, memory, CPUs */
  get state(): MachineState {
    return {
      load: os.loadavg().map((value) => +value.toFixed(2)),
      freeMemoryGB: +(os.freemem() / 1e9).toFixed(1),
      totalMemoryGB: +(os.totalmem() / 1e9).toFixed(1),
      cpus: os.cpus().length
    }
  }

  /** the CPU's name and the system's, for the record */
  get description(): { model?: string; platform: string } {
    return { model: os.cpus()[0]?.model, platform: `${os.platform()} ${os.release()}` }
  }

  /**
   * Wait until the machine is quiet, or `minutes` have gone by, looking every 30s;  `say()` is told once, as it starts
   * waiting.
   */
  async waitForQuiet(minutes: number, say: (line: string) => void): Promise<void> {
    while (this.isBusy && this.waitedSeconds < minutes * 60) {
      if (this.waitedSeconds === 0) {
        say(
          `The machine is busy (1-minute load ${this.loadsSeen.at(-1)}, over ${this.busyLoad}):  ` +
            `waiting up to ${minutes} minutes for it to quieten ...`
        )
      }
      await sleep(LOOK_EVERY_MS)
      this.waitedSeconds += LOOK_EVERY_MS / 1000
    }
  }
}

/** How often `waitForQuiet()` looks again, ms. */
const LOOK_EVERY_MS = 30_000
