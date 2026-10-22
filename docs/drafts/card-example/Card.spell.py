from __future__ import annotations

from typing import Any

from spell_core import Drawable, prop


class Card(Drawable):
    # - its "suit" is one of clubs, diamonds, hearts or spades
    SUITS = ("clubs", "diamonds", "hearts", "spades")
    suit = prop(one_of=SUITS)

    @property
    def color(self) -> Any:
        if self.suit in ["diamonds", "hearts"]:
            return "red"
        return "black"

    # - its "rank" is one of ace, 2 ... 10, jack, queen, king
    RANKS = ("ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jack", "queen", "king")
    rank = prop(one_of=RANKS)

    @property
    def is_a_face_card(self) -> bool:
        return self.rank in ["jack", "queen", "king"]

    def is_a_rank(self, rank: Any) -> bool:
        return self.rank == rank

    def is_the_rank_of_suit(self, rank: Any, suit: Any) -> bool:
        return self.rank == rank and self.suit == suit
