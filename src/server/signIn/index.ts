/**
 * Barrel for `spell/server/signIn`:  signing in to a Spell account by email, a link and a code (epic `atmosphere` P3).
 * - `SignInCheck`:  the ONE sign-in check of a server:  who's signed in, on every request (`request.person`);
 *   and its routes, under `/api/sign-in/`, with the link's confirm page.
 * - `SignIns`:  the rules:  one-time requests, codes, links, the signed-in devices.
 * - `MailCatcher`:  the local mail catcher, a file per mail, behind the one mail seam (`Mailer`).
 * - `ReadCredentials`:  credentials to read a whole space straight from its files, signed by this server
 *   (epic `atmosphere` P5).
 * - Its page half is `SpellSignIn`, in `spell/util/places`.
 * - NOT in the `spell/server` barrel:  it's opt-in, like `spell/server/places`.
 * - Node only.  Knows no people:  the app's accounts are handed in (`SignInAccounts`).
 */

export * from "./signIn.types"
export * from "./SignIns"
export * from "./MailCatcher"
export * from "./SignInCheck"
export * from "./ReadCredentials"
