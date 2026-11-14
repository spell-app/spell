import { crc32, deflateRawSync, inflateRawSync } from "zlib"

import { DEFLATED, zipEntries, zipLayout } from "spell/app/spaces/models/zip"

/**
 * Zip files, written and read on node:
 * a project's versions (`ProjectDrafts`), a space's export (`SpaceExport`, epic `atmosphere` P7).
 * - Node only, and SYNCHRONOUS:  packed with node's own `zlib`.
 * - The zip's layout is the browser's twin's, `spell/app/spaces/models/zip` (`zipLayout()`, `zipEntries()`):
 *   one writer and one reader of the format, for the editor's Export and Import too.
 */

/** A zip of `entries` (paths from the folder zipped, and their bytes), each deflated:  what every unzip opens. */
export function zipped(entries: ReadonlyArray<readonly [string, Buffer]>): Buffer {
  const files = entries.map(([filePath, data]) => ({
    path: filePath.replace(/^\/+/, ""),
    size: data.length,
    crc: crc32(data),
    packed: deflateRawSync(data),
    method: DEFLATED
  }))
  return Buffer.from(zipLayout(files))
}

/**
 * The files `zipped()` wrote:  each `/path` and its bytes.
 * - throws `TypeError` if `zip` isn't a zip
 */
export function unzipped(zip: Buffer): Array<[string, Buffer]> {
  return zipEntries(zip).map(({ path, method, packed }) => [
    `/${path}`,
    method === DEFLATED ? inflateRawSync(packed) : Buffer.from(packed)
  ])
}
