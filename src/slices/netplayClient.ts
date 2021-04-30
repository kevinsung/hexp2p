import { Socket, createSocket } from 'dgram';
import { store } from '../store';
import { hostCodeReceived } from './netplaySlice';

const TRAVERSAL_SERVER_ADDRESS = 'traversal.drybiscuit.org';
const TRAVERSAL_SERVER_PORT = 6363;

let SOCKET: Socket | null;

let TRAVERSAL_SERVER_SOCKET: Socket;
let PEER_PUBLIC_SOCKET: Socket;
let PEER_PRIVATE_SOCKET: Socket;

function attachListeners(socket: Socket) {
  setInterval(() => {
    socket.send('keepalive');
  }, 1000);
}

function attemptTraversal(socket: Socket, port: number, address: string) {
  socket.on('message', (msg, rinfo) => {
    console.log(`Message from ${rinfo.address} port ${rinfo.port}: ${msg}`);
    if (rinfo.address === address && rinfo.port === port && !SOCKET) {
      SOCKET = socket;
      socket.connect(port, address);
      attachListeners(socket);
    }
  });
  const timer = setInterval(() => {
    // TODO if socket is already closed, then either don't send or catch error
    socket.send('traversal', port, address);
    if (SOCKET) {
      clearTimeout(timer);
      if (SOCKET !== socket) {
        socket.close();
      }
    }
  }, 1000);
}

export default function startNetplay(hostCode?: string) {
  if (TRAVERSAL_SERVER_SOCKET) {
    TRAVERSAL_SERVER_SOCKET.close();
  }
  if (PEER_PUBLIC_SOCKET) {
    PEER_PUBLIC_SOCKET.close();
  }
  if (PEER_PRIVATE_SOCKET) {
    PEER_PRIVATE_SOCKET.close();
  }

  SOCKET = null;
  TRAVERSAL_SERVER_SOCKET = createSocket({ type: 'udp4', reuseAddr: true });
  PEER_PUBLIC_SOCKET = createSocket({ type: 'udp4', reuseAddr: true });
  PEER_PRIVATE_SOCKET = createSocket({ type: 'udp4', reuseAddr: true });

  TRAVERSAL_SERVER_SOCKET.on('error', (err) => {
    console.log(err);
  });
  PEER_PUBLIC_SOCKET.on('error', (err) => {
    console.log(err);
  });
  PEER_PRIVATE_SOCKET.on('error', (err) => {
    console.log(err);
  });

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
      attemptTraversal(PEER_PUBLIC_SOCKET, peerPublicPort, peerPublicAddress);
    }

    if (peerPrivateAddress && peerPrivatePort) {
      attemptTraversal(
        PEER_PRIVATE_SOCKET,
        peerPrivatePort,
        peerPrivateAddress
      );
    }
  });

  const sendMessage = () => {
    const {
      address: privateAddress,
      port: privatePort,
    } = TRAVERSAL_SERVER_SOCKET.address();
    PEER_PUBLIC_SOCKET.bind(privatePort, privateAddress);
    PEER_PRIVATE_SOCKET.bind(privatePort, privateAddress);
    const message = { privateAddress, privatePort, hostCode };
    TRAVERSAL_SERVER_SOCKET.send(JSON.stringify(message));
  };

  try {
    TRAVERSAL_SERVER_SOCKET.connect(
      TRAVERSAL_SERVER_PORT,
      TRAVERSAL_SERVER_ADDRESS,
      sendMessage
    );
  } catch (error) {
    // socket is already connected
    sendMessage();
  }
}
