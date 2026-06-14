// Copyright (C) 2021 Kevin J. Sung
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import { signInAnonymously } from 'firebase/auth';
import {
  child,
  onChildAdded,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  Unsubscribe,
} from 'firebase/database';
import { auth, database } from './firebase';
import { history, store } from './store';
import {
  gameStarted,
  moveMade,
  playerResigned,
  selectGameState,
  swapChosen,
  undoMove,
} from './slices/gameSlice';
import {
  colorChosen,
  connectedToPeer,
  disconnectedFromPeer,
  hostCodeReceived,
  selectNetplayState,
  undoRequestFulfilled,
  undoRequestReceived,
} from './slices/netplaySlice';
import { GameSettings } from './types';

interface MessageData {
  settings?: GameSettings;
  isBlack?: boolean;
  move?: Array<number>;
  swap?: boolean;
  requestUndo?: boolean;
  acceptUndo?: boolean;
  resign?: boolean;
}

let roomCode: string | undefined;
let uid: string | undefined;
let unsubscribeMessages: Unsubscribe | undefined;
let unsubscribePresence: Unsubscribe | undefined;

function handleMessage(messageData: MessageData) {
  const {
    settings,
    isBlack,
    move,
    swap,
    requestUndo,
    acceptUndo,
    resign,
  } = messageData;

  if (settings) {
    store.dispatch(gameStarted(settings));
  }

  if (typeof isBlack === 'boolean') {
    store.dispatch(colorChosen(isBlack));
  }

  if (move) {
    store.dispatch(moveMade(move));
    store.dispatch(undoRequestFulfilled());
  }

  if (typeof swap === 'boolean') {
    store.dispatch(swapChosen(swap));
    store.dispatch(undoRequestFulfilled());
  }

  if (requestUndo) {
    store.dispatch(undoRequestReceived());
  }

  if (acceptUndo) {
    const { undoRequestSent } = selectNetplayState(store.getState());
    if (undoRequestSent) {
      store.dispatch(undoMove());
      store.dispatch(undoRequestFulfilled());
    }
  }

  if (resign) {
    const { isBlack: amBlack } = selectNetplayState(store.getState());
    store.dispatch(playerResigned(!amBlack));
  }
}

function generateHostCode(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

export function stopNetplay() {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = undefined;
  }

  if (unsubscribePresence) {
    unsubscribePresence();
    unsubscribePresence = undefined;
  }

  if (roomCode && uid) {
    const presenceRef = child(ref(database, `rooms/${roomCode}/presence`), uid);
    onDisconnect(presenceRef).cancel();
    remove(presenceRef);
  }

  roomCode = undefined;
  uid = undefined;
}

function sendMessage(data: MessageData) {
  if (!roomCode || !uid) {
    return;
  }
  const messagesRef = ref(database, `rooms/${roomCode}/messages`);
  push(messagesRef, { uid, data, ts: serverTimestamp() });
}

export function sendSwap(swap: boolean) {
  sendMessage({ swap });
}

export function sendMove(move: Array<number>) {
  sendMessage({ move });
}

export function sendRequestUndo() {
  sendMessage({ requestUndo: true });
}

export function sendAcceptUndo() {
  sendMessage({ acceptUndo: true });
}

export function sendSettings() {
  const { isBlack } = selectNetplayState(store.getState());
  const { settings } = selectGameState(store.getState());
  sendMessage({ settings, isBlack: !isBlack });
}

export function sendResign() {
  sendMessage({ resign: true });
}

export async function startNetplay(hostCode?: string) {
  stopNetplay();

  const hosting = !hostCode;

  const userCredential = await signInAnonymously(auth);
  uid = userCredential.user.uid;

  if (hosting) {
    roomCode = generateHostCode();
    store.dispatch(hostCodeReceived(roomCode));
    // start from a clean slate in case this host code was used before
    await set(ref(database, `rooms/${roomCode}`), null);
  } else {
    roomCode = hostCode;
  }

  const currentRoomCode = roomCode;
  const myUid = uid;

  // Subscribe to game messages before announcing our presence, so we never
  // miss a message sent in response to our presence appearing.
  const messagesRef = ref(database, `rooms/${currentRoomCode}/messages`);
  unsubscribeMessages = onChildAdded(messagesRef, (snapshot) => {
    const message = snapshot.val();
    if (message && message.uid !== myUid) {
      handleMessage(message.data);
    }
  });

  // Subscribe to peer presence.
  const knownPeerUids = new Set<string>();
  const presenceRef = ref(database, `rooms/${currentRoomCode}/presence`);
  unsubscribePresence = onValue(presenceRef, (snapshot) => {
    const presence = snapshot.val() || {};
    const peerUids = Object.keys(presence).filter((id) => id !== myUid);

    const newPeer = peerUids.find((id) => !knownPeerUids.has(id));
    if (newPeer) {
      store.dispatch(connectedToPeer());
      history.push('/game');
      const { hosting: amHosting } = selectNetplayState(store.getState());
      if (amHosting) {
        sendSettings();
      }
    }

    const goneUids = Array.from(knownPeerUids).filter(
      (id) => !peerUids.includes(id)
    );
    if (goneUids.length > 0) {
      store.dispatch(disconnectedFromPeer());
    }

    knownPeerUids.clear();
    peerUids.forEach((id) => knownPeerUids.add(id));
  });

  // Announce our presence and remove it if we disconnect.
  const myPresenceRef = child(
    ref(database, `rooms/${currentRoomCode}/presence`),
    myUid
  );
  await set(myPresenceRef, true);
  onDisconnect(myPresenceRef).remove();
}
