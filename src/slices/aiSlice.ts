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

// Tracks whether the local game is being played against the computer AI.
// `aiPlaysBlack` is the AI's color (the opposite of the human's chosen color).
// Compare: netplay's `isBlack` is the *local human's* color, so the disable
// checks in HexGame.tsx use opposite senses (aiPlaysBlack === isBlackTurn
// means it's the AI's turn; isBlack !== isBlackTurn means it's the human's).

import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { AiState } from '../types';

const initialState: AiState = {
  active: false,
  aiPlaysBlack: false,
  thinking: false,
  generation: 0,
};

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    activateAi: (state) => {
      state.active = true;
    },
    deactivateAi: (state) => {
      Object.assign(state, initialState);
    },
    aiColorChosen: (state, action: { payload: boolean }) => {
      state.aiPlaysBlack = action.payload;
    },
    aiThinkingChanged: (state, action: { payload: boolean }) => {
      state.thinking = action.payload;
    },
    // Cancels an in-flight thinking request (e.g. when the human undoes while
    // the AI is computing). Clears `thinking` and bumps `generation` so
    // useAiOpponent's worker-lifecycle effect tears down the current worker and
    // replaces it with a fresh idle one, discarding the stale computation.
    aiThinkingCancelled: (state) => {
      state.thinking = false;
      state.generation += 1;
    },
  },
});

export const {
  activateAi,
  deactivateAi,
  aiColorChosen,
  aiThinkingChanged,
  aiThinkingCancelled,
} = aiSlice.actions;

export const selectAiState = (state: RootState) => state.ai;

export default aiSlice.reducer;
