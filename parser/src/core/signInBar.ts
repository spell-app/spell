/**
 * What shows of a person's sign-in, on a place where each person is someone (epic `data` P16):  always there, and plain.
 * - Who's signed in, with Sign out;  or who isn't, with a field and Sign in;  and when it's ended, that it has, and what's kept.
 * - The two kinds of account, named apart:
 *   - a Spell account:  an email, then "check your email" with a box for its code (epic `atmosphere` P3)
 *   - an atmosphere account:  a handle
 * - The cloud's bar, with nobody signed in:  what's changed is kept in this browser until someone signs in
 *   (`identifiesBy: "a sign-in"`, epic `atmosphere` P8).
 * - A Spell account's bar, with nobody signed in, also says where to report abuse:
 *   the host's abuse contact, as its server said it (`PlaceSignIn.abuseContact`, epic `atmosphere` P6).
 * - A Spell account's bar, where its server signs people in with Bluesky too (epic `atmosphere` P19):
 *   - nobody signed in:  "Sign in with Bluesky" beside the email field;  a handle typed there is who
 *   - signed in:  "Link a Bluesky account", or which one is linked
 *   - coming back refused:  why, in the page's language (`PlaceSignIn.refused`)
 * - A program writes nothing for it:  as with a read's riders, a person should never be left guessing.
 * - A program with a toolbar of its own can draw it there instead:  `{the sign in menu}`, a button and a drop-down
 *   (`signInMenu()`, epic `atmosphere` T56).
 * - On the page's Spell UI, by its tags, as a read's failure message is:  core never imports Spell UI.
 * - Plain DOM, drawn again as the sign-in changes:  no Solid, as nothing here belongs to the program's drawing.
 * - Above the app, in `core.domRoot()`.  With no page, as under `spell run`:  nothing.
 * - Imports `spell/places` as a TYPE only.
 */
import type { AtProtoRefusal, Place, PlaceSignIn, SignInStatus } from "spell/places/places.types"

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

/**
 * The cloud's, nobody signed in (epic `atmosphere` P8).
 * - It takes nobody to be this machine's person,
 *   so it says what's changed is kept in this browser until someone signs in.
 */
const CLOUD_WORDS: Partial<Record<SignInStatus, CoreMessageKey>> = {
  "signed out": "sign-in-cloud-signed-out"
}

/** Why coming back from Bluesky didn't sign in, as the bar says it (epic `atmosphere` P19). */
const REFUSED_WORDS: Record<AtProtoRefusal, CoreMessageKey> = {
  "not linked": "sign-in-not-linked",
  "taken down": "sign-in-taken-down",
  "linked elsewhere": "sign-in-linked-elsewhere"
}

/** What a typed email looks like:  a Bluesky handle has no `@` in its middle. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** What it colours itself by, by where the sign-in stands:  an ending is what mustn't be missed. */
const COLORS: Record<SignInStatus, string> = {
  "signed out": "blue",
  "signing in": "blue",
  "waiting for a code": "blue",
  "signed in": "green",
  ended: "yellow"
}

/** Each sign-in a bar or a menu shows already. */
const SHOWN = new WeakSet<object>()

/** What each running program shows of its sign-ins:  the menu it draws, if it does, and what shows as a bar. */
const SHOWING = new WeakMap<object, ProgramSignIns>()

/** Stands for the running program where none is:  a test of this file. */
const NO_PROGRAM = {}

/**
 * SIDE EFFECT:  shows the sign-in of `place`, called `name`, until the page goes:
 * in the person menu, if the program draws one and it's free, else on a bar above the app.
 * - One for each sign-in:  two places on one server, which share it, show one.
 * - NEVER throws:  a page that can't show it still reads.
 */
export function showSignIn(name: string, place: Place): void {
  const { signIn } = place
  if (!signIn || typeof document === "undefined") return
  // two places on one server share one sign-in (a sign-up sheet and its published sheet):  one for both
  if (SHOWN.has(signIn)) return
  SHOWN.add(signIn)
  try {
    const showing = programSignIns()
    const shown: ShownSignIn = { name: name.replace(/_/g, " "), place, draw: () => undefined }
    if (showing.menu && !showing.menu.shown) putInMenu(showing.menu, shown)
    else putOnBar(showing, shown)
    signIn.onChange(() => shown.draw())
    place.onPeopleHere?.(() => shown.draw())
  } catch (ignored) {
    console.error(`core.place():  can't show who's signed in to ${name}`, ignored)
  }
}

/**
 * The person menu:  what `the sign in menu` compiles to, for a program with a toolbar of its own.
 * - A button naming who's signed in, or saying Sign in, opening what the bar would have said and offered.
 * - It takes the program's first sign-in:  a bar that's already up goes.  A second sign-in still gets a bar.
 * - The same element every time it's drawn, as the sign-in belongs to the program, not to one drawing.
 * - A Spell UI button and popup, by their tags:  core never imports Spell UI.
 * - With no page, as under `spell run`:  nothing.
 */
export function signInMenu(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined
  const showing = programSignIns()
  if (showing.menu) return showing.menu.element
  const menu = newMenu()
  showing.menu = menu
  const waiting = showing.bars.shift()
  if (waiting) {
    waiting.bar?.remove()
    delete waiting.bar
    putInMenu(menu, waiting)
  }
  return menu.element
}

/** What the running program shows of its sign-ins. */
function programSignIns(): ProgramSignIns {
  const program = core.RUNTIME ?? NO_PROGRAM
  let showing = SHOWING.get(program)
  if (!showing) {
    showing = { bars: [] }
    SHOWING.set(program, showing)
  }
  return showing
}

/** SIDE EFFECT:  `shown` draws on a bar of its own, above the app. */
function putOnBar(showing: ProgramSignIns, shown: ShownSignIn): void {
  const bar = document.createElement("ui-message")
  bar.classList.add("spell-sign-in")
  const root = core.domRoot()
  ;(root === document ? document.body : (root as ShadowRoot))?.prepend(bar)
  shown.bar = bar
  shown.draw = () => drawBar(bar, shown)
  showing.bars.push(shown)
  shown.draw()
}

/** SIDE EFFECT:  `shown` draws in `menu`. */
function putInMenu(menu: PersonMenu, shown: ShownSignIn): void {
  menu.shown = shown
  shown.draw = () => drawMenu(menu, shown)
  shown.draw()
}

/** A person menu with nothing to show yet:  it stays out of sight until a place has a sign-in. */
function newMenu(): PersonMenu {
  const element = document.createElement("span")
  element.classList.add("spell-sign-in-menu")
  element.style.display = "none"
  const button = document.createElement("ui-button")
  button.setAttribute("icon", "user circle")
  button.setAttribute("appearance", "basic")
  const popup = document.createElement("ui-popup")
  popup.setAttribute("open-on", "click")
  popup.setAttribute("position", "bottom right")
  const panel = document.createElement("ui-stack")
  panel.setAttribute("spacing", "sm")
  panel.style.minWidth = "16rem"
  popup.append(panel)
  element.append(button, popup)
  return { element, button, popup, panel }
}

/** The menu, as things stand:  its button says who, and turns the bar's colour when something's wrong. */
function drawMenu(menu: PersonMenu, shown: ShownSignIn): void {
  const { place } = shown
  const signIn = place.signIn!
  const { status, problem, refused } = signIn
  menu.element.style.display = ""
  if (problem || refused) menu.button.setAttribute("color", "red")
  else if (status === "ended") menu.button.setAttribute("color", COLORS.ended)
  else menu.button.removeAttribute("color")
  // signing in or out is done:  the menu is in the way of the page
  if (status !== menu.status && (status === "signed in" || status === "signed out")) menu.popup.visible = false
  menu.status = status
  const name = personName(place)
  const words = status === "signed in" && !problem ? core.message("sign-in-menu-as", { name }) : undefined
  menu.button.textContent = status === "signed in" ? name : core.message("sign-in")
  menu.button.title = words ?? core.message("sign-in")
  menu.panel.replaceChildren(...partsFor(shown, words))
}

/** The bar, as things stand. */
function drawBar(bar: HTMLElement, shown: ShownSignIn): void {
  const { status, problem, refused } = shown.place.signIn!
  bar.setAttribute("color", problem || refused ? "red" : COLORS[status])
  bar.replaceChildren(...partsFor(shown))
}

/** Who's signed in to `place`, as the page calls them. */
function personName(place: Place): string {
  return place.signIn?.person?.name ?? place.currentPerson?.().name ?? ""
}

/** What the sign-in says and offers, as things stand:  `words` in place of what the bar would say, if given. */
function partsFor({ name: placeName, place }: ShownSignIn, words?: string): HTMLElement[] {
  const signIn = place.signIn!
  const { status, problem, refused } = signIn
  const isCloud = place.describe().identifiesBy === "a sign-in"
  const key =
    (isCloud && CLOUD_WORDS[status]) || (signIn.account === "Spell account" && SPELL_WORDS[status]) || WORDS[status]
  const said = words ?? core.message(key, { place: placeName, name: personName(place), email: signIn.sentTo ?? "" })
  const text = document.createElement("span")
  text.textContent = problem
    ? core.message("sign-in-failed", { why: problem })
    : refused
      ? core.message(REFUSED_WORDS[refused])
      : said
  const parts: HTMLElement[] = [text]
  if (status === "signed in") {
    parts.push(buttonFor("sign-out", () => void signIn.signOut()))
    if (signIn.offersAtProto) parts.push(...linkedParts(signIn))
  } else if (status === "waiting for a code" && signIn.enterCode) parts.push(...codeParts(signIn))
  else if (status !== "signing in") parts.push(...signInParts(signIn))
  if (status !== "signed in" && signIn.abuseContact) parts.push(abuseLine(signIn.abuseContact))
  return parts
}

/** One sign-in, as a program shows it. */
type ShownSignIn = {
  /** The place's name, as the bar says it. */
  name: string
  /** The place it's the sign-in of. */
  place: Place
  /** Its bar, while it's on one. */
  bar?: HTMLElement
  /** Draws it again, wherever it shows. */
  draw: () => void
}

/** A program's person menu (`signInMenu()`). */
type PersonMenu = {
  /** What the program draws. */
  element: HTMLElement
  /** The button that opens it. */
  button: HTMLElement
  /** What the button opens. */
  popup: HTMLElement & { visible?: boolean }
  /** What it says and offers. */
  panel: HTMLElement
  /** Where the sign-in stood when it last drew. */
  status?: SignInStatus
  /** The sign-in it shows, once one's there. */
  shown?: ShownSignIn
}

/** What one running program shows of its sign-ins. */
type ProgramSignIns = {
  /** Its person menu, once it's drawn one. */
  menu?: PersonMenu
  /** Each sign-in showing as a bar. */
  bars: ShownSignIn[]
}

/**
 * Who they are, and Sign in:  a failure says so on the bar, as the sign-in keeps it.  A Spell account's is an email.
 * - and "Sign in with Bluesky", where it's offered:  a handle in the field is who;  an email or nothing, Bluesky asks
 */
function signInParts(signIn: PlaceSignIn): HTMLElement[] {
  const isSpell = signIn.account === "Spell account"
  const parts = fieldAndButton({
    label: isSpell ? "sign-in-email" : "sign-in-who",
    button: isSpell ? "sign-in-email-me" : "sign-in",
    go: (who) => signIn.signIn(who),
    // a handle can go in it too, for Bluesky:  so plain text, not an email field
    ...(isSpell && !signIn.offersAtProto && { type: "email" })
  })
  if (isSpell && signIn.offersAtProto && signIn.signInAtProto) {
    const field = parts[0] as HTMLElement & { value?: string }
    parts.push(
      buttonFor("sign-in-bluesky", () => {
        const typed = `${field.value ?? ""}`.trim()
        void signIn.signInAtProto!(typed && !EMAIL.test(typed) ? typed : undefined)
      })
    )
  }
  return parts
}

/** A Spell account signed in:  the Bluesky account linked to it, or a button that links one. */
function linkedParts(signIn: PlaceSignIn): HTMLElement[] {
  if (signIn.linkedHandle) {
    const line = document.createElement("small")
    line.classList.add("spell-sign-in-linked")
    line.style.display = "block"
    line.textContent = core.message("sign-in-linked", { handle: signIn.linkedHandle })
    return [line]
  }
  return signIn.linkAtProto ? [buttonFor("sign-in-link-bluesky", () => void signIn.linkAtProto!())] : []
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
