# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in the kit's `src/places/` (`spell/places`).

**READ the kit's [AGENTS.md](../../AGENTS.md) and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
the kit's layout, and the house style every repo shares.
Only what's local is below;  a section named like a WWOD rule extends it.

## Where data lives

- A folder of the kit's own since epic `data` P39 (Q38), `src/util/places/` before:
  where data lives is a place a developer will want to dig into, more than a util.
- Below `spell/server` and the parser's core, above `spell/util`:
  - it uses util (`Loadable`, `LoadOnce`, `Api`, the reactive engine, `PrefStore` ...), by file
  - `spell/server/places` (the server half) and the parser's core use it
  - it NEVER imports `spell/server`:  it runs in a page
- Commands:  the kit's, at its root;  its tests alone:  `yarn vp test run --project places --project places:node`.

- `spell/places`:  a PLACE is Spell's word for a back-end, one small interface for all of them (epic `data`).
  - Its own folder, never part of the `spell/util` barrel:  no page pays for it until it uses it.
  - [places.types.ts](places.types.ts), the bottom of the folder:
    - `Place`:  say what you can do, list a collection;  the rest is optional
    - `PlaceCapabilities`, and `writeAnswerFor()`:  whether a write would be taken, per thing and per field
    - `PlaceError`:  a place THROWS when it fails, unlike preferences' `PrefPlace`
  - `PlaceCache`:  ONE row per type and id, its fields reactive.
  - `Places`:  places by name, swapping the one behind a name, and the one cache.
    - `originOf(thing, property)`:  where a value came from, for the editor's side bar (epic `data` P9):
      its place, its kind, its collection and id, whether it can be written and why not, whether it's a sample;
      a worked-out value says it's read only, and the places it read (`sourcesReadBy()`, the cells).
      `declaredAt` is the declaration's (`PropInfo.declaredAt`, or `Schema.located` for a worked-out value), which the compiler writes
      into each saved property's and each worked-out value's (epic `data` P12);  `readsFrom` joins the places the compiler found:
      a branch not taken, a list with nothing in it, a read through a memo.
    - `useInstead()` / `backToDeclared()`:  another place behind a name for now, whole:  its own rows and its own changes,
      with what's pending for the real one set aside (`PendingChanges.setAside()`), and every reader reading again.
      `swap()` only changes where the next read goes.
  - [SamplePlace](SamplePlace.ts):  editable records in place of a real place, while designing (epic `data` P9).
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
  - `PlaceBatch`:  lists asked in the same moment go in one request, for a place with `listMany()`:  `GraphPlace`'s aliases.
    A web server has one address per collection, so it can't:  its lists go one each, together.
  - `PlaceQuery`:  what the place didn't do is filtered, sorted, sliced or hidden here,
    up to a ceiling in rows and bytes, then a `PlaceError` naming the place.
    - A filter asking for `""` finds a row without that field too, as an unset text reads in Spell (epic `atmosphere` P37).
  - `MemoryPlace`:  the place the engine's tests run against, doing only what its capabilities say.
  - `DevicePlace`:  this device, an adapter over a `PrefPlace`.  Preferences' code knows nothing of it.
    - `wholeRows`:  each key's value is a whole row, as JSON, for things:  `family cookbook is this device`.
  - `RestPlace` and `GraphPlace`, on `WebPlace`:  a server, from a mapping of its paths and field names, on `Api`.
    - `WebPlace` turns an answer into what the engine needs:  not found, refused, or no answer (a 5xx, a 429:  it resends).
    - A key is named (`keyNamed`), never written:  there's no `headers` setting, and a place that needs one refuses,
      unless a server side hands it `keyFrom` (`PlaceKeys`, in `spell/server/places`).
      With `keyIfSet`, it goes without where nothing holds it (GitHub's 60 requests an hour;  epic `data` P28).
    - `RestPlace`:  named operations (`operations`, `call()`), each a `POST`;  versions, if the server has them (`If-Match`);  without, the last save wins the whole record.
    - `GraphPlace`:  a plain `POST`, selecting only what's asked;  mutations named in its mapping.
    - Their tests run in node, against [the recipe servers](../server/test/recipeServers.ts).
    - `keyFrom` can wait, for a key that's a token made from another (`GoogleToken`).
  - [DeviceCopy](DeviceCopy.ts):  a copy, in the browser's database, of every answer a web place gives,
    only for a place whose line says `- keep a copy on this device` (epic `data` P36).
    - Fresh until the place's next check:  `WebPlace` answers from it with no request;  stale, at once, reading the
      server behind it.  A server's longer `max-age` wins;  `no-store` keeps nothing.
    - 50 MB a place unless the line says (`DEVICE_COPY_MOST_BYTES`):  what was read least recently goes first.
    - Its own database, `spell-device-copies`, so clearing preferences leaves it;  a person's copies are forgotten
      when they sign out (`forgetPerson()`).
  - [AtProtoPlace](AtProtoPlace.ts):  an atmosphere account:  one person's records, or everyone's put together, with no referee (epic `data` P16).
    - One place across many hosts:  each account's document says which is its.  With no accounts named, whoever a relay says holds the collection,
      up to `MOST_ACCOUNTS`;  `- it includes the account "did:..."` names them.
    - A row is its record, `id` (its key, chosen by the browser), and `owner`, where it came from, which a record can't claim.
    - A read of many accounts takes a few of each one's newest (`FEW_EACH`), a dozen asked at once, so its first page holds
      the network's newest (epic `atmosphere` I7);  a relay names holders oldest first, so it reads the newest `MOST_ACCOUNTS`.
    - A record has no decimals (epic `atmosphere` P10):
      - a field the program declares a number is kept as text, `"12.50"`, and read back as one (`addDecimals()`)
      - any other decimal is refused
    - Only the owner writes (`whoWrites`).  One thing:  `putRecord` with `swapRecord`.  Several:  `applyWrites`, with each record checked first and `swapCommit`.
    - Live is Jetstream, reached from a browser.  `PlaceEvent.isMine` by its version;  a dropped socket picks up from its cursor.
    - `currentPerson()` is who's signed in;  `peopleHere()` is everyone with records here, NOT who's looking.
    - A page can point a program at another network, or sign-in:  `window.SPELL_ATMOSPHERE` (`AtProtoPageSettings`).
    - Its tests run against [FakeAtmosphere](../server/test/fakeAtmosphere.ts);  with `ATMOSPHERE_REAL=1`, the two that read the real network too.
  - [AtProtoSignIn](AtProtoSignIn.ts):  a person signing in from the browser, on the official library, `@atproto/oauth-client-browser`.
    - THE one place that imports it, by a dynamic `import()`, and only when someone signs in or comes back signed in:  a program that only reads never loads it.
    - `Place.signIn` (`PlaceSignIn`):  how a person signs in, for what shows:  core's `showSignIn()`.
    - A session is two weeks at most, a day on a local address:  it ends as `"ended"`, and what's pending stays.
    - `atProtoClientMetadata()`:  the file a program on a real address has to serve;  a local address needs none, and must be `127.0.0.1`.
  - [AtProtoPasswordSignIn](AtProtoPasswordSignIn.ts):  a PROGRAM signing in by itself,
    with an app password, no browser (epic `atmosphere` P9).
    - The handle becomes a DID, the DID's document names its host, and the host gives a session (`createSession`).
    - `epic pages publish` uses it.
  - [AtProtoSpace](AtProtoSpace.ts):  one AT Protocol Space, reached by one account signed in:  the Spaces trial's
    seam (epic `atmosphere` P11).  Taken by file, in no barrel:  a trial, kept out of the product (Q2).
    - Made by the org's account, its authority (Q10's test org);  a member list of read and write flags
      (`memberAccessFor()`);  the space's settings as its policy (`policyFor()`, P7 / Q13).
    - Each account writes only its own records;  reading anyone's takes a space credential, its requests signed and
      each record's MAC checked ([SpaceCredential](SpaceCredential.ts), the browser's own crypto).
    - A file is a blob and one record pointing to it (`writeFile()`, `file()`;  P12):  the blob goes up the account's
      usual way (`uploadBlob`), and is read through a space (`getBlob`) only while a record in that space points to it;
      so publishing is one more record pointing to the same blob.
    - [AtProtoSpacePlace](AtProtoSpacePlace.ts):  a space as a place, every writer's rows put together, writing
      only the signed-in account's.
    - [AtProtoSpaceFiles](AtProtoSpaceFiles.ts):  a space's files there, the same calls as Spell's own server's
      (`SpaceFiles`, epic `atmosphere` P15):  a file's record key is its name's (`fileKeyFor()`);  every blob up first,
      then the records one at a time, as the alpha has no batch in a space.
    - `through` (epic `atmosphere` P14):  its reads reach each host through another address, a pass-through that keeps
      nothing (the kit's `DirectReads`' read-through):  a page reads a host it can't ask itself, with its own credential.
    - Its tests run against `spell/server/test/fakeSpaces`, which is Spell's own Spaces host (`SpacesHost`, epic
      `atmosphere` P13);  the trial, `tests/server/spacesTrial.test.ts`, only with its accounts set:
      on Bluesky's alpha, or on our host (`spell space org host start` prints how).
  - [StandardSite](StandardSite.ts):  a web page published as a Standard.site document,
    through one account's `AtProtoPlace` (epic `atmosphere` P9).
    - Public, so no Spaces;  the record (`site.standard.document`) describes the page and links to it.
    - Its key is the caller's, the same each time (`keyFor()`, from the page's path):
      publishing again updates it, keeping `publishedAt`.
    - `linkTagFor()`:  the `<link rel="site.standard.document">` a page's head holds,
      so a reader can check the record is its own.
  - [LexiconSchemas](LexiconSchemas.ts):  Lexicons, AT Protocol's schema language, published as records
    in the ONE account that holds Spell's schemas (epic `atmosphere` P10).
    - Each a `com.atproto.lexicon.schema` record, keyed by its name.
    - `dnsRecordFor()`:  the DNS TXT record that points a name at that account (`_lexicon.<domain part>`, `did=...`).
      Whoever owns the domain makes it by hand.
    - `spell space lexicon publish` uses it.
      Each Lexicon is made from its type by the parser's core (`lexiconFor()`).
  - `ChunkedPlace`:  a list of summaries, and a body per thing fetched when it's read (epic `data` P5).
    - It holds no format:  what the chunks look like is a `ChunkFormat` handed in (`JsonChunks`:  a list file, one file per
      thing;  an epic page's is spell-epic's), where they are a `ChunkStore` (`WebChunks`:  static hosting, read only;
      `ChunkFiles`, in `spell/server/places`:  a folder).
    - A read names a field the summaries don't hold:  that's when bodies are read.  `bodyOf()`:  one body, no list.
    - Taken by file (`spell/places/ChunkedPlace`), it imports only `places.types`.
    - `WebChunks` reads past the browser's cache (`no-cache`):  what's there now.
    - `JsonChunks({ summaries: "every field" })`:  a list that holds each thing whole, so no read takes a body.
    - A subclass may make a thing's version from its content (`thingVersion()`):
      its file's own stamp then rides in the list, `stamps`.
    - Epic pages run on it every day (epic `data` P6, `EpicPageFormat`):  read only, whole-page writes staying the tool's.
  - [SpellSignIn](SpellSignIn.ts):  a person signing in to a Spell account by email, in a browser
    (epic `atmosphere` P3):  the page half of the server's `SignInCheck`.
    - A step of the one sign-in shape, with the code step's names:
      - `"waiting for a code"`, `enterCode()`
      - `account`:  `"Spell account"`, named apart from an atmosphere one on the bar
    - Or a password (epic `atmosphere` T64):  `signInWithPassword()`;  signed in, `setPassword()`, and what the bar needs to
      offer it (`hasPassword`, `currentPasswordNeeded`, `passwordProblem`, `passwordSaved`)
    - The page waits on its one-time request, asking after it every 2 seconds:
      the link confirmed on any device signs it in, or the code typed here.
    - ONE per server on a page (`SpellSignIn.for()`):  a project data folder's `RemotePlace` takes it as its `signIn`.
    - Signed in, it's who's at this page (`noteSignedIn()`, [people.ts](people.ts)).
    - The routes' shapes are here (`SIGN_IN_PREFIX`, `SignInWaitAnswer` ...):  the server reads them.
    - Its `abuseContact`, from `GET me` (epic `atmosphere` P6):
      where to report abuse, which the sign-in bar shows.
    - Or a linked Bluesky account, where the server offers it (`offersAtProto`, from `GET me`;  epic `atmosphere` P19):
      - `signInAtProto(who)`, `linkAtProto(who)`:  the page leaves for the account's host, and comes back
      - coming back, its address says how it went (`BACK_OUTCOME`):  read as the page opens, then taken out of it
        - a refusal is `refused` (`"not linked"`, `"taken down"`, `"linked elsewhere"`), which the bar says in the
          page's language;  a failure is `problem`
      - `linkedHandle`:  the Bluesky account linked to the one signed in
  - A project data folder (epic `atmosphere` P1):  a folder the page server serves under `SPACE_FOLDERS_PREFIX`.
    - Its capabilities, `spaceFolderCapabilities(address)`:
      - `checkedAtMostEvery`:  a server's least time between asks of what changed
      - `identifiesBy: "this machine"`:  whoever's here is this machine's person, until sign-in
      - who writes it, by its address (`whoWritesFolderAt()`, P4):
        a space's own folder `"its members"`, a program's own data `"only the owner"`
    - A space written by its members (P4, Q1, Q6):
      - every thing is the space's own (`owner` is `@family`), and who wrote it last is `by` (`BY_FIELD`)
      - a refusal for a role that can't write is `whyNot: "role"`, with the role it takes (`PlaceErrorCause.needs`,
        P23), which `PlaceServer` and `RemotePlace` pass on
      - what each thing is, for its write check:  `thingKindOf()` (`ThingKind`, `ThingChange`;  P23), a post, a row, a
        file, an app or a chat thread (`THREADS_COLLECTION`, P36);  and the setting `viewersPost`
      - its members are `SpaceMember`s, a read, a write and a manage flag each, in the shape of AT Protocol's lists (T6)
      - a SIGN-UP SHEET's rules (P27):  `SheetRules`, set through `SPACE_SHEET_OPERATIONS`;  its refusals `"full"` (the
        last place is taken) and `"not listed"` (its list doesn't name you)
      - joining and leaving:  `SPACE_MEMBER_OPERATIONS`
    - What Spell took down (P6) is refused `whyNot: "taken down"`:  neither read nor written, and the page says so.
    - Its FILES (P15):  `SpaceFiles`, ONE interface for Spell's own server (`FolderFiles`) and a real Space
      (`AtProtoSpaceFiles`), served at `SPACE_FILES_PREFIX`.
      - Each a name, a type and a size;  its bytes kept apart, never shown by their hash.
      - `fileKeyFor()`:  the ONE key a name is kept under, any name a record key AT Protocol takes (`~` and hex).
    - A space's own folder is READ DIRECT (P5, Q6 C), and only written through Spell's server:
      so reading works while it can't write.
      - Its read address:  `spaceReadAddressFor()`, under `SPACE_READS_PREFIX`.
      - A program's own data is read through the server;
        so are an org's roles and whoever's asking's inbox and feed, `@rs/__inbox` and `@rs/__feed`, whose one
        address is everyone's (`ORG_ROLES_ADDRESS`, its roles and events, `PERSON_INBOX_ADDRESS`,
        `PERSON_FEED_ADDRESS`;  epic `atmosphere` P25, P29, P32, P33).
  - `RemotePlace`:  in a browser, any place on a server side, speaking to `PlaceServer`.
    - NOT `ServerPlace`, in `persist/`, which never throws and holds only preferences.
    - A refusal says the server side's own words (`WebPlace.messageOf()`), scrubbed of keys.
    - A program's lines go with every request (`lines`, `PlaceLines`):  never a key, only its name.  A place that takes them follows them (`Place.withLines()`).
    - A field the place says takes no write (`ListAnswer.readOnlyFields`) reads as read only here (`canWrite()`).
    - `readsAt` (epic `atmosphere` P5):  its lists are read straight from the files, and written through the server side.
      - The reading is a `ChunkedPlace` on `WebChunks`.
      - Refused, it asks for a credential (`PLACE_CREDENTIAL`), a cookie, and reads again once.
    - `deviceCopy` (`- keep a copy on this device`, epic `atmosphere` T51):  each list it read whole is kept on this
      device with its version, and the next read (opening again, or a check) asks only what changed (`changesSince()`),
      put on the copy.
      - Only a list the place did nothing to (no filter, sort or page of its own);  one that can't say what changed is
        read whole.
      - Its own copy, by list:  its reads are POSTs, which `WebPlace`'s copy of GET answers never keeps.
    - `can.identifiesBy: "a sign-in"` (the cloud, epic `atmosphere` P8, `cloudCapabilities()`):
      - nobody signed in:  it asks nothing and reads no rows;
        a write fails as no answer would, so it stays pending in this browser
      - signed in:  the save queue's next try sends it
  - `SheetPlace`:  a CSV file at an address, read only, with no key and no server of ours (epic `data` P7).
    A program's `sheet` at a place server's address is a `RemotePlace` instead, which writes (`isPlaceServerAddress()`).
    - One file, one collection.  `parseCsv()` reads it;  [SheetTable](SheetTable.ts) makes its rows, shared with
      `GoogleSheetPlace`, in `spell/server/places`.
    - An author's `idColumn`, or rows share no identity.  A row with no id or a repeated one is left out, and said.
    - What a place wants known about an answer is `ListAnswer.notes`, shown by `PlaceResult.notes`;
      `PlaceQuery` adds the one for rows with no id, for every place.
    - Its ceiling holds while it reads:  the engine only counts rows it's handed.
    - Or an Excel workbook (epic `data` P38):  an address ending `.xlsx`, or `format: "excel"`
      (a program's `an excel file at`).  Each sheet a collection, by its tab;  one tab alone answers any name.
  - [Workbook](Workbook.ts):  an Excel workbook's bytes as rows, each sheet one collection (epic `data` P38).
    - Its rows are `SheetTable`'s, as a CSV file's:  the id column (every sheet's), rows with no id, the notes.
    - Numbers stay numbers;  a date reads as text with no time zone, `1977-05-25` or `1977-05-25T10:30`.
    - `saved()`:  the workbook with new rows in one sheet, keeping the other sheets, columns the program doesn't know,
      formulas and column widths;  a row that moves takes its formulas, their relative rows moved with it.
      NOT cell colours and fonts:  the free SheetJS drops styles on a save (`WORKBOOK_STYLES_NOTE`).
    - SheetJS (`xlsx`, from SheetJS's own site:  npm's copy is stuck at 0.18.5) loads by a dynamic `import()`,
      only when a workbook is first read (`Workbook.sheetJs()`):  no other page pays for it.
    - Bytes that aren't a zip file are refused, `SyntaxError`:  SheetJS would read them as text.
    - The place that writes one is `ExcelPlace`, in `spell/server/places`.
  - [CsvFile](CsvFile.ts):  a CSV file's text as rows, saved by comparing new rows with old, so only the lines that differ change (epic `data` P14).
    - By the id column, or with none by each row's whole text (`rowsInCommon()`, a longest common subsequence).
    - `csvLinesIn()` keeps what `parseCsv()` throws away:  each cell as written, each line end, the blank lines.
    - Plain text in and out;  the place that writes a file is `CsvPlace`, in `spell/server/places`.
  - `PendingChanges` (`Places.pendingFor()`, one per place name):  every change made and not yet confirmed.
    - One field of one thing, each with its own id, in the order made, shown at once, kept on this device.
    - No answer:  it resends with the same id.  The place says no:  dropped, put back, healed, one failure raised
      (`Places.onWriteFailed()`).
    - It sits on top of what's read (`replayOn()`), so you read your own writes.
    - A write back to what it `was`, not yet sent, drops the change:  that's undo before sending.
    - A group is an action's:  held until `end()`, never kept on the device, dropped by `cancel()`.
    - A change says the version it was made from (`Place.versionOf()`).  Refused as out of date:  a three-way merge per
      field, against its `was`, then sent again;  mine wins, and `Places.onConflict()` hears what was lost.
  - [SaveQueue](SaveQueue.ts):  saving in the background, in order, until it goes through;
    `PendingChanges` and spell-epic's `DraftSaver` are both on it.
    - Taken by file, `spell/places/SaveQueue`:  a page that only types pays for no place.
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
    - Who's here (epic `data` P13):  `currentPerson()`, `peopleHere()`, `onPeopleHere()`, optional on any `Place`:  one for each page.
      A guest, with no name from the server that served the page, is one per tab:  [people.ts](people.ts);
      a page signed in to a Spell account is that account.
    - Its run token goes as the socket's sub-protocol, never in its address (`ROOM_TOKEN_PROTOCOL`).
      A page signed in needs none, its cookie riding along (epic `atmosphere` P3).
    - A space's room on Spell's server takes the page's `SpellSignIn` as its `signIn` (epic `atmosphere` P36):  its bar
      shows, and the room opens again once someone signs in or out, so the new cookie rides on the new socket.
    - A room at `@rs/__thread` is the thread its PAGE picks (epic `atmosphere` P37):  `roomForPage()`, from the page's
      `?thread=` (and an ad-hoc thread's `&topic=`), else this browser's last in that org, else `@rs/messages`;
      `withPickedThread()` marks that one `current` in a person's thread list (`PERSON_THREADS_ADDRESS`).
    - A batch is answered once each of its changes is heard of, in however many steps:  a batch sent again can hold more than the one before.
  - `RoomCopy`:  a room's rows, and the ONE place a change is worked out, used by both sides;  what they say to each other (`RoomAsk`, `RoomAnswer`).
  - `PlaceCopy`:  every thing in one place's collection copied into another, whole, by its id (epic `atmosphere` P1).
    - E.g. the recipe box from a project data folder to an atmosphere account, and back.
    - Who owns each is for the place it goes into to say.
    - NOT `RoomCopy`, which holds one room's rows in memory.
    - With a `view` (a projection, epic `atmosphere` P17):  each thing written whole as the view shows it,
      and what the view leaves out removed there, so the copy IS the view.
      - The view of a `Projection` (`places.types`):  `projectedRow()`, its named fields of the things it keeps.
  - [positions.ts](positions.ts):  a place in a list as a fraction (`positionBetween()`), its parent and its fraction one field
    (`ListPosition`, `rowsInPlace()`);  and a list field's items, one at a time (`ListEdit`, `listEditsTo()`, `withListEdits()`).
  - [refs.ts](refs.ts):  the ONE way anything saved is named in text, `Recipe#r-12` (`parseRef()`, `refText()`).
    - Imports nothing:  spell's core takes it by file, `spell/places/refs`.
    - A program's mirrored state keeps its counted `"$id"`:  it's what the Python page speaks.
- Uses `Loadable` and `LoadOnce` by file (`spell/util/spell/Loadable`), the reactive engine and `PrefStore`.
  - Nothing about Things or Spell's words:  those are above util (rows into Things:  `spell/parser/core/places`).
  - Whatever needs a server goes in `spell/server/places`.
- Its files import each other as peers.
- Its tests run in a real browser (project `places`), since `DevicePlace` reads the browser's storage;
  but `RestPlace`, `GraphPlace` and `SheetPlace`'s, in node (`places:node`), since they need a real server;
  and `Workbook`'s, which build workbooks with SheetJS (`workbookBytes()`, beside them).
  - [fakePlaces.ts](../../tests/places/fakePlaces.ts):  fakes shaped like Airtable and AT Protocol,
    which keep the engine's own tests honest about those shapes (both are built now, and held to the same interface);
    and `TroubledPlace`, which fails, refuses and swallows answers when a test says so.

## Types / Exports

As WWOD §8.
The barrel has no self-namespace:  everything is imported by name, `import { Places } from "spell/places"`.

## Imports

As WWOD §4:  `spell/places`, or a file by its name (`spell/places/SamplePlace`);  same-folder peers `./Peer`.
