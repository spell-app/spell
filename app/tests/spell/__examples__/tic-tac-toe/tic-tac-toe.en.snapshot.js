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
      startANewGame: "start a new game",
      checkTheLineFromSquareAThroughBToC: "check the line from square (a as a number) through (b as a number) to (c as a number)",
      checkForAWinner: "check for a winner",
      draw: "draw it"
    }
  },
  groups: {
    Square: [
      { name: "Playing a square", members: ["board"] }
    ],
    TicTacToe: [
      { name: "Playing", members: ["startANewGame", "checkTheLineFromSquareAThroughBToC", "checkForAWinner", "draw"] }
    ]
  }
}
