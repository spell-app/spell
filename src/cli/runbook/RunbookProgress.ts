import { chmodSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { readJSON5File } from "spell/util/node/json5"

import { RUNBOOK_PROGRESS_SETTING, type RunbookRecord } from "./runbook.types"

/****************
 * ### `RunbookProgress`
 * Where each runbook's walk got to, kept on this machine by the runbook's name:  so the next `spell runbook start`
 * carries on from there.
 * - One file a runbook, `~/.spell/runbooks/<name>.json5`, private (mode 600), as the secrets and sign-ins are.
 * - NEVER a secret:  a secret value goes to `SRV.Secrets`;  only plain values are kept here (`RunbookRecord.values`).
 ****************/
export class RunbookProgress {
  /** the folder the walks are kept in */
  readonly folder: string

  constructor({ folder }: { folder?: string } = {}) {
    this.folder = folder ?? process.env[RUNBOOK_PROGRESS_SETTING] ?? join(homedir(), ".spell", "runbooks")
  }

  /** The file `name`'s walk is kept in. */
  fileOf(name: string): string {
    return join(this.folder, `${name}.json5`)
  }

  /** `name`'s walk;  `undefined` when it never started, or was reset.  - throws `SyntaxError` for a file that won't read */
  read(name: string): RunbookRecord | undefined {
    const file = this.fileOf(name)
    return existsSync(file) ? readJSON5File<RunbookRecord>(file) : undefined
  }

  /** SIDE EFFECT:  keeps `record` as `name`'s walk, replacing what was;  written beside and moved in. */
  save(name: string, record: RunbookRecord): void {
    mkdirSync(this.folder, { recursive: true, mode: PRIVATE_FOLDER })
    chmodSync(this.folder, PRIVATE_FOLDER)
    const file = this.fileOf(name)
    const writing = `${file}.${process.pid}.writing`
    writeFileSync(writing, `${JSON.stringify(record, null, 2)}\n`, { mode: PRIVATE_FILE })
    renameSync(writing, file)
  }

  /** SIDE EFFECT:  `name`'s walk is forgotten;  whether there was one. */
  forget(name: string): boolean {
    const file = this.fileOf(name)
    if (!existsSync(file)) return false
    rmSync(file)
    return true
  }
}

/** Only this person, on this machine. */
const PRIVATE_FILE = 0o600

/** Only this person, on this machine. */
const PRIVATE_FOLDER = 0o700
