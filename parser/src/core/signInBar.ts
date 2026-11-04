/**
 * What shows of a person's sign-in, on a place where each person is someone (epic `data` P16):  always there, and plain.
 * - Who's signed in, with Sign out;  or who isn't, with a field and Sign in;  and when it's ended, that it has, and what's kept.
 * - A program writes nothing for it:  as with a read's riders, a person should never be left guessing.
 * - On the page's Spell UI, by its tags, as a read's failure message is:  core never imports Spell UI.
 * - Plain DOM, drawn again as the sign-in changes:  no Solid, as nothing here belongs to the program's drawing.
 * - Above the app, in `core.domRoot()`.  With no page, as under `spell run`:  nothing.
 * - Imports `spell/util/places` as a TYPE only.
 */
import type { Place, SignInStatus } from "spell/util/places/places.types"

import { core } from "./core"

/** What the bar's words are, by where the sign-in stands. */
const WORDS: Record<SignInStatus, "sign-in-signed-out" | "sign-in-signing" | "sign-in-as" | "sign-in-ended"> = {
  "signed out": "sign-in-signed-out",
  "signing in": "sign-in-signing",
  "signed in": "sign-in-as",
  ended: "sign-in-ended"
}

/** What it colours itself by, by where the sign-in stands:  an ending is what mustn't be missed. */
const COLORS: Record<SignInStatus, string> = {
  "signed out": "blue",
  "signing in": "blue",
  "signed in": "green",
  ended: "yellow"
}

/**
 * SIDE EFFECT:  shows the sign-in of `place`, called `name`, until the page goes.
 * - NEVER throws:  a page that can't show it still reads.
 */
export function showSignIn(name: string, place: Place): void {
  const { signIn } = place
  if (!signIn || typeof document === "undefined") return
  try {
    const bar = document.createElement("ui-message")
    bar.classList.add("spell-sign-in")
    const root = core.domRoot()
    ;(root === document ? document.body : (root as ShadowRoot))?.prepend(bar)
    const draw = () => drawInto(bar, name.replace(/_/g, " "), place)
    signIn.onChange(draw)
    place.onPeopleHere?.(draw)
    draw()
  } catch (ignored) {
    console.error(`core.place():  can't show who's signed in to ${name}`, ignored)
  }
}

/**
 * SIDE EFFECT:  says, above the app, that the place called `name` has no sign-in yet:  the person it takes everyone
 * here to be is this machine's, whose name is the same on every machine (epic `atmosphere` P1).
 * - Once, plain, blue;  it never changes.
 * - NEVER throws:  a page that can't show it still reads.
 */
export function showNoSignInYet(name: string): void {
  if (typeof document === "undefined") return
  try {
    const bar = document.createElement("ui-message")
    bar.classList.add("spell-sign-in")
    bar.setAttribute("color", "blue")
    bar.textContent = core.message("sign-in-not-yet", { place: name.replace(/_/g, " ") })
    const root = core.domRoot()
    ;(root === document ? document.body : (root as ShadowRoot))?.prepend(bar)
  } catch (ignored) {
    console.error(`core.place():  can't say that ${name} has no sign-in yet`, ignored)
  }
}

/** The bar, as things stand. */
function drawInto(bar: HTMLElement, placeName: string, place: Place): void {
  const signIn = place.signIn!
  const { status, problem } = signIn
  bar.setAttribute("color", problem ? "red" : COLORS[status])
  const words = core.message(WORDS[status], { place: placeName, name: place.currentPerson?.().name ?? "" })
  const text = document.createElement("span")
  text.textContent = problem ? core.message("sign-in-failed", { why: problem }) : words
  const parts: HTMLElement[] = [text]
  if (status === "signed in") parts.push(buttonFor("sign-out", () => void signIn.signOut()))
  else if (status !== "signing in") parts.push(...signInParts(signIn))
  bar.replaceChildren(...parts)
}

/** Who they are, and Sign in:  a failure says so on the bar, as the sign-in keeps it. */
function signInParts(signIn: NonNullable<Place["signIn"]>): HTMLElement[] {
  const who = document.createElement("ui-input") as HTMLElement & { value?: string }
  who.setAttribute("placeholder", core.message("sign-in-who"))
  who.setAttribute("aria-label", core.message("sign-in-who"))
  const go = () => {
    const name = `${who.value ?? ""}`.trim()
    if (name) signIn.signIn(name).catch(() => undefined)
  }
  who.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Enter") go()
  })
  return [who, buttonFor("sign-in", go)]
}

/** A button saying the message `key`. */
function buttonFor(key: "sign-in" | "sign-out", click: () => void): HTMLElement {
  const button = document.createElement("ui-button")
  button.textContent = core.message(key)
  button.addEventListener("click", click)
  return button
}
