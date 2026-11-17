from __future__ import annotations

from typing import Any, Literal

from spell_core import core, List, App, View, TwoSidedView, ViewableList, prop, h, position, spell_position, Element, SentEvent


# A card says what its rank, suit and color are:  a deck, a pile or the game only reads them.
# A playing card


Rank = Literal["ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jack", "queen", "king"]
Suit = Literal["clubs", "diamonds", "hearts", "spades"]


class Card(TwoSidedView):
    element_tag = "test-project-card"

    # - its "rank" is one of ace, 2 ... 10, jack, queen, king
    RANKS = ("ace", 2, 3, 4, 5, 6, 7, 8, 9, 10, "jack", "queen", "king")
    rank = prop(one_of=RANKS)

    # - its "suit" is one of clubs, diamonds, hearts or spades
    SUITS = ("clubs", "diamonds", "hearts", "spades")
    suit = prop(one_of=SUITS)

    # - its "color" is one of red, black
    #   red if it is a diamond or it is a heart
    #   black otherwise
    COLORS = ("red", "black")

    @property
    def color(self) -> str:
        if self.suit == "diamonds" or self.suit == "hearts":
            return "red"
        return "black"

    @property
    def is_a_face_card(self) -> bool:
        """e.g. "the card is a face card\""""
        return self.rank in ["jack", "queen", "king"]

    @property
    def is_a_number_card(self) -> bool:
        return not self.is_a_face_card

    def is_the_rank_of_suit(self, rank: Rank, suit: Suit) -> bool:
        """e.g. the card is the two of spades"""
        return self.rank == rank and self.suit == suit

    @property
    def name(self) -> str:
        return core.joined(core.joined(self.rank, "of", " "), self.suit, " ")

    @property
    def value(self) -> float:
        return spell_position(core.position_of(Card.RANKS, self.rank))

    @property
    def symbol(self) -> str:
        if self.suit == "clubs":
            return "♣"
        if self.suit == "diamonds":
            return "♦"
        if self.suit == "hearts":
            return "♥"
        return "♠"

    @property
    def short_name(self) -> str:
        """Its short name:  Q♠↓ is the queen of spades, face down"""
        letter = 10 if self.value == 10 else core.upper_case(core.get_item_at(self.rank, 0))
        arrow = "↑" if self.is_face_direction("up") else "↓"
        return f"{letter}{self.symbol}{arrow}"

    def draw_front(self) -> Element:
        return h("test-project-card-image", {"prop:card": self, "part": "front"})

    def draw_back(self) -> Element:
        return h("test-project-card-image", {"direction": "down", "part": "back"})

    def move_to_pile(self, pile: Pile) -> None:
        """The card, and every card on it, onto the pile, if the piles' rules let it go and take it"""
        # - refused, nothing moves, and there's nothing to undo
        # - a game adds its own steps after it:  `after moving a card to a pile`
        assert self.pile is not None
        if (not core.can_give_up(self.pile, self)) or (not core.can_take(pile, self)):
            core.cancel()
        for card in self.pile.starting_with(self):
            pile.append(card)

    @property
    def is_on_top_of_its_pile(self) -> bool:
        """the card the next one goes on"""
        assert self.pile is not None
        return self == self.pile.last_item

    @property
    def can_go_up(self) -> bool:
        """onto its foundation:  a column's top card"""
        return self.is_on_top_of_its_pile and isinstance(core.filter(core.every_thing(Pile), lambda pile: core.can_take(pile, self)).first_item, Foundation)

    @property
    def can_move_its_run(self) -> bool:
        """it and the face-up cards on it, all together, onto another column:  a king already at the bottom stays put"""
        assert self.pile is not None
        return (self.rank != "king" or self != self.pile.first_item) and self == self.pile.filter(lambda card: card.is_face_direction("up")).first_item

    async def play(self) -> Any:
        if self.pile == solitaire.stock:
            await solitaire.turn_over_the_next_card()
        else:
            end_pile = core.filter(core.every_thing(Pile), lambda pile: core.can_take(pile, self)).first_item
            if end_pile is None:
                return False
            return self.move_to_pile(end_pile)

    def after_move_to_pile(self, pile: Pile) -> None:
        """The move scores;  the column it left turns its new last card face up"""
        solitaire.score = solitaire.score + self.the_points_for_card_on_pile(pile)
        it_2 = self.last_pile
        if isinstance(it_2, Column) and (it_2):
            it_2.last_item.turn_face_up()

    def the_points_for_card_on_pile(self, pile: Pile) -> float:
        """What a move scores:  10 onto a foundation, 5 from the discard pile, else nothing"""
        if isinstance(pile, Foundation):
            return 10
        if self.last_pile == solitaire.discard_pile:
            return 5
        return 0

    async def on_click(self, event: ClickEvent) -> None:
        if self.is_face_direction("up") or self.pile == solitaire.stock:
            await self.play()

    draggable = True

    @property
    def pile(self) -> Pile | None:
        """a card is in one pile at a time:  moving it to another pile takes it off this one"""
        return Pile.owner_of(self)

    @property
    def last_pile(self) -> Any:
        return Pile.last_owner_of(self)


core.describe_action(Card, "move_to_pile", {"title": "Move Card to Pile", "cancels": True, "undone_as": "Move Card to Pile"})
core.add_after_hook(Card, "move_to_pile", {"hook": "after_move_to_pile"})
core.describe_action(Card, "the_points_for_card_on_pile", {"title": "The Points for Card on Pile", "undone_as": "The Points for Card on Pile"})
# It's a two sided view:  each side is a card image (below):  face up its own, face down the back every card shares.
# On the page each card is its own element, `<solitaire-card>`:  people may drag it (`draggable`), when its pile lets it go.
# Ace is low:  ace = 1 ... king = 13

# Spell for identifying cards

# identifying a card

# Give it a card to draw, or a rank and a suit:  `<card-image card={the card} />`, `<card-image rank=ace suit={its suit} />`.
# A card's picture:  the one place a card's look lives


Direction = Literal["up", "down"]


class CardImage(View):
    element_tag = "test-project-card-image"

    # It's face up, unless it's `direction=down`:  then it's the back every card shares.
    # Today it's one letter of unicode's Playing Cards, at the size of the text around it:  its pile scales it to fit -- styles.css
    # Real pictures of the cards can take its place:  only its picture and `to draw it` change.
    # the card it draws
    # - its "card" is a card
    card = prop(type="Card")

    # - its "rank" is a card rank
    rank = prop(one_of=lambda: Card.RANKS)

    # - its "suit" is a card suit
    suit = prop(one_of=lambda: Card.SUITS)

    # - its "direction" is up or down
    DIRECTIONS = ("up", "down")
    direction = prop(one_of=DIRECTIONS)

    def is_face_direction(self, direction: Direction) -> bool:
        return self.direction == direction

    async def create(self) -> None:
        """given a card:  its rank and suit are the card's;  given a rank and a suit:  its card is a new one of them (its back needs none)"""
        if self.card is not None:
            self.rank = self.card.rank
            self.suit = self.card.suit
        elif not self.is_face_direction("down"):
            self.card = Card(rank=self.rank, suit=self.suit)

    @property
    def color(self) -> str | None:
        if self.is_face_direction("down"):
            return "blue"
        return getattr(self.card, "color", None)

    @property
    def picture(self) -> str | None:
        """draw the unicode character for card images"""
        # see https://www.compart.com/en/unicode/block/U+1F0A0
        if self.is_face_direction("down"):
            return "🂠"
        column = getattr(self.card, "value", None)
        if getattr(self.card, "suit", None) == "clubs":
            return core.get_item_at(
                ["🃑", "🃒", "🃓", "🃔", "🃕", "🃖", "🃗", "🃘", "🃙", "🃚", "🃛", "🃝", "🃞"],
                position(column),
            )
        if getattr(self.card, "suit", None) == "diamonds":
            return core.get_item_at(
                ["🃁", "🃂", "🃃", "🃄", "🃅", "🃆", "🃇", "🃈", "🃉", "🃊", "🃋", "🃍", "🃎"],
                position(column),
            )
        if getattr(self.card, "suit", None) == "hearts":
            return core.get_item_at(
                ["🂱", "🂲", "🂳", "🂴", "🂵", "🂶", "🂷", "🂸", "🂹", "🂺", "🂻", "🂽", "🂾"],
                position(column),
            )
        return core.get_item_at(
            ["🂡", "🂢", "🂣", "🂤", "🂥", "🂦", "🂧", "🂨", "🂩", "🂪", "🂫", "🂭", "🂮"],
            position(column),
        )

    def draw(self) -> Element:
        return h("ui-text", {"color": self.color}, self.picture)


def test_card_setup() -> None:
    with core.test("test card setup"):
        it = Card()
        core.echo_test_action(
            "get a new card whose rank is queen, suit is spades and direction is down",
        )
        it_2 = Card(rank="queen", suit="spades", direction="down")
        core.expect(it_2.name, "its name", "queen of spades", "\"queen of spades\"")
        core.expect(it_2.color, "its color", "black", "black")
        core.expect(it_2.value, "its value", 12, "12")
        core.expect(it_2.short_name, "its short name", "Q♠↓", "\"Q♠↓\"")
        core.expect(it_2.is_a_face_card, "it is a face card", True, "yes")
        core.expect(it_2.suit == "spades", "it is a spade", True, "yes")
        core.expect(it_2.suit == "clubs", "it is a club", False, "no")
        core.expect(it_2.rank == "queen", "it is a queen", True, "yes")
        core.expect(it_2.rank == 2, "it is a 2", False, "no")
        core.expect(
            it_2.is_the_rank_of_suit("queen", "spades"),
            "it is the queen of spades",
            True,
            "yes",
        )
        core.expect(
            it_2.is_the_rank_of_suit("queen", "clubs"),
            "it is the queen of clubs",
            False,
            "no",
        )

        core.echo_test_action("turn it over")
        it_2.turn_over()
        core.expect(it_2.is_face_direction("up"), "it is face up", True, "yes")
        core.expect(it_2.short_name, "its short name", "Q♠↑", "\"Q♠↑\"")

        core.echo_test_action("set seven to a new card whose rank is 7 and suit is hearts")
        seven = Card(rank=7, suit="hearts")
        core.expect(seven.is_a_number_card, "seven is a number card", True, "yes")
        core.expect(seven.color, "the color of seven", "red", "red")


def test_card_images() -> None:
    with core.test("test card images"):
        it = CardImage()
        core.echo_test_action(
            "set queen to a new card whose rank is queen, suit is spades and direction is down",
        )
        queen = Card(rank="queen", suit="spades", direction="down")
        core.echo_test_action("get a new card image whose card is the queen")
        it_2 = CardImage(card=queen)
        core.expect(it_2.suit, "its suit", "spades", "spades")
        core.expect(it_2.picture, "its picture", "🂭", "\"🂭\"")
        core.expect(it_2.color, "its color", "black", "black")

        core.echo_test_action(
            "set seven to a new card image whose rank is 7 and suit is hearts",
        )
        seven = CardImage(rank=7, suit="hearts")
        core.expect(
            getattr(seven.card, "name", None),
            "the name of seven's card",
            "7 of hearts",
            "\"7 of hearts\"",
        )
        core.expect(seven.picture, "the picture of seven", "🂷", "\"🂷\"")
        core.expect(seven.color, "the color of seven", "red", "red")

        core.expect(
            CardImage(rank="ace", suit="clubs").picture,
            "the picture of a new card image whose rank is ace and suit is clubs",
            "🃑",
            "\"🃑\"",
        )
        core.expect(
            CardImage(rank="king", suit="diamonds").picture,
            "the picture of a new card image whose rank is king and suit is diamonds",
            "🃎",
            "\"🃎\"",
        )

        core.echo_test_action("get a new card image whose direction is down")
        it_3 = CardImage(direction="down")
        core.expect(it_3.picture, "its picture", "🂠", "\"🂠\"")
        core.expect(it_3.color, "its color", "blue", "blue")


# -----------


Layout = Literal["stacked", "vertical"]


class Pile(ViewableList):
    """A pile of cards, e.g. in a game like solitaire"""

    item_type = Card
    element_tag = "test-project-pile"

    # A card can only be in one pile at a time
    # How its cards lie:  on top of each other, or down a column -- styles.css
    # - its "layout" is one of stacked or vertical
    LAYOUTS = ("stacked", "vertical")
    layout = prop(one_of=LAYOUTS)

    @property
    def color(self) -> str:
        if not self:
            return "none"
        return self.last_item.color

    @property
    def value(self) -> float:
        if not self:
            return 0
        return self.last_item.value

    @property
    def short_name(self) -> str:
        """Its id, then its cards' short names:  stock: Q♠↑ 7♥↓"""
        summary = f"{self.id}:"
        for card in self:
            summary = f"{summary} {card.short_name}"
        return summary

    def when_card_dropped_on(self, card: Card) -> None:
        card.move_to_pile(self)

    droppable = True

    exclusive = True


def test_piles() -> None:
    with core.test("test piles"):
        core.echo_test_action("set the stock to a new pile with id \"stock\"")
        stock = Pile(id="stock")
        core.expect(stock.color, "stock's color", "none", "\"none\"")
        core.expect(stock.value, "stock's value", 0, "0")
        core.echo_test_action(
            "add a new card with rank queen, suit spades and direction up to the stock",
        )
        stock.append(Card(rank="queen", suit="spades", direction="up"))
        core.echo_test_action(
            "add a new card with rank 7, suit hearts and direction down to the stock",
        )
        stock.append(Card(rank=7, suit="hearts", direction="down"))
        core.expect(stock.color, "stock's color", "red", "red")
        core.expect(stock.value, "stock's value", 7, "7")
        core.expect(
            stock.short_name,
            "stock's short name",
            "stock: Q♠↑ 7♥↓",
            "\"stock: Q♠↑ 7♥↓\"",
        )

        # a card is in one pile at a time
        discards = Pile(id="discards")
        core.echo_test_action("get the top card of the stock")
        it = stock.last_item
        core.echo_test_action("add it to the discards")
        discards.append(it)
        core.expect(
            getattr(it, "pile", None) == discards,
            "its pile is the discards",
            True,
            "yes",
        )
        core.expect(len(stock), "the number of cards in the stock", 1, "1")
        core.expect(
            discards.short_name,
            "the discards' short name",
            "discards: 7♥↓",
            "\"discards: 7♥↓\"",
        )


# -----------


class Deck(ViewableList):
    """a deck of playing cards"""

    item_type = Card
    element_tag = "test-project-deck"

    async def create(self) -> None:
        """Create one of each card, ace of clubs first"""
        for rank in Card.RANKS:
            for suit in Card.SUITS:
                self.append(Card(rank=rank, suit=suit))

    @property
    def short_name(self) -> str:
        """its card names, top to bottom"""
        card_names = List(item_type="text")
        for card in self:
            card_names.append(card.short_name)
        return f"deck: {card_names}"


def test_a_new_deck() -> None:
    with core.test("test a new deck"):
        it = Deck()
        core.echo_test_action("the deck is a new deck")
        deck = Deck()
        core.expect(len(deck), "the number of cards in the deck", 52, "52")
        core.expect(
            len(deck.filter(lambda card: card.rank == "queen")),
            "the number of (cards in the deck where it is a queen)",
            4,
            "4",
        )
        core.expect(
            getattr(deck.first_item, "short_name", None),
            "deck's first card's short name",
            "A♣↓",
            "\"A♣↓\"",
        )
        core.expect(
            getattr(deck.last_item, "name", None),
            "deck's last card's name",
            "king of spades",
            "\"king of spades\"",
        )
        core.echo_test_action("shuffle the deck")
        deck.randomize()
        core.expect(len(deck), "the number of cards in the deck", 52, "52")


# -----------


# What auto play asks of a card


class StockPile(Pile):
    """The cards not played yet, face down:  a click turns the next one over, so none can be taken from it"""

    element_tag = "test-project-stock-pile"

    @property
    def layout(self) -> str:
        return "stacked"

    def can_take(self, card: Card) -> bool:
        return False

    def can_give_up(self, card: Card) -> bool:
        return False

    def draw_its_placeholder(self) -> Element:
        return h("test-project-card-image", {"direction": "down", "part": "placeholder"})

    async def on_click(self, event: ClickEvent) -> None:
        await solitaire.turn_over_the_next_card()


class DiscardPile(Pile):
    """Where the stock's cards go as they're turned over"""

    element_tag = "test-project-discard-pile"

    @property
    def layout(self) -> str:
        return "stacked"

    def can_take(self, card: Card) -> bool:
        return False

    def can_give_up(self, card: Card) -> bool:
        return card == self.last_item

    items_draggable = True


class Foundation(Pile):
    """Where a suit is built up, ace to king, one card at a time"""

    element_tag = "test-project-foundation"

    @property
    def layout(self) -> str:
        return "stacked"

    # - its "suit" is a card suit
    suit = prop(one_of=lambda: Card.SUITS)

    def can_give_up(self, card: Card) -> bool:
        return False

    def draw_its_placeholder(self) -> Element:
        # a light grey ace of its suit, face up
        return h(
            "test-project-card-image",
            {"rank": "ace", "prop:suit": self.suit, "part": "placeholder"},
        )

    def can_take(self, card: Card) -> bool:
        return self.suit == card.suit and self.value == card.value - 1 and card.is_on_top_of_its_pile

    droppable = True


class Column(Pile):
    """A column, built down from king to ace, red and black in turn"""

    element_tag = "test-project-column"

    @property
    def layout(self) -> str:
        return "vertical"

    def can_give_up(self, card: Card) -> bool:
        return card.is_face_direction("up")

    items_draggable = True

    def can_take(self, card: Card) -> bool:
        return ((not self) and card.rank == "king") or (self.color != card.color and self.value == card.value + 1)

    droppable = True


class Solitaire(App):
    """See https://en.wikipedia.org/wiki/Klondike_(solitaire) for the rules"""

    element_tag = "test-project-app"

    async def create(self) -> None:
        for card in self.deck:
            self.stock.append(card)
        await self.restart_the_game()

    def draw(self) -> Element:
        return [
            h(
                "ui-segment",
                {"inverted": True, "attach-to": "top"},
                h(
                    "ui-toolbar",
                    {
                        "class": "GameBar",
                        "appearance": "pills",
                        "inverted": True,
                        "size": "small",
                        "shrinkable": True,
                    },
                    h("ui-text", {"size": "big", "slot": "title", "heavy": True}, "Spell Solitaire"),
                    core.draw_action(self, "auto_play", {"in-menu": True}),
                    core.draw_action(self, "cheat", {"in-menu": True}),
                    core.draw_action(self, "restart_the_game", {"title": "Restart", "in-menu": True}),
                    h("spacer"),
                    core.draw_action(self, "undo", {"icon-only": True, "in-menu": True}),
                    core.draw_action(self, "redo", {"icon-only": True, "in-menu": True}),
                    h("ui-text", {"slot": "right"}, "Score: ", self.score),
                ),
            ),
            h(
                "ui-container",
                {"columns": "7", "padding": "small", "spacing": "xs"},
                h("test-project-stock-pile", {"id": "stock"}),
                h("test-project-discard-pile", {"id": "discard pile"}),
                h("spacer"),
                h("test-project-foundation", {"id": "clubs"}),
                h("test-project-foundation", {"id": "diamonds"}),
                h("test-project-foundation", {"id": "hearts"}),
                h("test-project-foundation", {"id": "spades"}),
                h("test-project-column", {"id": "C2"}),
                h("test-project-column", {"id": "C3"}),
                h("test-project-column", {"id": "C1"}),
                h("test-project-column", {"id": "C4"}),
                h("test-project-column", {"id": "C5"}),
                h("test-project-column", {"id": "C6"}),
                h("test-project-column", {"id": "C7"}),
            ),
            core.draw_context_menu(
                self,
                ["auto_play", "cheat", "restart_the_game", "-", "undo", "redo"],
            ),
        ]

    # <deck "deck"hidden />
    deck = prop(init=lambda: Deck(id="deck"), early=True)
    # <number "score" />
    score = prop(type="number")
    # <stock-pile "stock"/>
    stock = prop(init=lambda: StockPile(id="stock"), early=True)
    # <discard-pile "discard pile"/>
    discard_pile = prop(init=lambda: DiscardPile(id="discard pile"), early=True)
    # <foundation "clubs" suit=clubs/>
    clubs = prop(init=lambda: Foundation(id="clubs", suit="clubs"), early=True)
    # <foundation "diamonds" suit=diamonds/>
    diamonds = prop(init=lambda: Foundation(id="diamonds", suit="diamonds"), early=True)
    # <foundation "hearts" suit=hearts/>
    hearts = prop(init=lambda: Foundation(id="hearts", suit="hearts"), early=True)
    # <foundation "spades" suit=spades/>
    spades = prop(init=lambda: Foundation(id="spades", suit="spades"), early=True)
    # <column "C2"/>
    c2 = prop(init=lambda: Column(id="C2"), early=True)
    # <column "C3"/>
    c3 = prop(init=lambda: Column(id="C3"), early=True)
    # <column "C1"/>
    c1 = prop(init=lambda: Column(id="C1"), early=True)
    # <column "C4"/>
    c4 = prop(init=lambda: Column(id="C4"), early=True)
    # <column "C5"/>
    c5 = prop(init=lambda: Column(id="C5"), early=True)
    # <column "C6"/>
    c6 = prop(init=lambda: Column(id="C6"), early=True)
    # <column "C7"/>
    c7 = prop(init=lambda: Column(id="C7"), early=True)

    async def restart_the_game(self) -> None:
        self.score = 0
        for card in self.deck:
            core.meanwhile(lambda: card.turn_face_down())
        for card in core.filter(core.every_thing(Card), lambda card: card.pile != self.stock):
            core.meanwhile(lambda: self.stock.append(card))
            await core.pause_for(10, "msec")
        self.stock.randomize()
        # each row's first card lands face down, then turns up where it lies
        for row in range(1, 8):
            for column in core.get_range(row, 7):
                core.get_item_at(core.every_thing(Column), position(column)).append(self.stock.last_item)
                await core.pause_for(20, "msec")
                if column == row:
                    core.get_item_at(core.every_thing(Column), position(column)).last_item.turn_face_up()
        await self.turn_over_the_next_card()

    async def turn_over_the_next_card(self) -> None:
        """Turn the stock's next card over, onto the discard pile:  the discard pile back into the stock when it's empty"""
        # - a click on the stock, one step to undo;  the deal's own turn none, as it starts the game
        if not self.stock:
            self.reset_the_stock()
        next_card = self.stock.last_item
        next_card.turn_face_up()
        # as long as its flip takes (styles.css), so it turns over before it moves
        await core.pause_for(300, "msec")
        self.discard_pile.append(next_card)

    def reset_the_stock(self) -> None:
        """The discard pile, turned over, back into the stock"""
        cards = self.discard_pile.clone()
        cards.reverse()
        for card in cards:
            self.stock.append(card)
        for card in self.stock:
            card.turn_face_down()

    async def auto_play(self) -> None:
        """Play one card that can go somewhere, then the next, until none can"""
        async def _each_1(card: Card) -> Any:
            return await card.play()

        async def _each_2(card: Card) -> bool:
            return card.can_go_up and (await card.play())

        async def _each_3(card: Card) -> bool:
            return card.can_move_its_run and (await card.play())

        played = (await core.item_where_in_turn(self.discard_pile, _each_1, -1)) or (await core.item_where_in_turn(core.merge_lists(core.every_thing(Column)), _each_2, 0)) or (await core.item_where_in_turn(core.merge_lists(core.every_thing(Column)), _each_3, 0))
        if played is not None:
            await core.pause_for(300, "msec")
            await self.auto_play()

    def cheat(self) -> None:
        """Turn up a face-down card from a column, at random, onto the discard pile"""
        remaining_piles = core.filter(
            core.every_thing(Column),
            lambda pile: (pile) and pile.first_item.is_face_direction("down"),
        )
        if core.is_empty(remaining_piles):
            return
        pile = core.random_item_of(remaining_piles)
        card = pile.filter(lambda card: card.is_face_direction("down")).random_item()
        # turned up as it moves:  it rises over its column face down, then turns as it glides onto the discard pile
        self.discard_pile.append(card)
        card.turn_face_up()

    async def on_score_change(self, event: ScoreChangeEvent) -> None:
        if core.item_count_of(core.merge_lists(core.every_thing(Foundation))) == 52:
            await core.alert("You won!", "New game")
            await self.restart_the_game()


solitaire = Solitaire()
core.describe_action(Solitaire, "restart_the_game", {"title": "Restart the Game", "shortcuts": ["R"], "icon": "sync alternate", "undone_as": "Restart the Game"})
core.describe_action(Solitaire, "turn_over_the_next_card", {"title": "Turn Over the Next Card", "undone_as": "Turn Card"})
core.describe_action(Solitaire, "reset_the_stock", {"title": "Reset the Stock", "undone_as": "Reset the Stock"})
core.describe_action(Solitaire, "auto_play", {"title": "Auto Play", "shortcuts": ["A"], "icon": "play", "undone_as": "Auto Play"})
core.describe_action(Solitaire, "cheat", {"title": "Cheat", "shortcuts": ["C"], "icon": "eye", "undone_as": "Cheat"})

# play the card on click if it is a legal move

##############
# ## The piles
##############
# Each kind of pile, what it may take or give up, and how it lies.
# While one's empty, it shows its placeholder, if it has one.


def test_the_moves() -> None:
    with core.test("test the moves"):
        core.echo_test_action("set the column to a new column with id \"T1\"")
        column = Column(id="T1")
        core.echo_test_action(
            "set the king to a new card whose rank is king, suit is spades and direction is up",
        )
        king = Card(rank="king", suit="spades", direction="up")
        core.echo_test_action(
            "set the queen to a new card whose rank is queen, suit is hearts and direction is up",
        )
        queen = Card(rank="queen", suit="hearts", direction="up")
        core.echo_test_action(
            "set the jack to a new card whose rank is jack, suit is clubs and direction is up",
        )
        jack = Card(rank="jack", suit="clubs", direction="up")

        # an empty column takes only a king, then one lower in the other color
        core.expect(core.can_take(column, queen), "the column can take the queen", False, "no")
        core.expect(core.can_take(column, king), "the column can take the king", True, "yes")
        core.echo_test_action("add the king to the column")
        column.append(king)
        core.expect(core.can_take(column, jack), "the column can take the jack", False, "no")
        core.expect(core.can_take(column, queen), "the column can take the queen", True, "yes")
        core.echo_test_action("add the queen to the column")
        column.append(queen)
        core.expect(
            column.short_name,
            "the short name of the column",
            "T1: K♠↑ Q♥↑",
            "\"T1: K♠↑ Q♥↑\"",
        )
        core.expect(
            core.can_give_up(column, queen),
            "the column can give up the queen",
            True,
            "yes",
        )
        core.echo_test_action("turn the queen face down")
        queen.turn_face_down()
        core.expect(
            core.can_give_up(column, queen),
            "the column can give up the queen",
            False,
            "no",
        )

        # a foundation takes its suit, ace first, then one higher:  each the last card of its pile
        foundation = Foundation(suit="hearts")
        core.echo_test_action(
            "set the two to a new card whose rank is 2, suit is hearts and direction is up",
        )
        two = Card(rank=2, suit="hearts", direction="up")
        core.echo_test_action(
            "set the ace to a new card whose rank is ace, suit is hearts and direction is up",
        )
        ace = Card(rank="ace", suit="hearts", direction="up")
        core.echo_test_action("set the column to a new column with id \"T2\"")
        column = Column(id="T2")
        core.echo_test_action("add the two to the column")
        column.append(two)
        core.echo_test_action("add the ace to the column")
        column.append(ace)
        core.expect(
            core.can_take(foundation, two),
            "the foundation can take the two",
            False,
            "no",
        )
        core.expect(
            core.can_take(foundation, ace),
            "the foundation can take the ace",
            True,
            "yes",
        )
        core.echo_test_action("move the ace to the foundation")
        ace.move_to_pile(foundation)
        core.expect(
            core.can_take(foundation, two),
            "the foundation can take the two",
            True,
            "yes",
        )
        core.echo_test_action("add the queen to the column")
        column.append(queen)
        core.expect(
            core.can_take(foundation, queen),
            "the foundation can take the queen",
            False,
            "no",
        )


# -----------


core.install_styles(None, """/* File styles.css:  what no attribute draws -- the felt, the toolbar's middle, and the cards and piles.
   - The toolbar's bar, the board's grid and its spacing are their components' attributes (Solitaire.spell).
   - A card is one letter of unicode's Playing Cards, as wide as its pile:  no <ui-*> tag draws one.
   - A pile is styled by its layout (<solitaire-column layout="vertical">), each card in it by its place:
     --index from 0, of --count;  an empty pile's placeholder by its part, ::part(placeholder). */

/* A card's letter, in ems (measured in Chrome on a Mac):  0.604em wide, 0.805em tall, its left edge 0.049em in,
   with 0.008em to spare above and below */
:root,
:host {
  --card-width: 0.604;
  /* its height, in widths:  (0.805 + 2 x 0.008) / 0.604 */
  --card-height: 1.359;
  /* down a column, how much of each card shows under the next:  its rank and suit */
  --card-step-down: 0.2;
}

/* The table:  green felt, as on a casino's card table */
solitaire-app {
  display: block;
  min-height: 100%;
  border-radius: 12px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .22 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E"), #12683f;
}

/* A pile:  as wide as its cell of the board, as tall as its cards */
[layout] {
  display: flow-root;
  position: relative;
  container-type: inline-size;
  /* its top card glows when a dragged card would land on it (below), not the whole pile */
  --spell-drop-glow: none;
}
/* its height, a floated sizer:  a padding's percentage is one of its width */
[layout]::before {
  content: "";
  float: left;
  width: 100%;
  padding-top: calc(100% * var(--card-height));
}

/* Each card in a pile, and its placeholder:  a letter as wide as the pile, cut to the card it draws */
[layout] > *,
[layout]::part(placeholder) {
  position: absolute;
  display: block;
  font-size: calc(100cqi / var(--card-width));
}
/* a card in no pile (one added to the table in the editor):  a column's usual width */
solitaire-card:not([layout] > *) {
  position: relative;
  display: inline-block;
  font-size: calc(6rem / var(--card-width));
}
[layout] > *,
solitaire-card,
[layout]::part(placeholder) {
  width: calc(var(--card-width) * 1em);
  height: calc(var(--card-width) * var(--card-height) * 1em);
  overflow: hidden;
  /* the font that draws the cards, so a theme's font never moves them */
  font-family: "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", sans-serif;
  /* the face hugs the ink:  Apple Symbols' ink starts 0.917em down a line */
  box-sizing: border-box;
  padding-block: 0.008em;
  line-height: 0.917;
  --ui-text-line-height: 0.917;
  text-indent: -0.049em;
  user-select: none;
}

/* A card:  a two sided view (Card.spell), its sides turning in 3D, so it cuts nothing itself;
   a real deck's inks in every theme and scheme */
[layout] > *,
solitaire-card {
  overflow: visible;
  --spell-turn-perspective: 3em;
  color-scheme: light;
  --ui-red-text: #c8102e;
  --ui-black-text: #1a1a1a;
  --ui-blue-text: #2f6fd6;
}
/* each side:  its letter cut to the card, on a white face with the letter's rounded corners */
[layout] > *::part(front),
[layout] > *::part(back),
solitaire-card::part(front),
solitaire-card::part(back) {
  display: block;
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding-block: 0.008em;
  overflow: hidden;
  background: #fff;
  background-clip: content-box;
  border-radius: 0.035em;
}

/* Turning over and moving ease, as a card is turned and slid */
[layout] > * {
  transition:
    transform 0.3s ease-in-out,
    translate 0.3s ease-out;
}
@media (prefers-reduced-motion: reduce) {
  [layout] > * {
    transition: none;
  }
}

/* An empty pile's placeholder:  a faint pale card on the felt, whatever the card image's own ink */
[layout]::part(placeholder) {
  color: #d8f0e0;
  --ui-red-text: currentColor;
  --ui-black-text: currentColor;
  --ui-blue-text: currentColor;
  opacity: 0.4;
}
[layout]::part(placeholder):hover {
  opacity: 0.5;
}

/* Dropping:  where a dragged card would land glows -- the pile's top card, or its placeholder
   (:state(accepting-drop), set by the pile's rules) */
[layout]:state(accepting-drop) > :last-child,
[layout]:state(accepting-drop)::part(placeholder) {
  opacity: 1;
  border-radius: 0.035em;
  box-shadow:
    0 0 0 0.012em rgb(150 80 255 / 0.85),
    0 0 0.06em 0.025em rgb(150 80 255 / 0.55);
}

/* The layouts:  stacked puts every card on top of the one before;  vertical, each a step below it */
[layout="vertical"]::before {
  padding-top: calc(100% * var(--card-height) * (1 + (max(var(--count, 1), 1) - 1) * var(--card-step-down)));
}
[layout="vertical"] > * {
  margin-top: calc(var(--index) * var(--card-width) * var(--card-height) * 1em * var(--card-step-down));
}
""")


# -----------


solitaire.start()


# -----------


test_card_setup()
test_card_images()
test_piles()
test_a_new_deck()
test_the_moves()


# what each event this program hears holds
ClickEvent = SentEvent


class ScoreChangeEvent(SentEvent):
    value: float
    was: float

