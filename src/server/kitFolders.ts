import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

/**
 * The kit's folders that are there, lowest first, absolute:  its `package.json`'s `workspaces` (epic `repo-split`
 * P20:  `parser`, `ui`, `epic`, `app`), each a folder of the ONE package `spell` with a `package.json` of its own (its
 * scripts and settings);  none when the kit lists none.
 * - The PUBLISHED `spell` has no `workspaces` (npm's word for a checkout's packages):  its `"spell": { "folders" }`
 *   says the same (`spell publish`), each folder's `package.json` holding its commands.
 * - NEVER throws:  an unreadable `package.json` lists none
 * - Node built-ins only:  plain `node` loads it (`tools/repos.ts`), and so does the `spell` command's lean barrel
 */
export function kitFolders(kit: string): string[] {
  let folders: unknown
  try {
    const manifest = JSON.parse(readFileSync(join(kit, "package.json"), "utf8")) as {
      workspaces?: unknown
      spell?: { folders?: unknown }
    }
    folders = manifest.workspaces ?? manifest.spell?.folders
  } catch {
    return []
  }
  if (!Array.isArray(folders)) return []
  return folders
    .filter((folder): folder is string => typeof folder === "string" && !folder.includes("*"))
    .map((folder) => join(kit, folder))
    .filter((dir) => existsSync(join(dir, "package.json")))
}
