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

import { Socket, createSocket } from 'dgram';
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

const TRAVERSAL_SERVER_ADDRESS = 'traversal.drybiscuit.org';
const TRAVERSAL_SERVER_PORT = 6363;

const TRAVERSAL_SERVER_KEEPALIVE_INTERVAL = 10000;
const TRAVERSAL_PACKET_INTERVAL = 100;
const PEER_KEEPALIVE_INTERVAL = 1000;
const DISCONNECT_TIMEOUT_INTERVAL = 10000;

let TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT: NodeJS.Timeout;
let PEER_TRAVERSAL_TIMEOUT: NodeJS.Timeout;
let PEER_ESTABLISHMENT_TIMEOUT: NodeJS.Timeout;
let PEER_KEEPALIVE_TIMEOUT: NodeJS.Timeout;
let DISCONNECT_TIMEOUT: NodeJS.Timeout;

let SOCKET: Socket;

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

function initializeConnection() {
  SOCKET.on('error', () => {
    store.dispatch(disconnectedFromPeer());
  });

  SOCKET.on('message', (msg, rinfo) => {
    console.log(`Message from ${rinfo.address} port ${rinfo.port}: ${msg}`);

    store.dispatch(connectedToPeer());

    clearTimeout(DISCONNECT_TIMEOUT);
    DISCONNECT_TIMEOUT = setTimeout(() => {
      store.dispatch(disconnectedFromPeer());
    }, DISCONNECT_TIMEOUT_INTERVAL);

    const message = String(msg);

    if (message === 'keepalive') {
      return;
    }

    if (message === 'acknowledged') {
      clearInterval(PEER_ESTABLISHMENT_TIMEOUT);
    }

    if (message === 'established') {
      SOCKET.send('acknowledged');
      // if hosting, send game settings and color
      const { hosting, isBlack } = selectNetplayState(store.getState());
      if (hosting) {
        const { settings } = selectGameState(store.getState());
        const settingsMessage = { settings, isBlack: !isBlack };
        SOCKET.send(JSON.stringify(settingsMessage));
      }
      return;
    }

    try {
      handleMessage(JSON.parse(message));
    } catch (error) {
      // ignore badly formed messages
    }
  });

  // notify that connection has been established
  clearInterval(PEER_ESTABLISHMENT_TIMEOUT);
  PEER_ESTABLISHMENT_TIMEOUT = setInterval(() => {
    try {
      SOCKET.send('established');
    } catch {
      // socket has been closed
      clearInterval(PEER_ESTABLISHMENT_TIMEOUT);
    }
  }, TRAVERSAL_PACKET_INTERVAL);

  // start sending keepalive packets
  clearInterval(PEER_KEEPALIVE_TIMEOUT);
  PEER_KEEPALIVE_TIMEOUT = setInterval(() => {
    try {
      SOCKET.send('keepalive');
    } catch {
      // socket has been closed
      clearInterval(PEER_KEEPALIVE_TIMEOUT);
    }
  }, PEER_KEEPALIVE_INTERVAL);
}

function attemptTraversal(
  peerPublicPort: number,
  peerPublicAddress: string,
  peerPrivatePort: number,
  peerPrivateAddress: string
) {
  // start sending packets to both public and private addresses
  PEER_TRAVERSAL_TIMEOUT = setInterval(() => {
    SOCKET.send('traversal', peerPublicPort, peerPublicAddress);
    SOCKET.send('traversal', peerPrivatePort, peerPrivateAddress);
  }, TRAVERSAL_PACKET_INTERVAL);

  // connect to the first address that responds
  SOCKET.on('message', (_msg, rinfo) => {
    if (
      (rinfo.address === peerPublicAddress && rinfo.port === peerPublicPort) ||
      (rinfo.address === peerPrivateAddress && rinfo.port === peerPrivatePort)
    ) {
      clearInterval(PEER_TRAVERSAL_TIMEOUT);
      clearInterval(TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT);
      const { address, port } = SOCKET.address();
      SOCKET.close();
      SOCKET = createSocket({ type: 'udp4' });
      SOCKET.bind(port, address, () => {
        SOCKET.connect(rinfo.port, rinfo.address, () => {
          initializeConnection();
          store.dispatch(connectedToPeer());
          history.push('/game');
        });
      });
    }
  });
}

export function stopNetplay() {
  clearInterval(TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT);
  clearInterval(PEER_TRAVERSAL_TIMEOUT);
  clearInterval(PEER_ESTABLISHMENT_TIMEOUT);
  clearInterval(PEER_KEEPALIVE_TIMEOUT);
  clearInterval(DISCONNECT_TIMEOUT);
  try {
    SOCKET.close();
  } catch {
    // socket hasn't been created or has already been closed
  }
}

export function startNetplay(hostCode?: string) {
  stopNetplay();

  SOCKET = createSocket({ type: 'udp4' });

  SOCKET.connect(TRAVERSAL_SERVER_PORT, TRAVERSAL_SERVER_ADDRESS, () => {
    const { address: privateAddress, port: privatePort } = SOCKET.address();
    SOCKET.close();
    SOCKET = createSocket({ type: 'udp4' });

    SOCKET.on('message', (msg, rinfo) => {
      console.log(`Message from ${rinfo.address} port ${rinfo.port}: ${msg}`);

      let parsedMessage;
      try {
        parsedMessage = JSON.parse(String(msg));
      } catch {
        // ignore badly formed messages
        return;
      }

      const {
        hostCode: receivedHostCode,
        peerPublicAddress,
        peerPublicPort,
        peerPrivateAddress,
        peerPrivatePort,
      } = parsedMessage;

      if (receivedHostCode) {
        store.dispatch(hostCodeReceived(receivedHostCode));
      }

      if (
        peerPublicAddress &&
        peerPublicPort &&
        peerPrivateAddress &&
        peerPrivatePort
      ) {
        attemptTraversal(
          peerPublicPort,
          peerPublicAddress,
          peerPrivatePort,
          peerPrivateAddress
        );
      }
    });

    SOCKET.bind(privatePort, privateAddress, () => {
      const message = { privateAddress, privatePort, hostCode };
      SOCKET.send(
        JSON.stringify(message),
        TRAVERSAL_SERVER_PORT,
        TRAVERSAL_SERVER_ADDRESS
      );
      clearInterval(TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT);
      TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT = setInterval(() => {
        SOCKET.send(
          'keepalive',
          TRAVERSAL_SERVER_PORT,
          TRAVERSAL_SERVER_ADDRESS
        );
      }, TRAVERSAL_SERVER_KEEPALIVE_INTERVAL);
    });
  });
}

function sendMessage(message: string) {
  try {
    SOCKET.send(message);
  } catch {
    // socket has been closed
  }
}

export function sendSwap(swap: boolean) {
  const message = { swap };
  sendMessage(JSON.stringify(message));
}

export function sendMove(move: Array<number>) {
  const message = { move };
  sendMessage(JSON.stringify(message));
}

export function sendRequestUndo() {
  const message = { requestUndo: true };
  sendMessage(JSON.stringify(message));
}

export function sendAcceptUndo() {
  const message = { acceptUndo: true };
  sendMessage(JSON.stringify(message));
}

export function sendSettings() {
  const { isBlack } = selectNetplayState(store.getState());
  const { settings } = selectGameState(store.getState());
  const message = { settings, isBlack: !isBlack };
  sendMessage(JSON.stringify(message));
}

export function sendResign() {
  const message = { resign: true };
  sendMessage(JSON.stringify(message));
}
