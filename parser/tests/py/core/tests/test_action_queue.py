"""What a person starts runs one at a time (`action_queue.py`, `PageSession.enter()`):  the JavaScript core's twin."""

import asyncio

from spell_core import List, Thing, core, prop
from spell_core.action_queue import ActionQueue
from spell_core.page import PageSession

STEP = 0.005


def recorder(steps, name):
    async def action():
        steps.append(f"{name} starts")
        await asyncio.sleep(STEP * 2)
        steps.append(f"{name} ends")

    return action


def test_a_repeat_is_ignored_and_another_keeps_the_latest():
    async def run():
        steps = []
        queue = ActionQueue()
        game = object()
        queue.enter(game, "deal", recorder(steps, "deal"))
        queue.enter(game, "deal", recorder(steps, "deal again"))
        queue.enter(game, "flip", recorder(steps, "flip"))
        queue.enter(game, "hint", recorder(steps, "hint"))
        await asyncio.sleep(STEP * 8)
        return steps

    assert asyncio.run(run()) == ["deal starts", "deal ends", "hint starts", "hint ends"]


def test_a_failure_is_told_and_the_next_one_runs():
    async def run():
        steps, heard = [], []

        async def fail():
            raise ValueError("failed on purpose")

        async def ended(error):
            heard.append(error)

        queue = ActionQueue()
        queue.enter(None, "fail", fail, ended=ended)
        queue.enter(None, "hint", recorder(steps, "hint"))
        await asyncio.sleep(STEP * 4)
        return steps, heard

    steps, heard = asyncio.run(run())
    assert steps == ["hint starts", "hint ends"]
    assert isinstance(heard[0], ValueError)


def test_canceling_stops_at_the_next_wait_and_the_newest_can_win():
    async def run():
        steps = []
        queue = ActionQueue()
        queue.enter(None, "search", recorder(steps, "a"))
        await asyncio.sleep(0)
        queue.enter(None, "search", recorder(steps, "ab"), replaces_last=True)
        await asyncio.sleep(STEP * 4)
        queue.enter(None, "deal", recorder(steps, "deal"))
        queue.enter(None, "hint", recorder(steps, "hint"))
        await asyncio.sleep(0)
        assert queue.cancel() is True
        await asyncio.sleep(STEP * 4)
        assert queue.cancel() is False
        return steps

    assert asyncio.run(run()) == ["a starts", "ab starts", "ab ends", "deal starts"]


PLAYED: list[str] = []


class Lamp(Thing):
    is_on = prop(type="choice", default=False)

    async def on_click(self, event=None):
        PLAYED.append("click starts")
        await core.pause_for(10, "msec")
        PLAYED.append("click ends")

    def start_while(self, name):
        PLAYED.append("while")


class Room(List):
    item_type = Lamp


def test_a_pages_presses_queue_and_its_moves_run_at_once():
    room = Room([Lamp()])

    async def run():
        core.reset_runtime()
        PLAYED.clear()
        page = PageSession({"room": room})
        page.state()
        lamp = {"$id": page.writer.state_of({"room": room}) and page.writer.id_of(room[0])}
        press = {"call": "on_click", "on": lamp, "args": []}
        move = {"call": "start_while", "on": lamp, "args": ["while_mouse_over"]}
        assert page.is_action(press)
        assert page.is_action({"trigger": "card-drop"})
        assert not page.is_action(move)
        page.enter(press)
        page.enter(press)
        await asyncio.sleep(0)
        await page.run_async(move)
        assert PLAYED == ["click starts", "while"]
        await asyncio.sleep(0.05)

    asyncio.run(run())
    assert PLAYED == ["click starts", "while", "click ends"]
