import { Socket, createSocket } from 'dgram';
import { history, store } from './store';
import {
  gameStarted,
  moveMade,
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
}

const TRAVERSAL_SERVER_ADDRESS = 'traversal.drybiscuit.org';
const TRAVERSAL_SERVER_PORT = 6363;

const TRAVERSAL_SERVER_KEEPALIVE_INTERVAL = 10000;
const TRAVERSAL_PACKET_INTERVAL = 100;
// TODO make this 1 second
const PEER_KEEPALIVE_INTERVAL = 100;
// TODO make this 10 seconds
const DISCONNECT_TIMEOUT_INTERVAL = 1000;

let TRAVERSAL_SERVER_KEEPALIVE_TIMEOUT: NodeJS.Timeout;
let PEER_ESTABLISHMENT_TIMEOUT: NodeJS.Timeout;
let PEER_KEEPALIVE_TIMEOUT: NodeJS.Timeout;
let DISCONNECT_TIMEOUT: NodeJS.Timeout;

let TRAVERSAL_SERVER_SOCKET: Socket;
let PEER_PUBLIC_SOCKET: Socket;
let PEER_PRIVATE_SOCKET: Socket;

let SOCKET: Socket | null;
let CONNECTED = false;

function handleMessage(messageData: MessageData) {
  const {
    settings,
    isBlack,
    move,
    swap,
    requestUndo,
    acceptUndo,
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
}

function initializeConnection(socket: Socket) {
  socket.on('message', (msg) => {
    clearTimeout(DISCONNECT_TIMEOUT);
    store.dispatch(connectedToPeer());
    CONNECTED = true;

    const message = String(msg);

    if (message === 'keepalive') {
      return;
    }

    if (message === 'acknowledged') {
      clearInterval(PEER_ESTABLISHMENT_TIMEOUT);
    }

    if (message === 'established') {
      try {
        socket.send('acknowledged');
      } catch {
        // socket has been closed
      }
      // if hosting, send game settings and color
      const { hosting, isBlack } = selectNetplayState(store.getState());
      if (hosting) {
        const { settings } = selectGameState(store.getState());
        const settingsMessage = { settings, isBlack: !isBlack };
        try {
          socket.send(JSON.stringify(settingsMessage));
        } catch {
          // socket has been closed
        }
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
      socket.send('established');
    } catch {
      // socket has been closed
      clearInterval(PEER_ESTABLISHMENT_TIMEOUT);
    }
  }, TRAVERSAL_PACKET_INTERVAL);

  // start sending keepalive packets
  clearInterval(PEER_KEEPALIVE_TIMEOUT);
  PEER_KEEPALIVE_TIMEOUT = setInterval(() => {
    try {
      socket.send('keepalive');
    } catch {
      // socket has been closed
      clearInterval(PEER_KEEPALIVE_TIMEOUT);
    }
  }, PEER_KEEPALIVE_INTERVAL);
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
      try {
        TRAVERSAL_SERVER_SOCKET.close();
      } catch {
        // socket has been closed already
      }
    }
  });
  // TODO check if this executes unnecessarily when address and ports align
  const timer = setInterval(() => {
    if (SOCKET) {
      clearTimeout(timer);
      if (SOCKET !== socket) {
        try {
          socket.close();
        } catch {
          // socket has been closed already
        }
      }
      return;
    }
    try {
      socket.send('traversal', port, address);
    } catch {
      // socket has been closed already
      clearTimeout(timer);
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

// TODO wrap send calls in try catch
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

export function sendRequestUndo() {
  if (SOCKET) {
    const message = { requestUndo: true };
    SOCKET.send(JSON.stringify(message));
  }
}

export function sendAcceptUndo() {
  if (SOCKET) {
    const message = { acceptUndo: true };
    SOCKET.send(JSON.stringify(message));
  }
}
