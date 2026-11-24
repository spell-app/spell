"""A spell app on Quart:  its page, and its WebSocket, a game per visitor -- on Quart's own test client."""

import asyncio
import json
import time
from pathlib import Path

import pytest
from quart import Quart, make_response, request, websocket
from spell_core.place_kinds import DeviceFile

from spell_quart import SpellSessions, page_html, remember_visitor, visitor_of

PROGRAM = """\
from spell_core import List, Thing, core, prop


class Lamp(Thing):
    is_on = prop(type="choice", default=False)
    color = prop(type="text")


class Room(List):
    item_type = Lamp


room = Room([Lamp(), Lamp()])


async def ask_the_color():
    color = await core.prompt("Which color?", "blue")
    if color is not None:
        room.first_item.color = color


@core.on("lamp-click")
async def on_lamp_click(event):
    event.lamp.is_on = True
    await core.pause_for(1, "msec")
    event.lamp.color = "red"
"""


@pytest.fixture
def app(tmp_path: Path) -> Quart:
    """A Quart app serving the program above, as a compiled program's `.app.py` does."""
    program = tmp_path / "Room.spell.py"
    program.write_text(PROGRAM)
    app = Quart(__name__)
    sessions = SpellSessions(program, seed=1)

    @app.get("/")
    async def page():
        response = await make_response(page_html("Room", elements="/Room.elements.spell.js"))
        return remember_visitor(response, visitor_of(request))

    @app.websocket("/ws")
    async def ws():
        await sessions.serve(websocket, visitor_of(websocket))

    return app


async def test_the_page_loads_the_core_and_the_programs_drawing_half(app: Quart) -> None:
    response = await app.test_client().get("/")
    text = await response.get_data(as_text=True)
    assert '"@spell/core": "/spell/spell-page.js"' in text
    assert 'import * as program from "/Room.elements.spell.js"' in text
    assert "spell-visitor=" in response.headers["Set-Cookie"]


async def test_the_socket_sends_the_state_then_what_each_click_changed_pauses_and_all(app: Quart) -> None:
    async with app.test_client().websocket("/ws", headers={"Cookie": "spell-visitor=ann"}) as socket:
        state = json.loads(await socket.receive())
        assert state["room"]["$items"] == [{"$type": "Lamp", "$id": "2"}, {"$type": "Lamp", "$id": "3"}]
        await socket.send(json.dumps({"trigger": "lamp-click", "details": {"lamp": {"$id": "3"}}}))
        # before the pause, then after it
        assert json.loads(await socket.receive()) == [{"$type": "Lamp", "$id": "3", "is_on": True}]
        assert json.loads(await socket.receive()) == [{"$type": "Lamp", "$id": "3", "is_on": True, "color": "red"}]


async def test_each_visitor_plays_their_own_game(app: Quart) -> None:
    client = app.test_client()
    async with client.websocket("/ws", headers={"Cookie": "spell-visitor=ann"}) as ann:
        await ann.receive()
        await ann.send(json.dumps({"trigger": "lamp-click", "details": {"lamp": {"$id": "2"}}}))
        await ann.receive()
        await ann.receive()
    async with client.websocket("/ws", headers={"Cookie": "spell-visitor=bob"}) as bob:
        state = json.loads(await bob.receive())
        assert state["room"]["$items"][0] == {"$type": "Lamp", "$id": "2"}
    async with client.websocket("/ws", headers={"Cookie": "spell-visitor=ann"}) as again:
        state = json.loads(await again.receive())
        assert state["room"]["$items"][0] == {"$type": "Lamp", "$id": "2", "is_on": True, "color": "red"}


async def test_a_press_goes_through_the_queue_so_the_socket_keeps_reading(app: Quart) -> None:
    async with app.test_client().websocket("/ws") as socket:
        json.loads(await socket.receive())  # the state
        click = {"trigger": "lamp-click", "details": {"lamp": {"$id": "3"}}}
        await socket.send(json.dumps(click))
        await socket.send(json.dumps(click))
        # the second is ignored as a repeat:  one run, before its pause and after it
        assert json.loads(await socket.receive()) == [{"$type": "Lamp", "$id": "3", "is_on": True}]
        assert json.loads(await socket.receive()) == [{"$type": "Lamp", "$id": "3", "is_on": True, "color": "red"}]


async def test_a_press_that_fails_says_so_on_the_socket(app: Quart) -> None:
    async with app.test_client().websocket("/ws") as socket:
        await socket.receive()
        await socket.send(json.dumps({"call": "no_such_function"}))
        assert "error" in json.loads(await socket.receive())


async def test_a_dialog_is_asked_of_the_page_whose_answer_the_program_waits_for(app: Quart) -> None:
    async with app.test_client().websocket("/ws") as socket:
        json.loads(await socket.receive())  # the state
        await socket.send(json.dumps({"call": "ask_the_color", "args": []}))
        question = json.loads(await socket.receive())
        assert question == {"ui": "prompt", "args": ["Which color?", "blue"], "asks": 1}
        await socket.send(json.dumps({"answer": 1, "value": "green"}))
        assert json.loads(await socket.receive()) == [{"$type": "Lamp", "$id": "2", "color": "green"}]


SAVING_PROGRAM = """\
from spell_core import Place, Thing, core, prop


class Shelf(Place):
    pass


shelf = core.place(Shelf(), {"name": "shelf", "kind": "database on this device"})


class Note(Thing):
    saved_in = {"place": "shelf", "collection": "notes"}
    text = prop(type="text")


class Counter(Thing):
    count = prop(type="number", default=0)


counter = Counter()


@core.on("save")
def on_save(event):
    core.save_thing(Note(text="milk"))
    counter.count += 1


@core.on("play")
def on_play(event):
    counter.count += 1
"""


@pytest.fixture
def saving(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> tuple[Quart, SpellSessions, list[str]]:
    """An app that saves to a slow place, as it stops too, and what happened, in order."""
    happened: list[str] = []
    apply = DeviceFile.apply

    def slow_apply(self: DeviceFile, changes: list[dict[str, object]]) -> None:
        time.sleep(0.5)
        apply(self, changes)
        happened.append("saved")

    monkeypatch.setattr(DeviceFile, "apply", slow_apply)
    program = tmp_path / "Saving.spell.py"
    program.write_text(SAVING_PROGRAM)
    app = Quart(__name__)
    sessions = SpellSessions(program, seed=1)
    app.after_serving(sessions.saves_sent)

    @app.websocket("/ws")
    async def ws():
        await sessions.serve(websocket, visitor_of(websocket))

    return app, sessions, happened


async def test_one_visitors_save_never_stalls_anothers_game(saving: tuple[Quart, SpellSessions, list[str]]) -> None:
    app, sessions, happened = saving
    client = app.test_client()
    async with (
        client.websocket("/ws", headers={"Cookie": "spell-visitor=ann"}) as ann,
        client.websocket("/ws", headers={"Cookie": "spell-visitor=bob"}) as bob,
    ):
        await ann.receive()
        await bob.receive()
        await ann.send(json.dumps({"trigger": "save"}))
        await ann.receive()
        await bob.send(json.dumps({"trigger": "play"}))
        await bob.receive()
        happened.append("bob played")
        await sessions.saves_sent()
    assert happened == ["bob played", "saved"]


async def test_the_app_stopping_waits_for_the_last_save(saving: tuple[Quart, SpellSessions, list[str]]) -> None:
    app, _sessions, happened = saving
    await app.startup()
    async with app.test_client().websocket("/ws", headers={"Cookie": "spell-visitor=ann"}) as ann:
        await ann.receive()
        await ann.send(json.dumps({"trigger": "save"}))
        await ann.receive()
        assert happened == []
        await app.shutdown()
        assert happened == ["saved"]


class ClosingSocket:
    """A page that saves, hears the answer, and closes."""

    def __init__(self) -> None:
        """A page yet to say anything."""
        self.frames: asyncio.Queue[str] = asyncio.Queue()
        self.has_saved = False

    async def send(self, data: str) -> None:
        """The page's next frame."""
        await self.frames.put(data)

    async def receive(self) -> str:
        """The save, then, once it's answered, the page closing."""
        await self.frames.get()
        if self.has_saved:
            raise ConnectionError("the page closed")
        self.has_saved = True
        return json.dumps({"trigger": "save"})


async def test_a_visitors_game_ending_waits_for_their_last_save(
    saving: tuple[Quart, SpellSessions, list[str]],
) -> None:
    _app, sessions, happened = saving
    with pytest.raises(ConnectionError):
        await sessions.serve(ClosingSocket(), "ann")
    assert happened == ["saved"]
