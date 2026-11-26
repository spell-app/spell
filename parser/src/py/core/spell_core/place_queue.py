"""One place's saves, waiting their turn to be sent (epic data P62):  so no save holds up the event loop.

```python
queue = PlaceQueue(behind, report=say_it_was_refused)
queue.add(Sending([change], type_name="Note"))
queue.send_beside()          # sent off the loop:  whoever else is on it goes on
await queue.wait_until_sent()   # before a read of the place, or as the program ends
```

- Under Quart one loop serves every visitor, so a send waits in a thread, as a read does.
- In the order made.  An `in one go:`'s changes are always a send of their own.
- What's waiting goes as one send, up to `MOST_AT_ONCE` changes, to a place that either:
  - makes a send all or none (`makes_all_or_none`):  a database on this device, a sheet, an atmosphere account
    - refused, so none of it was kept:  sent again one change at a time, so only what it refuses is lost (J304)
  - or says how many it kept before a failure (`says_what_it_kept`):  a data folder (J304)
    - what it kept is over, the one it refused failed, and only what it never tried waits to go again
  - NEVER sent again after another failure:  it may have been kept, and would reach the place twice.
- Any other place gets a send per change.
- A send is taken off the queue only once it's over:  one sender at a time (`_lock`), so none goes twice.
- Where nothing can wait (no loop running), `send_now()` sends right there.
  A drawing doesn't wait at all:  it reads what the place has, with what's on its way laid over it (`on_its_way()`).
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

    def on_its_way(self) -> list[Change]:
        """Every change not yet kept, in order:  waiting, or being sent now.  For a read that can't wait (I158).

        - Never waits for the lock:  a copy of what's waiting, taken at once (a deque's `copy()` holds the GIL).
        """
        return [change for sending in self.waiting.copy() for change in sending.changes]

    def stop_waiting_for(self, sending: Sending) -> None:
        """SIDE EFFECT:  who waited for `sending` has gone:  its failure is reported, even one that's been heard."""
        sending.is_waited_for = False
        if sending.error and sending.is_done and sending not in self.answered:
            self.report(sending)

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
                # only what's over leaves the queue:  what a place never tried stays first in line
                for sending in batch[: self._send(batch)]:
                    sending.is_done = True
                    self.answered.append(sending)
                    self.waiting.popleft()
                    count -= 1

    def _next_batch(self, count: int) -> list[Sending]:
        """The next send:  an `in one go:` alone, else the changes in a row up to the next one.

        - A place that neither makes all or none nor says what it kept:  one change.
        """
        batch = [self.waiting[0]]
        goes_together = self.behind.makes_all_or_none or self.behind.says_what_it_kept
        if batch[0].is_waited_for or not goes_together:
            return batch
        # by index:  the program's thread may add as this runs, which iterating doesn't allow
        for index in range(1, min(count, MOST_AT_ONCE)):
            sending = self.waiting[index]
            if sending.is_waited_for:
                break
            batch.append(sending)
        return batch

    def _send(self, batch: list[Sending]) -> int:
        """SIDE EFFECT:  `batch` sent as one `apply()`:  how many of it, from the first, are over.

        - From a place that makes all or none, sent again, each alone, only when it says it kept none of it
          (`PlaceError.has_kept_nothing`).
        - From a place that says what it kept (`PlaceError.kept`):  those are over, and so is the one it failed;
          the rest it never tried, so they aren't over.
        - Any other error is each one's failure:  there's no telling whether it was sent.
        """
        try:
            self.behind.apply([change for sending in batch for change in sending.changes])
        except Exception as error:
            if len(batch) > 1 and isinstance(error, PlaceError):
                if self.behind.makes_all_or_none and error.has_kept_nothing:
                    for sending in batch:
                        self._send([sending])
                    return len(batch)
                if self.behind.says_what_it_kept and error.kept is not None:
                    return _over_after(batch, error, error.kept)
            for sending in batch:
                sending.error = error
        return len(batch)

    def hear(self) -> None:
        """SIDE EFFECT:  each send that's over is heard:  kept, or reported.  On the program's thread only."""
        while self.answered:
            sending = self.answered.popleft()
            if sending.error:
                if not sending.is_waited_for:
                    self.report(sending)
            elif sending.when_kept:
                sending.when_kept()


def _over_after(batch: list[Sending], error: Exception, kept: int) -> int:
    """SIDE EFFECT:  in `batch`, the sending holding the change after the first `kept` failed with `error`.

    - How many are over:  those kept, and that one.  The rest were never tried.
    - `kept` past the last change:  every one failed, as nothing says which.
    """
    changes_before = 0
    for index, sending in enumerate(batch):
        changes_before += len(sending.changes)
        if changes_before > kept:
            sending.error = error
            return index + 1
    for sending in batch:
        sending.error = error
    return len(batch)
