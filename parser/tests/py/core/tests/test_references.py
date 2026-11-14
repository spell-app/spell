"""Thing references (`references.py`):  `Tableau#T1` by name, `Tableau#1` by place, and back again."""

from spell_core import List, Thing, prop
from spell_core.references import is_reference, reference_for, thing_for_reference


class RefCard(Thing):
    rank = prop()
    suit = prop()

    @property
    def name(self) -> str:
        """A card's worked-out name, as Solitaire's:  `queen-of-spades`."""
        return f"{self.rank}-of-{self.suit}"


class RefPile(List):
    name = prop()


class RefTableau(RefPile):
    pass


class RefGame(Thing):
    pass


queen = RefCard(rank="queen", suit="spades")
ace = RefCard(rank="ace", suit="hearts")
stock = RefPile(name="stock")
first = RefTableau(name="T1")
second = RefTableau(name="T2")
unnamed = RefTableau()
game = RefGame()
THINGS = [queen, ace, stock, first, second, unnamed, game]
KEPT = {"game": game, "stock": stock}


def test_by_name_a_sub_types_thing_too() -> None:
    assert thing_for_reference("RefTableau#T1", THINGS, KEPT) is first
    assert thing_for_reference("RefPile#T1", THINGS, KEPT) is first
    assert thing_for_reference("RefCard#queen-of-spades", THINGS, KEPT) is queen
    assert thing_for_reference("RefCard#king-of-clubs", THINGS, KEPT) is None


def test_by_place_of_the_type_exactly_counting_from_1() -> None:
    assert thing_for_reference("RefTableau#1", THINGS, KEPT) is first
    assert thing_for_reference("RefTableau#3", THINGS, KEPT) is unnamed
    assert thing_for_reference("RefTableau#4", THINGS, KEPT) is None
    # a tableau is a pile, but a place counts piles of that type only:  the stock is the first pile
    assert thing_for_reference("RefPile#1", THINGS, KEPT) is stock


def test_a_thing_kept_at_the_top_level_by_its_name() -> None:
    assert thing_for_reference("RefGame#game", THINGS, KEPT) is game


def test_a_chosen_id_after_names() -> None:
    # `"T7" is a new tableau` compiles so (Owen, 2026-11-12):  found by its id while nothing is named T7
    seventh = RefTableau(id="T7")
    shadow = RefTableau(id="T1")
    made_up = RefTableau()
    things = [*THINGS, seventh, shadow, made_up]
    assert thing_for_reference("RefTableau#T7", things, KEPT) is seventh
    assert thing_for_reference("RefPile#T7", things, KEPT) is seventh
    assert reference_for(seventh, things, KEPT) == "RefTableau#T7"
    # a name wins:  the tableau NAMED T1, not the one whose id is T1
    assert thing_for_reference("RefTableau#T1", things, KEPT) is first
    # a made-up id is no name
    assert thing_for_reference(f"RefTableau#{made_up.id}", things, KEPT) is None


def test_not_a_reference() -> None:
    assert thing_for_reference("Nope#1", THINGS, KEPT) is None
    assert thing_for_reference("queen of spades", THINGS, KEPT) is None
    assert is_reference("RefCard#3") and not is_reference("card 3") and not is_reference(3)


def test_reference_for_finds_the_thing_again() -> None:
    assert reference_for(first, THINGS, KEPT) == "RefTableau#T1"
    assert reference_for(queen, THINGS, KEPT) == "RefCard#queen-of-spades"
    assert reference_for(game, THINGS, KEPT) == "RefGame#game"
    # no name of its own:  its place
    assert reference_for(unnamed, THINGS, KEPT) == "RefTableau#3"
    assert reference_for("queen", THINGS, KEPT) is None
    for thing in THINGS:
        assert thing_for_reference(reference_for(thing, THINGS, KEPT) or "", THINGS, KEPT) is thing


def test_is_in_a_any_list_of_the_type_sub_types_too() -> None:
    """`the card is in a tableau`:  `core.is_in_a(card, RefTableau)` (epic `language` P55)."""
    from spell_core import core

    held = RefCard(rank="2", suit="clubs")
    loose = RefCard(rank="3", suit="clubs")
    tableau = RefTableau(name="held")
    tableau.append(held)
    assert core.is_in_a(held, RefTableau) and core.is_in_a(held, RefPile)
    assert not core.is_in_a(loose, RefTableau)
