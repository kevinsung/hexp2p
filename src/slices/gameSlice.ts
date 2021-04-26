import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { GameState, HexagonState } from '../types';

const initialState: GameState = {
  settings: { boardSize: 14, useSwapRule: true },
  moveHistory: [],
  moveNumber: 0,
  boardState: [],
  isBlackTurn: true,
  selectedHexagon: [NaN, NaN],
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    gameStarted: (state, action) => {
      const settings = action.payload;
      const { boardSize } = settings;
      const boardState = [];
      for (let row = 0; row < boardSize; row += 1) {
        const rowState = [];
        for (let col = 0; col < boardSize; col += 1) {
          rowState.push(HexagonState.EMPTY);
        }
        boardState.push(rowState);
      }
      // set state
      Object.assign(state, initialState);
      state.settings = settings;
      state.boardState = boardState;
    },
    moveMade: (state, action) => {
      const { moveHistory, boardState, isBlackTurn } = state;
      const [row, col] = action.payload;
      moveHistory.push([row, col]);
      boardState[row][col] = isBlackTurn
        ? HexagonState.BLACK
        : HexagonState.WHITE;
      state.isBlackTurn = !isBlackTurn;
    },
    gameStateUpdated: (state, action) => {
      const stateUpdate = action.payload;
      Object.assign(state, stateUpdate);
    },
  },
});

export const { gameStarted, moveMade, gameStateUpdated } = gameSlice.actions;

export const selectGameState = (state: RootState) => state.game;

export default gameSlice.reducer;
