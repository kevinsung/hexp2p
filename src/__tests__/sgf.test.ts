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
    expect(sgf).toBe('(;FF[4]GM[11]SZ[14]AP[hexp2p];B[cc];W[aa];B[ee])');
  });

  it('does not skip the letter i in the coordinate alphabet', () => {
    // Column index 8 -> 'i' (no skipping), row index 0 -> 'a'.
    const sgf = gameStateToSgf(withMoves([[0, 8]]));
    expect(sgf).toContain(';B[ia]');
  });

  it('encodes the row as a letter beyond single digits', () => {
    // Column index 2 -> 'c', row index 9 -> 'j'.
    const sgf = gameStateToSgf(withMoves([[9, 2]]));
    expect(sgf).toContain(';B[cj]');
  });

  it('flips colors and uses the transposed opening move when swapped', () => {
    // After a swap the opening move is stored transposed and the parity flips,
    // so history index 0 becomes White.
    const sgf = gameStateToSgf(
      withMoves(
        [
          [1, 2],
          [3, 3],
        ],
        { swapped: true },
      ),
    );
    expect(sgf).toBe('(;FF[4]GM[11]SZ[14]AP[hexp2p];W[cb];B[dd])');
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
