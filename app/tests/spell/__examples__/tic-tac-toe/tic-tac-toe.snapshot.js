import { core, Thing, List, App, h, position } from "@spell/core"

core.heading("A square")
//////////////
// ## A square
//////////////
// One of the board's nine:  empty, or holding an X or an O.

export class Square extends Thing {
  /** X or O, or empty while nobody has played it */
  // - its "mark" is text
  static { this.declareProp("mark", { type: "text" }) }
  get mark() { return this.getProp("mark") }
  set mark(value) { this.setProp("mark", value) }

  get isEmpty() {
    return this.mark === ""
  }

  /** The mark's color:  X blue, O red */
  get color() {
    if (this.mark === "X") return "blue"
    if (this.mark === "O") return "red"
    return "grey"
  }

  /** What its button says:  its mark, or a no-break space so an empty square keeps its height */
  get label() {
    if (this.isEmpty) return " "
    return this.mark
  }

  /** The turn's mark goes in the square, if it's empty and nobody has won;  then it's the other player's turn */
  play() {
    if (ticTacToe.isOver || !this.isEmpty) return
    this.mark = ticTacToe.turn
    ticTacToe.checkForAWinner()
    ticTacToe.turn = ticTacToe.turn === "X" ? "O" : "X"
  }

  get board() {
    return Board.ownerOf(this)
  }
}
// -----------
core.heading("Tic-Tac-Toe")
/////////////////
// ## Tic-Tac-Toe
/////////////////
// Two players take turns, X then O, putting their mark in an empty square.
// Three in a row, across, down or corner to corner, wins;  nine marks and no row is a draw.
// A square is this project's own, in `Square.spellml`;
// this file holds the game, its board, and what a click on a square does.

export class Board extends List {
  static instanceType = Square

  draw() {
    return core.drawRead(() => this, (square) => h("ui-column",
      h("ui-button", {
        fluid: true,
        size: "massive",
        appearance: "basic",
        color: () => square.color,
        onClick: core.pressed(this, () => square.play()),
        style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
      }, () => square.label)
    ), { items: () => h("ui-grid", { columns: "3", spacing: "compact" }) })
  }

  static exclusive = true
}

export class TicTacToe extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "board" is a new board
  static { this.declareProp("board", { init: () => new Board(), early: true }) }
  get board() { return this.getProp("board") }
  set board(value) { this.setProp("board", value) }

  /** Whose turn it is:  X or O */
  // - its "turn" is text
  static { this.declareProp("turn", { type: "text" }) }
  get turn() { return this.getProp("turn") }
  set turn(value) { this.setProp("turn", value) }

  /** Who won:  X, O, nobody for a draw, or empty while the game goes on */
  // - its "winner" is text
  static { this.declareProp("winner", { type: "text" }) }
  get winner() { return this.getProp("winner") }
  set winner(value) { this.setProp("winner", value) }

  get isOver() {
    return this.winner !== ""
  }

  /** What the line above the board says */
  get message() {
    if (this.winner === "") return `${this.turn} to play`
    if (this.winner === "nobody") return "A draw"
    return `${this.winner} wins!`
  }

  /** Nine squares, made with the game */
  create() {
    // inside the loop `it` is the count:  so the board is the game's, by name
    core.map(core.countTo(9), () => this.board.append(new Square()))
  }

  /** the same mark in all three squares wins */
  checkTheLineFromSquareAThroughBToC(a, b, c) {
    const mark = this.board.getItem(position(a))?.mark
    if (mark === "") return
    if (this.board.getItem(position(b))?.mark === mark && this.board.getItem(position(c))?.mark === mark) this.winner = mark
  }

  /** Three in a row:  each row, each column, and the two diagonals;  a full board with none is a draw */
  checkForAWinner() {
    this.checkTheLineFromSquareAThroughBToC(1, 2, 3)
    this.checkTheLineFromSquareAThroughBToC(4, 5, 6)
    this.checkTheLineFromSquareAThroughBToC(7, 8, 9)
    this.checkTheLineFromSquareAThroughBToC(1, 4, 7)
    this.checkTheLineFromSquareAThroughBToC(2, 5, 8)
    this.checkTheLineFromSquareAThroughBToC(3, 6, 9)
    this.checkTheLineFromSquareAThroughBToC(1, 5, 9)
    this.checkTheLineFromSquareAThroughBToC(3, 5, 7)
    if (this.winner === "" && !this.board.any((square) => square.isEmpty)) this.winner = "nobody"
  }

  /** The message, the board three squares a row, then a button for a new game */
  draw() {
    return h("ui-stack", { align: "center" },
      h("ui-card",
        h("ui-content",
          h("ui-header", { level: "2", align: "center" }, () => this.message),
          () => core.drawThing(this.board)
        ),
        h("ui-content",
          h("ui-button", {
            fluid: true,
            color: "primary",
            onClick: core.pressed(this, () => this.startANewGame()),
            style: "cursor:var(--ui-control-cursor,pointer);user-select:none"
          }, "New game")
        )
      )
    )
  }

  startANewGame() {
    this.board.forEach((square) => (square.mark = ""))
    this.turn = "X"
    this.winner = ""
  }
}
export const ticTacToe = new TicTacToe()

/** An empty board, X to play */
core.describeAction(TicTacToe, "startANewGame", { title: "start a new game", shortcuts: ["N"] })

core.heading("Playing a square")
//////////////////////
// ## Playing a square
//////////////////////
// What a click on a square does, added to this project's square:  `<spell-more-of>` adds to a type another file declares.

core.heading("The board")
///////////////
// ## The board
///////////////
// Nine squares, three a row:  square 1 top left, square 9 bottom right.
// It draws each square as a big button, its mark in the mark's color;  a click plays it.

/** a square is on one board */

core.heading("Start, and a test")
//## Start, and a test

ticTacToe.startANewGame()

export function testThreeInARow() {
  return core.test("test three in a row", function testThreeInARow() {
    core.echoTestAction(`start a new game`)
    ticTacToe.startANewGame()
    core.echoTestAction(`play square 1 of tic tac toe's board`)
    ticTacToe.board.firstItem?.play()
    core.echoTestAction(`play square 4 of tic tac toe's board`)
    ticTacToe.board.getItem(3)?.play()
    core.echoTestAction(`play square 2 of tic tac toe's board`)
    ticTacToe.board.getItem(1)?.play()
    core.echoTestAction(`play square 5 of tic tac toe's board`)
    ticTacToe.board.getItem(4)?.play()
    core.echoTestAction(`play square 3 of tic tac toe's board`)
    ticTacToe.board.getItem(2)?.play()
    core.expect(ticTacToe.winner, `tic tac toe's winner`, "X", `"X"`)
    core.expect(ticTacToe.message, `tic tac toe's message`, "X wins!", `"X wins!"`)
    core.expect(ticTacToe.board.firstItem?.color, `the color of square 1 of tic tac toe's board`, "blue", `"blue"`)
    core.echoTestAction(`start a new game`)
    ticTacToe.startANewGame()
  })
}
// -----------
if (!core.isCarryingOver) ticTacToe.start()
// -----------
if (!core.isCarryingOver) testThreeInARow()
