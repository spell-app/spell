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
      pressDigitOnCalculator: "press (digit as text) on it",
      applyKeyToCalculator: "apply (key as text) to it",
      draw: "draw it"
    }
  },
  groups: {
    Calculator: [
      { name: "what it keeps", description: "The sum being typed:  its left number, its operator and its right number", members: ["input", "left", "operator", "right", "total", "sum", "output"] },
      { name: "what its keys do", members: ["clear", "finish", "pressDigitOnCalculator", "applyKeyToCalculator"] },
      { name: "drawing", members: ["draw"] }
    ]
  }
}
