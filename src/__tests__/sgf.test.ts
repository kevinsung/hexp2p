import gameStateToSgf from '../sgf';
import { GameState, HexagonState } from '../types';

const baseState: GameState = {
  settings: { boardSize: 14, useSwapRule: false },
  moveHistory: [],
  moveNumber: 0,
  swapped: false,
  swapPhaseComplete: false,
  selectedHexagon: [NaN, NaN],
  resignationState: HexagonState.EMPTY,
};

function withMoves(
  moves: Array<Array<number>>,
  overrides: Partial<GameState> = {},
): GameState {
  return { ...baseState, moveHistory: moves, ...overrides };
}

describe('gameStateToSgf', () => {
  it('emits an FF[4] Hex header with the board size', () => {
    const sgf = gameStateToSgf(baseState);
    expect(sgf).toBe('(;FF[4]GM[11]SZ[14]AP[hexp2p])');
  });

  it('alternates B/W with Black moving first', () => {
    const sgf = gameStateToSgf(
      withMoves([
        [2, 2],
        [0, 0],
        [4, 4],
      ]),
    );
    expect(sgf).toBe('(;FF[4]GM[11]SZ[14]AP[hexp2p];B[c3];W[a1];B[e5])');
  });

  it('does not skip the letter i in the coordinate alphabet', () => {
    // Column index 8 -> 'i' (no skipping), row index 0 -> row number 1.
    const sgf = gameStateToSgf(withMoves([[0, 8]]));
    expect(sgf).toContain(';B[i1]');
  });

  it('encodes the row as a multi-digit number', () => {
    // Column index 2 -> 'c', row index 9 -> row number 10.
    const sgf = gameStateToSgf(withMoves([[9, 2]]));
    expect(sgf).toContain(';B[c10]');
  });

  it('emits the swap as B[original]W[swap-pieces] when swapped', () => {
    // The opening is stored transposed ([origCol, origRow]); it is emitted as
    // Black at its original cell (un-transposed) followed by the swap-pieces
    // reflection token, keeping a legal Black-first move order.
    const sgf = gameStateToSgf(
      withMoves(
        [
          [1, 2],
          [3, 3],
        ],
        { swapped: true },
      ),
    );
    expect(sgf).toBe(
      '(;FF[4]GM[11]SZ[14]AP[hexp2p];B[b3];W[swap-pieces];B[d4])',
    );
  });

  it('emits the swap-pieces token exactly once with Black moving first', () => {
    const sgf = gameStateToSgf(withMoves([[1, 2]], { swapped: true }));
    expect(sgf).toBe('(;FF[4]GM[11]SZ[14]AP[hexp2p];B[b3];W[swap-pieces])');
    expect(sgf.match(/swap-pieces/g)).toHaveLength(1);
  });

  it('adds RE[W+Resign] when Black resigned', () => {
    const sgf = gameStateToSgf(
      withMoves([[0, 0]], { resignationState: HexagonState.BLACK }),
    );
    expect(sgf).toContain('RE[W+Resign]');
  });

  it('adds RE[B+Resign] when White resigned', () => {
    const sgf = gameStateToSgf(
      withMoves([[0, 0]], { resignationState: HexagonState.WHITE }),
    );
    expect(sgf).toContain('RE[B+Resign]');
  });
});
