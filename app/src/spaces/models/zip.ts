/**
 * Zip files, written and read in a browser:  a project's Export and Import (`projectArchive.ts`).
 * - The zip LAYOUT is here, once:  its headers, its directory, its end record (`zipLayout()`, `zipEntries()`).
 *   - Node's twin, `spell/app/spaces/server/node/storage/zip`, packs with `zlib` and lays out with these.
 * - Packed with the platform's `CompressionStream("deflate-raw")`:  browsers have it, and node 24.
 *   No package for one writer and one reader.
 * - Only what every unzip opens:  deflated files, UTF-8 names, no zip64 (each file, and the whole, under 4 GB).
 * - Browser-safe:  no `node:*`, no `Buffer`.
 */

/** One file in a zip:  its path in the zip (`Solitaire/Card.spell`, no leading slash) and its bytes. */
export type ZipFile = {
  /** its path in the zip, `/`s between folders, no leading slash */
  path: string
  /** its bytes, unpacked */
  bytes: Uint8Array
}

/** A zip of `files`, each deflated:  what every unzip opens. */
export async function zipOf(files: readonly ZipFile[]): Promise<Uint8Array> {
  const packed: PackedZipFile[] = []
  for (const { path, bytes } of files) {
    packed.push({ path, size: bytes.length, crc: crc32(bytes), packed: await deflated(bytes), method: DEFLATED })
  }
  return zipLayout(packed)
}

/**
 * The files in `zip`, each unpacked, in the zip's order.
 * - Its folders' own entries (`Solitaire/`) are left out:  each file says its folder.
 * - throws `TypeError` if it isn't a zip, or packs a file some other way than deflate or stored
 */
export async function filesInZip(zip: Uint8Array): Promise<ZipFile[]> {
  const files: ZipFile[] = []
  for (const entry of zipEntries(zip)) {
    if (entry.path.endsWith("/")) continue
    files.push({ path: entry.path, bytes: entry.method === DEFLATED ? await inflated(entry.packed) : entry.packed })
  }
  return files
}

////////////////
// ## The layout, shared with node's twin
////////////////

/** One file, packed, for `zipLayout()`:  whoever packed it says how. */
export type PackedZipFile = {
  /** its path in the zip, no leading slash */
  path: string
  /** its size unpacked, bytes */
  size: number
  /** CRC-32 of its bytes unpacked (`crc32()`) */
  crc: number
  /** its bytes, packed by `method` */
  packed: Uint8Array
  /** how it's packed:  `DEFLATED` (8) or `STORED` (0) */
  method: number
}

/** A file entry of a zip, as `zipEntries()` reads it:  still packed. */
export type ZipEntry = {
  /** its path in the zip;  a folder's own entry ends in `/` */
  path: string
  /** how it's packed:  `DEFLATED` (8) or `STORED` (0) */
  method: number
  /** its bytes, packed:  a view into the zip, not a copy */
  packed: Uint8Array
}

/** Packing method:  raw deflate. */
export const DEFLATED = 8
/** Packing method:  none, the bytes as they are. */
export const STORED = 0

/**
 * The bytes of a zip of `files`, already packed:  a local header and the bytes per file,
 * then the central directory, then its end record.
 * - Every file's date is `modified`, default now.
 * - Each name is flagged UTF-8 (bit 11), so an unzip reads `Café.spell` as written.
 */
export function zipLayout(files: readonly PackedZipFile[], { modified = new Date() } = {}): Uint8Array {
  const encoder = new TextEncoder()
  const [time, date] = [dosTime(modified), dosDate(modified)]
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const file of files) {
    const name = encoder.encode(file.path.replace(/^\/+/, ""))
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, LOCAL_SIGNATURE, true)
    local.setUint16(4, 20, true) // version needed:  2.0, deflate
    local.setUint16(6, UTF8_NAMES, true)
    local.setUint16(8, file.method, true)
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, file.crc, true)
    local.setUint32(18, file.packed.length, true)
    local.setUint32(22, file.size, true)
    local.setUint16(26, name.length, true)
    const central = new DataView(new ArrayBuffer(46))
    central.setUint32(0, CENTRAL_SIGNATURE, true)
    central.setUint16(4, 20, true) // made by:  2.0
    central.setUint16(6, 20, true) // version needed
    central.setUint16(8, UTF8_NAMES, true)
    central.setUint16(10, file.method, true)
    central.setUint16(12, time, true)
    central.setUint16(14, date, true)
    central.setUint32(16, file.crc, true)
    central.setUint32(20, file.packed.length, true)
    central.setUint32(24, file.size, true)
    central.setUint16(28, name.length, true)
    central.setUint32(42, offset, true)
    locals.push(bytesOf(local), name, file.packed)
    centrals.push(bytesOf(central), name)
    offset += 30 + name.length + file.packed.length
  }
  const directorySize = centrals.reduce((total, part) => total + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, END_SIGNATURE, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, directorySize, true)
  end.setUint32(16, offset, true)
  return joined([...locals, ...centrals, bytesOf(end)])
}

/**
 * Every entry of `zip`'s central directory, in its order, still packed.
 * - Read from the directory, not the local headers:  so a zip that wrote its sizes after the bytes
 *   (a "data descriptor", as `zip -` and many tools do) reads too.
 * - throws `TypeError` if it isn't a zip, or packs a file some other way than deflate or stored
 */
export function zipEntries(zip: Uint8Array): ZipEntry[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const end = endRecordOf(view)
  if (end < 0) throw new TypeError("zipEntries():  not a zip -- it has no end record")
  const decoder = new TextDecoder()
  const count = view.getUint16(end + 10, true)
  let at = view.getUint32(end + 16, true)
  const entries: ZipEntry[] = []
  for (let index = 0; index < count; index++) {
    if (at + 46 > zip.length || view.getUint32(at, true) !== CENTRAL_SIGNATURE) {
      throw new TypeError("zipEntries():  not a zip -- its directory is broken")
    }
    const method = view.getUint16(at + 10, true)
    const packedSize = view.getUint32(at + 20, true)
    const nameLength = view.getUint16(at + 28, true)
    const extraLength = view.getUint16(at + 30, true)
    const commentLength = view.getUint16(at + 32, true)
    const localAt = view.getUint32(at + 42, true)
    const path = decoder.decode(zip.subarray(at + 46, at + 46 + nameLength))
    if (method !== DEFLATED && method !== STORED) {
      throw new TypeError(`zipEntries():  ${path} is packed in a way this can't read (method ${method})`)
    }
    const dataAt = localAt + 30 + view.getUint16(localAt + 26, true) + view.getUint16(localAt + 28, true)
    entries.push({ path, method, packed: zip.subarray(dataAt, dataAt + packedSize) })
    at += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

/** CRC-32 of `bytes`, as a zip records it (the IEEE polynomial, as gzip and PNG). */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

////////////////
// ## Helpers
////////////////

const LOCAL_SIGNATURE = 0x04034b50
const CENTRAL_SIGNATURE = 0x02014b50
const END_SIGNATURE = 0x06054b50
/** General-purpose flag bit 11:  names are UTF-8. */
const UTF8_NAMES = 0x0800

/** Table for `crc32()`, a byte at a time. */
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  return crc >>> 0
})

/**
 * Where `view`'s end record starts, or `-1` if it has none.
 * - Searched from the end:  a zip comment (up to 64 KB) may follow it.
 */
function endRecordOf(view: DataView): number {
  const last = Math.max(0, view.byteLength - 22 - 0xffff)
  for (let at = view.byteLength - 22; at >= last; at--) {
    if (view.getUint32(at, true) === END_SIGNATURE) return at
  }
  return -1
}

/** `bytes`, raw-deflated. */
function deflated(bytes: Uint8Array): Promise<Uint8Array> {
  return streamedThrough(bytes, new CompressionStream("deflate-raw"))
}

/** `packed`, raw-inflated. */
function inflated(packed: Uint8Array): Promise<Uint8Array> {
  return streamedThrough(packed, new DecompressionStream("deflate-raw"))
}

/** `bytes` run through `stream`, whole. */
async function streamedThrough(
  bytes: Uint8Array,
  stream: CompressionStream | DecompressionStream
): Promise<Uint8Array> {
  const out = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

/** The bytes `view` sees. */
function bytesOf(view: DataView): Uint8Array {
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
}

/** `parts`, end to end, in one array. */
function joined(parts: readonly Uint8Array[]): Uint8Array {
  const all = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let at = 0
  for (const part of parts) {
    all.set(part, at)
    at += part.length
  }
  return all
}

/** `date`'s time of day, as a zip records it:  local, to 2 seconds. */
function dosTime(date: Date): number {
  return (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)
}

/** `date`'s day, as a zip records it:  local, from 1980. */
function dosDate(date: Date): number {
  return (Math.max(0, date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
}
