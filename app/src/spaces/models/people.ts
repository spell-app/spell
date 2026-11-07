/**
 * What the app and the server say about people, over `/api/people/...` (epic `people-and-orgs` P9).
 * - Plain JSON, so the app needs no people library to show one.
 * - Types only:  safe in a browser.
 * - The server's side:  `PeopleStore` (`spell/app/spaces/server/node/people/PeopleStore`), and its routes.
 */

import type { ThingKind } from "spell/places/places.types"

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

/** A kind of thing nobody of that role makes, changes or removes. */
const NO_RIGHTS = { make: false, change: "none", remove: "none" } as const

/**
 * A membership's role, in a space's own list or an org's, as the people library's `Membership` has it.
 * - One of the space roles (`SpaceRole`), or Spell's own `spell-admin`.
 * - Or an older file's word, still read:  guest, member, admin (`OLD_ROLES`).
 */
export type Role = SpaceRole | "spell-admin" | keyof typeof OLD_ROLES

/**
 * The ONE table of a space's roles, and what each lets a member do (epic `atmosphere` P20, Q21 D):
 * everyone on a space's list is a MEMBER of it, whatever their role.
 * - viewer:  reads;  posts and comments where the space lets its viewers (`viewersPost`), and changes only their own
 * - editor:  also changes any existing page, sheet or row;  makes no new page, sheet or app (Q21 D, P23)
 * - manager:  also makes pages, sheets and apps (`canCreate`), removes anything (never edits someone's post), adds
 *   and removes people, changes the space's settings and deletes it
 * - "manager", not "admin" (Q20 A):  "admin" is only an org's technical Admins
 * - Its rights, each a yes or no:
 *   - `canRead`, `canWrite`, `canManage`:  what a member is told (the kit's `SpaceMember`), as a Space's member list
 *     has them;  `canWrite` is "writes more than their own posts"
 *   - `canCreate`:  makes something new, a page, a sheet or an app (P23):  the editor app hides "New page" without it
 *   - `canChangeAny`:  may change anyone's rows in a program's own folder, not only their own (`SpaceMembers.keeps()`)
 *   - `things`:  what it may do to each kind of thing (`ThingRights`), checked where a write lands
 *     (`SpaceMembers.changeOrDie()`, P23)
 * - Publish By Role (P26) adds the right to publish.
 * - Types only and plain data:  safe in a browser.
 */
export const SPACE_ROLES = {
  viewer: {
    canRead: true,
    canWrite: false,
    canCreate: false,
    canChangeAny: false,
    canManage: false,
    things: {
      post: { make: true, change: "own", remove: "own" },
      row: NO_RIGHTS,
      file: NO_RIGHTS,
      app: NO_RIGHTS
    }
  },
  editor: {
    canRead: true,
    canWrite: true,
    canCreate: false,
    canChangeAny: false,
    canManage: false,
    things: {
      post: { make: true, change: "own", remove: "own" },
      row: { make: true, change: "any", remove: "own" },
      file: { make: true, change: "any", remove: "own" },
      app: NO_RIGHTS
    }
  },
  manager: {
    canRead: true,
    canWrite: true,
    canCreate: true,
    canChangeAny: true,
    canManage: true,
    things: {
      post: { make: true, change: "own", remove: "any" },
      row: { make: true, change: "any", remove: "any" },
      file: { make: true, change: "any", remove: "any" },
      app: { make: true, change: "any", remove: "any" }
    }
  }
} as const satisfies Record<string, SpaceRoleRights>

/** A role in a space:  viewer, editor or manager (`SPACE_ROLES`). */
export type SpaceRole = keyof typeof SPACE_ROLES

/** What a space role lets a member do:  see `SPACE_ROLES`. */
export type SpaceRoleRights = {
  canRead: boolean
  canWrite: boolean
  canCreate: boolean
  canChangeAny: boolean
  canManage: boolean
  /** What it may do to each kind of thing:  a post, a row, a file, an app. */
  things: Record<ThingKind, ThingRights>
}

/**
 * What a role may do to one kind of thing (epic `atmosphere` P23):
 * - `make`:  make a new one
 * - `change`, `remove`:  `"any"` one, only their `"own"` (whose `by` is them), or `"none"`
 */
export type ThingRights = { make: boolean; change: ThingReach; remove: ThingReach }

/** Whose things a right reaches:  anyone's, only their own, or nobody's. */
export type ThingReach = "any" | "own" | "none"

/**
 * The space role that's the least that may do `action` to a `kind` of thing:  what a refusal says it `needs`.
 * - `rightsOf`:  each role's rights in this space, its settings applied (`SpaceMembers`);  the table's, without.
 * - `"manager"` when no role may:  a manager is asked.
 */
export function leastRoleFor(
  kind: ThingKind,
  action: ThingAction,
  isOwn: boolean,
  rightsOf: (role: SpaceRole) => SpaceRoleRights = (role) => SPACE_ROLES[role]
): SpaceRole {
  return (
    (Object.keys(SPACE_ROLES) as SpaceRole[]).find((role) => mayDo(rightsOf(role), kind, action, isOwn)) ?? "manager"
  )
}

/** What's done to a thing:  made new, changed, or removed. */
export type ThingAction = "make" | "change" | "remove"

/** Does `rights` let a member do `action` to a `kind` of thing, their own (`isOwn`) or someone else's? */
export function mayDo(rights: SpaceRoleRights, kind: ThingKind, action: ThingAction, isOwn: boolean): boolean {
  const right = rights.things[kind]
  if (action === "make") return right.make
  const reach = right[action]
  return reach === "any" || (reach === "own" && isOwn)
}

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
