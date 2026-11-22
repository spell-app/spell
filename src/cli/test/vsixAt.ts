import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

/**
 * A made-up VS Code extension's package at `file`, its own `extension/package.json` at `version`, zipped as vsce does.
 * - For tests only.
 */
export function vsixAt(file: string, version: string): string {
  const folder = mkdtempSync(join(tmpdir(), "vsix-"))
  try {
    mkdirSync(join(folder, "extension"))
    writeFileSync(join(folder, "extension", "package.json"), JSON.stringify({ name: "spell-epic", version }))
    mkdirSync(dirname(file), { recursive: true })
    rmSync(file, { force: true })
    execFileSync("zip", ["-q", "-r", file, "extension"], { cwd: folder })
    return file
  } finally {
    rmSync(folder, { recursive: true, force: true })
  }
}
