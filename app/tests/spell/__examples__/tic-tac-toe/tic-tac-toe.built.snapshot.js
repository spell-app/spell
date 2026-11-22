import { core, Thing, List, App, h, position } from "@spell/core"

export class Square extends Thing {
  static { this.declareProp("mark", { type: "text" }) }
  get mark() { return this.getProp("mark") }
  set mark(value) { this.setProp("mark", value) }

  get isEmpty() {
    return this.mark === ""
  }

  get color() {
    if (this.mark === "X") return "blue"
    if (this.mark === "O") return "red"
    return "grey"
  }

  get label() {
    if (this.isEmpty) return " "
    return this.mark
  }

  play() {
    if (ticTacToe.isOver || !this.isEmpty) return
    this.mark = ticTacToe.turn
    ticTacToe.checkForAWinner()
    ticTacToe.turn = ticTacToe.turn === "X" ? "O" : "X"
  }

  get board() {
    return Board.ownerOf(this)
  }

  get lastBoard() {
    return Board.lastOwnerOf(this)
  }
}
core.describeAction(Square, "play", { title: "Play It", undoneAs: "Play It" })
// -----------
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

  static { this.declareProp("board", { init: () => new Board({ id: "board" }), early: true }) }
  get board() { return this.getProp("board") }
  set board(value) { this.setProp("board", value) }

  static { this.declareProp("turn", { type: "text" }) }
  get turn() { return this.getProp("turn") }
  set turn(value) { this.setProp("turn", value) }

  static { this.declareProp("winner", { type: "text" }) }
  get winner() { return this.getProp("winner") }
  set winner(value) { this.setProp("winner", value) }

  get isOver() {
    return this.winner !== ""
  }

  get message() {
    if (this.winner === "") return `${this.turn} to play`
    if (this.winner === "nobody") return "A draw"
    return `${this.winner} wins!`
  }

  create() {
    core.map(core.countTo(9), () => this.board.append(new Square()))
  }

  startANewGame() {
    this.board.forEach((square) => (square.mark = ""))
    this.turn = "X"
    this.winner = ""
  }

  checkTheLineFromSquareAThroughBToC(a, b, c) {
    const mark = this.board.getItem(position(a))?.mark
    if (mark === "") return
    if (this.board.getItem(position(b))?.mark === mark && this.board.getItem(position(c))?.mark === mark) this.winner = mark
  }

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

  draw() {
    return h("ui-container", { width: "22em" },
      h("ui-card", { fluid: true },
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
}
export const ticTacToe = new TicTacToe()
core.describeAction(TicTacToe, "startANewGame", { title: "Start a New Game", shortcuts: ["N"], undoneAs: "Start a New Game" })
core.describeAction(TicTacToe, "checkTheLineFromSquareAThroughBToC", { title: "Check the Line from Square a Through B to C", undoneAs: "Check the Line from Square a Through B to C" })
core.describeAction(TicTacToe, "checkForAWinner", { title: "Check for a Winner", undoneAs: "Check for a Winner" })

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
