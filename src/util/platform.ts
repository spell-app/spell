/**
 * Which kind of device the page is on:  a `phone`, a `tablet` or a `desktop` (epic `mockup` T53).
 * - The ONE place that decides it:  `PLATFORM_QUERIES`, three media queries.
 *   - `phone`:  a finger is the main pointer, and the screen is small on at least one side (under 600px),
 *     so a phone turned sideways is still a phone
 *   - `tablet`:  a finger is the main pointer, and the screen is big both ways
 *   - `desktop`:  a mouse or a trackpad is the main pointer (or none at all)
 * - Media queries, so CSS can use them as they are:
 *   Spell UI's `reset.css` hides an element whose shared `on-platform` leaves this one out,
 *   live as the window is resized or the device turned, with no script per element.
 *   Its queries MUST match these;  `platform.test.ts` checks they do.
 * - Generic, no DOM needed to import it:  outside a browser it's always `desktop`.
 * - Taken by file, `spell/util/platform`, in no barrel.
 */

import { commaList } from "./string"

/** Every platform, in the order docs list them. */
export const PLATFORMS = ["phone", "tablet", "desktop"] as const

/** A kind of device:  `phone`, `tablet` or `desktop`. */
export type Platform = (typeof PLATFORMS)[number]

/**
 * Call `callback` with the new platform each time it changes:  the window resized past 600px, the device turned,
 * a mouse plugged in.
 * - Returns the function that stops listening.
 * - Does nothing outside a browser.
 */
export function onPlatformChange(callback: (platform: Platform) => void): () => void {
  if (typeof matchMedia !== "function") return () => {}
  const stop = new AbortController()
  const changed = () => callback(currentPlatform())
  for (const platform of PLATFORMS) {
    matchMedia(PLATFORM_QUERIES[platform]).addEventListener("change", changed, { signal: stop.signal })
  }
  return () => stop.abort()
}

/**
 * Can this browser picture a screen, a window or a tab (`navigator.mediaDevices.getDisplayMedia()`)?
 * - Desktop browsers only:  no iOS or Android browser has it.
 * - Spell UI's `UI.browser.supports.screenCapture` is this.
 */
export function canCaptureScreen(): boolean {
  return typeof globalThis.navigator?.mediaDevices?.getDisplayMedia === "function"
}

/** Each platform's name, any case. */
const PLATFORM_WORD = {
  phone: /^phone$/i,
  tablet: /^tablet$/i,
  desktop: /^desktop$/i
} as const satisfies Record<Platform, RegExp>

/**
 * The media query each platform matches:  exactly one matches at a time.
 * - 600px:  the shorter side of the biggest phones is under 450px, of the smallest tablets (iPad mini) 744px.
 */
export const PLATFORM_QUERIES: Readonly<Record<Platform, string>> = {
  phone: "(pointer: coarse) and ((width < 600px) or (height < 600px))",
  tablet: "(pointer: coarse) and (width >= 600px) and (height >= 600px)",
  desktop: "not (pointer: coarse)"
}

/**
 * The platform the page is on now, by `PLATFORM_QUERIES`.
 * - Live:  asks the browser on every call.
 * - `desktop` outside a browser (no `matchMedia`).
 */
export function currentPlatform(): Platform {
  if (typeof matchMedia !== "function") return "desktop"
  return PLATFORMS.find((platform) => matchMedia(PLATFORM_QUERIES[platform]).matches) ?? "desktop"
}

/**
 * The platforms a list names, as `on-platform` takes them:  `"desktop,tablet"`, `"desktop, tablet"`.
 * - A comma list (`commaList()`):  a space after a comma is ignored;  case is ignored.
 * - A word that's no platform is left out.
 * - `undefined` for no list (`undefined`, or nothing but commas and spaces):  every platform.
 */
export function platformsIn(list: string | undefined): ReadonlySet<Platform> | undefined {
  const words = commaList(list)
  if (!words.length) return undefined
  return new Set(PLATFORMS.filter((platform) => words.some((word) => PLATFORM_WORD[platform].test(word))))
}

/**
 * Is the page on one of the platforms `list` names (`platformsIn()`)?
 * - No list:  `true`, every platform.
 */
export function isOnPlatform(list: string | undefined): boolean {
  return platformsIn(list)?.has(currentPlatform()) ?? true
}
