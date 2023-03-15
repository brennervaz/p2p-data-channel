import { P2PChannelMessageCallback, PeerId } from '@src/types'

export enum SignalingMessageType {
  OFFER = 'offer',
  ANSWER = 'answer',
  CANDIDATE = 'candidate'
}

export enum SigalingEventKey {
  OPEN = 'open',
  CONNECTION = 'connection',
  DATA = 'data',
  CLOSE = 'close',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export type ConnectionReceivedCallback = (remotePeerId: PeerId) => void

export interface ISignalingMessage {
  type: SignalingMessageType
  payload: RTCSessionDescriptionInit | RTCIceCandidate
}

export interface ISignalingChannelService {
  close(): void

  connect(remotePeerId: PeerId): Promise<void>

  disconnect(remotePeerId: PeerId): void

  send(remotePeerId: PeerId, message: ISignalingMessage): void

  onMessage(callback: P2PChannelMessageCallback<ISignalingMessage>): void

  onConnectionReceived(callback: ConnectionReceivedCallback): void
}
