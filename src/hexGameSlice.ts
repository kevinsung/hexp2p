import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from './store';
import { GameState } from './types';

const initialState: GameState = {
  settings: { boardSize: 14, useSwapRule: true },
};

const hexGameSlice = createSlice({
  name: 'hexGame',
  initialState,
  reducers: {
    hexGameStateUpdated: (state, action) => {
      const stateUpdate = action.payload;
      Object.assign(state, stateUpdate);
    },
  },
});

export const { hexGameStateUpdated } = hexGameSlice.actions;

export const selectHexGameState = (state: RootState) => state.hexGame;

export default hexGameSlice.reducer;
