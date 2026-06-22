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

  it('leaves swapPhaseComplete/swapped untouched when moves remain', () => {
    let state = gameReducer(initialState, moveMade([0, 0]));
    state = gameReducer(state, swapChosen(true));
    state = gameReducer(state, moveMade([2, 2]));

    state = gameReducer(state, undoMove());

    expect(state.moveHistory).toHaveLength(1);
    expect(state.swapPhaseComplete).toBe(true);
    expect(state.swapped).toBe(true);
  });

  it('resets swapPhaseComplete/swapped once undo empties the move history', () => {
    let state = gameReducer(initialState, moveMade([0, 0]));
    state = gameReducer(state, swapChosen(true));

    state = gameReducer(state, undoMove());

    expect(state.moveHistory).toHaveLength(0);
    expect(state.swapPhaseComplete).toBe(false);
    expect(state.swapped).toBe(false);
  });
});
