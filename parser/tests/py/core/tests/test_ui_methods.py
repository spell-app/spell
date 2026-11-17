"""Talking to the person running the program (`ui_methods.py`):  a toast or a dialog, on a page or printed."""

import asyncio
import io
from typing import Any

import pytest

from spell_core.console import SpellConsole
from spell_core.core import Core
from spell_core.ui_methods import PageAsks


def printing() -> tuple[Core, io.StringIO]:
    """A core with no page, and what it prints."""
    out = io.StringIO()
    return Core(SpellConsole(stdout=out, stderr=out)), out


def asking(answers: dict[str, Any]) -> tuple[Core, list[tuple[str, list[Any]]]]:
    """A core whose page answers each method by `answers`, and what it was asked."""
    a_core = Core()
    asked: list[tuple[str, list[Any]]] = []

    async def ask(method: str, args: list[Any]) -> Any:
        asked.append((method, args))
        return answers.get(method)

    a_core.ask_page = ask
    return a_core, asked


################
# ## No page:  printed, as the JavaScript core prints them with no Spell UI
################


def test_alert_prints_its_message() -> None:
    a_core, out = printing()
    assert asyncio.run(a_core.alert("You won!", "New game")) is None
    assert out.getvalue() == "You won!\n"


def test_warn_prints_its_message() -> None:
    a_core, out = printing()
    asyncio.run(a_core.warn("Careful!"))
    assert out.getvalue() == "Careful!\n"


def test_confirm_says_yes_and_prints_so() -> None:
    a_core, out = printing()
    assert asyncio.run(a_core.confirm("Deal again?")) is True
    assert out.getvalue() == "Deal again? (yes)\n"


def test_prompt_answers_its_starting_text() -> None:
    a_core, out = printing()
    assert asyncio.run(a_core.prompt("Your name?", "Ann")) == "Ann"
    assert asyncio.run(a_core.prompt("Your age?")) is None
    assert out.getvalue() == "Your name? (Ann)\nYour age? ()\n"


def test_notify_prints_and_is_gone_at_once() -> None:
    a_core, out = printing()
    shown = a_core.notify("Saved!", {"time": 5, "units": "seconds"})

    async def wait() -> None:
        await shown

    asyncio.run(wait())
    assert out.getvalue() == "Saved!\n"


def test_in_a_terminal_confirm_and_prompt_read_what_is_typed() -> None:
    a_core, out = printing()
    typed = iter(["n", "Bob", ""])
    a_core.answer_typed = lambda question: next(typed)
    assert asyncio.run(a_core.confirm("Deal again?")) is False
    assert asyncio.run(a_core.prompt("Your name?", "Ann")) == "Bob"
    assert asyncio.run(a_core.prompt("Your name?", "Ann")) == "Ann"
    assert out.getvalue() == ""


################
# ## A page:  it shows each, and answers
################


def test_a_page_is_asked_each_with_its_words_and_buttons() -> None:
    a_core, asked = asking({"confirm": False, "prompt": "Bob"})

    async def run() -> list[Any]:
        await a_core.alert("You won!", "New game")
        await a_core.warn("Careful!")
        return [await a_core.confirm("Deal again?", "Deal", "Not now"), await a_core.prompt("Your name?", "Ann")]

    assert asyncio.run(run()) == [False, "Bob"]
    assert asked == [
        ("alert", ["You won!", "New game"]),
        ("warn", ["Careful!"]),
        ("confirm", ["Deal again?", "Deal", "Not now"]),
        ("prompt", ["Your name?", "Ann"]),
    ]


def test_a_dialogs_title_and_size_go_to_the_page_as_options_by_javascripts_names() -> None:
    a_core, asked = asking({"confirm": True})

    async def run() -> bool:
        await a_core.alert("You won!", {"title": "Solitaire", "size": "big", "ok_text": "New game"})
        return await a_core.confirm("Deal again?", {"title": "Solitaire", "ok_text": "Deal", "cancel_text": "Not now"})

    assert asyncio.run(run()) is True
    assert asked == [
        ("alert", ["You won!", {"title": "Solitaire", "size": "big", "okText": "New game"}]),
        ("confirm", ["Deal again?", {"title": "Solitaire", "okText": "Deal", "cancelText": "Not now"}]),
    ]


def test_a_dialog_with_options_and_no_page_prints_its_message() -> None:
    a_core, out = printing()
    asyncio.run(a_core.alert("You won!", {"title": "Solitaire", "size": "big"}))
    assert out.getvalue() == "You won!\n"


def test_a_prompt_cancelled_on_the_page_answers_none() -> None:
    a_core, _ = asking({"prompt": None})
    assert asyncio.run(a_core.prompt("Your name?")) is None


def test_a_toast_on_the_page_goes_on_by_itself_and_and_wait_waits_for_it() -> None:
    a_core, asked = asking({})

    async def run() -> None:
        a_core.notify("Saved!")
        await a_core.notify("Done", {"class": "success", "time": 2})

    asyncio.run(run())
    assert asked == [("notify", ["Saved!"]), ("notify", ["Done", {"class": "success", "time": 2}])]


def test_a_toast_the_page_cant_show_is_said_on_the_console() -> None:
    a_core, out = printing()

    async def ask(method: str, args: list[Any]) -> Any:
        raise ConnectionError("gone")

    a_core.ask_page = ask

    async def run() -> None:
        await a_core.notify("Saved!")

    asyncio.run(run())
    assert "notify:  the page can't show it" in out.getvalue()


################
# ## The frames:  a question by number, the page's answer
################


def test_page_asks_sends_a_numbered_question_and_takes_its_answer() -> None:
    sent: list[dict[str, Any]] = []
    asks = PageAsks(lambda frame: _sent(sent, frame))

    async def run() -> Any:
        answer = asyncio.ensure_future(asks.ask("confirm", ["Deal again?"]))
        await asyncio.sleep(0)
        assert not asks.answered({"call": "deal"})
        assert asks.answered({"answer": sent[-1]["asks"], "value": True})
        return await answer

    assert asyncio.run(run()) is True
    assert sent == [{"ui": "confirm", "args": ["Deal again?"], "asks": 1}]


def test_page_asks_gives_up_as_a_cancel_when_its_page_closes() -> None:
    asks = PageAsks(lambda frame: _sent([], frame))

    async def run() -> Any:
        answer = asyncio.ensure_future(asks.ask("prompt", ["Your name?"]))
        await asyncio.sleep(0)
        asks.give_up()
        return await answer

    assert asyncio.run(run()) is None


async def _sent(sent: list[dict[str, Any]], frame: dict[str, Any]) -> None:
    """SIDE EFFECT:  `frame` kept in `sent`, as a page's socket would send it."""
    sent.append(frame)


@pytest.mark.parametrize("method", ["notify", "alert", "warn", "confirm", "prompt"])
def test_compiled_python_finds_each_on_core(method: str) -> None:
    from spell_core import core

    assert callable(getattr(core, method))
