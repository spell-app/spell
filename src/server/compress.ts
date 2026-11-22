import type { Stats } from "node:fs"
import { readFile, stat } from "node:fs/promises"
import { promisify } from "node:util"
import { gzip, gzipSync } from "node:zlib"

/**
 * How `Reply` compresses what it sends (epic `solid-2-final` P2):  node's own zlib, no dependency.
 * - a built file's BROTLI COPY beside it (`x.js.br`, written by the builds' `brotliCopies()` plugin), sent as is,
 *   when the browser takes brotli and the copy is no older than the file (`brotliCopyOf()`)
 * - else GZIP, made as it's sent, for text over `COMPRESS_MIN_BYTES` (`isCompressible()`)
 *   - a file's gzip is kept in memory by its path, size and time (`gzipOfFile()`), so a big bundle the repo commits
 *     (the docs bundle, the epics pack) is compressed once a run, not once a request
 * - plain node, no imports of the kit:  `Reply` loads it, and every server has a `Reply`
 */

/** Smaller than this, a body goes as it is:  compressing it saves less than its headers cost. */
export const COMPRESS_MIN_BYTES = 1024

/**
 * The content types worth compressing:  text of every kind (pages, scripts, styles, JSON, SVG, XML), and WebAssembly.
 * - NOT images, fonts, media or archives:  they're compressed already
 */
const COMPRESSIBLE = /^(?:text\/|application\/(?:json|javascript|xml|manifest\+json|wasm)\b|image\/svg\+xml\b)/i

/** Whether a body of content type `type` is worth compressing. */
export function isCompressible(type: string | undefined): boolean {
  return !!type && COMPRESSIBLE.test(type)
}

/**
 * Whether request header `Accept-Encoding` (`acceptEncoding`) takes `encoding` (`br`, `gzip`).
 * - `;q=0` refuses it;  `*` takes anything not refused by name
 */
export function acceptsEncoding(acceptEncoding: string | undefined, encoding: string): boolean {
  if (!acceptEncoding) return false
  let star = false
  for (const part of acceptEncoding.split(",")) {
    const [name = "", ...params] = part.trim().toLowerCase().split(";")
    const refused = params.some((param) => /^\s*q\s*=\s*0(?:\.0*)?\s*$/.test(param))
    if (name === encoding) return !refused
    if (name === "*") star = !refused
  }
  return star
}

/** The brotli copy beside `file` (`<file>.br`), when there is one no older than `fileStat`;  else `undefined`. */
export async function brotliCopyOf(file: string, fileStat: Stats): Promise<{ path: string; stat: Stats } | undefined> {
  const path = `${file}.br`
  const copy = await stat(path).catch(() => undefined)
  return copy?.isFile() && copy.mtimeMs >= fileStat.mtimeMs ? { path, stat: copy } : undefined
}

/** `body` gzipped, as it's sent:  for answers made in memory (`Reply.send()`). */
export function gzipOf(body: string | Uint8Array): Buffer {
  return gzipSync(body)
}

/**
 * File `file` (as `fileStat` says it is) gzipped, from memory when it was gzipped before at that size and time.
 * - at most `GZIP_CACHE_BYTES` kept, the least recently sent going first
 * - a file over `GZIP_FILE_LIMIT` isn't kept:  `undefined`, so the caller streams it instead
 */
export async function gzipOfFile(file: string, fileStat: Stats): Promise<Buffer | undefined> {
  if (fileStat.size > GZIP_FILE_LIMIT) return undefined
  const key = `${file}\0${fileStat.size}\0${fileStat.mtimeMs}`
  const kept = gzipped.get(key)
  if (kept) {
    // the most recently sent last
    gzipped.delete(key)
    gzipped.set(key, kept)
    return kept
  }
  const body = await gzipAsync(await readFile(file))
  for (const old of gzipped.keys()) if (old.startsWith(`${file}\0`)) forget(old)
  gzipped.set(key, body)
  keptBytes += body.byteLength
  for (const old of gzipped.keys()) {
    if (keptBytes <= GZIP_CACHE_BYTES) break
    forget(old)
  }
  return body
}

/** The most gzipped files `gzipOfFile()` keeps, in bytes, every file's together. */
const GZIP_CACHE_BYTES = 128 * 1024 * 1024

/** A file bigger than this is gzipped as it streams, and not kept. */
const GZIP_FILE_LIMIT = 32 * 1024 * 1024

const gzipAsync = promisify(gzip)

/** gzipped files by path, size and time, the least recently sent first */
const gzipped = new Map<string, Buffer>()

/** bytes `gzipped` holds */
let keptBytes = 0

/** Drop entry `key` from `gzipped`. */
function forget(key: string): void {
  keptBytes -= gzipped.get(key)?.byteLength ?? 0
  gzipped.delete(key)
}
