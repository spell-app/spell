import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { DataFile } from "spell/server/DataFile"
import { Git } from "spell/server/Git"
// By its file, with its `.ts`:  plain `node` loads this file (below)
import { HOME_ENV, HOME_FOLDER } from "spell/epic/server/server.types.ts"
import { GitHub } from "./GitHub.ts"

/****************
 * ### `EpicHome`
 * The epic tools' own folder on this machine, and who is at its keyboard:  the ONE place that knows where it is
 * (epic `epic-friend` P1).
 *
 * ```ts
 * EpicHome.folder()            // => "/Users/ana/.spell-epic"
 * EpicHome.subfolder("asks")   // => "/Users/ana/.spell-epic/asks"
 * EpicHome.person()            // => { name: "analima", source: "github", fullName: "Ana Lima", github: "analima" }
 * EpicHome.keepPerson("Ana")   // => { name: "Ana", source: "kept", ... }, from now on
 * EpicHome.refreshGithub()     // => "analima", looked up with `gh` and kept
 * ```
 *
 * - Where:  `$SPELL_EPIC_HOME`, else `~/.spell-epic` (`folder()`)
 *   - read on every call:  a test sets it to a folder of its own, so no test touches the real one
 *   - what's in it:  the repos the epic server serves (`repos.json5`), its pid file and log, the ask listeners'
 *     heartbeats (`asks/`), the worktree guard's records, ditched files, the window bridges' registry (`windows/`)
 *     ... and the person (`person.json5`)
 *   - before epic `epic-friend` P1, seven classes each spelled the rule out;  two ignored `$SPELL_EPIC_HOME`
 * - The PERSON (`person()`):  their SHORT NAME, the one stamped on everything they write and the name that IS who they
 *   are (Owen, 2026-10-29, Q10:  no id or email beside it), and their full name
 *   - the short name:  kept in `person.json5` (`{ name }`) once they've said (`epic whoami <name>`, `epic init`);
 *     else their GitHub login;  else git's own `user.name`;  else none
 *     (Owen, 2026-10-29:  "Default to gh username as 'short name' for the person")
 *   - the full name:  git's `user.name`
 *   - the GitHub login:  `gh api user -q .login`, looked up ONLY by `refreshGithub()` (`epic whoami`, `epic init`)
 *     and kept in `person.json5` as `github`, so serving a page or running a hook never runs `gh`
 * - STATIC:  the folder is the machine's.
 * - Its position:  node's own modules, the kit's `DataFile` and `Git` by their own names, this folder's server
 *   types and its peer `GitHub` (the one `gh` runner) by path,
 *   so plain `node` loads it (the hooks, the window script), types stripped;
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
    const { name: kept, github } = EpicHome.keptFile()
    const fullName = Git.config("user.name", cwd)
    const known = { ...(fullName && { fullName }), ...(github && { github }) }
    if (kept) return { name: kept, source: "kept", ...known }
    if (github) return { name: github, source: "github", ...known }
    if (fullName) return { name: fullName, source: "git", ...known }
    return { name: undefined, source: "none" }
  }

  /**
   * Look up this machine's GitHub login (`gh api user -q .login`) and keep it in `person.json5` as `github`;  the
   * login, or `undefined` when gh is missing, logged out or offline (the one kept before stays, then).
   * - `command`:  the `gh` to run;  default `$SPELL_EPIC_GH`, else `gh` (`GitHub.command()`:  a test names a
   *   stand-in, or none)
   * - a few seconds at most (`GitHub`'s limit);  NEVER throws
   * - SIDE EFFECT:  writes the file when the login is new
   */
  static refreshGithub(command = GitHub.command()): string | undefined {
    const login = GitHub.login(command)
    if (!login) return EpicHome.keptFile().github
    if (login !== EpicHome.keptFile().github) {
      try {
        mkdirSync(EpicHome.folder(), { recursive: true })
        DataFile.edit<PersonFile>(EpicHome.personFile(), (file) => ({ ...file, github: login }))
      } catch (error) {
        console.error(`EpicHome.refreshGithub():  couldn't keep the GitHub login ${login}:`, error)
      }
    }
    return login
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
    return EpicHome.person()
  }

  /** The person's file:  `<home>/person.json5`. */
  static personFile(): string {
    return join(EpicHome.folder(), EpicHome.PERSON_FILE)
  }

  /** What the person's file keeps, its names trimmed;  `{}` for none, or a file that won't read. */
  private static keptFile(): PersonFile {
    try {
      const { name, github } = DataFile.read<PersonFile>(EpicHome.personFile()) ?? {}
      return {
        ...(typeof name === "string" && name.trim() && { name: name.trim() }),
        ...(typeof github === "string" && GitHub.isLogin(github.trim()) && { github: github.trim() })
      }
    } catch {
      return {}
    }
  }
}

/** Who is at the keyboard, and where the name came from:  `EpicHome.person()`. */
export type EpicPerson = {
  /** their SHORT NAME, the one on what they write;  `undefined` when nobody said and neither GitHub nor git knows */
  name: string | undefined
  /** where it came from:  kept in the epic home, their GitHub login, git's `user.name`, or none */
  source: PersonSource
  /** their full name:  git's `user.name` */
  fullName?: string
  /** their GitHub login, as last looked up (`refreshGithub()`) */
  github?: string
}

/**
 * Where a person's short name came from:  `kept` (`epic whoami <name>`, `epic init`), `github` (their login), `git`
 * (`user.name`), or `none`.
 */
export type PersonSource = "kept" | "github" | "git" | "none"

/** `person.json5`'s shape. */
type PersonFile = {
  /** the short name they said they go by */
  name?: string
  /** their GitHub login, as `refreshGithub()` last found it */
  github?: string
}
