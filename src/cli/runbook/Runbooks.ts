import { existsSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"

import { suggest } from "spell/util/string"
// By file:  the server's barrel would load linkedom, which finding a file never needs
import { contentFolderOf } from "spell/server/contentFolder"
import { kitFolders } from "spell/server/kitFolders"
import { CLI } from "spell/cli"

import { Runbook } from "./Runbook"
import { RUNBOOK_EXTENSION, RUNBOOKS_FOLDER } from "./runbook.types"

/****************
 * ### `Runbooks`
 * Every runbook a checkout has, found by name:  `spell runbook start netbox-demo`.
 * - Where they're looked for, in order:
 *   - the kit's `runbooks/`, then each of its folders' (`parser/runbooks/` ...)
 *   - each epic's in the epic folder:  `epics/<epic>/runbooks/`
 * - A path to a file works too, wherever it is.
 ****************/
export class Runbooks {
  /** the checkout they're found in */
  readonly checkout: string

  constructor(checkout = CLI.findCheckout(CLI.KIT_MARKER)) {
    this.checkout = checkout
  }

  /** The folders runbooks are looked for in, that are there. */
  folders(): string[] {
    const content = contentFolderOf(this.checkout)
    const epics = content ? join(content, "epics") : undefined
    const epicFolders = epics && existsSync(epics) ? readdirSync(epics).map((epic) => join(epics, epic)) : []
    return [this.checkout, ...kitFolders(this.checkout), ...epicFolders]
      .map((folder) => join(folder, RUNBOOKS_FOLDER))
      .filter((folder) => existsSync(folder))
  }

  /** Every runbook's file, absolute, in the folders' order. */
  files(): string[] {
    return this.folders().flatMap((folder) =>
      readdirSync(folder)
        .filter((file) => file.endsWith(RUNBOOK_EXTENSION))
        .sort()
        .map((file) => join(folder, file))
    )
  }

  /**
   * The runbook `nameOrPath` names:  a file's path, else a runbook's name.
   * - throws `CliError` when there's none, naming a close one when there is
   */
  find(nameOrPath: string): string {
    const path = resolve(nameOrPath)
    if (existsSync(path) && !nameOrPath.endsWith("/")) return path
    const name = Runbook.nameOf(nameOrPath)
    const files = this.files()
    const found = files.find((file) => Runbook.nameOf(file) === name)
    if (found) return found
    const close = suggest(
      name,
      files.map((file) => Runbook.nameOf(file))
    )
    throw new CLI.CliError(
      [
        `There's no runbook called ${name}.`,
        close ? `Did you mean ${close}?` : "",
        `To see them all, type:  spell runbook list`
      ]
        .filter(Boolean)
        .join("\n")
    )
  }
}
