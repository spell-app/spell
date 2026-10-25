"""What a program's templates say about themselves, beyond their code (epic elemental-spell, P5).

```python
core.describe_action(Card, "turn_over", {"title": "turn it over", "shortcuts": ["meta+T"]})
core.actions_of(Card)["turn_over"]["shortcuts"]  # ["meta+T"]
```

- The twin of the JavaScript core's `described.ts`.
- Each action's description:  its title, shortcuts, when it's enabled or selected (a getter's name), its undo's name.
- Each event a template sends, with its parameters.
- Each menu of a template's actions:  its items' method names, `-` a line between groups (P10).
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

# Each class's own menus, by name (epic elemental-spell P10)
_MENUS: "WeakKeyDictionary[type, dict[str, dict[str, Any]]]" = WeakKeyDictionary()


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

    def describe_menu(self, cls: type, name: str, description: dict[str, Any]) -> None:
        """Describe class `cls`'s menu `name`, e.g. `game_menu`:  `{"items": ["deal", "-", "undo"]}`."""
        _MENUS.setdefault(cls, {})[name] = description

    def menus_of(self, cls: type) -> dict[str, dict[str, Any]]:
        """Every menu class `cls` describes, its own and its super-classes', by name:  its own win."""
        return _described_by(_MENUS, cls)


def _described_by(store: "WeakKeyDictionary[type, dict[str, dict[str, Any]]]", cls: type) -> dict[str, dict[str, Any]]:
    """`cls`'s descriptions in `store`, its super-classes' first, so its own win."""
    described: dict[str, dict[str, Any]] = {}
    for each in reversed(cls.__mro__):
        described.update(store.get(each, {}))
    return described
