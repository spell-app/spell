import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/** Every folder a test made, to remove when it's done. */
const folders: string[] = []

/** A new empty folder, for one test. */
export function newFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "spell-places-"))
  folders.push(folder)
  return folder
}

/** Remove them all:  in an `afterEach`. */
export function removeFolders(): void {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true })
}
