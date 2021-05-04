import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { GameState, HexagonState } from '../types';

const initialState: GameState = {
  settings: { boardSize: 14, useSwapRule: true },
  moveHistory: [],
  moveNumber: 0,
  swapPhaseComplete: false,
  selectedHexagon: [NaN, NaN],
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    gameStarted: (state, action) => {
      const settings = action.payload;
      Object.assign(state, initialState);
      state.settings = settings;
    },
    moveMade: (state, action) => {
      const { moveHistory } = state;
      const coordinates = action.payload;
      moveHistory.push(coordinates);
      // only increment move number if board is set to latest position
      if (state.moveNumber === moveHistory.length - 1) {
        state.moveNumber += 1;
      }
    },
    swapPhaseCompleted: (state) => {
      state.swapPhaseComplete = true;
    },
    hexagonSelected: (state, action) => {
      const coordinates = action.payload;
      state.selectedHexagon = coordinates;
    },
    navigateMoveHistory: (state, action) => {
      const moveNumber = action.payload;
      state.moveNumber = moveNumber;
    },
  },
});

export const {
  gameStarted,
  hexagonSelected,
  moveMade,
  navigateMoveHistory,
  swapPhaseCompleted,
} = gameSlice.actions;

export const selectGameState = (state: RootState) => state.game;

export const selectBoardState = (state: RootState) => {
  const { settings, moveHistory, moveNumber } = state.game;
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
      i % 2 === 0 ? HexagonState.BLACK : HexagonState.WHITE;
  }
  return boardState;
};

export default gameSlice.reducer;
