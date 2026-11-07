# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this folder, `src/spaces/` of the kit's app folder (`spell/app/spaces`),
and with the `@spell` space's built-in projects, `spaces/@spell/` at the app folder's root.

**READ the app folder's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the folder's layout, and the house style every folder shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- Where projects and people live, and the servers that serve them (epic `people-and-orgs`).
  - Born in P14, with the servers:  the editor's, which was the app's, and Python's, which was py's.
  - Spell's projects came in P15:  their groups and lists, their files on disk, and the built-in projects.
  - People came in P7-P9:  the people library, the storage adapter (P8) and the people store (P9), below.
  - The whole layout, on the epic's spaces page:
    [its package section](../../../spell.epics/epics/people-and-orgs/details/spaces-package.html).
- Its folders:
  - [@spell/](../../spaces/@spell/):  the `@spell` space's built-in projects, committed (see "Projects" below)
    - `examples/`:  the `@spell/examples` group (fizzbuzz, calculator ...)
    - `library/`:  the `@spell/library` group (people)
      - `people/`, the people library (P7):  people, orgs and what they keep
      - compiled to `people.lib.ts` (the `ts/lib` target):
        the app, the people store and the spell command import it
  - [models/](models/index.ts):  `spell/app/spaces` (`SPACES`), safe in a browser:  the editor imports it.
    - [projectGroups.ts](models/projectGroups.ts):  spell's project groups, `PROJECT_GROUPS`
    - [SpellProjectRoot.ts](models/SpellProjectRoot.ts):  a group's list of projects,
      and its projects' create, copy, rename and delete
    - [ProjectFiles.ts](models/ProjectFiles.ts):  a project's FILE create, copy, rename and delete
    - [spaceNames.ts](models/spaceNames.ts):  spaces' own `__` names, `SPACE_NAMES`
    - [spellUIPack.ts](models/spellUIPack.ts):  Spell UI as a spellx drawing names its components bare
      (`<button>` => `<ui-button>`), registered with spell as the barrel loads (`SP.ComponentPacks`, epic
      `elemental-spell` P7);  `<spell-viewer>` doesn't load it:  it never compiles
      - and an app's widget defaults, `<ui-defaults>`, in Spell UI's own names:
        [SpellUIDefaults.ts](models/SpellUIDefaults.ts) (epic `language` P29)
    - [SpaceStorage.ts](models/SpaceStorage.ts) and [people.ts](models/people.ts):  types only, see "People"
  - [the node side](server/node/), node only:  imported by path (`spell/app/spaces/server/node/...`), never from the barrel
    - [environment.ts](server/node/environment.ts):  where everything is on disk (see "Projects" below)
    - [projects/](server/node/projects/):  projects on disk, and the disk reader (see "Projects" below)
    - [storage/](server/node/storage/) and [people/](server/node/people/):  see "People" below
    - [prefs/](server/node/prefs/):  see "Preferences" below
    - [places/](server/node/places/):  every project data folder, served to programs (`SpaceFolders`, below)
    - [changes/](server/node/changes/):  the inbox of changes people ask for in the editor, for a Claude session
      (`ChangeRequests`, `/api/changes`, `spell app changes`;  epic `editor` P18)
    - [routes/](server/node/routes/):  the editor's server (below)
  - [the Python side](server/py/pyproject.toml):  `spell_quart`, Python's web server, a uv project (below)
- Tests live in the app folder's `tests/spaces/`, at the same paths as the code they test:
  - TypeScript, found by vitest (the root's `vitest.config.ts`, its `spaces` project):
    - [api.ts](server/node/routes/api.ts) => [api.test.ts](../../tests/spaces/server/node/routes/api.test.ts)
  - Python:  [the Python server's tests](../../tests/spaces/server/py/tests/), found by its pytest (`testpaths`)
  - The frozen test projects themselves are beside the built-ins, in `spaces/@spell/test/` (see "Projects" below).
    The tests that compile them whole are the app folder's `tests/spell/`, its `spell` project, not ours.
    - Among them `counter`, a frozen counter library, which `counter-app` imports:
      for the tests of one project importing another.
      - Those of the runner, the core contract, `spell compile` and `spell explain --in`.
    - The built-in examples are tested in place, not as frozen copies (`EXAMPLE_PROJECTS`):
      their snapshots are in `tests/spell/__examples__/<Project>/`, re-blessed when an example changes
      (`spell content check --bless`).
    - So is every Spell guide, `@spell/guides`, since epic `debut` P10.
      Its snapshots are in `tests/spell/__guides__/<Project>/`.
- [test/](test/index.ts), node only:
  the test helpers for the frozen test projects and the tested examples and guides, `spell/app/spaces/test`
  - among them:
    - `loadFixtureProject()`
    - `fixturePath()`
    - `fixtureProjectId()`
    - `compiledFixture()` ...
  - Imported by tests only, by name, never from the barrel.
  - Inline projects are the parser folder's helpers', `spell/parser/spell/test` (`parseSpellProject()`).
- The app folder's checks (its `package.json`'s scripts) cover both:
  - the TypeScript:  tsc, oxlint / oxfmt and vitest
  - then `spell_quart`:  ruff and pytest, through uv

## Projects

- Spell's project GROUPS are ours:  `SPACES.PROJECT_GROUPS`, in [projectGroups.ts](models/projectGroups.ts).
  - Loading that file registers them with spell's registry, `SP.SpellSetup`, which starts empty.
  - So every program that reads a spell path loads them first, one of these ways:
    - through `spell/app/spaces`
    - through our disk reader (below)
    - or `spell/app/spaces/models/projectGroups` alone:  `<spell-viewer>` does that, to stay light
  - Spell NEVER imports us.
- Each group is named by its ADDRESS, and its folder comes from that (`SP.SpellUrls.folderFor()`):

  | Group | Folder |
  | --- | --- |
  | `@spell/examples`, `@spell/library`, `@spell/guides` | `spaces/@spell/<group>/`, committed |
  | `@spell/test` | `spaces/@spell/test/`, committed and frozen (spell-parser's `tests/spaces/` until epic `spanish` P18) |
  | `owen@spell` | spell.spaces' `@spell/owen@/`, outside git |

  - spell.spaces:  beside the kit's main checkout (`~/www/spell.spaces`):
    ONE folder for main and every worktree.
    - It was `../spell-spaces` before epic `repo-split` P8.
    - `SPELL_SPACES_DIR` sets it.
    - Laid out by org, each person's space inside it:  `owen@spell/errors` is `@spell/owen@/errors/`.
  - `SPACES.LOCAL_PERSON` is `owen`:  who this machine's person is, until a machine can have more than one person.
    - `SPACES.HOME_ORG` is their org for now, spell:  so their space is `@spell/owen@/`.
  - A project's address:  its group's address, a slash and its folder's name, lower-kebab (P4, decision Q39).
    - Or as titled, as Solitaire's is, and its Spanish twin's:  `Solitaire`, `Solitario`.
      Owen's call, in epic `spanish` P11.
    - e.g. `@spell/examples/Solitaire`
    - a file in it:  its name, which has a dot (Q41), e.g. `@spell/examples/Solitaire/Solitaire.spell`
  - A `@local/<folder>` group, added at runtime for a folder an editor opened, says its own folder (`serverPath`).
- Where the folders are:  [environment.ts](server/node/environment.ts).

  | Name | Folder | Tests set it with |
  | --- | --- | --- |
  | `spaceFolders.builtins` | `spaces/`:  the built-in groups and the test projects, `testFilesRoot` | `SPELL_BUILTINS_DIR` |
  | `spaceFolders.spaces`, `spellSpacesDir` | spell.spaces, beside the kit's main checkout | `SPELL_SPACES_DIR` |
  | `buildDir` | `build/` at the app folder's root | `SPELL_BUILD_DIR` |
  | `backupsDir` | every space's nightly backups (epic `atmosphere` P7):  `~/.spell/backups`, or a second disk | `SPELL_BACKUPS_DIR` |
  | `repoDir`, `packagesDir` | the app folder's root, `app/` (its `src/`, `spaces/` and build folder are there) | |
  | `srcDir`, `coreDir`, `packageFolder()` | the parser folder's folders, found by package through `node_modules` | |

- Projects on disk:  [projects/](server/node/projects/).
  - [project-utils.ts](server/node/projects/project-utils.ts):  where each project is, a group's list,
    a project's index, and its files' create, copy, rename, delete and save.
    - Each change to a file goes through the page server's file operations, `SRV.FileOperations`, in-process:
      under the file lock, written all at once.
    - A group's list, and a project's file list, leave out our own `__` names (`SPACES.isSpaceName()`).
      - Known by that list of names:  so `__init__.py` and `__snapshots__/` still list (decision J52).
  - [ProjectDrafts.ts](server/node/projects/ProjectDrafts.ts):  a person's DRAFTS, Publish and a project's versions
    (epic `editor` P24, in atmosphere's shapes;  the wire's are `SPACES.DraftJSON` ..., in [drafts.ts](models/drafts.ts))
    - A save of a project's own file is your draft, `__draft/<name>.<person>-<day><extensions>`;  its URL reads it.
    - Publish writes the public files and zips the project into `versions/`;  neither folder is ever served.
    - The disk reader below reads what's published:  the language server and `spell compile` never see drafts.
  - [disk-fetch.ts](server/node/projects/disk-fetch.ts):  the DISK READER, for node hosts of spell's
    projects (the language server, the `spell` command, tests).
    - `installDiskFetch()` answers the URLs spell asks for from disk, with the same functions the routes call.
  - Beside them, their helpers:
    - [file-utils](server/node/projects/file-utils.ts)
    - [response-utils](server/node/projects/response-utils.ts)
    - [server.types](server/node/projects/server.types.ts)
- What spell BUILDS for a project goes in `build/` at the app folder's root, each checkout its own, never committed:

  | Source | Built into | e.g. |
  | --- | --- | --- |
  | the app folder's `tests/X` | `build/X` | |
  | the app folder's `X` | `build/X` | `build/spaces/@spell/examples/Solitaire/`, `build/spaces/@spell/test/fizzbuzz/` |
  | spell.spaces' `X` | `build/spell-spaces/X` | `build/spell-spaces/@spell/owen@/errors/` |
  | another checkout's `app/spaces/X` or `app/tests/X` | THAT checkout's `build/...` | a worktree's example, opened by the main checkout's language server (epic `spanish` P21) |
  | anywhere else | beside the source | |

  - `buildFolderFor()`, in project-utils;  "Projects" in [spell's PARSING.md](../../../parser/src/spell/PARSING.md) has the rest.
- The editor edits projects through our models:
  - a group's projects:  `SPACES.SpellProjectRoot`
  - a project's files:  `new SPACES.ProjectFiles(project)`, to create, duplicate, rename and delete them
  - `SpellProject` itself only reads, compiles and saves (decision Q20).
- Lint and format leave the projects alone:  `spaces/@spell`, the test projects among them.
  - Their ignore list is in the toolchain's [lint.ts](../../../src/toolchain/lint.ts).

## People

- Spaces' files go through ONE interface, `SpaceStorage` ([SpaceStorage.ts](models/SpaceStorage.ts), P8):
  read, write, list, remove, watch, by paths relative to spell-spaces (`@spell/owen@/__me.json5`).
  - The disk's:  [DiskStorage.ts](server/node/storage/DiskStorage.ts).
    - It writes through the page server's file operations.
    - It keeps each folder's list, and one recursive watcher drops a folder's when anyone changes it.
  - Zip files are written and read in ONE place, [zip.ts](server/node/storage/zip.ts), on node's `zlib`:
    a project's versions, a space's export.
  - JSON5 is read and written in ONE place, [json5.ts](server/node/storage/json5.ts), on json5-writer:
    an edit writes the whole value back, every comment where it was;  double quotes, no trailing commas.
    - The editing itself, `json5Edited()`, is the kit's util's ([json5.ts](../../../src/util/node/json5.ts)):
      the component sets' site data writers use it too, and ui may import no spell-family package
      (epic `epic-workflow` P20).
  - The page server's `--spaces <dir>` points it elsewhere (`SPELL_SPACES_DIR`).
- The PEOPLE STORE ([PeopleStore.ts](server/node/people/PeopleStore.ts), P9):
  people and orgs, as the people library's things (`@spell/library/people`).
  - Their files:
    - a person, `Person#owen@spell`:  `@spell/owen@/__me.json5`
    - an org, `Org#spell`:  `@spell/__org.json5`, with its members inside it
      (each a membership:  a person and a role, guest, member, admin or spell-admin)
  - Read:  each file checked against its class (`checkEntry()`, its problems returned, read anyway), brought up to
    its version, and every person or org it names read too.
  - Written:  ONE file at a time, its comments kept;  a friend is written as a reference, never into their file.
  - `me()` writes a starter `__me.json5` the first time, from git's name and email.
  - Nobody is refused a save yet, under `@spell` either (J46):  the permissions UI is todo T8.
  - `isSpellAdmin(id, org)`:  `spell-admin` in Spell's own org, the ONE check (themes' Save into Spell UI, takedowns).
- SPELL ACCOUNTS ([SpellAccounts.ts](server/node/people/SpellAccounts.ts), epic `atmosphere` P3):
  the people of Spell's own org, as a sign-in by email finds them (an email in `Person.emails`).
  - Invite only:  an invite makes one through `PeopleStore.me()`.
    - E.g. `ana@example.com` => `ana@spell`.
  - Or a linked BLUESKY account (epic `atmosphere` P19):  its DID and handle in the person's file
    (`Person.signInDid`, `signInHandle`), found by the DID alone;  one Spell account each (`link()` refuses
    `"linked elsewhere"`).
    - Linked from the sign-in bar, signed in:  "Link a Bluesky account";  then "Sign in with Bluesky" signs in.
    - The page server and the cloud both offer it (`AtProtoIdentity`, the kit's).
  - The page server's sign-in (`SignInCheck`) is the app's route module's.
    - Its sessions and caught mail are in `environment.signInDir`.
      - Default `~/.spell/sign-in`;  `SPELL_SIGN_IN_DIR` sets it.
- Its routes ([peopleRoutes.ts](server/node/people/peopleRoutes.ts)), what the app's "You" panel calls:
  - `GET /api/people/me`:  whoever's signed in, else this machine's person (`SPACES.LOCAL_PERSON`);
    their orgs and roles, their file's problems
  - `POST /api/people/me`:  their changes written, answered as `GET`
  - The answers' types:  [people.ts](models/people.ts), safe in a browser.

## Preferences

- Each person's preferences, kept in their space (epic `prefs-and-undo` P2):  [SpacePrefs.ts](server/node/prefs/SpacePrefs.ts).
  - One JSON5 file per store, in the person's `__prefs/` folder:
    - the editor's:  `@spell/owen@/__prefs/spellEditor.json5`
    - the person's theme and light / dark, every place's (Spell UI's `ThemePreference`, epic `debut` P21):
      `@spell/owen@/__prefs/spell-site.json5`, `{ theme, scheme }`
    - a store named like a project is a folder and a file:  `__prefs/@owen/solitaire.json5`
  - Through `SpaceStorage` and spaces' JSON5 writer:  a person's comments stay.
  - One change at a time to each file.
  - A store name that would reach outside `__prefs/`, or a key that can't be one:  `SRV.HttpError(400)`.
  - Every save is told to every open page (`onPrefSaved()`, in the routes):  the app's route module sends it over the
    page server's live channel, `{ event: "pref-saved", data: { store, key, value } }`, so a page showing that pref
    follows it at once.
- Its routes ([prefsRoutes.ts](server/node/prefs/prefsRoutes.ts)), what the kit's `ServerPlace` asks:
  - load and save a key:  `GET /api/prefs/load`, `POST /api/prefs/save`
  - list and forget the keys under a prefix:  `GET /api/prefs/keys`, `POST /api/prefs/forget`
  - the protocol's types are the kit's (`spell/util`'s `PrefLoadAnswer` ...):  the client is generic
  - whose:  `prefsPersonFor()`, the ONE answer to who a request is from;
    the people and themes routes ask it too
    - whoever's signed in (`request.person`, set by the page server's sign-in;  epic `atmosphere` P3)
    - else this machine's person
- `respondWithJSON()` answers a thrown `SRV.HttpError` with its status, anything else with 500.

## The editor's server

- Its folder:  [routes/](server/node/routes/).
- [api.ts](server/node/routes/api.ts):  two `SRV.Router` route tables.
  - `api`:  the app's API, `/api/...`
  - `spaceFiles`:  reading a file, `/spaces/...`
  - On the kit's server's Express-shaped router and web server (it was Express):  `SRV.Router`, `SRV.WebServer`.
  - Its handlers are our [project-utils.ts](server/node/projects/project-utils.ts)'s.
  - A project or a file is named by its ADDRESS, from ONE function, `SP.SpellUrls` (spell's
    [SpellUrls.ts](../../../parser/src/spell/SpellUrls.ts)):
    - a file is READ at `/spaces/<project>/<file>`, e.g. `/spaces/@spell/examples/Solitaire/Solitaire.spell`
    - and SAVED by `POST /api/projects/file/<project>/<file>`
    - a project's index:  `/api/projects/index/<project>`
    - a group's projects:  `/api/projects/list/<group>`, e.g. `/api/projects/list/owen@spell`
    - Compiled files are files, `/spaces/<project>/<project>.spell.js` (its program) and the rest beside it:
      - `.scopes.js`, its scope pack
      - `.declarations.json5`
      - `.en.js`
      - A built one is served from the build folder.
    - A URL is split by its group and ONE part for the project before any path is made, and each part decoded on its
      own (`SP.SpellUrls.split()`, decision Q41).
  - [api.test.ts](../../tests/spaces/server/node/routes/api.test.ts) pins its behaviour over HTTP.
  - `/api/compiles`:  the COMPILE CACHE (epic `language` P27), what the editor's projects compiled to
    (`SRV.DiskCache`, the editor's `ServerCompileStore`)
    - on disk in `~/.spell/cache/compiles` (`environment.compileCacheDir`;  `SPELL_CACHE_DIR` moves it)
    - its version a hash of the compiler's code (`compilerCode()`):  the parser folder, util, our models, Spell UI's
      components and vocabularies;  a change to any starts an empty cache
    - capped at the page server's `cacheLimit` setting, 200 MB by default (the kit's `package.json`;  epic `language`
      Q41):  past it, the entries used least recently go first
- [appRoutes.ts](server/node/routes/appRoutes.ts):  the app on the PAGE server.
  - A route module ([the kit's server AGENTS.md](../../../src/server/AGENTS.md)):  the page server loads it by its path,
    from the app folder's `package.json`, its `"pageServer": { "routes": [...] }`.
  - What it serves (vite's proxy passes the first three on to it, from the editor):
    - `/api`
    - `/spaces`
    - `/element/...`:  the app's `dist-element/`
    - `/editor`
  - It starts the editor once the page server listens, and stops it with the page server:
    [EditorServer.ts](server/node/routes/EditorServer.ts), vite's dev server, run in `app/`.
- PROJECT DATA FOLDERS ([SpaceFolders.ts](server/node/places/SpaceFolders.ts), epic `atmosphere` P1):
  where a program's rows live, on disk.
  - E.g. `family cookbook is a data folder at "owen@spell/recipes"` keeps its rows in `@spell/owen@/recipes/`.
  - ONE route, the kit's `PlaceServer`, at `/api/places/spaces/<address>/`:
    the route module mounts it behind the page server's guard.
    - Each folder is a `FolderPlace` on `DiskStorage`, opened the first time it's asked for.
  - A name alone, `"recipes"`, is the program's own:  `<project>/__data/recipes`.
  - `personal "recipes"` is each person's own:
    - on disk, `owen@spell/__data/recipes`
    - on the route, `personal/recipes`
  - Who writes, by its address (epic `atmosphere` P4):
    - a space's own folder (`@family/cookbook`, `owen@spell/recipes`):
      ITS MEMBERS, as an AT Protocol Space's own account writes it
      - Every thing is the space's (`owner` is `@family`):  a member whose role writes changes any of it.
      - Anyone else is refused "your role can't write" (`whyNot: "role"`), and the page's notice says so.
    - a program's own data (`__data/`, `personal`):
      each row's owner is who made it, and only they change it
      - its `owner` says who that is
      - except a KEEPER:  the space's person, an admin in the folder's own `__members/`,
        or, without one, the org's (P1)
    - either way, `by` is who wrote each thing last
  - Its members ([SpaceMembers.ts](server/node/places/SpaceMembers.ts), Q9), the first of these there is:
    - the folder's own `__members/` (optional)
    - a person's space:  its person
    - its org's memberships (`PeopleStore.rolesOf()`)
    - A guest reads, a member writes, and an admin also manages the list.
    - Joining, leaving, admins (T6):
      the place's own operations, through the same route's `call`:
      - `members`, `addMember`, `removeMember`
      - written to the folder's `__members/`, or to the org's file through the people store
      - the people store's side:  `setRole()`, `removeMembership()`
      - A member may always leave;  the last admin can't.
  - READ DIRECT (epic `atmosphere` P5, Q6 C):  a space's own folder's files, read straight,
    apart from where they're written.
    - At `/api/reads/spaces/<address>/` (the kit's `DirectReads`), with a credential for the whole space.
    - A member, a guest too, gets one from the write side (`POST .../credential`):
      a cookie only that address reads.  Anyone else is refused, `"role"`.
    - It's signed by a key beside the sign-ins:  `space-reads.key`, in `environment.signInDir`.
    - Each read asks the member list again:  someone who leaves reads no more.
    - It opens no place and writes nothing, so reading works while the write side is stopped.
    - Something private is a space of its own:
      `ana@spell/recipes` lists Ana alone, so @family's members read none of it.
    - Reads through the write side are checked against the member list too (T15).
    - Watched while a page reads it (T17):  a file edited by hand shows in the next read, on both sides.
      - A read direct connects the space for 2 minutes after it (`SpaceFolders.connect()`, the kit's `DirectReads`'
        `onRead`):  its place watched, through `DiskStorage.watch()`.
      - A collection's first read on a connection brings its list into step first.
  - KEPT IN A REAL SPACE (epic `atmosphere` P14;  [RealSpace.ts](server/node/places/RealSpace.ts)):
    a space whose `__settings/space.json5` names an AT Protocol Space (`realSpace`, `SpaceMembers.keptIn()`).
    - Writes:  the same route and checks, onto its folder, then into the Space as the org's own record, `by` the person.
      - Through the ONE retry queue (Q19 A):  the kit's `SaveQueue`, its unsent writes on the server's disk
        (`environment.queueDir`, `SPELL_QUEUE_DIR`;  `space-writes.json`).
    - Reads:  each member's own Space credential, passed through to the host (`/api/reads/spaces/<address>/__host/...`).
    - Its list:  a member added with their AT Protocol account (`did`, kept in their membership), or removed, is on the
      Space's list too;  the Space's first, so its no changes nothing here.
    - The org's account:  the test org's (`environment.testOrg`:  `SPELL_TEST_ORG_HANDLE`, `SPELL_TEST_ORG_PASSWORD`,
      `SPACES_NETWORK`);  without one, the space answers 503.
    - Every other space stays on files alone.
  - FILES (epic `atmosphere` P15):  a space's own folder keeps files too, pictures and the like
    (the kit's `FolderFiles`, made per space by `SpaceFolders.filesFor()`).
    - Each its bytes and ONE record naming it:  the record a thing in `__files`, the bytes in `__blobs/` by hash.
      - Both are spaces' own names (`SPACE_NAMES`):  never read direct, listed, or exported as data.
    - At `/api/files/spaces/<address>` (`SPACE_FILES_PREFIX`):
      - `GET ?name=poster.png`:  its bytes and type, for a page's `<img>`, with no run token;  no name:  the list
      - `PUT ?name=`:  one file, its bytes the body;  `POST { files }`:  several, together;  `DELETE ?name=`:  one gone
    - Every check holds, through the space's `FolderPlace`:  members and roles, public settings, takedowns, and the
      space's 100 MB, bytes included.
    - Taken down as a record is (`__files`, the name's key);  `delete` takes its bytes too.
    - Exported as files:  `files/<name>`, and `files.json` listing them.
  - PROJECTIONS (epic `atmosphere` P17;  [SpaceProjections.ts](server/node/places/SpaceProjections.ts)):
    part of a space's data, written into another space where its readers can see it.
    - A program says it in its own sentence:  `the published sheet is a projection of the sign up sheet`,
      its lines `- into "@rs/picnic"`, `- showing each row's person and shift`, `- only where its "status" is "confirmed"`.
    - Kept in the SOURCE space's `__settings/projections.json5`, by name;  set through its operations
      (`SPACE_PROJECTION_OPERATIONS`):  `projections` (a member), `setProjection` (a manager of BOTH spaces),
      `rebuildProjection` (a manager).
      - A manager's page sets it as it opens the projection's place (the core's `placeKinds`);  anyone else is
        refused, which changes nothing.
    - Each write to the source (`onWritten`) writes the thing's named fields whole into the target, as Spell itself,
      or removes it once it leaves the view;  through the ONE retry queue (Q19 A), beside a real Space's.
    - Only the fields named:  a new field stays private until someone names it.
    - Rebuilt from nothing by `PlaceCopy` with the projection as its view:  set anew, or `spell space projection rebuild`.
    - Who reads the target is its own list's to say.
  - LIVE ROOMS (epic `atmosphere` T38):  a space's own folder shared live, a room per collection,
    at `/api/rooms/spaces/<address>/<collection>` (a websocket;  the kit's `Referee` on the space's `FolderPlace`).
    - Each write is its page's person's, so every check here holds in a room too.
    - Only someone who may read the space joins.
  - TAKEDOWNS ([Takedowns.ts](server/node/places/Takedowns.ts), epic `atmosphere` P6, Q7 A):
    Spell taking down a record, a space or an account, and putting it back.
    - Each with a reason, by a Spell admin (`spell space takedown`).
    - The log is the truth:  one entry each (who, when, what, why), in the folder's `__takedowns.json5`.
      - An account's:  in their own space's folder.
      - It's one of `SPACE_NAMES`, so it's never listed, read direct or copied out.
    - Read afresh for each request, on both sides:
      - a record:  left out of every read, and a change to it refused
      - a space, the account whose space it is, or the asker's own account:
        everything refused, 451, naming the abuse contact (`environment.abuseContact`, `SPELL_ABUSE_CONTACT`)
    - What each does:
      - `hide` leaves the files
      - `delete` removes them too (an account is only hidden)
      - `restore` puts it back
    - An account taken down can't sign in (`SpellAccounts.isTakenDown()`).
    - Reports, reasons people see, and appeals:  a todo, before Spell opens to everyone.
  - WHO BESIDES ITS MEMBERS (epic `atmosphere` P7, Q13):
    two settings of each space, in its `__settings/space.json5`.
    - Both off, until an admin turns them on (the `settings` / `changeSettings` operations).
    - `publicRead`:  anyone reads it, signed in or not, through the write side or direct (no credential needed).
    - `publicWrite`:  anyone signed in adds things, and changes or removes only the ones whose `by` is them;
      members change any.
    - E.g. a sign-up sheet has both on;  a club's events page, `publicRead` alone.
    - Takedowns refuse and hide in a public space as in any other.
  - LIMITS (epic `atmosphere` P7, `SPACE_LIMITS`):  a thing's file about 1 MB, a space's folder 100 MB.
    - A save past either is refused, 413 `"over the ceiling"`, saying how big.
    - The page keeps it, and tries again.
  - LEAVING (epic `atmosphere` P7, T5;  [SpaceExport.ts](server/node/places/SpaceExport.ts)):
    a space as plain JSON files, laid out as its folder is.
    - With `members.json`, and a note on leaving with its id.
    - Read through its place, so what's taken down is left out.
    - A member downloads it as a zip, at `/api/exports/spaces/<address>`;  `spell space export` writes the folder.
    - A program runs on it with one line:
      `... is a data folder at "./my-export"`, the folder beside its page.
    - The promise to hand a space's keys over once it has a real AT Protocol id:
      Spell's terms, [terms.html](server/node/places/terms.html), at `/terms`.
  - DELETING:  an admin's `deleteSpace` operation, or `spell space delete <space | account>`.
    - It removes every file but Spell's takedown log.
    - An account's also leaves every org.
  - BACKUPS ([SpaceBackups.ts](server/node/places/SpaceBackups.ts), epic `atmosphere` P7, Q8 B):
    a plain copy of spell.spaces each night, a week kept.
    - In `environment.backupsDir` (`SPELL_BACKUPS_DIR`:  name a second disk).
    - Made by the MAIN checkout's page server (`nightly()`, the route module).
    - A missed night is in its log, and in `spell space backup status`.
    - `spell space backup restore <space>` brings one space back.
  - Who's asking:  `prefsPersonFor()`, whoever's signed in, else this machine's person.
  - An account, `ana@rs`, is read in ONE place:  `SP.SpellLocation.isAccount()` and `accountParts()`
    (epic `atmosphere` P16), never a pattern or a split of its own.
  - THE CLOUD ([SpellCloud.ts](server/node/routes/SpellCloud.ts), epic `atmosphere` P8, Q8 B):
    the same folders and sign-in, for people OUTSIDE this machine.
    - A plain web server of its own, never the page server:  `spell space cloud serve`, port 4949.
    - Behind a tunnel or proxy, which gives it its `https` address.
    - Who's asking is whoever's signed in, nobody else (`signedInPerson()`):  its pages carry no write token.
    - What it serves, and nothing else:
      - the sign-in, the project data folders, `/terms`, `/element/`
      - the built-in programs' pages (`/apps/<project>`, `cloudApp.html`) and files
      - never the mail catcher's page, nor anyone's own projects
    - Its own files are in `environment.cloudDir`:
      - default `~/.spell/cloud`;  `SPELL_CLOUD_DIR` sets it
      - sessions, caught mail, its read key
      - `cloud.json`:  its port and token, for `spell space cloud invite`, readable by this machine's person only
    - It makes the nightly backups too.
    - HANDLES (epic `atmosphere` P16):  it answers AT Protocol's handle look-up, on the handle's own host:
      `https://ana.rs.spell.space/.well-known/atproto-did` is Ana's DID, as text.
      - `ana@rs` and `ana.rs.spell.space` are one person, both ways:  `SP.SpellLocation.handleFor()` and
        `accountForHandle()`;  an org whose file names its own `domain` gets `ana.rs.org`
      - the DID is the person's file's `did`:  only an account on Spell's Spaces host has one, so every other is 404
        (`SpellAccounts.didForHandle()`)
      - a handle's host is let in for that path alone:  no page, no write
      - its hosts reach it through a wildcard DNS record, once it has a real address (the mail and hosting guide)
  - Its tests:  [SpaceFolders.test.ts](../../tests/spaces/server/node/places/SpaceFolders.test.ts);
    the recipe box in a browser, [recipeBox.test.ts](../../tests/spell/recipeBox.test.ts).
- [cli.ts](server/node/routes/cli.ts):  the API (and `/spaces`) alone, on port 3001.
  - The app's `yarn start:server` / `start:server:prod` run it.
  - It serves the app's own folders (`APP_DIR`), wherever it's started from:  its dist, dist-element and demo.
- It BUILDS projects when needed ([ProjectBuild.ts](server/node/routes/ProjectBuild.ts)):
  their compiled output and scope packs are in `build/`, never committed (epic `people-and-orgs` P11).
  - A request for a built file that isn't there (`/spaces/<project>/<project>.spell.js` ...)
    compiles its project first, then serves it (`projectBuild.builtFirst()`).
    - One compile per project at a time, waiting at most `COMPILE_WAIT_MS`.
  - The route module starts `spell compile --stale --all @spell/examples @spell/library` as the page server starts,
    in the background:  the demo pages and App UI's live examples run them.
  - A child process, the checkout's own `spell compile`:  it compiles as the CLI does,
    and the page server keeps serving pages meanwhile.

## Python's web server

- `spell_quart`:  a Python spell program served as a web app on Quart (epic `python-target` P20).
  - A uv project, [pyproject.toml](server/py/pyproject.toml) with its `uv.lock`:  Python 3.12 or later.
  - It depends on Quart, and on py's `spell_core`, by a path to it (`../../../../../parser/src/py/core`).
  - It moved here from py's `quart/` in P14 (decision Q21).
- `SpellSessions`:  a game per visitor (a cookie), the program run once for each, on a core of its own.
  - A page per WebSocket:  the state down when it opens,
    then a patch after each message and at each pause (`core.before_pause`).
- `page_html()`:  the page.
  - It loads the page side (app's `yarn build:page`, into `dist-page/`), and the program's drawing half.
  - `assets_folder()` finds the page side in the app's folder, or at `$SPELL_PAGE_ASSETS`.
- `spell run <project> --target py` serves one (or `yarn dev:py` in a project's folder).
  cli's [runTarget.ts](../cli/runTarget.ts):
  - compiles it into a temporary folder, with its imports
  - builds the page side, if it's stale
  - runs its app under uv here, until `Ctrl-C`
- cli's [quartApp.test.ts](../../tests/cli/quartApp.test.ts) plays Solitaire through a compiled app,
  in headless Chromium.
- The app folder's checks run its own, from the app folder's root:

  ```sh
  uv run --directory src/spaces/server/py pytest -q                                              # yarn test
  uv run --directory src/spaces/server/py ruff check . ../../../../tests/spaces/server/py/tests  # yarn lint
  uv run --directory src/spaces/server/py ruff format . ../../../../tests/spaces/server/py/tests # yarn format
  ```

## Imports

- As WWOD §4, with our own source folder as `spell/app/spaces` and `spell/app/spaces/*`.
- What it imports:
  - `spell/parser/spell`, and spell's node-only files too (`spell/parser/spell/node/...`)
  - `spell/server`
  - it may import `spell/parser/core` and `spell/util`
  - [projectGroups.ts](models/projectGroups.ts) imports spell's light `spell/parser/spell/SpellSetup` alone.
    So `<spell-viewer>` can load it by path, `spell/app/spaces/models/projectGroups`, without the parser.
- NEVER the app, lsp or cli folders:  they import it.
- `spell` NEVER imports it.
- NOT in the barrel (WWOD §8 › "Barrels"):  everything under `server/`, and `test/`.
  - [cli.ts](server/node/routes/cli.ts) and [appRoutes.ts](server/node/routes/appRoutes.ts)
    start servers or load spell's version first:  import neither from a barrel.

## Decorators

As WWOD §12, plus:

- The root's `vitest.config.ts` uses the toolchain's `spell/toolchain/decorators`:
  the routes load spell, whose rules use decorators.

## Types / Exports

As WWOD §8, plus our self-namespace:

- `SPACES` ~== `spell/app/spaces`
