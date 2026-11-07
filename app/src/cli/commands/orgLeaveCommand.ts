import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import environment from "spell/app/spaces/server/node/environment"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { spellAdminOrDie } from "spell/app/cli/commands/takedownCommand"

/**
 * `spell space org leave <org> <who> [--to <space>] [--reason "..."]` (epic `atmosphere` P28):
 * someone leaving an org, and their own space in it offered to them.
 * - They leave:  every term they hold ended, off every list at once, logged (`OrgRoles.leave()`, P24).
 * - Their own space in the org (`ana@rs`, "About me", "Services I offer") stays theirs alone:  nobody else in the org
 *   reads it once they've left (`SpaceMembers`).
 *   - `--to ana@spell/from-rs`:  copied into another space of theirs (`SpaceFolders.takeOwnSpace()`)
 *   - else:  what's in it, and the two ways to take it:  that, or as files (`spell space export`)
 * - Never anything from a private space or an inbox, nor the org's pages, sheets or files:  those are the org's.
 * - Who may:  this machine's person, if they're a Spell admin, as `codes` and `recover`.
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 */
export async function orgLeaveCommand(org: string, who: string, { to, reason }: OrgLeaveOptions): Promise<number> {
  const storage = new DiskStorage(environment.spellSpacesDir)
  const people = new PeopleStore(storage)
  const folders = new SpaceFolders({ people })
  org = org.replace(/^@/, "")
  try {
    await spellAdminOrDie(people, "takes someone out of an org")
    // copied first:  a space of theirs that can't take it leaves them in the org, nothing changed
    const copied = to === undefined ? undefined : await folders.takeOwnSpace(who, to)
    if (await folders.orgRoles.isInOrg(org, who)) {
      // Spell's own tools, trusted:  the log says `spell`
      await folders.orgRoles.leave(org, who, { ...(reason !== undefined && { why: reason }) })
      console.log(`${who} has left @${org}:  every term they held ended, and they're off every list.`)
    } else console.log(`${who} isn't in @${org} (any more).`)
    if (copied) {
      console.log(
        `Copied their own space, ${who}, into ${to}:  ${copied.length ? copied.join(", ") : "nothing in it"}.`
      )
      return 0
    }
    const contents = await folders.ownSpaceContents(who)
    if (!contents.length) {
      console.log(`Their own space in @${org}, ${who}, holds nothing to take.`)
      return 0
    }
    const id = who.split("@")[0]
    console.log(`Their own space, ${who}, is theirs alone now, to take:  ${contents.join(", ")}.`)
    console.log(`  - into another space of theirs:  spell space org leave ${org} ${who} --to ${id}@spell/from-${org}`)
    console.log(`  - as files:  spell space export ${who}/<folder> <folder on disk>, for each`)
    return 0
  } catch (error) {
    if (error instanceof SRV.HttpError) throw new CLI.CliError(error.message)
    throw error
  } finally {
    folders.close()
    folders.takedowns.close()
    storage.close()
  }
}

/** Options of `spell space org leave`. */
export type OrgLeaveOptions = {
  /** Another space of theirs to copy their own space into:  `ana@spell/from-rs`. */
  to?: string
  /** Why, for the org's log. */
  reason?: string
}
