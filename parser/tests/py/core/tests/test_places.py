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
import subprocess
import sys
import threading
import time
from collections.abc import Iterator
from datetime import UTC, date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, ClassVar

import pytest

from spell_core import Core, Place, PlaceError, Thing, h, prop
from spell_core.calendar_settings import CalendarSettings
from spell_core.core import using_core
from spell_core.place_kinds import Change, DeviceFile, ServerPlace, device_file_for, place_behind
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
    assert program.draft_of(None) is None  # a view's `its draft`, before it has its thing
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
# ## Writes off the loop
################

# How long the slow place takes over each send, in seconds.
SLOW_SECONDS = 0.5


class SlowFile(DeviceFile):
    """A database on this device that's slow to take a save, as a far-off server is:  it lists what happened."""

    def __init__(self, file: Path, happened: list[str]) -> None:
        """The slow database kept in `file`, saying each save in `happened`."""
        super().__init__(file)
        self.happened = happened

    def apply(self, changes: list[Change]) -> None:
        """Take `changes`, `SLOW_SECONDS` later."""
        time.sleep(SLOW_SECONDS)
        super().apply(changes)
        self.happened.append("saved")


def test_one_coroutines_save_never_holds_up_another_on_the_loop(program: Core, tmp_path: Path) -> None:
    happened: list[str] = []
    program._places.behinds["this_device"] = SlowFile(tmp_path / "Notes.device.json", happened)

    async def saves() -> None:
        program.save_thing(DeviceNote(text="milk"))

    async def plays() -> None:
        happened.append("played")

    async def both() -> None:
        await asyncio.gather(saves(), plays())

    asyncio.run(both())
    assert happened == ["played", "saved"]


class WatchedFile(DeviceFile):
    """A database on this device that lists each send it took, and refuses any saving the text `no`."""

    def __init__(self, file: Path) -> None:
        """The database kept in `file`, sent nothing yet."""
        super().__init__(file)
        self.sends: list[list[Change]] = []

    def apply(self, changes: list[Change]) -> None:
        """Take `changes`, or refuse them all."""
        if any(change.get("fields", {}).get("text") == "no" for change in changes):
            raise PlaceError("that text isn't allowed", "refused")
        super().apply(changes)
        self.sends.append(changes)

    @property
    def texts_sent(self) -> list[list[str]]:
        """Each send's texts, in order."""
        return [[change["fields"]["text"] for change in send] for send in self.sends]


@pytest.fixture
def watched(program: Core, tmp_path: Path) -> WatchedFile:
    """The program's database on this device, listing what it's sent."""
    behind = WatchedFile(tmp_path / "Notes.device.json")
    program._places.behinds["this_device"] = behind
    return behind


def test_changes_to_one_place_arrive_in_order(program: Core, watched: WatchedFile) -> None:
    async def saves() -> None:
        note = DeviceNote(text="one")
        program.save_thing(note)
        note.text = "two"
        note.text = "three"

    asyncio.run(saves())
    assert [text for send in watched.texts_sent for text in send] == ["one", "two", "three"]


def test_changes_made_during_a_send_wait_for_it(program: Core, tmp_path: Path) -> None:
    happened: list[str] = []
    program._places.behinds["this_device"] = SlowFile(tmp_path / "Notes.device.json", happened)

    async def saves() -> list[str]:
        note = DeviceNote(text="one")
        program.save_thing(note)
        await asyncio.sleep(SLOW_SECONDS / 5)
        note.text = "two"
        program.reload_saved()
        return [it.text for it in await program.saved_things(DeviceNote)]

    assert asyncio.run(saves()) == ["two"]
    assert happened == ["saved", "saved"]


def test_in_one_go_arrives_as_one_send_among_the_others(program: Core, watched: WatchedFile) -> None:
    def two() -> None:
        program.save_thing(DeviceNote(text="b"))
        program.save_thing(DeviceNote(text="c"))

    async def saves() -> None:
        program.save_thing(DeviceNote(text="a"))
        await program.in_one_go(two)
        program.save_thing(DeviceNote(text="d"))

    asyncio.run(saves())
    assert watched.texts_sent == [["a"], ["b", "c"], ["d"]]


def test_a_refused_in_one_go_still_raises(program: Core, watched: WatchedFile) -> None:
    with pytest.raises(PlaceError, match="isn't allowed"):
        asyncio.run(program.in_one_go(lambda: program.save_thing(DeviceNote(text="no"))))
    assert watched.sends == []


def test_a_read_right_after_a_save_sees_it(program: Core, watched: WatchedFile) -> None:
    async def saves_and_reads() -> list[str]:
        program.save_thing(DeviceNote(text="milk"))
        program.reload_saved()
        return [it.text for it in await program.saved_things(DeviceNote)]

    assert asyncio.run(saves_and_reads()) == ["milk"]


def test_a_drawing_right_after_a_save_sees_it(program: Core, watched: WatchedFile) -> None:
    async def saves_and_draws() -> list[str]:
        program.save_thing(DeviceNote(text="milk"))
        program.reload_saved()
        return [it.text for it in program.run_at_once(program.saved_things(DeviceNote))]

    assert asyncio.run(saves_and_draws()) == ["milk"]


def test_a_refused_save_is_one_line_and_the_next_still_goes(
    program: Core, watched: WatchedFile, capsys: pytest.CaptureFixture[str]
) -> None:
    async def saves() -> None:
        for text in ("one", "no", "two"):
            program.save_thing(DeviceNote(text=text))

    asyncio.run(saves())
    assert watched.texts_sent == [["one"], ["two"]]
    assert capsys.readouterr().err.splitlines() == ["Couldn't keep the change to DeviceNote:  that text isn't allowed"]


def test_a_value_json_cant_hold_loses_only_its_own_save(
    program: Core, watched: WatchedFile, capsys: pytest.CaptureFixture[str]
) -> None:
    async def saves() -> None:
        program.save_thing(DeviceNote(text="one"))
        odd = DeviceNote(text="odd")
        odd._props["text"] = {1, 2}
        program.save_thing(odd)

    asyncio.run(saves())
    assert watched.texts_sent == [["one"]]
    assert "Couldn't keep the change to DeviceNote" in capsys.readouterr().err


def test_a_sign_in_that_ended_loses_only_the_save_that_found_it(program: Core, tmp_path: Path) -> None:
    class SignedOut(DeviceFile):
        """A place whose sign-in has ended, as an atmosphere account's says it:  the next send signs in again."""

        has_signed_in = False

        def apply(self, changes: list[Change]) -> None:
            """Refuse the first send, knowing none of it was kept."""
            if not self.has_signed_in:
                self.has_signed_in = True
                over = PlaceError("the sign-in has ended")
                over.has_kept_nothing = True
                raise over
            super().apply(changes)

    program._places.behinds["this_device"] = SignedOut(tmp_path / "Notes.device.json")

    async def saves() -> None:
        for text in ("one", "two", "three"):
            program.save_thing(DeviceNote(text=text))

    asyncio.run(saves())
    assert len(DeviceFile(tmp_path / "Notes.device.json").rows_now("device_notes")) == 3


def test_with_no_loop_a_refused_save_still_raises(program: Core, watched: WatchedFile) -> None:
    with pytest.raises(PlaceError, match="isn't allowed"):
        program.save_thing(DeviceNote(text="no"))


def test_the_loop_ending_waits_for_the_last_save(program: Core, tmp_path: Path) -> None:
    happened: list[str] = []
    program._places.behinds["this_device"] = SlowFile(tmp_path / "Notes.device.json", happened)

    async def saves_and_ends() -> None:
        note = DeviceNote(text="one")
        program.save_thing(note)
        await asyncio.sleep(SLOW_SECONDS / 5)
        # made while the first is still being sent
        note.text = "two"

    # `asyncio.run()` cancels what's running as it ends:  the saves still go
    asyncio.run(saves_and_ends())
    assert happened == ["saved", "saved"]
    assert DeviceFile(tmp_path / "Notes.device.json").rows_now("device_notes")[0]["text"] == "two"


def test_two_cores_saving_to_one_device_file_keep_both(tmp_path: Path) -> None:
    cores = [new_core(tmp_path) for _ in range(8)]

    async def all_save() -> None:
        for number, a_core in enumerate(cores):
            with using_core(a_core):
                a_core.save_thing(DeviceNote(text=f"note {number}"))
        await asyncio.gather(*(a_core.saves_sent() for a_core in cores))

    asyncio.run(all_save())
    assert len(DeviceFile(tmp_path / "Notes.device.json").rows_now("device_notes")) == 8


# A compiled program whose last step saves as it waits, its place slow:  it prints once it's sent.
ENDING_PROGRAM = """\
import asyncio
import time

from spell_core import Place, Thing, core, prop
from spell_core.place_kinds import DeviceFile


class Shelf(Place):
    pass


shelf = core.place(Shelf(), {"name": "shelf", "kind": "database on this device"})
apply = DeviceFile.apply


def slow_apply(self, changes):
    time.sleep(0.5)
    apply(self, changes)
    print("saved", flush=True)


DeviceFile.apply = slow_apply


class Note(Thing):
    saved_in = {"place": "shelf", "collection": "notes"}
    text = prop(type="text")


async def keep_a_note():
    core.save_thing(Note(text="milk"))


asyncio.run(keep_a_note())
"""


def test_a_program_ends_only_after_its_last_save(tmp_path: Path) -> None:
    file = tmp_path / "Ending.spell.py"
    file.write_text(ENDING_PROGRAM, encoding="utf-8")
    ran = subprocess.run(
        [sys.executable, "-m", "spell_core.run", str(file)], capture_output=True, text=True, timeout=30
    )
    assert (ran.returncode, ran.stdout) == (0, "saved\n")
    assert "milk" in (tmp_path / "Ending.device.json").read_text(encoding="utf-8")


class SlowOperation(DeviceFile):
    """A place whose named operation is slow."""

    def call(self, name: str, input: object) -> object:
        """Answer `name`, `SLOW_SECONDS` later."""
        time.sleep(SLOW_SECONDS)
        return name


def test_a_named_operation_never_holds_up_another_on_the_loop(program: Core, tmp_path: Path) -> None:
    program._places.behinds["this_device"] = SlowOperation(tmp_path / "Notes.device.json")
    happened: list[object] = []

    async def calls() -> None:
        happened.append(await program.call_place("this_device", "publish"))

    async def plays() -> None:
        happened.append("played")

    async def both() -> None:
        await asyncio.gather(calls(), plays())

    asyncio.run(both())
    assert happened == ["played", "publish"]


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


def test_a_sheet_sends_the_columns_its_lines_name_by_their_javascript_names() -> None:
    details = {
        "name": "s",
        "kind": "sheet",
        "at": "http://x.test/api/places/recipes",
        "collections": {"recipes": {"at": "Recipes", "fields": {"hair_color": "Hair Color"}}, "shelves": {"at": "Tab"}},
    }
    behind = place_behind(details, None)
    assert isinstance(behind, ServerPlace)
    assert behind.lines == {"collections": {"recipes": {"fields": {"hairColor": "Hair Color"}}}}


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


@pytest.mark.parametrize("kind", ["atmosphere space", "web server", "graphql server", "the cloud"])
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
    # a person in the US (else the environment's locale's region), and a year that isn't this one:  `11/7/25`
    CalendarSettings.use(region="US")
    assert program.date_shown(date(1977, 5, 25)) == "May 25, 1977"
    # HyperTalk's date words, the twins of string.ts's
    morning = datetime(2025, 11, 7, 9, 14, 42)
    assert program.short_date(morning) == "11/7/25"
    assert program.long_date(morning) == "Friday, November 7, 2025"
    assert program.abbreviated_date(morning) == "Fri, Nov 7, 2025"
    assert program.short_time(morning) == "9:14 AM"
    assert program.long_time(datetime(2026, 11, 7, 0, 5, 3)) == "12:05:03 AM"
    assert program.short_time(date(2026, 11, 7)) == "12:00 AM"
    assert program.short_date("x") == "x"
    assert program.joined("due", date(2026, 11, 7), " ") == "due November 7, 2026"
    assert program.joined(1, 2) == "12"
    assert program.joined("a", None, " ") == "a "
    assert isinstance(program.now(), datetime)
    assert program.date_as(datetime(2026, 11, 7, 17, 14, 42, tzinfo=UTC), "timestamp") == "2026-11-07T17:14:42.000Z"
    assert program.date_as(morning, "date and time") == "Nov 7, 2025, 9:14 AM"
    assert program.date_as(morning, "nonsense") == "November 7, 2025"
    program.show_dates_as("short")
    assert program.date_shown(morning) == "11/7/25"
    program.show_dates_as("plain")
    assert program.total_of([1, 2.5, "x", True]) == 3.5
    assert program.first_few([1, 2, 3], 2) == [1, 2]
    assert program.draw_each([1, 2], lambda item, position, items: item * 10) == [10, 20]


def test_field_names_as_javascript_writes_them() -> None:
    assert javascript_name("device_count") == "deviceCount"
    assert javascript_name("class_") == "class"
    assert python_name("deviceCount") == "device_count"


class TimedNote(Thing):
    """`a timed note is a thing` + `- it lives in this device`:  its two times, as the compiler gives them."""

    saved_in: ClassVar[dict[str, object]] = {
        "place": "this_device",
        "collection": "timed_notes",
        "times": ["created", "modified"],
    }
    title = prop(type="text")
    created = prop(type="date")
    modified = prop(type="date")


class TimelessNote(Thing):
    """`- it keeps no times`:  nothing in its `saved_in`."""

    saved_in: ClassVar[dict[str, str]] = {"place": "this_device", "collection": "timeless_notes"}
    title = prop(type="text")


# The rows both cores read:  the JavaScript core's test beside it.
SAVED_ROW_TIMES = Path(__file__).parents[3] / "core" / "savedRowTimes.expected.json5"


def test_a_new_thing_is_stamped_and_a_change_stamps_modified(tmp_path: Path) -> None:
    core = new_core(tmp_path)
    with using_core(core):
        note = TimedNote(title="Soup")
        core.save_thing(note)
        assert note.created
        created = note.created
        note.title = "Stew"
        kept = core._places.behind("this_device").rows_now("timed_notes")[0]
    assert kept["created"] == created
    assert kept["modified"]


def test_a_type_with_no_times_is_left_alone(tmp_path: Path) -> None:
    core = new_core(tmp_path)
    with using_core(core):
        core.save_thing(TimelessNote(title="Soup"))
        kept = core._places.behind("this_device").rows_now("timeless_notes")[0]
    assert "created" not in kept


def test_a_row_from_before_times_reads_with_nothing_made_up(tmp_path: Path) -> None:
    rows = _json5_rows()
    core = new_core(tmp_path)
    device = core._places.behind("this_device")
    device.apply([{"kind": "insert", "collection": "timed_notes", "id": "old", "fields": rows["old"]}])
    with using_core(core):
        notes = asyncio.run(core.saved_things(TimedNote))
        assert not notes[0].created
        notes[0].title = "Changed"
        kept = device.rows_now("timed_notes")[0]
    assert "created" not in kept
    assert kept["modified"]


def _json5_rows() -> dict[str, dict[str, object]]:
    """The fixture's rows:  JSON with one comment line."""
    lines = [line for line in SAVED_ROW_TIMES.read_text().splitlines() if not line.strip().startswith("//")]
    return json.loads("\n".join(lines))
