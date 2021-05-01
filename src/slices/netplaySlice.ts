import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { NetplayState } from '../types';

const initialState: NetplayState = {
  active: false,
  connected: false,
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
    },
  },
});

export const {
  activateNetplay,
  deactivateNetplay,
  connectedToPeer,
  disconnectedFromPeer,
  hostCodeReceived,
} = netplaySlice.actions;

export const selectNetplayActive = (state: RootState) => state.netplay.active;

export const selectConnected = (state: RootState) => state.netplay.connected;

export const selectHostCode = (state: RootState) => state.netplay.hostCode;

export default netplaySlice.reducer;
