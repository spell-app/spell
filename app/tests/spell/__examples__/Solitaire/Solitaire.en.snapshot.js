/*! SPELL: WORDS Solitaire en */
export const words = {
  lang: "en",
  types: {
    Card: {
      rank: "rank",
      suit: "suit",
      color: "color",
      isAFaceCard: "is a face card",
      isANumberCard: "is a number card",
      isTheRankOfSuit: "is the (rank) of (suit)",
      name: "name",
      value: "value",
      symbol: "symbol",
      shorthand: "shorthand",
      moveToPile: "move a card to a pile",
      isOnTop: "is on top",
      isOnBottom: "is on bottom",
      play: "play a card",
      thePointsForCardOnPile: "the points for a card on a pile",
      pile: "pile"
    },
    CardImage: {
      card: "card",
      rank: "rank",
      suit: "suit",
      direction: "direction",
      isFaceDirection: "is face (direction)",
      color: "color",
      picture: "picture",
      draw: "draw it"
    },
    Pile: {
      layout: "layout",
      color: "color",
      value: "value",
      shorthand: "shorthand"
    },
    Deck: {
      shorthand: "shorthand"
    },
    StockPile: {
      layout: "layout"
    },
    DiscardPile: {
      layout: "layout"
    },
    Foundation: {
      layout: "layout",
      suit: "suit"
    },
    Column: {
      layout: "layout"
    },
    Solitaire: {
      draw: "draw solitaire",
      deck: "deck",
      score: "score",
      stock: "stock",
      discardPile: "discard pile",
      clubs: "clubs",
      diamonds: "diamonds",
      hearts: "hearts",
      spades: "spades",
      C2: "C2",
      C3: "C3",
      C1: "C1",
      C4: "C4",
      C5: "C5",
      C6: "C6",
      C7: "C7",
      dealTheCards: "deal the cards",
      turnOverTheNextCard: "turn over the next card",
      resetTheStockPile: "reset the stock pile",
      autoPlay: "auto play",
      cheat: "cheat"
    }
  },
  groups: {
    Card: [
      { name: "Card Rank & Suit", description: "A standard playing card with rank, suit and color. You can drag cards around and drop them on piles if the game allows.", members: ["rank", "suit", "color"] },
      { name: "Aliases", members: ["isAFaceCard", "isANumberCard", "isTheRankOfSuit"] },
      { name: "Names", description: "identifying a card", members: ["name", "value", "symbol", "shorthand"] },
      { name: "Game Play", members: ["play", "thePointsForCardOnPile"] }
    ],
    Solitaire: [
      { name: "Dealing & the Stock Pile", members: ["dealTheCards", "turnOverTheNextCard", "resetTheStockPile"] },
      { name: "Game Play", members: ["autoPlay", "cheat"] }
    ]
  }
}
