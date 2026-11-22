import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"

////////////////
// ## A VS Code extension's package (`.vsix`)
////////////////

/**
 * The version inside `.vsix` file `vsix`:  its own `extension/package.json`'s, the one word on which build it is
 * (epic `epic-engine` I353).
 * - Read with `unzip -p` (macOS and Linux have it):  the kit has no zip reader of its own outside the app folder.
 * - throws if it can't be read
 */
export function vsixVersion(vsix: string): string | undefined {
  const manifest = execFileSync("unzip", ["-p", vsix, "extension/package.json"], { encoding: "utf8", stdio: "pipe" })
  return (JSON.parse(manifest) as { version?: string }).version
}

/**
 * Whether `vsix` is another version's build than `version`, its source's:  built before the last bump.
 * - Each bump makes every built one stale (epic `epic-engine` T140), so ask before installing one.
 * - one that's missing or can't be read isn't stale:  nothing says which build it is
 * - NEVER throws
 */
export function vsixIsStale(vsix: string, version: string | undefined): boolean {
  if (!version || !existsSync(vsix)) return false
  try {
    const built = vsixVersion(vsix)
    return !!built && built !== version
  } catch {
    return false
  }
}
