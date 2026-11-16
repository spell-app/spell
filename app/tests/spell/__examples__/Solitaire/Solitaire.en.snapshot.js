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
      shortName: "short name",
      putOnPile: "put a card on a pile",
      isOnTopOfItsPile: "is on top of its pile",
      play: "play a card",
      thePointsForCardOnPile: "the points for (a card) on (a pile)",
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
      shortName: "short name"
    },
    Deck: {
      shortName: "short name"
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
      C1: "C1",
      C2: "C2",
      C3: "C3",
      C4: "C4",
      C5: "C5",
      C6: "C6",
      C7: "C7",
      restartTheGame: "restart the game",
      turnOverTheNextCard: "turn over the next card",
      resetTheStock: "reset the stock",
      autoPlay: "auto play",
      cheat: "cheat"
    }
  },
  groups: {
    Card: [
      { name: "Card Rank & Suit", description: "Ace is low:  ace = 1 ... king = 13", members: ["rank", "suit", "color"] },
      { name: "Aliases", description: "Spell for identifying cards", members: ["isAFaceCard", "isANumberCard", "isTheRankOfSuit"] },
      { name: "Names", description: "identifying a card", members: ["name", "value", "symbol", "shortName"] },
      { name: "Game Play", members: ["play", "thePointsForCardOnPile"] }
    ],
    Solitaire: [
      { name: "Dealing & the Stock Pile", members: ["restartTheGame", "turnOverTheNextCard", "resetTheStock"] },
      { name: "Game Play", members: ["autoPlay", "cheat"] }
    ]
  }
}
