import { readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

import { SRV } from "spell/server"
import { SPACES } from "spell/app/spaces"
import environment from "spell/app/spaces/server/node/environment"
import { isSourceCheckout } from "spell/app/spaces/server/node/spellSpacesDir"
import { prefsPersonFor, spacePrefs } from "spell/app/spaces/server/node/prefs/prefsRoutes"
import type { PrefPerson, SpacePrefs } from "spell/app/spaces/server/node/prefs/SpacePrefs"
import { respondWithJSON } from "spell/app/spaces/server/node/projects/response-utils"

/**
 * The home page's layout routes, `SPACES.HOME_LAYOUT_URL` (epic `mockup` P19, T51 "Rearrange Home Screen"):
 * its order and the words people changed on it, everyone's and each person's own.
 * - `GET`:  a `SPACES.HomeLayoutAnswer`, both layers and whose a change is.
 * - `POST`, body `SPACES.HomeLayoutChange`:  that change made, answered as `GET`.
 * - Whose a change is (`HomeLayouts.setsDefaults()`):
 *   - `@spell`'s people, in Spell's own checkout:  everyone's, the files `homeOrder.json` and `homeTexts.json` in
 *     spaces' models, committed like any other
 *   - anyone else, or anywhere else (an app that installs Spell):  their own, in their space's preferences,
 *     `__prefs/spell-home.json5`, laid over everyone's
 * - The house-network site refuses both at the editor's address (`LocalSiteServer`'s Caddy file):
 *   its visitors aren't signed in, so they'd all be this Mac's person.
 *   The page then keeps its changes on that device;  the cloud serves neither.
 * - The order of a person's own apps (`owen@spell`) is always their own, `@spell`'s people's too.
 * - A bad body is 400:
 *   - an order of a group that isn't one of `SPACES.PROJECT_GROUPS`, the person's own, the sections' or the start cards'
 *   - names that aren't folder names;  for the sections, one that isn't a section (`SPACES.HOME_SECTIONS`)
 *   - words on nothing (no `key`), or that aren't text
 */

/** `GET /api/home/order`:  see the file's docs. */
export const request_homeLayout = respondWithJSON(async (request): Promise<SPACES.HomeLayoutAnswer> =>
  homeLayouts().answerFor(prefsPersonFor(request))
)

/** `POST /api/home/order`:  see the file's docs. */
export const request_changeHomeLayout = respondWithJSON(async (request): Promise<SPACES.HomeLayoutAnswer> =>
  homeLayouts().change(prefsPersonFor(request), request.body as SPACES.HomeLayoutChange)
)

/** The ONE store of layouts, over this checkout's models folder:  made on the first call. */
let layouts: HomeLayouts | undefined
function homeLayouts(): HomeLayouts {
  return (layouts ??= new HomeLayouts({
    defaultsFolder: resolve(environment.repoDir, "src", "spaces", "models"),
    prefs: spacePrefs(),
    editsDefaults: isSourceCheckout
  }))
}

/****************
 * ### `HomeLayouts`
 * The home page's two layers, as the server keeps them:  everyone's in two files, each person's in their preferences.
 * - Its folder and prefs are handed in, so a test works on its own copies.
 * - Everyone's is read afresh each time:  the bundled copy is the files as the editor was built.
 ****************/
export class HomeLayouts {
  constructor(readonly options: HomeLayoutsOptions) {}

  /** Both layers, for `person`. */
  async answerFor(person: PrefPerson): Promise<SPACES.HomeLayoutAnswer> {
    const setsDefaults = this.setsDefaults(person)
    return { setsDefaults, defaults: this.defaults(), mine: await this.mine(person) }
  }

  /**
   * Make `change` for `person`:  everyone's, or their own (`setsDefaults()`).  Answers both layers, as `answerFor()`.
   * - throws `SRV.HttpError(400)` for a change that can't be one (the file's docs)
   */
  async change(person: PrefPerson, change: SPACES.HomeLayoutChange): Promise<SPACES.HomeLayoutAnswer> {
    checkChange(change, person)
    const defaults = this.defaults()
    // the order of their own apps is always their own:  nobody else has them
    const isOwnApps = change.order?.group === addressOf(person)
    if (this.setsDefaults(person) && !isOwnApps) {
      // "Reset to default" is a person's own:  everyone's has nothing under it
      if (!change.reset) this.writeDefaults(SPACES.withHomeChange(defaults, change))
    } else {
      const mine = SPACES.withHomeChange(await this.mine(person), change, defaults)
      const isEmpty = !Object.keys(mine.order).length && !Object.keys(mine.texts).length
      await this.options.prefs.save(person, PREFS_STORE, PREFS_KEY, isEmpty ? undefined : mine)
    }
    return this.answerFor(person)
  }

  /** Does a change by `person` change everyone's?  `@spell`'s people, where the files are the checkout's. */
  setsDefaults(person: PrefPerson): boolean {
    return this.options.editsDefaults && person.org === SPACES.SPELL_ORG
  }

  /** Everyone's layout, as its files have it now. */
  defaults(): SPACES.HomeLayout {
    return { order: this.read(ORDER_FILE), texts: this.read(TEXTS_FILE) }
  }

  /** `person`'s own changes;  none kept:  nothing. */
  async mine(person: PrefPerson): Promise<SPACES.HomeLayout> {
    const kept = (await this.options.prefs.load(person, PREFS_STORE, PREFS_KEY)) as
      | Partial<SPACES.HomeLayout>
      | undefined
    return { order: kept?.order ?? {}, texts: kept?.texts ?? {} }
  }

  /** Write everyone's layout into its two files, as the formatter leaves them (`jsonText()`). */
  private writeDefaults(layout: SPACES.HomeLayout): void {
    writeFileSync(join(this.options.defaultsFolder, ORDER_FILE), jsonText(layout.order))
    writeFileSync(join(this.options.defaultsFolder, TEXTS_FILE), jsonText(layout.texts))
  }

  /** One of everyone's files, as JSON;  none yet:  `{}`. */
  private read<T>(file: string): T {
    try {
      return JSON.parse(readFileSync(join(this.options.defaultsFolder, file), "utf8")) as T
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {} as T
      throw error
    }
  }
}

/** What `HomeLayouts` works on. */
export type HomeLayoutsOptions = {
  /** where everyone's two files are:  spaces' models folder */
  defaultsFolder: string
  /** where each person's own are kept */
  prefs: Pick<SpacePrefs, "load" | "save">
  /** may `@spell`'s people change everyone's?  Only in Spell's own checkout (`isSourceCheckout`). */
  editsDefaults: boolean
}

/** Everyone's order, and everyone's words, in the defaults folder. */
const ORDER_FILE = "homeOrder.json"
const TEXTS_FILE = "homeTexts.json"

/** Where a person's own layout is kept:  `__prefs/spell-home.json5`, under `layout`. */
const PREFS_STORE = "spell-home"
const PREFS_KEY = "layout"

/** A project's folder name:  no slash, no dot first, nothing empty. */
const FOLDER_NAME = /^[^/.][^/]*$/

/**
 * `value` as JSON, as the formatter leaves it:  two spaces in, and a list of words on one line when it fits in 120
 * characters, so a save changes only the lines it changes.
 */
export function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2).replace(
    /\[\n(\s*"[^\n]*",?\n)*\s*\]/g,
    (list, _last, at: number, all: string) => {
      const words = (JSON.parse(list) as string[]).map((word) => JSON.stringify(word))
      const lineStart = all.lastIndexOf("\n", at) + 1
      const oneLine = `[${words.join(", ")}]`
      return at - lineStart + oneLine.length + 1 <= 120 ? oneLine : list
    }
  )}\n`
}

/** `person`'s address, their own apps' group:  `owen@spell`. */
function addressOf(person: PrefPerson): string {
  return `${person.id}@${person.org}`
}

/** Throw `SRV.HttpError(400)` for a change that can't be one:  see the file's docs. */
function checkChange(change: SPACES.HomeLayoutChange | undefined, person: PrefPerson): void {
  if (!change || typeof change !== "object" || !(change.order || change.text || change.reset))
    throw new SRV.HttpError(400, "home layout:  say what changed:  `order`, `text` or `reset`")
  if (change.order) {
    const { group, names } = change.order
    const isSections = group === SPACES.HOME_SECTIONS_KEY
    const isStart = group === SPACES.HOME_START_KEY
    const isKnown = group === addressOf(person) || SPACES.PROJECT_GROUPS.some((each) => each.path === group)
    if (!isSections && !isStart && !isKnown) throw new SRV.HttpError(400, `home order:  no group called \`${group}\``)
    if (!Array.isArray(names) || !names.every((name) => typeof name === "string" && FOLDER_NAME.test(name)))
      throw new SRV.HttpError(400, "home order:  `names` must be the group's projects' folder names")
    if (isSections && !names.every(SPACES.isHomeSection))
      throw new SRV.HttpError(400, `home order:  the sections are ${SPACES.HOME_SECTIONS.join(", ")}`)
  }
  if (change.text) {
    const { key, title, line } = change.text
    if (typeof key !== "string" || !key) throw new SRV.HttpError(400, "home words:  `key` says what they're on")
    if ([title, line].some((word) => word !== undefined && typeof word !== "string"))
      throw new SRV.HttpError(400, "home words:  `title` and `line` are text")
  }
}
