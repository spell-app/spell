"""Sending events to things:  `send flipped with side = its direction` in Python (epic `rust`, I1).

```python
class Card(Thing):
    def on_flipped(self, event):
        print(event.side)

core.send(card, "flipped", {"side": "up"})  # the card's handler runs;  its pile's doesn't
```

- The twin of the JavaScript core's `sending.ts`, which says how an event travels.
- An event goes to its target first, then up its chain, until a handler takes it:
  - the thing itself, its `on_flipped()` (or `when_flipped()`)
  - the list holding it, and the list holding that
  - the running app (`core.RUNTIME.app`)
  - last, the program's own listeners, `core.on("flipped")`
- A handler that runs takes the event, unless it says `pass event`.  An event nobody takes is dropped, silently.
- `send()` isn't `async def`, so a method that doesn't wait can call it.
  - It runs each handler as Python runs them (`_call()`), and returns the event.
  - One that waits goes on beside what sent it, and `await core.send(...)` waits for it to end.
- A property's change waits until the running step has ended, as JavaScript's microtask does:
  see `note_property_change()`.
- Sits above `things` and `lists`;  `things` reaches it through `program_core()`, at run time.
"""

import asyncio
import contextlib
import inspect
import re
from collections.abc import Awaitable, Callable, Iterator
from typing import TYPE_CHECKING, Any

from spell_core.events import SentEvent, _call, run_beside
from spell_core.lists import holder_of

if TYPE_CHECKING:
    from spell_core.console import SpellConsole
    from spell_core.runtime_methods import SpellRuntime


def event_name(event_type: str) -> str:
    """Spell's name for an event, as `on()` keys it:  `card flipped`, `Card_Flipped` => `card-flipped`."""
    return re.sub(r"[\s_]+", "-", event_type.strip().lower())


def handler_of(thing: object, event_type: str) -> Callable[..., object] | None:
    """The method of `thing` that handles `event_type`, if it has one:  `on_card_flipped`, else `when_card_flipped`.

    - Looked up on its class:  a thing reads a name it doesn't declare as `None`, and this runs on every change.
    """
    name = event_name(event_type).replace("-", "_")
    for method in (f"on_{name}", f"when_{name}"):
        if callable(getattr(type(thing), method, None)):
            return getattr(thing, method)
    return None


class SendingMethods:
    """`core.send()`, and the change a property's `when <property> changes` handler hears."""

    console: "SpellConsole"
    RUNTIME: "SpellRuntime"

    def send(
        self, target: object, event_type: str, params: dict[str, object] | None = None, sender: object = None
    ) -> SentEvent:
        """Send event `event_type` to `target`, with `params`:  see the module's docs.

        - `target` `None`:  straight to the program's own listeners.
        - `sender`:  the thing sending it, when a thing does.
        - Returns the event:  `canceled` says if a handler canceled it.
        - NEVER throws for a handler:  one that fails is said on the console, and the event goes on as if it took it.
          - But a handler stopped by canceling its action (`asyncio.CancelledError`) stops what sent it too.
        """
        event = SentEvent(event_name(event_type), **(params or {}))
        event.original_target = target
        event.sender = sender
        waits = self._handlers_taking(event)
        first = next(waits, None)
        if first is not None:
            event.finishing = run_beside(self._rest_of_send(event, first, waits))
        return event

    def _handlers_taking(self, event: SentEvent) -> Iterator[Awaitable[object]]:
        """Run each handler `event` reaches, stopping at the one that takes it:  yields what each must wait for."""
        for thing in self._chain_of(event.original_target):
            handler = handler_of(thing, event.type)
            if handler is None:
                continue
            event.target = thing
            event.passed = False
            event.handled = True
            try:
                result = _call(handler, (event,))
            except Exception as error:  # one failing handler mustn't stop what sent it
                self._handler_failed(event, thing, error)
            else:
                # `return event.pass_()` gives the event itself, which is no handler still running
                if result is not event and inspect.isawaitable(result):
                    yield result
            if not event.passed:
                return
        # nobody took it, or the last handler passed it on:  the program's own listeners
        event.target = None
        results = self.RUNTIME.trigger(event)
        if results:
            event.handled = True
        yield from (result for result in results if inspect.isawaitable(result))

    async def _rest_of_send(
        self, event: SentEvent, first: Awaitable[object], waits: Iterator[Awaitable[object]]
    ) -> None:
        """Wait for `first`, a handler that waits, then run the handlers after it, each in turn."""
        waiting: Awaitable[object] | None = first
        while waiting is not None:
            try:
                await waiting
            except Exception as error:  # as `_handlers_taking()`
                self._handler_failed(event, event.target, error)
            waiting = next(waits, None)

    def _handler_failed(self, event: SentEvent, thing: object, error: Exception) -> None:
        """SIDE EFFECT:  say on the program's console that `thing`'s handler of `event` failed."""
        self.console.warn(f"send {event.type}:  {type(thing).__name__}'s handler failed", repr(error))

    def _chain_of(self, target: object) -> Iterator[object]:
        """Where an event sent to `target` goes, in order:  `target`, what holds it, up to the running app.

        - Stops at a thing seen already, so a loop of holders can't run forever.
        """
        seen: set[int] = set()
        at = target
        while at is not None and id(at) not in seen:
            seen.add(id(at))
            yield at
            at = vars(at).get("event_parent") or holder_of(at)
        app = self.RUNTIME.app
        if app is not None and id(app) not in seen:
            yield app

    def note_property_change(self, target: object, name: str, was: object, value: object) -> None:
        """A made thing's property changed:  its `when <property> changes` handler hears, once the step has ended.

        - `- when its score changes:` is the handler of `score-change`, `on_score_change()`.
        - Only a thing with the handler:  it never goes up the chain to its pile or the app.
        - Once per change, each with its own `value` and `was`.  Its `sender` is the thing itself.
        - Waits in `RUNTIME.changes_waiting` for `send_waiting_changes()`, which the loop calls soon, if one is running.
        """
        event_type = f"{name.rstrip('_').replace('_', '-')}-change"
        if handler_of(target, event_type) is None:
            return
        change: dict[str, Any] = {"value": value, "was": was}
        self.RUNTIME.changes_waiting.append(lambda: self.send(target, event_type, change, target))
        # no loop:  the next pause, the page's message or the program's end sends it
        with contextlib.suppress(RuntimeError):
            asyncio.get_running_loop().call_soon(self.send_waiting_changes)

    def send_waiting_changes(self) -> None:
        """SIDE EFFECT:  send each property change waiting, and any their handlers make, oldest first."""
        changes = self.RUNTIME.changes_waiting
        while changes:
            changes.pop(0)()
