import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { DataFile } from "spell/server/DataFile"
import { Git } from "spell/server/Git"
// By its file, with its `.ts`:  plain `node` loads this file (below)
import { HOME_ENV, HOME_FOLDER } from "spell/epic/server/server.types.ts"

/****************
 * ### `EpicHome`
 * The epic tools' own folder on this machine, and who is at its keyboard:  the ONE place that knows where it is
 * (epic `epic-friend` P1).
 *
 * ```ts
 * EpicHome.folder()            // => "/Users/ana/.spell-epic"
 * EpicHome.subfolder("asks")   // => "/Users/ana/.spell-epic/asks"
 * EpicHome.person()            // => { name: "Ana Lima", source: "git" }
 * EpicHome.keepPerson("Ana")   // => { name: "Ana", source: "kept" }, from now on
 * ```
 *
 * - Where:  `$SPELL_EPIC_HOME`, else `~/.spell-epic` (`folder()`)
 *   - read on every call:  a test sets it to a folder of its own, so no test touches the real one
 *   - what's in it:  the repos the epic server serves (`repos.json5`), its pid file and log, the ask listeners'
 *     heartbeats (`asks/`), the worktree guard's records, ditched files, the window bridges' registry (`windows/`)
 *     ... and the person (`person.json5`)
 *   - before epic `epic-friend` P1, seven classes each spelled the rule out;  two ignored `$SPELL_EPIC_HOME`
 * - The PERSON:  the name this machine's person goes by on the epics (`person()`).
 *   - kept in `person.json5`, `{ name }`, once they've said (`epic whoami <name>`, `epic init`);
 *     else git's own `user.name`;  else none
 *   - the name IS who they are:  no id or email beside it (Owen, 2026-10-29, Q10)
 * - STATIC:  the folder is the machine's.
 * - Its position:  node's own modules, the kit's `DataFile` and `Git` by their own names, and this folder's server
 *   types by path, so plain `node` loads it (the hooks, the window script), types stripped;
 *   NEVER an alias, an `enum` or a parameter property.
 ****************/
export class EpicHome {
  /** The person's file, in the folder. */
  static readonly PERSON_FILE = "person.json5"

  /** The epic tools' folder:  `$SPELL_EPIC_HOME`, else `~/.spell-epic`.  Read on every call:  a test sets it. */
  static folder(): string {
    return process.env[HOME_ENV] || join(homedir(), HOME_FOLDER)
  }

  /** Folder `name` inside it:  `<home>/<name>`.  Not made:  its writer makes it. */
  static subfolder(name: string): string {
    return join(EpicHome.folder(), name)
  }

  /**
   * Who is at the keyboard:  the name kept in `person.json5`, else git's `user.name` as read in `cwd`, else none
   * (`name: undefined`).
   * - `source` says which:  `kept`, `git` or `none`
   * - a file that won't read counts as none kept
   * - NEVER throws
   */
  static person(cwd = process.cwd()): EpicPerson {
    const kept = EpicHome.keptName()
    if (kept) return { name: kept, source: "kept" }
    const fromGit = Git.config("user.name", cwd)
    return fromGit ? { name: fromGit, source: "git" } : { name: undefined, source: "none" }
  }

  /**
   * The name to put on what this machine's person writes (epic `epic-friend` P2):  `person()`'s, else "someone"
   * (`SOMEONE`), so every reply, comment and log line names somebody.
   * - NEVER throws
   */
  static personName(cwd = process.cwd()): string {
    return EpicHome.person(cwd).name ?? EpicHome.SOMEONE
  }

  /** The name on what's written when nobody said who they are and git doesn't know:  "someone". */
  static readonly SOMEONE = "someone"

  /**
   * Keep `name` as this machine's person, in `person.json5`, from now on;  the person as now known.
   * - surrounding spaces dropped
   * - throws a `TypeError` for an empty name
   * - SIDE EFFECT:  makes the folder, and writes the file (a comment Owen added in it stays)
   */
  static keepPerson(name: string): EpicPerson {
    const trimmed = name.trim()
    if (!trimmed) throw new TypeError('EpicHome.keepPerson():  no name given;  pass the name to go by, e.g. "Ana"')
    mkdirSync(EpicHome.folder(), { recursive: true })
    DataFile.edit<PersonFile>(EpicHome.personFile(), (file) => ({ ...file, name: trimmed }))
    return { name: trimmed, source: "kept" }
  }

  /** The person's file:  `<home>/person.json5`. */
  static personFile(): string {
    return join(EpicHome.folder(), EpicHome.PERSON_FILE)
  }

  /** The name kept in the person's file;  `undefined` for none, or a file that won't read. */
  private static keptName(): string | undefined {
    try {
      const name = DataFile.read<PersonFile>(EpicHome.personFile())?.name
      return typeof name === "string" && name.trim() ? name.trim() : undefined
    } catch {
      return undefined
    }
  }
}

/** Who is at the keyboard, and where the name came from:  `EpicHome.person()`. */
export type EpicPerson = {
  /** the name they go by;  `undefined` when nobody said and git doesn't know */
  name: string | undefined
  /** where it came from:  kept in the epic home, git's `user.name`, or neither */
  source: PersonSource
}

/** Where a person's name came from:  `kept` (`epic whoami <name>`, `epic init`), `git`, or `none`. */
export type PersonSource = "kept" | "git" | "none"

/** `person.json5`'s shape. */
type PersonFile = {
  /** the name they go by */
  name?: string
}
