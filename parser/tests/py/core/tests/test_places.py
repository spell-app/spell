"""What's saved in a place (`places.py`, `place_kinds.py`, epic data P40):  each kind Python keeps things in.

- A database on this device:  a file beside the program, read again by a new core, as a restart would.
- A data folder and a sheet on the page server:  against a stand-in for its place routes (`FakePlaceServer`),
  real HTTP on this machine, answering as the page server's `PlaceServer` does, and checking its write token.
  The app folder's `pythonPlaces.test.ts` runs a compiled program against the real one.
- Any other kind:  refused, by name.
- The classes are what spell compiles from `a note is a thing`, `- it lives in this device` ...
"""

import asyncio
import json
import threading
from collections.abc import Iterator
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, ClassVar

import pytest

from spell_core import Core, Place, PlaceError, Thing, h, prop
from spell_core.core import using_core
from spell_core.place_kinds import device_file_for, place_behind
from spell_core.places import javascript_name, python_name

# The page server's write token, here.
TOKEN = "places-token"


class Shelf(Place):
    """`this device is a database on this device`, and the other places:  a place's own class."""


class DeviceNote(Thing):
    """`a device note is a thing` + `- it lives in this device`."""

    saved_in: ClassVar[dict[str, str]] = {"place": "this_device", "collection": "device_notes"}
    text = prop(type="text")
    stars = prop(type="number")
    is_done = prop(type="choice")


class FolderNote(Thing):
    """`a folder note is a thing` + `- it lives in note folder`."""

    saved_in: ClassVar[dict[str, str]] = {"place": "note_folder", "collection": "folder_notes"}
    text = prop(type="text")
    stars = prop(type="number")


class SheetNote(Thing):
    """`a sheet note is a thing` + `- it lives in note sheet`."""

    saved_in: ClassVar[dict[str, str]] = {"place": "note_sheet", "collection": "sheet_notes"}
    text = prop(type="text")
    stars = prop(type="number")


@pytest.fixture
def program(tmp_path: Path) -> Iterator[Core]:
    """A core running a program compiled to `tmp_path/Notes.spell.py`, its places named."""
    with using_core(new_core(tmp_path)) as a_core:
        yield a_core


def new_core(folder: Path) -> Core:
    """A core of the program in `folder`, as a run of it starts:  its places named, nothing read yet."""
    a_core = Core()
    a_core.program_file = folder / "Notes.spell.py"
    a_core.place(Shelf(), {"name": "this_device", "kind": "database on this device"})
    return a_core


################
# ## A database on this device
################


def test_a_device_note_is_kept_in_a_file_beside_the_program(program: Core, tmp_path: Path) -> None:
    note = DeviceNote(text="milk", stars=2)
    program.save_thing(note)
    kept = json.loads((tmp_path / "Notes.device.json").read_text(encoding="utf-8"))
    assert kept == {"device_notes": {note.id: {"id": note.id, "text": "milk", "stars": 2}}}


def test_a_restart_reads_it_back_as_it_was_left(tmp_path: Path) -> None:
    with using_core(new_core(tmp_path)) as first:
        note = DeviceNote(text="milk")
        first.save_thing(note)
        note.text = "oat milk"
        note.is_done = True
        the_id = note.id
    with using_core(new_core(tmp_path)) as second:
        notes = asyncio.run(second.saved_things(DeviceNote))
        assert [(it.id, it.text, it.is_done) for it in notes] == [(the_id, "oat milk", True)]


def test_one_thing_per_id_however_often_its_read(program: Core) -> None:
    program.save_thing(DeviceNote(text="milk"))
    program.reload_saved()
    first = asyncio.run(program.saved_things(DeviceNote))
    program.reload_saved(DeviceNote)
    again = asyncio.run(program.saved_things(DeviceNote))
    assert first is again
    assert first[0] is again[0]


def test_a_change_writes_only_its_fields(program: Core, tmp_path: Path) -> None:
    note = DeviceNote(text="milk", stars=1)
    program.save_thing(note)
    file = tmp_path / "Notes.device.json"
    note.stars = 3
    assert json.loads(file.read_text(encoding="utf-8"))["device_notes"][note.id]["stars"] == 3
    # the same value again is no change:  nothing to write
    stamp = file.stat().st_mtime_ns
    note.stars = 3
    assert file.stat().st_mtime_ns == stamp


def test_removing_one_takes_it_from_its_place_and_every_read(program: Core, tmp_path: Path) -> None:
    keep, gone = DeviceNote(text="keep"), DeviceNote(text="gone")
    program.save_thing(keep)
    program.save_thing(gone)
    notes = asyncio.run(program.saved_things(DeviceNote))
    program.remove_saved(gone)
    assert [it.text for it in notes] == ["keep"]
    kept = json.loads((tmp_path / "Notes.device.json").read_text(encoding="utf-8"))["device_notes"]
    assert list(kept) == [keep.id]
    # a thing kept nowhere:  nothing
    program.remove_saved(DeviceNote(text="never kept"))


def test_the_first_and_the_one_with_an_id(program: Core) -> None:
    first, last = DeviceNote(text="first"), DeviceNote(text="last")
    program.save_thing(first)
    program.save_thing(last)
    assert asyncio.run(program.saved_thing_at(DeviceNote, 1)) is first
    assert asyncio.run(program.saved_thing_at(DeviceNote, -1)) is last
    assert asyncio.run(program.saved_thing_with_id(DeviceNote, last.id)) is last
    assert asyncio.run(program.saved_thing_with_id(DeviceNote, "")) is None


def test_a_read_by_a_field(program: Core) -> None:
    program.save_thing(DeviceNote(text="a", stars=1))
    program.save_thing(DeviceNote(text="b", stars=2))
    starred = asyncio.run(program.saved_things(DeviceNote, {"filter": {"stars": 2}}))
    assert [it.text for it in starred] == ["b"]


def test_a_draft_sends_nothing_until_its_saved(program: Core, tmp_path: Path) -> None:
    note = DeviceNote(text="milk")
    program.save_thing(note)
    draft = program.draft_of(note)
    assert program.draft_of(note) is draft
    draft.text = "bread"
    assert note.text == "milk"
    program.save_draft(draft)
    assert note.text == "bread"
    assert "bread" in (tmp_path / "Notes.device.json").read_text(encoding="utf-8")
    other = program.draft_of(note)
    other.text = "jam"
    program.discard_draft(other)
    assert note.text == "bread"
    with pytest.raises(TypeError, match="isn't a draft"):
        program.save_draft(other)


def test_in_one_go_sends_together_or_not_at_all(program: Core, tmp_path: Path) -> None:
    def two() -> None:
        program.save_thing(DeviceNote(text="one"))
        program.save_thing(DeviceNote(text="two"))

    asyncio.run(program.in_one_go(two))
    assert len(json.loads((tmp_path / "Notes.device.json").read_text(encoding="utf-8"))["device_notes"]) == 2

    def fails() -> None:
        program.save_thing(DeviceNote(text="three"))
        raise ValueError("halfway")

    with pytest.raises(ValueError, match="halfway"):
        asyncio.run(program.in_one_go(fails))
    assert len(json.loads((tmp_path / "Notes.device.json").read_text(encoding="utf-8"))["device_notes"]) == 2


def test_a_type_kept_nowhere_says_so(program: Core) -> None:
    class Loose(Thing):
        text = prop(type="text")

    with pytest.raises(TypeError, match="isn't kept in a place"):
        program.save_thing(Loose(text="x"))


def test_the_device_file_is_named_for_the_program() -> None:
    assert device_file_for(Path("/x/TaskList.spell.py")) == Path("/x/TaskList.device.json")
    assert device_file_for(Path("/x/app.py")) == Path("/x/app.device.json")


################
# ## On the page server
################


class FakePlaceServer(BaseHTTPRequestHandler):
    """The page server's place routes, as its `PlaceServer` answers them:  `POST <address>/list`, `/apply`, `/call`.

    - Its rows in memory, by address and collection;  a CSV file's are text, as its file holds them.
    - Every request must carry the write token, as its guard asks:  else 403, `{"error": ...}`.
    """

    rows: ClassVar[dict[str, dict[str, dict[str, Any]]]] = {}
    asked: ClassVar[list[dict[str, Any]]] = []

    def do_POST(self) -> None:
        """Answer one request."""
        body = json.loads(self.rfile.read(int(self.headers["content-length"])))
        if self.headers.get("x-server-token") != TOKEN:
            return self.answer(403, {"error": "bad token:  reload the page"})
        address, what = self.path.rsplit("/", 1)
        self.asked.append({"address": address, "what": what, **body})
        place = self.rows.setdefault(address, {})
        if what == "list":
            return self.answer(200, {"rows": list(place.get(body["collection"], {}).values()), "handled": {}})
        if what == "apply":
            for change in body["changes"]:
                rows = place.setdefault(change["collection"], {})
                if change["kind"] == "delete":
                    rows.pop(change["id"], None)
                    continue
                fields = change.get("fields", {})
                if address.endswith(".csv"):
                    fields = {name: str(value) for name, value in fields.items()}
                rows[change["id"]] = {**rows.get(change["id"], {"id": change["id"]}), **fields}
            return self.answer(200, {"rows": []})
        return self.answer(200, {"result": {"called": body["name"], "with": body["input"]}})

    def answer(self, status: int, body: object) -> None:
        """Answer `body` as JSON, with `status`."""
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: object) -> None:
        """Quiet:  pytest shows what fails."""


@pytest.fixture
def page_server(monkeypatch: pytest.MonkeyPatch) -> Iterator[str]:
    """A stand-in page server's address, which the program is handed with its token, as `spell run --target py` does."""
    FakePlaceServer.rows = {}
    FakePlaceServer.asked = []
    server = ThreadingHTTPServer(("127.0.0.1", 0), FakePlaceServer)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    address = f"http://127.0.0.1:{server.server_address[1]}"
    monkeypatch.setenv("SPELL_SERVER_URL", address)
    monkeypatch.setenv("SPELL_SERVER_TOKEN", TOKEN)
    try:
        yield address
    finally:
        server.shutdown()


def name_server_places(a_core: Core) -> None:
    """SIDE EFFECT:  the program's data folder and CSV file, as the compiler addresses them."""
    a_core.place(Shelf(), {"name": "note_folder", "kind": "data folder", "at": "/api/places/spaces/@x/n/__data/notes"})
    a_core.place(
        Shelf(),
        {"name": "note_sheet", "kind": "sheet", "at": "/api/places/spaces/@x/n/__data/notes.csv", "id_column": "id"},
    )


def test_a_data_folder_is_read_and_written_through_the_page_server(page_server: str, tmp_path: Path) -> None:
    with using_core(new_core(tmp_path)) as first:
        name_server_places(first)
        note = FolderNote(text="milk", stars=2)
        first.save_thing(note)
        note.stars = 5
    insert, update = FakePlaceServer.asked
    assert insert["address"] == "/api/places/spaces/@x/n/__data/notes"
    assert insert["changes"] == [
        {"kind": "insert", "collection": "folder_notes", "id": note.id, "fields": {"text": "milk", "stars": 2}}
    ]
    assert update["changes"] == [
        {"kind": "update", "collection": "folder_notes", "id": note.id, "fields": {"stars": 5}}
    ]
    with using_core(new_core(tmp_path)) as second:
        name_server_places(second)
        notes = asyncio.run(second.saved_things(FolderNote))
        assert [(it.id, it.text, it.stars) for it in notes] == [(note.id, "milk", 5)]


def test_a_sheet_sends_its_id_column_and_reads_its_numbers_back(page_server: str, program: Core) -> None:
    name_server_places(program)
    program.save_thing(SheetNote(text="milk", stars=2))
    assert FakePlaceServer.asked[0]["lines"] == {"idColumn": "id"}
    program.reload_saved()
    notes = asyncio.run(program.saved_things(SheetNote))
    # the file holds text:  a number comes back a number, as the type declares it
    assert [(it.text, it.stars) for it in notes] == [("milk", 2)]


def test_a_named_operation(page_server: str, program: Core) -> None:
    name_server_places(program)
    note = FolderNote(text="milk")
    answer = asyncio.run(program.call_place("note_folder", "publish", note))
    assert answer == {"called": "publish", "with": {"id": note.id, "text": "milk"}}
    with pytest.raises(PlaceError, match="takes no named operations"):
        asyncio.run(program.call_place("this_device", "publish"))


def test_with_no_token_a_read_says_how_to_get_one(program: Core, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SPELL_SERVER_URL", "http://127.0.0.1:9")
    monkeypatch.delenv("SPELL_SERVER_TOKEN", raising=False)
    name_server_places(program)
    with pytest.raises(PlaceError, match="spell run --target py"):
        asyncio.run(program.saved_things(FolderNote))


def test_a_wrong_token_is_refused_saying_why(page_server: str, program: Core, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SPELL_SERVER_TOKEN", "stale")
    name_server_places(program)
    with pytest.raises(PlaceError, match="bad token") as refused:
        asyncio.run(program.saved_things(FolderNote))
    assert refused.value.kind == "refused"


################
# ## Kinds Python doesn't keep things in
################


@pytest.mark.parametrize("kind", ["personal atmosphere account", "web server", "graphql server", "the cloud"])
def test_any_other_kind_is_refused_by_name(kind: str) -> None:
    with pytest.raises(PlaceError, match=f"is a {kind}:  not in Python yet"):
        place_behind({"name": "sky", "kind": kind}, None)


def test_a_sheet_on_the_web_with_no_server_is_refused() -> None:
    with pytest.raises(PlaceError, match="only through a server"):
        place_behind({"name": "s", "kind": "sheet", "at": "notes.csv"}, None)


################
# ## Who's here, and drawing what's read
################


def test_who_is_here_is_this_machines_person(program: Core, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SPELL_PERSON", "owen")
    person = program.current_person()
    assert person.id == "owen"
    assert program.is_current_person("owen")
    assert program.is_current_person(person)
    assert list(program.people_here()) == [person]


def test_a_read_drawn_with_its_riders(program: Core) -> None:
    def none() -> Any:
        return h("ui-text", {}, "No notes yet")

    async def nothing() -> list[object]:
        return []

    assert str(program.draw_read(nothing, lambda note, position: note, {"none": none})) == str(none())
    program.save_thing(DeviceNote(text="milk"))
    drawn = program.draw_read(
        lambda: program.saved_things(DeviceNote), lambda note, position: f"{position}. {note.text}"
    )
    assert drawn == ["1. milk"]


def test_the_drawing_helpers(program: Core) -> None:
    assert program.with_commas(1234567) == "1,234,567"
    assert program.with_commas(1234.56789) == "1,234.568"
    assert program.with_commas("x") == "x"
    assert program.date_shown(date(1977, 5, 25)) == "May 25, 1977"
    # HyperTalk's date words, the twins of string.ts's
    morning = datetime(2026, 11, 7, 9, 14, 42)
    assert program.short_date(morning) == "11/7/26"
    assert program.long_date(morning) == "Saturday, November 7, 2026"
    assert program.abbreviated_date(morning) == "Sat, Nov 7, 2026"
    assert program.short_time(morning) == "9:14 AM"
    assert program.long_time(datetime(2026, 11, 7, 0, 5, 3)) == "12:05:03 AM"
    assert program.short_time(date(2026, 11, 7)) == "12:00 AM"
    assert program.short_date("x") == "x"
    assert program.joined("due", date(2026, 11, 7), " ") == "due November 7, 2026"
    assert program.joined(1, 2) == "12"
    assert program.joined("a", None, " ") == "a "
    assert isinstance(program.now(), datetime)
    assert program.total_of([1, 2.5, "x", True]) == 3.5
    assert program.first_few([1, 2, 3], 2) == [1, 2]
    assert program.draw_each([1, 2], lambda item, position, items: item * 10) == [10, 20]


def test_field_names_as_javascript_writes_them() -> None:
    assert javascript_name("device_count") == "deviceCount"
    assert javascript_name("class_") == "class"
    assert python_name("deviceCount") == "device_count"
