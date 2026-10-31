"""`core`'s side of the running program:  its events, its processes, and pauses (epic python-target, P11).

- The twin of the JavaScript core's `runtime.ts` and `ui.ts`'s `pauseFor()`.
- A pause waits without stopping the program's other work:  `await core.pause_for(50, "msec")`.
  - It's asyncio's:  the one Python target, since P22.
  - `core.pauses = False` skips them, e.g. in a test run (`python -m spell_core.run --no-pauses`).
- Processes are names with a flag, "!" (running alone) or a count:  `start exclusive process deal the cards`.
- A thing's `create()` that waits runs at once, its pauses not waiting:  `run_at_once()`.
- What a person starts runs one at a time:  `core.RUNTIME.actions` (`action_queue.py`).
"""

import asyncio
import inspect
from collections.abc import Awaitable, Callable, Coroutine
from typing import TYPE_CHECKING, Any, ClassVar

from spell_core.action_queue import ActionQueue
from spell_core.events import Eventful, Handler, SpellEvent, all_ended, run_beside

if TYPE_CHECKING:
    from spell_core.console import SpellConsole


class SpellRuntime(Eventful):
    """The running program:  its events (`core.on()`, `core.trigger()`) and its state, e.g. its processes."""

    def __init__(self) -> None:
        """A program with no handlers yet, and nothing in its state."""
        self.state: dict[str, Any] = {}
        # what a person starts, one at a time
        self.actions = ActionQueue()


class RuntimeMethods:
    """`core.on()`, `core.trigger()`, the processes and `core.pause_for()`."""

    # Milliseconds in each unit spell says:  `pause for 30 ticks` (a tick is 1/60 of a second, HyperCard's)
    TIME_UNITS_MAP: ClassVar[dict[str, float]] = {
        "second": 1000,
        "seconds": 1000,
        "sec": 1000,
        "millisecond": 1,
        "milliseconds": 1,
        "msec": 1,
        "tick": 1000 / 60,
        "ticks": 1000 / 60,
    }

    console: "SpellConsole"

    # Do pauses wait?  `False` in a test run, where only what's printed matters
    pauses: bool = True

    # How many `run_at_once()` are running now:  no pause waits while one is
    _running_at_once: int = 0

    # the running program:  `Core` makes one, `reset_runtime()` a new one
    RUNTIME: SpellRuntime

    def reset_runtime(self) -> None:
        """Start the program again:  no handlers, no processes, no one told of a pause."""
        self.RUNTIME = SpellRuntime()
        self.before_pause: list[Callable[[], Awaitable[None] | None]] = []

    async def pause_for(self, number: float, units: str = "seconds") -> None:
        """Wait `number` `units` without stopping the program's other work:  `pause for 50 msec`.

        - Compiled, `await core.pause_for(50, "msec")`:  only a function that waits pauses, `async def`.
        - An unknown unit is seconds;  no wait at all when `pauses` is off, or inside `run_at_once()`.
        - Each of `before_pause` is called first, and awaited if it's a coroutine:
          a web page is sent what changed so far, so a game animates (epic python-target P20).
        """
        if not self.pauses or self._running_at_once:
            return
        for listener in list(self.before_pause):
            result = listener()
            if inspect.isawaitable(result):
                await result
        await asyncio.sleep(self._milliseconds(number, units) / 1000)

    def together(self, *runs: Callable[[], Any]) -> Coroutine[Any, Any, None] | None:
        """Run each of `runs` at once:  `at the same time:`, each its line.

        - One that waits makes this something to wait for, which ends when they've all ended,
          then raises the first failure.  With none, it's `None`:  they've ended already.
        """
        return all_ended([run() for run in runs])

    def meanwhile(self, run: Callable[[], Any]) -> None:
        """Run `run` now, not holding the caller up:  `meanwhile deal the cards`.

        - It goes on beside whatever comes next, outside the queue:  people's actions don't wait for it.
        - A failure is said on the program's console, rather than vanishing.
        """

        async def reporting(coroutine: Coroutine[Any, Any, Any]) -> None:
            try:
                await coroutine
            except asyncio.CancelledError:
                raise
            except Exception as error:
                self.console.error(error)

        try:
            result = run()
        except Exception as error:
            self.console.error(error)
            return
        if inspect.iscoroutine(result):
            run_beside(reporting(result))

    def cancel_actions(self, thing: object = None, name: str | None = None) -> bool:
        """Cancel what a person started that's running or waiting;  with `thing`, or its `name` too, only theirs.

        - It stops at its next wait, silently.  What it wrote to properties stays.  True if anything was.
        """
        return self.RUNTIME.actions.cancel(thing, name)

    def run_at_once[Result](self, coroutine: Coroutine[Any, Any, Result]) -> Result:
        """Run `coroutine` to its end now, its pauses not waiting:  a thing's `create()` that waits.

        - As javascript's constructor runs `create()`:  at once, nothing waiting for the pauses in it.
          e.g. a deck's `to create it:` turning each card face down, a pause each:
          every card is face down as soon as the deck is made, as in javascript.
        - Python's `__init__()` can't wait, and a pause there would hold up making the thing:
          the deck's 52 turns, 50 msec each.
        - Why not a task that goes on beside the program, as an event's handler does (`events.run_beside()`):
          the thing would be made half set up, its cards still turning while the game deals them.
        - throws `RuntimeError` if it waits for something other than a pause, which only a running loop could give it
        """
        self._running_at_once += 1
        try:
            coroutine.send(None)
        except StopIteration as finished:
            return finished.value
        finally:
            self._running_at_once -= 1
        coroutine.close()
        raise RuntimeError(
            "core.run_at_once():  it waited for something other than a pause;  wait for that once the thing is made"
        )

    def _milliseconds(self, number: float, units: str) -> float:
        """`number` `units` in milliseconds, rounded;  0 for not a number, or less than 0."""
        return max(round(number * self.TIME_UNITS_MAP.get(units, 1000)), 0) if number == number else 0

    def on(self, event_type: str, handler: Handler | None = None) -> Any:
        """Call `handler` each time the program triggers `event_type`;  with no handler, a decorator:

        ```python
        @core.on("card-click")
        def on_card_click(event):
            event.card.play()
        ```
        """
        return self.RUNTIME.on(event_type, handler)

    def once(self, event_type: str, handler: Handler | None = None) -> Any:
        """Call `handler` the NEXT time the program triggers `event_type` -- see `on()`."""
        return self.RUNTIME.once(event_type, handler)

    def off(self, event_type: str, handler: Handler | None = None) -> None:
        """Stop calling `handler` for `event_type`."""
        self.RUNTIME.off(event_type, handler)

    def trigger(self, event: SpellEvent | str, **props: object) -> list[object]:
        """Trigger `event` in the program:  `core.trigger("card-click", card=card)`;  what each handler returned."""
        return self.RUNTIME.trigger(event, **props)

    def get_runtime_state(self, key: str, initializer: Any = None) -> Any:
        """The program's state under `key`, made by `initializer()` the first time."""
        state = self.RUNTIME.state
        if key not in state and initializer is not None:
            state[key] = initializer()
        return state.get(key)

    def clear_runtime_state(self) -> None:
        """Forget the program's state."""
        self.RUNTIME.state.clear()

    def get_process_flags(self) -> dict[str, object]:
        """Each process's flag, by name:  "!" running alone, or how many are running."""
        return self.get_runtime_state("process_flags", dict)

    def start_process(self, name: str, exclusively: str | None = None) -> None:
        """Start process `name`:  running alone when `exclusively` (`"EXCLUSIVE"`), else one more of it running."""
        flags = self.get_process_flags()
        if exclusively:
            flags[name] = "!"
        else:
            count = flags.get(name)
            flags[name] = (count if isinstance(count, int) else 0) or 1

    def process_is_running(self, name: str) -> bool:
        """Is process `name` running?  `if deal the cards is running`."""
        flag = self.get_process_flags().get(name)
        return flag == "!" or (isinstance(flag, int) and flag > 0)

    def stop_process(self, name: str) -> bool:
        """Stop process `name` (one of it, if counted):  is it still running?"""
        flags = self.get_process_flags()
        flag = flags.get(name)
        if flag == "!":
            del flags[name]
        elif isinstance(flag, int) and flag > 0:
            flags[name] = flag - 1
        return bool(flags.get(name))
