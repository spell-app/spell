"""Undo and redo in a running program:  what an undoable action changed, put back (epic `language` P54).

```python
class Card(Thing):
    face_up = prop(type="choice")

    def turn_over(self):
        self.face_up = not self.face_up

core.describe_action(Card, "turn_over", {"title": "Turn Over", "undone_as": "Turn Card"})
card.turn_over()     # one step, "Turn Card"
game.undo_title      # "Undo Turn Card"
game.undo()          # the card faces as it did
```

- The twin of the JavaScript core's `undoing.ts`, and the kit's `UndoStack` it's built on.
- ONE history per run, `core.RUNTIME.history`:  a new run starts with none.
  - Loading saved state clears it (`core.from_json()`, `Loader.load()`):  the person's document changed.
- Only what an undoable action changes is recorded:  one described `undone_as` (`core.describe_action()`).
  - everything it sets, and everything it adds to or takes from a list, is ONE step
  - however long it waits, and whatever it calls:  another action it calls joins its step,
    and so does work begun while it waits, e.g. a drag's `while` handler
  - undo and redo put the changes back at once:  nothing runs again, nothing's waited on
- It keeps the least it needs:
  - for each thing and property:  its value before the step's first change, and after its last
  - for each list:  its items before the step and after it -- the same things, not copies
- Every change is noted in one place, which this history hears from:
  - each property write, in `SpellObject.set_prop()` (`things.py`)
  - each list change, in `List._write_items()` (`lists.py`)
- The Edit menu's titles are in the program's language:  the core's messages `undo`, `undo-step` ...
- The app shows it to people:  `App.undo()`, `can_undo`, `undo_title` ... (`apps.py`);
  a page drawing the program mirrors them (`StateWriter`'s `"$history"`).
- NOT ported, as compiled spell says neither:  the JavaScript core's `cantBeUndone` actions, and props declared
  `undoable: false`.
- Imports nothing of the core's but `things.py`'s `program_core()`, inside functions:  `things.py` and `lists.py`
  reach it through the core, and `runtime_methods.py` makes one.
"""

import functools
import inspect
from collections.abc import Callable, Coroutine
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

# Which of the Edit menu's items a title is for
UndoAction = Literal["undo", "redo"]

# The most steps a run keeps:  the oldest go past it
STEPS_KEPT = 100


class UndoRecord(Protocol):
    """One change in a step:  how to put it back, and how to make it again."""

    def undo(self) -> None:
        """Put the change back."""

    def redo(self) -> None:
        """Make the change again."""


@dataclass
class UndoStep:
    """One step people undo and redo:  its title, `Turn Card`, and the changes it made, in order."""

    title: str
    records: list[UndoRecord] = field(default_factory=list)


class UndoHistory:
    """A running program's undo history:  `core.RUNTIME.history` -- see the module's docs.

    - Two stacks:  `undo()` moves the newest step onto the redo stack, then undoes it;  `redo()` the reverse.
      A new step empties the redo stack.
    - `transaction()` is ONE step, however many changes it records;  `run()` runs an action as one.
    - `title_for`:  each menu item's title, in the program's language (`core.message()`).
    - `on_change`:  told each time what the Edit menu shows may have changed -- a step made, undone, redone or
      forgotten -- so a page hears of it (`runtime_methods.py`).
    """

    def __init__(
        self,
        title_for: Callable[[UndoAction, str | None], str] | None = None,
        on_change: Callable[[], None] | None = None,
    ) -> None:
        """An empty history:  see the class's docs."""
        self.title_for = title_for or english_title
        self.on_change = on_change or (lambda: None)
        # steps to undo, oldest first
        self._undo_steps: list[UndoStep] = []
        # steps to redo, the next one last
        self._redo_steps: list[UndoStep] = []
        # the transaction open now:  `transaction()`'s step
        self._open: UndoStep | None = None
        # what the open step has changed so far, so each thing's property and each list is one record
        self._settings: dict[tuple[int, str], SettingRecord] = {}
        self._lists: dict[int, ItemsRecord] = {}
        # True while `undo()` or `redo()` runs records
        self._applying = False

    ################
    # ## The history
    ################

    @property
    def can_undo(self) -> bool:
        """Is there a step to undo?"""
        return bool(self._undo_steps)

    @property
    def can_redo(self) -> bool:
        """Is there a step to redo?"""
        return bool(self._redo_steps)

    @property
    def undo_title(self) -> str:
        """The Edit menu's undo item:  `Undo Turn Card`, or `Undo` with nothing to undo."""
        return self.title_for("undo", self._undo_steps[-1].title if self._undo_steps else None)

    @property
    def redo_title(self) -> str:
        """The Edit menu's redo item:  `Redo Turn Card`, or `Redo` with nothing to redo."""
        return self.title_for("redo", self._redo_steps[-1].title if self._redo_steps else None)

    @property
    def steps(self) -> list[UndoStep]:
        """The steps it can undo, oldest first:  a copy."""
        return list(self._undo_steps)

    @property
    def is_in_transaction(self) -> bool:
        """Is a transaction open:  will what's recorded now join it?"""
        return self._open is not None

    @property
    def is_recording(self) -> bool:
        """Is a change made now recorded:  an undoable action running, and nothing being undone?"""
        return self._open is not None and not self._applying

    def shown(self) -> dict[str, object]:
        """What the Edit menu shows of it, as a page is sent it:  `{"can_undo": True, "undo_title": ...}`."""
        return {
            "can_undo": self.can_undo,
            "can_redo": self.can_redo,
            "undo_title": self.undo_title,
            "redo_title": self.redo_title,
        }

    def clear(self) -> None:
        """Forget every step, to undo and to redo, e.g. when the program loads a saved document."""
        had_steps = self.can_undo or self.can_redo
        self._undo_steps = []
        self._redo_steps = []
        if had_steps:
            self.on_change()

    ################
    # ## Running actions
    ################

    def run[Result](self, title: str, act: Callable[[], Result]) -> Result:
        """Run `act`, an action described `undone_as` `title`, as ONE step:  what it returns, or a coroutine.

        - A transaction already open (nested, or one waiting):  `act` joins it, and opens no step of its own.
        - `act` makes a coroutine (an `async def` action):  the coroutine returned runs it as the step, once awaited,
          and keeps it open until it ends:  so what it does after a pause joins too, and so does work begun meanwhile.
          - Its step opens as it starts running, not as it's made:  one never awaited leaves no step open.
        - `act` throws, or its coroutine does:  what it recorded is still a step (its changes happened),
          and the error is passed on.
        - Nothing recorded:  no step.
        """
        if self._open is not None or self._applying:
            return act()
        step = self._open_step(title)
        try:
            result = act()
        finally:
            self._close(step)
        if inspect.iscoroutine(result):
            return self._run_async(title, result)  # type: ignore[return-value]
        return result

    async def _run_async(self, title: str, running: Coroutine[Any, Any, Any]) -> Any:
        """`running`, an action's coroutine, awaited as ONE step -- see `run()`."""
        if self._open is not None or self._applying:
            return await running
        step = self._open_step(title)
        try:
            return await running
        finally:
            self._close(step)

    def undo(self) -> bool:
        """Undo the newest step:  its records undone, last first.  False with none, or while an action still runs.

        - e.g. Undo while a deal still waits between cards:  putting the step before it back mid-deal would tangle them.
        - The stacks have moved before the records run:  what their changes set off already sees the new history.
        """
        if self._open is not None or not self._undo_steps:
            return False
        step = self._undo_steps.pop()
        self._redo_steps.append(step)
        self._apply(lambda: [record.undo() for record in reversed(step.records)])
        return True

    def redo(self) -> bool:
        """Redo the step undone last:  its records redone, in order.  False with none, or while an action still runs."""
        if self._open is not None or not self._redo_steps:
            return False
        step = self._redo_steps.pop()
        self._undo_steps.append(step)
        self._apply(lambda: [record.redo() for record in step.records])
        return True

    ################
    # ## Recording
    ################

    def note_setting(self, target: object, name: str, was: object, value: object) -> None:
        """`target`'s property `name` was set from `was` to `value`:  recorded into the open step, if one is.

        - Its first change in the step keeps `was`;  each later one only moves its value now.
        - `SpellObject.set_prop()` calls it, for every property write of a thing that's made.
        """
        if not self.is_recording:
            return
        key = (id(target), name)
        setting = self._settings.get(key)
        if setting is None:
            setting = self._settings[key] = SettingRecord(target, name, was)
            self._record(setting)
        setting.value = value

    def note_items(self, items: object, before: list[object], after: list[object]) -> None:
        """List `items`' items changed from `before` to `after`:  recorded into the open step, if one is.

        - Its first change in the step keeps `before`;  each later one only moves `after`.
        - `List._write_items()` calls it, for every change to a list.
        """
        if not self.is_recording:
            return
        change = self._lists.get(id(items))
        if change is None:
            change = self._lists[id(items)] = ItemsRecord(items, list(before))
            self._record(change)
        change.after = list(after)

    def _record(self, record: UndoRecord) -> None:
        """SIDE EFFECT:  `record` joins the open step."""
        if self._open is not None:
            self._open.records.append(record)

    def _open_step(self, title: str) -> UndoStep:
        """A new step, open:  what's recorded until it closes joins it."""
        step = UndoStep(title)
        self._open = step
        self._settings = {}
        self._lists = {}
        return step

    def _close(self, step: UndoStep) -> None:
        """Close `step`:  onto the undo stack, unless it recorded nothing;  the redo stack is emptied."""
        if self._open is not step:
            return
        self._open = None
        self._settings = {}
        self._lists = {}
        if not step.records:
            return
        self._undo_steps = [*self._undo_steps, step][-STEPS_KEPT:]
        self._redo_steps = []
        self.on_change()

    def _apply(self, put_back: Callable[[], object]) -> None:
        """Run `put_back`, a step's records undone or redone, recording nothing;  then tell who's listening."""
        self._applying = True
        try:
            put_back()
        finally:
            self._applying = False
        self.on_change()


################
# ## Declaring actions
################


def declare_action(cls: type, name: str, undone_as: str) -> None:
    """Make `cls`'s method `name` an action that's ONE undo step, titled `undone_as`:  see `UndoHistory.run()`.

    - What `core.describe_action()` does for a description with `"undone_as"`.
    - SIDE EFFECT:  replaces the method on `cls` with one that runs it through the running program's history.
      - Only once:  a sub-class describing it again doesn't wrap it twice.
    - throws `TypeError` if `name` isn't a method of `cls`
    """
    method = getattr(cls, name, None)
    if not callable(method):
        raise TypeError(f"{cls.__name__}.describe_action():  `{name}` isn't one of its methods;  describe it after it")
    if getattr(method, UNDONE_AS_KEY, None) is not None:
        return

    @functools.wraps(method)
    def action(self: object, *args: object, **kwargs: object) -> object:
        from spell_core.things import program_core

        return program_core().RUNTIME.history.run(undone_as, lambda: method(self, *args, **kwargs))

    setattr(action, UNDONE_AS_KEY, undone_as)
    setattr(cls, name, action)


# What an action's method made undoable is marked with:  its step's title
UNDONE_AS_KEY = "_spell_undone_as"


################
# ## Records
################


class SettingRecord:
    """One property of one thing, changed in a step:  its value before, and after."""

    def __init__(self, target: Any, name: str, was: object) -> None:
        """`target`'s `name`, which was `was` (`None`:  unset) before the step's first change."""
        self.target = target
        self.name = name
        self.was = was
        # its value after the step's last change
        self.value: object = None

    def undo(self) -> None:
        """Through its property, as the program sets it:  so a page hears of it."""
        setattr(self.target, self.name, self.was)

    def redo(self) -> None:
        """Through its property, as `undo()`."""
        setattr(self.target, self.name, self.value)


class ItemsRecord:
    """One list, changed in a step:  its items before, and after.

    - Whole lists, not one splice:  putting one list of an exclusive family back moves its items out of the others,
      so a splice's place would be wrong by then.  Whole lists end right in any order.
    """

    def __init__(self, items: Any, before: list[object]) -> None:
        """List `items`, which held `before` before the step's first change."""
        self.items = items
        self.before = before
        # its items after the step's last change
        self.after: list[object] = []

    def undo(self) -> None:
        """Through its `items` setter (`List._write_items()`):  so an exclusive list's owners stay right."""
        self.items.items = list(self.before)

    def redo(self) -> None:
        """Through its `items` setter, as `undo()`."""
        self.items.items = list(self.after)


def english_title(action: UndoAction, title: str | None) -> str:
    """A menu item's title in English:  `Undo Turn Card`, or `Undo` with nothing to undo."""
    verb = "Undo" if action == "undo" else "Redo"
    return f"{verb} {title}" if title else verb
