/*! SPELL: WORDS calculator en */
export const words = {
  lang: "en",
  types: {
    Calculator: {
      input: "input",
      output: "output",
      left: "left",
      right: "right",
      total: "total",
      operator: "operator",
      clear: "clear (a calculator)",
      updateTheTotalOfCalculator: "update the total of (a calculator)",
      appendDigitToCalculator: "append (digit as text) to (a calculator)",
      applyOpToCalculator: "apply (op as text) to (a calculator)",
      finish: "finish (a calculator)",
      draw: "draw (a calculator)"
    }
  },
  groups: {
    Calculator: [
      { name: "What it keeps", members: ["input", "output", "left", "right", "total", "operator"] },
      { name: "What its keys do", members: ["clear", "updateTheTotalOfCalculator", "appendDigitToCalculator", "applyOpToCalculator", "finish"] },
      { name: "How it draws:  the display, then the keypad, four keys a row", members: ["draw"] }
    ]
  }
}
