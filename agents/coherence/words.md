# The words:  one for each idea

What we call a thing in code, events, attributes and docs:  one word for one idea, the platform's word first.
The coherence agent reads it too, and flags a second word for the same idea (epic `coherence`).

- One entry per idea:
  - **Say:**  the word, and its forms (events, attributes, states)
  - **Not:**  the words it replaces
  - **Decided:**  where, and by whom
  - **Score:**  the replaced words as a search, for `spell coherence score`'s count of them still in the code
    (the catalog's header says how a **Score:** line reads);  an entry about prose has none
- Only words already decided.  A word still open is a question under "Open", for Owen.
- The rules WWOD already has about words are linked, not copied:  §3 "Naming", §6 "Writing for people".
- The mechanisms:  [catalog.md](catalog.md).

## Showing and hiding

### open / close

- **Say:**  open, close, for anything that shows and hides:  a fold, a section, an accordion's panel, an overlay
  (modal, flyout, sidebar, popup, dimmer, toast, nag), a tab's pane, a transition, the site's edit panel.
  - The attribute:  `open`, as `<details open>` and `<dialog open>` say it;  never its opposite (`collapsed`).
  - The events, a pair each way:  `ui-opening` (before, cancelable) and `ui-opened` (after);  `ui-closing` and
    `ui-closed`.
  - A message dismissed for good closes too:  `closing` / `closed`.
- **Not:**  fold, unfold, expand, collapse, toggle, reveal, show, hide, dismiss.
  - `toggle()` stays as a METHOD that opens or closes, as `<details>` has a `toggle` event:  never an event name of
    ours.
- **Score:**  `"ui-(folded|unfolded|fold|unfold|expand(ed|ing)?|collapse[ds]?|collapsing|show(n|ing)?|hid(e|den|ing)|dismiss(ed|ing)?)"|\bcollapsed=|\[collapsed\]|"collapsed"`
  · not `ui/src/jsx.ts`
- **Decided:**  epic `elemental-spell`, 2026-10-24, its event-name rounds:  Q65 (A:  an `open` attribute opens and
  closes) and Q68 (A:  overlays open and close too;  Owen:  "Use for tabs, transitions, edit panel as well").
  - Owen, round 2:  "folding is a programmer concept, showing and hiding are people concepts ... better to reuse
    terms for analogous things."
  - Its P9 makes the renames;  until it's merged, the old words are still in the code.
- **In code:**  the kit's `Disclosure` (`spell/element`;  epic `coherence` P8) holds the state, sends the pairs and
  writes `aria-expanded`, its methods `open()`, `close()`, `toggle()`;  each element maps its own public names onto it
  (`collapsed`, `visible`), so P9's renames change one mapping each.

## Selecting and parts

### select

- **Say:**  select, selected, selection, for what people choose on a page or in a list:  `select()`, `selection`,
  `Inspector.selected`, `ui-menu`'s `selected`, "selected" in what people read.
- **Not:**  pick, picked, picker, in what we name.
  - `pick` stays as the plain English verb in prose ("Owen's pick", a pick on an epic page), and in TypeScript's `Pick<>`.
- **Score:**  `\b(Picked|PartPicker|isPicking|startPicking)\b` · in `app/src/app/solid/`
- **Decided:**  epic `editor` Q14:  the code had `select()` and `selection`, and Owen says "select";  P11 made the renames.

### part, view

- **Say:**  part, for one piece of a running app the Inspector can select:  a drawn thing or a Spell UI element
  (`SelectedPart`, `partsIn()`).
  - **Views** stays the name people read on the card and its tab, the app as a tree of its views.
    A row of it is a part.
- **Not:**  a second word for the piece in code.
  A `view` in code is spell's own type, what `a card is a view` means, so a part may be one and may not.
- **Decided:**  epic `editor` T2, P11 (a calm call:  it renames nothing people see).

## People and things

### people

- **Say:**  people, in what people read:  docs, pages, UI text.
- **Not:**  users.
- **Decided:**  WWOD §3, "Naming":  its rule on people.

### viewer

- **Say:**  viewer, for the person reading a page (a docs page, an epic page, a components page).
- **Not:**  reader.
  - NOT "person" either in Spell UI's docs code, where "viewer" was chosen first;  "person" is the epics' code word
    for who wrote something (below).
- **Score:**  `\b(reader|person)\b` · in `ui/src/docs-components/`
- **Decided:**  Owen, 2026-10-25, epic `coherence` Q9.
  - Sweep 1 found Spell UI's docs code saying "viewer" 51 times, "reader" 18, "person" 10;
    P14 made them "viewer" (Spell UI's docs components).
- **Not the same word:**  WWOD §6's "reader", the person reading any text we write (a docstring, a README, a page):
  it's about writing, not the code's name for who looks at a page, so it stays.

### person

- **Say:**  person, in code, for whoever is at the keyboard and writes on a page:  a turn of `person` | `agent`,
  `EpicHome.person()`, `NEEDS_PERSON`;  "the person", in the skills, where a step is about whoever reviews.
- **Not:**  Owen (or any one person's name), user, reviewer.
  - "Owen" stays in quotes, dated rules and history:  `(Owen, 2026-10-25:  "...")`.
  - `ActiveTime`'s `ASKS_OWEN` and `ReviewBackfill`'s `NOT_OWEN` read a session's own transcripts:  whoever typed
    there, not a page's person;  their docstrings say so.
- **Decided:**  Owen, 2026-10-29, epic `epic-friend` Q7 (A:  "you" on pages, "person" in code).

### you

- **Say:**  you, your, on a page, to whoever is looking:  "waiting on you", "your test run", "You" on your own reply;
  the epic help (`epic --help`) says it too.  Another person's words show their name, an agent's "Claude (Ana)".
- **Not:**  Owen, the user, the reviewer.
- **Score:**  `\bOwen\b(?!(,\s+\d{4}-\d\d-\d\d|:\s+"))` · in `epic/src/components/**.en.ts`
  - a dated quote (`Owen, 2026-10-25:  "..."`) is history, and doesn't count
- **Decided:**  Owen, 2026-10-29, epic `epic-friend` Q7 (A).
  - P3 made the components' English text, the epic help and the skills say it;  their test,
    `epic/tests/definitions/VocabularyWords.test.ts`, fails on a new one.

### from / by

- **Say:**  `from` in a page's markup (`<epic-reply from>`, `<epic-status from>`), `by` in data (a comment's reply,
  `{ by }`):  ONE idea, who wrote it, or whose session did.
- **Not:**  `role` (the browser's accessibility attribute), `author`.
- An agent's words say so by `agent` (`agent="claude"`), never by the name:  a person may be called "Claude".
- **Decided:**  Owen, 2026-10-29, epic `epic-friend` Q9 (A, the marker generalized to `agent`).

### agent

- **Say:**  agent, in code and on pages, for whatever AI writes on a page for a person (Claude, Codex ...):  a turn of
  `agent`, `agent="codex"`, `EpicHome.agent()`, `latestAgentAt()`, `markAgents()`;  the agent's own name only where
  that one agent is meant ("Codex (Bob)" on a reply, Claude Code's `CLAUDECODE`).
- **Not:**  Claude, for the idea:  a person may run Codex, or both (Owen, 2026-10-29:  "bob uses codex and I use
  claude?").
  - Old words read, for one release:  a turn of `claude` (`ThreadFacts.asTurn()`);  `CLAUDE_NAME` stays only for the
    old rule that reads replies written before the marker.
- **Decided:**  Owen, 2026-10-29, epic `epic-friend` Q13 (A) and P10.

### Booleans on an element

- **Say:**  bare, as the platform's are, on a custom element's public side:  `open`, `disabled`, `readOnly`.
  `is` / `has` / `can` for our own members (`isOpen`).
- **Decided:**  WWOD §3 › "Boolean getters prefixed `is` / `has` / `can`" (Owen, 2026-10-06).

### member, and a space's roles

- **Say:**  member, for everyone on a space's list (or in an org), whatever their role, as AT Protocol's Spaces say it.
  - A space's roles:  viewer (reads), editor (also writes), manager (also adds people and changes the space):
    the app's `SPACE_ROLES`, `SpaceRole`.
  - Not the same word as "viewer" above, the person reading a docs page:  a space's viewer is a role.
- **Not:**  guest, for a member who only reads;  "member" for a role.
  - Older membership files' `guest`, `member` and `admin` are still read, as viewer, editor and manager
    (`spaceRoleFor()`).
- **Score:**  `role: "(guest|member|admin)"` · in `app/src/`
- **Decided:**  Owen, 2026-11-06, epic `atmosphere` Q21 (D);  built in its P20.

### manager / Admin

- **Say:**  manager, for a space's role that manages its list and settings (its flag, `canManage`).
  - Admin, capital A, only for an org's technical Admins, who keep its Admin space (`@rs/__admin`).
  - Org Manager, Team Manager, Project Manager, for the org's roles that manage the org, a team or a project:
    each is its spaces' manager.  The Board are the org's Org Managers.
  - "Who manages this space", never "who leads it".
- **Not:**  admin, for a space's role.
  - `spell-admin` stays:  Spell's own, a role in Spell's org.
  - Lead (Team Lead, Project Lead):  two words for nearly one idea.
    An older roster's `team-lead` and `project-lead` are still read, as `team-manager` and `project-manager`.
- **Decided:**  Owen, 2026-11-06, epic `atmosphere` Q20 (A) and Q28;  built in its P20.

## Pages

### Each kind of page has one name

- **Say:**  epic page, saga page, details page, review page, choice page, run page, guide, cheatsheet, commands
  page, components page, components guide, brand page, home page, list page, changelog, template.
- **Not:**  plan doc, epic doc (the epic page);  durable doc (the guide);  docs index (the home page);  goal (a saga).
- **Score:**  `(?i)\b(plan doc|epic doc|durable doc|docs index)\b`
- **Decided:**  the kit's `AGENTS.md`, "Words" (Owen, 2026-10-14, epic `epic-workflow` P14).

## Themes

One word for each idea about how a page looks (epic `debut` P17, Q29;  Owen, 2026-10-25:  "One word each").

### theme

- **Say:**  theme, for the whole of how a page looks:  Spell, Glass, Fruity, Merlot (Spell UI's `UI.themes`).
  - Its menu is `<ui-theme-menu>`;  where a place keeps the one a viewer picked, `ThemePreference`.
  - The editor marks the one it wears by its name:  `<html data-spell-theme="glass">`.
- **Not:**  look (retired below), skin, style.

### scheme

- **Say:**  scheme, for light or dark (and `system`, following the OS):  the CSS word, `color-scheme`.
  - `ThemePreference.setScheme()`, `flipScheme()`;  the kit's `ColorScheme`;
    the site header's light / dark button, `flipScheme()`.
- **Not:**  mode, theme ("dark theme"), look.

### primary

- **Say:**  primary, for the colour a theme leads with, the one a tint replaces (`--ui-primary`).
- **Not:**  accent, brand colour, main colour.

### accent

- **Say:**  accent, ONLY for Spell UI's `accent` hue (Polished Ivory, the Spell theme's `--ui-accent`).
- **Not:**  for the primary colour.
  - A theme's own primitives may still say it inside its sheet (`--glass-accent-light`):  they're private to it.

### look (retired)

- **Was:**  the editor's word for its three chrome shapes (`EditorTheme.LOOKS`, `data-spell-look`), and for the
  pair a docs page kept (`ThemePreference.look`, `DocsLook`).
- **Say instead:**  theme, or theme and scheme (`ThemePreference.chosen`, `ThemeAndScheme`).
- **Decided:**  epic `debut` P17, Q29.
  - A table of how a thing is drawn (`TAB_LOOKS`:  its icon and its text) is another idea, and keeps its name.

## Keys

### meta / mod

- **Say:**  in a Spell UI shortcut (`<ui-keys shortcut>`, `<ui-action shortcut>`, `Chord`):
  - `meta`:  the Meta key itself (Command on a Mac, the Windows key elsewhere)
  - `mod`:  Command on a Mac, Control elsewhere
- **Decided:**  Owen, 2026-10-26, epic `coherence` sweep 2 (ui-components #3):  `<ui-keys>`'s reading wins,
  `<ui-action>` follows (P17).
- **Not the same word:**  spell's own `meta`, in a spell program, is Command-or-Control (epic `elemental-spell` Q31):
  it's the language's word, not Spell UI's attribute.

## Spell's own projects

The `@spell` space's built-in projects, and the tests that read them (epic `content` P2, its T3).

### fixture

- **Say:**  fixture, ONLY for a frozen test project:  the `@spell/test` group, tests' own, never edited to follow
  anything (`FIXTURES_DIR`, `FIXTURES_GROUP`).
  - The examples and Spell guides are "test projects tested in place" (`EXAMPLE_PROJECTS`, `GUIDE_PROJECTS`):
    read where people edit them, their snapshots beside the tests.
  - "Test project" is any of the three;  a test names one by its group and name (`TestProjectName`):
    `fizzbuzz` is the fixture, `@spell/examples/fizzbuzz` the example.
- **Not:**  fixture for an example, a Spell guide, or the hand-kept spellx twins (those are "twins").
  - The helpers that read any test project keep their old names for now (`compiledFixture()`,
    `loadFixtureProject()`, `PYTHON_FIXTURES`):  a rename of their own.
- **Decided:**  epic `content` P2 (T3).

### the @spell space

- **Say:**  the `@spell` space, for Spell's own built-in projects (`spaces/@spell/` in the app folder):
  its groups `@spell/examples`, `@spell/notebooks`, `@spell/guides`, `@spell/library`, `@spell/test`.
- **Not:**  the `@spell` package, `@spell/` packages.
  - "Package" is the npm package (`spell`, `spell-ui`, `spell-epic`).
- **Decided:**  epic `content` P2 (T3).

### guide / Spell guide

- **Say:**
  - guide:  a docs page, the epic's lasting page (the kit's `AGENTS.md`, "Words")
  - Spell guide:  a `@spell/guides` project, a spell file that reads as prose with a working program inside
    ("A first spell", "How Solitaire works")
- **Not:**  a bare "guide" for a `@spell/guides` project, where a docs page could be meant.
- **Decided:**  epic `content` P2 (T3).

### content / epic repo / epic folder

- **Say:**
  - content:  the `@spell` space's examples, notebooks and Spell guides:  what `spell content check | update`
    and the epic `content` work on
  - the epic repo:  `spell.epics`, the repo of epic pages, guides, sagas and logs every checkout shares
  - the epic folder:  that repo's folder on disk, the one the `contentFolder` setting names
    (edit a shared file at its real path, in the epic folder)
- **Not:**  "the shared content", "the content repo", "the shared repo" for `spell.epics`;
  "the content folder" for its folder.
  - Names only code reads keep their spelling:  the `contentFolder` setting, `contentOf()`, `contentFolderOf()`,
    `serveContent()`, `contentRemote`, `--content-repo`, the `epic shared ...` verbs.
  - `epic repos ...` and the code name `EpicRepo` are about CODE repos (the ones the epic server serves, the one an
    epic is worked in), not the epic repo (Q63 of epic `epic-engine`).
- **Decided:**  Owen, 2026-10-29, epic `content` Q7 (B:  keep `spell content`;  "the shared content repo is the
  epic repo from now on");  "change spell.epics folder to epic folder not content folder" (epic `epic-engine` r48);
  built in epic `epic-engine` P56.

## Running

### place

- **Say:**  place, for where a program's data lives:  `Place`, `Places`, `PlaceThings`, in code;  a place's kind in plain words, the same in
  `PlaceCapabilities.kind` and a program's line:  `web server`, `graphql server`, `data folder`, `file`, `room`, `sheet`, `excel file`, `google sheet`,
  `database on this device`, `in memory database`, `atmosphere account`, `personal atmosphere account`, `airtable`,
  `the cloud`.
  - `the cloud`:  each person's own project data folder on Spell's server, in their space,
    kept in the browser until they sign in.
    - Its line is `family cookbook is saved in the cloud`, never `is a cloud`.
    - `the cloud` is also its kind's word in the side bar (`CLOUD_KIND`),
      and the server's in a command (`spell space cloud`).
  - An Airtable's own word stays for what it holds:  a base, a table, a record.  The kind is `airtable`, never "airtable base".
  - The line:  `family cookbook is a web server (at|from) "..."`:  `at` and `from` mean the same, never read only.
  - `sheet` and `spreadsheet` are one kind, a CSV file, or an Excel workbook when its address ends `.xlsx`;
    `excel file` names a workbook whatever its address ends in;  `google sheet` is its own.
  - Code names that say what they are stay:  `RestPlace`, `GraphPlace`, `LiveRoomPlace`, `DevicePlace`.
- **Not:**  source, store, record, sync, backend, for the idea, in anything a person reads;
  web service, graph service, folder (of a place), live room, airtable base, at protocol, this device, in memory (as a kind);
  `a cloud`, `is a cloud`, `cloud storage`, `cloud server`:  the cloud is always `the cloud`, said one way.
- **Score:**  `\b(web service|graph service|live room|airtable base|at protocol account)\b` · in `parser/src/spell/rules/`
- **Decided:**  epic `data` Q1, Q2 and J55;  its P11 lined the words up;  Owen's picks, 2026-10-31, its P15;
  `the cloud` settled as a place's line and its kind's word by epic `atmosphere` P8 (2026-11-04), as it's built.

### Lexicon

- **Say:**  Lexicon, capitalised, for AT Protocol's schema language and one document of it (`Recipe.lexicon.json`).
  - A type is `published` when its records are for other apps too:
    `- it is published`, `- it is published as "<name>"` (Spanish `- se publica`, `- se publica como`).
  - Its name, an NSID, is `the schema's name` in what a person reads.
- **Not:**
  - lexicon (lowercase) for the language
  - `schema` alone for a Lexicon, which says JSON Schema in this repo
  - `exported`, `shared`, `public` for a published type:  every atmosphere record is public, published or not
- **Decided:**  epic `atmosphere` P10 (2026-11-04), as it's built;  the word on a type's declaration its J item.

### the details under a place

- **Say:**  `recipes live at "/dishes"`, `its version is its? "version"`, `its id is its? "id"`,
  `check it every 30 seconds`, `its key is the secret "COOKBOOK_KEY"`;
  a web server's whole answer:  `its rows are its? "results"`, `its next page is its? "next"` (epic `data` P18).
  - A field finds the server's spelling by its WORDS:  `its "hair color" is text` reads `hair_color`, `hairColor`, `Hair Color`
    (epic `data` P23).  Only a name that really differs says so, on the field's own line:  `its "title" is text, stored as "dish_name"`.
    The old line under the place, `a recipe's title is its? "dish_name"`, still reads;  `spell place ingest` writes the new one.
  - A number field reads its text, `"172"`, `"1,200"`, `"1,5"`;  the server's word for none is said on its line:
    `its "height" is a number or "unknown"`.  How a place writes, when its text can't say:  `it writes numbers like "1.200,5"`,
    `it writes names like "hair_color"`.
  - A server that searches:  `it searches names and titles with "search"` (epic `data` P26);  `every character where its name
    includes ...` then asks it, `?search=...`, and still checks what comes back.  `spell place ingest` finds it by trying one.
  - A field inside another is a thing of its own, read in words, NEVER a dot:
    `its "thumbnail" is a thumbnail`, `a "thumbnail" is a thing:`, `- its "source" is text`, then `the source of its thumbnail`.
    The compiler refuses a dot in a field's name, and `spell place ingest` never writes one.
    Where an answer keeps its rows or its next page further in, words too:  `its next page is the "next" of its "links"`.
  - A field holding another thing's address says what it links to:  `its "homeworld" is a planet`, `its "films" is a list of films`,
    and reading it follows the link.  The word's `link`, in code too:  `core.linked()`.
- **Not:**  `are at`, `is called`, `aka` / `from` / `read as` (for a field's name there), `versions are in`, `ids are in`, `is checked every`;  a comment saying a number is "written as text there";  a dotted field, `its "thumbnail.source"` (Owen, 2026-10-31, epic `data` Q21:  "a complete no-no -- if we have them, programmers and agents will reach for them").
- **Score:**  `\b(are at "|is called "|versions are in|ids are in|is checked every)` · in `parser/src/spell/rules/`
- **Decided:**  Owen, 2026-10-31, epic `data` P15;  `stored as`, numbers and names by their words, Owen, 2026-11-02, its P23.

### saved in, lives in

- **Say:**  `it (is saved|lives) in the family cookbook`.
  `family cookbook is saved in the cloud` is the same words' other job:  a new name on its left, and only `the cloud` on its right.
  - A type's own line, `- it is saved in the cloud`, is refused:  name the place first, then `- it lives in family cookbook`.
- **Decided:**  Owen, 2026-10-31, epic `data` P15.

### reading

- **Say:**  `every recipe`, `all recipes`, `recipes`;  `recipes where it is quick`;  `sorted by title`, `, sorted by its title`;
  `the (total|sum) of its prices`;  `(get|load|fetch) the recipes`;  `there are (no|less than 2|fewer than 2|more than 2|at least 2|at most 2|2) recipes`, `there is one recipe`.
  - One thing, by an id the program knows:  `the wiki page whose id is its name`.
- **Not:**  `if the number of (every recipe) is 0`, where the words above say it.
- What the program has by that name wins, each time:  its `recipes` property, variable or argument, its `to load the recipes` action.
- **Decided:**  Owen, 2026-10-31, epic `data` P15.

### showing and changing

- **Say:**  `while (waiting|loading):`, `in one go:`, `discard the draft`, `reload the recipes`, `(stop|cancel) the? search`.
- **Not:**  `all or nothing:`, `cancel the draft`, `refresh the recipes`.
  - "All or nothing" stays as plain words for what a place promises:  `PlaceCapabilities.atomic`'s docs.
- **Decided:**  Owen, 2026-10-31, epic `data` P15.

### for, a list of data

- **Say:**  `for films`, `for film in films`, `for stars from 1 to 240`;  in a drawing, `<for films ... />`, which also
  waits, says when it's empty or failed, and pages:  `title`, `as`, `loading`, `empty`, `hide-empty`, `failed`, `paging`.
  - Spanish:  `para películas`, `<para ...>`;  `para cada` where it reads better.
  - Its item is named for the list, made singular;  `it` too.
  - `hide-empty` on `<ui-section>` as well:  hidden while nothing's in it to see.
- **Not:**  `for each` in what we write (still read, as people will type it);  `<each>`, a widget of its own.
- **Decided:**  Owen, 2026-10-31, epic `data` P22:  "`<for film in films` should do all of the above", "maybe we don't
  need the `each` at all?", "`loading={no}` should turn off loading indicator".
- **Score:**  `^\s*<?for each\b` · in `app/spaces/@spell/examples`, `app/spaces/@spell/guides`, `app/spaces/@spell/notebooks`

### the person using the program

- **Say:**  `they`, `them`, `their name`, and `the person` when things are ambiguous:  the person using the program, who may not be whoever wrote it.
  - `(everyone|the people) here`, for all of them.
  - `recipes where they are the cook`, `where they aren't the cook`:  just what `where its cook is them` is;
    there, `the cook` is the recipe's own, whatever the program has by that name.  Spanish:  `recetas donde esa persona es el cocinero`.
  - In code:  `core.currentPerson()`, `core.isCurrentPerson()`.
  - Spanish:  `esa persona`, `la persona`, `el nombre de esa persona`:  no `su`, which already means its.
- **Not:**  me, my, the current person, the user.
- A program's own wins:  in `for person in everyone here`, `the person` is the loop's, and `them` still the one using it.
- **Decided:**  Owen, 2026-10-31, epic `data` P15:  "you are speaking about the person using the program, which may not be 'you'".
  `where they are the cook`:  Owen, 2026-10-31, epic `data` T66.

### waits

- **Say:**  waits, for what takes a while and whatever calls or reads it:  `waiting`, `waitingValues`, `waits` in a
  project's declarations, `core.waitedValue()`, `core.whileWaiting()`.
- **Not:**  slow as a name in code (`core.slowly()`), async, in anything a person reads;  `async` stays JavaScript's own word.
- **The opposite:**  `without waiting` and `meanwhile`;  and for a toast, the one slow thing nothing waits for, `and wait`.
- **Decided:**  epic `language` J5, and its P12, P14.


## Open

Words a sweep found more than one of, still to decide.

- **show / hide:**  with open / close for every fold and overlay, is anything left that shows and hides?
  The brand pages' `shows` / `shown` states, and Spell UI's `ui-show` / `ui-hide` today, would move.

## See also

- [catalog.md](catalog.md):  the mechanisms Spell already has
- [WWOD](../wwod/WWOD.md), §3 › "Naming"
