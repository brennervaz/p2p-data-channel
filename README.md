# p2p-datachannel

`p2p-datachannel` is a TypeScript library that provides a wrapper for creating a simple peer-to-peer (P2P) data channel using WebRTC for the main data channel and PeerJS as a signaling channel. This library is designed to make it easy for developers to integrate peer-to-peer communication into their web applications.

## Installation

To install the library, run the following command:

```sh
npm install p2p-datachannel
```

## Usage

To use the library, import the `DataChannel` class from the `p2p-datachannel` package and create a new instance of the class:

```typescript
import { DataChannel } from 'p2p-datachannel';

const dataChannel = new DataChannel();
```

You can then use the dataChannel instance to create a peer connection and start sending data:

```typescript
dataChannel.createPeerConnection();
dataChannel.sendData('Hello, world!');
```

You can also listen for incoming data using the onData event:

```typescript
dataChannel.onData((data) => {
  console.log(`Received data: ${data}`);
});
```

## Configuration

The `DataChannel` class accepts an optional configuration object that can be used to customize the behavior of the data channel. The following options are available:

- peerJSKey (string): The PeerJS API key to use for signaling (default: undefined).
- dataChannelConfig (RTCDataChannelInit): The configuration object to use when creating the WebRTC data channel (default: {}).
- peerConfig (Peer.PeerJSOption): The configuration object to use when creating the PeerJS instance (default: {}).

Here is an example of how to configure the DataChannel instance:

```typescript
const dataChannel = new DataChannel({
  peerJSKey: 'my-peerjs-key',
  dataChannelConfig: {
    ordered: true,
    maxRetransmits: 3,
  },
  peerConfig: {
    debug: 2,
  },
});
```

## Contributing

If you find a bug or have a feature request, please open an issue on the GitHub repository. Pull requests are also welcome!

## License

This project is licensed under the MIT License - see the LICENSE file for details.
