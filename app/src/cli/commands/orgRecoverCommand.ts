import { CLI } from "spell/cli"
import { SRV } from "spell/server"
import environment from "spell/app/spaces/server/node/environment"
import { OrgRecovery } from "spell/app/spaces/server/node/people/OrgRecovery"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { spellAdminOrDie } from "spell/app/cli/commands/takedownCommand"

/**
 * `spell space org codes | recover <org>` (epic `atmosphere` P21, Q15 A):
 * an org's recovery codes, and its Board taking it back with them (`OrgRecovery`).
 * - `codes <org>`:  who holds a part of its codes, and how many a recovery takes
 * - `codes <org> <holder...> [--needed 2]`:  new codes, a part for each holder, printed ONCE to hand over;
 *   the old ones stop working
 * - `recover <org> --part <code> --part <code> --board <who> [--admin <who>] --reason "..."`:
 *   the org taken back, its Board and Admins named anew, the codes spent
 * - Who may:  this machine's person, if they're a Spell admin, with the parts their holders read out.
 * - Each is logged in the org's Admin space (`@rs/__admin/log.json5`).
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 */
export async function orgRecoverCommand(
  verb: "codes" | "recover",
  org: string,
  holders: string[],
  options: OrgRecoverOptions
): Promise<number> {
  const storage = new DiskStorage(environment.spellSpacesDir)
  const people = new PeopleStore(storage)
  const roles = new OrgRoles({ people })
  const recovery = new OrgRecovery({ people, roles })
  org = org.replace(/^@/, "")
  try {
    if (verb === "codes" && !holders.length) return await listCodes(recovery, org)
    const by = await spellAdminOrDie(people, verb === "codes" ? "makes an org's recovery codes" : "recovers an org")
    if (verb === "codes") return await makeCodes(recovery, org, holders, by, options)
    return await recover(recovery, org, by, options)
  } catch (error) {
    if (error instanceof SRV.HttpError) throw new CLI.CliError(error.message)
    throw error
  } finally {
    storage.close()
  }
}

/** Options of `spell space org codes` and `recover`. */
export type OrgRecoverOptions = {
  /** `codes`:  how many parts a recovery takes. */
  needed?: number
  /** `recover`:  the parts, as their holders read them out. */
  part?: string[]
  /** `recover`:  the new Board, by address. */
  board?: string[]
  /** `recover`:  the new Admins, by address. */
  admin?: string[]
  /** Why, for the log. */
  reason?: string
}

/** `codes <org>`:  who holds which part. */
async function listCodes(recovery: OrgRecovery, org: string): Promise<number> {
  const codes = await recovery.codes(org)
  if (!codes) {
    console.log(`@${org} has no recovery codes:  spell space org codes ${org} <holder> <holder> <holder>`)
    return 1
  }
  console.log(`@${org}'s recovery codes, made ${codes.made}:  any ${codes.needed} of these parts take it back.`)
  for (const { part, person } of codes.holders) console.log(`  part ${part}:  ${person}`)
  return 0
}

/** `codes <org> <holder...>`:  new codes, each part printed once. */
async function makeCodes(
  recovery: OrgRecovery,
  org: string,
  holders: string[],
  by: string,
  { needed, reason }: OrgRecoverOptions
): Promise<number> {
  const parts = await recovery.makeCodes(org, { holders, needed }, { by, why: reason })
  console.log(`New recovery codes for @${org}:  any ${needed ?? 2} of these parts take it back.`)
  console.log(
    `Give each holder theirs, and only theirs.  Spell keeps none of them:  this is the only time they show.\n`
  )
  for (const { part, person, code } of parts) console.log(`  part ${part}, for ${person}:\n    ${code}\n`)
  console.log(`Any codes @${org} had before no longer work.`)
  return 0
}

/** `recover <org>`:  the org taken back. */
async function recover(
  recovery: OrgRecovery,
  org: string,
  by: string,
  { part = [], board = [], admin = [], reason }: OrgRecoverOptions
): Promise<number> {
  if (!reason?.trim()) throw new CLI.CliError(`say why, for the log:  --reason "..."`)
  const holders = await recovery.recover(org, { parts: part, board, admins: admin }, { by, why: reason })
  console.log(`@${org} is taken back, with the parts held by ${holders.join(" and ")}.`)
  console.log(`  its Board:  ${board.join(", ")}`)
  console.log(`  its Admins:  ${admin.length ? admin.join(", ") : "none:  its Board names them"}`)
  console.log(
    `\nIts recovery codes are spent.  Make new ones:  spell space org codes ${org} <holder> <holder> <holder>`
  )
  return 0
}
