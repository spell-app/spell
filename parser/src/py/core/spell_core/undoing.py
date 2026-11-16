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
  - A top-level action, which has no class:  `@core.as_action({"undone_as": ...})` above its `def` (J149).
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


class ActionCanceled(Exception):  # noqa: N818 -- the JavaScript core's name:  a sentinel, not an error
    """What `cancel` raises, in an action (epic `language` P56):  the action stops, called off -- see `run_acting()`."""


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
        # how many actions that can't be undone are running:  nothing they change is recorded
        self._unrecorded = 0
        # what each action that may cancel has changed so far, innermost last:  `recording_changes()`
        self._changes_being_made: list[ChangesMade] = []
        # each value the core keeps for a thing itself, changed in the open step:  `note_kept()`
        self._kept: dict[tuple[int, object], KeptRecord] = {}

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
    def is_applying(self) -> bool:
        """Is it undoing or redoing now?  Then nothing records."""
        return self._applying

    @property
    def is_in_transaction(self) -> bool:
        """Is a transaction open:  will what's recorded now join it?"""
        return self._open is not None

    @property
    def is_recording(self) -> bool:
        """Is a change made now recorded:  an undoable action running, nothing being undone, no `cant_be_undone` one?"""
        return self._open is not None and not self._applying and not self._unrecorded

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

    def run_unrecorded[Result](self, act: Callable[[], Result]) -> Result:
        """Run `act`, an action described `cant_be_undone`, recording nothing it changes:  what it returns.

        - `"keeps history"`:  the steps before it can still be undone, e.g. showing a hint.
        - A step open around it (an undoable action that calls it) records nothing of it either.
        """
        self._unrecorded += 1
        try:
            result = act()
        except BaseException:
            self._unrecorded -= 1
            raise
        if inspect.iscoroutine(result):
            return self._unrecorded_async(result)  # type: ignore[return-value]
        self._unrecorded -= 1
        return result

    async def _unrecorded_async(self, running: Coroutine[Any, Any, Any]) -> Any:
        """`running`, a `cant_be_undone` action's coroutine, awaited recording nothing -- see `run_unrecorded()`."""
        try:
            return await running
        finally:
            self._unrecorded -= 1

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
        - Noted too for every action that may `cancel` (`recording_changes()`).
        """
        for changes in self._changes_being_made:
            changes.note(target, ("prop", name), lambda: setattr(target, name, was))
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
        - Noted too for every action that may `cancel` (`recording_changes()`).
        """
        kept_before = list(before)
        for changes in self._changes_being_made:
            changes.note(items, "items", lambda: setattr(items, "items", list(kept_before)))
        if not self.is_recording:
            return
        change = self._lists.get(id(items))
        if change is None:
            change = self._lists[id(items)] = ItemsRecord(items, list(before))
            self._record(change)
        change.after = list(after)

    def note_kept(self, target: object, key: object, was: object, value: object, put: Callable[[object], None]) -> None:
        """A value the core keeps for `target` itself is changing from `was` to `value`, e.g. a card's last pile.

        - Recorded into the open step as `note_setting()` records a property, but put back through `put`.
        - Noted too for every action that may `cancel`.
        - `ListFamily` calls it, as an item moves (`List.last_owner_of()`).
        """
        if was is value:
            return
        for changes in self._changes_being_made:
            changes.note(target, ("kept", key), lambda: put(was))
        if not self.is_recording:
            return
        record_key = (id(target), key)
        kept = self._kept.get(record_key)
        if kept is None:
            kept = self._kept[record_key] = KeptRecord(put, was)
            self._record(kept)
        kept.value = value

    def recording_changes(self) -> "ChangesMade":
        """Note every change made from now on, to put back if the action that started it cancels:  `run_acting()`."""
        changes = ChangesMade(self._changes_being_made)
        self._changes_being_made.append(changes)
        return changes

    def drop_unchanged_records(self) -> None:
        """Drop the open step's records whose changes were all put back, e.g. by an action that canceled.

        - So a step left with none is no step, and Undo isn't lit for nothing.
        - Its notes forget them too:  a later change in the step is a record of its own again.
        """
        if self._open is None:
            return
        kept: list[UndoRecord] = []
        for record in self._open.records:
            if not _is_unchanged(record):
                kept.append(record)
            elif isinstance(record, SettingRecord):
                self._settings.pop((id(record.target), record.name), None)
            elif isinstance(record, ItemsRecord):
                self._lists.pop(id(record.items), None)
            elif isinstance(record, KeptRecord):
                self._kept = {key: each for key, each in self._kept.items() if each is not record}
        self._open.records = kept

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
        self._kept = {}
        return step

    def _close(self, step: UndoStep) -> None:
        """Close `step`:  onto the undo stack, unless it recorded nothing;  the redo stack is emptied."""
        if self._open is not step:
            return
        self._open = None
        self._settings = {}
        self._lists = {}
        self._kept = {}
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


def declare_action(
    cls: type,
    name: str,
    undone_as: str | None,
    cant_be_undone: str | None = None,
    cancels: bool = False,
    after: list[str] | None = None,
) -> None:
    """Make `cls`'s method `name` an action that's ONE undo step, titled `undone_as`:  see `UndoHistory.run()`.

    - What `core.describe_action()` does for a description with `"undone_as"`.
    - Or, with no `undone_as`, one that can't be undone (`cant_be_undone`, `"keeps history"`):  nothing it changes is
      recorded (`UndoHistory.run_unrecorded()`).
    - `cancels`:  it may `cancel`;  `after`:  the methods of `cls` that run after it, its after hooks, in order --
      a live list, so a hook added later runs too (`core.add_after_hook()`).  See `run_acting()`.
    - SIDE EFFECT:  replaces the method on `cls` with one that runs it through the running program's history.
      - Only once:  a sub-class describing it again doesn't wrap it twice.
    - throws `TypeError` if `name` isn't a method of `cls`
    """
    method = getattr(cls, name, None)
    if not callable(method):
        raise TypeError(f"{cls.__name__}.describe_action():  `{name}` isn't one of its methods;  describe it after it")
    if getattr(method, UNDONE_AS_KEY, None) is not None:
        return

    setattr(cls, name, action_of(method, undone_as, cant_be_undone, cancels, after))


def action_of[**Params, Result](
    function: Callable[Params, Result],
    undone_as: str | None,
    cant_be_undone: str | None = None,
    cancels: bool = False,
    after: list[str] | None = None,
) -> Callable[Params, Result]:
    """`function`, as an action that's ONE undo step titled `undone_as`:  what runs in its place.

    - Or, with no `undone_as`, one that can't be undone (`cant_be_undone`, `"keeps history"`):  nothing it changes is
      recorded (`UndoHistory.run_unrecorded()`).
    - What `declare_action()` puts on a class, and `core.as_action()` above a top-level action's `def` (epic `language`
      J149).
    - Through the history of the program running when it's called:  one per web visitor.
    """

    @functools.wraps(function)
    def action(*args: Params.args, **kwargs: Params.kwargs) -> Result:
        from spell_core.things import program_core

        history = program_core().RUNTIME.history
        # an after hook is a method of the thing it runs on, given the action's blanks
        hooks = [functools.partial(getattr(args[0], hook), *args[1:], **kwargs) for hook in after or []]

        def act() -> Any:
            return run_acting(history, lambda: function(*args, **kwargs), cancels, hooks)

        if undone_as is None:
            return history.run_unrecorded(act)
        return history.run(undone_as, act)

    setattr(action, UNDONE_AS_KEY, undone_as if undone_as is not None else cant_be_undone)
    return action


# What an action's method made undoable is marked with:  its step's title
UNDONE_AS_KEY = "_spell_undone_as"


def run_acting(history: UndoHistory, act: Callable[[], Any], cancels: bool, after: list[Callable[[], Any]]) -> Any:
    """Run `act`, an action's steps, then its after hooks (`after`), in order, as ONE action that may be called off.

    - The JavaScript core's `runActing()` (epic `language` P56).
    - `cancel` in its steps or a hook (`ActionCanceled`) calls it off:  every change it made is put back
      (`recording_changes()`), it leaves no undo step (`drop_unchanged_records()`), its hooks stop, and it answers
      `False`.
    - Done, an action that may cancel (`cancels`) answers `True`, unless it gave back something else.
    - A coroutine (an `async def` action, or a hook):  what's returned is one, awaiting the rest in turn.
    - Neither to do:  `act` just runs.
    """
    if not cancels and not after:
        return act()
    changes = history.recording_changes()

    def done(value: Any) -> Any:
        changes.close()
        return True if cancels and value is None else value

    def called_off() -> bool:
        changes.put_back()
        history.drop_unchanged_records()
        return False

    try:
        result = act()
        if inspect.iscoroutine(result):
            return _acting_async(result, after, done, called_off, changes)
        for at, hook in enumerate(after):
            ran = hook()
            if inspect.iscoroutine(ran):
                return _acting_async(ran, after[at + 1 :], lambda _: done(result), called_off, changes)
        return done(result)
    except ActionCanceled:
        return called_off()
    except BaseException:
        changes.close()
        raise


async def _acting_async(
    running: Coroutine[Any, Any, Any],
    rest: list[Callable[[], Any]],
    finish: Callable[[Any], Any],
    called_off: Callable[[], bool],
    changes: "ChangesMade",
) -> Any:
    """`running`, then each of `rest` in turn, awaited:  `run_acting()`'s, once something waits."""
    try:
        value = await running
        for hook in rest:
            ran = hook()
            if inspect.iscoroutine(ran):
                await ran
        return finish(value)
    except ActionCanceled:
        return called_off()
    except BaseException:
        changes.close()
        raise


class ChangesMade:
    """What an action that may cancel has changed:  how to put each prop, list and kept value back as it was."""

    def __init__(self, open_list: "list[ChangesMade]") -> None:
        """Noting, on `open_list`, the history's open recorders, until `close()`."""
        self._open_list = open_list
        # which of each target's values are noted already, by the target's id
        self._keys: set[tuple[int, object]] = set()
        # how to put each back, in the order they were first changed, with their targets kept alive
        self._undos: list[tuple[object, Callable[[], object]]] = []

    def note(self, target: object, key: object, undo: Callable[[], object]) -> None:
        """Keep `undo` for `target`'s `key`, unless one's kept already:  the first change's is the one to put back."""
        record_key = (id(target), key)
        if record_key in self._keys:
            return
        self._keys.add(record_key)
        self._undos.append((target, undo))

    def close(self) -> None:
        """Stop noting changes.  Nothing is put back."""
        if self in self._open_list:
            self._open_list.remove(self)

    def put_back(self) -> None:
        """Stop noting, and put every change back as it was:  the newest first, through the setters."""
        self.close()
        for _target, undo in reversed(self._undos):
            undo()


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


class KeptRecord:
    """One value the core keeps for a thing itself, changed in a step (`note_kept()`):  put back through `put`."""

    def __init__(self, put: Callable[[object], None], was: object) -> None:
        """Its value `was` before the step's first change."""
        self.put = put
        self.was = was
        # its value after the step's last change
        self.value: object = None

    def undo(self) -> None:
        """Put its value back."""
        self.put(self.was)

    def redo(self) -> None:
        """Make its value again."""
        self.put(self.value)


def _is_unchanged(record: UndoRecord) -> bool:
    """Does `record` change nothing in the end:  its value, or its items, as they were?"""
    if isinstance(record, SettingRecord | KeptRecord):
        return record.value is record.was or record.value == record.was
    if isinstance(record, ItemsRecord):
        return len(record.before) == len(record.after) and all(
            a is b for a, b in zip(record.before, record.after, strict=True)
        )
    return False


def english_title(action: UndoAction, title: str | None) -> str:
    """A menu item's title in English:  `Undo Turn Card`, or `Undo` with nothing to undo."""
    verb = "Undo" if action == "undo" else "Redo"
    return f"{verb} {title}" if title else verb
