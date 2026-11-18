"""Timers (`timers.py`, epic `language` T159):  a thing's steps run every so often while its program runs.

- Written the way compiled spell writes `every second`:  a method, then `core.add_timer()` after the class.
- The JavaScript core's `timers.test.ts` checks the same.
"""

import asyncio
from collections.abc import Iterator
from datetime import datetime, timedelta

import pytest

from spell_core import App, Thing, core, prop
from spell_core.page import PageSession
from spell_core.things import without_create

# How long between runs here:  short, so the tests are quick
TICK = 0.01


@pytest.fixture(autouse=True)
def fresh_program() -> Iterator[None]:
    """Each test a program of its own:  its timers stop when it ends."""
    core.reset_runtime()
    yield
    core.reset_runtime()


class Clock(Thing):
    """`a clock is a thing`, its ticks counted;  `turn` an undoable action."""

    ticks = prop(type="number", default=0)
    end = prop(type="date")

    def every_tick(self) -> None:
        """`every 10 msec`:  one more tick."""
        self.ticks += 1

    def turn(self) -> None:
        """`to turn it`:  ten more."""
        self.ticks += 10

    @property
    def every_tick_until(self) -> object:
        """`until its end`."""
        return self.end


core.describe_action(Clock, "turn", {"undone_as": "Turn"})


def clock_class(**description: object) -> type[Clock]:
    """A clock running `every_tick`, as `description` says:  a new class each, so their timers don't mix."""

    class Timed(Clock):
        pass

    core.add_timer(Timed, "every_tick", {"seconds": TICK, **description})
    return Timed


async def runs_of(clock: Clock, wait: float) -> int:
    """`clock`'s ticks, after `wait` seconds."""
    await asyncio.sleep(wait)
    return clock.ticks


def test_a_thing_runs_its_timer_once_made() -> None:
    async def run() -> int:
        return await runs_of(clock_class()(), TICK * 5.5)

    assert 3 <= asyncio.run(run()) <= 5


def test_made_before_its_timer_is_described_it_runs_all_the_same() -> None:
    async def run() -> int:
        class Timed(Clock):
            pass

        clock = Timed()
        core.add_timer(Timed, "every_tick", {"seconds": TICK})
        return await runs_of(clock, TICK * 5.5)

    assert asyncio.run(run()) >= 3


def test_times_stops_it_after_that_many_runs() -> None:
    async def run() -> int:
        return await runs_of(clock_class(times=3)(), TICK * 10)

    assert asyncio.run(run()) == 3
    assert not core.RUNTIME.timers


def test_until_stops_it_once_its_moment_has_come() -> None:
    async def run() -> int:
        clock = clock_class(until="every_tick_until")()
        clock.end = datetime.now() + timedelta(seconds=TICK * 2.5)
        return await runs_of(clock, TICK * 10)

    assert 1 <= asyncio.run(run()) <= 2


def test_a_run_adds_no_undo_step_nor_does_an_action_it_calls() -> None:
    class Turning(Clock):
        def every_tick(self) -> None:
            self.turn()

    core.add_timer(Turning, "every_tick", {"seconds": TICK, "times": 2})

    async def run() -> int:
        return await runs_of(Turning(), TICK * 6)

    assert asyncio.run(run()) == 20
    assert not core.RUNTIME.history.steps


def test_the_program_starting_again_stops_it() -> None:
    async def run() -> tuple[int, int]:
        clock = clock_class()()
        await asyncio.sleep(TICK * 2.5)
        core.reset_runtime()
        await asyncio.sleep(0)
        stopped_at = clock.ticks
        return stopped_at, await runs_of(clock, TICK * 5)

    stopped_at, later = asyncio.run(run())
    assert stopped_at == later


def test_a_copy_starts_no_timer() -> None:
    async def run() -> int:
        with without_create():
            copy = clock_class()()
        await asyncio.sleep(TICK * 4.5)
        return copy.ticks

    assert asyncio.run(run()) == 0


def test_a_run_that_fails_is_said_and_the_next_runs(capsys: pytest.CaptureFixture[str]) -> None:
    class Broken(Clock):
        def every_tick(self) -> None:
            self.ticks += 1
            raise ValueError("broken")

    core.add_timer(Broken, "every_tick", {"seconds": TICK, "times": 2})

    async def run() -> int:
        return await runs_of(Broken(), TICK * 6)

    assert asyncio.run(run()) == 2
    assert capsys.readouterr().err.count("broken") == 2


def test_made_with_no_loop_it_waits_for_a_page() -> None:
    class Countdown(App):
        ticks = prop(type="number", default=0)

        def every_tick(self) -> None:
            self.ticks += 1

    countdown = Countdown()
    core.add_timer(Countdown, "every_tick", {"seconds": TICK})
    assert len(core.RUNTIME.timers_waiting) == 1

    async def run() -> int:
        PageSession({"countdown": countdown})
        return await runs_of(countdown, TICK * 4.5)

    assert asyncio.run(run()) >= 2
    assert not core.RUNTIME.timers_waiting
