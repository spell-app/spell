/**
 * What the app and the server say about people, over `/api/people/...` (epic `people-and-orgs` P9).
 * - Plain JSON, so the app needs no people library to show one.
 * - Types only:  safe in a browser.
 * - The server's side:  `PeopleStore` (`spell/app/spaces/server/node/people/PeopleStore`), and its routes.
 */

/** A person, as the "You" panel shows them:  `GET /api/people/me`'s `person`. */
export type PersonView = {
  /** Their id in their org:  `owen`, of `owen@spell`. */
  id: string
  /** Their address:  `owen@spell`. */
  address: string
  names: string
  nickname: string
  emails: string[]
  /** Each a label and a day, `"1970-01-01"`. */
  dates: { label: string; day: string }[]
}

/** What a person can change of themselves:  `POST /api/people/me`'s body.  Every field optional, the rest kept. */
export type PersonChanges = Partial<Pick<PersonView, "names" | "nickname" | "emails" | "dates">>

/**
 * A membership's role, in a space's own list or an org's, as the people library's `Membership` has it.
 * - One of the space roles (`SpaceRole`), or Spell's own `spell-admin`.
 * - Or an older file's word, still read:  guest, member, admin (`OLD_ROLES`).
 */
export type Role = SpaceRole | "spell-admin" | keyof typeof OLD_ROLES

/**
 * The ONE table of a space's roles, and what each lets a member do (epic `atmosphere` P20, Q21 D):
 * everyone on a space's list is a MEMBER of it, whatever their role.
 * - viewer:  reads
 * - editor:  also writes:  makes things, and changes their own
 * - manager:  also changes anyone's things, adds and removes people, changes the space's settings and deletes it
 * - "manager", not "admin" (Q20 A):  "admin" is only an org's technical Admins
 * - Its rights, each a yes or no:
 *   - `canRead`, `canWrite`, `canManage`:  what a member is told (the kit's `SpaceMember`)
 *   - `canChangeAny`:  may change anyone's rows in a program's own folder, not only their own (`SpaceMembers.keeps()`)
 * - Writes By Role (P23) adds a right per kind of thing, and the right to make something new;
 *   Publish By Role (P26), the right to publish.
 * - Types only and plain data:  safe in a browser.
 */
export const SPACE_ROLES = {
  viewer: { canRead: true, canWrite: false, canChangeAny: false, canManage: false },
  editor: { canRead: true, canWrite: true, canChangeAny: false, canManage: false },
  manager: { canRead: true, canWrite: true, canChangeAny: true, canManage: true }
} as const satisfies Record<string, SpaceRoleRights>

/** A role in a space:  viewer, editor or manager (`SPACE_ROLES`). */
export type SpaceRole = keyof typeof SPACE_ROLES

/** What a space role lets a member do:  see `SPACE_ROLES`. */
export type SpaceRoleRights = { canRead: boolean; canWrite: boolean; canChangeAny: boolean; canManage: boolean }

/** An older file's role, and the space role it's read as (Q21 D):  a member still makes things, as an editor. */
export const OLD_ROLES = { guest: "viewer", member: "editor", admin: "manager" } as const

/**
 * The space role `role` gives:  an older word read as its new one;  Spell's own `spell-admin`, a manager.
 * - `"admin"` => `"manager"`, `"spell-admin"` => `"manager"`, `"viewer"` => `"viewer"`
 */
export function spaceRoleFor(role: Role): SpaceRole {
  if (role === "spell-admin") return "manager"
  return role in OLD_ROLES ? OLD_ROLES[role as keyof typeof OLD_ROLES] : (role as SpaceRole)
}

/** One of a person's orgs, and their role in it:  `{ id: "spell", name: "Spell", role: "spell-admin" }`. */
export type OrgRole = { id: string; name: string; role: Role }

/** A problem a saved file has, by its file and property:  `{ file: "@spell/owen@/__me.json5", property: "names", ... }`. */
export type FileProblem = { file: string; property: string; message: string }

/** `GET` and `POST /api/people/me`'s answer:  the person, their orgs (read only), and what their files got wrong. */
export type MeAnswer = { person: PersonView; orgs: OrgRole[]; problems: FileProblem[] }
