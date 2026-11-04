import { crc32, deflateRawSync, inflateRawSync } from "zlib"

/**
 * Zip files, written and read:  a project's versions (`ProjectDrafts`), a space's export (`SpaceExport`, epic
 * `atmosphere` P7).
 * - Node only.
 */

/**
 * A zip of `entries` (paths from the folder zipped, and their bytes), each deflated:  what every unzip opens.
 * - Small on purpose, on node's own `zlib`:  no package for one writer and one reader.
 */
export function zipped(entries: ReadonlyArray<readonly [string, Buffer]>): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const [filePath, data] of entries) {
    const name = Buffer.from(filePath.replace(/^\/+/, ""), "utf8")
    const packed = deflateRawSync(data)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(packed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(packed.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    locals.push(local, name, packed)
    centrals.push(central, name)
    offset += local.length + name.length + packed.length
  }
  const directory = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(directory.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, directory, end])
}

/** The files `zipped()` wrote:  each `/path` and its bytes. */
export function unzipped(zip: Buffer): Array<[string, Buffer]> {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (end < 0) throw new TypeError("unzipped():  not a zip")
  const count = zip.readUInt16LE(end + 10)
  let at = zip.readUInt32LE(end + 16)
  const files: Array<[string, Buffer]> = []
  for (let index = 0; index < count; index++) {
    const method = zip.readUInt16LE(at + 10)
    const packedSize = zip.readUInt32LE(at + 20)
    const nameLength = zip.readUInt16LE(at + 28)
    const extraLength = zip.readUInt16LE(at + 30)
    const commentLength = zip.readUInt16LE(at + 32)
    const localAt = zip.readUInt32LE(at + 42)
    const name = zip.toString("utf8", at + 46, at + 46 + nameLength)
    const dataAt = localAt + 30 + zip.readUInt16LE(localAt + 26) + zip.readUInt16LE(localAt + 28)
    const packed = zip.subarray(dataAt, dataAt + packedSize)
    files.push([`/${name}`, method === 8 ? inflateRawSync(packed) : Buffer.from(packed)])
    at += 46 + nameLength + extraLength + commentLength
  }
  return files
}
