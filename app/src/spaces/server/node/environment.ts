import { homedir } from "os"
import { fileURLToPath } from "url"
import { dirname, join, resolve } from "path"

// NOTE: imports nothing of spell-app's but its leaf, `spellSpacesDir`:  app's `vite.config.ts` loads this file,
// in plain node, so that import names its `.ts`.
// The one finder of a package's folder (epic `coherence` P29)
import { packageFolderFor } from "spell/toolchain/sourceNames"
import { repoDir, spellSpacesDir } from "./spellSpacesDir.ts"

/**
 * Where the app's build folder (`app/`) and the `@spell` space's projects (`spaces/`) are:
 * the repo's root.
 * - `packagesDir` kept its name from when they were in `packages/`.
 */
const packagesDir = repoDir
/**
 * Where compiled output goes, `build/` at the repo root (epic `people-and-orgs` P11):  never committed.
 * - Each project's own folder there MIRRORS its path:  `buildFolderFor()`, in `projects/project-utils.ts`.
 *   - under this repo:  the same path under `build/`
 *     - `spaces/@spell/examples/Solitaire` => `build/spaces/@spell/examples/Solitaire`
 *     - the frozen test projects too:  `spaces/@spell/test/fizzbuzz` => `build/spaces/@spell/test/fizzbuzz`
 *   - under spell.spaces:  under `build/spell-spaces/`, `build/spell-spaces/@spell/owen@/errors`
 * - `SPELL_BUILD_DIR` sets it, e.g. the server's contract test's temporary folder.
 */
const buildDir = process.env.SPELL_BUILD_DIR ? resolve(process.env.SPELL_BUILD_DIR) : resolve(repoDir, "build")
/**
 * The folder of an installed package's main entry, through `node_modules`:
 * `spell/parser/spell` => spell-parser's `src/spell/`.
 * - By package, never by a path into another repo:  spell-parser sits beside this repo only in the top repo `spell`.
 */
function entryFolder(name: string): string {
  return dirname(fileURLToPath(import.meta.resolve(name)))
}
/**
 * The folder of installed package `name`:  its `package.json`'s (every package of ours exports it).
 * - For a sub-path of a package (`spell/parser/py`), that folder in its `src/`:
 *   a sub-path names a path under `src/`, as every import name does (epic `repo-split` P14, Q47).
 * - e.g. `spell/parser/py` => the parser folder's `src/py/`, whose `core/` is the Python core;  `spell` => its root
 * - in the published `spell`, its `dist/`:  `spell/parser/py` => `dist/parser/py/`
 * - Unscoped names only, as all of ours are.
 * - the toolchain's `packageFolderFor()`, the one way a package's folder is found (epic `coherence` P29)
 * - throws when it isn't installed
 */
function packageFolder(name: string): string {
  const folder = packageFolderFor(name, import.meta.filename)
  if (!folder) throw new Error(`environment.packageFolder():  ${name} isn't installed;  run \`yarn install\``)
  return folder
}
/** `spell`'s `src/` (spell-parser's). */
const srcDir = entryFolder("spell/parser/spell")
/** `core`'s `src/` (spell-parser's):  the runtime, and its built-in types' scope pack (`core.scopes.js`). */
const coreDir = entryFolder("spell/parser/core")
/** `app`'s `static/`:  fonts and css the app serves. */
const staticDir = resolve(packagesDir, "app", "static")

/**
 * The folder holding each `SP.SpaceFolderBase` (`SP.SpellUrls.folderFor()`):
 * - `builtins`:  `spaces/`, holding the `@spell` space's projects:  the built-in groups (`@spell/examples/` ...) and the
 *   frozen test projects, `@spell/test/` (spell-parser's `tests/spaces/` until epic `spanish` P18)
 * - `spaces`:  spell.spaces
 * - `SPELL_BUILTINS_DIR` sets the first:
 *   so the server's contract test (`api.test.ts`) can point the server at a temporary copy, and never write into the repo.
 */
const spaceFolders = {
  builtins: process.env.SPELL_BUILTINS_DIR ? resolve(process.env.SPELL_BUILTINS_DIR) : resolve(packagesDir, "spaces"),
  spaces: spellSpacesDir
}

/**
 * Where this machine's sign-ins are kept (epic `atmosphere` P3):  ONE folder for main and every worktree, outside git.
 * - `sessions.json`:  each device signed in, by its token's hash (`SignIns`)
 * - `mail/`:  every mail the local mail catcher caught, one file each (`MailCatcher`), listed at `/sign-in/mail`
 * - Default `~/.spell/sign-in`;  `SPELL_SIGN_IN_DIR` sets it, e.g. a test's temporary folder.
 */
const signInDir = process.env.SPELL_SIGN_IN_DIR
  ? resolve(process.env.SPELL_SIGN_IN_DIR)
  : join(homedir(), ".spell", "sign-in")

/**
 * How long a sign-in request is good for, in minutes, nothing done (Owen, 2026-11-04, the atmosphere guide's C1).
 * - `SPELL_SIGN_IN_MINUTES` sets it;  default 20 (`SIGN_IN_MINUTES`, written out here, as this file imports nothing heavy).
 */
const signInMinutes = Number(process.env.SPELL_SIGN_IN_MINUTES) || 20

/**
 * Where people report abuse on this server (epic `atmosphere` P6, Q7 A):  its ABUSE CONTACT.
 * - Shown on the sign-in bar and the sign-in link's page, and named in every refusal of something taken down.
 * - `SPELL_ABUSE_CONTACT` sets it.
 * - Default `abuse@spell.spaces`, until the epic's Q12 settles the domain Spell's mail comes from.
 */
const abuseContact = process.env.SPELL_ABUSE_CONTACT || "abuse@spell.spaces"

/**
 * How this server sends its mail (epic `atmosphere` T55), for `mailerFor()`.
 * - `SPELL_MAIL=sendmail`:  through this machine's own `sendmail`, from `SPELL_MAIL_FROM`.
 * - Unset:  only into the local mail catcher.
 * - NEVER in a test:  whatever its shell says, a test sends no real mail.
 */
const mail = {
  via: process.env.VITEST ? undefined : process.env.SPELL_MAIL,
  from: process.env.SPELL_MAIL_FROM
}

/**
 * Where every space's nightly backups go (epic `atmosphere` P7, Q8 B:  the server runs on a machine you run).
 * - Name a second disk, or a folder on one, with `SPELL_BACKUPS_DIR`:  a copy on the same disk is lost with it.
 * - Default `~/.spell/backups`, and `spell space backup status` says it's on the same disk.
 */
const backupsDir = process.env.SPELL_BACKUPS_DIR
  ? resolve(process.env.SPELL_BACKUPS_DIR)
  : join(homedir(), ".spell", "backups")

/**
 * Where the cloud keeps what's its own, on the machine it runs on (epic `atmosphere` P8, `SpellCloud`):
 * - its devices signed in
 * - the mail it caught
 * - the key its read credentials are signed with
 * - its record while it runs, `cloud.json`:  its port and write token, readable by this machine's person only
 * - Apart from the page server's sign-ins:  the cloud signs people in from outside, the page server this machine.
 * - Default `~/.spell/cloud`;  `SPELL_CLOUD_DIR` sets it.
 * - The spaces it serves are spell.spaces, as the page server's are (`SPELL_SPACES_DIR`).
 */
const cloudDir = process.env.SPELL_CLOUD_DIR ? resolve(process.env.SPELL_CLOUD_DIR) : join(homedir(), ".spell", "cloud")

/**
 * Where the server keeps what it still has to send (epic `atmosphere` P14, Q19 A:  ONE retry queue, on its disk):
 * e.g. `space-writes.json`, the writes not yet in a space's real AT Protocol Space (`RealSpace`).
 * - Default `~/.spell/queue`;  `SPELL_QUEUE_DIR` sets it.
 */
const queueDir = process.env.SPELL_QUEUE_DIR ? resolve(process.env.SPELL_QUEUE_DIR) : join(homedir(), ".spell", "queue")

/**
 * The test org's AT Protocol account, which Spell writes a space kept in a real Space as (epic `atmosphere` P14, Q10:
 * one test org with its own id, for the trial):  `SPELL_TEST_ORG_HANDLE` and its app password,
 * `SPELL_TEST_ORG_PASSWORD`;  `undefined` when either isn't set.
 * - Where accounts' documents are:  the real network, or `SPACES_NETWORK` (Spell's own Spaces host, as the trial says).
 */
const testOrg =
  process.env.SPELL_TEST_ORG_HANDLE && process.env.SPELL_TEST_ORG_PASSWORD
    ? {
        handle: process.env.SPELL_TEST_ORG_HANDLE,
        password: process.env.SPELL_TEST_ORG_PASSWORD,
        ...(process.env.SPACES_NETWORK && { network: process.env.SPACES_NETWORK })
      }
    : undefined

/**
 * The compile cache's folder:  what the editor's projects compiled to, by what they were compiled from
 * (`SRV.DiskCache`, epic `language` P27).
 * - `~/.spell/cache/compiles`:  one for the machine, every checkout's, each compiler version its own folder
 *   (Spell's caches' folder is `SRV.DiskCache.home`;  written out here, as this file imports nothing heavy)
 * - `SPELL_CACHE_DIR` sets the folder it's in, e.g. tests' temporary folder
 */
const compileCacheDir = join(
  process.env.SPELL_CACHE_DIR ? resolve(process.env.SPELL_CACHE_DIR) : join(homedir(), ".spell", "cache"),
  "compiles"
)

/**
 * Normalized environment variables for the server and client setup, and the folders spell's projects are in.
 * - Node only:  the editor's server, the language server, the `spell` command, tests.
 */
const environment = {
  vitePort: Number(process.env.VITE_PORT) || 3000,
  expressPort: Number(process.env.PORT) || 3001,
  api_server: process.env.API_SERVER || "localhost",
  /**
   * The page server's write token, for the editor's dev server to send on to its project data folders:
   * `EditorServer` sets it as it starts vite (`pageServerProxy()`).  Left out:  vite started some other way.
   */
  serverToken: process.env.SPELL_SERVER_TOKEN || undefined,
  /**
   * Whether the editor's dev server listens on this machine alone (epic `atmosphere` P39):
   * `EditorServer` sets it when the house site gives the editor an address, so Caddy is the one way in.
   */
  editorThisMachineOnly: !!process.env.SPELL_EDITOR_THIS_MACHINE_ONLY,
  srcDir,
  packagesDir,
  repoDir,
  buildDir,
  coreDir,
  staticDir,
  spellSpacesDir,
  signInDir,
  signInMinutes,
  cloudDir,
  abuseContact,
  mail,
  backupsDir,
  packageFolder,
  spaceFolders,
  compileCacheDir,
  queueDir,
  testOrg,
  /** The built-in projects, e.g. `spaces/@spell/examples/Solitaire` -- the `@spell/...` groups. */
  systemFilesRoot: resolve(spaceFolders.builtins, "@spell"),
  /**
   * Frozen projects tests run against, e.g. `spaces/@spell/test/fizzbuzz` -- `@spell/test`.
   * See `spell/app/spaces/test`.
   */
  testFilesRoot: resolve(spaceFolders.builtins, "@spell", "test"),
  /**
   * This machine's person's own projects, e.g. `<spell.spaces>/@spell/owen@/errors` -- `owen@spell`.
   * - MUST be the folder of `SPACES.LOCAL_PERSON`'s space (a test checks).
   *   - It can't import that name:  this file imports nothing, since vite's configs load it too.
   */
  userFilesRoot: resolve(spellSpacesDir, "@spell", "owen@")
}

export default environment
