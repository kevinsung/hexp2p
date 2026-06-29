import { createHexBoard, legalMoves, placeStone, toIndex } from '../hexBoard';
import {
  search,
  decideSwap,
  chooseBalancedOpening,
  chooseStrongestOpening,
} from '../mcts';
import { openingCells } from '../openingBook';
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
  // decideSwap now uses precomputed win rates from opening-study.json rather
  // than running MCTS searches, so the results are deterministic and fast.
  // Size 7 is the smallest board covered by the study.
  it('swaps when the opening stone is the strong center cell', () => {
    const size = 7;
    const board = createHexBoard(size);
    const center = Math.floor(size / 2);
    placeStone(board, toIndex(center, center, size), HexagonState.BLACK);

    const { swap } = decideSwap(board, HexagonState.WHITE, { budgetMs: 100 });

    expect(swap).toBe(true);
  });

  it('declines and returns a legal move when the opening stone is a weak corner cell', () => {
    const size = 7;
    const board = createHexBoard(size);
    // (0, 0) has winrate ≈ 0.003 in the study — clearly not worth swapping.
    placeStone(board, toIndex(0, 0, size), HexagonState.BLACK);

    const { swap, declineMove } = decideSwap(board, HexagonState.WHITE, {
      budgetMs: 300,
    });

    expect(swap).toBe(false);
    expect(legalMoves(board)).toContain(declineMove);
  }, 5000);
});

// Builds the expected cell-index pool for the top `size` orbits ranked by
// `rank(winrate)` (ascending). Used by the chooseBalancedOpening and
// chooseStrongestOpening tests to check pool membership without duplicating
// the production orbit logic in a black-box way.
function buildExpectedPool(
  size: number,
  rank: (winrate: number) => number,
): Set<number> {
  const cells = openingCells(size)!;
  // Group into orbits keyed by min(idx, rotIdx).
  const orbits = new Map<number, Array<{ row: number; col: number }>>();
  for (const cell of cells) {
    const idx = toIndex(cell.row, cell.col, size);
    const rotIdx = toIndex(size - 1 - cell.row, size - 1 - cell.col, size);
    const key = Math.min(idx, rotIdx);
    let orbit = orbits.get(key);
    if (orbit === undefined) {
      orbit = [];
      orbits.set(key, orbit);
    }
    orbit.push(cell);
  }
  // Sort orbits by rank of the first member's winrate, take best `size`.
  const sorted = [...orbits.entries()].sort(([, a], [, b]) => {
    const wa = cells.find(
      (c) => c.row === a[0].row && c.col === a[0].col,
    )!.winrate;
    const wb = cells.find(
      (c) => c.row === b[0].row && c.col === b[0].col,
    )!.winrate;
    return rank(wa) - rank(wb);
  });
  const pool = new Set<number>();
  for (const [, orbit] of sorted.slice(0, size)) {
    for (const cell of orbit) {
      pool.add(toIndex(cell.row, cell.col, size));
    }
  }
  return pool;
}

describe('chooseBalancedOpening', () => {
  it('returns a cell from the top-n balanced orbits (closest to winrate 0.5)', () => {
    const size = 11;
    const pool = buildExpectedPool(size, (w) => Math.abs(w - 0.5));
    // Run several times to exercise the randomization.
    for (let i = 0; i < 20; i += 1) {
      const move = chooseBalancedOpening(size);
      expect(pool.has(move)).toBe(true);
    }
  });
});

describe('chooseStrongestOpening', () => {
  it('returns a cell from the top-n strongest orbits (highest winrate)', () => {
    const size = 11;
    const pool = buildExpectedPool(size, (w) => -w);
    for (let i = 0; i < 20; i += 1) {
      const move = chooseStrongestOpening(size);
      expect(pool.has(move)).toBe(true);
    }
  });
});
