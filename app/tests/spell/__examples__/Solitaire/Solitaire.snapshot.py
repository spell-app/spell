from __future__ import annotations

from typing import Any, Literal

from spell_core import core, List, App, TwoSidedView, ViewableList, prop, h, position, spell_position, Element, SentEvent


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

    @property
    def picture(self) -> str | None:
        """Its face:  https://www.compart.com/en/unicode/block/U+1F0A0"""
        column = self.value
        if self.suit == "clubs":
            return core.get_item_at(
                ["🃑", "🃒", "🃓", "🃔", "🃕", "🃖", "🃗", "🃘", "🃙", "🃚", "🃛", "🃝", "🃞"],
                position(column),
            )
        if self.suit == "diamonds":
            return core.get_item_at(
                ["🃁", "🃂", "🃃", "🃄", "🃅", "🃆", "🃇", "🃈", "🃉", "🃊", "🃋", "🃍", "🃎"],
                position(column),
            )
        if self.suit == "hearts":
            return core.get_item_at(
                ["🂱", "🂲", "🂳", "🂴", "🂵", "🂶", "🂷", "🂸", "🂹", "🂺", "🂻", "🂽", "🂾"],
                position(column),
            )
        return core.get_item_at(
            ["🂡", "🂢", "🂣", "🂤", "🂥", "🂦", "🂧", "🂨", "🂩", "🂪", "🂫", "🂭", "🂮"],
            position(column),
        )

    # Over every card and pile around it while the cheat moves it -- styles.css
    # - its "lifted" is yes or no
    lifted = prop(type="choice")

    def draw_front(self) -> Element:
        return h("ui-text", {"color": self.color, "part": "front"}, self.picture)

    def draw_back(self) -> Element:
        return h("ui-text", {"color": "blue", "part": "back"}, "🂠")

    async def play(self) -> Any:
        if self in solitaire.stock:
            await solitaire.play_from_the_stock()
        else:
            end_pile = core.filter(core.every_thing(Pile), lambda pile: core.can_take(pile, self)).first_item
            if end_pile is None:
                return False
            return await self.put_on_pile(end_pile)

    async def put_on_pile(self, pile: Pile) -> bool:
        """the card, and every card on it, onto the pile, if the piles' rules let it go and take it;  it says whether it moved"""
        # - the pile it left turns its new last card up;  the move counts, and scores
        start_pile = self.pile
        assert start_pile is not None
        if not core.can_give_up(start_pile, self):
            return False
        if not core.can_take(pile, self):
            return False
        points = self.count_the_points_for_card_on_pile(pile)
        for card in start_pile.starting_with(self):
            core.move(card, pile)
        if isinstance(start_pile, Column) and (start_pile):
            await core.pause_for(200, "msec")
            start_pile.last_item.turn_face_up()
        solitaire.score = solitaire.score + points
        return True

    def count_the_points_for_card_on_pile(self, pile: Pile) -> float:
        """what the move scores:  10 on a foundation, 5 from the discards, else nothing"""
        if isinstance(pile, Foundation):
            return 10
        if self in solitaire.discards:
            return 5
        return 0

    async def on_click(self, event: ClickEvent) -> None:
        if self.is_face_direction("up") or self.pile == solitaire.stock:
            await self.play()

    draggable = True

    @property
    def pile(self) -> Pile | None:
        return Pile.owner_of(self)


core.describe_action(Card, "play", {"title": "Play A Card", "undone_as": "Play Card"})
core.describe_action(Card, "put_on_pile", {"title": "Put A Card On A Pile", "undone_as": "Move Card"})
core.describe_action(Card, "count_the_points_for_card_on_pile", {"title": "Count The Points For A Card On A Pile", "undone_as": "Count The Points For A Card On A Pile"})
# It's a two sided view:  face up it shows its picture, face down the back every card shares.
# On the page each card is its own element, `<solitaire-card>`:  people may drag it (`draggable`), when its pile lets it go.
# Ace is low:  ace = 1 ... king = 13

# Spell for identifying cards

# identifying a card

# One letter of unicode's Playing Cards, at the size of the text around it:  its pile scales it to fit -- styles.css


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
        core.expect(it_2.picture, "its picture", "🂭", "\"🂭\"")

        core.echo_test_action("turn it over")
        it_2.turn_over()
        core.expect(it_2.is_face_direction("up"), "it is face up", True, "yes")
        core.expect(it_2.short_name, "its short name", "Q♠↑", "\"Q♠↑\"")

        core.echo_test_action("set seven to a new card whose rank is 7 and suit is hearts")
        seven = Card(rank=7, suit="hearts")
        core.expect(seven.is_a_number_card, "seven is a number card", True, "yes")
        core.expect(seven.color, "the color of seven", "red", "red")
        core.expect(seven.picture, "the picture of seven", "🂷", "\"🂷\"")
        core.expect(
            Card(rank="ace", suit="clubs").picture,
            "the picture of a new card whose rank is ace and suit is clubs",
            "🃑",
            "\"🃑\"",
        )
        core.expect(
            Card(rank="king", suit="diamonds").picture,
            "the picture of a new card whose rank is king and suit is diamonds",
            "🃎",
            "\"🃎\"",
        )


# -----------


###########
# ## A deck
###########
# The 52 cards of a standard deck, ace of clubs first.


class Deck(List):
    item_type = Card

    async def create(self) -> None:
        """One of each card, ace of clubs first:  each starts face down, as every two sided view does"""
        for rank in Card.RANKS:
            for suit in Card.SUITS:
                self.append(Card(rank=rank, suit=suit))

    @property
    def short_name(self) -> str:
        """Its cards' short names, top to bottom"""
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


####################
# ## A pile of cards
####################
# A game's stock, its discards, a column on the table:  the game names its piles, and says what each kind takes.
# Each pile is its own element around its cards' elements, `<solitaire-column>` around `<solitaire-card>`s.
# A card dragged over it glows when it would take the card, by its own rules (`droppable`).


Layout = Literal["stacked", "vertical"]


class Pile(ViewableList):
    item_type = Card
    element_tag = "test-project-pile"

    # How its cards lie:  on top of each other, or down a column -- styles.css
    # - its "layout" is one of stacked or vertical
    LAYOUTS = ("stacked", "vertical")
    layout = prop(one_of=LAYOUTS)

    @property
    def color(self) -> str:
        """Its last card's:  what the next card goes on"""
        if not self:
            return "none"
        return self.last_item.color

    @property
    def value(self) -> float:
        """Its last card's"""
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

    async def when_card_dropped_on(self, card: Card) -> None:
        await card.put_on_pile(self)

    droppable = True

    exclusive = True


def test_piles() -> None:
    with core.test("test piles"):
        it = Pile()
        core.echo_test_action("set the stock to a new pile with id \"stock\"")
        stock = Pile(id="stock")
        core.expect(stock.color, "stock's color", "none", "\"none\"")
        core.expect(stock.value, "stock's value", 0, "0")
        core.echo_test_action(
            "add (a new card whose rank is queen, suit is spades and direction is up) to the stock",
        )
        stock.append(Card(rank="queen", suit="spades", direction="up"))
        core.echo_test_action(
            "add (a new card whose rank is 7, suit is hearts and direction is down) to the stock",
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
        core.echo_test_action("get the last card of the stock")
        it_2 = stock.last_item
        core.echo_test_action("add it to the discards")
        discards.append(it_2)
        core.expect(
            getattr(it_2, "pile", None) == discards,
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


# a card is in one pile at a time:  putting it on another pile takes it off this one


# -----------


#######################
# ## Klondike Solitaire
#######################
# Deal seven columns, then build four foundations, ace to king, one suit each:
# [wikipedia](https://en.wikipedia.org/wiki/Klondike_(solitaire)) has its rules, and what each pile is called.
# The cards, the deck and the piles are this project's own:  `Card`, `Deck` and `Pile`.
# Each pile is declared where it's drawn, `<column "C1"/>`, and so is the score, `<number "score"/>`.


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
        return h("ui-text", {"part": "placeholder"}, "🂠")

    async def on_click(self, event: ClickEvent) -> None:
        await solitaire.play_from_the_stock()


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
        """a light grey ace of its suit, face up"""
        return h("ui-text", {"part": "placeholder"}, Card(rank="ace", suit=self.suit).picture)

    def can_take(self, card: Card) -> bool:
        assert card.pile is not None
        if card != card.pile.last_item:
            return False
        return self.suit == card.suit and self.value + 1 == card.value

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
    element_tag = "test-project-app"

    # "deck" is a new deck
    deck = prop(init=lambda: Deck(id="deck"), early=True)

    async def create(self) -> None:
        for card in self.deck:
            self.stock.append(card)
        await self.restart_the_game()

    def draw(self) -> Element:
        return [
            h(
                "ui-segment",
                {"inverted": True, "attach": "top", "color": ""},
                h(
                    "ui-toolbar",
                    {
                        "class": "GameBar",
                        "aria-label": "Game",
                        "appearance": "pills",
                        "inverted": True,
                        "size": "small",
                        "shrinkable": True,
                    },
                    h("ui-text", {"slot": "title", "size": "large", "heavy": True}, "Solitaire"),
                    core.draw_action(self, "auto_play", {"in-menu": True}),
                    core.draw_action(self, "cheat", {"in-menu": True}),
                    core.draw_action(self, "restart_the_game", {"in-menu": True}),
                    h("ui-action", {"kind": "divider"}),
                    core.draw_action(self, "undo", {"in-menu": True}),
                    core.draw_action(self, "redo", {"in-menu": True}),
                    h("ui-text", {"slot": "right"}, "Score: ", self.score),
                ),
            ),
            h(
                "ui-container",
                {"padding": "small", "columns": "7", "spacing": "xs"},
                h("test-project-stock-pile", {"id": "stock"}),
                h("test-project-discard-pile", {"id": "discards"}),
                h("spacer"),
                h("test-project-foundation", {"id": "clubs"}),
                h("test-project-foundation", {"id": "diamonds"}),
                h("test-project-foundation", {"id": "hearts"}),
                h("test-project-foundation", {"id": "spades"}),
                h("test-project-column", {"id": "C1"}),
                h("test-project-column", {"id": "C2"}),
                h("test-project-column", {"id": "C3"}),
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

    # <number "score"/>
    score = prop(type="number")
    # <stock-pile "stock"/>
    stock = prop(init=lambda: StockPile(id="stock"), early=True)
    # <discard-pile "discards"/>
    discards = prop(init=lambda: DiscardPile(id="discards"), early=True)
    # <foundation "clubs" suit=clubs/>
    clubs = prop(init=lambda: Foundation(id="clubs", suit="clubs"), early=True)
    # <foundation "diamonds" suit=diamonds/>
    diamonds = prop(init=lambda: Foundation(id="diamonds", suit="diamonds"), early=True)
    # <foundation "hearts" suit=hearts/>
    hearts = prop(init=lambda: Foundation(id="hearts", suit="hearts"), early=True)
    # <foundation "spades" suit=spades/>
    spades = prop(init=lambda: Foundation(id="spades", suit="spades"), early=True)
    # <column "C1"/>
    c1 = prop(init=lambda: Column(id="C1"), early=True)
    # <column "C2"/>
    c2 = prop(init=lambda: Column(id="C2"), early=True)
    # <column "C3"/>
    c3 = prop(init=lambda: Column(id="C3"), early=True)
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
        await self.deal_the_cards()

    async def deal_the_cards(self) -> None:
        """Gather every card into the stock, shuffle it, and deal the columns"""
        for card in self.deck:
            start_pile = card.pile
            card.turn_face_down()
            if start_pile != self.stock:
                self.stock.append(card)
                await core.pause_for(50, "msec")
        self.stock.randomize()
        # each row's first card lands face down, then turns up where it lies
        for row in range(1, 8):
            for column in core.get_range(row, 7):
                core.get_item_at(core.every_thing(Column), position(column)).append(self.stock.last_item)
                if column == row:
                    core.get_item_at(core.every_thing(Column), position(column)).last_item.turn_face_up()
                await core.pause_for(50, "msec")
        await self.play_from_the_stock()

    async def play_from_the_stock(self) -> None:
        """Turn the stock's next card over, onto the discards:  the discards back into the stock when it's empty"""
        # - a click on the stock, one step to undo;  the deal's own turn none, as it starts the game
        if not self.stock:
            self.reset_the_stock()
        it = self.stock.last_item
        it.turn_face_up()
        # as long as its flip takes (styles.css), so it turns over before it moves
        await core.pause_for(300, "msec")
        self.discards.append(it)

    def reset_the_stock(self) -> None:
        """The discards, turned over, back into the stock"""
        cards = self.discards.clone()
        cards.reverse()
        for card in cards:
            self.stock.append(card)
        for card in self.stock:
            card.turn_face_down()

    async def auto_play(self) -> None:
        """Play every card that can go somewhere, until none can"""
        anything_changed = False
        if self.discards:
            test_card = self.discards.last_item
            if await test_card.play():
                anything_changed = True
                await core.pause_for(500, "msec")
        # each column's last card onto its foundation
        for pile in core.every_thing(Column):
            if not pile:
                continue
            test_card = pile.last_item
            foundation = core.filter(core.every_thing(Foundation), lambda pile: pile.suit == test_card.suit).first_item
            if core.can_take(foundation, test_card):
                anything_changed = True
                await test_card.play()
                await core.pause_for(100, "msec")
        # each column's face-up cards, all together, onto another column
        for pile in core.every_thing(Column):
            face_up_cards = pile.filter(lambda card: card.is_face_direction("up"))
            if not face_up_cards:
                continue
            test_card = face_up_cards.first_item
            if test_card.rank == "king" and test_card == pile.first_item:
                continue
            if await test_card.play():
                anything_changed = True
                await core.pause_for(500, "msec")
        if anything_changed:
            await self.auto_play()

    async def cheat(self) -> None:
        """Turn up a face-down card from a column, at random, onto the discards"""
        remaining_piles = core.filter(
            core.every_thing(Column),
            lambda pile: (pile) and pile.first_item.is_face_direction("down"),
        )
        if core.is_empty(remaining_piles):
            return
        pile = core.random_item_of(remaining_piles)
        card = pile.filter(lambda card: card.is_face_direction("down")).random_item()
        # over every card around it, then turned face up as it moves onto the discards
        card.lifted = True
        card.turn_face_up()
        self.discards.append(card)
        await core.pause_for(300, "msec")
        card.lifted = False

    async def on_score_change(self, event: ScoreChangeEvent) -> None:
        home = len(self.clubs) + len(self.diamonds)
        home = home + len(self.hearts) + len(self.spades)
        if home == 52:
            core.alert("You won!", "New game")
            await self.restart_the_game()


solitaire = Solitaire()
core.describe_action(Solitaire, "restart_the_game", {"title": "Restart The Game", "shortcuts": ["R"], "icon": "sync alternate", "undone_as": "Restart The Game"})
core.describe_action(Solitaire, "deal_the_cards", {"title": "Deal The Cards", "undone_as": "Deal The Cards"})
core.describe_action(Solitaire, "play_from_the_stock", {"title": "Play From The Stock", "undone_as": "Turn Card"})
core.describe_action(Solitaire, "reset_the_stock", {"title": "Reset The Stock", "undone_as": "Reset The Stock"})
core.describe_action(Solitaire, "auto_play", {"title": "Auto Play", "shortcuts": ["A"], "icon": "play", "undone_as": "Auto Play"})
core.describe_action(Solitaire, "cheat", {"title": "Cheat", "shortcuts": ["C"], "icon": "eye", "undone_as": "Cheat"})

# play the card on click if it is a legal move

# drop the card on the pile if it is a legal move

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
        core.move(ace, foundation)
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

/* The toolbar:  its actions centred in the room between the title and the score, which are
   never squeezed:  as the bar narrows, the actions give way (\\`shrinkable\\`), down to one \\`…\\` button */
.GameBar {
  --ui-toolbar-gap: 1em;
}
.GameBar::part(title),
.GameBar::part(right) {
  flex: none;
}
.GameBar::part(menu) {
  flex: 1 1 auto;
  justify-content: center;
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

/* Moving:  the cheat's card is "lifted" over every card around it, and turns face up as it goes to the discards
   (the game pauses 0.3s for it:  Solitaire.spell) */
[layout] > * {
  transition:
    transform 0.3s ease-in-out,
    translate 0.3s ease-out;
}
[layout] > [lifted] {
  z-index: 5;
}
[layout] > [lifted][direction="up"] {
  @starting-style {
    transform: perspective(var(--spell-turn-perspective, 100em)) rotateY(180deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  [layout] > * {
    transition: none;
  }
}

/* An empty pile's placeholder:  a faint pale card on the felt */
[layout]::part(placeholder) {
  color: #d8f0e0;
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
test_a_new_deck()
test_piles()
test_the_moves()


# what each event this program hears holds
ClickEvent = SentEvent


class ScoreChangeEvent(SentEvent):
    value: float
    was: float

