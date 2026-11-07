import { createHash } from "node:crypto"

/**
 * A version made from what something holds:  the same content, the same version, on any machine, in any run.
 * - A hash of its JSON, each object's keys sorted:  so a file laid out again, or its fields in another order, keeps it.
 * - Who uses it:
 *   - `CsvPlace`:  a row's cells, so editing one row in VS Code moves only that row's version
 *   - `FolderPlace`:  a thing's file (epic `atmosphere` P1),
 *     so a save that changes nothing (a `touch`, a checkout) moves nothing
 * - Why not a file's stamp (`ETag`, from its size and time):  a stamp moves with every save, the same text or not,
 *   and differs between two copies of the same folder;  a Space's host compares what's in a record, not when.
 * - A list of text hashes as it always did (`["a","b"]`'s JSON):  a CSV row's version before this is the same after.
 * - Node only:  `node:crypto`.
 */
export function contentVersion(content: unknown): string {
  return contentHash(sortedJson(content))
}

/**
 * The ONE hash of text or bytes as they are:  sha1, in hex.
 * - Who uses it:  `contentVersion()`, of a thing's JSON;  a space's file's bytes (`FolderFiles`, epic `atmosphere` P15);
 *   a project's drafts, of its published text (the app's `ProjectDrafts`)
 */
export function contentHash(content: string | Uint8Array): string {
  return createHash("sha1").update(content).digest("hex")
}

/** `value` as JSON, each object's keys in order:  the one spelling of its content. */
function sortedJson(value: unknown): string {
  return JSON.stringify(value, (_key, each: unknown) => {
    if (!each || typeof each !== "object" || Array.isArray(each)) return each
    const entries = Object.entries(each as Record<string, unknown>).sort(([one], [other]) => (one < other ? -1 : 1))
    return Object.fromEntries(entries)
  })
}
