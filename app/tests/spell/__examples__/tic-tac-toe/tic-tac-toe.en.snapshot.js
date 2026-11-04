/*! SPELL: WORDS tic-tac-toe en */
export const words = {
  lang: "en",
  types: {
    Square: {
      mark: "mark",
      isEmpty: "is empty",
      draw: "draw it",
      play: "play (a square)",
      board: "board"
    },
    TicTacToe: {
      board: "board",
      turn: "turn",
      winner: "winner",
      isOver: "is over",
      message: "message",
      create: "create it",
      startANewGame: "start a new game",
      checkTheLineFromSquareAThroughBToC: "check the line from square (a as a number) through (b as a number) to (c as a number)",
      checkForAWinner: "check for a winner",
      draw: "draw it"
    }
  },
  groups: {
    Square: [
      { name: "Playing a square:  the turn's mark, if the square is empty and nobody has won", members: ["play"] },
      { name: "The board:  nine squares, three a row -- styles.css lays them out", members: ["board"] }
    ]
  }
}
