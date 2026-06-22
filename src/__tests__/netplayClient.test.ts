import { signInAnonymously } from 'firebase/auth';
import { store } from '../store';
import { resetGameState, moveMade, selectGameState } from '../slices/gameSlice';
import {
  deactivateNetplay,
  undoRequestSent,
  selectNetplayState,
} from '../slices/netplaySlice';
import { startNetplay } from '../netplayClient';

jest.mock('firebase/auth', () => ({
  signInAnonymously: jest.fn(),
}));

let capturedOnChildAdded:
  | ((snapshot: { val: () => unknown }) => void)
  | undefined;

jest.mock('firebase/database', () => ({
  ref: jest.fn(() => ({})),
  child: jest.fn(() => ({})),
  push: jest.fn(() => Promise.resolve()),
  set: jest.fn(() => Promise.resolve()),
  remove: jest.fn(() => Promise.resolve()),
  serverTimestamp: jest.fn(() => 0),
  onDisconnect: jest.fn(() => ({ remove: jest.fn(), cancel: jest.fn() })),
  onValue: jest.fn(() => jest.fn()),
  onChildAdded: jest.fn((_ref, callback) => {
    capturedOnChildAdded = callback;
    return jest.fn();
  }),
}));

(signInAnonymously as jest.Mock).mockResolvedValue({ user: { uid: 'me' } });

function deliverMessage(data: { requestUndo?: number; acceptUndo?: number }) {
  capturedOnChildAdded?.({ val: () => ({ uid: 'opponent', data }) });
}

describe('undo handshake message handling', () => {
  beforeEach(async () => {
    store.dispatch(resetGameState());
    store.dispatch(deactivateNetplay());
    await startNetplay();
  });

  it('accepts a requestUndo that matches the current move count', () => {
    store.dispatch(moveMade([0, 0]));
    store.dispatch(moveMade([1, 1]));

    deliverMessage({ requestUndo: 2 });

    expect(selectNetplayState(store.getState()).undoRequestReceived).toBe(2);
  });

  it('drops a requestUndo that is stale relative to the current move count', () => {
    store.dispatch(moveMade([0, 0]));
    store.dispatch(moveMade([1, 1]));

    // Opponent's request was made when there was only 1 move; we've since
    // received a second move they don't know about yet.
    deliverMessage({ requestUndo: 1 });

    expect(selectNetplayState(store.getState()).undoRequestReceived).toBe(
      false,
    );
  });

  it('applies undo on a matching acceptUndo and clears the pending flag', () => {
    store.dispatch(moveMade([0, 0]));
    store.dispatch(moveMade([1, 1]));
    store.dispatch(undoRequestSent(2));

    deliverMessage({ acceptUndo: 2 });

    expect(selectGameState(store.getState()).moveHistory).toHaveLength(1);
    expect(selectNetplayState(store.getState()).undoRequestSent).toBe(false);
  });

  it('ignores an acceptUndo with no matching pending request', () => {
    store.dispatch(moveMade([0, 0]));
    store.dispatch(moveMade([1, 1]));

    deliverMessage({ acceptUndo: 2 });

    expect(selectGameState(store.getState()).moveHistory).toHaveLength(2);
  });
});
