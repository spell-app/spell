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
      draw: "draw it",
      picture: "picture",
      play: "play a card",
      putOnPile: "put a card on a pile",
      countThePointsForCardOnPile: "count the points for a card on a pile",
      pile: "pile"
    },
    Deck: {
      create: "create it",
      state: "state"
    },
    Pile: {
      name: "name",
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
    Tableau: {
      layout: "layout"
    },
    Solitaire: {
      score: "score",
      hint: "hint",
      deck: "deck",
      stock: "stock",
      discards: "discards",
      clubs: "clubs",
      diamonds: "diamonds",
      hearts: "hearts",
      spades: "spades",
      T1: "T1",
      T2: "T2",
      T3: "T3",
      T4: "T4",
      T5: "T5",
      T6: "T6",
      T7: "T7",
      create: "create it",
      resetTheStock: "reset the stock",
      playFromTheStock: "play from the stock",
      dealTheCards: "deal the cards",
      draw: "draw it",
      startANewGame: "start a new game",
      autoPlay: "auto play",
      cheat: "cheat"
    }
  },
  groups: {
    Card: [
      { name: "rank", description: "Ace is low:  ace = 1 ... king = 13", members: ["rank", "value", "isAFaceCard", "isANumberCard"] },
      { name: "suit", members: ["suit", "color", "symbol"] },
      { name: "names", description: "What a person, a test or the console calls it", members: ["name", "isTheRankOfSuit", "state"] },
      { name: "drawing", description: "One letter of unicode's Playing Cards, at the size of the text around it:  its pile scales it to fit -- styles.css", members: ["draw", "picture"] },
      { name: "Playing a card", members: ["play", "putOnPile", "countThePointsForCardOnPile"] },
      { name: "A pile of cards", members: ["pile"] }
    ],
    Solitaire: [
      { name: "piles", description: "One of each, made with the solitaire", members: ["stock", "discards", "clubs", "diamonds", "hearts", "spades", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "create"] },
      { name: "dealing", description: "Each pauses a moment, so a deal animates", members: ["resetTheStock", "playFromTheStock", "dealTheCards"] },
      { name: "game", description: "Its moves:  the menu's buttons, its keys, and the board's right click", members: ["draw", "startANewGame", "autoPlay", "cheat"] }
    ]
  }
}
