// Copyright (C) 2021 Kevin J. Sung
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { GameState, HexagonState } from '../types';

const initialState: GameState = {
  settings: { boardSize: 14, useSwapRule: false },
  moveHistory: [],
  moveNumber: 0,
  swapped: false,
  swapPhaseComplete: false,
  selectedHexagon: [NaN, NaN],
  resignationState: HexagonState.EMPTY,
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    resetGameState: (state) => {
      Object.assign(state, initialState);
    },
    gameStarted: (state, action) => {
      const settings = action.payload;
      Object.assign(state, initialState);
      state.settings = settings;
    },
    moveMade: (state, action) => {
      const { moveHistory } = state;
      const coordinates = action.payload;

      // if the move has already been made, ignore it
      const [row, col] = coordinates;
      for (let i = 0; i < moveHistory.length; i += 1) {
        const [r, c] = moveHistory[i];
        if (r === row && c === col) {
          return;
        }
      }

      // Decide "at latest" before the push. An accepted swap adds one navigable
      // slot, so the latest cursor is length + (swapped ? 1 : 0).
      const wasAtLatest =
        state.moveNumber === moveHistory.length + (state.swapped ? 1 : 0);
      moveHistory.push(coordinates);
      // only increment move number if board is set to latest position
      if (wasAtLatest) {
        state.moveNumber += 1;
      }
    },
    swapChosen: (state, action) => {
      const { swapPhaseComplete } = state;
      if (!swapPhaseComplete) {
        const { moveHistory } = state;
        const swap = action.payload;
        if (swap) {
          // Guard against a stale worker response arriving after undo cleared
          // the board: moveHistory is empty but swapPhaseComplete is still
          // false, so the normal guard above didn't fire.
          if (moveHistory.length === 0) return;
          // Only advance the cursor to the new post-swap slot if the board is
          // set to the latest position (mirrors moveMade); keeps a peer that's
          // browsing history from being pulled forward by a remote swap.
          const wasAtLatest = state.moveNumber === moveHistory.length;
          const [row, col] = moveHistory.pop() as Array<number>;
          moveHistory.push([col, row]);
          state.swapped = true;
          // The swap occupies its own navigable step (the opening exists both
          // before and after it), one beyond moveHistory.length.
          if (wasAtLatest) {
            state.moveNumber += 1;
          }
        }
        state.swapPhaseComplete = true;
      }
    },
    hexagonSelected: (state, action) => {
      const coordinates = action.payload;
      state.selectedHexagon = coordinates;
    },
    navigateMoveHistory: (state, action) => {
      const moveNumber = action.payload;
      state.moveNumber = moveNumber;
    },
    undoMove: (state) => {
      const { moveHistory } = state;
      const swapDecided = state.settings.useSwapRule && state.swapPhaseComplete;
      const atLatest =
        state.moveNumber === moveHistory.length + (state.swapped ? 1 : 0);
      // (A) Undo the swap decision itself while the board still shows only the
      // opening: post-accept this is the swap slot (moveNumber 2); a bare
      // decline is moveNumber 1. Re-open the swap offer, keep the opening stone,
      // un-transpose it if the swap had been accepted, and drop the cursor back
      // to the pre-decision opening slot (1).
      if (swapDecided && moveHistory.length === 1 && atLatest) {
        if (state.swapped) {
          const move = moveHistory[0];
          state.moveHistory[0] = [move[1], move[0]];
        }
        state.swapPhaseComplete = false;
        state.swapped = false;
        state.moveNumber = 1;
        return;
      }
      moveHistory.pop();
      state.moveNumber -= 1;
      if (moveHistory.length === 0) {
        state.swapPhaseComplete = false;
        state.swapped = false;
      } else if (swapDecided && moveHistory.length === 1) {
        // Arrived back at the swap-decision point from a later move — re-open
        // the swap offer. If the swap was accepted the opening coords were
        // transposed; reverse that so the original first move is shown at its
        // actual position. Collapse the cursor onto the opening slot (1),
        // skipping the post-swap slot, so undo's click-count is unchanged.
        if (state.swapped) {
          const move = state.moveHistory[0];
          state.moveHistory[0] = [move[1], move[0]];
        }
        state.swapPhaseComplete = false;
        state.swapped = false;
        state.moveNumber = 1;
      }
    },
    playerResigned: (state, action) => {
      const black = action.payload;
      state.resignationState = black ? HexagonState.BLACK : HexagonState.WHITE;
    },
  },
});

export const {
  resetGameState,
  gameStarted,
  hexagonSelected,
  moveMade,
  navigateMoveHistory,
  swapChosen,
  undoMove,
  playerResigned,
} = gameSlice.actions;

export const selectGameState = (state: RootState) => state.game;

// The most advanced navigation position. An accepted swap adds one navigable
// step — the opening exists both before the swap (original black stone) and
// after it (reflected white stone) — so it sits one beyond moveHistory.length.
export const latestMoveNumber = (moveHistoryLength: number, swapped: boolean) =>
  moveHistoryLength + (swapped ? 1 : 0);

export const selectLatestMoveNumber = (state: RootState) =>
  latestMoveNumber(state.game.moveHistory.length, state.game.swapped);

// Maps a navigation moveNumber to (stones drawn, whether the swap is applied at
// this position). The swapped opening occupies the slot between moveNumber 1
// (pre-swap: original coords, black) and moveNumber 2 (post-swap: reflected
// coords, white). Returns the displayed [row, col] of stone `i` — index 0 is
// un-reflected in the pre-swap view since moveHistory stores it transposed.
const swapView = (moveNumber: number, swapped: boolean) => {
  const swapApplied = swapped && moveNumber >= 2;
  const shown = swapApplied ? moveNumber - 1 : moveNumber;
  return { swapApplied, shown };
};

export const displayedMove = (
  moveHistory: Array<Array<number>>,
  i: number,
  swapped: boolean,
  swapApplied: boolean,
): [number, number] => {
  const [row, col] = moveHistory[i];
  return swapped && !swapApplied && i === 0 ? [col, row] : [row, col];
};

export const selectBoardState = (state: RootState) => {
  const { settings, moveHistory, moveNumber, swapped } = state.game;
  const { boardSize } = settings;
  const boardState = [];
  for (let row = 0; row < boardSize; row += 1) {
    const rowState = [];
    for (let col = 0; col < boardSize; col += 1) {
      rowState.push(HexagonState.EMPTY);
    }
    boardState.push(rowState);
  }
  const { swapApplied, shown } = swapView(moveNumber, swapped);
  for (let i = 0; i < shown; i += 1) {
    const [row, col] = displayedMove(moveHistory, i, swapped, swapApplied);
    boardState[row][col] =
      Boolean(i % 2) === swapApplied ? HexagonState.BLACK : HexagonState.WHITE;
  }
  return boardState;
};

export const selectIsBlackTurn = (state: RootState) => {
  const { moveNumber, swapped } = state.game;
  const { swapApplied, shown } = swapView(moveNumber, swapped);
  return Boolean(shown % 2) === swapApplied;
};

// The displayed coordinate of the most recently placed stone at the current
// navigation position (for the last-move marker), or [NaN, NaN] if none. Uses
// the same swap-aware mapping as selectBoardState, so it's correct at the
// pre-swap (moveNumber 1) and post-swap (moveNumber 2) opening positions.
export const selectLastMove = (state: RootState): [number, number] => {
  const { moveHistory, moveNumber, swapped } = state.game;
  const { swapApplied, shown } = swapView(moveNumber, swapped);
  if (shown === 0) {
    return [NaN, NaN];
  }
  return displayedMove(moveHistory, shown - 1, swapped, swapApplied);
};

export default gameSlice.reducer;
