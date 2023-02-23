import { IP2PChannelMessage, P2PChannelMessageCallback, PeerId } from '@src/types'

export type RTCEventCallback<IRTCEvent> = (remotePeerId: PeerId, event: IRTCEvent) => void | Promise<void>

export interface IPeer {
  peerId: PeerId
  rtcConnection: RTCPeerConnection
}

export interface IRTCConnectionService<IRTCMessagePayload> {
  connect(remotePeerId: PeerId): void

  disconnect(remotePeerId: PeerId): void

  send(remotePeerId: PeerId, message: IP2PChannelMessage<IRTCMessagePayload>): void

  broadcast(message: IP2PChannelMessage<IRTCMessagePayload>): void

  createOffer(remotePeerId: PeerId): Promise<RTCSessionDescriptionInit>

  createAnswer(remotePeerId: PeerId, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit>

  addIceCandidate(remotePeerId: PeerId, candidate: RTCIceCandidate): Promise<void>

  setRemoteDescription(remotePeerId: PeerId, description: RTCSessionDescription): Promise<void>

  createDataChannel(remotePeerId: PeerId, label: string): void

  onMessage(callback: P2PChannelMessageCallback<IRTCMessagePayload>): void

  onIceCandidate(callback: RTCEventCallback<RTCPeerConnectionIceEvent>): void
}
