import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { NetplayState } from '../types';

const initialState: NetplayState = {
  active: false,
  connected: false,
  hosting: false,
  hostCode: '',
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
      state.hosting = false;
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
  colorChosen,
  undoRequestSent,
  undoRequestReceived,
  undoRequestFulfilled,
} = netplaySlice.actions;

export const selectNetplayState = (state: RootState) => state.netplay;

export default netplaySlice.reducer;
