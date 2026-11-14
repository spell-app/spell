/*! SPELL: WORDS Solitaire en */
export const words = {
  lang: "en",
  types: {
    Card: {
      rank: "rank",
      value: "value",
      isAFaceCard: "is a face card",
      isANumberCard: "is a number card",
      suit: "suit",
      color: "color",
      symbol: "symbol",
      name: "name",
      isTheRankOfSuit: "is the (rank) of (suit)",
      shortName: "short name",
      picture: "picture",
      lifted: "lifted",
      play: "play a card",
      putOnPile: "put a card on a pile",
      countThePointsForCardOnPile: "count the points for a card on a pile",
      pile: "pile"
    },
    Deck: {
      shortName: "short name"
    },
    Pile: {
      layout: "layout",
      color: "color",
      value: "value",
      shortName: "short name"
    },
    Foundation: {
      suit: "suit"
    },
    Solitaire: {
      deck: "deck",
      draw: "draw it",
      restartTheGame: "restart the game",
      dealTheCards: "deal the cards",
      playFromTheStock: "play from the stock",
      turnAStockCard: "turn a stock card",
      resetTheStock: "reset the stock",
      autoPlay: "auto play",
      cheat: "cheat"
    }
  },
  groups: {
    Card: [
      { name: "Rank", description: "Ace is low:  ace = 1 ... king = 13", members: ["rank", "value", "isAFaceCard", "isANumberCard"] },
      { name: "Suit", members: ["suit", "color", "symbol"] },
      { name: "Names", description: "What a person, test or console calls it", members: ["name", "isTheRankOfSuit", "shortName"] },
      { name: "Drawing", description: "One letter of unicode's Playing Cards, at the size of the text around it:  its pile scales it to fit -- styles.css", members: ["picture", "lifted"] },
      { name: "Game Play", members: ["play", "putOnPile", "countThePointsForCardOnPile"] },
      { name: "A pile of cards", members: ["pile"] }
    ],
    Solitaire: [
      { name: "Dealing", members: ["restartTheGame", "dealTheCards", "playFromTheStock", "turnAStockCard", "resetTheStock"] },
      { name: "Game Play", members: ["autoPlay", "cheat"] }
    ]
  }
}
