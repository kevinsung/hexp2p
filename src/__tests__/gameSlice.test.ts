import gameReducer, {
  moveMade,
  navigateMoveHistory,
  selectBoardState,
  selectIsBlackTurn,
  swapChosen,
  undoMove,
} from '../slices/gameSlice';
import type { RootState } from '../store';
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

  it('undoes the swap decision, re-opening the swap offer', () => {
    let state = gameReducer(initialState, moveMade([0, 0]));
    state = gameReducer(state, swapChosen(true));

    state = gameReducer(state, undoMove());

    expect(state.moveNumber).toBe(1);
    expect(state.moveHistory).toEqual([[0, 0]]);
    expect(state.swapPhaseComplete).toBe(false);
    expect(state.swapped).toBe(false);
  });

  it('undoes the swap decision one step at a time (no moveNumber underflow)', () => {
    // After the swap is accepted, one undo re-opens the swap offer; a second
    // undo removes the first stone (empty board). This mirrors what HexGame's
    // undo button does in AI mode: dispatches undoMove() twice.
    let state = gameReducer(initialState, moveMade([1, 2]));
    state = gameReducer(state, swapChosen(true)); // moveNumber = 2 (swap slot)

    state = gameReducer(state, undoMove()); // re-opens swap offer

    expect(state.moveNumber).toBe(1);
    expect(state.moveHistory).toEqual([[1, 2]]);
    expect(state.swapPhaseComplete).toBe(false);
    expect(state.swapped).toBe(false);

    state = gameReducer(state, undoMove()); // clears the board

    expect(state.moveNumber).toBe(0);
    expect(state.moveHistory).toHaveLength(0);
    expect(state.swapPhaseComplete).toBe(false);
    expect(state.swapped).toBe(false);
  });

  it('leaves swap state untouched when undoing to moveNumber > 1', () => {
    let state = gameReducer(initialState, moveMade([1, 2]));
    state = gameReducer(state, swapChosen(true)); // moveNumber = 2 (swap slot)
    state = gameReducer(state, moveMade([3, 3]));
    state = gameReducer(state, moveMade([4, 4])); // moveNumber = 4

    state = gameReducer(state, undoMove()); // undo [4,4] → moveNumber=3

    expect(state.moveNumber).toBe(3);
    expect(state.swapPhaseComplete).toBe(true);
    expect(state.swapped).toBe(true);
  });
});

describe('swap navigation', () => {
  // Black opens at [1, 2], then the swap is accepted (stored transposed to
  // [2, 1] and recolored white). The accepted swap adds its own navigable slot.
  const swappedGame = () => {
    let state = gameReducer(initialState, moveMade([1, 2]));
    state = gameReducer(state, swapChosen(true));
    return state;
  };

  const boardAt = (state: GameState) =>
    selectBoardState({ game: state } as RootState);
  const isBlackTurn = (state: GameState) =>
    selectIsBlackTurn({ game: state } as RootState);

  it('advances the cursor to the post-swap slot on accept', () => {
    const state = swappedGame();
    expect(state.moveNumber).toBe(2);
    expect(state.moveHistory).toEqual([[2, 1]]);
    expect(state.swapped).toBe(true);
  });

  it('shows the post-swap opening (white) at moveNumber 2', () => {
    const board = boardAt(swappedGame());
    expect(board[2][1]).toBe(HexagonState.WHITE);
    expect(board[1][2]).toBe(HexagonState.EMPTY);
    expect(isBlackTurn(swappedGame())).toBe(true);
  });

  it('shows the PRE-swap opening (black, original position) at moveNumber 1', () => {
    const state = gameReducer(swappedGame(), navigateMoveHistory(1));
    const board = boardAt(state);
    expect(board[1][2]).toBe(HexagonState.BLACK); // original coords, un-reflected
    expect(board[2][1]).toBe(HexagonState.EMPTY);
    expect(isBlackTurn(state)).toBe(false);
  });

  it('shows the empty board at moveNumber 0', () => {
    const state = gameReducer(swappedGame(), navigateMoveHistory(0));
    const board = boardAt(state);
    expect(board[1][2]).toBe(HexagonState.EMPTY);
    expect(board[2][1]).toBe(HexagonState.EMPTY);
  });

  it('makes the pre-swap and post-swap openings distinct positions', () => {
    const state = swappedGame();
    const pre = boardAt(gameReducer(state, navigateMoveHistory(1)));
    const post = boardAt(gameReducer(state, navigateMoveHistory(2)));
    expect(pre).not.toEqual(post);
  });

  it('increments to the next slot when a move is made after the swap', () => {
    const state = gameReducer(swappedGame(), moveMade([3, 3]));
    expect(state.moveNumber).toBe(3);
    expect(state.moveHistory).toEqual([
      [2, 1],
      [3, 3],
    ]);
  });
});
