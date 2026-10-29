import { symlinkSync } from "node:fs"
import { dirname, resolve } from "node:path"

/****************
 * ### `Links`
 * Making a link the same way on macOS, Linux and Windows (epic `epic-friend` P15).
 *
 * ```ts
 * Links.folder(at, target)    // a folder link:  a junction on Windows, which needs no special rights
 * Links.file(at, target)      // a file link:  on Windows only with Developer Mode on, else a `LinkError` saying so
 * ```
 *
 * - Why:  Windows makes a symbolic link only for an administrator, or with Developer Mode on;  a folder can always be
 *   a JUNCTION instead, which every reader follows the same, but a file has no such fallback
 *   - a junction's target must be absolute:  a relative one is made absolute from the link's own folder
 * - `platform` is handed in by the tests (`process.platform` otherwise)
 * - Its position:  imports only node's own modules, so plain `node` loads it by its own name, `spell/server/Links`,
 *   types stripped (an entry of its own in the kit's `exports`:  spell-epic's hooks and `SessionFolders`)
 ****************/
export class Links {
  /**
   * Make `at` a link to the folder `target` (relative to `at`'s folder, or absolute).
   * - SIDE EFFECT:  writes the link;  throws as `symlinkSync()` does (`at` already there ...)
   */
  static folder(at: string, target: string, platform: NodeJS.Platform = process.platform): void {
    if (platform === "win32") symlinkSync(resolve(dirname(at), target), at, "junction")
    else symlinkSync(target, at, "dir")
  }

  /**
   * Make `at` a link to the file `target`.
   * - Windows without Developer Mode (or an administrator):  throws a `LinkError` whose message says how to turn it on
   * - SIDE EFFECT:  writes the link
   */
  static file(at: string, target: string, platform: NodeJS.Platform = process.platform): void {
    try {
      symlinkSync(target, at, "file")
    } catch (error) {
      if (platform === "win32" && (error as NodeJS.ErrnoException).code === "EPERM")
        throw new LinkError(`can't link ${at} to ${target}:  ${DEVELOPER_MODE}`, { cause: { at, target } })
      throw error
    }
  }
}

/** Thrown by `Links.file()` on Windows when file links aren't allowed;  `cause` names the link. */
export class LinkError extends Error {
  declare cause: { at: string; target: string } | undefined
}
LinkError.prototype.name = "LinkError"

/** How to let Windows make file links, in one line. */
export const DEVELOPER_MODE =
  "Windows makes file links only with Developer Mode on (Settings, System, For developers, Developer Mode)"
