# [WIP] This is work in progress!

[![CircleCI](https://dl.circleci.com/status-badge/img/gh/brennervaz/p2p-data-channel/tree/main.svg?style=svg)](https://dl.circleci.com/status-badge/redirect/gh/brennervaz/p2p-data-channel/tree/main)

# p2p-data-channel

`p2p-data-channel` is a TypeScript library that provides a wrapper for creating a simple peer-to-peer (P2P) data channel using WebRTC for the main data channel and PeerJS as a signaling channel. This library is designed to make it easy for developers to integrate peer-to-peer communication into their web applications.

## Installation

To install the library, run the following command:

```sh
npm install p2p-data-channel
```

## Usage

```typescript
import P2PDataChannel from "p2p-data-channel";

const peerId = "your-peer-id";
const dataChannel = new P2PDataChannel(peerId);

// Send a message
dataChannel.send({
  type: "chat-message",
  payload: "Hello, world!",
});

// Receive a message
dataChannel.onMessage((message) => {
  console.log(`Received message: ${message.payload}`);
});

// Connect to a peer
const peerIdToConnect = "peer-id-to-connect";
dataChannel.connect(peerIdToConnect);

// Disconnect from the peer
dataChannel.disconnect();
```

## How it works

![P2PDataChannel diagram](./docs/sequence.png)

## Contributing

If you find a bug or have a feature request, please open an issue on the GitHub repository. Pull requests are also welcome!

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Special Thanks

Special thanks to ChatGPT for being an excellent copilot throughout the development of this library.