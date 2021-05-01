import { configureStore } from '@reduxjs/toolkit';
import { createBrowserHistory } from 'history';
// eslint-disable-next-line import/no-cycle
import netplayReducer from './slices/netplaySlice';
// eslint-disable-next-line import/no-cycle
import gameReducer from './slices/gameSlice';

export const history = createBrowserHistory();

export const store = configureStore({
  reducer: {
    game: gameReducer,
    netplay: netplayReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
