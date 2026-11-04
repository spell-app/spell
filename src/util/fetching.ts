/**
 * `fetch()` that answers only with an OK response, and what `Api` is asked and throws.
 * - The bottom of `Api` and `Sources`:  imports nothing, so a page's eager chunk can hold it without holding `Api`.
 * - GENERIC, like the files beside it:  Spell UI's runtime and the places both use it, by file (`spell/util/fetching`).
 * - Spell UI can't use the kit's `$fetch()`:  it would bring lodash and query-string into every page.
 */

////////////////
// ## An OK answer
////////////////

/**
 * `fetch()` that answers only with an OK response:  any failure throws what `failed()` makes of it,
 * so each caller throws its OWN typed error (`SourceError`, `ApiError` ...).
 * - `failed()` is told the URL, and either the answer that wasn't OK (`response`) or the network's `error`.
 * - An abort (`init.signal`) rethrows as it is:  it's no failure of the server's.
 */
export async function fetchOk(url: string, failed: (failure: FetchFailure) => Error, init?: RequestInit) {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    if (init?.signal?.aborted) throw error
    throw failed({ url, error })
  }
  if (!response.ok) throw failed({ url, response })
  return response
}

/** `fetchOk()`, then the answer's text:  resolves with both. */
export async function fetchText(
  url: string,
  failed: (failure: FetchFailure) => Error,
  init?: RequestInit
): Promise<{ text: string; response: Response }> {
  const response = await fetchOk(url, failed, init)
  return { text: await response.text(), response }
}

/** What `fetchOk()` tells `failed()`:  the URL, and the answer that wasn't OK, or the network's error. */
export type FetchFailure = {
  /** the URL asked for */
  url: string
  /** the answer, when there was one:  not OK (`status` 404 ...) */
  response?: Response
  /** what `fetch()` threw, when nothing answered */
  error?: unknown
}

/** `404 Not Found`:  a response's status and text, for a message. */
export function answerOf(response: Response): string {
  return `${response.status} ${response.statusText}`.trim()
}

////////////////
// ## What `Api` is asked, and throws
////////////////

/** HTTP method for `Api.request()`:  the platform's own spelling. */
export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS"

/**
 * How `Api.request()` reads the response body.
 * - `json` / `text`:  that parser, whatever the response says
 * - `response`:  the `Response` itself, body unread
 * - `auto`:  JSON when the `Content-Type` says so, else text
 * - A union, not a set:  nothing lists or validates them.
 */
export type ApiResponseType = "json" | "text" | "response" | "auto"

/** Values for `{name}` / `{/name}` URL template slots. */
export type ApiUrlData = Record<string, string | number | boolean | null | undefined>

/** Options for `Api.request()`. */
export type ApiRequest = {
  /** URL template, e.g. `/api/users/{id}{/tab}` -- see `Api.url()` */
  url: string
  /** values for the URL template */
  urlData?: ApiUrlData
  /** default `GET` */
  method?: ApiMethod
  /**
   * request data
   * - `GET` / `HEAD`:  appended as query parameters
   * - otherwise:  plain objects are sent as JSON;  `FormData`, `URLSearchParams`, `Blob`, strings as-is
   */
  data?: unknown
  /**
   * ms to wait before sending;  a newer request with the same `key` inside that window supersedes this one,
   * which then rejects with an `AbortError` (Fomantic's `throttle` ~== debounce)
   */
  throttle?: number
  /** groups throttled requests;  default the URL template */
  key?: string
  /** caller's abort signal, combined with the throttle's via `AbortSignal.any` */
  signal?: AbortSignal
  /** ms before the request aborts with a `TimeoutError` */
  timeout?: number
  /** extra request headers */
  headers?: HeadersInit
  /** default `auto`:  JSON when the response says so, else text */
  responseType?: ApiResponseType
  /** the page is going away:  the request outlives it, as `fetch`'s `keepalive` does */
  keepalive?: boolean
  /** how it treats the browser's cache, as `fetch`'s `cache` does;  default the browser's */
  cache?: RequestCache
}

/** `cause` of an `ApiError`. */
export type ApiErrorCause = {
  /** the failed response, body unread */
  response: Response
}

/**
 * Thrown by `Api.request()` for a non-2xx response.
 * - Keeps the `Response` in `cause`, so callers can read a server error body.
 * - `new ApiError(message, { cause: { response } })`
 */
export class ApiError extends Error {
  declare cause: ApiErrorCause | undefined

  /** HTTP status, e.g. `404` */
  get status() {
    return this.cause?.response.status
  }

  /** the failed response, body unread */
  get response() {
    return this.cause?.response
  }
}
ApiError.prototype.name = "ApiError"
