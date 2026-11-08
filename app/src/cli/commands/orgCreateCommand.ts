import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import environment from "spell/app/spaces/server/node/environment"
import { OrgSetup } from "spell/app/spaces/server/node/people/OrgSetup"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { SpellCloud } from "spell/app/spaces/server/node/routes/SpellCloud"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/**
 * `spell space org create <org> --name "RS" --admin ana@example.org [--admin ...] [--team "Events Team" ...]`
 * (epic `atmosphere` P35, Q29):  an org set up on Spell's own server, in one go (`OrgSetup`).
 * - Its file, its Admin space, its first Admins (the first its first Board), its teams, its paired spaces' folders.
 * - Run again, it says what's there already, and makes only what's missing.
 * - Each first Admin's invite:  the running cloud's own (`spell space cloud invite`), so its mail goes out
 *   (to the cloud's mail catcher until P18);  without a running cloud, the command to send it later.
 * - Who may:  this machine's person, who runs Spell's server.
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 */
export async function orgCreateCommand(org: string, options: OrgCreateOptions): Promise<number> {
  const storage = new DiskStorage(environment.spellSpacesDir)
  const people = new PeopleStore(storage)
  const folders = new SpaceFolders({ people })
  try {
    const setup = new OrgSetup({ people, roles: folders.orgRoles })
    const report = await setup.create({
      org,
      name: options.name,
      admins: options.admin ?? [],
      teams: options.team ?? []
    })
    console.log(report.made.length ? `Set up @${report.org}:` : `@${report.org} is set up already:  nothing made.`)
    for (const line of report.made) console.log(`  made:  ${line}`)
    for (const line of report.already) console.log(`  already there:  ${line}`)
    if (report.spaces?.length) console.log(`  its spaces:  ${report.spaces.join(", ")}`)
    await inviteAll(report.admins.map((each) => each.email))
    console.log(`\nStill to do:`)
    for (const line of report.next) console.log(`  ${line}`)
    console.log(
      `  its Admin page:  the built-in program Org Admin, its first line naming "@${report.org}/__admin/roles"`
    )
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

/** Options of `spell space org create`. */
export type OrgCreateOptions = {
  /** What people call it:  "RS". */
  name?: string
  /** Its first Admins, by email. */
  admin?: string[]
  /** Its standing teams, by name. */
  team?: string[]
}

/** Each first Admin's invite mail, through the running cloud;  without one, how to send it.  NEVER throws. */
async function inviteAll(emails: string[]): Promise<void> {
  const record = SpellCloud.record()
  for (const email of emails) {
    if (!record) {
      console.log(`  ${email}'s invite:  once Spell's cloud runs, spell space cloud invite ${email}`)
      continue
    }
    try {
      const response = await fetch(`http://127.0.0.1:${record.port}/api/sign-in/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-server-token": record.token },
        body: JSON.stringify({ email })
      })
      if (!response.ok) throw new Error(`the cloud answered ${response.status}`)
      console.log(`  ${email}'s invite:  sent, in spell space cloud mail ${email}`)
    } catch (error) {
      console.error(`  ${email}'s invite didn't go (${(error as Error).message}):  spell space cloud invite ${email}`)
    }
  }
}
