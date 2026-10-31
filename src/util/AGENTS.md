# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `src/util/` (`spell/util`).

**READ the kit's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every repo shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Overview

- `src/util/` (`spell/util`, from the kit and every other repo):
  the small GENERIC helpers more than one package uses.
  - `decorators.ts`:
    - `@proto`:  the standard-decorator for class defaults
    - `@protoMerged`:  for a settings object whose keys merge down the class chain
    - `@lazy`:  a getter made on first read, then kept
    - `@once`:  a method run once, its result kept (e.g. a loader's promise)
    - `forget(object, "name")`:  drops what either of those two kept, for a `reset()`
    - `@resets("name")`, on an accessor:  each write to it drops that kept value too
      - e.g. `@E.resets("load") static accessor url`
  - `class.ts` -- `hasOwnProp` ...
  - `string.ts` -- case conversion, `numberToWord`, `suggest`;
    and the small text helpers every repo wrote by hand (epic `coherence` I4):
    - `slug(text, { as, fallback })`:  an id's slug (accents and apostrophes dropped), or GitHub's heading anchor
      (`as: "github"`, accented letters kept)
    - `withoutAccents(text, { keep })`, `escapeRegExp()`, `escapeHTML()`, `dedent()`, `indented(text, indent)`
  - `number.ts` -- `clamp()`, and `kb()`:  a size in KB, of 1024 bytes
  - `LoadOnce.ts` -- a load per key, every caller the same promise, with a choice of what a failure does;
    `LoadOnce.abortable()` ends one caller's wait (Spell UI's and the places', moved down by epic `data`, J12)
  - `time.ts` -- LOCAL dates and times (epic `coherence` I5):  `localDate()`, `clockTime()`, `compactTime()`,
    `localTime()` / `localMinutes()` with the offset, `localMidnight()`
    - never `toISOString().slice(0, 10)` for a day:  that's the UTC date, tomorrow in California from 5pm
  - `color.ts` -- colour maths (epic `coherence` I13):  OKLCH <-> sRGB, fitting into sRGB (`clipped()`,
    `toGamut()`), luminance, contrast;  one shape each (`Rgb`, `Oklch`), hex in and out
  - `timing.ts` -- when to run something (epic `coherence` P19, from `spell/element`, which re-exports it):
    `afterSolidUpdate()`, `beforeNextPaint()`, `soon()`, `after()`, `every()`;  and waiting:  `waitUntil()`, `within()`
  - `polling.ts` -- `pollWhileVisible()`, on `every()`:  the ONE way to poll.  Taken by file, in no barrel
  - `ReconnectingSocket.ts` -- a websocket that comes back (epic `data` P8):  Spell UI's `ThemePreference` and `LiveRoomPlace` are on it.
    Taken by file, in no barrel.  NOT `spell/server`'s `liveClient`, sent to pages as one function's text, which can import nothing
  - `retrying.ts` -- `retryAfter()`, `backoffFor()`:  how long to wait before asking a server again.
    Taken by file, in no barrel
  - `Api.ts` -- requests with URL templates, combined abort signals, a newer one replacing an older (`UI.api`, and the
    places';  moved down from Spell UI by epic `data` P4);  on `fetching.ts`, `fetchOk()` and what `Api` throws.
    Taken by file, `spell/util/Api`, in no barrel
  - `string.ts`, `number.ts`, `time.ts`, `color.ts` and `timing.ts` import nothing, so plain `node` loads them too,
    with their extension (`spell/util/time.ts`)
  - `dom.ts` -- shadow-aware traversal, `NodeType`, `byDocumentOrder`, `isBrowser`, `nextFrame`,
    `copyText()` (the clipboard, with the fallback VS Code's side bar needs)
  - `util.types.ts` -- `Constructor`, `AbstractClass`, `Prettify`
- It sits UNDER every other package, and imports NONE of them.
  - `spell-ui` is published, and bundles what it imports from here (its `.d.ts` files inline it).
  - So nothing spell-specific may land here.
- What does NOT belong:
  - anything spell-specific
  - anything needing a dependency Spell UI doesn't already have (`pluralize`, CommonJS `lodash` ...):
    it goes in `spell/`, never beside the generic files
  - anything only ONE package uses:
    - Spell UI's `core.ts` re-exports its `spell/ui/util` wholesale, which imports every GENERIC file here
    - so each lands in Spell UI's `core` bundle (`yarn measure`), used or not
  - when in doubt, leave it in the package
- Commands:  the kit's, at its root (`yarn kit:review`, `kit:ts`, `kit:lint`, `kit:format`, `kit:test`).
  - Its tests alone:  `yarn vp test run --project util --project util:node`, at the kit's root.
  - The tests:  a real browser (chromium) for the generic files;  node for `spell/`, `reactive/` and `node/`.
- Barrel only, as WWOD §4 › "The barrel, from another sub-system" says, with ONE exception here:
  [ui's util barrel](../../ui/src/util/index.ts) imports the generic files one by one
  (`spell/util/class` ...).
  - Why:  so spell's utilities never reach `ui`'s bundles or published declarations.
  - Spell UI keeps its own util barrel (`spell/ui/util`) for package-specific helpers.

## Node-only helpers (`node/`)

- Generic helpers that need node:  imported by deep path, NEVER through a barrel, so no browser code pulls them in.
- [json5.ts](node/json5.ts):  JSON5 written with its comments kept, on json5-writer.
  - `json5Edited()`, `keepingComments()`, `readJSON5File()`
  - `spell/util/node/json5`.
  - The kit's node program checks it (`tsconfig.node.json`), not the browser-safe one.
  - Moved here from the assembler (epic `repo-split` P1):  util is the bottom of the stack,
    and ui's tools, app, brand, spaces, spell-epic and the server's `DataFile` use it.
  - Its tests run in node (the kit's `vitest.config.ts`, project `util:node`).

## Spell's utilities (`spell/`)

- Spell's own utilities, flattened into the `spell/util` barrel LAST:
  - lodash and string helpers
  - `Observable` / `Derivative` / `Loadable`, `Task` / `TaskList`
  - `$fetch`, `Logger`, `assert` / `die`
  - `safelyCall()` / `safelyCallAll()`, `makeErrorWrapper()`, `setDebugGlobal()` ([safely.ts](spell/safely.ts)):
    WWOD §5's and §19's helpers, written when coherence found WWOD naming them and no repo having them (its I2)
  - DOM helpers
- The bottom of the spell chain:  every spell-family package may import it, and it imports nothing above it.
  - Formerly the package `spell-util`.
  - A sub-folder, not loose files:
    - its `string.ts` and `DOM.ts` would clash with the generic ones a folder up (macOS is case-insensitive)
    - and nothing in `ui` may import it
  - Its dependencies (lodash, chalk, pluralize ...) are the kit's own, in its root `package.json`.
    - Spell UI bundles none of them:  `yarn measure` and `yarn smoke` (declarations) prove it.
- Files in `spell/` import the generic helpers by deep path (`spell/util/class`).
  - NEVER the `spell/util` barrel:  it re-exports this folder, so that's a cycle.
- NOTE: [ResponseErrors.ts](spell/ResponseErrors.ts) is deliberately NOT in [the folder's barrel](spell/index.ts):
  its header says why.
- Spell's layer of reactivity:  `Observable`, and [spellDecorators.ts](spell/spellDecorators.ts) (`@thing`).
  - The engine under it is `reactive/` (below).
- Tests:
  - they live in the kit's [tests/util/](../../tests/util/), at the same paths as the code (`tests/util/spell/...`)
  - the generic ones run in a real browser (project `util`)
  - `spell/**`, `reactive/**` and `node/**` run in node (project `util:node`)
  - the kit's `vitest.config.ts` makes those two projects

## The reactive engine (`reactive/`)

- `spell/util/reactive`:  the ONE reactive engine every reactive class shares (epic `output-targets` P10, Q20).
  - Flattened into the `spell/util` barrel too.
  - spell CELLS:  `cells.ts` (the page-wide context, tracking, `flushCells()`), `Cell`, `Derived`, `Reaction`
  - the records, [extend.ts](reactive/extend.ts):
    - `getProp` / `setProp`, `getState` / `setState`, `derive()`
    - `typedJSON()`:  an object's props, its class's name first, `"$type"` (what a spell object's JSON says)
  - `Schema`:  per-class prop types
  - the decorators, [decorators.ts](reactive/decorators.ts):  `@prop`, `@state`, `@derived`
    - `{ equals }` on the last two
    - the same names and options as Spell UI's `Reactive.ts`
  - `bridges.ts`:
    - `bridgeSolid()`:  every Solid computation reads cells
      - The host (the app, a runner, `<spell-viewer>`) calls it once with its Solid:  util never imports Solid.
    - `observe()`:  a plain function re-run as what it read changes
- GENERIC, like the files beside `index.ts`:  no lodash, no Solid, nothing spell-specific.
  - So Spell UI may import it file by file, once it moves onto spell cells
    (caveat C12 of `output-targets`;  epic `spell-element`, which that waited on, is in `main`).
- Its files import each other as peers.
  - Spell's utilities (`spell/`) import it as `spell/util/reactive`, never through the barrel.
- It's Solid work:  READ [the Solid 2 rules](../../spell.epics/guides/solid/solid-2.md) IN FULL first.

## Kept values (`persist/`)

- `spell/util/persist`:  what an app keeps for people (epic `prefs-and-undo`):
  preferences across visits, and the history they undo and redo.
  - Flattened into the `spell/util` barrel too.
  - [PrefStore](persist/PrefStore.ts):  one app's preferences.
    - every key `<store>:<key>`, e.g. `spell-site:scheme`
    - values as text people can read, e.g. `dark` ([values.ts](persist/values.ts))
  - `PrefPlace`:  where a store keeps them.
    - quick:  the browser's storage (`StoragePlace`), or memory (`MemoryStorage`)
    - waited on (`WaitedOnPlace`):
      - `DatabasePlace`:  the browser's IndexedDB, one database for the site, `spell-prefs`
      - `ServerPlace`:  the page server's `/api/prefs`, which spell-app's spaces answer, in the person's space
      - the protocol's types:  [persist.types.ts](persist/persist.types.ts)
  - [ColorScheme](persist/ColorScheme.ts):  the light / dark choice, on `PrefStore` (epic `coherence` P12, C16).
    - ONE key for every Spell site (`spell-site:scheme`), its old keys moved over once
    - shown as `ui-light` / `ui-dark` on `<html>` and inline `color-scheme`;  follows the OS and other tabs
    - ONE dark-mode query, `DARK_QUERY`, in [persist.types.ts](persist/persist.types.ts):
      the kit's site header, Spell UI's `ThemePreference` and runtime, and the editor's code colours read it
  - [UndoStack](persist/UndoStack.ts):  undo and redo, with transactions and folding.
    - a transaction:  one step for everything an action does, waits included
    - its records say how to undo themselves, so it knows nothing of what's kept
    - On the reactive engine (`spell/util/reactive`), for its live titles:  the folder's one import from outside it.
- GENERIC, like the files beside `index.ts`:  nothing spell-specific,
  except `ColorScheme`'s key and classes:  the one choice every Spell site shares, kept by both the kit and Spell UI.
  - The pref store imports nothing from outside the folder.
  - NOT in Spell UI's util barrel:  in its `core` bundle it cost every page 1.9 kB (`yarn measure`, 2026-10-24).
    Spell UI's files that keep preferences import `spell/util/persist/PrefStore` (or `ColorScheme`) by file.
- Its files import each other as peers.
- Its tests run in a real browser (project `util`):  they use the browser's own storage.
- Every key a plain script also reads (a page's inline `<head>` script, the live-reload client) is written
  byte for byte as before:  a store's name is the key's part before its first colon.

## Where data lives (`places/`)

- `spell/util/places`:  a PLACE is Spell's word for a back-end, one small interface for all of them (epic `data`).
  - NOT flattened into the `spell/util` barrel:  no page pays for it until it uses it.
  - [places.types.ts](places/places.types.ts), the bottom of the folder:
    - `Place`:  say what you can do, list a collection;  the rest is optional
    - `PlaceCapabilities`, and `writeAnswerFor()`:  whether a write would be taken, per thing and per field
    - `PlaceError`:  a place THROWS when it fails, unlike preferences' `PrefPlace`
  - `PlaceCache`:  ONE row per type and id, its fields reactive.
  - `Places`:  places by name, swapping the one behind a name, and the one cache.
    - `originOf(thing, property)`:  where a value came from, for the editor's side bar (epic `data` P9):
      its place, its kind, its collection and id, whether it can be written and why not, whether it's a sample;
      a worked-out value says it's read only, and the places it read (`sourcesReadBy()`, the cells).
      `declaredAt` is the declaration's (`PropInfo.declaredAt`), which nothing writes until Gathering Reads.
    - `useInstead()` / `backToDeclared()`:  another place behind a name for now, whole:  its own rows and its own changes,
      with what's pending for the real one set aside (`PendingChanges.setAside()`), and every reader reading again.
      `swap()` only changes where the next read goes.
  - [SamplePlace](places/SamplePlace.ts):  editable records in place of a real place, while designing (epic `data` P9).
    - `useSample(places, name)`, `useRealPlace(places, name)`.
    - Copied from the real place when it answers in time, else made from the type (`rowsMadeFrom()`, in
      `spell/parser/core/placeSamples`), and kept in this browser only:  nothing writes a file, so nothing reaches git (J2).
    - Taken by file, in NO barrel, and nothing a program loads imports it, so a built app leaves it out:
      `parser/tests/core/places.build.test.ts` builds one, and looks.
  - `PlaceResult`:  one reader's read of one place, on `Loadable`;  its `status` and `leave()` are new.
    - A failed refresh leaves its rows there, `"couldn't update"`.
  - `PlaceReads`:  readers of one collection and query share one request.
    - On `LoadOnce`.  The last reader leaving aborts the read, and about ten released ones are kept for a quick return.
    - `newestWins`:  a name for reads where a newer one aborts the older, e.g. a search as you type.
  - `PlaceQuery`:  what the place didn't do is filtered, sorted, sliced or hidden here,
    up to a ceiling in rows and bytes, then a `PlaceError` naming the place.
  - `MemoryPlace`:  the place the engine's tests run against, doing only what its capabilities say.
  - `DevicePlace`:  this device, an adapter over a `PrefPlace`.  Preferences' code knows nothing of it.
    - `wholeRows`:  each key's value is a whole row, as JSON, for things:  `family cookbook is this device`.
  - `RestPlace` and `GraphPlace`, on `WebPlace`:  a server, from a mapping of its paths and field names, on `Api`.
    - `WebPlace` turns an answer into what the engine needs:  not found, refused, or no answer (a 5xx, a 429:  it resends).
    - A key is named (`keyNamed`), never written:  there's no `headers` setting, and a place that needs one refuses,
      unless a server side hands it `keyFrom` (`PlaceKeys`, in `spell/server/places`).
    - `RestPlace`:  named operations (`operations`, `call()`), each a `POST`;  versions, if the server has them (`If-Match`);  without, the last save wins the whole record.
    - `GraphPlace`:  a plain `POST`, selecting only what's asked;  mutations named in its mapping.
    - Their tests run in node, against [the recipe servers](../server/test/recipeServers.ts).
    - `keyFrom` can wait, for a key that's a token made from another (`GoogleToken`).
  - `ChunkedPlace`:  a list of summaries, and a body per thing fetched when it's read (epic `data` P5).
    - It holds no format:  what the chunks look like is a `ChunkFormat` handed in (`JsonChunks`:  a list file, one file per
      thing;  an epic page's is spell-epic's), where they are a `ChunkStore` (`WebChunks`:  static hosting, read only;
      `ChunkFiles`, in `spell/server/places`:  a folder).
    - A read names a field the summaries don't hold:  that's when bodies are read.  `bodyOf()`:  one body, no list.
    - Taken by file (`spell/util/places/ChunkedPlace`), it imports only `places.types`.
    - `WebChunks` reads past the browser's cache (`no-cache`):  what's there now.
    - Epic pages run on it every day (epic `data` P6, `EpicPageFormat`):  read only, whole-page writes staying the tool's.
  - `RemotePlace`:  in a browser, any place on a server side, speaking to `PlaceServer`.
    - NOT `ServerPlace`, in `persist/`, which never throws and holds only preferences.
    - A refusal says the server side's own words (`WebPlace.messageOf()`), scrubbed of keys.
  - `SheetPlace`:  a CSV file at an address, read only, with no key and no server of ours (epic `data` P7).
    - One file, one collection.  `parseCsv()` reads it;  [SheetTable](places/SheetTable.ts) makes its rows, shared with
      `GoogleSheetPlace`, in `spell/server/places`.
    - An author's `idColumn`, or rows share no identity.  A row with no id or a repeated one is left out, and said.
    - What a place wants known about an answer is `ListAnswer.notes`, shown by `PlaceResult.notes`;
      `PlaceQuery` adds the one for rows with no id, for every place.
    - Its ceiling holds while it reads:  the engine only counts rows it's handed.
  - `PendingChanges` (`Places.pendingFor()`, one per place name):  every change made and not yet confirmed.
    - One field of one thing, each with its own id, in the order made, shown at once, kept on this device.
    - No answer:  it resends with the same id.  The place says no:  dropped, put back, healed, one failure raised
      (`Places.onWriteFailed()`).
    - It sits on top of what's read (`replayOn()`), so you read your own writes.
    - A write back to what it `was`, not yet sent, drops the change:  that's undo before sending.
    - A group is an action's:  held until `end()`, never kept on the device, dropped by `cancel()`.
    - A change says the version it was made from (`Place.versionOf()`).  Refused as out of date:  a three-way merge per
      field, against its `was`, then sent again;  mine wins, and `Places.onConflict()` hears what was lost.
  - [SaveQueue](places/SaveQueue.ts):  saving in the background, in order, until it goes through;
    `PendingChanges` and spell-epic's `DraftSaver` are both on it.
    - Taken by file, `spell/util/places/SaveQueue`:  a page that only types pays for no place.
    - `BrowserCopy` beside it:  one value kept in the browser, under one key.
  - `PlaceHeal` (`Places.heal`):  fetch the latest, replay what's pending;  on opening, on a refusal and on demand.
    What changed is told through `Places.onRows()`.
  - `LiveRoomPlace`:  a shared space, its referee (`Referee`, in `spell/server/places`) putting everyone's changes in one order (epic `data` P8).
    - The screen is the referee's copy, with my pending changes on top.  So a change of mine never flickers.
    - ONE heal routine:  ask what I missed, replay.  Opening, reconnecting, a gap in the numbers, a periodic checksum, a refusal.
    - Takes `edits`:  an addition goes as an addition (`PendingChanges.addToField()`), a list's change one item at a time
      (`changeList()`), so two at once both count.  A place with no `edits` is sent the whole value.
    - A change's `version` says what it had seen, so what it replaced is told:  long text of mine (`Places.onLost()`), newer work
      I replaced from offline (`onConflict()`), a delete of what I was changing (`onThingDeleted()`).
    - `PlaceHeal.follow()` is what turns all of it into rows on screen, for a page;  `PlaceThings` does it by itself.
    - A room trusts everyone in it:  no per-person rules yet.
  - `RoomCopy`:  a room's rows, and the ONE place a change is worked out, used by both sides;  what they say to each other (`RoomAsk`, `RoomAnswer`).
  - [positions.ts](places/positions.ts):  a place in a list as a fraction (`positionBetween()`), its parent and its fraction one field
    (`ListPosition`, `rowsInPlace()`);  and a list field's items, one at a time (`ListEdit`, `listEditsTo()`, `withListEdits()`).
  - [refs.ts](places/refs.ts):  the ONE way anything saved is named in text, `Recipe#r-12` (`parseRef()`, `refText()`).
    - Imports nothing:  spell's core takes it by file, `spell/util/places/refs`.
    - A program's mirrored state keeps its counted `"$id"`:  it's what the Python page speaks.
- Uses `Loadable` and `LoadOnce` by file (`spell/util/spell/Loadable`), the reactive engine and `PrefStore`.
  - Nothing about Things or Spell's words:  those are above util (rows into Things:  `spell/parser/core/places`).
  - Whatever needs a server goes in `spell/server/places`.
- Its files import each other as peers.
- Its tests run in a real browser (project `util`), since `DevicePlace` reads the browser's storage;
  but `RestPlace`, `GraphPlace` and `SheetPlace`'s, in node (`util:node`), since they need a real server.
  - [fakePlaces.ts](../../tests/util/places/fakePlaces.ts):  fakes shaped like Airtable and AT Protocol,
    which keep the interface honest until those two are built;
    and `TroubledPlace`, which fails, refuses and swallows answers when a test says so.

## Decorators

As WWOD §12, plus:

- The kit's Vitest config uses the `standardDecorators()` plugin, so `decorators.test.ts` runs lowered decorators.
- Every other package that compiles this source (`ui`'s build, its docs site, `spell`) already runs that plugin.

## Types / Exports

As WWOD §8.
The barrel has no self-namespace:  helpers are imported by name.

## Imports

As WWOD §4:  `spell/util/...`, this folder's files too;  same-folder peers `./peer`.
Files in THIS folder import each other as direct peers (`./class`).
