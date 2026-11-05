/**
 * What reading an AT Protocol Space takes, on the wire (epic `atmosphere` P11, the Spaces proposal, 0016):
 * a SPACE CREDENTIAL bound to a key of our own, each request signed with that key, and each record's MAC checked.
 * - Plain `fetch` and the browser's own crypto (`crypto.subtle`), nothing of node:  it runs anywhere.
 * - Imports nothing:  `AtProtoSpace` uses it, and the kit's fake Spaces host (`spell/server/test/fakeSpaces`) shares
 *   its byte helpers, so the two sides speak one encoding.
 *   - NOTE:  so a mistake made the same on both sides passes the fake's tests;  only the real trial
 *     (`tests/server/spacesTrial.test.ts`) proves them.
 */

/** Bytes on a plain buffer:  what the browser's crypto takes. */
export type Bytes = Uint8Array<ArrayBuffer>

/** The `Authorization` scheme a space credential goes under. */
export const CREDENTIAL_SCHEME = "Atproto-Space-Credential"

/** The header naming whose repo (or which authority) a signed request is for. */
export const AUDIENCE_HEADER = "Atproto-Space-Audience"

/** The header asking a host for a MAC, and the one it answers in. */
export const WANT_MAC_HEADER = "Atproto-Space-Want-Mac"
export const MAC_HEADER = "Atproto-Space-Mac"

/** The label of the one HTTP Message Signature a request carries (RFC 9421). */
const SIGNATURE_LABEL = "atproto-space-credential"

/** The signature's covered parts and parameters, exactly as the proposal fixes them. */
const SIGNATURE_PARAMS = `("authorization" "atproto-space-audience");tag="${SIGNATURE_LABEL}"`

/** A P-256 public key's multicodec prefix (`0x1200`, as a varint):  what makes a `did:key:zDna...`. */
const P256_PREFIX = [0x80, 0x24]

/** The P-256 curve, for the browser's crypto. */
const P256 = { name: "ECDSA", namedCurve: "P-256" } as const

/** RFC 9180's labels for P-256's DHKEM:  `"HPKE-v1" || "KEM" || 0x0010`. */
const KEM_PREFIX = concat(text("HPKE-v1"), text("KEM"), uint16(0x0010))

/** The alphabet of base58btc, the `z` of a multibase key. */
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

/** The alphabet of a `b` multibase:  RFC 4648 base32, lower case. */
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567"

/** P-256's prime, for putting a compressed key back together. */
const P256_PRIME = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn

/** P-256's `b`:  `y² = x³ - 3x + b`. */
const P256_B = 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn

/****************
 * ### `SpaceCredential`
 * A space credential, and the key it's bound to:  what reads a Space's records on any of its members' hosts.
 *
 * ```ts
 * const key = await SpaceCredential.newKey()
 * // ... the authority's getSpaceCredential, sent key.didKey, answers a credential
 * const credential = new SpaceCredential(answer.credential, key)
 * await fetch(url, { headers: await credential.headersFor("did:plc:repo-owner") })
 * ```
 *
 * - The authority signs the credential (a JWT) and writes our key's `did:key` into it (`cnf.kid`):
 *   so a host it's shown to can tell it's ours, and can't replay it elsewhere.
 * - Each request carries an HTTP Message Signature by that key over the credential and the AUDIENCE:
 *   the DID of the repo read, or the authority's own for the space host.
 * - A new key for each credential, as the proposal asks;  good 10 minutes by default, 60 at most.
 ****************/
export class SpaceCredential {
  constructor(
    /** The credential itself, as the authority answered it. */
    readonly token: string,
    /** The key it's bound to. */
    readonly key: BoundKey
  ) {}

  /** A new P-256 key, to ask for a credential with. */
  static async newKey(): Promise<BoundKey> {
    const pair = await crypto.subtle.generateKey(P256, true, ["sign", "verify"])
    return { privateKey: pair.privateKey, didKey: await didKeyFor(pair.publicKey) }
  }

  /** What the credential says:  its `iss`, `sub` (the space), `cnf.kid`, `exp`. */
  get claims(): SpaceCredentialClaims {
    return jwtClaimsOf(this.token) as SpaceCredentialClaims
  }

  /** The headers of one request for `audience`:  the credential, the audience, and their signature. */
  async headersFor(audience: string): Promise<Record<string, string>> {
    const authorization = `${CREDENTIAL_SCHEME} ${this.token}`
    const signed = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      this.key.privateKey,
      text(signatureBaseFor(authorization, audience))
    )
    return {
      Authorization: authorization,
      [AUDIENCE_HEADER]: audience,
      "Signature-Input": `${SIGNATURE_LABEL}=${SIGNATURE_PARAMS}`,
      Signature: `${SIGNATURE_LABEL}=:${base64Of(new Uint8Array(signed))}:`
    }
  }
}

/** A key a credential is bound to. */
export type BoundKey = {
  /** What signs each request. */
  privateKey: CryptoKey
  /** Its public half, as the authority is sent it. */
  didKey: string
}

/** What a space credential says. */
export type SpaceCredentialClaims = {
  /** The space authority. */
  iss: string
  /** The space:  `at://<authority>/space/<type>/<skey>`. */
  sub: string
  /** The key it's bound to. */
  cnf: { kid: string }
  /** When it ends, in seconds. */
  exp: number
  /** Its own id:  what revoking it names. */
  jti: string
}

////////////////
// ## Signing a request
////////////////

/**
 * The text an HTTP Message Signature signs (RFC 9421 §2.5):  each covered header, then the signature's own parameters.
 * - The `Authorization` value exactly as sent:  never lower-cased.
 */
export function signatureBaseFor(authorization: string, audience: string): string {
  return [
    `"authorization": ${authorization}`,
    `"atproto-space-audience": ${audience}`,
    `"@signature-params": ${SIGNATURE_PARAMS}`
  ].join("\n")
}

/** The signature's bytes, from a `Signature` header.  `undefined`:  none, or another label's. */
export function signatureIn(header: string | null | undefined): Bytes | undefined {
  const found = new RegExp(`${SIGNATURE_LABEL}=:([^:]*):`).exec(header ?? "")
  return found ? bytesOfBase64(found[1]!) : undefined
}

/** The covered parts a `Signature-Input` header names:  the proposal allows exactly one list. */
export function isSpaceSignatureInput(header: string | null | undefined): boolean {
  return header === `${SIGNATURE_LABEL}=${SIGNATURE_PARAMS}`
}

////////////////
// ## A record's MAC
////////////////

/**
 * Asking a host for a record's MAC:  a new key pair of our own (ECDH, P-256), whose public half goes as `key_share`.
 * - A new one for every request, retries and pages included, as the proposal asks.
 */
export async function macRequestFor(type: "atproto-space-record" | "atproto-space-repo"): Promise<MacRequest> {
  const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])
  const didKey = await didKeyFor(pair.publicKey)
  return { header: `type="${type}", ver=1, key_share="${didKey}"`, privateKey: pair.privateKey, didKey }
}

/** One request's ask for a MAC. */
export type MacRequest = {
  /** The `Atproto-Space-Want-Mac` header's value. */
  header: string
  /** The private half, kept for the answer. */
  privateKey: CryptoKey
  /** The public half, sent. */
  didKey: string
}

/**
 * The secret both sides share for one request:  ECDH, then HKDF-SHA256 as RFC 9180 §4.1 frames it.
 * - `ours`:  the private key on this side;  `theirs`:  the other side's public key
 * - `syncerKey`, `authorKey`:  both public keys, the syncer's (`key_share`) first, whichever side this is
 */
export async function sharedSecretFor({
  ours,
  theirs,
  syncerKey,
  authorKey
}: {
  ours: CryptoKey
  theirs: CryptoKey
  syncerKey: CryptoKey
  authorKey: CryptoKey
}): Promise<Bytes> {
  const dh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: theirs }, ours, 256))
  const keys = concat(await uncompressed(syncerKey), await uncompressed(authorKey))
  const input = await crypto.subtle.importKey("raw", concat(KEM_PREFIX, text("eae_prk"), dh), "HKDF", false, [
    "deriveBits"
  ])
  const info = concat(uint16(32), KEM_PREFIX, text("shared_secret"), keys)
  const secret = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(), info },
    input,
    256
  )
  return new Uint8Array(secret)
}

/** A record's MAC:  HMAC-SHA256 over its tag, its whole URI and its CID's bytes. */
export async function recordMacFor(secret: Bytes, uri: string, cid: string): Promise<Bytes> {
  const context = concat(text("atproto-space-record-v1"), uint16(text(uri).length), text(uri), cidBytesOf(cid))
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, context))
}

/** The MAC in an `Atproto-Space-Mac` header.  `undefined`:  none. */
export function macIn(header: string | null | undefined): Bytes | undefined {
  const found = /mac=:([^:]*):/.exec(header ?? "")
  return found ? bytesOfBase64(found[1]!) : undefined
}

/** The `Atproto-Space-Mac` header for `mac`. */
export function macHeaderFor(type: string, mac: Bytes): string {
  return `type="${type}", ver=1, mac=:${base64Of(mac)}:`
}

/** The `key_share` of an `Atproto-Space-Want-Mac` header.  `undefined`:  none. */
export function keyShareIn(header: string | null | undefined): string | undefined {
  return /key_share="([^"]+)"/.exec(header ?? "")?.[1]
}

/** Are `a` and `b` the same bytes, taking the same time whatever they hold? */
export function sameBytes(a: Bytes, b: Bytes): boolean {
  let differs = a.length ^ b.length
  for (let index = 0; index < Math.min(a.length, b.length); index++) differs |= a[index]! ^ b[index]!
  return differs === 0
}

////////////////
// ## Keys as did:keys
////////////////

/** A P-256 public key as a `did:key` (`did:key:zDna...`):  compressed, multicodec-prefixed, base58btc. */
export async function didKeyFor(publicKey: CryptoKey): Promise<string> {
  const point = await uncompressed(publicKey)
  const compressed = concat(new Uint8Array([2 + (point[64]! & 1)]), point.slice(1, 33))
  return `did:key:z${base58Of(concat(new Uint8Array(P256_PREFIX), compressed))}`
}

/**
 * The P-256 public key a `did:key`, or a DID document's `publicKeyMultibase`, holds.
 * - `use`:  `"ECDSA"` to check signatures, `"ECDH"` to agree a secret
 * - throws `TypeError` for a key that isn't P-256
 */
export async function publicKeyOf(didKey: string, use: "ECDSA" | "ECDH"): Promise<CryptoKey> {
  const multibase = didKey.replace(/^did:key:/, "")
  if (!multibase.startsWith("z")) throw new TypeError(`SpaceCredential:  "${didKey}" isn't base58btc`)
  const bytes = bytesOfBase58(multibase.slice(1))
  if (bytes[0] !== P256_PREFIX[0] || bytes[1] !== P256_PREFIX[1] || bytes.length !== 35) {
    throw new TypeError(`SpaceCredential:  "${didKey}" isn't a P-256 key`)
  }
  const usages: KeyUsage[] = use === "ECDSA" ? ["verify"] : []
  return crypto.subtle.importKey("raw", decompressed(bytes.slice(2)), { name: use, namedCurve: "P-256" }, true, usages)
}

/** A public key's point, uncompressed:  `0x04 || x || y`. */
async function uncompressed(publicKey: CryptoKey): Promise<Bytes> {
  return new Uint8Array(await crypto.subtle.exportKey("raw", publicKey))
}

/**
 * A compressed P-256 point, put back together:  `y = sqrt(x³ - 3x + b)`, the root whose parity the first byte says.
 * - By hand, since not every browser imports a compressed key;  P-256's prime is 3 mod 4, so the root is one power.
 */
function decompressed(compressed: Bytes): Bytes {
  const x = bigIntOf(compressed.slice(1))
  const right = (power(x, 3n) - 3n * x + P256_B) % P256_PRIME
  let y = power((right + P256_PRIME) % P256_PRIME, (P256_PRIME + 1n) / 4n)
  if (Number(y & 1n) !== (compressed[0]! & 1)) y = P256_PRIME - y
  return concat(new Uint8Array([4]), compressed.slice(1), bytesOfBigInt(y, 32))
}

/** `base ** exponent`, modulo P-256's prime. */
function power(base: bigint, exponent: bigint): bigint {
  let result = 1n
  let square = base % P256_PRIME
  for (let rest = exponent; rest > 0n; rest >>= 1n) {
    if (rest & 1n) result = (result * square) % P256_PRIME
    square = (square * square) % P256_PRIME
  }
  return result
}

////////////////
// ## Bytes
////////////////

/** A JWT's claims, unchecked.  - throws `TypeError` for something that isn't one */
export function jwtClaimsOf(jwt: string): Record<string, unknown> {
  const payload = jwt.split(".")[1]
  if (!payload) throw new TypeError("SpaceCredential:  that isn't a JWT")
  return JSON.parse(new TextDecoder().decode(bytesOfBase64(payload))) as Record<string, unknown>
}

/** A CID's bytes, from its text:  a `b` multibase, base32 (every CID AT Protocol hands out). */
export function cidBytesOf(cid: string): Bytes {
  if (!cid.startsWith("b")) throw new TypeError(`SpaceCredential:  CID "${cid}" isn't base32`)
  const out: number[] = []
  let buffer = 0
  let bits = 0
  for (const letter of cid.slice(1)) {
    buffer = (buffer << 5) | BASE32.indexOf(letter)
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >> bits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

/** `bytes` as a `b` multibase, base32:  a CID's text. */
export function base32Of(bytes: Bytes): string {
  let out = "b"
  let buffer = 0
  let bits = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      bits -= 5
      out += BASE32[(buffer >> bits) & 31]
    }
  }
  return bits ? out + BASE32[(buffer << (5 - bits)) & 31] : out
}

/** Base64, standard, padded:  a structured header's byte sequence. */
export function base64Of(bytes: Bytes): string {
  return btoa(String.fromCharCode(...bytes))
}

/** Base64url, unpadded:  a JWT's parts. */
export function base64urlOf(bytes: Bytes): string {
  return base64Of(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** Bytes from base64, standard or url, padded or not. */
export function bytesOfBase64(text64: string): Bytes {
  const standard = text64.replace(/-/g, "+").replace(/_/g, "/")
  return Uint8Array.from(atob(standard.padEnd(Math.ceil(standard.length / 4) * 4, "=")), (letter) =>
    letter.charCodeAt(0)
  )
}

/** UTF-8 bytes. */
export function text(value: string): Bytes {
  return new TextEncoder().encode(value)
}

/** These bytes, end to end. */
export function concat(...parts: Bytes[]): Bytes {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let at = 0
  for (const part of parts) {
    out.set(part, at)
    at += part.length
  }
  return out
}

/** Two bytes, big end first. */
function uint16(value: number): Bytes {
  return new Uint8Array([(value >> 8) & 0xff, value & 0xff])
}

/** Bytes as base58btc. */
function base58Of(bytes: Bytes): string {
  let value = bigIntOf(bytes)
  let out = ""
  while (value > 0n) {
    out = BASE58[Number(value % 58n)] + out
    value /= 58n
  }
  for (const byte of bytes) {
    if (byte !== 0) break
    out = `1${out}`
  }
  return out
}

/** Bytes from base58btc. */
function bytesOfBase58(text58: string): Bytes {
  let value = 0n
  for (const letter of text58) {
    const digit = BASE58.indexOf(letter)
    if (digit < 0) throw new TypeError(`SpaceCredential:  "${letter}" isn't base58`)
    value = value * 58n + BigInt(digit)
  }
  const leading = /^1*/.exec(text58)![0].length
  const body = value ? bytesOfBigInt(value) : new Uint8Array()
  return concat(new Uint8Array(leading), body)
}

/** Bytes as one big number, big end first. */
function bigIntOf(bytes: Bytes): bigint {
  return bytes.reduce((value, byte) => (value << 8n) | BigInt(byte), 0n)
}

/** A big number as bytes, big end first;  `length`:  padded to it. */
function bytesOfBigInt(value: bigint, length = 0): Bytes {
  const out: number[] = []
  for (let rest = value; rest > 0n; rest >>= 8n) out.unshift(Number(rest & 0xffn))
  while (out.length < length) out.unshift(0)
  return new Uint8Array(out)
}
