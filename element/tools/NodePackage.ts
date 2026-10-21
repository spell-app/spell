/// <reference types="node" />

import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

/****************
 * ### `NodePackage`
 * Finds an installed npm package the way Node does:  `node_modules/<name>` in this folder, then every parent.
 * - Why:  yarn hoists to the install's root (the kit), so `<repo>/node_modules/<name>` usually doesn't exist, and
 *   sometimes does (a second version).  NEVER hardcode that path;  ask here.
 * - Lookups start in the current folder (a yarn script's:  its package's), or `from`.
 * - Reads `package.json` directly, so it works for packages whose `exports` hide it.
 * - STATIC and instance-free:  a lookup, no state.  Node built-ins only, so any tool or script imports it.
 ****************/
export class NodePackage {
  /** Absolute folder of installed `name`, or `undefined` when no `node_modules` from `from` upward holds it. */
  static dir(name: string, from: string = process.cwd()): string | undefined {
    for (let folder = from.replace(/\/$/, ""); ; folder = dirname(folder)) {
      const candidate = join(folder, "node_modules", name)
      if (existsSync(join(candidate, "package.json"))) return candidate
      if (dirname(folder) === folder) return undefined
    }
  }

  /**
   * Like `dir()`, but throws when `name` isn't installed.
   * - RENAME:  `dirOrDie()` (WWOD §10 › "`...OrDie` throwing twins");  callers in `scripts/` and `tools/visual/`.
   */
  static need(name: string, from?: string): string {
    const dir = NodePackage.dir(name, from)
    if (!dir) {
      throw new Error(
        `NodePackage.need():  ${name} isn't installed (no node_modules above ${from ?? process.cwd()} has it);  ` +
          "run `yarn install`"
      )
    }
    return dir
  }

  /** Installed version of `name`, or `undefined` when missing. */
  static version(name: string, from?: string): string | undefined {
    const dir = NodePackage.dir(name, from)
    if (!dir) return undefined
    return (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { version: string }).version
  }
}
