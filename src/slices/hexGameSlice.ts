import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { GameState, HexagonState } from '../types';

const initialState: GameState = {
  settings: { boardSize: 14, useSwapRule: true },
  boardState: [],
  isBlackTurn: true,
  selectedHexagon: [NaN, NaN],
};

const hexGameSlice = createSlice({
  name: 'hexGame',
  initialState,
  reducers: {
    startGame: (state, action) => {
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
      state.settings = settings;
      state.boardState = boardState;
      state.isBlackTurn = true;
      state.selectedHexagon = [NaN, NaN];
    },
    hexGameStateUpdated: (state, action) => {
      const stateUpdate = action.payload;
      Object.assign(state, stateUpdate);
    },
  },
});

export const { startGame, hexGameStateUpdated } = hexGameSlice.actions;

export const selectHexGameState = (state: RootState) => state.hexGame;

export default hexGameSlice.reducer;
