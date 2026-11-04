import type { SignInAsker } from "spell/util/places/SpellSignIn"

/** How long a sign-in request (and its link and code) is good for, in minutes. */
export const SIGN_IN_MINUTES = 10

/** How many wrong codes a request takes before it's refused for good:  a new one must be asked for. */
export const CODE_TRIES = 5

/** How long a device stays signed in, in days. */
export const SESSION_DAYS = 30

/** The cookie a signed-in device carries. */
export const SESSION_COOKIE = "spell-session"

/** Where a sign-in link opens:  its confirm page, with one button. */
export const CONFIRM_PAGE = "/sign-in/confirm"

/** Where the local mail catcher lists every mail it caught. */
export const MAIL_PAGE = "/sign-in/mail"

/** Every reason a sign-in is refused. */
export const SignInRefusals = [
  "not invited",
  "no such request",
  "wrong code",
  "too many tries",
  "expired",
  "used",
  "taken down"
] as const
/**
 * Why a sign-in was refused:
 * - `"not invited"`:  no Spell account has that email, and the server is invite only
 * - `"no such request"`:  nothing's waiting by that id, link or email
 * - `"wrong code"`:  try again, up to `CODE_TRIES`
 * - `"too many tries"`:  that request's done:  ask for a new one
 * - `"expired"`:  older than `SIGN_IN_MINUTES`
 * - `"used"`:  its link or code already signed someone in
 * - `"taken down"`:  Spell took the account down (epic `atmosphere` P6):  it can't sign in until it's put back
 */
export type SignInRefusal = (typeof SignInRefusals)[number]

/** What a `SignInError` says of itself. */
export type SignInErrorCause = {
  /** Why. */
  kind: SignInRefusal
}

/** Thrown by `SignIns` when a sign-in is refused:  its message is for people, `cause.kind` says which. */
export class SignInError extends Error {
  declare cause: SignInErrorCause | undefined
  /** Why. */
  get kind(): SignInRefusal | undefined {
    return this.cause?.kind
  }
}
SignInError.prototype.name = "SignInError"

/** One mail, as the mail seam sends it. */
export type Mail = {
  /** Its one address. */
  to: string
  /** Its subject line. */
  subject: string
  /** Its words, as plain text:  the link and the code on lines of their own. */
  text: string
}

/** A mail as the catcher kept it:  when, and its file. */
export type CaughtMail = Mail & {
  /** When it was sent, ms. */
  sentAt: number
  /** Its file's name, in the catcher's folder. */
  file: string
}

/**
 * The ONE seam mail goes through:  "send this mail".
 * - `MailCatcher` keeps every mail in a folder, for tests and this machine;  a real sender (a mail service's API,
 *   epic `atmosphere` Q12) is another of these.
 * - throws if it can't send:  the sign-in is refused, and says why
 */
export type Mailer = {
  /** Send `mail`. */
  send(mail: Mail): Promise<void>
  /** Every mail it kept, newest first:  only a catcher has them. */
  caught?(): Promise<CaughtMail[]>
}

/**
 * The accounts a sign-in signs into:  the app's people store says (`SpellAccounts`), as the kit knows no people.
 * - An address is a Spell account's, `ana@spell`.
 */
export type SignInAccounts = {
  /** The account with this email;  `undefined` for none:  the server is invite only. */
  accountFor(email: string): Promise<string | undefined>
  /** Make an account for `email`, or find the one it has:  its address.  - throws if it can't */
  invite(email: string): Promise<string>
  /** Is the account `person` (`ana@spell`) taken down, so it can't sign in (epic `atmosphere` P6)?  Left out:  none is. */
  isTakenDown?(person: string): Promise<boolean>
}

/** One device's sign-in, as it's kept. */
export type Session = {
  /** Their account's address, `ana@spell`. */
  person: string
  /** The email it came by. */
  email: string
  /** When it ends, ms. */
  ends: number
}

/** A device signed in now:  the cookie it's to keep, and who. */
export type SessionMade = {
  /** The secret the cookie holds:  never kept, only its hash. */
  token: string
  /** Their account's address. */
  person: string
  /** The email it came by. */
  email: string
}

/** Where a sign-in request was asked from, for its link's page:  the shape the page reads. */
export type { SignInAsker }
