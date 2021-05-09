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
import { NetplayState } from '../types';

const initialState: NetplayState = {
  active: false,
  connected: false,
  hosting: false,
  hostCode: '',
  hostCodeSubmitted: false,
  isBlack: false,
  undoRequestSent: false,
  undoRequestReceived: false,
};

const netplaySlice = createSlice({
  name: 'netplay',
  initialState,
  reducers: {
    activateNetplay: (state) => {
      state.active = true;
    },
    deactivateNetplay: (state) => {
      Object.assign(state, initialState);
    },
    connectedToPeer: (state) => {
      state.connected = true;
    },
    disconnectedFromPeer: (state) => {
      state.connected = false;
    },
    hostCodeReceived: (state, action) => {
      const hostCode = action.payload;
      state.hostCode = hostCode;
      state.hosting = true;
    },
    hostCodeSubmitted: (state) => {
      state.hostCodeSubmitted = true;
      state.hosting = false;
    },
    hostCodeSubmissionTimedOut: (state) => {
      state.hostCodeSubmitted = false;
    },
    colorChosen: (state, action) => {
      const isBlack = action.payload;
      state.isBlack = isBlack;
    },
    undoRequestSent: (state) => {
      state.undoRequestSent = true;
    },
    undoRequestReceived: (state) => {
      state.undoRequestReceived = true;
    },
    undoRequestFulfilled: (state) => {
      state.undoRequestSent = false;
      state.undoRequestReceived = false;
    },
  },
});

export const {
  activateNetplay,
  deactivateNetplay,
  connectedToPeer,
  disconnectedFromPeer,
  hostCodeReceived,
  hostCodeSubmitted,
  hostCodeSubmissionTimedOut,
  colorChosen,
  undoRequestSent,
  undoRequestReceived,
  undoRequestFulfilled,
} = netplaySlice.actions;

export const selectNetplayState = (state: RootState) => state.netplay;

export default netplaySlice.reducer;
