"""What a person starts runs one at a time:  the twin of the JavaScript core's `ActionQueue.ts` (epic language, Q6).

```python
queue.enter(game, "deal", deal)   # runs
queue.enter(game, "deal", deal)   # the same again, on the same thing:  ignored
queue.enter(card, "flip", flip)   # another:  waits for the deal
queue.enter(card, "hint", hint)   # takes flip's place:  only the latest waits
```

- ONE per running program, `core.RUNTIME.actions`;  a page's messages enter it through `PageSession.enter()`.
  - What the program itself calls never comes here, so a deal can't wait for itself.
- Each action is an asyncio task, so a pause in it lets the next message in.
- Canceling (`cancel()`) stops an action at its next wait, as asyncio does:  what it wrote to properties stays.
  The next action waits until it has really ended, so two never overlap.
- Imports nothing of the core's:  `runtime_methods.py` makes one.
"""

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

# What's told when an action has ended:  what it failed with, if it failed
Ended = Callable[[BaseException | None], Awaitable[None]]


@dataclass
class _Entry:
    """An action in the queue:  what it's on, its name, how to run it, and who's told when it ends."""

    thing: object
    name: str
    run: Callable[[], Awaitable[object]]
    replaces_last: bool = False
    ended: Ended | None = None


class ActionQueue:
    """What a person starts, one at a time:  see the module's docs."""

    def __init__(self) -> None:
        """A queue with nothing running."""
        self.running: _Entry | None = None
        self.waiting: _Entry | None = None
        self._task: asyncio.Task[None] | None = None

    @property
    def is_busy(self) -> bool:
        """Is an action running, so another would have to wait?"""
        return self.running is not None

    def enter(
        self,
        thing: object,
        name: str,
        run: Callable[[], Awaitable[object]],
        replaces_last: bool = False,
        ended: Ended | None = None,
    ) -> None:
        """Run an action, or give it its turn:  see the module's docs.  Needs a running event loop.

        - `run`:  makes the wait that does it.
        - `replaces_last`:  the newest wins (`- a new one replaces the last one`):  a repeat cancels the running one.
        - `ended`:  told once it has run;  not if it's dropped or ignored.
        """
        running = self.running
        if running and running.thing is thing and running.name == name:
            if not replaces_last:
                return
            self._cancel_running()
        self.waiting = _Entry(thing, name, run, replaces_last, ended)
        if not self.running:
            self._start_next()

    def cancel(self, thing: object = None, name: str | None = None) -> bool:
        """Cancel what's running and what's waiting;  with `thing`, or its `name` too, only theirs.  True if any was."""

        def matches(entry: _Entry) -> bool:
            return (thing is None or entry.thing is thing) and (not name or entry.name == name)

        canceled = False
        if self.waiting and matches(self.waiting):
            self.waiting = None
            canceled = True
        if self.running and matches(self.running):
            self._cancel_running()
            canceled = True
        return canceled

    def _cancel_running(self) -> None:
        """Stop the running action at its next wait."""
        if self._task:
            self._task.cancel()

    def _start_next(self) -> None:
        """The waiting action's turn, if there is one."""
        entry = self.waiting
        self.waiting = None
        if entry:
            self.running = entry
            self._task = asyncio.get_running_loop().create_task(self._run(entry))

    async def _run(self, entry: _Entry) -> None:
        """Run `entry`, tell who's waiting to hear, then give the next one its turn.  NEVER throws, but for a cancel."""
        error: BaseException | None = None
        try:
            await entry.run()
        except asyncio.CancelledError:
            pass  # a cancel aborts silently
        except Exception as failed:
            error = failed
        self.running = None
        self._task = None
        self._start_next()
        if entry.ended:
            await entry.ended(error)
