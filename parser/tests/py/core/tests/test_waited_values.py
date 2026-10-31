"""A value that waits (epic `language` P12):  `core.answer_of()` where it can wait, `core.answer_now()` elsewhere."""

import asyncio

import pytest

from spell_core import Core


class Game:
    """A thing with a getter that waits, as Python's compiled, and a plain value."""

    moves = 3

    @property
    async def total(self) -> int:
        await core_for_tests.pause_for(1, "sec")
        return 11


core_for_tests: Core


@pytest.fixture(autouse=True)
def use_core(core: Core) -> None:
    """The getter's pauses are the test's core's."""
    global core_for_tests
    core_for_tests = core
    core.pauses = False


def test_answer_of_waits_for_a_value_that_waits(core: Core) -> None:
    assert asyncio.run(core.answer_of(Game(), "total")) == 11


def test_answer_of_takes_a_plain_value_as_it_is(core: Core) -> None:
    assert asyncio.run(core.answer_of(Game(), "moves")) == 3


def test_answer_now_has_it_at_once_for_a_drawing(core: Core) -> None:
    core.pauses = True
    assert core.answer_now(Game(), "total") == 11
    assert core.answer_now(Game(), "moves") == 3
