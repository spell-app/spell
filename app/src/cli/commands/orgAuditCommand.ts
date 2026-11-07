import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"

/**
 * `spell space org audit <org>` (epic `atmosphere` P24):  every space of the org whose member list differs from what
 * its roles say, and how (`MemberLists.audit()`).
 * - Prints each difference under its space;  none:  one line saying the lists agree.
 * - Exits 1 when there are any, so a script can tell.
 * - Run as this machine's own code:  no member check, as `export` runs;  it changes nothing.
 * - Node only;  loads spaces' node side alone (no `loadApp()`).
 */
export async function orgAuditCommand(org: string): Promise<number> {
  org = org.replace(/^@/, "")
  const folders = new SpaceFolders()
  try {
    const differences = await folders.lists.audit(org)
    if (!differences.length) {
      console.log(`@${org}'s member lists agree with its roles.`)
      return 0
    }
    console.log(`@${org}:  ${differences.length} ${differences.length === 1 ? "difference" : "differences"}.`)
    for (const address of new Set(differences.map((each) => each.address))) {
      console.log(`${address}:`)
      for (const each of differences) if (each.address === address) console.log(`  - ${each.said}`)
    }
    return 1
  } finally {
    folders.close()
    folders.takedowns.close()
  }
}
