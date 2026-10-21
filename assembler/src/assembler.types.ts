/**
 * Types shared across `$/assembler`, and the constants that go with them (`BUNDLES`).
 * - MUST stay runtime-light:  no imports at all, so nothing here loads a class module (WWOD §8).
 */

////////////////
// ## Links
////////////////

/** What `Linker.link()` did to a page's text. */
export type LinkResult = {
  /** the page's text, its code spans linked and every link given a target */
  text: string
  /** how many code spans became links */
  linked: number
  /** path-like code spans that resolve to nothing, sorted */
  unresolved: string[]
}

/** What `Linker.check()` found in a page's links, outside `<pre>`. */
export type LinkCheck = {
  /** how many distinct destinations the targeted links have */
  destinations: number
  /** one line per problem, e.g. `missing:  nope.html`;  empty when the page passes */
  problems: string[]
}

////////////////
// ## Bundles
////////////////

/**
 * A bundle the page server serves, BUILT on demand from the checkout's source instead of committed (`Bundle`).
 * - `output` is git-ignored;  its build clears it first, then `Bundle.build()` records the sources' hash in it
 * - Why not committed:  its chunk names carry content hashes,
 *   so every Spell UI change deleted and re-added most of its files in every diff and merge
 *   (Owen, epic `epic-components`, 2026-10-07)
 */
export type BundleSpec = {
  /** what the command line calls it, e.g. `brand` */
  name: string
  /** what it is, for people */
  title: string
  /**
   * the package it's built in, by its npm name, e.g. `spell-brand`:  found through the checkout's `node_modules`,
   * wherever its repo is (epic `repo-split` P8:  Spell UI's and the brand's are repos beside spell-app's)
   */
  package: string
  /** the folder its build runs in, relative to `package`'s folder */
  cwd: string
  /** the build, run in `cwd` */
  run: string[]
  /** the folder the build writes, relative to `package`'s folder */
  output: string
  /** a file every build writes in `output`:  missing => stale */
  entry: string
  /**
   * files and folders the build reads:  a change to one makes the bundle stale
   * - a package's, by its npm name and a path in it:  `spell-ui/src`
   * - anything else, from the install's root (the folder holding `yarn.lock`):  `yarn.lock`
   */
  sources: string[]
}

/** What `Bundle.check()` found. */
export type BundleCheck = {
  /** the bundle's `name` */
  name: string
  /** its `output` folder, relative to the checkout:  as the settings' `bundles` name it (`../spell-ui/site/_assets`) */
  output: string
  /** the hash of its sources now */
  sources: string
  /** why it needs a build, e.g. `never built`;  left out when current */
  stale?: string
}

/** What `Bundle.build()` did. */
export type BundleBuilt = {
  /** the bundle's `name` */
  name: string
  /** the hash of the sources it was built from */
  sources: string
  /** how long the build took */
  seconds: number
}

/** What a build records in its `output` folder (`BUNDLE_RECORD`), for `Bundle.check()` to compare. */
export type BundleRecord = {
  /** the hash of the sources it was built from */
  sources: string
  /** when, as an ISO date */
  built: string
}

/** The record's file name in each `output` folder:  a dot file, so the page server neither serves nor reloads it. */
export const BUNDLE_RECORD = ".bundle.json"

/**
 * What both bundles read of Spell UI:
 * - its source (`Bundle.sourceFiles()` skips the icon packs, which each bundle LINKS, never bundles)
 * - its families (`components/`, outside `src/`)
 * - the element layer they're written on (`$/spell-element`)
 * - its Vite config (`baseConfig()`)
 * - the site header (`$/server/site`)
 * - the lock file
 */
const SPELL_UI_SOURCES = [
  "spell-ui/src",
  "spell-ui/components",
  "spell-kit/element/src",
  "spell-ui/vite.config.ts",
  "spell-kit/server/src/site",
  "yarn.lock"
]

/**
 * How each bundle built on demand is built.
 * - WHICH are built:  the ones whose `output` folders the checkout's root `package.json` names
 *   (`"pageServer": { "bundles": [...] }`, `Bundle.specs()`), the list the page server reads too
 * - the page server builds the stale ones when it starts (`spell dev bundles build --stale`)
 * - `sources`:  generous, so a change never leaves one stale unnoticed
 *   - `Bundle.sourceFiles()` skips tests, snapshots, dot files and the icon packs
 * - their `output` folders are in their own repos' `.gitignore`
 * - each by its PACKAGE, never by the checkout's layout (epic `repo-split` P8)
 */
export const BUNDLES: BundleSpec[] = [
  {
    name: "ui-site",
    title: "Spell UI's docs site bundle",
    package: "spell-ui",
    cwd: ".",
    run: ["yarn", "site:bundle"],
    output: "site/_assets",
    entry: "site.js",
    sources: [
      ...SPELL_UI_SOURCES,
      "spell-ui/site/_src",
      "spell-ui/vite.site.config.ts",
      "spell-ui/scripts/site-bundle.ts"
    ]
  },
  {
    name: "brand",
    title: "brand pages' bundle",
    package: "spell-brand",
    cwd: ".",
    run: ["yarn", "build"],
    output: "_assets/ui",
    entry: "brand-ui.js",
    sources: [
      ...SPELL_UI_SOURCES,
      "spell-brand/src",
      "spell-brand/components",
      "spell-brand/vite.config.ts",
      "spell-brand/scripts/build.ts"
    ]
  }
]
