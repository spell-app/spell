/*! SPELL: WORDS Checkers en */
export const words = {
  lang: "en",
  types: {
    Piece: {
      side: "side",
      rank: "rank",
      isAKing: "is a king",
      forward: "forward",
      farRow: "far row",
      canJumpToSquare: "can jump to (a square)",
      hasAJump: "has a jump",
      canGoToSquare: "can go to (a square)",
      canMove: "can move",
      letter: "letter",
      moveToSquare: "move (a piece) to (a square)",
      wouldBeSafeOnSquare: "would be safe on (a square)",
      isYours: "is yours",
      draw: "draw it",
      square: "square"
    },
    Square: {
      row: "row",
      column: "column",
      shade: "shade",
      piece: "piece",
      isNextToSquare: "is next to (a square)",
      lit: "lit",
      draw: "draw it",
      board: "board"
    },
    Board: {
      turn: "turn",
      winner: "winner",
      turned: "turned",
      pickedPiece: "picked piece",
      jumper: "jumper",
      isOver: "is over",
      theSquareAtRowAndColumnOnBoard: "the square at (row as a number) and (column as a number) on (a board)",
      isForcedToJump: "is forced to jump",
      hasAMove: "has a move",
      diagram: "diagram",
      reset: "reset (a board)",
      startANewGameOnBoard: "start a new game on (a board)",
      setUpFromDiagram: "set up (a board) from (diagram as a list)",
      jumpSquare: "jump square",
      copyOntoOther: "copy (a board) onto (other as a board)",
      endTheTurnOnBoard: "end the turn on (a board)",
      putASideRankAtRowAndColumnOnBoard: "put a (side as text) (rank as text) at (row as a number) and (column as a number) on (a board)",
      moves: "moves",
      playForTheComputerOnBoard: "play for the computer on (a board)",
      shareInTable: "share (a board) in (a table)"
    },
    Move: {
      piece: "piece",
      square: "square",
      points: "points",
      thePointsForMove: "the points for (a move)"
    },
    Table: {
      diagram: "diagram",
      turn: "turn",
      winner: "winner",
      jumpSquare: "jump square",
      blackSeat: "black seat",
      redSeat: "red seat",
      showOnBoard: "show (a table) on (a board)"
    },
    Checker: {
      opponent: "opponent",
      board: "board",
      turnedBoard: "turned board",
      seat: "seat",
      table: "table",
      side: "side",
      message: "message",
      playTheComputer: "play the computer",
      playYourself: "play yourself",
      playSomeone: "play someone",
      startANewGame: "start a new game",
      draw: "draw it"
    }
  },
  groups: {
    Piece: [
      { name: "Playing", members: ["moveToSquare"] },
      { name: "The board and its rules", members: ["square"] }
    ],
    Square: [
      { name: "The board and its rules", members: ["board"] }
    ],
    Board: [
      { name: "Finding Squares", members: ["theSquareAtRowAndColumnOnBoard"] },
      { name: "Playing", members: ["reset", "startANewGameOnBoard", "setUpFromDiagram", "copyOntoOther", "endTheTurnOnBoard"] },
      { name: "Tests", members: ["putASideRankAtRowAndColumnOnBoard"] },
      { name: "The computer", members: ["playForTheComputerOnBoard"] },
      { name: "Against Someone", members: ["shareInTable"] }
    ],
    Move: [
      { name: "The computer", members: ["thePointsForMove"] }
    ],
    Table: [
      { name: "Against Someone", members: ["showOnBoard"] }
    ],
    Checker: [
      { name: "Who You Play", members: ["playTheComputer", "playYourself", "playSomeone"] },
      { name: "Game Play", members: ["startANewGame"] },
      { name: "Against Someone", members: ["draw"] }
    ]
  }
}
