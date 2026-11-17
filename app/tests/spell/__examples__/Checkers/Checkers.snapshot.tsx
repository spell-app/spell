import { core, Thing, List, App, View, ViewableList, Place, prop, derived, thing, drawn, position, withSpellPositions, spellPosition, type SentEvent } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

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

export type Side = (typeof Piece.Sides)[number]
export type Rank = (typeof Piece.Ranks)[number]

/** A checker:  a man, until it reaches the far row and is crowned a king. */
export class Piece extends View {
  static elementTag = core.defineElement(this, "test-project")

  // - its "side" is one of black or red
  static Sides = ["black", "red"] as const
  @prop({ oneOf: () => Piece.Sides })
  accessor side!: Side

  // - its "rank" is one of man or king
  static Ranks = ["man", "king"] as const
  @prop({ oneOf: () => Piece.Ranks })
  accessor rank!: Rank

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
  canJumpToSquare(square: Square) {
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
  @derived get hasAJump() {
    return this.square.board.any((square) => this.canJumpToSquare(square))
  }

  /** Whether it's a move the rules allow:  a step, or a jump when it must */
  canGoToSquare(square: Square) {
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
  @derived get canMove() {
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
  moveToSquare(square: Square) {
    // - then it's crowned on the far row, or jumps again while it can, or the other side's turn comes
    if (!this.canGoToSquare(square)) core.cancel()
    const board = square.board
    const start = this.square
    const jumped = core.absoluteValue(square.row - start.row) === 2
    if (jumped) {
      const middle = board.theSquareAtRowAndColumnOnBoard((start.row + square.row) / 2, (start.column + square.column) / 2)
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
  wouldBeSafeOnSquare(square: Square) {
    /** inside the loop `its` is the square beside:  so its side and where it stands are named first */
    const board = this.square.board
    const ownSide = this.side
    const left = this.square
    let threats: number = 0
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
  async afterMoveToSquare(square: Square) {
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
  @drawn draw() {
    if (this.isAKing) return <ui-icon name="crown" />
  }

  /** picked, to move with the next click;  a second click puts it down */
  onClick(event: ClickEvent) {
    const board = this.square.board
    if (board.pickedPiece === this) board.pickedPiece = undefined
    else if (this.canMove && this.isYours) board.pickedPiece = this
  }

  static draggable = true

  get square() {
    return Square.ownerOf(this)!
  }

  get lastSquare() {
    return Square.lastOwnerOf(this)
  }
}

/**
 * `<test-project-piece>`:  a piece, drawn in its own element, e.g. by `draw the piece`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its piece's properties;  its methods call its piece's.
 * - What every view's element does, e.g. drawing its piece, is `SpellElement`'s.
 */
export class PieceElement extends SpellElement<Piece> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-piece", "piece", [
    { name: "side", kind: "string", description: "Its side." },
    { name: "rank", kind: "string", description: "Its rank." }
  ])

  canJumpToSquare(square: Square) {
    return this.currentThing?.canJumpToSquare(square)
  }

  canGoToSquare(square: Square) {
    return this.currentThing?.canGoToSquare(square)
  }

  moveToSquare(square: Square) {
    return this.currentThing?.moveToSquare(square)
  }

  wouldBeSafeOnSquare(square: Square) {
    return this.currentThing?.wouldBeSafeOnSquare(square)
  }

  afterMoveToSquare(square: Square) {
    return this.currentThing?.afterMoveToSquare(square)
  }

  onClick(event: ClickEvent) {
    return this.currentThing?.onClick(event)
  }
}
core.useElement(Piece, PieceElement)
core.addAfterHook(Piece, "moveToSquare", { hook: "afterMoveToSquare" })

export type Shade = (typeof Square.Shades)[number]

/** One of the board's 64, by its row and column:  row 1 at the top, column 1 on the left. */
export class Square extends ViewableList<Piece> {
  static instanceType = Piece
  static elementTag = core.defineElement(this, "test-project")

  /** Only the 32 dark ones are played on;  each holds one piece, or none. */
  // - its "row" is a number
  @prop({ type: "number" })
  accessor row!: number

  // - its "column" is a number
  @prop({ type: "number" })
  accessor column!: number

  /** set as the board is made:  dark where its row and column add up to an odd number */
  // - its "shade" is one of light or dark
  //   -- set as the board is made: dark where its row and column add up to an odd number
  static Shades = ["light", "dark"] as const
  @prop({ oneOf: () => Square.Shades })
  accessor shade!: Shade

  get piece() {
    return this.firstItem
  }

  /** Whether it touches the square at a corner:  one row and one column away */
  isNextToSquare(square: Square) {
    return core.absoluteValue(this.row - square.row) === 1 && core.absoluteValue(this.column - square.column) === 1
  }

  /** Whether the picked piece can go there:  it lights up (styles.css) */
  static { this.declareProp("lit", { declaredAt: { path: "/Drawing.spell", start: 699, end: 890 }, readsFrom: ["checkers_room"] }) }
  get lit() {
    if (this.board.pickedPiece !== undefined && this.board.pickedPiece.canGoToSquare(this)) return true
    return false
  }

  /** its piece, and a dot where the picked piece can go */
  @drawn draw() {
    return [
      <slot />,
      this.lit ? <ui-icon class="Target" name="circle" color="yellow" /> : undefined
    ]
  }

  whenPieceDroppedOn(piece: Piece) {
    piece.moveToSquare(this)
  }

  /** a click where the picked piece can go moves it there */
  onClick(event: ClickEvent) {
    if (this.lit) this.board.pickedPiece?.moveToSquare(this)
  }

  static droppable = true

  static exclusive = true

  get board() {
    return Board.ownerOf(this)!
  }

  get lastBoard() {
    return Board.lastOwnerOf(this)
  }

  canGiveUp(piece: Piece) {
    return piece.canMove && piece.isYours
  }

  static itemsDraggable = true

  canTake(piece: Piece) {
    return piece.canGoToSquare(this)
  }

  static droppable = true
}

/**
 * `<test-project-square>`:  a square, drawn in its own element, e.g. by `draw the square`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its square's properties;  its methods call its square's.
 * - What every view's element does, e.g. drawing its square, is `SpellElement`'s.
 */
export class SquareElement extends SpellElement<Square> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-square", "square", [
    { name: "row", kind: "number", description: "Its row." },
    { name: "column", kind: "number", description: "Its column." },
    { name: "shade", kind: "string", description: "Its shade." }
  ])

  isNextToSquare(square: Square) {
    return this.currentThing?.isNextToSquare(square)
  }

  whenPieceDroppedOn(piece: Piece) {
    return this.currentThing?.whenPieceDroppedOn(piece)
  }

  onClick(event: ClickEvent) {
    return this.currentThing?.onClick(event)
  }

  canGiveUp(piece: Piece) {
    return this.currentThing?.canGiveUp(piece)
  }

  canTake(piece: Piece) {
    return this.currentThing?.canTake(piece)
  }
}
core.useElement(Square, SquareElement)

export type Turn = (typeof Board.Turns)[number]
export type Winner = (typeof Board.Winners)[number]

/** The 64 squares, a game on them, and whose turn it is */
@thing
export class Board extends ViewableList<Square> {
  static instanceType = Square
  static elementTag = core.defineElement(this, "test-project")

  // - its "turn" is one of black or red
  static Turns = ["black", "red"] as const
  @prop({ oneOf: () => Board.Turns })
  accessor turn!: Turn

  // - its "winner" is one of nobody, black or red
  static Winners = ["nobody", "black", "red"] as const
  @prop({ oneOf: () => Board.Winners })
  accessor winner!: Winner

  /** Drawn turned round, red's side nearest:  the other player's view of the same game */
  // - its "turned" is yes or no
  //   -- Drawn turned round, red's side nearest: the other player's view of the same game
  @prop({ type: "choice" })
  accessor turned!: boolean

  /** The piece clicked, to move with the next click */
  // - its "picked piece" is a piece
  //   -- The piece clicked, to move with the next click
  @prop({ type: "Piece" })
  accessor pickedPiece!: Piece

  /** The piece in the middle of jumps:  only it may move, and only to jump again */
  // - its "jumper" is a piece
  //   -- The piece in the middle of jumps: only it may move, and only to jump again
  @prop({ type: "Piece" })
  accessor jumper!: Piece

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
  theSquareAtRowAndColumnOnBoard(row: number, column: number) {
    if (row < 1 || row > 8) return undefined
    if (column < 1 || column > 8) return undefined
    const index = row * 8 - 8 + column
    return this.getItem(position(index))
  }

  /** Whether the side whose turn it is has a jump to make:  then it must make one */
  static { this.declareProp("isForcedToJump", { declaredAt: { path: "/Board.spell", start: 3405, end: 3635 }, readsFrom: ["checkers_room"] }) }
  @derived get isForcedToJump() {
    return this.any((square) => square.piece !== undefined && square.piece.side === this.turn && square.piece.hasAJump)
  }

  /** Whether the side whose turn it is can move at all:  with none, it has lost */
  static { this.declareProp("hasAMove", { declaredAt: { path: "/Board.spell", start: 4871, end: 5039 }, readsFrom: ["checkers_room"] }) }
  @derived get hasAMove() {
    return this.any((square) => square.piece !== undefined && square.piece.canMove)
  }

  /** Each square's piece as a letter, top left to bottom right:  "" for an empty one */
  static { this.declareProp("diagram", { declaredAt: { path: "/Board.spell", start: 5042, end: 5320 }, readsFrom: ["checkers_room"] }) }
  @derived get diagram() {
    const letters = new List<string>({ instanceType: "text" })
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
  setUpFromDiagram(diagram: any /* spell: list */) {
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
    return spellPosition(this.positionOf(this.jumper?.square!))
  }

  /** The other board shows the same game:  its pieces, whose turn it is, who's won, and which piece is jumping */
  copyOntoOther(other: Board) {
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
  putASideRankAtRowAndColumnOnBoard(side: string, rank: string, row: number, column: number) {
    core.append(this.theSquareAtRowAndColumnOnBoard(row, column), new Piece({ side: side, rank: rank }))
  }

  /** Every move the side whose turn it is can make, with its points */
  static { this.declareProp("moves", { declaredAt: { path: "/Computer.spell", start: 2280, end: 2726 }, readsFrom: ["checkers_room"] }) }
  @derived get moves() {
    let found = new List<Move>({ instanceType: "Move" })
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
    const best = core.getItemAt<Move>(core.sortedBy(choices, (item: Move) => item.points), -1)
    const chosen = core.randomItemOf<Move>(core.filter(choices, (move: Move) => move.points === best?.points))
    return chosen?.piece?.moveToSquare(chosen?.square!)
  }

  /** The table takes the board's game, so the other tab sees it */
  shareInTable(table: Table) {
    table.diagram = this.diagram
    table.turn = this.turn
    table.winner = this.winner
    table.jumpSquare = this.jumpSquare
  }

  static exclusive = true
}

/**
 * `<test-project-board>`:  a board, drawn in its own element, e.g. by `draw the board`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its board's properties;  its methods call its board's.
 * - What every view's element does, e.g. drawing its board, is `SpellElement`'s.
 */
export class BoardElement extends SpellElement<Board> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-board", "board", [
    { name: "turn", kind: "string", description: "Its turn." },
    { name: "winner", kind: "string", description: "Its winner." },
    { name: "turned", kind: "boolean", description: "Its turned." },
    { name: "picked-piece", kind: "string", description: "Its pickedPiece." },
    { name: "jumper", kind: "string", description: "Its jumper." }
  ])

  create() {
    return this.currentThing?.create()
  }

  theSquareAtRowAndColumnOnBoard(row: number, column: number) {
    return this.currentThing?.theSquareAtRowAndColumnOnBoard(row, column)
  }

  reset() {
    return this.currentThing?.reset()
  }

  startANewGameOnBoard() {
    return this.currentThing?.startANewGameOnBoard()
  }

  setUpFromDiagram(diagram: any /* spell: list */) {
    return this.currentThing?.setUpFromDiagram(diagram)
  }

  copyOntoOther(other: Board) {
    return this.currentThing?.copyOntoOther(other)
  }

  endTheTurnOnBoard() {
    return this.currentThing?.endTheTurnOnBoard()
  }

  putASideRankAtRowAndColumnOnBoard(side: string, rank: string, row: number, column: number) {
    return this.currentThing?.putASideRankAtRowAndColumnOnBoard(side, rank, row, column)
  }

  playForTheComputerOnBoard() {
    return this.currentThing?.playForTheComputerOnBoard()
  }

  shareInTable(table: Table) {
    return this.currentThing?.shareInTable(table)
  }
}
core.useElement(Board, BoardElement)
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
    board.putASideRankAtRowAndColumnOnBoard("black", "man", 6, 3)
    core.echoTestAction(`put a "red" "man" at 5 and 4 on board`)
    board.putASideRankAtRowAndColumnOnBoard("red", "man", 5, 4)
    core.echoTestAction(`put a "black" "man" at 6 and 7 on board`)
    board.putASideRankAtRowAndColumnOnBoard("black", "man", 6, 7)
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
    board.putASideRankAtRowAndColumnOnBoard("black", "man", 7, 2)
    core.echoTestAction(`put a "red" "man" at 6 and 3 on board`)
    board.putASideRankAtRowAndColumnOnBoard("red", "man", 6, 3)
    core.echoTestAction(`put a "red" "man" at 4 and 5 on board`)
    board.putASideRankAtRowAndColumnOnBoard("red", "man", 4, 5)
    core.echoTestAction(`put a "red" "man" at 1 and 8 on board`)
    board.putASideRankAtRowAndColumnOnBoard("red", "man", 1, 8)
    core.echoTestAction(`set jumper to the piece of (the square at 7 and 2 on board)`)
    const jumper = board.theSquareAtRowAndColumnOnBoard(7, 2).piece
    core.echoTestAction(`move jumper to the square at 5 and 4 on board`)
    jumper.moveToSquare(board.theSquareAtRowAndColumnOnBoard(5, 4))
    // still black's turn:  the same piece jumps again
    core.expect(board.turn, `the turn of board`, "black", `black`)
    core.expect(board.jumper!, `the jumper of board`, jumper, `jumper`)
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
    board.putASideRankAtRowAndColumnOnBoard("black", "man", 2, 3)
    core.echoTestAction(`put a "red" "man" at 5 and 8 on board`)
    board.putASideRankAtRowAndColumnOnBoard("red", "man", 5, 8)
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
  @prop({ type: "Piece" })
  accessor piece!: Piece

  // - its "square" is a square
  @prop({ type: "Square" })
  accessor square!: Square

  // - its "points" is a number
  @prop({ type: "number" })
  accessor points!: number

  /** What a move is worth to the computer */
  thePointsForMove() {
    const mover = this.piece
    const target = this.square
    let score: number = 0
    if (mover?.canJumpToSquare(target!)) score = score + 10
    if (!mover?.isAKing && target?.row === mover?.farRow) score = score + 5
    if (mover?.wouldBeSafeOnSquare(target!)) score = score + 2
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
    board.putASideRankAtRowAndColumnOnBoard("red", "man", 3, 4)
    core.echoTestAction(`put a "black" "man" at 4 and 5 on board`)
    board.putASideRankAtRowAndColumnOnBoard("black", "man", 4, 5)
    core.echoTestAction(`put a "black" "man" at 7 and 2 on board`)
    board.putASideRankAtRowAndColumnOnBoard("black", "man", 7, 2)
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
    board.putASideRankAtRowAndColumnOnBoard("red", "man", 3, 4)
    core.echoTestAction(`put a "black" "man" at 6 and 7 on board`)
    board.putASideRankAtRowAndColumnOnBoard("black", "man", 6, 7)
    /** going to 4 and 5 walks into a jump from 5 and 6 later;  4 and 3 is safe now */
    const man = board.theSquareAtRowAndColumnOnBoard(3, 4).piece
    core.expect(man.wouldBeSafeOnSquare(board.theSquareAtRowAndColumnOnBoard(4, 5)), `man would be safe on (the square at 4 and 5 on board)`, true, `yes`)
    core.echoTestAction(`put a "black" "man" at 5 and 6 on board`)
    board.putASideRankAtRowAndColumnOnBoard("black", "man", 5, 6)
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
  @prop({ itemType: "text", init: () => new List<string>({ instanceType: "text" }), declaredAt: { path: "/Checkers.api.spell", start: 702, end: 816 } })
  accessor diagram!: List<string>

  // - its "turn" is text
  @prop({ type: "text", declaredAt: { path: "/Checkers.api.spell", start: 818, end: 836 } })
  accessor turn!: string

  // - its "winner" is text
  @prop({ type: "text", declaredAt: { path: "/Checkers.api.spell", start: 838, end: 858 } })
  accessor winner!: string

  /** Where the piece in the middle of jumps is, by its square's place:  0 for none */
  // - its "jump square" is a number
  //   -- Where the piece in the middle of jumps is, by its square's place: 0 for none
  @prop({ type: "number", declaredAt: { path: "/Checkers.api.spell", start: 860, end: 972 } })
  accessor jumpSquare!: number

  /** The tab playing black:  its seat */
  // - its "black seat" is text
  //   -- The tab playing black: its seat
  @prop({ type: "text", declaredAt: { path: "/Checkers.api.spell", start: 974, end: 1036 } })
  accessor blackSeat!: string

  /** The tab playing red */
  // - its "red seat" is text
  //   -- The tab playing red
  @prop({ type: "text", declaredAt: { path: "/Checkers.api.spell", start: 1038, end: 1085 } })
  accessor redSeat!: string

  /** The board takes the table's game:  both of this tab's boards show it */
  showOnBoard(board: Board) {
    board.setUpFromDiagram(this.diagram)
    board.turn = this.turn
    board.winner = this.winner
    if (this.jumpSquare > 0) board.jumper = board.getItem(position(this.jumpSquare))?.piece
    board.copyOntoOther(checkers.turnedBoard)
  }

  /** the other tab moved:  this tab's boards show it */
  onSomeoneElseChange(event: any /* spell: type unknown */) {
    if (this === checkers.table) this.showOnBoard(checkers.board)
  }

  static savedIn = {
    place: "checkers_room",
    collection: "tables",
    times: ["created", "modified"]
  }

  // - it lives in the checkers room
  @prop({ type: "date", declaredAt: { path: "/Checkers.api.spell", start: 671, end: 700 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in the checkers room
  @prop({ type: "date", declaredAt: { path: "/Checkers.api.spell", start: 671, end: 700 } })
  accessor modified!: any /* spell: type unknown */
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

export type Opponent = (typeof Checker.Opponents)[number]

@thing
export class Checker extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  /** Who black plays:  the computer, yourself on a second board turned round, or someone in another tab */
  // - its "opponent" is one of computer, yourself or someone
  //   -- Who black plays: the computer, yourself on a second board turned round, or someone in another tab
  static Opponents = ["computer", "yourself", "someone"] as const
  @prop({ oneOf: () => Checker.Opponents })
  accessor opponent!: Opponent

  // "board" is a new board
  @prop({ init: () => new Board({ id: "board" }), early: true })
  accessor board!: Board

  /** The same game, turned round:  red's view of it */
  // "turned board" is a new board with turned = yes
  //   -- The same game, turned round: red's view of it
  @prop({ init: () => new Board({ id: "turned-board", turned: true }), early: true })
  accessor turnedBoard!: Board

  /** This tab's own name at a table, made up as it opens:  so the table knows which seat it took */
  // - its "seat" is text
  //   -- This tab's own name at a table, made up as it opens: so the table knows which seat it took
  @prop({ type: "text" })
  accessor seat!: string

  /** The table this tab sits at, against someone in another tab */
  // - its "table" is a table
  //   -- The table this tab sits at, against someone in another tab
  @prop({ type: "Table" })
  accessor table!: Table

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
    const turn = core.titleCase(game.turn) as string
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
    let found = core.getItemAt<Table>(await core.savedThings(Table), 0)
    if (found === undefined) {
      found = new Table()
      this.board.shareInTable(found!)
      core.saveThing(found!)
    }
    if (found?.blackSeat === "") found!.blackSeat = this.seat
    else if (found?.redSeat === "" && found?.blackSeat !== this.seat) found!.redSeat = this.seat
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
        this.table!.blackSeat = this.seat
        this.table!.redSeat = ""
      }
      this.board.shareInTable(this.table)
    }
  }

  @drawn draw() {
    return (
      <ui-container>
        <ui-stack>
          <ui-toolbar class="Bar" appearance="pills" shrinkable={true}>
            <ui-text size="big" slot="title" heavy={true}>Checkers</ui-text>
            <spacer />
            {core.drawAction(this, "startANewGame", { "in-menu": true })}
            {core.drawAction(this, "undo", { "icon-only": true, "in-menu": true })}
            {core.drawAction(this, "redo", { "icon-only": true, "in-menu": true })}
          </ui-toolbar>
          <ui-toolbar class="Opponents" appearance="pills" size="small" aria-label="Who you play">
            {core.drawAction(this, "playTheComputer", { "in-menu": true })}
            {core.drawAction(this, "playYourself", { "in-menu": true })}
            {core.drawAction(this, "playSomeone", { "in-menu": true })}
          </ui-toolbar>
          <ui-header class="Message" level="3">{this.message}</ui-header>
          <slot name="boards">{this.drawBoards()}</slot>
        </ui-stack>
      </ui-container>
    )
  }

  drawBoards() {
    // one board against the computer;  against yourself both, side by side;  against someone, your side nearest you
    if (this.opponent === "yourself") {
      return (
        <ui-stack class="Boards" direction="horizontal" wrap={true} part="boards">
          <test-project-board id="board" />
          <test-project-board id="turned-board" />
        </ui-stack>
      )
    } else if (this.opponent === "someone" && this.side === "red") return <test-project-board id="turned-board" part="boards" />
    else return <test-project-board id="board" part="boards" />
  }
}

/**
 * `<test-project-app>`:  a checker, drawn in its own element, e.g. by `draw the checker`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its checker's properties;  its methods call its checker's.
 * - What every view's element does, e.g. drawing its checker, is `SpellElement`'s.
 */
export class CheckerElement extends SpellElement<Checker> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "checker", [
    { name: "opponent", kind: "string", description: "Its opponent." },
    { name: "board", kind: "json", description: "Its board." },
    { name: "turned-board", kind: "json", description: "Its turnedBoard." },
    { name: "seat", kind: "string", description: "Its seat." },
    { name: "table", kind: "string", description: "Its table." }
  ])

  create() {
    return this.currentThing?.create()
  }

  playTheComputer() {
    return this.currentThing?.playTheComputer()
  }

  playYourself() {
    return this.currentThing?.playYourself()
  }

  playSomeone() {
    return this.currentThing?.playSomeone()
  }

  startANewGame() {
    return this.currentThing?.startANewGame()
  }

  drawBoards() {
    return this.currentThing?.drawBoards()
  }
}
core.useElement(Checker, CheckerElement)
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

// what each event this program hears holds
export type ClickEvent = SentEvent

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `PieceElement` */
      "test-project-piece": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `SquareElement` */
      "test-project-square": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `BoardElement` */
      "test-project-board": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
      /** `CheckerElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
