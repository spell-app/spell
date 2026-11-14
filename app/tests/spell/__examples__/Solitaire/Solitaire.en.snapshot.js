/*! SPELL: WORDS Solitaire en */
export const words = {
  lang: "en",
  types: {
    Card: {
      rank: "rank",
      isARank: "is a (rank)",
      value: "value",
      isAFaceCard: "is a face card",
      isANumberCard: "is a number card",
      suit: "suit",
      isASuit: "is a (suit)",
      color: "color",
      symbol: "symbol",
      name: "name",
      isTheRankOfSuit: "is the (rank) of (suit)",
      state: "state",
      picture: "picture",
      lifted: "lifted",
      countThePointsForCardOnPile: "count the points for a card on a pile",
      pile: "pile",
      play: "play a card",
      putOnPile: "put a card on a pile"
    },
    Deck: {
      state: "state"
    },
    Pile: {
      layout: "layout",
      color: "color",
      value: "value",
      state: "state"
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
      deck: "deck",
      stock: "stock",
      discards: "discards",
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
      score: "score",
      draw: "draw it",
      dealTheCards: "deal the cards",
      playFromTheStock: "play from the stock",
      resetTheStock: "reset the stock",
      restartTheGame: "restart the game",
      turnAStockCard: "turn a stock card",
      autoPlay: "auto play",
      cheat: "cheat"
    }
  },
  groups: {
    Card: [
      { name: "Rank", description: "Ace is low:  ace = 1 ... king = 13", members: ["rank", "value", "isAFaceCard", "isANumberCard"] },
      { name: "Suit", members: ["suit", "color", "symbol"] },
      { name: "Names", description: "What a person, test or console calls it", members: ["name", "isTheRankOfSuit", "state"] },
      { name: "Drawing", description: "One letter of unicode's Playing Cards, at the size of the text around it:  its pile scales it to fit -- styles.css", members: ["picture", "lifted"] },
      { name: "Game Play", members: ["countThePointsForCardOnPile", "play", "putOnPile"] },
      { name: "A pile of cards", members: ["pile"] }
    ],
    Solitaire: [
      { name: "Dealing", members: ["dealTheCards", "playFromTheStock", "resetTheStock", "restartTheGame", "turnAStockCard"] },
      { name: "Game Play", members: ["autoPlay", "cheat"] }
    ]
  }
}
