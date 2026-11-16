"""`core`'s side of the running program:  its events, its processes, and pauses (epic python-target, P11).

- The twin of the JavaScript core's `runtime.ts` and `ui.ts`'s `pauseFor()`.
- A pause waits without stopping the program's other work:  `await core.pause_for(50, "msec")`.
  - It's asyncio's:  the one Python target, since P22.
  - `core.pauses = False` skips them, e.g. in a test run (`python -m spell_core.run --no-pauses`).
- Processes are names with a flag, "!" (running alone) or a count:  `start exclusive process deal the cards`.
- A thing's `create()` that waits runs at once, its pauses not waiting:  `run_at_once()`.
- What a person starts runs one at a time:  `core.RUNTIME.actions` (`action_queue.py`).
- What its undoable actions changed, to undo and redo:  `core.RUNTIME.history` (`undoing.py`).
"""

import asyncio
import inspect
from collections.abc import Awaitable, Callable, Coroutine
from typing import TYPE_CHECKING, Any, ClassVar

from spell_core.action_queue import ActionQueue
from spell_core.events import Eventful, Handler, SpellEvent, _call, all_ended, run_beside
from spell_core.undoing import UndoAction, UndoHistory

if TYPE_CHECKING:
    from spell_core.console import SpellConsole


class SpellRuntime(Eventful):
    """The running program:  its events (`core.on()`, `core.trigger()`) and its state, e.g. its processes."""

    def __init__(self, history: UndoHistory | None = None) -> None:
        """A program with no handlers yet, nothing in its state, and `history`, else a new one, empty."""
        self.state: dict[str, Any] = {}
        # what a person starts, one at a time
        self.actions = ActionQueue()
        # what its undoable actions changed, to undo and redo
        self.history = history or UndoHistory()
        # the program's first app:  the last stop up an event's chain, before its own listeners (`core.send()`)
        self.app: object | None = None
        # the program's pages, in the order they were made:  each hears what `core.trigger()` sends
        self.pages: list[object] = []
        # the property changes still to send -- see `core.note_property_change()`
        self.changes_waiting: list[Callable[[], object]] = []


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
        "minute": 60_000,
        "minutes": 60_000,
        "hour": 3_600_000,
        "hours": 3_600_000,
        "day": 86_400_000,
        "days": 86_400_000,
    }

    console: "SpellConsole"
    # The core's messages in the program's language:  `MessageMethods`'s
    message: Callable[..., str]
    # Sends what's changed:  `SendingMethods`'s
    send_waiting_changes: Callable[[], None]

    # Do pauses wait?  `False` in a test run, where only what's printed matters
    pauses: bool = True

    # How many `run_at_once()` are running now:  no pause waits while one is
    _running_at_once: int = 0

    # the running program:  `Core` makes one, `reset_runtime()` a new one
    RUNTIME: SpellRuntime

    def reset_runtime(self) -> None:
        """Start the program again:  no handlers, no processes, no one told of a pause, nothing to undo.

        - Its undo history titles its steps in the program's language (`message()`),
          and puts the app in the page's next patch as it changes (`history_changed()`).
        """
        self.RUNTIME = SpellRuntime(UndoHistory(title_for=self._undo_title, on_change=self._history_changed))
        self.before_pause: list[Callable[[], Awaitable[None] | None]] = []

    def run_opening[Result](self, open_program: Callable[[], Result]) -> Result:
        """Run `open_program`, the program's whole opening (its top level), as can't be undone:  what it returns.

        - So nothing it does as it starts is an undo step, and Undo isn't lit the moment it opens
          (epic `language` J180):  not an action it calls at its top level, nor one that action calls.
        - `run_program()` runs every program through it;  what a person does afterwards is a step as before.
        - The JavaScript core's `core.runOpening()`, around a runner's import of the program.
        """
        return self.RUNTIME.history.run_unrecorded(open_program)

    def _undo_title(self, action: UndoAction, step: str | None) -> str:
        """The Edit menu's title for undoing or redoing `step`, in the program's language:  `Undo Turn Card`."""
        return self.message(f"{action}-step", step=step) if step else self.message(action)

    def _history_changed(self) -> None:
        """SIDE EFFECT:  the running app is in the page's next patch:  what its Undo and Redo show changed."""
        from spell_core.things import SpellObject, note_change  # things sit above the runtime

        app = self.RUNTIME.app
        if isinstance(app, SpellObject):
            note_change(app)

    async def pause_for(self, number: float, units: str = "seconds") -> None:
        """Wait `number` `units` without stopping the program's other work:  `pause for 50 msec`.

        - Compiled, `await core.pause_for(50, "msec")`:  only a function that waits pauses, `async def`.
        - An unknown unit is seconds;  no wait at all when `pauses` is off, or inside `run_at_once()`.
        - Each of `before_pause` is called first, and awaited if it's a coroutine:
          a web page is sent what changed so far, so a game animates (epic python-target P20).
        """
        # what changed so far is heard now, as javascript's microtasks run at its first wait
        self.send_waiting_changes()
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
          e.g. a deck's `when creating a deck` turning each card face down, a pause each:
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

    async def answer_of(self, thing: object, name: str) -> Any:
        """The answer of `thing`'s member `name`:  what a function that waits writes for reading a value that waits.

        - By name, so it may be a plain value on this thing:  then that's the answer.
        """
        value = getattr(thing, name, None)
        return await value if inspect.isawaitable(value) else value

    def answer_now(self, thing: object, name: str) -> Any:
        """The answer of `thing`'s member `name`, where nothing can wait:  a drawing, a thing's `create()`.

        - As `run_at_once()`:  its pauses don't wait.  A page is sent with its values, so no "…" shows here.
        - throws `RuntimeError` if it waits for something other than a pause.
        """
        value = getattr(thing, name, None)
        return self.run_at_once(value) if inspect.iscoroutine(value) else value

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
        """Trigger `event` in the program, for everyone to hear:  `core.trigger("card-click", card=card)`.

        - Who hears it, in order:
          - the program's app and pages, each by its own handler, `<on fizz>` (`on_fizz()`;  epic `language` T78)
          - the program's own listeners, `core.on("fizz")`
        - Returns what each handler returned, in that order.
        - The twin of the JavaScript core's `trigger()`.
        """
        from spell_core.sending import handler_of  # sending sits above the runtime

        if isinstance(event, str):
            event = SpellEvent(event)
        event.__dict__.update(props)
        results: list[object] = []
        for thing in dict.fromkeys([self.RUNTIME.app, *self.RUNTIME.pages]):
            handler = handler_of(thing, event.type) if thing is not None else None
            if handler is None:
                continue
            try:
                results.append(_call(handler, (event,)))
            except Exception as error:  # one failing handler mustn't stop the others
                self.console.warn(f"trigger {event.type}:  {type(thing).__name__}'s handler failed", repr(error))
        return results + self.RUNTIME.trigger(event)

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
