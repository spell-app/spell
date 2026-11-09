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
  - An org's own programs, `@rs/OrgAdmin`, are a group found by address (`orgProgramGroup()`):  orgs can't be listed
    up front, and the editor lists none of them.
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
    - PUBLISH BY ROLE (epic `atmosphere` P26, T47):
      - a DESIGNER drafts:  a manager of the project's space, or anyone its org lets design it (`canDesign`, T47,
        J117;  below, "The design right");  the editor shows Save only then (`mayDesign`)
      - only a manager publishes (`canPublish` in `SPACE_ROLES`, through `ProjectRoles`);  the editor shows Publish
        only then (`mayPublish`)
      - a manager publishes a designer's drafts for them:  `publish({ of })`, `POST /api/projects/publish`'s `of`;
        `drafters()` says whose there are
      - a project in an org's shared space keeps both folders at its place in the space's PRIVATE one,
        `@rs/__private/minutes/Agenda/__draft/`:  its Managers read each other's drafts, nobody else does
        (`ProjectDrafts.for()`, from `OrgRoles.spaceAt()`);  any other project keeps them beside it
      - each person's drafts are their own, by address (`ana@rs`);  this machine's person's file names keep `owen`
      - versions kept:  the fewer of the org's policy (`@rs/__admin/policy.json5`, `OrgRoles.policy()`, set by the
        Board and the Admins) and the project file's `versionsKept`
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
      (each a membership:  a person and a role, viewer, editor, manager or spell-admin;  an older file's guest,
      member or admin read as viewer, editor, manager)
    - an org's ROSTER, `Roster#rs`, who manages what (epic `atmosphere` P20):  `@rs/__admin/roster.json5`
  - Read:  each file checked against its class (`checkEntry()`, its problems returned, read anyway), brought up to
    its version, and every person or org it names read too.
  - Written:  ONE file at a time, its comments kept;  a friend is written as a reference, never into their file.
  - `me()` writes a starter `__me.json5` the first time, from git's name and email.
  - A project's own files are saved by ROLE (epic `atmosphere` P25, people-and-orgs' T8):
    [ProjectRoles.ts](server/node/projects/ProjectRoles.ts) asks the project's space before each save (an editor),
    new file (`canCreate`, a manager), rename or delete (a manager);  refused 403, naming the role it takes.
    - A page or its source saves as your draft:  that takes the DESIGN right (`canDesign`, epic `atmosphere` T47),
      not a role (below, "The design right").
    - This machine's person changes anything this machine serves;  only a signed-in person is checked.
    - The editor hides New File for anyone without `canCreate` (`mayCreate`, from `GET /api/projects/drafts/`).
  - `isSpellAdmin(id, org)`:  `spell-admin` in Spell's own org, the ONE check (themes' Save into Spell UI, takedowns).
- WHO MANAGES WHAT in an org ([OrgRoles.ts](server/node/people/OrgRoles.ts), epic `atmosphere` P20, Q28):
  the Board (its Org Managers), the Admins, Team Managers and Project Managers, each for a while.
  - Never "Lead" (Q28):  an older roster's `team-lead` and `project-lead` are read as `team-manager` and
    `project-manager`, and an org role's `leads` as `manages` (its version 2).
  - Kept in the org's ADMIN SPACE, `@rs/__admin/` (`ADMIN_SPACE`, one of spaces' own names;  Q25 A):
    - `roster.json5`, the people library's `Roster`:  its roles, standing teams, projects, and terms
    - `log.json5`:  every change, who, when and why, in the takedown log's shape
    - `apps.json5`:  the APPS its spaces may install, each at one version (`approveApp()`, `unapproveApp()`,
      `approvedApps()`;  epic `atmosphere` P23), approved by the Board and the Admins, logged
  - Always looked up, never copied:  a project names "the Events Team", whose people are its Team Managers today.
  - PAIRED SPACES (`spaceAt()`, `PairedSpace`;  epic `atmosphere` P22):  the org, its Admins, each standing team and
    each project has two, a SHARED space everyone in the org reads (Q22 A) and a PRIVATE one only its Managers reach.
    - Their addresses, RS's ten:

      | Whose | Shared | Private |
      | --- | --- | --- |
      | the org's | `@rs/<folder>` | `@rs/__private/<folder>` |
      | the Admins' | `admins@rs/<folder>`, where anyone in the org asks them for something | `@rs/__admin/<folder>`, the Admin space |
      | a team's | `events_team@rs/<folder>` | `events_team@rs/__private/<folder>` |
      | a project's, under its team | `events_team@rs/2026-q4/<folder>` | `events_team@rs/2026-q4/__private/<folder>` |
      | a project's, under the org | `picnic@rs/<folder>` | `picnic@rs/__private/<folder>` |

      - `__private` is one of spaces' own names (`PRIVATE_SPACE`, Q25 A);  pages show it as "private".
      - The roster wins:  a person whose id is a team's folder has no space of their own in the org.
    - Each its own folder under the org's (`@rs/events_team@/__private/`), so export, backups and takedowns work on it
      as on any space;  made the first time it's written.
  - Who manages each (`managersOfSpace()`):  the Board every one;  the Admins every one but the org's private one;
    a team's Managers its two and its projects';  a project's Managers its two.
  - Each of them is that space's MANAGER (`SpaceMembers`), whatever their membership says.
  - A paired space's list is worked out, never typed (`SpaceMembers`):
    - shared:  everyone in the org, by their membership's role, at most an editor;  and its Managers
    - private:  its Managers alone
    - a folder's own `__members/` doesn't count there
    - only the org's own shared space takes a member, as joining or leaving the org;  every other's list changes with
      the roles alone
  - Its rules, as a role changes (`give()`, `end()`):
    - who manages what the role manages, or anything above, may name or end a term;  only the Board, a Board term
    - who's eligible:  the role's own people or teams, else anyone in the org;  nobody outside it
    - an ended term keeps its record, its end day set
  - LEAVING the org (`leave()`, epic `atmosphere` P24):  every term they hold ends that day, and they leave its org file,
    so they're off every list at once;  what they wrote stays, with their name, until the org removes it.
    - Themselves, or the Board and the Admins;  logged.
    - Taking someone off the org's shared space's list does it (`SpaceMembers.remove()`), and so does deleting their
      account (`spell space delete`).
  - LISTS THAT FOLLOW ROLES ([MemberLists.ts](server/node/places/MemberLists.ts), epic `atmosphere` P24):
    - on Spell's own server they're worked out on every read, so a change counts at once;  a term's end date is checked
      on every look-up
    - a space kept in a real Space has a list of its own on the host:  each change to the roles or the members tells
      `OrgRoles`' `onChange`, and the app's `SpaceFolders` (which owns the ONE `OrgRoles` its folders ask) brings each
      of the org's real Spaces into step (`follow()`):  who should be on it put, who shouldn't taken off, the org's own
      account kept
    - a term that ends on its date tells nobody:  the daily round catches it (`followAll()`, below)
    - THE AUDIT, `spell space org audit <org>` (`audit()`):  every space whose list differs from its roles, and how
      - a term held by someone who isn't in the org any more
      - someone the org file calls a manager who manages nothing:  an editor in its paired spaces
      - a paired space's folder with a hand-made `__members/`, which doesn't count there
      - a real Space whose list isn't Spell's
      - It changes nothing, and exits 1 when anything differs.
  - THE ADMIN PAGE (epic `atmosphere` P25):  the built-in program `@spell/examples/OrgAdmin`, plain Spell, reading
    and writing the org's roles as a place, `admin roles is a data folder at "@rs/__admin/roles"`
    ([OrgRolesPlace.ts](server/node/people/OrgRolesPlace.ts), opened by `SpaceFolders` at that address).
    - Its collections, each a program type's plural:  `members`, `teams`, `projects`, `org_roles`, `org_profiles` (the org itself, for its title and as a space to design), `terms`,
      `approved_apps`, `designers` (T47), `event_stages` (T50), `role_changes` (the log).
    - A toolbar with who's signed in (`{the sign in menu}`, the core's), the sections down the side as vertical tabs, one at
      a time, the one picked kept in the page's address;  each section a table with its add form on one row (epic `atmosphere` T56).
      Its rows carry what people read beside what the place stores:  `roleName`, `holderName`, `managesName`, `personName`.
    - Its event stages (T50, J153):  the Board and the Admins add, change and remove the org's event stages there
      (`OrgEvents.setProgram()`);  a new one goes in before the last, and one an event is in, or another moves to,
      can't be removed.
    - In Spanish too:  `@spell/examples/AdministracionDeLaOrg` (T46, J114), the same place, each field `guardado como`
      its English name.
    - Each row added or removed is ONE change through `OrgRoles`, so its rules hold and it's logged;  a person added
      joins the org (`"join"`), a term removed ends.
    - Anyone outside the org reads none of it;  never read direct (the kit's `ORG_ROLES_ADDRESS`).
  - AN ORG'S EVENTS ([OrgEvents.ts](server/node/people/OrgEvents.ts), epic `atmosphere` P32):  each from someone's
    idea to a quiet record, through the stages of the org's EVENT PROGRAM.
    - Anyone in the org PROPOSES one, naming its organizers (`propose()`);  it then MOVES stage by stage (`move()`),
      each move by whoever the stage says:  the team's Managers (`"the team"`) or its organizers (`"its organizers"`);
      the Board and the Admins always.
    - RS's program, every org's until it says its own (`RS_EVENT_PROGRAM`):  Proposed, Approved (the Events Team says
      yes), Planning, Open, Analysis, Quiet.
    - APPROVING it (a stage that `approves`) makes it a project under its team (`addProject()`), its organizers its
      Project Managers (`give()`), and copies the program's template project into its shared space
      (`events_team@rs/picnic/SignUpSheet/`).
    - QUIET:  its spaces read only (`isQuietAt()`, which `SpaceFolders` asks before every write, `quietOrDie()`);
      P33's feed leaves it off too.
    - Kept in the Admin space beside the roles, `@rs/__admin/events.json5`:  `{ program?, events }`;  the program the
      Board's and the Admins' to change (`setProgram()`), every move in the org's log (`"event"`, its stage the name).
    - Its page:  the built-in program `@spell/examples/OrgEvents`, reading the same place as the Admin page at
      `@rs/__admin/events`, its collections `events` (an insert proposes, an update of `stage` moves) and
      `event_stages`.
  - THE DESIGN RIGHT (epic `atmosphere` T47, J117):  who changes a space's PROGRAM, its projects' pages and source,
    apart from who changes its DATA.
    - A space's managers design it by their role;  the org lets anyone else design one, person by person
      (`giveDesign()`, `endDesign()`, `designers()`, `designs()`), whatever their role there:  Vic, a viewer, designs the
      Events Team's pages.
    - Kept in the Admin space, `@rs/__admin/designers.json5`, each `{ person, space }`, the space by its shared address
      (`events_team@rs`);  a grant covers both its sides.
    - Who says so:  whoever manages that space (`managersOfSpace()`), logged;  only someone in the org.
    - The Admin page's "Who designs what", its `designers` collection.
    - An org with no Admin space:  its managers alone design.
  - A PERSON'S OWN SPACE in the org (epic `atmosphere` P28;  `memberSpaceAt()`):  `ana@rs`, Ana's, beside her personal
    `ana@spell`, for her "About me", "Services I offer";  made when first needed, as every space is.
    - Its list is worked out (`SpaceMembers`):  Ana its manager, everyone else in the org a viewer, who reads it;
      its viewers post there only once she turns `viewersPost` on;  a folder's own `__members/` doesn't count, and
      adding or removing someone is refused.
    - Only she writes;  the Board and the Admins delete what's in it, never edit it (`boardAndAdmins()`).
    - It takes any file, code included, by the same rules as any space (J130, Owen:  "don't limit for now";  P28
      refused code there until then).
    - Once she's left the org it's hers alone;  `spell space org leave rs ana@rs --to ana@spell/from-rs` copies it into
      another space of hers (`SpaceFolders.takeOwnSpace()`), or `spell space export` writes it as files.
    - Her INBOX is a space of its own beside it, `ana@rs/__inbox` (below), never part of what she takes with her.
  - A PERSON'S INBOX in the org (epic `atmosphere` P29, Q23 A;  `inboxAt()`,
    [PersonInbox.ts](server/node/places/PersonInbox.ts)):  `ana@rs/__inbox`, where Spell writes what people send her.
    - Its list is worked out (`SpaceMembers`):  Ana an editor, the org's Board and Admins viewers, who read it;
      the inbox page says so plainly.  Nobody else reads or writes it.
    - Someone in the org by their Spell account (`owen@spell`, J163) has theirs at their id there, `owen@rs/__inbox`:
      `PeopleStore.memberCalled()` says who that is;  their feed and thread list are read as `owen@spell` (I16).
    - SENDING is adding a message to her own inbox's `messages` (`INBOX_MESSAGES`), `{ text, recipients, thread? }`:
      Spell then writes a copy into each inbox it's to, the same id in each, as itself, and fills in hers
      (`from`, `thread`, `sent`).  Deleting hers leaves theirs.
      - Through the ONE retry queue (Q19 A):  a copy an inbox didn't take goes again.
      - Its `recipients` must be people in the org;  its `from`, if it says one, her;  its text, something.
      - A thread is the first message's id, unless the page names one:  replies draw as one conversation.
    - NEVER EDITED:  a change to a message is refused;  only she removes her copies.
    - A POINTER:  a message naming a TRUSTED page (`page`), its `title`, `line` and the private `facts` it needs;
      worked out when it's opened, as the page runs as whoever opens it.
      - Trusted:  a page in one of the org's paired spaces, sent by a Manager of that space;  anyone else sends plain
        messages.
      - A FIXED one names one saved version of its page (`saved_version`):  kept for good, past any cap on versions
        (`ProjectDrafts.keepForGood()`, `versions/__kept.json5`).
    - Spell sends too, with nobody behind it (`PersonInbox.sendAsSpell()`):  an invitation's pointer (P31).
    - `@rs/__inbox`, the org's address with no person, is whoever's asking's own (`SpaceFolders`;  the kit's
      `PERSON_INBOX_ADDRESS`, never read direct):  one program, each person's inbox, the built-in
      `@spell/examples/Inbox`.
    - Two more collections only she writes (epic `atmosphere` P30):  `mail_choices` (`INBOX_MAIL`), how she hears of
      it by mail, the first one counting;  `subscriptions` (`INBOX_SUBSCRIPTIONS`), each a shared space of the org
      she follows, `{ space: "events_team@rs" }`, a private one refused.
  - MAIL AND SUBSCRIPTIONS ([InboxMail.ts](server/node/places/InboxMail.ts), epic `atmosphere` P30):  how people hear
    of their inbox, and of the spaces they follow.
    - Each person's MAIL CHOICE (`MAIL_CHOICES`):  one mail per message (`"each"`), a daily digest (`"digest"`, the
      default), or none;  a copy landing in her inbox (`PersonInbox`'s `onArrived`) is mailed, kept for the digest,
      or nothing.
    - The DIGEST:  one mail a day with every message since the last, from `DIGEST_HOUR` (7, the server's clock), a job
      of the daily round (`sendDigestsIfDue()`).
    - SUBSCRIBING:  a new thing someone makes in a shared space reaches each subscriber's inbox as an UPDATE (Q24 A),
      from the space, as Spell (`PersonInbox.sendAsSpell()`):  a post, a row or a file, never an app;  the one who made
      it hears nothing.
    - Who hears of what is ONE look-up, [Followers.ts](server/node/places/Followers.ts) (P38's phone alerts ask it too).
    - Every mail has a STOP LINK, signed by the server (`ReadCredentials.sign()`), at `/api/mail/stop`:  it sets the
      inbox's choice to none, or ends that subscription.
    - Through the ONE mail seam (`Mailer`), the same catcher as the sign-in's (`environment.signInDir`'s `mail/`), until
      P18's sender;  through the ONE retry queue (Q19 A), on the server's disk.
    - Made by `SpaceFolders` when it's handed a `mailer` (the page server and the cloud);  without one, no mail.
  - A PERSON'S FEED in the org ([PersonFeed.ts](server/node/places/PersonFeed.ts), epic `atmosphere` P33):
    `bo@rs/__feed`, what's new across every space of the org he may read, put together each time he asks.
    - `@rs/__feed`, the org's address with no person, is whoever's asking's own (`SpaceFolders`;  the kit's
      `PERSON_FEED_ADDRESS`, never read direct):  one program, each person's feed, the built-in `@spell/examples/OrgFeed`.
    - Every space's `posts` (`FEED_POSTS`), each read through its own place AS HIM:  its read check, takedowns and
      public settings hold, and a space he can't read is left out;  every inbox left out, and a quiet event's spaces
      (`OrgEvents.isQuietAt()`).
      - Which spaces:  every folder under the org's holding posts (`MemberLists.spacesOf()`, by `posts.list.json`).
    - Each row the post as its space has it, its id `<space>~<id>`, its `space` saying where it's from.
    - Read only, and sorted by nothing:  the RANKING is the page's, a Spell property in its program
      (the built-in's `weight`:  2 more of it, 1 as it comes, 0 none), changed by changing his own copy of the program.
    - The second time, only what changed:  its version is each space's own, so `changesSince()` asks each space what
      changed since (`FolderPlace.changesSince()`), a space new to him whole, and one gone from his feed removed.
    - For communities of hundreds:  300 posts read well under a second, in its test.  Not a feed for millions,
      worked out ahead of time.
  - An org with no Admin space (the family cookbook) has no org Managers:  its spaces use their three roles alone.
- SETTING UP AN ORG ([OrgSetup.ts](server/node/people/OrgSetup.ts), epic `atmosphere` P35, Q29):
  `spell space org create rs --name "RS" --admin ana@example.org [--team "Events Team"]`, in one go.
  - Each first Admin's account by email (`ana@spell`), the org's file with them in it as managers, its Admin space
    (`OrgRoles.setUp()`, the first Admin its first Board), every first Admin an Admin, each team, and its paired
    spaces' folders.
  - Run again, it makes only what's missing, and says what was there.
  - Recovery codes are left for later (`spell space org codes`):  they need two holders.
  - The invite's mail goes through the running cloud (`spell space cloud invite`);  `OrgSetup` itself sends nothing.
- AN ORG'S RECOVERY ([OrgRecovery.ts](server/node/people/OrgRecovery.ts), epic `atmosphere` P21, Q15 A):
  how its Board takes it back, even from a Board gone wrong.
  - The Board's standing right needs nothing:  it manages the Admin space whatever happens, so it can always name
    Admins, even with none left.
  - RECOVERY CODES:  a secret split into parts, a part each for a few of the org's people, any 2 enough by default
    (Shamir's secret sharing);  each part shown once, to hand over.
    - Spell keeps none of them:  only the secret's hash and who holds which part, `@rs/__admin/recovery.json5`.
  - A recovery, with enough parts:  the Board (and Admins) named anew, every other Board and Admins term ended,
    the codes spent.
  - Both logged in the org's log (`OrgRoles.logChange()`);  `spell space org codes | recover`, by a Spell admin.
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
  - The house-network test site the same way:  [LocalSiteServer.ts](server/node/routes/LocalSiteServer.ts),
    the cloud and Caddy, from the main checkout's page server alone, on a Mac `spell space local setup` has set up
    (epic `atmosphere` T58).
    - Quiet anywhere else;  a failure is one line in the log, and never stops the page server.
    - Its row in `spell server start all`:  the route module's `addServerReport`, so the kit names none of it.
    - A test's page server never starts it (`VITEST`);  `SPELL_NO_LOCAL_SITE=1` turns it off.
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
      - except a KEEPER:  the space's person, or a manager of the space (`SPACE_ROLES`' `canChangeAny`;  P1, P20)
    - either way, `by` is who wrote each thing last
  - Its members ([SpaceMembers.ts](server/node/places/SpaceMembers.ts), Q9), the first of these there is:
    - the folder's own `__members/` (optional)
    - a person's space:  its person
    - its org's memberships (`PeopleStore.rolesOf()`)
    - in an org with an Admin space, instead:  its paired space's list, worked out from the org's roles
      (`OrgRoles`, P20, P22;  above, "Who manages what")
    - Each role is a space role, the ONE table `SPACE_ROLES` (P20, Q20 A, Q21 D):
      a viewer reads and posts, an editor also changes what's there, a manager also makes and removes, and manages the list.
      - An older file's guest, member and admin are read as viewer, editor and manager.
    - WRITES BY ROLE (epic `atmosphere` P23, Q21 D):  what each role may write depends on the KIND of thing, by its
      collection (the kit's `thingKindOf()`), checked where a write lands (`SpaceMembers.changeOrDie()`, handed to the
      kit's `FolderPlace`):

      | Role | a post (posts, comments, messages) | a row (any other collection) | a file (`__files`) | an app (`__apps`) | a thread (`threads`, P36) |
      | --- | --- | --- | --- | --- | --- |
      | viewer | makes;  changes and removes its own, where the space lets viewers post (`viewersPost`) | -- | -- | -- | -- |
      | editor | makes;  changes and removes its own | makes;  changes any;  removes its own | the same as a row | -- | -- |
      | manager | makes;  removes any;  changes only its own | makes, changes and removes any | the same | installs one the org's Admins approved | starts, changes and removes any |

      - "its own":  whose `by` is them;  nobody else ever changes a post, so its `by` is always its writer
      - a refusal is `"role"`, with the role it takes (`needs`:  `"editor"`, `"manager"`), so a page names it in its own
        language (the core's `write-refused-editor`, `write-refused-manager`);  someone else's post is `"owner"`
      - an app:  a record in the space's `__apps` (`{ name, version }`), installed only at a version the org's Admins
        approved (`OrgRoles.approvedApps()`, `@rs/__admin/apps.json5`);  an org with no Admin space approves none, and
        refuses none
      - `canCreate` (a manager):  the right to make something new, which the editor's "New page" will follow
    - Joining, leaving, managers (T6):
      the place's own operations, through the same route's `call`:
      - `members`, `addMember`, `removeMember`
      - written to the folder's `__members/`, or to the org's file through the people store
      - the people store's side:  `setRole()`, `removeMembership()`
      - A member may always leave;  the last manager can't.
  - READ DIRECT (epic `atmosphere` P5, Q6 C):  a space's own folder's files, read straight,
    apart from where they're written.
    - At `/api/reads/spaces/<address>/` (the kit's `DirectReads`), with a credential for the whole space.
    - A member, a viewer too, gets one from the write side (`POST .../credential`):
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
  - SIGN-UP SHEETS (epic `atmosphere` P27, J101;  [SpaceSheets.ts](server/node/places/SpaceSheets.ts)):
    a space's folder whose lines say who signs up, who's on its list, and how many a shift takes.
    - A program says it under its place:  `- open to sign-ups from "picnic@rs/sheet"`, `- only its attendees add rows`,
      `- at most 2 rows for each shift` (the built-in `@spell/examples/SignUpSheet`).
    - Kept in the folder's `__settings/sheet.json5`;  set through its operations (`SPACE_SHEET_OPERATIONS`) by a
      manager's page as it opens the place.
    - Someone who reads the space sign-ups come from adds rows, as themselves (`person`), and changes or removes only
      their own, though they can't read the master:  so the master sits in a private space, organizers' notes and all,
      and a projection publishes what everyone sees.
    - Checked where the write lands (the kit's `FolderPlace`, `signUpOrDie`), one write at a time:  two asking for the
      last place, one gets it and the other is refused `"full"`;  someone the list doesn't name, `"not listed"`.
    - Every collection of the folder is a sheet but the list it names;  a manager isn't held to the list, but is to a
      shift's places.
  - INVITATIONS (epic `atmosphere` P31):  a sign-up sheet's tickets, in the same master.
    - `- at most 40 rows for each event`:  several `at most` lines each hold (`mostEach` takes a list).
    - `- each person asks for at most their "invitations" tickets` (`allowance`):  as many as their row on the list
      says, one more refused `"used up"`;  a manager isn't held to it.  The organizers' page works the number out
      (`work out the invitations`:  one more than their shifts, two for a member).
    - Each change to someone's tickets sends them their count, Spell's update in their inbox
      (`PersonInbox.sendAsSpell()`, one message per sheet, written over):  "You have used 2 of your 3 available
      invitations".
    - `- confirmed tickets join "picnic@rs/__attendees"` (`joins`):  once a manager sets a ticket's `status` to
      `"confirmed"`, its `guest` (else its `person`) goes on that space's list;  nobody else sets `status`.
    - An event's ATTENDEES' SPACE, `picnic@rs/__attendees` (`ATTENDEES_SPACE`, one of spaces' own names):  a third side
      of a paired space (`OrgRoles.spaceAt()`'s `side: "attendees"`), its Managers the pair's, the rest its own
      `__members/` (at most editors);  its Managers add and take off anyone.
    - The letter:  the built-in `@spell/examples/PicnicLetter`, one page every attendee opens, reading the published
      sheet's shifts and their inbox's count as them;  the organizers send it as an inbox pointer (`send the letter`).
  - LIVE ROOMS (epic `atmosphere` T38):  a space's own folder shared live, a room per collection,
    at `/api/rooms/spaces/<address>/<collection>` (a websocket;  the kit's `Referee` on the space's `FolderPlace`).
    - Each write is its page's person's, so every check here holds in a room too.
    - Only someone who may read the space joins.
    - A program names one by its Spell address:  `team chat is a room at "events_team@rs/messages"`, the page server's
      room of that space's `messages`, signed in by a Spell account as a data folder is (epic `atmosphere` P36).
  - CHAT THREADS (epic `atmosphere` P36):  a live room of a space's `messages`, the built-in `@spell/examples/OrgChat`.
    - Every team, project and event has two, with nothing to set up:  an open thread in its shared space
      (`events_team@rs/messages`), everyone in the org writing there, and its organizers' in its private one
      (`events_team@rs/__private/messages`), only its Managers.
    - A message is a post:  everyone deletes their own, the space's Managers anyone's, and nobody changes another's.
    - Ad-hoc threads in the org's shared space:  a record in its `threads` (the kit's `THREADS_COLLECTION`, kind
      `"thread"`), which only a Manager makes, there the Board and the Admins;  its messages name it in their `thread`.
    - A busy thread:  200 messages from one page, one after another, in about a second on this machine (its test).
  - THE THREAD LIST (epic `atmosphere` P37, T53):  every thread a person may read, down the side of the built-in Chat,
    like Slack's channels ([PersonThreads.ts](server/node/places/PersonThreads.ts)).
    - `@rs/__threads`, the org's address with no person, is whoever's asking's own list (`SpaceFolders`;  the kit's
      `PERSON_THREADS_ADDRESS`, never read direct):  each paired space's open thread (`OrgRoles.pairedSpacesOf()`), the
      organizers' ones they manage, and the org's ad-hoc ones;  an org with no Admin space, its own open thread alone.
    - Each row:  `name`, `side`, `thread` (its room), `topic` (an ad-hoc thread's id) and `link`, the page's address
      showing it, `?thread=events_team@rs/messages`.
    - The page's room is at `"@rs/__thread"`:  whichever thread its address names, else the one this browser showed
      last, else the org's own (the kit's `roomForPage()`);  picking another is following its link.
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
    - Both off, until a manager turns them on (the `settings` / `changeSettings` operations).
    - `publicRead`:  anyone reads it, signed in or not, through the write side or direct (no credential needed).
    - `publicWrite`:  anyone signed in adds things, and changes or removes only the ones whose `by` is them;
      members change any.
    - And a third, `viewersPost` (epic `atmosphere` P23):  on unless a manager turns it off;  whether its viewers post
      and comment.
    - E.g. a sign-up sheet has both on;  a club's events page, `publicRead` alone.
    - Takedowns refuse and hide in a public space as in any other.
  - LIMITS (epic `atmosphere` P7, `SPACE_LIMITS`):  a thing's file about 1 MB, a space's folder 100 MB.
    - A save past either is refused, 413 `"over the ceiling"`, saying how big.
    - The page keeps it, and tries again.
  - LEAVING (epic `atmosphere` P7, T5;  [SpaceExport.ts](server/node/places/SpaceExport.ts)):
    a space as plain JSON files, laid out as its folder is.
    - A chat app (epic `atmosphere` T61):  fills the window (`cloudApp.html` has no padding of its own), a toolbar with
      who's signed in, the threads in a 260px side bar, the box pinned below only the messages scrolling.
      - The box is `<ui-textarea grow send-on-enter>`:  Enter sends, Shift-Enter types a new line.
      - At phone width the side bar's list opens in a `<ui-flyout>` from the toolbar's bars button.
      - Every org program has the same toolbar (`{the sign in menu}`, its programs linked in it), written out in each:
        each org gets its own copy of the programs, so a shared file wouldn't reach them.
    - With `members.json`, and a note on leaving with its id.
    - Read through its place, so what's taken down is left out.
    - A member downloads it as a zip, at `/api/exports/spaces/<address>`;  `spell space export` writes the folder.
    - A program runs on it with one line:
      `... is a data folder at "./my-export"`, the folder beside its page.
    - The promise to hand a space's keys over once it has a real AT Protocol id:
      Spell's terms, [terms.html](server/node/places/terms.html), at `/terms`.
  - DELETING:  a manager's `deleteSpace` operation, or `spell space delete <space | account>`.
    - It removes every file but Spell's takedown log.
    - An account's also leaves every org.
  - BACKUPS ([SpaceBackups.ts](server/node/places/SpaceBackups.ts), epic `atmosphere` P7, Q8 B):
    a plain copy of spell.spaces each night, a week kept.
    - In `environment.backupsDir` (`SPELL_BACKUPS_DIR`:  name a second disk).
    - Made by the MAIN checkout's page server, and the cloud:  a job of their DAILY ROUND (below).
    - A missed night is in its log, and in `spell space backup status`.
    - `spell space backup restore <space>` brings one space back.
  - THE DAILY ROUND ([DailyRound.ts](server/node/routes/DailyRound.ts), epic `atmosphere` P24):  the ONE timer for a
    server's daily work, on util's `every()`;  each job looks every hour whether it's due.
    - `spacesDailyRound(folders)`:  the backups (`backUpIfDue()`), then each real Space's member list
      (`MemberLists.followAll()`);  P30's digest joins it.
    - Run by the MAIN checkout's page server (the route module) and the cloud;  a worktree's server runs none.
    - A job that fails is reported in the server's log, and tried again at the next look.
  - Who's asking:  `prefsPersonFor()`, whoever's signed in, else this machine's person.
  - An account, `ana@rs`, is read in ONE place:  `SP.SpellLocation.isAccount()` and `accountParts()`
    (epic `atmosphere` P16), never a pattern or a split of its own.
  - THE CLOUD ([SpellCloud.ts](server/node/routes/SpellCloud.ts), epic `atmosphere` P8, Q8 B):
    the same folders and sign-in, for people OUTSIDE this machine.
    - A plain web server of its own, never the page server:  `spell space cloud serve`, port 4949.
    - Behind a tunnel or proxy, which gives it its `https` address.
      - It may have several, `--address https://spell.app --address https://spell.space` (`alsoAt`), the first its main
        one:  a sign-in begun at one finishes at that one, and a browser's cookie is per host, so people sign in once at
        each.
    - Who's asking is whoever's signed in, nobody else (`signedInPerson()`):  its pages carry no write token.
    - What it serves, and nothing else:
      - the sign-in, the project data folders, `/terms`, `/element/`
      - the built-in programs' pages (`/apps/<project>`, `cloudApp.html`) and files
      - a program in an org's SHARED space, `/apps/@rs/OrgAdmin`, for whoever reads that space (`sharedProgramAt()`)
        - someone who can't yet gets `cloudSignIn.html` at its address, whatever the name:
          a program's files are the org's, so it can't load to draw its own sign-in bar
          - STAYING SIGNED IN (epic `atmosphere` I20):  the session cookie is `SameSite=Strict`, so a link from another
            site brings no cookie and gets this page;  the page asks `GET /api/sign-in/me` (which does bring it) and,
            signed in, goes to its own address once more.
            Once only (`sessionStorage`):  someone who really has no access is told so, and it never loops.
        - `spell space org create` copies the Admin, Inbox, Feed and Chat programs there, each naming the org (`OrgSetup`)
      - THE HOME PAGES (epic `atmosphere` T59;  [CloudHomes.ts](server/node/routes/CloudHomes.ts), `cloudHome.html`):
        - `/`, the spaces home:  each org the person asking reads, their own space, and anything else public or whose
          list names them;  nobody signed in, the public ones and Sign in (`/sign-in`)
        - `/@rs`, an org's home, for whoever reads the org:  its programs and its other spaces;  anyone else gets the
          sign-in page, the same whether the org is there or not
        - Their lists come from `/api/cloud/home` and `/api/cloud/home/orgs/<org>`, only what the person asking may read
          (`SpaceFolders.mayReadSpace()`);  only an org has a home yet, so a team's or a person's space has no link
        - Their look (epic `atmosphere` T62):  the org programs' top bar, Spell's name on the left, who's signed in on
          the right as a drop-down with Sign out (or a Sign in button);  each space a card saying what it is (`kind`),
          each program a card with its icon;  `cloudSignIn.html` draws the same bar with nothing on its right
      - never the mail catcher's page, a private space, the Admin space, nor anyone's own projects
    - `spell space cloud serve` builds the browser bundle first when it's stale (`browserBundleCurrentOrDie()`):
      it's git-ignored, so nothing else keeps a checkout's current.  Checked as it starts:  a merge needs a restart.
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
