/*! SPELL: WORDS flash-cards en */
export const words = {
  lang: "en",
  types: {
    FlashCard: {
      word: "word",
      meaning: "meaning"
    },
    Quiz: {
      deck: "deck",
      card: "card",
      known: "known",
      tried: "tried",
      score: "score",
      dealACard: "deal a card",
      draw: "draw it",
      showTheAnswer: "show the answer",
      sayIKnew: "say i knew it",
      sayIMissed: "say i missed it",
      startOver: "start over"
    }
  },
  groups: {
    Quiz: [
      { name: "playing", members: ["dealACard", "draw", "showTheAnswer", "sayIKnew", "sayIMissed", "startOver"] }
    ]
  }
}
