import { Socket, createSocket } from 'dgram';

const TRAVERSAL_SERVER_ADDRESS = 'traversal.drybiscuit.org';
const TRAVERSAL_SERVER_PORT = 6363;

let SOCKET: Socket;

function attachListeners(socket: Socket) {
  setInterval(() => {
    socket.send('hello');
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
    socket.send('traversal', port, address);
    if (SOCKET) {
      clearTimeout(timer);
      if (SOCKET !== socket) {
        socket.close();
      }
    }
  }, 1000);
}

function initializeSocket() {
  const traversalServerSocket = createSocket({ type: 'udp4', reuseAddr: true });
  const peerPublicSocket = createSocket({ type: 'udp4', reuseAddr: true });
  const peerPrivateSocket = createSocket({ type: 'udp4', reuseAddr: true });

  traversalServerSocket.on('message', (msg, rinfo) => {
    console.log(`Message from ${rinfo.address} port ${rinfo.port}: ${msg}`);
    const {
      hostCode,
      peerPublicAddress,
      peerPublicPort,
      peerPrivateAddress,
      peerPrivatePort,
    } = JSON.parse(String(msg));

    if (hostCode) {
      console.log(hostCode);
    }

    if (peerPublicAddress && peerPublicPort) {
      attemptTraversal(peerPublicSocket, peerPublicPort, peerPublicAddress);
    }

    if (peerPrivateAddress && peerPrivatePort) {
      attemptTraversal(peerPrivateSocket, peerPrivatePort, peerPrivateAddress);
    }
  });

  traversalServerSocket.connect(
    TRAVERSAL_SERVER_PORT,
    TRAVERSAL_SERVER_ADDRESS,
    () => {
      const {
        address: privateAddress,
        port: privatePort,
      } = traversalServerSocket.address();
      peerPublicSocket.bind(privatePort, privateAddress);
      peerPrivateSocket.bind(privatePort, privateAddress);
      const message = { privateAddress, privatePort };
      traversalServerSocket.send(JSON.stringify(message));
    }
  );
}

initializeSocket();
