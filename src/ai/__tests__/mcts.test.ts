import { createHexBoard, legalMoves, placeStone, toIndex } from '../hexBoard';
import { search, decideSwap } from '../mcts';
import { HexagonState } from '../../types';

describe('search', () => {
  it('takes an immediate winning move on a small board', () => {
    // 5x5 board; Black needs row 0..4 connected. Fill rows 0-3, col 0 with
    // Black: (3,0)'s only in-bounds "row+1" neighbor is (4,0) (its other
    // row+1 neighbor, (4,-1), is off-board), so (4,0) is the unique move
    // that completes a top-bottom connection.
    const size = 5;
    const board = createHexBoard(size);
    for (let row = 0; row < 4; row += 1) {
      placeStone(board, toIndex(row, 0, size), HexagonState.BLACK);
    }
    // a couple of harmless White stones elsewhere
    placeStone(board, toIndex(0, 4, size), HexagonState.WHITE);
    placeStone(board, toIndex(1, 4, size), HexagonState.WHITE);

    const { move } = search(board, HexagonState.BLACK, {
      budgetMs: 300,
      maxIterations: 500,
    });

    expect(move).toBe(toIndex(4, 0, size));
  });

  it('blocks an immediate loss', () => {
    // White (left-right) has two groups along row 2: (2,0)-(2,1) touching
    // the left border, and (2,3)-(2,4) touching the right border. They are
    // not yet connected to each other; only (2,2) joins them into a winning
    // left-right chain, so Black must play there or lose next ply.
    const size = 5;
    const board = createHexBoard(size);
    [0, 1, 3, 4].forEach((col) => {
      placeStone(board, toIndex(2, col, size), HexagonState.WHITE);
    });
    placeStone(board, toIndex(0, 0, size), HexagonState.BLACK);
    placeStone(board, toIndex(4, 4, size), HexagonState.BLACK);

    const { move } = search(board, HexagonState.BLACK, {
      budgetMs: 300,
      maxIterations: 500,
    });

    expect(move).toBe(toIndex(2, 2, size));
  });

  it('always returns a legal (empty) move', () => {
    const size = 6;
    const board = createHexBoard(size);
    // Scatter some stones, leaving a modest set of empty cells.
    [
      [0, 0],
      [1, 2],
      [2, 4],
      [3, 1],
      [4, 3],
    ].forEach(([row, col], i) => {
      placeStone(
        board,
        toIndex(row, col, size),
        i % 2 === 0 ? HexagonState.BLACK : HexagonState.WHITE,
      );
    });

    const empties = new Set(legalMoves(board));
    const { move, value } = search(board, HexagonState.BLACK, {
      budgetMs: 300,
      maxIterations: 300,
    });

    expect(empties.has(move)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });

  it('completes a search on an empty board without crashing', () => {
    const size = 7;
    const board = createHexBoard(size);
    const { move, value } = search(board, HexagonState.BLACK, {
      budgetMs: 500,
    });
    expect(move).toBeGreaterThanOrEqual(0);
    expect(move).toBeLessThan(size * size);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });
});

describe('decideSwap', () => {
  // A small board keeps simulation noise low enough for raw random-rollout
  // MCTS to reliably detect that the center is a strong opening within a
  // realistic search budget; on larger boards this same judgment needs more
  // computation than a single test should spend (see the AI design plan's
  // notes on strength scaling with board size).
  it('prefers swapping when the lone opening stone is the strong center cell', () => {
    const size = 5;
    const board = createHexBoard(size);
    const center = Math.floor(size / 2);
    placeStone(board, toIndex(center, center, size), HexagonState.BLACK);

    const { swap, declineMove } = decideSwap(board, HexagonState.WHITE, {
      budgetMs: 1200,
    });

    expect(swap).toBe(true);
    expect(legalMoves(board)).toContain(declineMove);
  }, 10000);
});
