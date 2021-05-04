import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { NetplayState } from '../types';

const initialState: NetplayState = {
  active: false,
  connected: false,
  hosting: false,
  isBlack: false,
};

const netplaySlice = createSlice({
  name: 'netplay',
  initialState,
  reducers: {
    activateNetplay: (state) => {
      state.active = true;
    },
    deactivateNetplay: (state) => {
      state.active = false;
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
      state.hosting = false;
    },
    colorChosen: (state, action) => {
      const isBlack = action.payload;
      state.isBlack = isBlack;
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
  colorChosen,
} = netplaySlice.actions;

export const selectNetplayState = (state: RootState) => state.netplay;

export default netplaySlice.reducer;
