import { core, Thing, List, App, View, ViewableList, Place, h, position, withSpellPositions, spellPosition } from "@spell/core"

core.heading("The board and its rules")
/////////////////////////////
// ## The board and its rules
/////////////////////////////
// American checkers:  8 by 8, each side's 12 pieces on the dark squares of its first three rows.
// A piece moves one square on a diagonal, forward only, until it reaches the far row and is crowned a king:
// a king moves forward and back.
// A piece jumps an enemy piece next to it, onto the empty square beyond, and takes it;
// a jump must be taken when there is one, and a piece that jumps carries on jumping while it can.
// Black moves first.  A side with no pieces left, or no move to make, has lost.

/** A checker:  a man, until it reaches the far row and is crowned a king. */
export class Piece extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "side" is one of black or red
  static Sides = ["black", "red"]
  static { this.declareProp("side", { oneOf: Piece.Sides }) }
  get side() { return this.getProp("side") }
  set side(value) { this.setProp("side", value) }

  // - its "rank" is one of man or king
  static Ranks = ["man", "king"]
  static { this.declareProp("rank", { oneOf: Piece.Ranks }) }
  get rank() { return this.getProp("rank") }
  set rank(value) { this.setProp("rank", value) }

  get isAKing() {
    return this.rank === "king"
  }

  /** Which way down the board it moves:  black up, from the bottom;  red down, from the top */
  static { this.declareProp("forward", { declaredAt: { path: "/Board.spell", start: 747, end: 895 }, readsFrom: ["checkers_room"] }) }
  get forward() {
    if (this.side === "black") return -1
    return 1
  }

  static { this.declareProp("farRow", { declaredAt: { path: "/Board.spell", start: 897, end: 952 }, readsFrom: ["checkers_room"] }) }
  get farRow() {
    if (this.side === "black") return 1
    return 8
  }

  /** Two squares on along a diagonal, forward unless it's a king, over an enemy piece onto an empty square */
  canJumpToSquare(square) {
    const rows = square.row - this.square.row
    const columns = square.column - this.square.column
    if (core.absoluteValue(rows) !== 2 || core.absoluteValue(columns) !== 2 || !square.isEmpty) return false
    if (!this.isAKing && rows * this.forward < 0) return false
    const row = (this.square.row + square.row) / 2
    const column = (this.square.column + square.column) / 2
    const middle = this.square.board.theSquareAtRowAndColumnOnBoard(row, column)
    const enemy = middle.piece
    return enemy !== undefined && enemy.side !== this.side
  }

  /** Whether there's a square it can jump to */
  static { this.declareProp("hasAJump", { declaredAt: { path: "/Board.spell", start: 3255, end: 3394 }, readsFrom: ["checkers_room"] }) }
  get hasAJump() {
    return this.square.board.any((square) => this.canJumpToSquare(square))
  }

  /** Whether it's a move the rules allow:  a step, or a jump when it must */
  canGoToSquare(square) {
    if (square.shade === "light" || !square.isEmpty) return false
    const board = this.square.board
    if (board.isOver || this.side !== board.turn) return false
    if (board.jumper !== undefined && this !== board.jumper) return false
    const rows = square.row - this.square.row
    const columns = square.column - this.square.column
    if (!this.isAKing && rows * this.forward < 0) return false
    if (core.absoluteValue(rows) === 2 && core.absoluteValue(columns) === 2) return this.canJumpToSquare(square)
    if (core.absoluteValue(rows) === 1 && core.absoluteValue(columns) === 1) return board.jumper === undefined && !board.isForcedToJump
    return false
  }

  /** Whether there's a square it can go to */
  static { this.declareProp("canMove", { declaredAt: { path: "/Board.spell", start: 4508, end: 4641 }, readsFrom: ["checkers_room"] }) }
  get canMove() {
    return this.square.board.any((square) => this.canGoToSquare(square))
  }

  /** How the board's diagram writes it:  b and r for each side's men, B and R for its kings */
  static { this.declareProp("letter", { declaredAt: { path: "/Board.spell", start: 4644, end: 4860 }, readsFrom: ["checkers_room"] }) }
  get letter() {
    if (this.side === "black" && this.isAKing) return "B"
    if (this.side === "black") return "b"
    if (this.isAKing) return "R"
    return "r"
  }

  /** The piece onto the square, if the rules let it:  a jump takes the piece it jumps */
  moveToSquare(square) {
    // - then it's crowned on the far row, or jumps again while it can, or the other side's turn comes
    if (!this.canGoToSquare(square)) core.cancel()
    const board = square.board
    const from = this.square
    const jumped = core.absoluteValue(square.row - from.row) === 2
    if (jumped) {
      const middle = board.theSquareAtRowAndColumnOnBoard((from.row + square.row) / 2, (from.column + square.column) / 2)
      core.clear(middle)
    }
    square.append(this)
    board.pickedPiece = undefined
    if (!this.isAKing && square.row === this.farRow) {
      this.rank = "king"
      board.endTheTurnOnBoard()
    } else if (jumped && this.hasAJump) board.jumper = this
    else board.endTheTurnOnBoard()
  }

  /** Whether no enemy piece could jump it there:  one next to the square, with the square beyond it free */
  wouldBeSafeOnSquare(square) {
    /** inside the loop `its` is the square beside:  so its side and where it stands are named first */
    const board = this.square.board
    const ownSide = this.side
    const left = this.square
    let threats = 0
    board.filter((beside) => beside.isNextToSquare(square)).forEach((beside) => {
      const enemy = beside.piece
      const landing = board.theSquareAtRowAndColumnOnBoard(square.row * 2 - beside.row, square.column * 2 - beside.column)
      if (enemy !== undefined && landing !== undefined && enemy.side !== ownSide) {
        /** it lands where this piece left, or on an empty square;  a man jumps only forward */
        const heading = (landing.row - beside.row) * enemy.forward
        if ((landing === left || core.isEmpty(landing)) && (enemy.isAKing || heading > 0)) threats = threats + 1
      }
    })
    return threats === 0
  }

  /** Both boards show the move;  then the computer plays, or the other tab hears it */
  async afterMoveToSquare(square) {
    const board = square.board
    if (board === checkers.turnedBoard) board.copyOntoOther(checkers.board)
    else board.copyOntoOther(checkers.turnedBoard)
    if (checkers.table !== undefined) board.shareInTable(checkers.table)
    if (checkers.opponent === "computer" && board.turn === "red" && !board.isOver) {
      await core.pauseFor(600, "msec")
      board.playForTheComputerOnBoard()
    }
  }

  /** Whether you move it here:  black against the computer;  each board's own side against yourself;  your side against someone */
  static { this.declareProp("isYours", { declaredAt: { path: "/Checkers.spell", start: 6149, end: 6571 }, readsFrom: ["checkers_room"] }) }
  get isYours() {
    const board = this.square.board
    if (checkers.opponent === "computer") return this.side === "black"
    if (checkers.opponent === "someone") return this.side === checkers.side
    if (board.turned) return this.side === "red"
    return this.side === "black"
  }

  /** a king wears a crown */
  draw() {
    if (this.isAKing) return h("ui-icon", { name: "crown" })
  }

  /** picked, to move with the next click;  a second click puts it down */
  onClick(event) {
    const board = this.square.board
    if (board.pickedPiece === this) board.pickedPiece = undefined
    else if (this.canMove && this.isYours) board.pickedPiece = this
  }

  static draggable = true

  get square() {
    return Square.ownerOf(this)
  }

  get lastSquare() {
    return Square.lastOwnerOf(this)
  }
}
core.addAfterHook(Piece, "moveToSquare", { hook: "afterMoveToSquare" })

/** One of the board's 64, by its row and column:  row 1 at the top, column 1 on the left. */
export class Square extends ViewableList {
  static instanceType = Piece
  static elementTag = core.defineElement(this, "test-project")

  /** Only the 32 dark ones are played on;  each holds one piece, or none. */
  // - its "row" is a number
  static { this.declareProp("row", { type: "number" }) }
  get row() { return this.getProp("row") }
  set row(value) { this.setProp("row", value) }

  // - its "column" is a number
  static { this.declareProp("column", { type: "number" }) }
  get column() { return this.getProp("column") }
  set column(value) { this.setProp("column", value) }

  /** set as the board is made:  dark where its row and column add up to an odd number */
  // - its "shade" is one of light or dark
  //   -- set as the board is made: dark where its row and column add up to an odd number
  static Shades = ["light", "dark"]
  static { this.declareProp("shade", { oneOf: Square.Shades }) }
  get shade() { return this.getProp("shade") }
  set shade(value) { this.setProp("shade", value) }

  get piece() {
    return this.firstItem
  }

  /** Whether it touches the square at a corner:  one row and one column away */
  isNextToSquare(square) {
    return core.absoluteValue(this.row - square.row) === 1 && core.absoluteValue(this.column - square.column) === 1
  }

  /** Whether the picked piece can go there:  it lights up (styles.css) */
  static { this.declareProp("lit", { declaredAt: { path: "/Drawing.spell", start: 699, end: 890 }, readsFrom: ["checkers_room"] }) }
  get lit() {
    if (this.board.pickedPiece !== undefined && this.board.pickedPiece.canGoToSquare(this)) return true
    return false
  }

  /** its piece, and a dot where the picked piece can go */
  draw() {
    return [
      h("slot"),
      this.lit ? h("ui-icon", { class: "Target", name: "circle", color: "yellow" }) : undefined
    ]
  }

  whenPieceDroppedOn(piece) {
    piece.moveToSquare(this)
  }

  /** a click where the picked piece can go moves it there */
  onClick(event) {
    if (this.lit) this.board.pickedPiece?.moveToSquare(this)
  }

  static droppable = true

  static exclusive = true

  get board() {
    return Board.ownerOf(this)
  }

  get lastBoard() {
    return Board.lastOwnerOf(this)
  }

  canGiveUp(piece) {
    return piece.canMove && piece.isYours
  }

  static itemsDraggable = true

  canTake(piece) {
    return piece.canGoToSquare(this)
  }

  static droppable = true
}

/** The 64 squares, a game on them, and whose turn it is */
export class Board extends ViewableList {
  static instanceType = Square
  static elementTag = core.defineElement(this, "test-project")

  // - its "turn" is one of black or red
  static Turns = ["black", "red"]
  static { this.declareProp("turn", { oneOf: Board.Turns }) }
  get turn() { return this.getProp("turn") }
  set turn(value) { this.setProp("turn", value) }

  // - its "winner" is one of nobody, black or red
  static Winners = ["nobody", "black", "red"]
  static { this.declareProp("winner", { oneOf: Board.Winners }) }
  get winner() { return this.getProp("winner") }
  set winner(value) { this.setProp("winner", value) }

  /** Drawn turned round, red's side nearest:  the other player's view of the same game */
  // - its "turned" is yes or no
  //   -- Drawn turned round, red's side nearest: the other player's view of the same game
  static { this.declareProp("turned", { type: "choice" }) }
  get turned() { return this.getProp("turned") }
  set turned(value) { this.setProp("turned", value) }

  /** The piece clicked, to move with the next click */
  // - its "picked piece" is a piece
  //   -- The piece clicked, to move with the next click
  static { this.declareProp("pickedPiece", { type: "Piece" }) }
  get pickedPiece() { return this.getProp("pickedPiece") }
  set pickedPiece(value) { this.setProp("pickedPiece", value) }

  /** The piece in the middle of jumps:  only it may move, and only to jump again */
  // - its "jumper" is a piece
  //   -- The piece in the middle of jumps: only it may move, and only to jump again
  static { this.declareProp("jumper", { type: "Piece" }) }
  get jumper() { return this.getProp("jumper") }
  set jumper(value) { this.setProp("jumper", value) }

  get isOver() {
    return this.winner !== "nobody"
  }

  create() {
    core.getRange(1, 8).forEach((row) => core.getRange(1, 8).forEach((column) => {
      const shade = core.includes([3, 5, 7, 9, 11, 13, 15], row + column) ? "dark" : "light"
      this.append(new Square({
        row: row,
        column: column,
        shade: shade
      }))
    }))
  }

  /////////////////////
  // ## Finding Squares
  /////////////////////

  /** nothing off the board's edge */
  theSquareAtRowAndColumnOnBoard(row, column) {
    if (row < 1 || row > 8) return undefined
    if (column < 1 || column > 8) return undefined
    const index = row * 8 - 8 + column
    return this.getItem(position(index))
  }

  /** Whether the side whose turn it is has a jump to make:  then it must make one */
  static { this.declareProp("isForcedToJump", { declaredAt: { path: "/Board.spell", start: 3405, end: 3635 }, readsFrom: ["checkers_room"] }) }
  get isForcedToJump() {
    return this.any((square) => square.piece !== undefined && square.piece.side === this.turn && square.piece.hasAJump)
  }

  /** Whether the side whose turn it is can move at all:  with none, it has lost */
  static { this.declareProp("hasAMove", { declaredAt: { path: "/Board.spell", start: 4871, end: 5039 }, readsFrom: ["checkers_room"] }) }
  get hasAMove() {
    return this.any((square) => square.piece !== undefined && square.piece.canMove)
  }

  /** Each square's piece as a letter, top left to bottom right:  "" for an empty one */
  static { this.declareProp("diagram", { declaredAt: { path: "/Board.spell", start: 5042, end: 5320 }, readsFrom: ["checkers_room"] }) }
  get diagram() {
    const letters = new List({ instanceType: "text" })
    this.forEach((square) => letters.append(!square.isEmpty ? square.piece.letter : ""))
    return letters
  }

  /////////////
  // ## Playing
  /////////////

  /** No pieces on it, black to move, and nobody's won */
  reset() {
    this.forEach((square) => core.clear(square))
    this.turn = "black"
    this.winner = "nobody"
    this.jumper = undefined
    this.pickedPiece = undefined
  }

  /** Each side's 12 men on the dark squares of its first three rows, black to move */
  startANewGameOnBoard() {
    this.reset()
    this.filter((square) => square.shade === "dark").forEach((square) => {
      if (square.row < 4) square.append(new Piece({ side: "red", rank: "man" }))
      if (square.row > 5) square.append(new Piece({ side: "black", rank: "man" }))
    })
  }

  /** Every square's piece as the diagram says (`its diagram`):  black to move, and nobody's won */
  setUpFromDiagram(diagram) {
    this.reset()
    this.forEach(withSpellPositions((square, index) => {
      const letter = core.getItemAt(diagram, position(index))
      if (letter === "b" || letter === "B") square.append(new Piece({ side: "black" }))
      if (letter === "r" || letter === "R") square.append(new Piece({ side: "red" }))
      if (letter === "B" || letter === "R") square.piece.rank = "king"
    }))
  }

  /** Where its jumper is, by the square's place on the board, 1 to 64:  0 while no piece is jumping */
  get jumpSquare() {
    if (this.jumper === undefined) return 0
    return spellPosition(this.positionOf(this.jumper?.square))
  }

  /** The other board shows the same game:  its pieces, whose turn it is, who's won, and which piece is jumping */
  copyOntoOther(other) {
    other.setUpFromDiagram(this.diagram)
    other.turn = this.turn
    other.winner = this.winner
    if (this.jumpSquare > 0) other.jumper = other.getItem(position(this.jumpSquare))?.piece
  }

  /** The other side's turn:  with no piece that can move, it has lost */
  endTheTurnOnBoard() {
    this.jumper = undefined
    this.turn = this.turn === "black" ? "red" : "black"
    if (!this.hasAMove) this.winner = this.turn === "black" ? "red" : "black"
  }

  ///////////
  // ## Tests
  ///////////

  /** One piece on a square, for a test to set up the position it wants */
  putASideRankAtRowAndColumnOnBoard(
    side,
    rank,
    row,
    column
  ) {
    core.append(this.theSquareAtRowAndColumnOnBoard(row, column), new Piece({ side: side, rank: rank }))
  }

  /** Every move the side whose turn it is can make, with its points */
  static { this.declareProp("moves", { declaredAt: { path: "/Computer.spell", start: 2280, end: 2726 }, readsFrom: ["checkers_room"] }) }
  get moves() {
    let found = new List({ instanceType: "Move" })
    this.filter((start) => start.piece !== undefined && start.piece.side === this.turn).forEach((start) => {
      const mover = start.piece
      this.filter((target) => mover.canGoToSquare(target)).forEach((target) => {
        const move = new Move({ piece: mover, square: target })
        move.points = move.thePointsForMove()
        found.append(move)
      })
    })
    return found
  }

  /** The computer's move:  the most points, picked at random among the best */
  playForTheComputerOnBoard() {
    const choices = this.moves
    if (core.isEmpty(choices)) return
    const best = core.getItemAt(core.sortedBy(choices, (item) => item.points), -1)
    const chosen = core.randomItemOf(core.filter(choices, (move) => move.points === best?.points))
    return chosen?.piece?.moveToSquare(chosen?.square)
  }

  /** The table takes the board's game, so the other tab sees it */
  shareInTable(table) {
    table.diagram = this.diagram
    table.turn = this.turn
    table.winner = this.winner
    table.jumpSquare = this.jumpSquare
  }

  static exclusive = true
}
core.describeAction(Board, "playForTheComputerOnBoard", { title: "Play for the Computer on Board", undoneAs: "Play for the Computer on Board" })
core.describeAction(Board, "shareInTable", { title: "Share Board in Table", undoneAs: "Share Board in Table" })

core.describeAction(Piece, "moveToSquare", { title: "Move Piece to Square", cancels: true, undoneAs: "Move Piece to Square" })

core.describeAction(Board, "theSquareAtRowAndColumnOnBoard", { title: "The Square at Row and Column on Board", undoneAs: "The Square at Row and Column on Board" })
core.describeAction(Board, "reset", { title: "Reset Board", undoneAs: "Reset Board" })
core.describeAction(Board, "startANewGameOnBoard", { title: "Start a New Game on Board", undoneAs: "Start a New Game on Board" })
core.describeAction(Board, "setUpFromDiagram", { title: "Set Up Board from List", undoneAs: "Set Up Board from List" })
core.describeAction(Board, "copyOntoOther", { title: "Copy Board onto Board", undoneAs: "Copy Board onto Board" })
core.describeAction(Board, "endTheTurnOnBoard", { title: "End the Turn on Board", undoneAs: "End the Turn on Board" })
core.describeAction(Board, "putASideRankAtRowAndColumnOnBoard", { title: "Put a Side Rank at Row and Column on Board", undoneAs: "Put a Side Rank at Row and Column on Board" })

core.heading("Moves")
///////////
// ## Moves
///////////

core.heading("Playing")

core.heading("Tests")
export function testTheOpening() {
  return core.test("test the opening", function testTheOpening() {
    core.echoTestAction(`set board to a new board`)
    const board = new Board()
    core.echoTestAction(`start a new game on board`)
    board.startANewGameOnBoard()
    core.expect(board.filter((square) => !square.isEmpty).length, `the number of squares in board where`, 24, `24`)
    core.expect(board.turn, `the turn of board`, "black", `black`)
    core.echoTestAction(`set man to the piece of (the square at 6 and 1 on board)`)
    const man = board.theSquareAtRowAndColumnOnBoard(6, 1).piece
    core.expect(man.side, `the side of man`, "black", `black`)
    core.expect(man.canGoToSquare(board.theSquareAtRowAndColumnOnBoard(5, 2)), `man can go to (the square at 5 and 2 on board)`, true, `yes`)
    core.expect(man.canGoToSquare(board.theSquareAtRowAndColumnOnBoard(7, 2)), `man can go to (the square at 7 and 2 on board)`, false, `no`)
    core.expect(man.canGoToSquare(board.theSquareAtRowAndColumnOnBoard(4, 3)), `man can go to (the square at 4 and 3 on board)`, false, `no`)
    // red waits its turn
    core.expect(board.theSquareAtRowAndColumnOnBoard(3, 2).piece.canMove, `the piece of (the square at 3 and 2 on board) can move`, false, `no`)
    core.echoTestAction(`move man to the square at 5 and 2 on board`)
    man.moveToSquare(board.theSquareAtRowAndColumnOnBoard(5, 2))
    core.expect(board.turn, `the turn of board`, "red", `red`)
  })
}

export function testAJumpMustBeTaken() {
  return core.test("test a jump must be taken", function testAJumpMustBeTaken() {
    core.echoTestAction(`set board to a new board`)
    const board = new Board()
    core.echoTestAction(`reset board`)
    board.reset()
    core.echoTestAction(`put a "black" "man" at 6 and 3 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "black",
      "man",
      6,
      3
    )
    core.echoTestAction(`put a "red" "man" at 5 and 4 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "red",
      "man",
      5,
      4
    )
    core.echoTestAction(`put a "black" "man" at 6 and 7 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "black",
      "man",
      6,
      7
    )
    core.expect(board.isForcedToJump, `board is forced to jump`, true, `yes`)
    // a step isn't allowed while there's a jump to make
    core.expect(board.theSquareAtRowAndColumnOnBoard(6, 7).piece.canGoToSquare(board.theSquareAtRowAndColumnOnBoard(5, 6)), `the piece of (the square at 6 and 7 on board) can go to (the square at 5 and 6 on board)`, false, `no`)
    core.echoTestAction(`set jumper to the piece of (the square at 6 and 3 on board)`)
    const jumper = board.theSquareAtRowAndColumnOnBoard(6, 3).piece
    core.expect(jumper.canGoToSquare(board.theSquareAtRowAndColumnOnBoard(5, 2)), `jumper can go to (the square at 5 and 2 on board)`, false, `no`)
    core.expect(jumper.canGoToSquare(board.theSquareAtRowAndColumnOnBoard(4, 5)), `jumper can go to (the square at 4 and 5 on board)`, true, `yes`)
    core.echoTestAction(`move jumper to the square at 4 and 5 on board`)
    jumper.moveToSquare(board.theSquareAtRowAndColumnOnBoard(4, 5))
    core.expect(core.isEmpty(board.theSquareAtRowAndColumnOnBoard(5, 4)), `the square at 5 and 4 on board is empty`, true, `yes`)
    // red has no pieces left:  black wins
    core.expect(board.winner, `the winner of board`, "black", `black`)
  })
}

export function testJumpingOn() {
  return core.test("test jumping on", function testJumpingOn() {
    core.echoTestAction(`set board to a new board`)
    const board = new Board()
    core.echoTestAction(`reset board`)
    board.reset()
    core.echoTestAction(`put a "black" "man" at 7 and 2 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "black",
      "man",
      7,
      2
    )
    core.echoTestAction(`put a "red" "man" at 6 and 3 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "red",
      "man",
      6,
      3
    )
    core.echoTestAction(`put a "red" "man" at 4 and 5 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "red",
      "man",
      4,
      5
    )
    core.echoTestAction(`put a "red" "man" at 1 and 8 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "red",
      "man",
      1,
      8
    )
    core.echoTestAction(`set jumper to the piece of (the square at 7 and 2 on board)`)
    const jumper = board.theSquareAtRowAndColumnOnBoard(7, 2).piece
    core.echoTestAction(`move jumper to the square at 5 and 4 on board`)
    jumper.moveToSquare(board.theSquareAtRowAndColumnOnBoard(5, 4))
    // still black's turn:  the same piece jumps again
    core.expect(board.turn, `the turn of board`, "black", `black`)
    core.expect(board.jumper, `the jumper of board`, jumper, `jumper`)
    core.echoTestAction(`move jumper to the square at 3 and 6 on board`)
    jumper.moveToSquare(board.theSquareAtRowAndColumnOnBoard(3, 6))
    core.expect(board.filter((square) => !square.isEmpty).length, `the number of squares in board where`, 2, `2`)
    core.expect(board.turn, `the turn of board`, "red", `red`)
    core.expect(board.winner, `the winner of board`, "nobody", `nobody`)
  })
}

export function testCrowningAKing() {
  return core.test("test crowning a king", function testCrowningAKing() {
    core.echoTestAction(`set board to a new board`)
    const board = new Board()
    core.echoTestAction(`reset board`)
    board.reset()
    core.echoTestAction(`put a "black" "man" at 2 and 3 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "black",
      "man",
      2,
      3
    )
    core.echoTestAction(`put a "red" "man" at 5 and 8 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "red",
      "man",
      5,
      8
    )
    core.echoTestAction(`set man to the piece of (the square at 2 and 3 on board)`)
    const man = board.theSquareAtRowAndColumnOnBoard(2, 3).piece
    core.echoTestAction(`move man to the square at 1 and 2 on board`)
    man.moveToSquare(board.theSquareAtRowAndColumnOnBoard(1, 2))
    core.expect(man.isAKing, `man is a king`, true, `yes`)
    core.expect(board.turn, `the turn of board`, "red", `red`)
    core.echoTestAction(`move the piece of (the square at 5 and 8 on board) to the square at 6 and 7 on board`)
    board.theSquareAtRowAndColumnOnBoard(5, 8).piece.moveToSquare(board.theSquareAtRowAndColumnOnBoard(6, 7))
    // a king moves back down the board
    core.expect(man.canGoToSquare(board.theSquareAtRowAndColumnOnBoard(2, 3)), `man can go to (the square at 2 and 3 on board)`, true, `yes`)
  })
}

export function testTheDiagram() {
  return core.test("test the diagram", function testTheDiagram() {
    core.echoTestAction(`set board to a new board`)
    const board = new Board()
    core.echoTestAction(`start a new game on board`)
    board.startANewGameOnBoard()
    core.echoTestAction(`set other to a new board`)
    const other = new Board()
    core.echoTestAction(`set up other from the diagram of board`)
    other.setUpFromDiagram(board.diagram)
    core.expect(`${other.diagram}`, `the diagram of other as text`, `${board.diagram}`, `the diagram of board as text`)
    core.expect(other.filter((square) => !square.isEmpty).length, `the number of squares in other where`, 24, `24`)
    core.echoTestAction(`move the piece of (the square at 6 and 1 on board) to the square at 5 and 2 on board`)
    board.theSquareAtRowAndColumnOnBoard(6, 1).piece.moveToSquare(board.theSquareAtRowAndColumnOnBoard(5, 2))
    core.echoTestAction(`copy board onto other`)
    board.copyOntoOther(other)
    core.expect(`${other.diagram}`, `the diagram of other as text`, `${board.diagram}`, `the diagram of board as text`)
    core.expect(other.turn, `the turn of other`, "red", `red`)
  })
}
// -----------
core.heading("The computer")
//////////////////
// ## The computer
//////////////////
// How the computer picks its move, when you play against it:  every move it can make, each given points.
// - a jump scores most:  the rules make it jump when it can, so this picks between jumps
// - then a move that crowns a king
// - a move onto a square where no piece of yours can jump it scores, and one where you can loses
// It looks one move ahead, no more:  it never sets a trap, and you can beat it.

/** One move the side to play could make:  a piece, the square it would go to, and its points */
export class Move extends Thing {
  // - its "piece" is a piece
  static { this.declareProp("piece", { type: "Piece" }) }
  get piece() { return this.getProp("piece") }
  set piece(value) { this.setProp("piece", value) }

  // - its "square" is a square
  static { this.declareProp("square", { type: "Square" }) }
  get square() { return this.getProp("square") }
  set square(value) { this.setProp("square", value) }

  // - its "points" is a number
  static { this.declareProp("points", { type: "number" }) }
  get points() { return this.getProp("points") }
  set points(value) { this.setProp("points", value) }

  /** What a move is worth to the computer */
  thePointsForMove() {
    const mover = this.piece
    const target = this.square
    let score = 0
    if (mover?.canJumpToSquare(target)) score = score + 10
    if (!mover?.isAKing && target?.row === mover?.farRow) score = score + 5
    if (mover?.wouldBeSafeOnSquare(target)) score = score + 2
    else score = score - 4
    return score
  }
}
core.describeAction(Move, "thePointsForMove", { title: "The Points for Move", undoneAs: "The Points for Move" })

export function testTheComputerJumps() {
  return core.test("test the computer jumps", function testTheComputerJumps() {
    core.echoTestAction(`set board to a new board`)
    const board = new Board()
    core.echoTestAction(`reset board`)
    board.reset()
    core.echoTestAction(`set the turn of board to red`)
    board.turn = "red"
    core.echoTestAction(`put a "red" "man" at 3 and 4 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "red",
      "man",
      3,
      4
    )
    core.echoTestAction(`put a "black" "man" at 4 and 5 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "black",
      "man",
      4,
      5
    )
    core.echoTestAction(`put a "black" "man" at 7 and 2 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "black",
      "man",
      7,
      2
    )
    core.echoTestAction(`play for the computer on board`)
    board.playForTheComputerOnBoard()
    core.expect(core.isEmpty(board.theSquareAtRowAndColumnOnBoard(4, 5)), `the square at 4 and 5 on board is empty`, true, `yes`)
    core.expect(board.theSquareAtRowAndColumnOnBoard(5, 6).piece !== undefined, `the piece of (the square at 5 and 6 on board) exists`, true, `yes`)
  })
}

export function testTheComputerKeepsItsPiecesSafe() {
  return core.test("test the computer keeps its pieces safe", function testTheComputerKeepsItsPiecesSafe() {
    core.echoTestAction(`set board to a new board`)
    const board = new Board()
    core.echoTestAction(`reset board`)
    board.reset()
    core.echoTestAction(`set the turn of board to red`)
    board.turn = "red"
    core.echoTestAction(`put a "red" "man" at 3 and 4 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "red",
      "man",
      3,
      4
    )
    core.echoTestAction(`put a "black" "man" at 6 and 7 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "black",
      "man",
      6,
      7
    )
    /** going to 4 and 5 walks into a jump from 5 and 6 later;  4 and 3 is safe now */
    const man = board.theSquareAtRowAndColumnOnBoard(3, 4).piece
    core.expect(man.wouldBeSafeOnSquare(board.theSquareAtRowAndColumnOnBoard(4, 5)), `man would be safe on (the square at 4 and 5 on board)`, true, `yes`)
    core.echoTestAction(`put a "black" "man" at 5 and 6 on board`)
    board.putASideRankAtRowAndColumnOnBoard(
      "black",
      "man",
      5,
      6
    )
    core.expect(man.wouldBeSafeOnSquare(board.theSquareAtRowAndColumnOnBoard(4, 5)), `man would be safe on (the square at 4 and 5 on board)`, false, `no`)
    core.expect(man.wouldBeSafeOnSquare(board.theSquareAtRowAndColumnOnBoard(4, 3)), `man would be safe on (the square at 4 and 3 on board)`, true, `yes`)
    core.echoTestAction(`play for the computer on board`)
    board.playForTheComputerOnBoard()
    core.expect(board.theSquareAtRowAndColumnOnBoard(4, 3).piece !== undefined, `the piece of (the square at 4 and 3 on board) exists`, true, `yes`)
  })
}
// -----------
core.heading("Checkers:  where a game against someone in another tab is kept")
////////////////////////////////////////////////////////////////////
// ## Checkers:  where a game against someone in another tab is kept
////////////////////////////////////////////////////////////////////

/** Where two tabs play one game:  the board as its diagram, whose turn it is, and which tab sits on each side */
export class Table extends Thing {
  /** Each square's piece as a letter, top left to bottom right (a board's diagram) */
  // - its "diagram" is a list of text
  //   -- Each square's piece as a letter, top left to bottom right (a board's diagram)
  static { this.declareProp("diagram", { itemType: "text", init: () => new List({ instanceType: "text" }), declaredAt: { path: "/Checkers.api.spell", start: 702, end: 816 } }) }
  get diagram() { return this.getProp("diagram") }
  set diagram(value) { this.setProp("diagram", value) }

  // - its "turn" is text
  static { this.declareProp("turn", { type: "text", declaredAt: { path: "/Checkers.api.spell", start: 818, end: 836 } }) }
  get turn() { return this.getProp("turn") }
  set turn(value) { this.setProp("turn", value) }

  // - its "winner" is text
  static { this.declareProp("winner", { type: "text", declaredAt: { path: "/Checkers.api.spell", start: 838, end: 858 } }) }
  get winner() { return this.getProp("winner") }
  set winner(value) { this.setProp("winner", value) }

  /** Where the piece in the middle of jumps is, by its square's place:  0 for none */
  // - its "jump square" is a number
  //   -- Where the piece in the middle of jumps is, by its square's place: 0 for none
  static { this.declareProp("jumpSquare", { type: "number", declaredAt: { path: "/Checkers.api.spell", start: 860, end: 972 } }) }
  get jumpSquare() { return this.getProp("jumpSquare") }
  set jumpSquare(value) { this.setProp("jumpSquare", value) }

  /** The tab playing black:  its seat */
  // - its "black seat" is text
  //   -- The tab playing black: its seat
  static { this.declareProp("blackSeat", { type: "text", declaredAt: { path: "/Checkers.api.spell", start: 974, end: 1036 } }) }
  get blackSeat() { return this.getProp("blackSeat") }
  set blackSeat(value) { this.setProp("blackSeat", value) }

  /** The tab playing red */
  // - its "red seat" is text
  //   -- The tab playing red
  static { this.declareProp("redSeat", { type: "text", declaredAt: { path: "/Checkers.api.spell", start: 1038, end: 1085 } }) }
  get redSeat() { return this.getProp("redSeat") }
  set redSeat(value) { this.setProp("redSeat", value) }

  /** The board takes the table's game:  both of this tab's boards show it */
  showOnBoard(board) {
    board.setUpFromDiagram(this.diagram)
    board.turn = this.turn
    board.winner = this.winner
    if (this.jumpSquare > 0) board.jumper = board.getItem(position(this.jumpSquare))?.piece
    board.copyOntoOther(checkers.turnedBoard)
  }

  /** the other tab moved:  this tab's boards show it */
  onSomeoneElseChange(event) {
    if (this === checkers.table) this.showOnBoard(checkers.board)
  }

  static savedIn = {
    place: "checkers_room",
    collection: "tables",
    times: ["created", "modified"]
  }

  // - it lives in the checkers room
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/Checkers.api.spell", start: 671, end: 700 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in the checkers room
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/Checkers.api.spell", start: 671, end: 700 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(Table, "showOnBoard", { title: "Show Table on Board", undoneAs: "Show Table on Board" })

/**
 * A live room on the page server:  each tab in it hears every move the other makes, as it's made.
 * A game is kept at a table, two tabs sitting at it:  the room is the tables of Owen's space.
 * Joining it is reading that space, so only its members join.
 * In the editor on Owen's machine that's him, with no sign-in;  anyone else signs in with a Spell account.
 * Name your own space to play in it:  "ana@spell/tables".
 */
export class CheckersRoom extends Place {}
export const checkersRoom = core.place(new CheckersRoom(), {
  name: "checkers_room",
  kind: "room",
  at: "/api/rooms/spaces/owen@spell/tables"
})

// -----------
core.heading("Checkers")
//////////////
// ## Checkers
//////////////
// Play against the computer, against yourself on two boards side by side, or against someone in another tab.
// The rules are in Board.spell, the computer's moves in Computer.spell, and the room a table is kept in, in Checkers.api.spell:
// this file holds the game you see, and what happens after each move.

export class Checker extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** Who black plays:  the computer, yourself on a second board turned round, or someone in another tab */
  // - its "opponent" is one of computer, yourself or someone
  //   -- Who black plays: the computer, yourself on a second board turned round, or someone in another tab
  static Opponents = ["computer", "yourself", "someone"]
  static { this.declareProp("opponent", { oneOf: Checker.Opponents }) }
  get opponent() { return this.getProp("opponent") }
  set opponent(value) { this.setProp("opponent", value) }

  // "board" is a new board
  static { this.declareProp("board", { init: () => new Board({ id: "board" }), early: true }) }
  get board() { return this.getProp("board") }
  set board(value) { this.setProp("board", value) }

  /** The same game, turned round:  red's view of it */
  // "turned board" is a new board with turned = yes
  //   -- The same game, turned round: red's view of it
  static { this.declareProp("turnedBoard", { init: () => new Board({ id: "turned-board", turned: true }), early: true }) }
  get turnedBoard() { return this.getProp("turnedBoard") }
  set turnedBoard(value) { this.setProp("turnedBoard", value) }

  /** This tab's own name at a table, made up as it opens:  so the table knows which seat it took */
  // - its "seat" is text
  //   -- This tab's own name at a table, made up as it opens: so the table knows which seat it took
  static { this.declareProp("seat", { type: "text" }) }
  get seat() { return this.getProp("seat") }
  set seat(value) { this.setProp("seat", value) }

  /** The table this tab sits at, against someone in another tab */
  // - its "table" is a table
  //   -- The table this tab sits at, against someone in another tab
  static { this.declareProp("table", { type: "Table" }) }
  get table() { return this.getProp("table") }
  set table(value) { this.setProp("table", value) }

  create() {
    this.seat = core.joined("tab ", core.randomNumber(1, 999999), " ")
    this.board.startANewGameOnBoard()
    this.board.copyOntoOther(this.turnedBoard)
  }

  /** Which side this tab plays against someone:  the side whose seat it took, else it watches */
  static { this.declareProp("side", { declaredAt: { path: "/Checkers.spell", start: 988, end: 1260 }, readsFrom: ["checkers_room"] }) }
  get side() {
    if (this.table !== undefined && this.table.blackSeat === this.seat) return "black"
    if (this.table !== undefined && this.table.redSeat === this.seat) return "red"
    return "nobody"
  }

  /** The line above the board:  who's won, or whose move it is */
  static { this.declareProp("message", { declaredAt: { path: "/Checkers.spell", start: 1263, end: 2024 }, readsFrom: ["checkers_room"] }) }
  get message() {
    const game = this.board
    const turn = core.titleCase(game.turn)
    if (game.isOver && this.opponent === "computer") return game.winner === "black" ? "You win!" : "The computer wins"
    if (game.isOver) return core.joined(core.titleCase(game.winner), "wins!", " ")
    if (this.opponent === "computer" && game.turn === "red") return "The computer is thinking…"
    if (this.opponent === "someone" && this.side === "nobody") return "Two other tabs are playing:  New game starts your own"
    if (this.opponent === "someone") return game.turn === this.side ? "Your move" : "Their move"
    if (game.jumper !== undefined) return core.joined(turn, "jumps again", " ")
    return core.joined(turn, "to play", " ")
  }

  /** You play black, the computer red */
  playTheComputer() {
    this.opponent = "computer"
    this.table = undefined
    this.startANewGame()
  }
  get playTheComputerIsSelected() {
    return this.opponent === "computer"
  }

  /** Black on the first board, red on the second, turned round:  each side moves on its own */
  playYourself() {
    this.opponent = "yourself"
    this.table = undefined
    this.startANewGame()
  }
  get playYourselfIsSelected() {
    return this.opponent === "yourself"
  }

  /** The table in the room:  the first tab to join plays black, the second red, and any more watch */
  async playSomeone() {
    this.opponent = "someone"
    let found = core.getItemAt(await core.savedThings(Table), 0)
    if (found === undefined) {
      found = new Table()
      this.board.shareInTable(found)
      core.saveThing(found)
    }
    if (found?.blackSeat === "") found.blackSeat = this.seat
    else if (found?.redSeat === "" && found?.blackSeat !== this.seat) found.redSeat = this.seat
    this.table = found
    found?.showOnBoard(this.board)
  }
  get playSomeoneIsSelected() {
    return this.opponent === "someone"
  }

  /** Every piece back where it starts, black to move */
  startANewGame() {
    this.board.startANewGameOnBoard()
    this.board.copyOntoOther(this.turnedBoard)
    if (this.table !== undefined) {
      // a tab that was watching takes black, and red is free for the next tab to join
      if (this.side === "nobody") {
        this.table.blackSeat = this.seat
        this.table.redSeat = ""
      }
      this.board.shareInTable(this.table)
    }
  }

  draw() {
    return h("ui-container",
      h("ui-stack",
        h("ui-toolbar", { class: "Bar", appearance: "pills", shrinkable: true },
          h("ui-text", { size: "big", slot: "title", heavy: true }, "Checkers"),
          h("spacer"),
          core.drawAction(this, "startANewGame", { "in-menu": true }),
          core.drawAction(this, "undo", { "icon-only": true, "in-menu": true }),
          core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })
        ),
        h("ui-toolbar", { class: "Opponents", appearance: "pills", size: "small", "aria-label": "Who you play" },
          core.drawAction(this, "playTheComputer", { "in-menu": true }),
          core.drawAction(this, "playYourself", { "in-menu": true }),
          core.drawAction(this, "playSomeone", { "in-menu": true })
        ),
        h("ui-header", { class: "Message", level: "3" }, () => this.message),
        h("slot", { name: "boards" }, () => this.drawBoards())
      )
    )
  }

  drawBoards() {
    // one board against the computer;  against yourself both, side by side;  against someone, your side nearest you
    if (this.opponent === "yourself") {
      return h("ui-stack", { class: "Boards", direction: "horizontal", wrap: true, part: "boards" },
        h("test-project-board", { id: "board" }),
        h("test-project-board", { id: "turned-board" })
      )
    } else if (this.opponent === "someone" && this.side === "red") return h("test-project-board", { id: "turned-board", part: "boards" })
    else return h("test-project-board", { id: "board", part: "boards" })
  }
}
export const checkers = new Checker()
core.describeAction(Checker, "playTheComputer", { title: "Computer", icon: "desktop", selectedWhen: "playTheComputerIsSelected", undoneAs: "Computer" })
core.describeAction(Checker, "playYourself", { title: "Yourself", icon: "columns", selectedWhen: "playYourselfIsSelected", undoneAs: "Yourself" })
core.describeAction(Checker, "playSomeone", { title: "Another tab", icon: "users", selectedWhen: "playSomeoneIsSelected", cantBeUndone: "keeps history" })
core.describeAction(Checker, "startANewGame", { title: "New game", shortcuts: ["N"], icon: "sync alternate", undoneAs: "New game" })

// -----------
core.heading("How the board draws, and how you move")
///////////////////////////////////////////
// ## How the board draws, and how you move
///////////////////////////////////////////
// The board is a grid of its squares, each square shows its piece:  styles.css colors them.
// Drag a piece onto a square the rules allow:  the square lights up as you hold it there.
// Or click a piece, then click where it should go:  every square it can go to lights up.

// -----------
core.installStyles(undefined, `/* File styles.css:  what no attribute draws -- the board's grid, its squares' colors and the pieces.¬   - Each square is <checkers-square shade="dark">, each piece <checkers-piece side="red" rank="king">:¬     their properties, as the elements' attributes (Board.spell). */¬¬/* The board:  eight rows of eight squares, as wide as there's room for, at most 30rem */¬checkers-board {¬  display: grid;¬  grid-template: repeat(8, 1fr) / repeat(8, 1fr);¬  width: min(100%, 30rem);¬  aspect-ratio: 1;¬  border: 0.5rem solid #6b4226;¬  border-radius: 0.5rem;¬  box-sizing: border-box;¬}¬/* the second board, turned round:  red's side nearest */¬checkers-board[turned] {¬  rotate: 180deg;¬}¬¬/* A square:  its piece in the middle */¬checkers-square {¬  display: grid;¬  place-items: center;¬  background: #f0d9b5;¬}¬checkers-square[shade="dark"] {¬  background: #9a6b46;¬}¬/* where a dragged piece would land */¬checkers-square:state(accepting-drop) {¬  box-shadow: inset 0 0 0 0.25rem #ffd54f;¬}¬/* the dot where the picked piece can go */¬checkers-square .Target {¬  grid-area: 1 / 1;¬}¬¬/* A piece:  a round checker, black or red;  a king wears a gold crown */¬checkers-piece {¬  grid-area: 1 / 1;¬  display: grid;¬  place-items: center;¬  width: 80%;¬  aspect-ratio: 1;¬  border-radius: 50%;¬  background: #222;¬  box-shadow: inset 0 -0.2rem 0 rgb(0 0 0 / 0.35);¬  color: #ffd54f;¬  cursor: grab;¬}¬checkers-piece[side="red"] {¬  background: #c62828;¬}¬/* on the turned board, its crown turned back the right way up */¬checkers-board[turned] checkers-piece {¬  rotate: 180deg;¬}¬`)
// -----------
if (!core.isCarryingOver) checkers.start()
// -----------
if (!core.isCarryingOver) testTheOpening()
if (!core.isCarryingOver) testAJumpMustBeTaken()
if (!core.isCarryingOver) testJumpingOn()
if (!core.isCarryingOver) testCrowningAKing()
if (!core.isCarryingOver) testTheDiagram()
if (!core.isCarryingOver) testTheComputerJumps()
if (!core.isCarryingOver) testTheComputerKeepsItsPiecesSafe()
