"""`core.send()`:  an event up a thing's chain, and a property's change -- the twin of `tests/core/sending.test.ts`."""

import asyncio
from typing import Any

from spell_core import List, SentEvent, Thing, core, prop


class Card(Thing):
    """A card that says what it hears."""

    flips = prop(default=0)

    def __init__(self, **props: Any) -> None:
        self.heard: list[object] = []
        super().__init__(**props)

    def on_flipped(self, event: SentEvent) -> None:
        self.heard.append(("flipped", event.target, event.original_target, event.sender, event.side))

    def on_picked(self, event: SentEvent) -> SentEvent:
        self.heard.append("picked")
        return event.pass_()

    def on_closing(self, event: SentEvent) -> None:
        event.cancel()

    def on_flips_change(self, event: SentEvent) -> None:
        self.heard.append(("change", event.was, event.value, event.sender))

    async def on_slow(self, event: SentEvent) -> None:
        await asyncio.sleep(0)
        self.heard.append("slow")

    def on_broken(self, event: SentEvent) -> None:
        raise ValueError("broken")


class Pile(List):
    """A list holding cards, which says what it hears."""

    exclusive = True

    def __init__(self, *args: Any, **props: Any) -> None:
        self.heard: list[object] = []
        super().__init__(*args, **props)

    def on_flipped(self, event: SentEvent) -> None:
        self.heard.append("flipped")

    def on_picked(self, event: SentEvent) -> None:
        self.heard.append(("picked", event.target, event.original_target))


def test_the_target_takes_it_and_its_holder_never_hears():
    pile, card = Pile(), Card()
    pile.append(card)
    sender = Card()
    core.send(card, "flipped", {"side": "up"}, sender)
    assert card.heard == [("flipped", card, card, sender, "up")]
    assert pile.heard == []


def test_pass_hands_it_up_at_once():
    pile, card = Pile(), Card()
    pile.append(card)
    core.send(card, "picked")
    assert pile.heard == [("picked", pile, card)]


def test_nobody_takes_it():
    heard: list[str] = []
    core.on("lonely", lambda event: heard.append(event.type))
    core.send(Card(), "lonely")
    assert heard == ["lonely"]
    assert core.send(Card(), "nobody-listens").handled is False


def test_cancel_marks_it():
    assert core.send(Card(), "closing").canceled is True


def test_a_handler_is_found_by_on_or_when():
    class Door(Thing):
        def when_card_flipped(self) -> None:
            self.flipped = True

    door = Door()
    assert core.send(door, "Card Flipped").handled is True
    assert door.flipped is True


def test_a_failing_handler_is_said_and_taken():
    assert core.send(Card(), "broken").handled is True


def test_a_handler_that_waits_runs_to_its_end_with_no_loop():
    card = Card()
    core.send(card, "slow")
    assert card.heard == ["slow"]


def test_await_waits_for_a_handler_that_waits():
    card = Card()

    async def sends() -> SentEvent:
        return await core.send(card, "slow")

    assert asyncio.run(sends()).type == "slow"
    assert card.heard == ["slow"]


def test_a_change_is_heard_after_the_step_and_never_for_starting_values():
    card = Card(flips=1)
    card.flips = 2
    card.flips = 2
    card.flips = 3
    assert card.heard == []
    core.send_waiting_changes()
    assert card.heard == [("change", 1, 2, card), ("change", 2, 3, card)]
