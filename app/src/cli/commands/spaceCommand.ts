import { CLI } from "spell/cli"
import { SP } from "spell/parser/spell"
import { HOME_ORG, LOCAL_PERSON } from "spell/app/spaces/models/projectGroups"
import environment from "spell/app/spaces/server/node/environment"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceBackups } from "spell/app/spaces/server/node/places/SpaceBackups"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { SpaceMembers } from "spell/app/spaces/server/node/places/SpaceMembers"
import { folderForPlace } from "spell/app/spaces/server/node/projects/project-utils"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/**
 * `spell space backup now | list | status | restore <space>` (epic `atmosphere` P7):
 * every space's nightly copies, on the machine Spell runs on (`SpaceBackups`).
 * - `now`:  a backup at once, the oldest past a week let go
 * - `list`:  every backup, newest first
 * - `status`:  where they go, the newest, and any night missed;  exits 1 for a missed night, or none ever made
 * - `restore <space> [--from <backup>]`:  one space's folder, or a person's whole space, back as the backup had it
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 */
export async function backupCommand(verb: string, target: string | undefined, options: BackupOptions): Promise<number> {
  const backups = new SpaceBackups()
  if (verb === "now") {
    console.log(`Backed up every space:  ${backups.backupsDir}/${await backups.backUp()}`)
    return 0
  }
  if (verb === "list") {
    const names = await backups.list()
    if (!names.length) console.log(`No backups yet in ${backups.backupsDir}.`)
    for (const name of names) console.log(name)
    return 0
  }
  if (verb === "status") {
    const { newest, missedNights, count } = await backups.status()
    const where = process.env.SPELL_BACKUPS_DIR ? "" : " (this disk:  name a second one with SPELL_BACKUPS_DIR)"
    console.log(`Backups go to ${backups.backupsDir}${where}.`)
    if (!newest) {
      console.log("None made yet:  the main checkout's page server makes one each night, or `spell space backup now`.")
      return 1
    }
    console.log(`${count} kept;  the newest is ${newest}.`)
    if (missedNights) console.log(`Missed:  ${missedNights === 1 ? "a night" : `${missedNights} nights`} since.`)
    return missedNights ? 1 : 0
  }
  if (!target) throw new CLI.CliError("say which space to bring back:  @family/cookbook, or ana@spell")
  try {
    const from = await backups.restore(target, options.from ? { from: options.from } : {})
    console.log(`Brought ${target} back as backup ${from} had it.`)
    return 0
  } catch (error) {
    if (error instanceof TypeError) throw new CLI.CliError(error.message.replace(/^SpaceBackups\.restore\(\):\s+/, ""))
    throw error
  }
}

/** Options of `spell space backup restore`. */
export type BackupOptions = {
  /** Which backup:  its name, `2026-11-04-0312`;  default the newest. */
  from?: string
}

/**
 * `spell space export <space> <folder>` (epic `atmosphere` P7):
 * a space, as a folder of plain JSON anyone can take away (`SpaceExport`).
 * - With a note on running a program on it, and on leaving Spell with its id.
 * - The same as a member's download, `/api/exports/spaces/<space>`, run as this machine's own code:
 *   what Spell took down is left out.
 */
export async function exportCommand(space: string, folder: string): Promise<number> {
  const folders = new SpaceFolders()
  try {
    const out = await folders.exportOf(space, undefined)
    await out.writeTo(folder)
    console.log(`Exported ${space} into ${folder}:  ${out.files.length} files, plain JSON.`)
    console.log(`A program runs on it with one line:  ... is a data folder at "./${folder.split("/").pop()}"`)
    return 0
  } finally {
    folders.close()
    folders.takedowns.close()
  }
}

/**
 * `spell space delete <space | account> --yes` (epic `atmosphere` P7):  deleting, for good.
 * - A space's folder (`@family/cookbook`):  every file of it, its members and settings too,
 *   as its admins' `deleteSpace` does.
 *   - Who may:  this machine's person, if they're one of its admins, or a Spell admin.
 * - An account (`ana@spell`):  their own space, every folder of it, and their membership of every org.
 *   - Who may:  that person, on this machine, or a Spell admin.
 * - Either way Spell's takedown log stays, so what it took down stays down.
 * - The backups still hold it until they age out, a week later (`BACKUPS_KEPT`).
 */
export async function deleteCommand(target: string, { yes }: DeleteOptions): Promise<number> {
  if (!yes) throw new CLI.CliError(`deleting ${target} is for good:  say so with --yes`)
  const people = new PeopleStore(new DiskStorage(environment.spellSpacesDir))
  const me = `${LOCAL_PERSON}@${HOME_ORG}`
  const isSpellAdmin = await people.isSpellAdmin(LOCAL_PERSON, HOME_ORG)
  const account = SP.SpellLocation.accountParts(target)
  if (account) {
    if (target !== me && !isSpellAdmin) throw new CLI.CliError(`only ${target}, or a Spell admin, deletes ${target}`)
    const { person } = await people.person(account.id, account.org)
    if (!person) throw new CLI.CliError(`there's no account ${target} here`)
    for (const { id: orgId } of await people.rolesOf(person)) {
      const each = await people.org(orgId)
      if (each) await people.removeMembership(each, person)
    }
    await membersOf(target, people).deleteSpace()
    console.log(`Deleted the account ${target}:  their space, and their place in every org.`)
    return 0
  }
  if (!target.includes("/")) {
    throw new CLI.CliError(`"${target}" is neither a space's folder (@family/cookbook) nor an account (ana@spell)`)
  }
  const members = membersOf(target, people)
  if (!isSpellAdmin && !(await members.memberOf(me))?.canManage) {
    throw new CLI.CliError(`only an admin of ${members.spaceId}, or a Spell admin, deletes ${target}:  ${me} isn't`)
  }
  await members.deleteSpace()
  console.log(`Deleted the space ${target}.  The backups keep it for a week, then it's gone from them too.`)
  return 0
}

/** Options of `spell space delete`. */
export type DeleteOptions = {
  /** Yes, for good. */
  yes?: boolean
}

/** Who's in the space at `address`, on its folder on disk.  - throws `CliError` for an address with no folder */
function membersOf(address: string, people: PeopleStore): SpaceMembers {
  let folder: string
  try {
    folder = folderForPlace(address)
  } catch {
    throw new CLI.CliError(`${address} has no folder here`)
  }
  return new SpaceMembers({ address, storage: new DiskStorage(folder), people })
}
