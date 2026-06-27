import gameReducer, {
  moveMade,
  undoMove,
  swapChosen,
} from '../slices/gameSlice';
import { GameState, HexagonState } from '../types';

const initialState: GameState = {
  settings: { boardSize: 14, useSwapRule: true },
  moveHistory: [],
  moveNumber: 0,
  swapped: false,
  swapPhaseComplete: false,
  selectedHexagon: [NaN, NaN],
  resignationState: HexagonState.EMPTY,
};

describe('undoMove', () => {
  it('pops the last move and decrements moveNumber', () => {
    let state = gameReducer(initialState, moveMade([0, 0]));
    state = gameReducer(state, moveMade([1, 1]));

    state = gameReducer(state, undoMove());

    expect(state.moveHistory).toEqual([[0, 0]]);
    expect(state.moveNumber).toBe(1);
  });

  it('resets swapPhaseComplete/swapped when undoing to the swap-decision point', () => {
    // Swap was accepted: [1, 2] transposed to [2, 1], then a follow-up move.
    let state = gameReducer(initialState, moveMade([1, 2]));
    state = gameReducer(state, swapChosen(true)); // moveHistory = [[2, 1]], swapped=true
    state = gameReducer(state, moveMade([3, 3])); // moveNumber = 2

    state = gameReducer(state, undoMove()); // undo [3,3] → land at moveNumber=1

    expect(state.moveNumber).toBe(1);
    expect(state.swapPhaseComplete).toBe(false);
    expect(state.swapped).toBe(false);
    // opening coords should be un-transposed back to the original
    expect(state.moveHistory).toEqual([[1, 2]]);
  });

  it('resets swapPhaseComplete when undoing to the swap-decision point after a decline', () => {
    // Swap was declined (human played instead): moveNumber reaches 2.
    let state = gameReducer(initialState, moveMade([1, 2]));
    state = gameReducer(state, swapChosen(false)); // swapPhaseComplete=true, swapped=false
    state = gameReducer(state, moveMade([3, 3])); // moveNumber = 2

    state = gameReducer(state, undoMove()); // undo [3,3] → land at moveNumber=1

    expect(state.moveNumber).toBe(1);
    expect(state.swapPhaseComplete).toBe(false);
    expect(state.swapped).toBe(false);
    expect(state.moveHistory).toEqual([[1, 2]]); // coords unchanged (no swap)
  });

  it('resets swapPhaseComplete/swapped once undo empties the move history', () => {
    let state = gameReducer(initialState, moveMade([0, 0]));
    state = gameReducer(state, swapChosen(true));

    state = gameReducer(state, undoMove());

    expect(state.moveHistory).toHaveLength(0);
    expect(state.swapPhaseComplete).toBe(false);
    expect(state.swapped).toBe(false);
  });

  it('does not underflow moveNumber when undoing from moveNumber=1 (AI-swap case)', () => {
    // AI swapped: swap was accepted without incrementing moveNumber.
    let state = gameReducer(initialState, moveMade([1, 2]));
    state = gameReducer(state, swapChosen(true)); // moveNumber still 1

    state = gameReducer(state, undoMove()); // one undo should reach 0, not -1

    expect(state.moveNumber).toBe(0);
    expect(state.moveHistory).toHaveLength(0);
    expect(state.swapPhaseComplete).toBe(false);
    expect(state.swapped).toBe(false);
  });

  it('leaves swap state untouched when undoing to moveNumber > 1', () => {
    let state = gameReducer(initialState, moveMade([1, 2]));
    state = gameReducer(state, swapChosen(true));
    state = gameReducer(state, moveMade([3, 3]));
    state = gameReducer(state, moveMade([4, 4])); // moveNumber = 3

    state = gameReducer(state, undoMove()); // undo [4,4] → moveNumber=2

    expect(state.moveNumber).toBe(2);
    expect(state.swapPhaseComplete).toBe(true);
    expect(state.swapped).toBe(true);
  });
});
