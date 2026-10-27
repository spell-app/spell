"""`core.describe_action()` / `core.describe_event()` (epic elemental-spell, P5):  read back with `actions_of()`.

- The twin of the JavaScript core's `described.test.ts`.
"""

from spell_core import Thing, core


def test_an_action_s_description_read_back_by_its_method_s_name() -> None:
    """What `- to turn it over:` with `- shortcut meta+T` compiles to, read back."""

    class Card(Thing):
        pass

    core.describe_action(Card, "turn_over", {"title": "turn it over", "shortcuts": ["meta+T"]})
    assert core.actions_of(Card)["turn_over"] == {"title": "turn it over", "shortcuts": ["meta+T"]}


def test_a_sub_class_has_its_super_class_s_actions_and_its_own_win() -> None:
    """A joker has a card's actions, and may describe one again."""

    class Card(Thing):
        pass

    class WildCard(Card):
        pass

    core.describe_action(Card, "turn_over", {"title": "turn it over"})
    core.describe_action(Card, "show", {"title": "show it"})
    core.describe_action(WildCard, "turn_over", {"title": "flip the joker"})
    assert list(core.actions_of(WildCard)) == ["turn_over", "show"]
    assert core.actions_of(WildCard)["turn_over"] == {"title": "flip the joker"}
    assert core.actions_of(Card)["turn_over"] == {"title": "turn it over"}


def test_an_event_a_template_s_things_send() -> None:
    """What `- it sends "flipped" with side as a direction` compiles to."""

    class Card(Thing):
        pass

    core.describe_event(Card, "flipped", {"params": {"side": "Direction"}})
    assert core.events_of(Card) == {"flipped": {"params": {"side": "Direction"}}}
    assert core.actions_of(Card) == {}
