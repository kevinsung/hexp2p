import { configureStore } from '@reduxjs/toolkit';
// eslint-disable-next-line import/no-cycle
import gameReducer from './slices/gameSlice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
