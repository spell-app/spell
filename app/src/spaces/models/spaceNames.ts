/**
 * Spaces' OWN names:  a space's or a project's special files and folders (decision Q33).
 * - Never one of its projects or source files.
 * - Each starts with `__`, so it sorts to the top and needs no quoting in a shell.
 * - Known by this LIST, never by the `__` alone (decision J52).
 *   - Python's `__init__.py`, a tests' `__snapshots__/` or a pack template's `__Class__.tsx.template`
 *     start with `__` too, and stay one of a project's files.
 *   - Rule of thumb:  ours never END in `__`.
 * - `__project.json5` is a project's file since JSON5 Everywhere (P12):  one still named `project.json` is read too.
 */
export const SPACE_NAMES = [
  "__me.json5",
  "__org.json5",
  "__project.json5",
  "__members",
  "__settings",
  "__sessions",
  "__docs",
  "__data",
  "__friend-lists",
  "__parts",
  "__pack",
  "__prefs",
  "__draft",
  "__takedowns.json5",
  "__files",
  "__files.list.json",
  "__blobs",
  "__apps",
  "__apps.list.json",
  "__admin",
  "__private",
  "__inbox",
  "__attendees"
] as const

/**
 * An org's ADMIN SPACE, its own folder, `@rs/__admin/` (epic `atmosphere` P20, Q25 A):
 * who manages what (its roster) and the log of every change to it.
 * - One of spaces' own names, so no project can take it.
 */
export const ADMIN_SPACE = "__admin"

/**
 * A PRIVATE SPACE's folder (epic `atmosphere` P22, Q25 A):  `@rs/__private/`, `finance_team@rs/__private/`,
 * beside its shared space, reached only by that space's Managers;  pages show it as "private".
 * - One of spaces' own names, so no project or folder of the shared space can take it.
 */
export const PRIVATE_SPACE = "__private"

/**
 * A person's INBOX in an org, its own folder (epic `atmosphere` P29, Q23 A):  `ana@rs/__inbox/`, where Spell writes
 * the messages people send her;  she, the Board and the Admins read it.
 * - People call it "the inbox";  the code's `PersonInbox`, so it's never taken for the epic engine's review inbox.
 * - One of spaces' own names, so no project or folder of her own space can take it.
 * - `@rs/__inbox`, the org's address with no person, stands for whoever's asking:  their inbox in RS, so one program
 *   reads each person's own (`SpaceFolders`).
 */
export const INBOX_SPACE = "__inbox"

/**
 * An event's ATTENDEES' SPACE, a third beside a project's two (epic `atmosphere` P31):  `picnic@rs/__attendees/`,
 * read by those whose ticket was confirmed, and managed by the project's Managers.
 * - Its list is its own:  a confirmed ticket puts its guest on it (the app's `SpaceSheets`), and its Managers may add
 *   or take anyone off.
 * - One of spaces' own names, so no project or folder of the shared space can take it.
 */
export const ATTENDEES_SPACE = "__attendees"

/** The collection of an inbox its messages and pointers are in (epic `atmosphere` P29):  a post's, by the kit's rules. */
export const INBOX_MESSAGES = "messages"

/**
 * The collection of an inbox that says how its person hears of it by mail (epic `atmosphere` P30):  a program's
 * "mail choice", its `how` one of `MAIL_CHOICES`.  The first one counts;  none:  a daily digest.
 */
export const INBOX_MAIL = "mail_choices"

/**
 * How someone hears of what lands in their inbox, by mail (epic `atmosphere` P30):
 * - `"each"`:  one mail per message
 * - `"digest"`:  one mail a day, every new message in it (the default)
 * - `"none"`:  no mail;  they open the inbox
 */
export const MAIL_CHOICES = ["each", "digest", "none"] as const
/** One of `MAIL_CHOICES`. */
export type MailChoice = (typeof MAIL_CHOICES)[number]

/**
 * The collection of an inbox that lists what its person SUBSCRIBES to (epic `atmosphere` P30):  each thing a shared
 * space of the org, `{ space: "events_team@rs" }`, whose new things reach the inbox as updates.
 */
export const INBOX_SUBSCRIPTIONS = "subscriptions"

/** Is `name` (a file or folder's name, no path) one of spaces' own (`SPACE_NAMES`)? */
export function isSpaceName(name: string): boolean {
  return (SPACE_NAMES as readonly string[]).includes(name)
}
