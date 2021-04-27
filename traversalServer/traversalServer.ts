import { randomBytes } from 'crypto';
import { createSocket } from 'dgram';

interface ClientInfo {
  publicAddress: string;
  publicPort: number;
  privateAddress: string;
  privatePort: number;
}

const LISTEN_PORT = 6363;

const HOSTS: Map<string, ClientInfo> = new Map();
const HOST_CODES: Map<string, string> = new Map();

function main() {
  // TODO handle deleting clients
  const socket = createSocket('udp4');
  socket.bind(LISTEN_PORT);

  socket.on('message', (msg, rinfo) => {
    console.log(`Message from ${rinfo.address} port ${rinfo.port}: ${msg}`);
    const { privateAddress, privatePort, hostCode } = JSON.parse(String(msg));
    const { address: publicAddress, port: publicPort } = rinfo;

    if (hostCode) {
      // client is requesting connection to peer
      if (HOSTS.has(hostCode)) {
        const {
          publicAddress: peerPublicAddress,
          publicPort: peerPublicPort,
          privateAddress: peerPrivateAddress,
          privatePort: peerPrivatePort,
        } = HOSTS.get(hostCode) as ClientInfo;
        const message = {
          peerPublicAddress,
          peerPublicPort,
          peerPrivateAddress,
          peerPrivatePort,
        };
        const hostMessage = {
          peerPublicAddress: publicAddress,
          peerPublicPort: publicPort,
          peerPrivateAddress: privateAddress,
          peerPrivatePort: privatePort,
        };
        socket.send(JSON.stringify(message), publicPort, publicAddress);
        socket.send(
          JSON.stringify(hostMessage),
          peerPublicPort,
          peerPublicAddress
        );
      }
    } else {
      // client is hosting
      const key = `${publicAddress}:${publicPort}`;
      if (!HOST_CODES.has(key)) {
        const newHostCode = randomBytes(16).toString('hex');
        HOSTS.set(newHostCode, {
          publicAddress,
          publicPort,
          privateAddress,
          privatePort,
        });
        HOST_CODES.set(key, newHostCode);
        const message = { hostCode: newHostCode };
        socket.send(JSON.stringify(message), publicPort, publicAddress);
      }
    }
  });
}

main();
