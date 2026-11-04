/**
 * What shows of a person's sign-in, on a place where each person is someone (epic `data` P16):  always there, and plain.
 * - Who's signed in, with Sign out;  or who isn't, with a field and Sign in;  and when it's ended, that it has, and what's kept.
 * - The two kinds of account named apart:  a Spell account (an email, then "check your email" with a box for its code,
 *   epic `atmosphere` P3), and an atmosphere account (a handle).
 * - A Spell account's bar, with nobody signed in, also says where to report abuse:  the host's abuse contact, as its
 *   server said it (`PlaceSignIn.abuseContact`, epic `atmosphere` P6).
 * - A program writes nothing for it:  as with a read's riders, a person should never be left guessing.
 * - On the page's Spell UI, by its tags, as a read's failure message is:  core never imports Spell UI.
 * - Plain DOM, drawn again as the sign-in changes:  no Solid, as nothing here belongs to the program's drawing.
 * - Above the app, in `core.domRoot()`.  With no page, as under `spell run`:  nothing.
 * - Imports `spell/util/places` as a TYPE only.
 */
import type { Place, PlaceSignIn, SignInStatus } from "spell/util/places/places.types"

import type { CoreMessageKey } from "./core.types"
import { core } from "./core"

/** The words the bar says, by where the sign-in stands:  an atmosphere account's. */
const WORDS: Record<SignInStatus, CoreMessageKey> = {
  "signed out": "sign-in-signed-out",
  "signing in": "sign-in-signing",
  "waiting for a code": "sign-in-check-email",
  "signed in": "sign-in-as",
  ended: "sign-in-ended"
}

/** A Spell account's, where they differ:  the bar names the two kinds of account apart (epic `atmosphere` P3). */
const SPELL_WORDS: Partial<Record<SignInStatus, CoreMessageKey>> = {
  "signed out": "sign-in-spell-signed-out",
  "signed in": "sign-in-as-spell"
}

/** What it colours itself by, by where the sign-in stands:  an ending is what mustn't be missed. */
const COLORS: Record<SignInStatus, string> = {
  "signed out": "blue",
  "signing in": "blue",
  "waiting for a code": "blue",
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

/** The bar, as things stand. */
function drawInto(bar: HTMLElement, placeName: string, place: Place): void {
  const signIn = place.signIn!
  const { status, problem } = signIn
  bar.setAttribute("color", problem ? "red" : COLORS[status])
  const key = (signIn.account === "Spell account" && SPELL_WORDS[status]) || WORDS[status]
  const name = signIn.person?.name ?? place.currentPerson?.().name ?? ""
  const words = core.message(key, { place: placeName, name, email: signIn.sentTo ?? "" })
  const text = document.createElement("span")
  text.textContent = problem ? core.message("sign-in-failed", { why: problem }) : words
  const parts: HTMLElement[] = [text]
  if (status === "signed in") parts.push(buttonFor("sign-out", () => void signIn.signOut()))
  else if (status === "waiting for a code" && signIn.enterCode) parts.push(...codeParts(signIn))
  else if (status !== "signing in") parts.push(...signInParts(signIn))
  if (status !== "signed in" && signIn.abuseContact) parts.push(abuseLine(signIn.abuseContact))
  bar.replaceChildren(...parts)
}

/** Who they are, and Sign in:  a failure says so on the bar, as the sign-in keeps it.  A Spell account's is an email. */
function signInParts(signIn: PlaceSignIn): HTMLElement[] {
  const isSpell = signIn.account === "Spell account"
  return fieldAndButton({
    label: isSpell ? "sign-in-email" : "sign-in-who",
    button: isSpell ? "sign-in-email-me" : "sign-in",
    go: (who) => signIn.signIn(who),
    ...(isSpell && { type: "email" })
  })
}

/** The code the email carried, and Sign in. */
function codeParts(signIn: PlaceSignIn): HTMLElement[] {
  return fieldAndButton({ label: "sign-in-code", button: "sign-in", go: (code) => signIn.enterCode!(code) })
}

/** A field labelled `label`, and a button saying `button`:  Enter or the button hand `go()` what's typed. */
function fieldAndButton({ label, button, go, type }: FieldAndButton): HTMLElement[] {
  const field = document.createElement("ui-input") as HTMLElement & { value?: string }
  field.setAttribute("placeholder", core.message(label))
  field.setAttribute("aria-label", core.message(label))
  if (type) field.setAttribute("type", type)
  const send = () => {
    const typed = `${field.value ?? ""}`.trim()
    if (typed) go(typed).catch(() => undefined)
  }
  field.addEventListener("keydown", (event) => {
    if ((event as KeyboardEvent).key === "Enter") send()
  })
  return [field, buttonFor(button, send)]
}

/** What `fieldAndButton()` makes. */
type FieldAndButton = {
  /** The field's words. */
  label: CoreMessageKey
  /** The button's. */
  button: CoreMessageKey
  /** What's typed goes here. */
  go: (typed: string) => Promise<void>
  /** The field's type:  `email`.  Left out:  text. */
  type?: string
}

/** Where to report abuse, quietly, on a line of its own. */
function abuseLine(contact: string): HTMLElement {
  const line = document.createElement("small")
  line.classList.add("spell-sign-in-abuse")
  line.style.display = "block"
  line.textContent = core.message("sign-in-abuse", { contact })
  return line
}

/** A button saying the message `key`. */
function buttonFor(key: CoreMessageKey, click: () => void): HTMLElement {
  const button = document.createElement("ui-button")
  button.textContent = core.message(key)
  button.addEventListener("click", click)
  return button
}
