import { configureStore } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import hexGameReducer from './slices/hexGameSlice';

export const store = configureStore({
  reducer: {
    hexGame: hexGameReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
