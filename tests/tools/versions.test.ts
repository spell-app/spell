import { readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { expect, test } from "vite-plus/test"

import { kitFolders } from "spell/server/kitFolders"

/**
 * ONE version for everything the kit releases:  its `package.json`'s.
 * - A bump is by hand, every manifest in one commit;  this names any it left behind
 *   (the epic extension sat at 0.3.0 until epic `epic-engine` T140).
 */

/** the kit's root:  `tests/tools/` is two folders down */
const KIT = join(import.meta.dirname, "..", "..")
/** the manifests that follow the kit's version, beside each folder's `package.json` */
const FOLLOWERS = [
  "app/vscode/package.json",
  "epic/vscode/package.json",
  "epic/.claude-plugin/plugin.json",
  "epic/.codex-plugin/plugin.json"
]

/** The `version` in JSON file `file`, from the kit's root. */
function versionIn(file: string): string | undefined {
  return (JSON.parse(readFileSync(join(KIT, file), "utf8")) as { version?: string }).version
}

const folders = kitFolders(KIT).map((folder) => join(relative(KIT, folder), "package.json"))

test.each([...folders, ...FOLLOWERS])("%s is at the kit's version", (file) => {
  expect(versionIn(file)).toBe(versionIn("package.json"))
})
