import type { SignInAsker } from "spell/places/SpellSignIn"

/**
 * How long a sign-in request (and its link and code) is good for, in minutes, by default:  nothing done by then, it ends.
 * - A server sets its own:  `SignInsProps.minutes` (the app's `SPELL_SIGN_IN_MINUTES`).
 */
export const SIGN_IN_MINUTES = 20

/** How many wrong codes a request takes before it's refused for good:  a new one must be asked for. */
export const CODE_TRIES = 5

/**
 * How many wrong passwords an account (or an email nobody has:  they read the same) takes before it has to wait.
 * - Then `PASSWORD_WAIT_MINUTES`, every try refused, the right one too.
 */
export const PASSWORD_TRIES = 5

/** How many wrong passwords one internet address takes, whoever it names:  more than an account's, for a household or an office. */
export const PASSWORD_ADDRESS_TRIES = 20

/** How long too many wrong passwords have to wait, in minutes. */
export const PASSWORD_WAIT_MINUTES = 15

/** A password's fewest characters:  the only rule about what's in one. */
export const PASSWORD_LEAST = 8

/** A password's most characters:  hashing is deliberately slow, so what it's handed stays small. */
export const PASSWORD_MOST = 256

/**
 * How long a sign-in by emailed link or code counts as proof, in minutes:
 * changing a password without the current one, which is how "forgot my password" works.
 */
export const PASSWORD_PROOF_MINUTES = 20

/** How a device signed in, for what it's trusted to do afterwards. */
export type SignInWay = "email" | "password" | "linked account"

/** How long a device stays signed in, in days. */
export const SESSION_DAYS = 30

/** The cookie a signed-in device carries. */
export const SESSION_COOKIE = "spell-session"

/** Where a sign-in link opens:  its confirm page, with one button. */
export const CONFIRM_PAGE = "/sign-in/confirm"

/** Where an atmosphere account's host sends the browser back to, once they've signed in there (epic `atmosphere` P19). */
export const ATPROTO_BACK_PAGE = "/api/sign-in/atproto/back"

/** Where the server's client file is, which a host reads to know who's asking:  only on an `https` address. */
export const ATPROTO_CLIENT_FILE = "/api/sign-in/atproto/client.json"

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
  "taken down",
  "not linked",
  "linked elsewhere",
  "wrong password",
  "bad password",
  "needs proof"
] as const
/**
 * Why a sign-in was refused:
 * - `"not invited"`:  no Spell account has that email, and the server is invite only
 * - `"no such request"`:  nothing's waiting by that id, link or email
 * - `"wrong code"`:  try again, up to `CODE_TRIES`
 * - `"too many tries"`:  that request's done:  ask for a new one
 * - `"expired"`:  older than its server's minutes (`SignIns.minutes`, default `SIGN_IN_MINUTES`)
 * - `"used"`:  its link or code already signed someone in
 * - `"taken down"`:  Spell took the account down (epic `atmosphere` P6):  it can't sign in until it's put back
 * - `"not linked"`:  an atmosphere (Bluesky) account no Spell account here is linked to (epic `atmosphere` P19):
 *   the server is invite only, so they ask for an invite, sign in by email, and link it
 * - `"linked elsewhere"`:  linking an atmosphere account another Spell account here is linked to already
 * - `"wrong password"`:  that email and password don't go together, or nobody has that email:  the same answer
 * - `"bad password"`:  a new password too short or too long
 * - `"needs proof"`:  changing a password takes the current one, or a sign-in by emailed link or code just now
 * - `"too many tries"` also answers too many wrong passwords:  wait, or sign in by emailed link
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
  /**
   * The account a typed name is, `ana@spell`, or an org's name for it, `ana@rs`;  `undefined` for none.
   * - Only a password's sign-in takes one (epic `atmosphere` T64):  a link has to go to an email.
   * - Left out:  only emails.
   */
  accountNamed?(name: string): Promise<string | undefined>
  /** Make an account for `email`, or find the one it has:  its address.  - throws if it can't */
  invite(email: string): Promise<string>
  /** Is the account `person` (`ana@spell`) taken down, so it can't sign in (epic `atmosphere` P6)?  Left out:  none is. */
  isTakenDown?(person: string): Promise<boolean>
  /**
   * The account an atmosphere account is linked to, by its DID;  `undefined` for none (epic `atmosphere` P19).
   * - Left out:  no account can sign in that way.
   */
  accountForDid?(did: string): Promise<string | undefined>
  /** The atmosphere account `person` is linked to;  `undefined` for none. */
  linkedOf?(person: string): Promise<LinkedAccount | undefined>
  /**
   * Link `person` to the atmosphere account `linked`, in place of any it had.
   * - throws `SignInError` `"used"` when that account is linked to someone else already
   */
  link?(person: string, linked: LinkedAccount): Promise<void>
}

/** An atmosphere (Bluesky) account a Spell account signs in with (epic `atmosphere` P19). */
export type LinkedAccount = {
  /** Its permanent id, `did:plc:...`:  what a sign-in finds the Spell account by. */
  did: string
  /** Its handle, `ana.bsky.social`, for show only:  a handle can change hands. */
  handle: string
}

/**
 * Who someone is on the atmosphere, worked out by their own host:  the ONE seam a server signs people in through with
 * an atmosphere (Bluesky) account (epic `atmosphere` P19).
 * - `AtProtoIdentity` is the real one, on AT Protocol's server sign-in library;  a test hands in its own
 *   (`spell/server/test/FakeAtProtoIdentity`).
 * - It asks only who they are (`atproto`), never the right to write:  Spell keeps nothing it could write with.
 */
export type AtProtoIdentities = {
  /**
   * Where to send the browser to sign in as `who` (a handle, a DID, or a host's address):  their host's sign-in page.
   * - `state`:  handed back to `finish()`, as it is
   * - `at`:  which of the server's addresses it was asked at, so the browser comes back there;  left out, its own
   * - throws for a `who` nobody has, or a host that can't be reached
   */
  start(who: string, state: string, at?: string): Promise<string>
  /**
   * The browser came back to `ATPROTO_BACK_PAGE` with `params`:  who signed in, and the `state` `start()` was given.
   * - `handle`:  theirs, as their DID's document says, when it says one that holds
   * - `at`:  which of the server's addresses it came back to, the one `start()` was given
   * - throws if their host refused, or the params are no answer to a `start()` of this one's
   */
  finish(params: URLSearchParams, at?: string): Promise<{ did: string; handle?: string; state: string }>
  /**
   * What goes at `ATPROTO_CLIENT_FILE`, for a host to read:  `undefined` where none's needed (a local address).
   * - `at`:  which of the server's addresses it was asked for at
   */
  clientFile?(at?: string): object | undefined
}

/** One device's sign-in, as it's kept. */
export type Session = {
  /** Their account's address, `ana@spell`. */
  person: string
  /** The email it came by;  `""` for a sign-in by a linked atmosphere account (epic `atmosphere` P19), or a typed name. */
  email: string
  /** When it ends, ms. */
  ends: number
  /** How it signed in.  Left out:  a device signed in before passwords. */
  way?: SignInWay
  /** When it signed in, ms.  Left out as `way` is. */
  at?: number
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
