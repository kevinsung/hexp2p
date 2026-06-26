import getWinningConnectedComponent from '../../slices/getWinningConnectedComponent';
import { neighbors } from '../../hexAdjacency';
import { HexagonState } from '../../types';
import {
  buildHexBoard,
  colorToMoveAfter,
  createHexBoard,
  legalMoves,
  placeStone,
  toIndex,
  toRowCol,
} from '../hexBoard';

// Independent ground-truth oracle (plain BFS from the relevant border, no
// shared code with hexBoard.ts's union-find) for "does `color` have a
// spanning chain on this board". Used instead of comparing tie-break order
// against getWinningConnectedComponent, since random (non-game-realistic)
// fills can occasionally give *both* colors a spanning chain at once, and
// the two implementations are free to disagree about which one to report
// first in that genuinely ambiguous case.
function spans(
  boardState: Array<Array<HexagonState>>,
  color: HexagonState,
): boolean {
  const size = boardState.length;
  const visited = boardState.map((row) => row.map(() => false));
  const queue: Array<[number, number]> = [];
  for (let i = 0; i < size; i += 1) {
    const [r, c] = color === HexagonState.BLACK ? [0, i] : [i, 0];
    if (boardState[r][c] === color && !visited[r][c]) {
      visited[r][c] = true;
      queue.push([r, c]);
    }
  }
  while (queue.length > 0) {
    const [r, c] = queue.shift() as [number, number];
    if (
      (color === HexagonState.BLACK && r === size - 1) ||
      (color === HexagonState.WHITE && c === size - 1)
    ) {
      return true;
    }
    neighbors([r, c]).forEach(([nr, nc]) => {
      if (
        nr >= 0 &&
        nr < size &&
        nc >= 0 &&
        nc < size &&
        !visited[nr][nc] &&
        boardState[nr][nc] === color
      ) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    });
  }
  return false;
}

// Builds both a HexBoard (union-find based) and the plain 2D array
// spans()/getWinningConnectedComponent expect, from the same random cell
// contents.
function randomFill(size: number): {
  board: ReturnType<typeof createHexBoard>;
  boardState: Array<Array<HexagonState>>;
} {
  const board = createHexBoard(size);
  const boardState: Array<Array<HexagonState>> = [];
  for (let row = 0; row < size; row += 1) {
    const rowState: Array<HexagonState> = [];
    for (let col = 0; col < size; col += 1) {
      const r = Math.random();
      // Sparse fill: dense fills make it likely that *both* colors span at
      // once, which is unreachable in real play (the game stops at the
      // first win) and is exactly the ambiguous case this test avoids.
      const state =
        r < 0.2
          ? HexagonState.BLACK
          : r < 0.4
            ? HexagonState.WHITE
            : HexagonState.EMPTY;
      rowState.push(state);
      if (state !== HexagonState.EMPTY) {
        placeStone(board, toIndex(row, col, size), state);
      }
    }
    boardState.push(rowState);
  }
  return { board, boardState };
}

describe('union-find win detection', () => {
  it('agrees with an independent spanning-chain check over many random boards', () => {
    for (let trial = 0; trial < 300; trial += 1) {
      const size = 5 + (trial % 4); // sizes 5..8
      const { board, boardState } = randomFill(size);

      const blackSpans = spans(boardState, HexagonState.BLACK);
      const whiteSpans = spans(boardState, HexagonState.WHITE);

      const winnerMatchesSpan =
        board.winner === HexagonState.EMPTY
          ? !blackSpans && !whiteSpans
          : board.winner === HexagonState.BLACK
            ? blackSpans
            : whiteSpans;
      expect(winnerMatchesSpan).toBe(true);

      // Cross-check against the app's existing win-detection too, except in
      // the rare double-span case where its first-found tie-break is free to
      // differ from ours (that branch trivially compares board.winner to
      // itself, since unconditionally calling expect() is required by the
      // jest/no-conditional-expect lint rule).
      const doubleSpan = blackSpans && whiteSpans;
      const winningComponent = getWinningConnectedComponent(boardState);
      const referenceWinner = winningComponent.length
        ? boardState[winningComponent[0][0]][winningComponent[0][1]]
        : HexagonState.EMPTY;
      expect(board.winner).toBe(doubleSpan ? board.winner : referenceWinner);
    }
  });
});

describe('legalMoves', () => {
  it('lists exactly the empty cells, and shrinks as stones are placed', () => {
    const size = 6;
    const board = createHexBoard(size);
    expect(legalMoves(board)).toHaveLength(size * size);

    placeStone(board, toIndex(2, 3, size), HexagonState.BLACK);
    const moves = legalMoves(board);
    expect(moves).toHaveLength(size * size - 1);
    expect(moves).not.toContain(toIndex(2, 3, size));
  });
});

describe('buildHexBoard', () => {
  it('matches selectBoardState semantics for move-index-to-color mapping', () => {
    // Mirrors gameSlice.ts's selectBoardState: even move index is the first
    // player (Black) unless swapped.
    const size = 5;
    const moveHistory = [
      [0, 0],
      [1, 1],
      [2, 2],
    ];

    const board = buildHexBoard(size, moveHistory, 3, false);
    expect(board.cells[toIndex(0, 0, size)]).toBe(HexagonState.BLACK);
    expect(board.cells[toIndex(1, 1, size)]).toBe(HexagonState.WHITE);
    expect(board.cells[toIndex(2, 2, size)]).toBe(HexagonState.BLACK);
    expect(colorToMoveAfter(3, false)).toBe(HexagonState.WHITE);

    const swappedBoard = buildHexBoard(size, moveHistory, 3, true);
    expect(swappedBoard.cells[toIndex(0, 0, size)]).toBe(HexagonState.WHITE);
    expect(swappedBoard.cells[toIndex(1, 1, size)]).toBe(HexagonState.BLACK);
    expect(colorToMoveAfter(3, true)).toBe(HexagonState.BLACK);
  });

  it('only applies the first moveCount moves', () => {
    const size = 5;
    const moveHistory = [
      [0, 0],
      [1, 1],
      [2, 2],
    ];
    const board = buildHexBoard(size, moveHistory, 1, false);
    expect(board.cells[toIndex(0, 0, size)]).toBe(HexagonState.BLACK);
    expect(board.cells[toIndex(1, 1, size)]).toBe(HexagonState.EMPTY);
    expect(legalMoves(board)).toHaveLength(size * size - 1);
  });
});

describe('toIndex / toRowCol', () => {
  it('round-trip for every cell on a board', () => {
    const size = 9;
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const index = toIndex(row, col, size);
        expect(toRowCol(index, size)).toEqual([row, col]);
      }
    }
  });
});
