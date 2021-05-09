// Copyright (C) 2021 Kevin J. Sung

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { GameState, HexagonState } from '../types';

const initialState: GameState = {
  settings: { boardSize: 14, useSwapRule: true },
  moveHistory: [],
  moveNumber: 0,
  swapped: false,
  swapPhaseComplete: false,
  selectedHexagon: [NaN, NaN],
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

      moveHistory.push(coordinates);
      // only increment move number if board is set to latest position
      if (state.moveNumber === moveHistory.length - 1) {
        state.moveNumber += 1;
      }
    },
    swapChosen: (state, action) => {
      const { swapPhaseComplete } = state;
      if (!swapPhaseComplete) {
        const { moveHistory } = state;
        const swap = action.payload;
        if (swap) {
          const [row, col] = moveHistory.pop() as Array<number>;
          moveHistory.push([col, row]);
          state.swapped = true;
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
      moveHistory.pop();
      state.moveNumber -= 1;
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
} = gameSlice.actions;

export const selectGameState = (state: RootState) => state.game;

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
  for (let i = 0; i < moveNumber; i += 1) {
    const [row, col] = moveHistory[i];
    boardState[row][col] =
      Boolean(i % 2) === swapped ? HexagonState.BLACK : HexagonState.WHITE;
  }
  return boardState;
};

export const selectIsBlackTurn = (state: RootState) => {
  const { moveNumber, swapped } = state.game;
  return Boolean(moveNumber % 2) === swapped;
};

export default gameSlice.reducer;
