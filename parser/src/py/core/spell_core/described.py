"""What a program's templates say about themselves, beyond their code (epic elemental-spell, P5).

```python
core.describe_action(Card, "turn_over", {"title": "turn it over", "shortcuts": ["meta+T"]})
core.actions_of(Card)["turn_over"]["shortcuts"]  # ["meta+T"]
```

- The twin of the JavaScript core's `described.ts`.
- Each action's description:  its title, shortcuts, when it's enabled or selected (a getter's name), its undo's name.
- Each event a template sends, with its parameters.
- Nothing runs from them yet:  the event and actions phases read them.
- Kept per class, and inherited:  a joker has a card's actions, and may describe one again.
- A class's facts, not one run's:  kept beside the class, whichever `core` describes it.
"""

from typing import Any
from weakref import WeakKeyDictionary

# Each class's own action descriptions, by method name
_ACTIONS: "WeakKeyDictionary[type, dict[str, dict[str, Any]]]" = WeakKeyDictionary()

# Each class's own event descriptions, by name
_EVENTS: "WeakKeyDictionary[type, dict[str, dict[str, Any]]]" = WeakKeyDictionary()


class DescribedMethods:
    """`core.describe_action()`, `core.describe_event()`, `core.actions_of()` and `core.events_of()`."""

    def describe_action(self, cls: type, name: str, description: dict[str, Any]) -> None:
        """Describe class `cls`'s action `name`, its method's name, e.g. `turn_over` for `to turn it over`.

        - What compiled spell writes after the class, for an action with any of its description's lines.
        - Again for the same name, e.g. a sub-class's:  the new description, whole.
        """
        _ACTIONS.setdefault(cls, {})[name] = description

    def describe_event(self, cls: type, name: str, description: dict[str, Any]) -> None:
        """Describe an event class `cls`'s things send, e.g. `flipped` with its `side`."""
        _EVENTS.setdefault(cls, {})[name] = description

    def actions_of(self, cls: type) -> dict[str, dict[str, Any]]:
        """Every action class `cls` describes, its own and its super-classes', by method name:  its own win."""
        return _described_by(_ACTIONS, cls)

    def events_of(self, cls: type) -> dict[str, dict[str, Any]]:
        """Every event class `cls`'s things send, its own and its super-classes', by name:  its own win."""
        return _described_by(_EVENTS, cls)


def _described_by(store: "WeakKeyDictionary[type, dict[str, dict[str, Any]]]", cls: type) -> dict[str, dict[str, Any]]:
    """`cls`'s descriptions in `store`, its super-classes' first, so its own win."""
    described: dict[str, dict[str, Any]] = {}
    for each in reversed(cls.__mro__):
        described.update(store.get(each, {}))
    return described
