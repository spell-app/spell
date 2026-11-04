from __future__ import annotations

import asyncio
from typing import Any

from spell_core import core, Thing, List, prop, SentEvent


# Events sent to things, which every target must deliver alike


class Card(Thing):
    # - its "name" is text
    name = prop(type="text")

    # - its "flips" is a number
    flips = prop(type="number")

    # - its "locked" is a choice
    locked = prop(type="choice")

    def create(self) -> None:
        self.flips = 0

    def flip(self) -> None:
        self.flips = self.flips + 1
        core.send(self, "flipped", {"side": "up"}, self)
        print(f"{self.name} flipped")

    def on_flipped(self, event: FlippedEvent) -> None:
        """taken here:  its pile never hears it"""
        side = event.side
        print(f"{self.name} heard flipped {side}")

    def on_picked(self, event: PickedEvent) -> Any:
        """handed on up:  its pile hears it too"""
        print(f"{self.name} heard picked")
        return event.pass_()

    def on_flips_change(self, event: FlipsChangeEvent) -> None:
        print(f"{self.name} has flipped {self.flips} times")

    async def on_slowly_flipped(self, event: SlowlyFlippedEvent) -> None:
        """a handler that waits:  what sends it waits for it"""
        await core.pause_for(10, "msec")
        print(f"{self.name} slowly flipped")

    async def flip_slowly(self) -> None:
        await core.send(self, "slowly-flipped", {}, self)
        print(f"{self.name} done slowly")

    async def close(self) -> None:
        """an event still happening can be canceled:  the step after it doesn't run"""
        if (core.send(self, "closing", {}, self)).canceled:
            return
        print(f"{self.name} closed")

    def on_closing(self, event: ClosingEvent) -> None:
        if self.locked:
            print(f"{self.name} won't close")
            event.cancel()

    @property
    def pile(self) -> Pile | None:
        return Pile.owner_of(self)


class Pile(List):
    item_type = Card

    def on_picked(self, event: PickedEvent) -> Any:
        print("the pile heard picked")
        return event.pass_()

    def on_flipped(self, event: FlippedEvent) -> None:
        side = event.side
        print("the pile heard flipped")

    exclusive = True


# - it sends "flipped" with side as a text
core.describe_event(Card, "flipped", {"params": {"side": "text"}})



@core.on("picked")
def on_picked(event: Any) -> None:
    print("the program heard picked")


@core.on("lonely")
def on_lonely(event: Any) -> None:
    print("the program heard lonely")


async def play_the_story() -> None:
    it = Pile()
    pile = it
    it_2 = Card(name="ace")
    ace = it_2
    pile.append(it_2)
    it_3 = Card(name="king", locked=True)
    king = it_3

    await ace.close()
    await king.close()
    core.send(ace, "picked")
    core.send(ace, "lonely")
    core.send(ace, "nobody-listens")
    ace.flip()
    await ace.flip_slowly()
    print("the end")


asyncio.run(play_the_story())


# what each event this program hears holds
PickedEvent = SentEvent
SlowlyFlippedEvent = SentEvent
ClosingEvent = SentEvent


class FlippedEvent(SentEvent):
    side: str


class FlipsChangeEvent(SentEvent):
    value: float
    was: float

