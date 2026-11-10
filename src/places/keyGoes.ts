/**
 * Where a server wants its key, and sending it there (epic `data` T73).
 * - `WebPlace`, for a running program, and the ingest's `PoliteReader` both come here, so the two send a key the same way.
 * - Plain web APIs, imports nothing:  `spell/places/keyGoes`, by file, wherever a key is sent.
 */

/**
 * Where a key goes on a request:
 * - `{ header }`:  in this header, as it is:  `X-Api-Key: <key>`
 * - `{ inAddress }`:  in the address, as this question:  `?api_key=<key>`
 * - Left out:  `Authorization: Bearer <key>`.
 */
export type KeyGoes = { header: string } | { inAddress: string }

/** How a key that's hidden reads, in a message. */
const HIDDEN_KEY = "[its key]"

/**
 * SIDE EFFECT:  `key` is on `headers`, unless it goes in the address.  The address to send to, with it there if so.
 * - Set, not added:  a next page's address, handed back by the server, may already hold it.
 */
export function putKeyOn(url: string, headers: Headers, key: string, goes?: KeyGoes): string {
  if (!goes) headers.set("Authorization", `Bearer ${key}`)
  else if ("header" in goes) headers.set(goes.header, key)
  else return withQuestion(url, goes.inAddress, key)
  return url
}

/**
 * `url` with no key in it, for saying or keeping:  a key in an address must not reach a message, a log or a file.
 * - As `url`, for a key that goes anywhere but the address.
 */
export function addressWithoutKey(url: string, goes?: KeyGoes): string {
  if (!goes || !("inAddress" in goes)) return url
  const address = parsed(url)
  if (!address?.searchParams.has(goes.inAddress)) return url
  address.searchParams.delete(goes.inAddress)
  return address.href
}

/**
 * `text` with `key` hidden, however it's written:  as it is, or as it's written in an address.
 * - For what's said of a request:  an error naming its address, a server saying the key back.
 */
export function keyHidden(text: string, key: string | undefined): string {
  if (!key) return text
  const inQuery = new URLSearchParams({ key }).toString().slice("key=".length)
  return [key, encodeURIComponent(key), inQuery].reduce((clean, form) => clean.replaceAll(form, HIDDEN_KEY), text)
}

/** `url` with `name` asked as `value`:  once, whatever it held. */
function withQuestion(url: string, name: string, value: string): string {
  const address = parsed(url)
  if (!address) return `${url}${url.includes("?") ? "&" : "?"}${encodeURIComponent(name)}=${encodeURIComponent(value)}`
  address.searchParams.set(name, value)
  return address.href
}

/** `url` as a `URL`:  on a page, one from the top of this server too.  `undefined` for one that can't be read as one. */
function parsed(url: string): URL | undefined {
  return URL.canParse(url, globalThis.location?.href) ? new URL(url, globalThis.location?.href) : undefined
}
