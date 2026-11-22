"""One place's saves, waiting their turn to be sent (epic data P62):  so no save holds up the event loop.

```python
queue = PlaceQueue(behind, report=say_it_was_refused)
queue.add(Sending([change], type_name="Note"))
queue.send_beside()          # sent off the loop:  whoever else is on it goes on
await queue.wait_until_sent()   # before a read of the place, or as the program ends
```

- Under Quart one loop serves every visitor, so a send waits in a thread, as a read does.
- In the order made.  What's waiting goes as one send;  an `in one go:`'s changes are always a send of their own.
- A send that failed keeping none of it is sent again one change at a time, so only what can't be kept is lost:
  the JavaScript core's way (epic data, J26).
- Where nothing can wait (no loop running, a drawing), `send_now()` sends right there.
- What's heard of each send is heard on the program's own thread (`hear()`), never the one that sent it.
- Imports only `place_kinds`:  knows nothing of things, or of the core.
"""

import asyncio
import contextlib
import threading
from collections import deque
from collections.abc import Callable
from dataclasses import dataclass

from spell_core.place_kinds import Change, PlaceBehind, PlaceError

# The most changes sent as one:  what an atmosphere account's `applyWrites` takes.
MOST_AT_ONCE = 200


@dataclass(eq=False)
class Sending:
    """Changes to one place that go together:  one change, or an `in one go:`'s."""

    # the changes, in order
    changes: list[Change]
    # the type changed, for saying it wasn't kept:  `Note`
    type_name: str = ""
    # called on the program's thread once the place has kept them
    when_kept: Callable[[], None] | None = None
    # does who made them wait for them, and hear a failure itself?  Then nothing's reported
    is_waited_for: bool = False
    # is it over:  kept, or failed?
    is_done: bool = False
    # what it failed with
    error: Exception | None = None


class PlaceQueue:
    """One place's saves, in the order made:  see the module's docs."""

    def __init__(self, behind: PlaceBehind, report: Callable[[Sending], None]) -> None:
        """Nothing waiting for `behind`;  `report` is handed each failure nobody waits for, on the program's thread."""
        self.behind = behind
        self.report = report
        # not yet sent, or being sent now:  the program's thread adds, only who holds the lock takes out
        self.waiting: deque[Sending] = deque()
        # over, and not heard yet
        self.answered: deque[Sending] = deque()
        # held by whoever is sending:  so waiting for a send under way is waiting for the lock
        self._lock = threading.Lock()
        self._task: asyncio.Task[None] | None = None

    def add(self, sending: Sending) -> None:
        """SIDE EFFECT:  `sending` waits its turn, after all that's waiting."""
        self.waiting.append(sending)

    ################
    # ## Off the loop
    ################

    def send_beside(self) -> None:
        """SIDE EFFECT:  one task on the running loop sends what's waiting, not holding up the caller."""
        loop = asyncio.get_running_loop()
        task = self._task
        # a task of a loop that has ended never ends:  this loop needs its own
        if task is None or task.done() or task.get_loop() is not loop:
            self._task = loop.create_task(self._send_all())

    async def wait_until_sent(self) -> None:
        """Wait until nothing's waiting, off the loop.  Nothing waiting:  no wait at all."""
        while self.waiting:
            await asyncio.to_thread(self.send_now)
        self.hear()

    async def wait_for(self, sending: Sending) -> None:
        """Wait until `sending` is over, off the loop:  kept, or failed (`sending.error`)."""
        while not sending.is_done:
            await asyncio.to_thread(self.send_now)
        self.hear()

    async def _send_all(self) -> None:
        """The task:  sends until nothing's waiting.

        - Canceled, it still finishes:  `asyncio.run()` cancels what's running as it ends, and waits for it to end.
          So a top-level step's saves are sent before the next step runs, and a server stopping drops none.
        """
        loop = asyncio.get_running_loop()
        while self.waiting:
            # not `to_thread()`:  that's a task of its own, which the loop's ending would cancel too
            sending = loop.run_in_executor(None, self.send_now)
            while not sending.done():
                with contextlib.suppress(asyncio.CancelledError):
                    await asyncio.shield(sending)
            self.hear()

    ################
    # ## Sending
    ################

    def send_now(self) -> None:
        """SIDE EFFECT:  send, waiting here, what was waiting when its turn came:  any thread may.

        - NEVER throws:  each `Sending` holds what it failed with.
        """
        with self._lock:
            count = len(self.waiting)
            while count > 0:
                batch = self._next_batch(count)
                self._send(batch)
                for sending in batch:
                    sending.is_done = True
                    self.answered.append(sending)
                    self.waiting.popleft()
                count -= len(batch)

    def _next_batch(self, count: int) -> list[Sending]:
        """The next send:  an `in one go:` alone, else the changes in a row up to the next one."""
        batch = [self.waiting[0]]
        if batch[0].is_waited_for:
            return batch
        # by index:  the program's thread may add as this runs, which iterating doesn't allow
        for index in range(1, min(count, MOST_AT_ONCE)):
            sending = self.waiting[index]
            if sending.is_waited_for:
                break
            batch.append(sending)
        return batch

    def _send(self, batch: list[Sending]) -> None:
        """SIDE EFFECT:  `batch` sent as one `apply()`;  none of it kept, each alone.

        - A failure that's no `PlaceError` is one change's own, e.g. a value JSON can't hold:  each alone too.
        """
        try:
            self.behind.apply([change for sending in batch for change in sending.changes])
        except Exception as error:
            if len(batch) > 1 and (not isinstance(error, PlaceError) or error.has_kept_nothing):
                for sending in batch:
                    self._send([sending])
                return
            for sending in batch:
                sending.error = error

    def hear(self) -> None:
        """SIDE EFFECT:  each send that's over is heard:  kept, or reported.  On the program's thread only."""
        while self.answered:
            sending = self.answered.popleft()
            if sending.error:
                if not sending.is_waited_for:
                    self.report(sending)
            elif sending.when_kept:
                sending.when_kept()
