/*! SPELL: WORDS calculator en */
export const words = {
  lang: "en",
  types: {
    Calculator: {
      input: "input",
      left: "left",
      operator: "operator",
      right: "right",
      total: "total",
      sum: "sum",
      output: "output",
      clear: "clear it",
      finish: "finish it",
      pressDigit: "press (digit as text)",
      applyKey: "apply (key as text)",
      draw: "draw it"
    }
  },
  groups: {
    Calculator: [
      { name: "What It Keeps", description: "The sum being typed:  its left number, its operator and its right number", members: ["input", "left", "operator", "right", "total", "sum", "output"] },
      { name: "What Its Keys Do", members: ["clear", "finish", "pressDigit", "applyKey"] },
      { name: "Drawing", members: ["draw"] }
    ]
  }
}
