/*! SPELL: WORDS tic-tac-toe en */
export const words = {
  lang: "en",
  types: {
    Square: {
      mark: "mark",
      isEmpty: "is empty",
      color: "color",
      label: "label",
      play: "play it",
      board: "board"
    },
    Board: {
      draw: "draw it"
    },
    TicTacToe: {
      board: "board",
      turn: "turn",
      winner: "winner",
      isOver: "is over",
      message: "message",
      create: "create it",
      checkTheLineFromSquareAThroughBToC: "check the line from square (a as a number) through (b as a number) to (c as a number)",
      checkForAWinner: "check for a winner",
      draw: "draw it",
      startANewGame: "start a new game"
    }
  },
  groups: {
    TicTacToe: [
      { name: "playing", members: ["checkTheLineFromSquareAThroughBToC", "checkForAWinner", "draw", "startANewGame"] }
    ],
    Square: [
      { name: "Playing a square", members: ["board"] }
    ]
  }
}
