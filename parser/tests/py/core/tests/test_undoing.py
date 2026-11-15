"""Undo and redo in a running program (`undoing.py`):  a card game, written the way compiled spell writes it.

- `undoing.expected.json5`, with the JavaScript core's tests (`tests/core/`), holds a game's moves and what each
  leaves:  the JavaScript core's `undoing.test.ts` plays the same game and reads the same file, so the two cores agree.
- Its actions are described as compiled spell describes them, `core.describe_action(..., {"undone_as": ...})`.
"""

import asyncio
import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest

from spell_core import App, List, Loader, StateMirror, StateWriter, Thing, core, prop
from spell_core.page import PageSession
from spell_core.state import HISTORY_KEY

EXPECTED = json.loads((Path(__file__).parents[3] / "core" / "undoing.expected.json5").read_text(encoding="utf-8"))


################
# ## The game
################


class Card(Thing):
    """`a card is a thing`:  its rank, and which way up it is."""

    rank = prop(type="text")
    face_up = prop(type="choice")

    def turn_over(self) -> None:
        """`to turn it over`, `undoable as "Turn Card"`."""
        self.face_up = not self.face_up


core.describe_action(Card, "turn_over", {"title": "Turn It Over", "undone_as": "Turn Card"})


class Pile(List):
    """`a pile is a list of cards` + `a card belongs to one pile`."""

    item_type = Card
    exclusive = True


class Game(App):
    """`a game is an app`, with a stock, a waste and a count of moves."""

    stock = prop(type="Pile", init=Pile)
    waste = prop(type="Pile", init=Pile)
    moves = prop(type="number")

    async def deal(self, count: int) -> None:
        """Turn `count` cards from the stock onto the waste, one at a time, waiting before each."""
        for _ in range(count):
            await asyncio.sleep(0)
            card = self.stock[-1]
            self.waste.append(card)
            card.turn_over()
            self.moves += 1

    def hint(self) -> None:
        """Count a hint as a move:  no action, so no step."""
        self.moves += 10


core.describe_action(Game, "deal", {"title": "Deal", "undone_as": "Deal"})


@pytest.fixture
def game() -> Iterator[Game]:
    """A new run's game:  three cards in its stock, face down."""
    core.reset_runtime()
    made = Game()
    made.stock.items = [Card(rank=rank) for rank in ("ace", "two", "three")]
    try:
        yield made
    finally:
        core.use_messages(None)
        core.reset_runtime()


def cards_of(game: Game) -> list[Card]:
    """The game's cards, ace, two, three, wherever they are."""
    every = [*game.stock, *game.waste]
    return [next(card for card in every if card.rank == rank) for rank in ("ace", "two", "three")]


################
# ## The moves both cores play
################


def test_each_move_leaves_the_steps_the_edit_menu_and_the_cards_as_the_file_says(game: Game) -> None:
    cards = cards_of(game)
    by_rank = {card.rank: card for card in cards}
    for move in EXPECTED["moves"]:
        returned: bool | None = None
        if move["do"] == "turn":
            by_rank[move["card"]].turn_over()
        elif move["do"] == "deal":
            asyncio.run(game.deal(move["count"]))
        elif move["do"] == "undo":
            returned = game.undo()
        elif move["do"] == "redo":
            returned = game.redo()
        else:  # move["do"] == "write"
            by_rank[move["card"]].face_up = not by_rank[move["card"]].face_up
        after: dict[str, Any] = {} if returned is None else {"returned": returned}
        after |= {
            "steps": [step.title for step in core.RUNTIME.history.steps],
            "canUndo": game.can_undo,
            "canRedo": game.can_redo,
            "undoTitle": game.undo_title,
            "redoTitle": game.redo_title,
            "stock": [card.rank for card in game.stock],
            "waste": [card.rank for card in game.waste],
            "faceUp": [card.face_up for card in cards],
            "moves": game.moves,
        }
        assert after == move["after"], f"after {move['do']} {move.get('card') or move.get('count') or ''}"


################
# ## Python's own
################


def test_an_undone_deal_puts_each_card_back_in_its_pile(game: Game) -> None:
    asyncio.run(game.deal(3))
    game.undo()
    assert all(Pile.owner_of(card) is game.stock for card in cards_of(game))
    game.redo()
    assert all(Pile.owner_of(card) is game.waste for card in cards_of(game))


def test_a_step_keeps_one_record_for_each_prop_and_each_list_however_often_it_changed(game: Game) -> None:
    asyncio.run(game.deal(3))
    # three cards' face_up and last pile, the moves, the stock and the waste
    assert len(core.RUNTIME.history.steps[0].records) == 9


def test_nothing_undoes_while_an_undoable_action_still_runs(game: Game) -> None:
    async def undo_mid_deal() -> bool:
        dealing = asyncio.ensure_future(game.deal(2))
        await asyncio.sleep(0)
        refused = game.undo()
        await dealing
        return refused

    cards_of(game)[0].turn_over()
    assert asyncio.run(undo_mid_deal()) is False
    assert [step.title for step in core.RUNTIME.history.steps] == ["Turn Card", "Deal"]


# the deal it closes unawaited says so:  that's the point
@pytest.mark.filterwarnings("ignore:coroutine .* was never awaited")
def test_an_action_that_waits_opens_its_step_as_it_starts_so_one_never_awaited_leaves_none_open(game: Game) -> None:
    dealing = game.deal(1)
    assert not core.RUNTIME.history.is_in_transaction
    dealing.close()
    cards_of(game)[0].turn_over()
    assert [step.title for step in core.RUNTIME.history.steps] == ["Turn Card"]


def test_a_plain_write_and_a_method_not_described_undoable_are_no_step(game: Game) -> None:
    game.hint()
    cards_of(game)[0].face_up = True
    assert not game.can_undo


def test_an_action_that_throws_is_still_a_step_and_the_error_passes_on(game: Game) -> None:
    class Joker(Card):
        def wink(self) -> None:
            self.face_up = True
            raise ValueError("winked")

    core.describe_action(Joker, "wink", {"title": "Wink", "undone_as": "Wink"})
    with pytest.raises(ValueError, match="winked"):
        Joker(rank="joker").wink()
    assert game.undo_title == "Undo Wink"


def test_a_sub_class_describing_an_action_again_doesnt_wrap_it_twice(game: Game) -> None:
    class Joker(Card):
        pass

    core.describe_action(Joker, "turn_over", {"title": "Turn It Over", "undone_as": "Turn Card"})
    assert Joker.turn_over is Card.turn_over


def test_titles_in_the_programs_language(game: Game) -> None:
    core.use_messages({"undo-step": "Deshacer {step}", "redo": "Rehacer"})
    cards_of(game)[0].turn_over()
    assert [game.undo_title, game.redo_title] == ["Deshacer Turn Card", "Rehacer"]


def test_a_new_run_and_loading_saved_state_forget_it(game: Game) -> None:
    cards_of(game)[0].turn_over()
    core.from_json({"$type": "Card", "rank": "king"})
    assert not game.can_undo
    cards_of(game)[0].turn_over()
    Loader(entry_for={"Card#king": {"$type": "Card", "rank": "king"}}.get).load("Card#king")
    assert not game.can_undo
    cards_of(game)[0].turn_over()
    core.reset_runtime()
    assert not core.RUNTIME.history.can_undo


################
# ## On a page
################


def test_a_page_is_sent_the_apps_history_and_the_app_again_as_it_changes(game: Game) -> None:
    session = PageSession({"game": game})
    state = session.state()
    assert state["game"][HISTORY_KEY] == {
        "can_undo": False,
        "can_redo": False,
        "undo_title": "Undo",
        "redo_title": "Redo",
    }
    stock = state["game"]["stock"]["$id"]
    top = state["game"]["stock"]["$items"][-1]["$id"]
    patch = session.handle({"call": "turn_over", "on": {"$id": top}, "args": []})
    shown = next(thing for thing in patch if thing["$type"] == "Game")[HISTORY_KEY]
    assert [shown["can_undo"], shown["undo_title"]] == [True, "Undo Turn Card"]
    patch = session.handle({"call": "undo", "on": {"$id": state["game"]["$id"]}, "args": []})
    shown = next(thing for thing in patch if thing["$type"] == "Game")[HISTORY_KEY]
    assert [shown["can_undo"], shown["can_redo"], shown["redo_title"]] == [False, True, "Redo Turn Card"]
    assert stock not in [thing["$id"] for thing in patch]


def test_a_mirror_reads_past_the_history(game: Game) -> None:
    mirrored = StateMirror().read(StateWriter().state_of(game))
    assert HISTORY_KEY not in mirrored._props


def test_undo_waits_no_turn_while_an_action_runs(game: Game) -> None:
    async def undo_mid_deal() -> None:
        session = PageSession({"game": game})
        state = session.state()
        game_ref = {"$id": state["game"]["$id"]}
        cards_of(game)[0].turn_over()
        session.enter({"call": "deal", "on": game_ref, "args": [2]})
        await asyncio.sleep(0)
        session.enter({"call": "undo", "on": game_ref, "args": []})
        assert core.RUNTIME.actions.waiting is None
        while core.RUNTIME.actions.is_busy:
            await asyncio.sleep(0)

    asyncio.run(undo_mid_deal())
    assert [step.title for step in core.RUNTIME.history.steps] == ["Turn Card", "Deal"]


def test_an_action_that_cant_be_undone_records_nothing_and_keeps_the_steps_before(game: Game) -> None:
    """`to peek, can't be undone`:  `"cant_be_undone": "keeps history"` (epic `language` P55, Q60)."""

    class Peeker(Card):
        def peek(self) -> None:
            self.face_up = True

    core.describe_action(Peeker, "peek", {"title": "Peek", "cant_be_undone": "keeps history"})
    cards_of(game)[0].turn_over()
    Peeker(rank="joker").peek()
    assert game.undo_title == "Undo Turn Card"


################
# ## Top-level actions
################


def test_a_top_level_action_is_one_step_and_one_it_calls_joins_it(game: Game) -> None:
    """`to turn every card over` outside any type:  `@core.as_action({...})` above its `def` (epic `language` J149)."""

    @core.as_action({"undone_as": "Turn Every Card Over"})
    def turn_every_card_over() -> None:
        for card in cards_of(game):
            card.turn_over()

    @core.as_action({"undone_as": "Count The Cards"})
    def count_the_cards() -> int:
        turn_every_card_over()
        return len(cards_of(game))

    assert turn_every_card_over.__name__ == "turn_every_card_over"
    turn_every_card_over()
    assert [step.title for step in core.RUNTIME.history.steps] == ["Turn Every Card Over"]
    # one giving back a value is an action too:  what it calls joins its step
    assert count_the_cards() == 3
    assert [step.title for step in core.RUNTIME.history.steps] == ["Turn Every Card Over", "Count The Cards"]
    game.undo()
    assert [card.face_up for card in cards_of(game)] == [True, True, True]


def test_a_top_level_action_that_cant_be_undone_records_nothing(game: Game) -> None:
    """`to peek at every card, can't be undone`:  `"cant_be_undone": "keeps history"`."""

    @core.as_action({"cant_be_undone": "keeps history"})
    def peek_at_every_card() -> None:
        for card in cards_of(game):
            card.face_up = True

    cards_of(game)[0].turn_over()
    peek_at_every_card()
    assert game.undo_title == "Undo Turn Card"


def test_a_top_level_action_that_waits_is_one_step(game: Game) -> None:
    """`to deal twice`, which waits:  ONE step, however long it waits."""

    @core.as_action({"undone_as": "Deal Twice"})
    async def deal_twice() -> None:
        await game.deal(1)
        await game.deal(1)

    asyncio.run(deal_twice())
    assert [step.title for step in core.RUNTIME.history.steps] == ["Deal Twice"]


################
# ## Actions that cancel, after hooks, a thing's last list (epic `language` P56)
################


class Mover(Thing):
    """`to put a card on a pile`, `cancel if ...`;  its hook, `after putting a card on a pile`, from another file."""

    def put_on_pile(self, card: Card, pile: Pile, refused: str | None = None) -> Any:
        """Put `card` on `pile`, turned over;  called off `"after"` the move, or `"in a hook"`."""
        pile.append(card)
        card.turn_over()
        if refused == "after":
            core.cancel()

    def after_put_on_pile(self, card: Card, _pile: Pile, refused: str | None = None) -> None:
        """Count the move."""
        game = core.RUNTIME.app
        game.moves += 1  # type: ignore[union-attr]
        if refused == "in a hook":
            core.cancel()

    def play(self, card: Card, pile: Pile) -> Any:
        """`to play a card`:  it gives back what the move answered."""
        core.RUNTIME.app.moves += 100  # type: ignore[union-attr]
        return self.put_on_pile(card, pile, "after")


core.describe_action(Mover, "put_on_pile", {"title": "Put", "undone_as": "Move Card", "cancels": True})
core.describe_action(Mover, "play", {"title": "Play", "undone_as": "Play Card"})
core.add_after_hook(Mover, "put_on_pile", {"hook": "after_put_on_pile"})


def test_done_it_answers_yes_and_its_hook_runs_in_its_step(game: Game) -> None:
    three = cards_of(game)[2]
    assert Mover().put_on_pile(three, game.waste) is True
    assert (list(game.waste), game.moves) == ([three], 1)
    assert [step.title for step in core.RUNTIME.history.steps] == ["Move Card"]
    game.undo()
    assert (len(game.waste), three.face_up, game.moves) == (0, False, 0)


def test_called_off_every_change_goes_back_no_step_no_hook_and_it_answers_no(game: Game) -> None:
    three = cards_of(game)[2]
    assert Mover().put_on_pile(three, game.waste, "after") is False
    assert (len(game.waste), three.face_up, game.moves, game.can_undo) == (0, False, 0, False)


def test_called_off_in_its_hook_the_actions_changes_go_back_too(game: Game) -> None:
    three = cards_of(game)[2]
    assert Mover().put_on_pile(three, game.waste, "in a hook") is False
    assert (len(game.waste), three.face_up, game.moves, game.can_undo) == (0, False, 0, False)


def test_called_off_inside_another_action_only_its_own_changes_go_back(game: Game) -> None:
    three = cards_of(game)[2]
    assert Mover().play(three, game.waste) is False
    assert (len(game.waste), three.face_up, game.moves) == (0, False, 100)
    assert [step.title for step in core.RUNTIME.history.steps] == ["Play Card"]


def test_a_card_remembers_the_pile_it_left_and_undo_puts_that_back(game: Game) -> None:
    three = cards_of(game)[2]
    assert Pile.last_owner_of(three) is None
    Mover().put_on_pile(three, game.waste)
    assert Pile.last_owner_of(three) is game.stock
    game.undo()
    assert (Pile.owner_of(three), Pile.last_owner_of(three)) == (game.stock, None)
    game.redo()
    assert (Pile.owner_of(three), Pile.last_owner_of(three)) == (game.waste, game.stock)
    assert Mover().put_on_pile(three, game.stock, "after") is False
    assert (Pile.owner_of(three), Pile.last_owner_of(three)) == (game.waste, game.stock)
