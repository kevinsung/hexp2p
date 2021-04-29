import { createSlice } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import { RootState } from '../store';
import { NetplayState } from '../types';

const initialState: NetplayState = {};

const netplaySlice = createSlice({
  name: 'netplay',
  initialState,
  reducers: {
    hostCodeReceived: (state, action) => {
      const hostCode = action.payload;
      state.hostCode = hostCode;
    },
  },
});

export const { hostCodeReceived } = netplaySlice.actions;

export const selectHostCode = (state: RootState) => state.netplay.hostCode;

export default netplaySlice.reducer;
