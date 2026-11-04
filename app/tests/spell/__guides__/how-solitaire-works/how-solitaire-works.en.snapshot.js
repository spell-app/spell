/*! SPELL: WORDS how-solitaire-works en */
export const words = {
  lang: "en",
  types: {
    Card: {
      rank: "rank",
      suit: "suit",
      value: "value",
      color: "color",
      name: "name",
      draw: "draw it",
      try: "try (a card)",
      pile: "pile"
    },
    Table: {
      column: "column",
      hand: "hand",
      message: "message",
      draw: "draw it"
    }
  },
  groups: {
    Card: [
      { name: "The table:  a column, and a hand of cards to try on it", members: ["try"] },
      { name: "A pile, and a column", members: ["pile"] }
    ]
  }
}
