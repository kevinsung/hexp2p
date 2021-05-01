import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { NetplayState } from '../types';

const initialState: NetplayState = { connected: false };

const netplaySlice = createSlice({
  name: 'netplay',
  initialState,
  reducers: {
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
  connectedToPeer,
  disconnectedFromPeer,
  hostCodeReceived,
} = netplaySlice.actions;

export const selectConnected = (state: RootState) => state.netplay.connected;

export const selectHostCode = (state: RootState) => state.netplay.hostCode;

export default netplaySlice.reducer;
