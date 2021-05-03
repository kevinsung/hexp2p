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
    swapChosen: (state, action) => {
      const swap = action.payload;
      if (swap) {
        state.isBlack = !state.isBlack;
      }
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
  swapChosen,
} = netplaySlice.actions;

// TODO just have one reducer selectNetplayState

export const selectNetplayActive = (state: RootState) => state.netplay.active;

export const selectConnected = (state: RootState) => state.netplay.connected;

export const selectHostCode = (state: RootState) => state.netplay.hostCode;

export const selectHosting = (state: RootState) => state.netplay.hosting;

export const selectIsBlack = (state: RootState) => state.netplay.isBlack;

export default netplaySlice.reducer;
