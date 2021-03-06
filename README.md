# Hex P2P

Peer-to-peer client for playing Hex over the Internet, or locally.

<img src=".erb/img/screenshot.png" width="75%" />

Uses UDP hole punching to connect peers. See [traversal-server](https://github.com/kevinsung/traversal-server)
for the source code of the traversal server.

## Installation

### GNU/Linux

Download an AppImage file from [Releases](https://github.com/kevinsung/hexp2p/releases).

### Windows

Download a .exe file from [Releases](https://github.com/kevinsung/hexp2p/releases).

### Mac OS

Download a .dmg file from [Releases](https://github.com/kevinsung/hexp2p/releases).

### Compile from source

#### Dependencies

- [Node.js](https://nodejs.org) 14
- [Yarn](https://classic.yarnpkg.com)

#### Instructions

1. Clone the repository.

```
git clone https://github.com/kevinsung/hexp2p.git
cd hexp2p
```

2. Install dependencies.

```
yarn
```

3. Build the app.

```
yarn package
```

The packaged app will be inside the `release` directory.

## Rules of Hex

The players (Black and White) take turns selecting a hexagon to fill with their color.
A player wins when they have built a solid chain between the two edges of their color.
The screenshot at the top of this page demonstrates a winning configuration for Black.

### The swap rule

Normally, the game is played using the swap rule in order to mitigate the advantage of
playing first. Under the swap rule, Black makes the first move, and then White chooses
whether or not to swap pieces with Black. If White chooses to swap pieces, then Black's
move is replaced with the equivalent White move, and then it is Black's turn. Play then
continues as normal.

## License

Copyright (C) 2021 Kevin J. Sung.

Licensed under the AGPLv3. See [LICENSE](./LICENSE).
