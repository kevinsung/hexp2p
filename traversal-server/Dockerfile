FROM node:14

EXPOSE 6363

# Clone repository
WORKDIR /usr/src
RUN git clone https://github.com/kevinsung/hexp2p.git
WORKDIR /usr/src/hexp2p

# Install dependencies
RUN yarn

# Compile script
RUN yarn tsc traversal-server/traversalServer.ts

ENTRYPOINT ["node", "traversal-server/traversalServer.js"]
