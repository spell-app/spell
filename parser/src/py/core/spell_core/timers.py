"""`core`'s timers:  steps a thing runs again and again while its program runs, `every second` (epic `language` T159).

```python
class WeekendCountdown(App):
    def every_second(self) -> None:
        self.time = core.now()


weekend_countdown = WeekendCountdown()
core.add_timer(WeekendCountdown, "every_second", {"seconds": 1})
```

- The twin of the JavaScript core's `timers.ts`.
- `until`:  a getter giving the moment it stops, read again before each run;  `times`:  how many runs.
- Each thing of the class runs its own:  one made before its class's timers are described (a one of a kind) starts
  them as they're described;  one made after, as it's made (`Thing.__init__()`).  A copy runs none.
- Each run adds no undo step (`run_unrecorded()`), nor does an action it calls;  a failure is said on the console.
- A timer is an asyncio task:  with no loop running (`spell run`, the program loading), it waits for one,
  in `RUNTIME.timers_waiting`, until `start_waiting_timers()`:  a page starts them (`PageSession`).
  - So `spell run` ends when its program does, as javascript's timers never keep node running.
- They stop when the program starts again:  `reset_runtime()` cancels the last run's.
"""

import asyncio
import inspect
from collections.abc import Callable
from datetime import date, datetime
from typing import TYPE_CHECKING, Any
from weakref import WeakKeyDictionary

if TYPE_CHECKING:
    from spell_core.console import SpellConsole
    from spell_core.runtime_methods import SpellRuntime
    from spell_core.things import SpellObject

# Each class's own timers, by the method each runs:  `add_timer()`
_TIMERS: "WeakKeyDictionary[type, dict[str, dict[str, Any]]]" = WeakKeyDictionary()


class TimerMethods:
    """`core.add_timer()` and `core.every()`:  see the module's docs."""

    RUNTIME: "SpellRuntime"
    console: "SpellConsole"
    things_made: Callable[[], "list[SpellObject]"]

    def add_timer(self, cls: type, name: str, description: dict[str, Any]) -> None:
        """Each thing of `cls` runs its method `name` every `description["seconds"]` while the program runs.

        - What `every second` in a type's outline compiles to, after its class:
          `core.add_timer(Clock, "every_second", {"seconds": 1, "until": "every_second_until", "times": 10})`.
        - A sub-class's things run it too.
        - The things of `cls` already made start it now:  the one of a kind made just above.
        """
        _TIMERS.setdefault(cls, {})[name] = description
        for thing in self.things_made():
            if isinstance(thing, cls):
                self._start_timer(thing, name, description)

    def start_timers_of(self, thing: object) -> None:
        """SIDE EFFECT:  `thing`, just made, starts each timer its class has:  `Thing.__init__()` calls it."""
        for cls in type(thing).__mro__:
            for name, description in dict(_TIMERS.get(cls, {})).items():
                self._start_timer(thing, name, description)

    def every(
        self, seconds: float, run: Callable[[], Any], until: Callable[[], Any] | None = None, times: int | None = None
    ) -> Callable[[], None]:
        """Run `run` every `seconds` while the program runs:  a thing's timer, `every second`.  What stops it.

        - The first run is `seconds` from now.
        - Stops once `until()` gives a moment that's come (read before each run), after `times` runs,
          or when the program starts again (`reset_runtime()`).
        - Each run adds no undo step, and is waited for before the next:  a slow one skips a beat.
        - No loop running:  it waits for one -- see `start_waiting_timers()`.
        """
        runtime = self.RUNTIME
        task: asyncio.Task[None] | None = None

        async def ticking() -> None:
            runs = 0
            while times is None or runs < times:
                await asyncio.sleep(seconds)
                if self.RUNTIME is not runtime or _has_come(until() if until else None):
                    return
                runs += 1
                try:
                    result = runtime.history.run_unrecorded(run)
                    if inspect.isawaitable(result):
                        await result
                except asyncio.CancelledError:
                    raise
                except Exception as error:
                    self.console.error(error)

        def start() -> None:
            nonlocal task
            task = asyncio.get_running_loop().create_task(ticking())
            runtime.timers.add(task)
            task.add_done_callback(runtime.timers.discard)

        def stop() -> None:
            if task is not None:
                task.cancel()
            elif start in runtime.timers_waiting:
                runtime.timers_waiting.remove(start)

        if _loop_running():
            start()
        else:
            runtime.timers_waiting.append(start)
        return stop

    def start_waiting_timers(self) -> None:
        """SIDE EFFECT:  each timer made while no loop ran starts now, on the loop running:  a page calls it.

        - No loop running:  they go on waiting.
        """
        if not _loop_running():
            return
        waiting = self.RUNTIME.timers_waiting
        self.RUNTIME.timers_waiting = []
        for start in waiting:
            start()

    def _start_timer(self, thing: object, name: str, description: dict[str, Any]) -> None:
        """SIDE EFFECT:  `thing` runs its method `name` as `description` says -- see `add_timer()`."""
        until_name = description.get("until")
        self.every(
            description["seconds"],
            getattr(thing, name),
            until=(lambda: getattr(thing, until_name)) if until_name else None,
            times=description.get("times"),
        )


def _loop_running() -> bool:
    """Is an asyncio loop running here?"""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return False
    return True


def _has_come(moment: object) -> bool:
    """Has `moment`, a date or a time in msec, come?  Nothing is never."""
    if isinstance(moment, datetime):
        return datetime.now(moment.tzinfo) >= moment
    if isinstance(moment, date):
        return date.today() >= moment
    if isinstance(moment, int | float) and not isinstance(moment, bool):
        return datetime.now().timestamp() * 1000 >= moment
    return False
