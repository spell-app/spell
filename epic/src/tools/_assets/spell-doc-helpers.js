/*
 * Small helpers the docs pages' scripts share:  the page runtime (`spell-doc-runtime.js`) and the comments
 * (`spell-doc-comments.js`), which Epic UI's pages load by themselves too (`spell-comments.js`).
 * - Plain DOM, no Spell UI imports:  the comments' own script runs beside the page's Spell UI, never with a second one
 *   (a toast goes through the page's `window.SpellUI`)
 */

/** Escape for HTML text. */
export function text(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Escape for a double-quoted attribute value. */
export function attr(value) {
  return text(value).replace(/"/g, "&quot;")
}

/** The object saved as JSON under `key`, or `{}` (nothing saved, bad JSON, or storage that throws). */
export function readJSON(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}")
    return value && typeof value === "object" ? value : {}
  } catch {
    return {}
  }
}

/** Save `value` as JSON under `key`;  a browser that blocks storage just doesn't remember. */
export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // private window:  not remembered
  }
}

/** Add `pill` to the page header `head`, before its toolbar (`buildPageToolbar()`):  the toolbar stays its last row. */
export function beforeToolbar(head, pill) {
  const toolbar = head.querySelector(":scope > nav.spell-toolbar")
  if (toolbar) toolbar.before(pill)
  else head.append(pill)
}

/** `field` as tall as its text (between its CSS `min-height` and `max-height`). */
export function growField(field) {
  field.style.height = "auto"
  field.style.height = `${field.scrollHeight + 2}px`
}

/**
 * A toast through `UI.toast()`;  the console when toasts aren't there.
 * - `displayTime`:  ms, 3s unless given;  `actions`:  its buttons (`ToastAction`s:  `{ text, icon, class, click }`)
 */
export function noteToast(message, type, { displayTime = 3000, actions } = {}) {
  try {
    window.SpellUI.UI.toast({ message, type, position: "bottom right", displayTime, showIcon: true, actions })
  } catch {
    console.info(message)
  }
}

/** A note's or comment's `at` (`2026-10-10 14:02`) as its card shows it:  `10/10 14:02`. */
export function shortStamp(at) {
  const parts = /^\d{4}-(\d\d)-(\d\d)[ T](\d\d:\d\d)/.exec(at ?? "")
  return parts ? `${Number(parts[1])}/${Number(parts[2])} ${parts[3]}` : (at ?? "")
}

/**
 * POST `body` as JSON to page-server route `url`, with the page server's token;  returns its answer.
 * - a 403 on the token (the server restarted since the page loaded):  takes the new token from the page as served
 *   now, and tries once more
 * - `keepalive`:  the request outlives the page (sent as it goes:  a small body only, under 64 KB)
 * - throws an `Error` saying why (the route's `error`)
 */
export async function postJSON(url, body, { keepalive = false, retried = false } = {}) {
  const server = window.SPELL_SERVER
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-server-token": server.token },
    body: JSON.stringify(body),
    keepalive
  })
  const answer = await response.json().catch(() => ({}))
  if (response.ok) return answer
  if (response.status === 403 && /token/i.test(answer.error ?? "") && !retried && server.readPage) {
    const { html } = await server.readPage()
    const fresh = /window\.SPELL_SERVER = (\{.*?\})<\/script>/.exec(html)
    if (fresh) {
      server.token = JSON.parse(fresh[1]).token
      return postJSON(url, body, { keepalive, retried: true })
    }
  }
  throw new Error(answer.error ?? `${response.status} ${response.statusText}`)
}
