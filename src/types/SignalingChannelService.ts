import { IP2PChannelMessage, P2PChannelMessageCallback, PeerId } from '@src/types'

export enum SignalingMessageType {
  OFFER = 'offer',
  ANSWER = 'answer',
  CANDIDATE = 'candidate'
}

export type ConnectionReceivedCallback = (remotePeerId: PeerId) => void

export interface ISignalingMessage {
  type: SignalingMessageType
  payload: RTCSessionDescriptionInit | RTCIceCandidate
}

export interface ISignalingChannelService {
  open(localPeerId: PeerId): void

  close(): void

  connect(remotePeerId: PeerId): Promise<void>

  disconnect(remotePeerId: PeerId): void

  send(remotePeerId: PeerId, payload: IP2PChannelMessage<ISignalingMessage>): Promise<void>

  onMessage(callback: P2PChannelMessageCallback<ISignalingMessage>): void

  onConnectionReceived(callback: ConnectionReceivedCallback): void
}
