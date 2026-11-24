import { core, Thing, List, App, View, ViewableList, Place, h, position, withSpellPositions, spellPosition } from "@spell/core"

export class Piece extends View {
  static elementTag = core.defineElement(this, "test-project")

  static Sides = ["black", "red"]
  static { this.declareProp("side", { oneOf: Piece.Sides }) }
  get side() { return this.getProp("side") }
  set side(value) { this.setProp("side", value) }

  static Ranks = ["man", "king"]
  static { this.declareProp("rank", { oneOf: Piece.Ranks }) }
  get rank() { return this.getProp("rank") }
  set rank(value) { this.setProp("rank", value) }

  get isAKing() {
    return this.rank === "king"
  }

  static { this.declareProp("forward", { readsFrom: ["checkers_room"] }) }
  get forward() {
    if (this.side === "black") return -1
    return 1
  }

  static { this.declareProp("farRow", { readsFrom: ["checkers_room"] }) }
  get farRow() {
    if (this.side === "black") return 1
    return 8
  }

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

  static { this.declareProp("hasAJump", { readsFrom: ["checkers_room"] }) }
  get hasAJump() {
    return this.square.board.any((square) => this.canJumpToSquare(square))
  }

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

  static { this.declareProp("canMove", { readsFrom: ["checkers_room"] }) }
  get canMove() {
    return this.square.board.any((square) => this.canGoToSquare(square))
  }

  static { this.declareProp("letter", { readsFrom: ["checkers_room"] }) }
  get letter() {
    if (this.side === "black" && this.isAKing) return "B"
    if (this.side === "black") return "b"
    if (this.isAKing) return "R"
    return "r"
  }

  moveToSquare(square) {
    if (!this.canGoToSquare(square)) core.cancel()
    const board = square.board
    const start = this.square
    const jumped = core.absoluteValue(square.row - start.row) === 2
    if (jumped) {
      const middle = board.theSquareAtRowAndColumnOnBoard((start.row + square.row) / 2, (start.column + square.column) / 2)
      core.clear(middle)
      core.play("piece take")
    } else core.play("piece down")
    square.append(this)
    board.pickedPiece = undefined
    if (!this.isAKing && square.row === this.farRow) {
      this.rank = "king"
      core.play("level up")
      board.endTheTurnOnBoard()
    } else if (jumped && this.hasAJump) board.jumper = this
    else board.endTheTurnOnBoard()
  }

  wouldBeSafeOnSquare(square) {
    const board = this.square.board
    const ownSide = this.side
    const left = this.square
    let threats = 0
    board.filter((beside) => beside.isNextToSquare(square)).forEach((beside) => {
      const enemy = beside.piece
      const landing = board.theSquareAtRowAndColumnOnBoard(square.row * 2 - beside.row, square.column * 2 - beside.column)
      if (enemy !== undefined && landing !== undefined && enemy.side !== ownSide) {
        const heading = (landing.row - beside.row) * enemy.forward
        if ((landing === left || core.isEmpty(landing)) && (enemy.isAKing || heading > 0)) threats = threats + 1
      }
    })
    return threats === 0
  }

  async afterMoveToSquare(square) {
    const board = square.board
    if (board === checkers.turnedBoard) board.copyOntoOther(checkers.board)
    else board.copyOntoOther(checkers.turnedBoard)
    if (checkers.table !== undefined) board.shareInTable(checkers.table)
    if (checkers.opponent === "computer" && board.turn === "red" && !board.isOver) {
      await core.pauseFor(600, "msec")
      core.answered(board.playForTheComputerOnBoard())
    }
  }

  static { this.declareProp("isYours", { readsFrom: ["checkers_room"] }) }
  get isYours() {
    const board = this.square.board
    if (checkers.opponent === "computer") return this.side === "black"
    if (checkers.opponent === "someone") return this.side === checkers.side
    if (board.turned) return this.side === "red"
    return this.side === "black"
  }

  draw() {
    if (this.isAKing) return h("ui-icon", { name: "crown" })
  }

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

export class Square extends ViewableList {
  static instanceType = Piece
  static elementTag = core.defineElement(this, "test-project")

  static { this.declareProp("row", { type: "number" }) }
  get row() { return this.getProp("row") }
  set row(value) { this.setProp("row", value) }

  static { this.declareProp("column", { type: "number" }) }
  get column() { return this.getProp("column") }
  set column(value) { this.setProp("column", value) }

  static Shades = ["light", "dark"]
  static { this.declareProp("shade", { oneOf: Square.Shades }) }
  get shade() { return this.getProp("shade") }
  set shade(value) { this.setProp("shade", value) }

  get piece() {
    return this.firstItem
  }

  isNextToSquare(square) {
    return core.absoluteValue(this.row - square.row) === 1 && core.absoluteValue(this.column - square.column) === 1
  }

  static { this.declareProp("lit", { readsFrom: ["checkers_room"] }) }
  get lit() {
    if (this.board.pickedPiece !== undefined && this.board.pickedPiece.canGoToSquare(this)) return true
    return false
  }

  draw() {
    return [
      h("slot"),
      this.lit ? h("ui-icon", { class: "Target", name: "circle", color: "yellow" }) : undefined
    ]
  }

  whenPieceDroppedOn(piece) {
    piece.moveToSquare(this)
  }

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

export class Board extends ViewableList {
  static instanceType = Square
  static elementTag = core.defineElement(this, "test-project")

  static Turns = ["black", "red"]
  static { this.declareProp("turn", { oneOf: Board.Turns }) }
  get turn() { return this.getProp("turn") }
  set turn(value) { this.setProp("turn", value) }

  static Winners = ["nobody", "black", "red"]
  static { this.declareProp("winner", { oneOf: Board.Winners }) }
  get winner() { return this.getProp("winner") }
  set winner(value) { this.setProp("winner", value) }

  static { this.declareProp("turned", { type: "choice" }) }
  get turned() { return this.getProp("turned") }
  set turned(value) { this.setProp("turned", value) }

  static { this.declareProp("pickedPiece", { type: "Piece" }) }
  get pickedPiece() { return this.getProp("pickedPiece") }
  set pickedPiece(value) { this.setProp("pickedPiece", value) }

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

  theSquareAtRowAndColumnOnBoard(row, column) {
    if (row < 1 || row > 8) return undefined
    if (column < 1 || column > 8) return undefined
    const index = row * 8 - 8 + column
    return this.getItem(position(index))
  }

  static { this.declareProp("isForcedToJump", { readsFrom: ["checkers_room"] }) }
  get isForcedToJump() {
    return this.any((square) => square.piece !== undefined && square.piece.side === this.turn && square.piece.hasAJump)
  }

  static { this.declareProp("hasAMove", { readsFrom: ["checkers_room"] }) }
  get hasAMove() {
    return this.any((square) => square.piece !== undefined && square.piece.canMove)
  }

  static { this.declareProp("diagram", { readsFrom: ["checkers_room"] }) }
  get diagram() {
    const letters = new List({ instanceType: "text" })
    this.forEach((square) => letters.append(!square.isEmpty ? square.piece.letter : ""))
    return letters
  }

  reset() {
    this.forEach((square) => core.clear(square))
    this.turn = "black"
    this.winner = "nobody"
    this.jumper = undefined
    this.pickedPiece = undefined
  }

  startANewGameOnBoard() {
    this.reset()
    this.filter((square) => square.shade === "dark").forEach((square) => {
      if (square.row < 4) square.append(new Piece({ side: "red", rank: "man" }))
      if (square.row > 5) square.append(new Piece({ side: "black", rank: "man" }))
    })
  }

  setUpFromDiagram(diagram) {
    this.reset()
    this.forEach(withSpellPositions((square, index) => {
      const letter = core.getItemAt(diagram, position(index))
      if (letter === "b" || letter === "B") square.append(new Piece({ side: "black" }))
      if (letter === "r" || letter === "R") square.append(new Piece({ side: "red" }))
      if (letter === "B" || letter === "R") square.piece.rank = "king"
    }))
  }

  get jumpSquare() {
    if (this.jumper === undefined) return 0
    return spellPosition(this.positionOf(this.jumper?.square))
  }

  copyOntoOther(other) {
    other.setUpFromDiagram(this.diagram)
    other.turn = this.turn
    other.winner = this.winner
    if (this.jumpSquare > 0) other.jumper = other.getItem(position(this.jumpSquare))?.piece
  }

  endTheTurnOnBoard() {
    this.jumper = undefined
    this.turn = this.turn === "black" ? "red" : "black"
    if (!this.hasAMove) this.winner = this.turn === "black" ? "red" : "black"
  }

  putASideRankAtRowAndColumnOnBoard(
    side,
    rank,
    row,
    column
  ) {
    core.append(this.theSquareAtRowAndColumnOnBoard(row, column), new Piece({ side: side, rank: rank }))
  }

  static { this.declareProp("moves", { readsFrom: ["checkers_room"] }) }
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

  playForTheComputerOnBoard() {
    const choices = this.moves
    if (core.isEmpty(choices)) return
    const best = core.getItemAt(core.sortedBy(choices, (item) => item.points), -1)
    const chosen = core.randomItemOf(core.filter(choices, (move) => move.points === best?.points))
    return chosen?.piece?.moveToSquare(chosen?.square)
  }

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
    core.expect(board.theSquareAtRowAndColumnOnBoard(6, 7).piece.canGoToSquare(board.theSquareAtRowAndColumnOnBoard(5, 6)), `the piece of (the square at 6 and 7 on board) can go to (the square at 5 and 6 on board)`, false, `no`)
    core.echoTestAction(`set jumper to the piece of (the square at 6 and 3 on board)`)
    const jumper = board.theSquareAtRowAndColumnOnBoard(6, 3).piece
    core.expect(jumper.canGoToSquare(board.theSquareAtRowAndColumnOnBoard(5, 2)), `jumper can go to (the square at 5 and 2 on board)`, false, `no`)
    core.expect(jumper.canGoToSquare(board.theSquareAtRowAndColumnOnBoard(4, 5)), `jumper can go to (the square at 4 and 5 on board)`, true, `yes`)
    core.echoTestAction(`move jumper to the square at 4 and 5 on board`)
    jumper.moveToSquare(board.theSquareAtRowAndColumnOnBoard(4, 5))
    core.expect(core.isEmpty(board.theSquareAtRowAndColumnOnBoard(5, 4)), `the square at 5 and 4 on board is empty`, true, `yes`)
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
export class Move extends Thing {
  static { this.declareProp("piece", { type: "Piece" }) }
  get piece() { return this.getProp("piece") }
  set piece(value) { this.setProp("piece", value) }

  static { this.declareProp("square", { type: "Square" }) }
  get square() { return this.getProp("square") }
  set square(value) { this.setProp("square", value) }

  static { this.declareProp("points", { type: "number" }) }
  get points() { return this.getProp("points") }
  set points(value) { this.setProp("points", value) }

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
    core.answered(board.playForTheComputerOnBoard())
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
    core.answered(board.playForTheComputerOnBoard())
    core.expect(board.theSquareAtRowAndColumnOnBoard(4, 3).piece !== undefined, `the piece of (the square at 4 and 3 on board) exists`, true, `yes`)
  })
}
// -----------
export class Table extends Thing {
  static { this.declareProp("diagram", { itemType: "text", init: () => new List({ instanceType: "text" }) }) }
  get diagram() { return this.getProp("diagram") }
  set diagram(value) { this.setProp("diagram", value) }

  static { this.declareProp("turn", { type: "text" }) }
  get turn() { return this.getProp("turn") }
  set turn(value) { this.setProp("turn", value) }

  static { this.declareProp("winner", { type: "text" }) }
  get winner() { return this.getProp("winner") }
  set winner(value) { this.setProp("winner", value) }

  static { this.declareProp("jumpSquare", { type: "number" }) }
  get jumpSquare() { return this.getProp("jumpSquare") }
  set jumpSquare(value) { this.setProp("jumpSquare", value) }

  static { this.declareProp("blackSeat", { type: "text" }) }
  get blackSeat() { return this.getProp("blackSeat") }
  set blackSeat(value) { this.setProp("blackSeat", value) }

  static { this.declareProp("redSeat", { type: "text" }) }
  get redSeat() { return this.getProp("redSeat") }
  set redSeat(value) { this.setProp("redSeat", value) }

  showOnBoard(board) {
    board.setUpFromDiagram(this.diagram)
    board.turn = this.turn
    board.winner = this.winner
    if (this.jumpSquare > 0) board.jumper = board.getItem(position(this.jumpSquare))?.piece
    board.copyOntoOther(checkers.turnedBoard)
  }

  onSomeoneElseChange(event) {
    if (this === checkers.table) this.showOnBoard(checkers.board)
  }

  static savedIn = {
    place: "checkers_room",
    collection: "tables",
    times: ["created", "modified"]
  }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}
core.describeAction(Table, "showOnBoard", { title: "Show Table on Board", undoneAs: "Show Table on Board" })

export class CheckersRoom extends Place {}
export const checkersRoom = core.place(new CheckersRoom(), {
  name: "checkers_room",
  kind: "room",
  at: "/api/rooms/spaces/owen@spell/tables"
})

// -----------
export class Checker extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static Opponents = ["computer", "yourself", "someone"]
  static { this.declareProp("opponent", { oneOf: Checker.Opponents }) }
  get opponent() { return this.getProp("opponent") }
  set opponent(value) { this.setProp("opponent", value) }

  static { this.declareProp("board", { init: () => new Board({ id: "board" }), early: true }) }
  get board() { return this.getProp("board") }
  set board(value) { this.setProp("board", value) }

  static { this.declareProp("turnedBoard", { init: () => new Board({ id: "turned-board", turned: true }), early: true }) }
  get turnedBoard() { return this.getProp("turnedBoard") }
  set turnedBoard(value) { this.setProp("turnedBoard", value) }

  static { this.declareProp("seat", { type: "text" }) }
  get seat() { return this.getProp("seat") }
  set seat(value) { this.setProp("seat", value) }

  static { this.declareProp("table", { type: "Table" }) }
  get table() { return this.getProp("table") }
  set table(value) { this.setProp("table", value) }

  create() {
    this.seat = core.joined("tab ", core.randomNumber(1, 999999), " ")
    this.board.startANewGameOnBoard()
    this.board.copyOntoOther(this.turnedBoard)
  }

  static { this.declareProp("side", { readsFrom: ["checkers_room"] }) }
  get side() {
    if (this.table !== undefined && this.table.blackSeat === this.seat) return "black"
    if (this.table !== undefined && this.table.redSeat === this.seat) return "red"
    return "nobody"
  }

  static { this.declareProp("message", { readsFrom: ["checkers_room"] }) }
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

  playTheComputer() {
    this.opponent = "computer"
    this.table = undefined
    this.startANewGame()
  }
  get playTheComputerIsSelected() {
    return this.opponent === "computer"
  }

  playYourself() {
    this.opponent = "yourself"
    this.table = undefined
    this.startANewGame()
  }
  get playYourselfIsSelected() {
    return this.opponent === "yourself"
  }

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

  startANewGame() {
    this.board.startANewGameOnBoard()
    this.board.copyOntoOther(this.turnedBoard)
    if (this.table !== undefined) {
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
