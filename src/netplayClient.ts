import { Socket, createSocket } from 'dgram';
import { history, store } from './store';
import {
  gameStarted,
  moveMade,
  selectGameState,
  swapPhaseCompleted,
} from './slices/gameSlice';
import {
  colorChosen,
  connectedToPeer,
  disconnectedFromPeer,
  hostCodeReceived,
  selectNetplayState,
  swapChosen,
} from './slices/netplaySlice';
import { GameSettings } from './types';

interface MessageData {
  settings?: GameSettings;
  isBlack?: boolean;
  move?: Array<number>;
  swap?: boolean;
}

const TRAVERSAL_SERVER_ADDRESS = 'traversal.drybiscuit.org';
const TRAVERSAL_SERVER_PORT = 6363;

const TRAVERSAL_SERVER_KEEPALIVE_INTERVAL = 10000;
const TRAVERSAL_PACKET_INTERVAL = 100;
const PEER_KEEPALIVE_INTERVAL = 1000;
const DISCONNECT_TIMEOUT_INTERVAL = 10000;

let TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT: NodeJS.Timeout;
let PEER_KEEPALIVE_TIMEOUT: NodeJS.Timeout;
let DISCONNECT_TIMEOUT: NodeJS.Timeout;

let TRAVERSAL_SERVER_SOCKET: Socket;
let PEER_PUBLIC_SOCKET: Socket;
let PEER_PRIVATE_SOCKET: Socket;

let SOCKET: Socket | null;
let CONNECTED = false;

function handleMessage(messageData: MessageData) {
  const { settings, isBlack, move, swap } = messageData;
  if (settings) {
    store.dispatch(gameStarted(settings));
  }
  if (typeof isBlack === 'boolean') {
    store.dispatch(colorChosen(isBlack));
  }
  if (move) {
    store.dispatch(moveMade(move));
  }
  if (typeof swap === 'boolean') {
    store.dispatch(swapChosen(swap));
    store.dispatch(swapPhaseCompleted());
  }
}

function initializeConnection(socket: Socket) {
  // start sending keepalive packets
  clearInterval(PEER_KEEPALIVE_TIMEOUT);
  PEER_KEEPALIVE_TIMEOUT = setInterval(() => {
    socket.send('keepalive');
  }, PEER_KEEPALIVE_INTERVAL);

  socket.send('keepalive');

  // if hosting, send game settings and color
  const { hosting, isBlack } = selectNetplayState(store.getState());
  if (hosting) {
    const { settings } = selectGameState(store.getState());
    const message = { settings, isBlack: !isBlack };
    socket.send(JSON.stringify(message));
  }

  socket.on('message', (msg) => {
    const message = String(msg);

    if (message === 'keepalive') {
      clearTimeout(DISCONNECT_TIMEOUT);
      store.dispatch(connectedToPeer());
      CONNECTED = true;
      return;
    }

    try {
      handleMessage(JSON.parse(message));
    } catch (error) {
      // ignore badly formed messages
    }
  });
}

function attemptTraversal(
  socket: Socket,
  port: number,
  address: string,
  altPort: number,
  altAddress: string
) {
  socket.on('message', (msg, rinfo) => {
    console.log(`Message from ${rinfo.address} port ${rinfo.port}: ${msg}`);
    if (
      !SOCKET &&
      ((rinfo.address === address && rinfo.port === port) ||
        (rinfo.address === altAddress && rinfo.port === altPort))
    ) {
      SOCKET = socket;
      socket.connect(rinfo.port, rinfo.address, () => {
        initializeConnection(socket);
        store.dispatch(connectedToPeer());
        history.push('/game');
      });
      clearInterval(TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT);
      // TODO check if this can cause error
      TRAVERSAL_SERVER_SOCKET.close();
    }
  });
  const timer = setInterval(() => {
    // TODO this can throw ERR_SOCKET_DGRAM_NOT_RUNNING, fix it
    socket.send('traversal', port, address);
    if (SOCKET) {
      clearTimeout(timer);
      if (SOCKET !== socket) {
        socket.close();
      }
    }
  }, TRAVERSAL_PACKET_INTERVAL);
}

function closeAllSockets() {
  if (TRAVERSAL_SERVER_SOCKET) {
    try {
      TRAVERSAL_SERVER_SOCKET.close();
    } catch {
      // socket might have already been closed
    }
  }
  if (PEER_PUBLIC_SOCKET) {
    try {
      PEER_PUBLIC_SOCKET.close();
    } catch {
      // socket might have already been closed
    }
  }
  if (PEER_PRIVATE_SOCKET) {
    try {
      PEER_PRIVATE_SOCKET.close();
    } catch {
      // socket might have already been closed
    }
  }
}

export function stopNetplay() {
  clearInterval(TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT);
  clearInterval(PEER_KEEPALIVE_TIMEOUT);
  clearInterval(DISCONNECT_TIMEOUT);
  closeAllSockets();
  SOCKET = null;
  CONNECTED = false;
}

export function startNetplay(hostCode?: string) {
  stopNetplay();

  TRAVERSAL_SERVER_SOCKET = createSocket({ type: 'udp4', reuseAddr: true });
  PEER_PUBLIC_SOCKET = createSocket({ type: 'udp4', reuseAddr: true });
  PEER_PRIVATE_SOCKET = createSocket({ type: 'udp4', reuseAddr: true });

  TRAVERSAL_SERVER_SOCKET.on('error', (err) => {
    console.log(err);
  });

  const handleError = () => {
    if (CONNECTED) {
      DISCONNECT_TIMEOUT = setTimeout(() => {
        store.dispatch(disconnectedFromPeer());
      }, DISCONNECT_TIMEOUT_INTERVAL);
      CONNECTED = false;
    }
  };
  PEER_PUBLIC_SOCKET.on('error', handleError);
  PEER_PRIVATE_SOCKET.on('error', handleError);

  TRAVERSAL_SERVER_SOCKET.on('message', (msg, rinfo) => {
    console.log(`Message from ${rinfo.address} port ${rinfo.port}: ${msg}`);
    const {
      hostCode: receivedHostCode,
      peerPublicAddress,
      peerPublicPort,
      peerPrivateAddress,
      peerPrivatePort,
    } = JSON.parse(String(msg));

    if (receivedHostCode) {
      store.dispatch(hostCodeReceived(receivedHostCode));
    }

    if (peerPublicAddress && peerPublicPort) {
      attemptTraversal(
        PEER_PUBLIC_SOCKET,
        peerPublicPort,
        peerPublicAddress,
        peerPrivatePort,
        peerPrivateAddress
      );
    }

    if (peerPrivateAddress && peerPrivatePort) {
      attemptTraversal(
        PEER_PRIVATE_SOCKET,
        peerPrivatePort,
        peerPrivateAddress,
        peerPublicPort,
        peerPublicAddress
      );
    }
  });

  TRAVERSAL_SERVER_SOCKET.on('connect', () => {
    const {
      address: privateAddress,
      port: privatePort,
    } = TRAVERSAL_SERVER_SOCKET.address();
    PEER_PUBLIC_SOCKET.bind(privatePort, privateAddress);
    PEER_PRIVATE_SOCKET.bind(privatePort, privateAddress);
    const message = { privateAddress, privatePort, hostCode };
    TRAVERSAL_SERVER_SOCKET.send(JSON.stringify(message));
    clearInterval(TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT);
    TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT = setInterval(() => {
      TRAVERSAL_SERVER_SOCKET.send('keepalive');
    }, TRAVERSAL_SERVER_KEEPALIVE_INTERVAL);
  });

  TRAVERSAL_SERVER_SOCKET.connect(
    TRAVERSAL_SERVER_PORT,
    TRAVERSAL_SERVER_ADDRESS
  );
}

export function sendSwap(swap: boolean) {
  if (SOCKET) {
    const message = { swap };
    SOCKET.send(JSON.stringify(message));
  }
}

export function sendMove(move: Array<number>) {
  if (SOCKET) {
    const message = { move };
    SOCKET.send(JSON.stringify(message));
  }
}
