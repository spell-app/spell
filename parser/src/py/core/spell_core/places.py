"""What compiled Python calls for a type saved in a place (epic data P40):  the JavaScript core's `saved.ts`'s twin.

```python
class Note(Thing):
    saved_in = {"place": "this_device", "collection": "notes"}
    text = prop(type="text")

this_device = core.place(ThisDevice(), {"name": "this_device", "kind": "database on this device"})
core.save_thing(Note(text="milk"))         # add (a new note ...) to the notes
notes = await core.saved_things(Note)      # every note
notes[0].text = "oat milk"                 # written as it changes:  no save step
core.remove_saved(notes[0])                # remove it from the notes
```

- What's behind each place is `place_kinds.py`'s:  a file beside the program, or the page server's place routes.
  Nothing reaches a place until something's read or written.
- ONE thing per type and id, however often it's read:  a read again changes the same thing, quietly.
- A saved thing WRITES ITSELF as it changes (`note_change()`, the hook a page's patches hear):
  only the fields that changed, as a browser's pending change sends them.
- Each read of a type is kept, its list the same each time, and follows this program's own writes:
  `reload_saved()` asks the place again.  A place whose line says `- check it every 30 seconds` is asked again
  once it's been that long, as a page's poll would.
- Writes are sent as they're made, waiting for the place's answer;  reads wait off the event loop.
  - In a drawing, where nothing can wait (`core.answer_now()`), a read waits right there:
    a page is sent with its values.
- A row is plain JSON, by the JavaScript names of its fields (`deviceCount`):
  so a page and a Python program read and write the same rows.  Its id is the thing's `id`.
- Who's here:  this machine's person (`current_person()`), as the page server takes anyone with its token.
- Smaller than the JavaScript core's:  no undo of a write, no notices, no samples, no live rooms, no pages of a list.
- Imports `core` only inside functions:  `core.py` mixes `PlaceMethods` in.
"""

import inspect
import os
import re
import time
import weakref
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any

from spell_core.lists import List
from spell_core.place_kinds import ID_FIELD, Change, PlaceBehind, PlaceError, Row, place_behind
from spell_core.things import (
    CHANGE_WATCHERS,
    TYPE_KEY,
    Prop,
    SpellObject,
    Thing,
    to_json_value,
    without_create,
)

if TYPE_CHECKING:
    from spell_core.core import Core

# How a reference to a thing kept elsewhere is written in a row:  `{"$ref": "Planet#tatooine"}`.
REF_KEY = "$ref"
# Words of a Python name, as javascript joins them:  `device_count` is `deviceCount`.
SNAKE_WORD = re.compile(r"_([a-z0-9])")
# A javascript name's capitals, as Python splits them:  `deviceCount` is `device_count`.
CAMEL_CAPITAL = re.compile(r"(?<!^)(?=[A-Z])")
# The most digits after the point a number shown with commas keeps, as javascript's `toLocaleString()` does.
MOST_DECIMALS = 3


class Place(Thing):
    """Where a program's data lives, as a thing of the program:  `this device is a database on this device` makes one.

    - What a kind IS, for a library:  `a supabase project is a place` is a class on this one.
      Python keeps things only in the kinds `place_kinds.py` knows:  a library's own kind is refused.
    - Holds no data:  `core.place()` does the work.
    - The twin of the JavaScript core's `classes/Place.ts`.
    """

    def make_place(self, details: object, places: object) -> object:
        """What's behind it, for a kind a library adds.  - throws `TypeError`:  Python has none yet"""
        raise TypeError(f"{type(self).__name__}.make_place():  this kind of place isn't in Python yet")


@dataclass
class PersonHere:
    """One person, at one program:  `them`, and `everyone here`'s one item.  The JavaScript core's `PersonHere`."""

    # what tells them apart, across runs:  this machine's person, as the page server knows them
    id: str
    # what they're called
    name: str
    # which program run:  new with each
    page: str


@dataclass
class SavedRead:
    """One read of a type, kept:  its list, the same each time, and when the place was last asked."""

    # the type read
    cls: type
    # what it filters by, a field and the value it must be:  `{"owner": "owen"}`
    filter: dict[str, object]
    # its things, as the place last said, with this program's own writes since
    things: List
    # when it was last asked, by `time.monotonic()`
    asked_at: float = 0.0
    # is it to be asked again, before it's next read
    stale: bool = True


@dataclass
class Home:
    """Where a saved thing is kept:  its place, its collection, and its row as last written or read."""

    place_name: str
    collection: str
    row: Row = field(default_factory=dict)


class ProgramPlaces:
    """A program's places, and the things made from their rows:  one per core (`PlaceMethods._places`).

    - Each place made when it's first read or written (`behind()`).
    - Told of every change to a thing (`note_change()`):  a saved one writes itself.
    """

    def __init__(self, core: "Core") -> None:
        """The places of the program running on `core`:  none until `core.place()` names one."""
        self.core = core
        # each place's line, by its name:  `core.place()`'s details
        self.details: dict[str, Mapping[str, Any]] = {}
        # what's behind each place, made when first used
        self.behinds: dict[str, PlaceBehind] = {}
        # each thing made from a row, by its type's name and id:  one object each
        self.things: dict[tuple[str, str], SpellObject] = {}
        # where each saved thing is kept
        self.homes: weakref.WeakKeyDictionary[SpellObject, Home] = weakref.WeakKeyDictionary()
        # each read kept, by its type and filter
        self.reads: dict[tuple[type, str], SavedRead] = {}
        # while reading rows into things:  what changes then isn't a write
        self.reading = 0
        # an `in one go:` running:  its changes, held by place, to send together
        self.held: dict[str, list[Change]] | None = None
        # each draft, by its copy:  the thing it's a draft of
        self.drafts: weakref.WeakKeyDictionary[SpellObject, SpellObject] = weakref.WeakKeyDictionary()
        # who's here:  made when first asked
        self._person: PersonHere | None = None
        CHANGE_WATCHERS.add(self)

    ################
    # ## Places
    ################

    def declare(self, thing: SpellObject, details: Mapping[str, Any]) -> None:
        """SIDE EFFECT:  the place `thing` is, by its name, as `details` say:  made when first used."""
        self.details[str(details.get("name", ""))] = details

    def behind(self, place_name: str) -> PlaceBehind:
        """What's behind the place `place_name`, made the first time.

        - throws `PlaceError` for a kind Python can't keep things in
        """
        if place_name not in self.behinds:
            details = self.details.get(place_name)
            if details is None:
                raise TypeError(f'core.place():  the program names no place called "{place_name}"')
            self.behinds[place_name] = place_behind(details, self.core.program_file)
        return self.behinds[place_name]

    def home_of_class(self, cls: type) -> Home:
        """Where things of `cls` are kept, as its `saved_in` says.  - throws `TypeError` for a type kept nowhere"""
        saved_in = getattr(cls, "saved_in", None)
        if not isinstance(saved_in, Mapping):
            raise TypeError(f"{cls.__name__} isn't kept in a place:  say `- it lives in ...` under it")
        return Home(str(saved_in["place"]), str(saved_in["collection"]))

    ################
    # ## Reading
    ################

    async def read(self, cls: type, filter: Mapping[str, object] | None = None) -> List:
        """Every thing of `cls` its place keeps, as one kept list:  see the module's docs."""
        saved = self.read_of(cls, filter)
        if self.is_due(saved):
            behind = self.behind(self.home_of_class(cls).place_name)
            # where nothing can wait, a drawing:  read right here (`core.run_at_once()`)
            waits_here = getattr(self.core, "_running_at_once", 0)
            rows = behind.rows_now(self.home_of_class(cls).collection) if waits_here else await self.listed(behind, cls)
            self.take(saved, rows)
        return saved.things

    async def listed(self, behind: PlaceBehind, cls: type) -> list[Row]:
        """Every row of `cls`'s collection, waited for."""
        return await behind.rows(self.home_of_class(cls).collection)

    def read_of(self, cls: type, filter: Mapping[str, object] | None) -> SavedRead:
        """The kept read of `cls` by `filter`, made the first time."""
        wanted = dict(filter or {})
        key = (cls, repr(sorted(wanted.items(), key=lambda pair: pair[0])))
        if key not in self.reads:
            with self.core.quietly():
                things = List().as_scratch()
            self.reads[key] = SavedRead(cls, wanted, things)
        return self.reads[key]

    def is_due(self, saved: SavedRead) -> bool:
        """Is `saved` to be asked of its place now:  never asked, reloaded, or older than its `checked_every`."""
        if saved.stale:
            return True
        every = self.details.get(self.home_of_class(saved.cls).place_name, {}).get("checked_every")
        return isinstance(every, int | float) and time.monotonic() - saved.asked_at >= every

    def take(self, saved: SavedRead, rows: list[Row]) -> None:
        """SIDE EFFECT:  `saved`'s list is the things `rows` are, in order, each the same thing as before."""
        home = self.home_of_class(saved.cls)
        things = [self.thing_for_row(saved.cls, home, row) for row in rows]
        wanted = saved.filter.items()
        kept = [thing for thing in things if all(_same(getattr(thing, name), value) for name, value in wanted)]
        self.reading += 1
        try:
            saved.things.items = kept
        finally:
            self.reading -= 1
        saved.asked_at = time.monotonic()
        saved.stale = False

    def thing_for_row(self, cls: type, home: Home, row: Row) -> SpellObject:
        """The thing `row` is, of `cls`:  the one already made for its id, changed to match, else a new one."""
        the_id = str(row.get(ID_FIELD, ""))
        key = (cls.__name__, the_id)
        thing = self.things.get(key)
        self.reading += 1
        try:
            if thing is None:
                with without_create():
                    thing = cls()
                thing.id = the_id
                self.things[key] = thing
            for name, value in row.items():
                if name != ID_FIELD:
                    _set_field(thing, name, value, self.core)
        finally:
            self.reading -= 1
        self.homes[thing] = Home(home.place_name, home.collection, row_for(thing))
        return thing

    def reload(self, cls: type | None = None) -> None:
        """SIDE EFFECT:  every read of `cls`, or every read, is asked of its place again when it's next read."""
        for saved in self.reads.values():
            if cls is None or saved.cls is cls:
                saved.stale = True

    ################
    # ## Writing
    ################

    def add(self, thing: SpellObject) -> None:
        """SIDE EFFECT:  `thing`, made here, is kept where its class says, and in every read of its class."""
        home = self.home_of_class(type(thing))
        row = row_for(thing)
        self.send(home.place_name, {"kind": "insert", "collection": home.collection, "id": thing.id, "fields": row})
        self.homes[thing] = Home(home.place_name, home.collection, row)
        self.things[(type(thing).__name__, str(thing.id))] = thing
        for saved in self.reads.values():
            if saved.cls is type(thing) and thing not in saved.things:
                self.reading += 1
                try:
                    saved.things.append(thing)
                finally:
                    self.reading -= 1

    def remove(self, thing: SpellObject) -> None:
        """SIDE EFFECT:  `thing` is gone from its place, and from every read:  nothing, if it's kept in none."""
        home = self.homes.pop(thing, None)
        if home is None:
            return
        self.send(home.place_name, {"kind": "delete", "collection": home.collection, "id": str(thing.id)})
        self.things.pop((type(thing).__name__, str(thing.id)), None)
        for saved in self.reads.values():
            if thing in saved.things:
                self.reading += 1
                try:
                    saved.things.remove(thing)
                finally:
                    self.reading -= 1

    def note_change(self, changed: SpellObject) -> None:
        """A thing changed:  a saved one sends the fields that differ from its row, as an update.

        - Not while reading rows in, nor a thing kept nowhere.
        - NEVER throws:  a write a place refuses is said on the console, as a page's notice would.
        """
        home = self.homes.get(changed)
        if self.reading or home is None:
            return
        row = row_for(changed)
        fields = {name: value for name, value in row.items() if home.row.get(name, _MISSING) != value}
        if not fields:
            return
        home.row = row
        change = {"kind": "update", "collection": home.collection, "id": str(changed.id), "fields": fields}
        try:
            self.send(home.place_name, change)
        except PlaceError as error:
            self.core.console.error(f"Couldn't keep the change to {type(changed).__name__}:  {error}")

    def send(self, place_name: str, change: Change) -> None:
        """Send `change` to the place `place_name`:  held while an `in one go:` runs.  - throws `PlaceError`"""
        if self.held is not None:
            self.held.setdefault(place_name, []).append(change)
            return
        self.behind(place_name).apply([change])

    async def in_one_go(self, run: Callable[[], Any]) -> None:
        """Run `run`, every change it makes to each place sent together once it ends:  dropped if it throws."""
        if self.held is not None:
            result = run()
            if inspect.isawaitable(result):
                await result
            return
        self.held = {}
        try:
            result = run()
            if inspect.isawaitable(result):
                await result
            held = self.held
        finally:
            self.held = None
        for place_name, changes in held.items():
            self.behind(place_name).apply(changes)

    ################
    # ## Who's here
    ################

    @property
    def person(self) -> PersonHere:
        """This machine's person:  `SPELL_PERSON`, else who's signed in to it."""
        if self._person is None:
            who = os.environ.get("SPELL_PERSON") or _login()
            self._person = PersonHere(who, who, f"python-{os.getpid()}")
        return self._person


# A field a row doesn't have:  never equal to any value.
_MISSING = object()


def _login() -> str:
    """Who's signed in to this machine, by their login name:  `owen`."""
    try:
        return os.getlogin()
    except OSError:
        return os.environ.get("USER") or os.environ.get("USERNAME") or "guest"


def _same(value: object, wanted: object) -> bool:
    """Does `value` match a filter's `wanted`:  a thing by its id, anything else as it is."""
    if isinstance(value, SpellObject) and not isinstance(wanted, SpellObject):
        return value.id == wanted
    return value == wanted


################
# ## Rows
################


def row_for(thing: SpellObject) -> Row:
    """Every field `thing` declares and holds, but its id, as a row holds it:  by javascript's names.

    - A thing inside it:  whole, as its JSON;  one kept in a place of its own:  a reference, `{"$ref": "Planet#x"}`.
    - A date:  as text, `2026-11-07`.
    """
    row: Row = {}
    for name, value in thing._props.items():
        if name == ID_FIELD or not isinstance(getattr(type(thing), name, None), Prop):
            continue
        row[javascript_name(name)] = _row_value(value)
    return row


def _row_value(value: object) -> object:
    """`value` as a row holds it:  see `row_for()`."""
    if isinstance(value, SpellObject) and isinstance(getattr(type(value), "saved_in", None), Mapping):
        return {REF_KEY: f"{type(value).__name__}#{value.id}"}
    if isinstance(value, datetime | date):
        return value.isoformat()
    return to_json_value(value)


def _set_field(thing: SpellObject, field_name: str, value: object, core: "Core") -> None:
    """SIDE EFFECT:  `thing`'s field `field_name`, a javascript name, set from its row's `value`, as declared.

    - A number, a yes / no, as its `prop()` says, from a CSV file's text:  `"3"` is `3`, `"true"` is `True`.
    - A thing written whole:  made again (`core.from_json()`).
    - A field it doesn't declare:  a plain property, kept as it is.
    """
    name = python_name(field_name)
    declared = getattr(type(thing), name, None)
    kind = declared.type if isinstance(declared, Prop) else None
    if isinstance(value, dict | list) and _holds_types(value):
        value = core.from_json(value)
    elif kind == "number" and isinstance(value, str):
        value = _number_in(value)
    elif kind == "choice" and isinstance(value, str):
        value = value.strip().lower() in ("true", "yes", "1")
    if isinstance(declared, Prop):
        thing.set_prop(name, value)
    else:
        thing._props[name] = value


def _holds_types(value: object) -> bool:
    """Is `value` spell's JSON of a thing, or a list of them:  an `"$type"` in it?"""
    if isinstance(value, dict):
        return TYPE_KEY in value
    return isinstance(value, list) and any(_holds_types(item) for item in value)


def _number_in(text: str) -> float | int | str:
    """`text` as a number:  `"3"` is `3`, `"2.5"` is `2.5`;  text that isn't one stays as it is."""
    try:
        number = float(text)
    except ValueError:
        return text
    return int(number) if number.is_integer() else number


def javascript_name(name: str) -> str:
    """Python's `name` as javascript names it:  `device_count` is `deviceCount`, `class_` is `class`."""
    return SNAKE_WORD.sub(lambda match: match.group(1).upper(), name.rstrip("_"))


def python_name(name: str) -> str:
    """javascript's `name` as Python names it:  `deviceCount` is `device_count`."""
    return CAMEL_CAPITAL.sub("_", name).lower()


################
# ## core's methods
################


class PlaceMethods:
    """`core`'s methods for what's saved in a place:  see the module's docs."""

    # the compiled program's file, beside which a database on this device goes:  `run_program()` sets it
    program_file: Path | None = None
    _program_places: ProgramPlaces | None = None

    @property
    def _places(self) -> ProgramPlaces:
        """This core's places, made when first asked for."""
        if self._program_places is None:
            self._program_places = ProgramPlaces(self)  # type: ignore[arg-type]
        return self._program_places

    def place[T](self, thing: T, details: Mapping[str, Any]) -> T:
        """`thing` is a place of the running program, `details` what its lines say:  `this device is a ...`.

        - Nothing reaches the place until something's read or written.
        - Returns `thing`.
        """
        self._places.declare(thing, details)  # type: ignore[arg-type]
        return thing

    async def saved_things(self, cls: type, query: Mapping[str, Any] | None = None, how: str | None = None) -> List:
        """Every thing of `cls`, as a list, from the place it's saved in:  what `every note` compiles to.

        - The same list each time:  it follows this program's writes.
        - `query`:  its `filter` only, each field and the value it must be;  the rest, a page's paging, isn't Python's.
        - throws `PlaceError` for a place that refused, or didn't answer
        """
        return await self._places.read(cls, (query or {}).get("filter"))

    async def saved_thing_at(self, cls: type, place: int) -> Any:
        """The thing at `place` in `cls`'s place's order, from 1, `-1` the last:  `the first note`."""
        things = (await self.saved_things(cls)).items
        index = len(things) + place if place < 0 else place - 1
        return things[index] if 0 <= index < len(things) else None

    async def saved_thing_with_id(self, cls: type, the_id: object) -> Any:
        """The thing of `cls` with this id:  `None` if its place has none, or no id's given."""
        if the_id is None or the_id == "":
            return None
        return next((thing for thing in await self.saved_things(cls) if str(thing.id) == str(the_id)), None)

    def linked(self, thing: object, name: str, cls: type) -> Any:
        """`thing`'s field `name`, of a type saved in a place:  as it's held.

        - The JavaScript core follows a web server's addresses here;  Python's places hold things whole.
        """
        return thing._props.get(name) if isinstance(thing, SpellObject) else None

    def read_rider(self, kind: str, draw: Callable[[], Any]) -> None:
        """A rider with no read above it to go on:  nothing to do, and it says nothing."""

    def save_thing(self, thing: object) -> None:
        """`thing`, made here, is now kept where its class says:  `add (a new note ...) to the notes`.

        - Sent at once;  shown in every read of its class.
        - throws `PlaceError` for a place that refused it;  `TypeError` for a type kept nowhere
        """
        self._places.add(thing)  # type: ignore[arg-type]

    def remove_saved(self, thing: object) -> None:
        """`thing` is gone from its place:  `remove it from the notes`.  Not kept in a place:  nothing."""
        if isinstance(thing, SpellObject):
            self._places.remove(thing)

    def draft_of[T](self, thing: T) -> T:
        """A copy of `thing` to change, sending nothing until `save_draft()`:  `a draft of the note`.

        - Asked again before it's saved:  the same copy.
        - throws `TypeError` for a thing kept in no place
        """
        places = self._places
        if not isinstance(thing, SpellObject) or thing not in places.homes:
            raise TypeError("core.draft_of():  that isn't kept in a place, so it has no draft")
        for copy, original in places.drafts.items():
            if original is thing:
                return copy  # type: ignore[return-value]
        places.reading += 1
        try:
            with without_create(), self.quietly():  # type: ignore[attr-defined]
                copy = type(thing)()
            copy._props.update(thing._props)
        finally:
            places.reading -= 1
        places.drafts[copy] = thing
        return copy  # type: ignore[return-value]

    def save_draft(self, copy: object) -> None:
        """Send what's changed in `copy`, a draft, as one write:  `save the draft`.

        - throws `TypeError` for anything else
        """
        places = self._places
        original = places.drafts.pop(copy, None)  # type: ignore[call-overload]
        if original is None:
            raise TypeError("core.save_draft():  that isn't a draft;  make one with 'a draft of ...'")
        places.reading += 1
        try:
            for name, value in copy._props.items():  # type: ignore[attr-defined]
                if name != ID_FIELD:
                    original.set_prop(name, value)
        finally:
            places.reading -= 1
        places.note_change(original)

    def discard_draft(self, copy: object) -> None:
        """Forget what's changed in `copy`, a draft:  nothing had left.  - throws `TypeError` for anything else"""
        if self._places.drafts.pop(copy, None) is None:  # type: ignore[call-overload]
            raise TypeError("core.discard_draft():  that isn't a draft;  make one with 'a draft of ...'")

    async def in_one_go(self, run: Callable[[], Any]) -> None:
        """Run `run`, its changes to each place sent together when it ends:  `in one go:`.

        - It throws, and they're dropped:  nothing reaches the place.
        """
        await self._places.in_one_go(run)

    def current_person(self) -> PersonHere:
        """The person using the program:  `them`.

        - This machine's person, as the page server takes anyone with its token.
        """
        return self._places.person

    def is_current_person(self, value: object) -> bool:
        """Is `value` the person using the program:  them, or their name or id as text."""
        person = self._places.person
        if isinstance(value, str):
            return value in (person.name, person.id)
        return getattr(value, "id", None) == person.id

    def people_here(self) -> List:
        """Everyone here:  `everyone here`.  A Python program is one person's:  only you."""
        with self.quietly():  # type: ignore[attr-defined]
            here = List([self._places.person]).as_scratch()
        return here

    def reload_saved(self, cls: type | None = None) -> None:
        """Ask the place again, the next time `cls` is read, or anything is:  `reload the notes`, `try again`.

        - NEVER throws
        """
        self._places.reload(cls)

    def owner_of_saved(self, thing: object) -> Any:
        """Who holds `thing`, kept inside its owner's row:  `the recipe of an ingredient`.  `None` for none yet."""
        saved_with = getattr(type(thing), "saved_with", None)
        if not saved_with:
            return None
        owner_class, field_name = saved_with
        for owner in list(self._places.homes.keys()):
            if isinstance(owner, owner_class) and thing in (getattr(owner, field_name, None) or []):
                return owner
        return None

    def saved_with_owner(self, item: type, owner: type, field_name: str) -> None:
        """Things of `item` are kept inside `owner`'s row, in its list `field_name`.

        - What `an ingredient belongs to one recipe` compiles to, for a saved owner.
        """
        item.saved_with = (owner, field_name)  # type: ignore[attr-defined]

    async def call_place(self, place_name: str, name: str, input: object = None) -> object:
        """Run the operation `name` of the place `place_name`:  `to publish a note is at "..."`.

        - `input`:  a thing is sent as its whole row, with its id.
        - throws `PlaceError` if the place says no, or takes no named operations
        """
        sent = {ID_FIELD: input.id, **row_for(input)} if isinstance(input, SpellObject) else to_json_value(input)
        return self._places.behind(place_name).call(name, sent)

    ################
    # ## Drawing what's read
    ################

    def draw_read(
        self,
        read: Callable[[], Any],
        draw_each: Callable[[Any, int], Any] | None,
        riders: Mapping[str, Callable[[], Any]] | None = None,
    ) -> Any:
        """What a read of a list draws:  each item by `draw_each`, with what its riders say around it.

        - `read`:  the list;  read right here, as a page is sent with its values (`core.run_at_once()`).
        - Nothing in it:  the `none` rider's drawing, else nothing.
        - Failed:  the `failed` rider's drawing, else a message saying why.
        - `items` and `whole`:  the element each item, and all of it, goes inside.
        """
        from spell_core.collection_methods import _callback
        from spell_core.drawing import Element, h

        riders = riders or {}
        try:
            value = read()
            if inspect.iscoroutine(value):
                value = self.run_at_once(value)  # type: ignore[attr-defined]
        except PlaceError as error:
            failed = riders.get("failed")
            return failed() if failed else h("ui-message", {"color": "red"}, str(error))
        if draw_each is None:
            return value
        items = list(value or [])
        if not items:
            none = riders.get("none")
            return none() if none else None
        each = _callback(draw_each)
        drawn: Any = [each(item, position) for position, item in enumerate(items, start=1)]
        for rider in ("items", "whole"):
            around = riders[rider]() if rider in riders else None
            if isinstance(around, Element):
                around.children.extend(drawn)
                drawn = around
        return drawn

    def draw_each(self, collection: object, each: Callable[..., Any]) -> list[Any]:
        """A loop's drawing, one for each item of `collection`:  `for each ... draw` in a drawing."""
        return list(self.map(collection, each) or [])  # type: ignore[attr-defined]

    def first_few(self, collection: object, count: int) -> Any:
        """The first `count` items of `collection`, as a list that owns none of them:  `the first 20 notes`."""
        results = self.new_thing_like(collection) if collection is not None else []  # type: ignore[attr-defined]
        for taken, (value, _position, _list) in enumerate(self.get_iterator_for(collection)):  # type: ignore[attr-defined]
            if taken >= count:
                break
            self.append(results, value)  # type: ignore[attr-defined]
        return results

    def total_of(self, collection: object = None) -> float:
        """The sum of `collection`'s items:  `the total of its prices`.  What isn't a number counts as nothing."""
        return sum(
            value
            for value, _position, _list in self.get_iterator_for(collection)  # type: ignore[attr-defined]
            if isinstance(value, int | float) and not isinstance(value, bool)
        )

    def with_commas(self, number: object) -> object:
        """A number for people to read:  `1,000,000`, at most 3 digits after the point.  Anything else as it is."""
        if not isinstance(number, int | float) or isinstance(number, bool):
            return number
        if isinstance(number, float) and not number.is_integer():
            return f"{round(number, MOST_DECIMALS):,.{MOST_DECIMALS}f}".rstrip("0").rstrip(".")
        return f"{int(number):,}"

    def scroll_to_top(self) -> None:
        """Bring the top of the app back into view:  `scroll to the top`.

        - A page's to do:  Python's page scrolls itself as it draws, so here it does nothing.
        """


__all__ = ["PersonHere", "Place", "PlaceError", "PlaceMethods", "javascript_name", "python_name", "row_for"]
