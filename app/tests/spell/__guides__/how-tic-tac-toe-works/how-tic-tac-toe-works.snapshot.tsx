import { core, Thing, List, App, prop, thing, drawn, position } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

core.heading("How Tic-Tac-Toe works")
///////////////////////////
// ## How Tic-Tac-Toe works
///////////////////////////
// The Tic-Tac-Toe example is the paper game:  X and O take turns, and three in a row wins.
// Its rules fit in three ideas:
// - each square knows its own mark
// - the game knows whose turn it is
// - after each move, the game checks every line of three for a winner

// This guide is the same game with one thing missing:  it only checks the ROWS, across.
// Three down, or corner to corner, doesn't win yet.  Adding those is your move, at the end.

core.heading("A square:  empty, or holding an X or an O")
///////////////////////////////////////////////
// ## A square:  empty, or holding an X or an O
///////////////////////////////////////////////
// A `<thing>` is a kind of thing the program keeps:  here, one square of the board.
// Its `<alias>` is a phrase you can say of it:  `the square is empty`.

export class Square extends Thing {
  // - its "mark" is text
  @prop({ type: "text" })
  accessor mark!: string

  get isEmpty() {
    return this.mark === ""
  }

  play() {
    if (ticTacToe.winner !== "" || !this.isEmpty) return
    this.mark = ticTacToe.turn
    ticTacToe.checkForAWinner()
    ticTacToe.turn = ticTacToe.turn === "X" ? "O" : "X"
  }

  get board() {
    return Board.ownerOf(this)!
  }
}

core.heading("The game")
//////////////
// ## The game
//////////////
// The app:  its board, whose turn it is, and who won.
// - `create it` runs as the game is made:  it puts nine empty squares on the board.
// - Squares are counted 1 to 9, left to right, then down:  1 2 3 is the top row.

export class Board extends List<Square> {
  static instanceType = Square

  @drawn draw() {
    return core.drawRead(() => this, (square: Square) => <ui-column>
      <ui-button fluid={true} size="massive" appearance="basic" onClick={core.pressed(this, () => square.play())} style="cursor:var(--ui-control-cursor,pointer);user-select:none">
        {square.mark || " "}
      </ui-button>
    </ui-column>, { items: () => <ui-grid columns="3" spacing="compact" /> })
  }

  static exclusive = true
}

@thing
export class TicTacToe extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "board" is a new board
  @prop({ init: () => new Board(), early: true })
  accessor board!: Board

  /** Whose turn it is:  X or O */
  // - its "turn" is text
  @prop({ type: "text" })
  accessor turn!: string

  /** Who won:  X or O, or empty while the game goes on */
  // - its "winner" is text
  @prop({ type: "text" })
  accessor winner!: string

  get message() {
    if (this.winner === "") return `${this.turn} to play`
    return `${this.winner} wins!`
  }

  /** Nine empty squares, made with the game */
  create() {
    core.map(core.countTo(9), () => this.board.append(new Square()))
  }

  /** An empty board, X to play */
  startANewGame() {
    this.board.forEach((square) => (square.mark = ""))
    this.turn = "X"
    this.winner = ""
  }

  /** the same mark in all three squares wins */
  checkTheLineFromSquareAThroughBToC(a: number, b: number, c: number) {
    const mark = this.board.getItem(position(a))?.mark
    if (mark === "") return
    if (this.board.getItem(position(b))?.mark === mark && this.board.getItem(position(c))?.mark === mark) this.winner = mark
  }

  /** Only the three rows, for now */
  checkForAWinner() {
    this.checkTheLineFromSquareAThroughBToC(1, 2, 3)
    this.checkTheLineFromSquareAThroughBToC(4, 5, 6)
    this.checkTheLineFromSquareAThroughBToC(7, 8, 9)
  }

  @drawn draw() {
    return (
      <ui-stack align="center">
        <ui-card>
          <ui-content>
            <ui-header level="2" align="center">{this.message}</ui-header>
            {core.drawThing(this.board)}
          </ui-content>
        </ui-card>
      </ui-stack>
    )
  }
}

/**
 * `<test-project-app>`:  a tic tac toe, drawn in its own element, e.g. by `draw the tic tac toe`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its tic tac toe's properties;  its methods call its tic tac toe's.
 * - What every view's element does, e.g. drawing its tic tac toe, is `SpellElement`'s.
 */
export class TicTacToeElement extends SpellElement<TicTacToe> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "tic tac toe", [
    { name: "board", kind: "json", description: "Its board." },
    { name: "turn", kind: "string", description: "Its turn." },
    { name: "winner", kind: "string", description: "Its winner." }
  ])

  create() {
    return this.currentThing?.create()
  }

  startANewGame() {
    return this.currentThing?.startANewGame()
  }

  checkTheLineFromSquareAThroughBToC(a: number, b: number, c: number) {
    return this.currentThing?.checkTheLineFromSquareAThroughBToC(a, b, c)
  }

  checkForAWinner() {
    return this.currentThing?.checkForAWinner()
  }
}
core.useElement(TicTacToe, TicTacToeElement)
export const ticTacToe = new TicTacToe()

core.heading("Playing a square")
//////////////////////
// ## Playing a square
//////////////////////
// Nothing happens if someone has won, or the square is taken.
// Otherwise:  the mark goes in, the game checks for a winner, and the turn passes to the other player.
// `<extend "square">` adds this action to the square, declared above:
// it's here, after the game, because it needs the game's turn;  the board, below, draws a button that calls it.

core.heading("The board:  nine squares, three a row")
///////////////////////////////////////////
// ## The board:  nine squares, three a row
///////////////////////////////////////////
// A list of squares, which draws itself as Spell UI's buttons in a grid:
// - `<for square in it as="grid" columns="3">` draws a `<grid>` with a column per square
// - each column holds a big button, and a click plays its square
// - the space after `or` is a no-break space, one that doesn't vanish:  an empty square keeps its height

/** a square is on one board */

core.heading("Start, and a check:  X wins across the top")
////////////////////////////////////////////////
// ## Start, and a check:  X wins across the top
////////////////////////////////////////////////
// The check plays a whole game, X in squares 1, 2 and 3, then clears the board for you.

ticTacToe.startANewGame()

export function testARow() {
  return core.test("test a row", function testARow() {
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
    core.expect(ticTacToe.message, `tic tac toe's message`, "X wins!", `"X wins!"`)
    core.echoTestAction(`start a new game`)
    ticTacToe.startANewGame()
  })
}

core.heading("Try it")
////////////
// ## Try it
////////////
// - Play a game on the right.  Win across the top, and the line above the board says so.
// - Click ↻, above the game, for a fresh board.
// Now win DOWN the left side:  squares 1, 4 and 7.  Nothing happens.

// Your move:  teach it to win down.  In "check for a winner", add three lines like the others:

// ```spell
// check the line from square 1 through 4 to 7
// check the line from square 2 through 5 to 8
// check the line from square 3 through 6 to 9
// ```

// Then the two corner-to-corner lines:  which squares are they?

// Where next:  Tic-Tac-Toe, in the Examples, which has every line, a draw when the board fills up,
// X in blue and O in red, and a New game button.
// -----------
if (!core.isCarryingOver) ticTacToe.start()
// -----------
if (!core.isCarryingOver) testARow()

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `TicTacToeElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
