import { CLI } from "spell/cli"
import { HOME_ORG, LOCAL_PERSON } from "spell/app/spaces/models/projectGroups"
import environment from "spell/app/spaces/server/node/environment"
import { PeopleStore, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import {
  Takedowns,
  type TakedownAction,
  type TakedownEntry,
  type TakedownTarget
} from "spell/app/spaces/server/node/places/Takedowns"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** What a person's address looks like, an account:  `ana@spell`, no `/`. */
const ACCOUNT = /^[^@/\s]+@[^@/\s]+$/

/**
 * `spell app takedown hide | delete | restore | list <target>` (epic `atmosphere` P6, Q7 A):  Spell taking down
 * what it hosts, for Spell's admins, each with a reason, logged beside it (`Takedowns`).
 * - The target:
 *   - a space's folder, `@family/cookbook`;  with `--record recipes/r-1`, one thing of it
 *   - an account, `ana@spell`
 * - `hide <target> --reason "..."`:  neither read nor written, through Spell's server or read direct;  its files stay
 * - `delete <target> --reason "..."`:  hidden, and its files removed;  not an account (hide it instead)
 * - `restore <target> --reason "..."`:  back as it was, what wasn't deleted
 * - `list <target>`:  the log of that folder (an account's:  their own space's), oldest first
 * - Who may:  this machine's person, if they're a Spell admin (`spell-admin` in Spell's own org).
 * - A running page server sees it at once:  it reads the log for every request.
 * - Node only;  loads spaces' node side alone (no `loadApp()`):  nothing here compiles.
 */
export async function takedownCommand(verb: string, target: string, options: TakedownOptions): Promise<number> {
  const takedowns = new Takedowns()
  try {
    const what = targetFor(target, options.record)
    if (verb === "list") {
      const log = await takedowns.log(what.kind === "account" ? what.person : what.space)
      if (!log.length) console.log(`Nothing was ever taken down in ${target}.`)
      for (const entry of log) console.log(describeEntry(entry))
      return 0
    }
    const people = new PeopleStore(new DiskStorage(environment.spellSpacesDir))
    const by = await spellAdminOrDie(people)
    if (what.kind === "account") await accountOrDie(people, what.person)
    if (!options.reason?.trim()) throw new CLI.CliError(`say why, for the log:  --reason "..."`)
    const entry = await takedowns.take(verb as TakedownAction, what, { by, reason: options.reason })
    console.log(describeEntry(entry))
    if (verb !== "restore") console.log(`People who ask are told to write to ${takedowns.contact}.`)
    return 0
  } catch (error) {
    if (error instanceof TypeError) throw new CLI.CliError(error.message)
    throw error
  } finally {
    takedowns.close()
  }
}

/** Options of `spell app takedown`. */
export type TakedownOptions = {
  /** One thing of the space:  `recipes/r-1`, its collection and id. */
  record?: string
  /** Why, for the log. */
  reason?: string
}

/** What `target` and `--record` name.  - throws `CliError` for one that names nothing */
function targetFor(target: string, record: string | undefined): TakedownTarget {
  if (ACCOUNT.test(target)) {
    if (record) throw new CLI.CliError(`${target} is an account:  --record is for a space's thing`)
    return { kind: "account", person: target }
  }
  if (!target.includes("/")) {
    throw new CLI.CliError(`"${target}" is neither a space's folder (@family/cookbook) nor an account (ana@spell)`)
  }
  if (!record) return { kind: "space", space: target }
  const slash = record.indexOf("/")
  if (slash < 1 || slash === record.length - 1) {
    throw new CLI.CliError(`--record names a collection and an id:  recipes/r-1`)
  }
  return { kind: "record", space: target, collection: record.slice(0, slash), id: record.slice(slash + 1) }
}

/** This machine's person, if they're a Spell admin.  - throws `CliError` if they aren't */
async function spellAdminOrDie(people: PeopleStore): Promise<string> {
  const me = `${LOCAL_PERSON}@${HOME_ORG}`
  if (!(await people.isSpellAdmin(LOCAL_PERSON, HOME_ORG))) {
    throw new CLI.CliError(`only a Spell admin takes things down:  ${me} isn't spell-admin in @${HOME_ORG}`)
  }
  return me
}

/** - throws `CliError` for an account nobody has:  a takedown of it would make its folder */
async function accountOrDie(people: PeopleStore, person: string): Promise<void> {
  const [id = "", org] = person.split("@")
  if ((await people.storage.read(personFile(id, org!))) === undefined) {
    throw new CLI.CliError(`there's no account ${person} here`)
  }
}

/** One log entry, on one line:  `2026-11-04T... hide "recipes" r-1 of @family/cookbook, by owen@spell:  doxxing`. */
function describeEntry(entry: TakedownEntry): string {
  const what =
    entry.kind === "record"
      ? `"${entry.collection}" ${entry.id} of ${entry.space}`
      : entry.kind === "space"
        ? `the space ${entry.space}`
        : `the account ${entry.person}`
  return `${entry.at}  ${entry.action} ${what}, by ${entry.by}:  ${entry.reason}`
}
