import { P2PChannelMessageCallback, PeerId } from '@src/types'

export enum RTCEventKey {
  CONNECTION_STATE_CHANGED = 'connectionstatechange',
  DATA_CHANNEL = 'datachannel',
  ICE_CANDIDATE = 'icecandidate',
  ICE_CANDIDATE_ERROR = 'icecandidateerror',
  ICE_CONNECTION_STATE_CHANGE = 'iceconnectionstatechange',
  ICE_GATHERING_STATE_CHANGE = 'icegatheringstatechange',
  NEGOTIATION_NEEDED = 'negotiationneeded',
  SIGNALING_STATE_CHANGE = 'signalingstatechange',
  TRACK = 'track'
}

export enum RTCDataChannelEventKey {
  BUFFERED_AMOUNT_LOW = 'bufferedamountlow',
  OPEN = 'open',
  CLOSE = 'close',
  CLOSING = 'closing',
  ERROR = 'error',
  MESSAGE = 'message'
}

export type RTCEventCallback<IRTCEvent> = (remotePeerId: PeerId, event: IRTCEvent) => void | Promise<void>

export interface IPeer {
  peerId: PeerId
  rtcConnection: RTCPeerConnection
}

export type ConnectionTimeoutCheck = Map<PeerId, NodeJS.Timeout | NodeJS.Timer>

export interface IRTCConnectionService<IRTCMessagePayload> {
  connect(remotePeerId: PeerId): Promise<void>

  disconnect(remotePeerId: PeerId): void

  send(remotePeerId: PeerId, payload: IRTCMessagePayload): void

  broadcast(payload: IRTCMessagePayload): void

  createOffer(remotePeerId: PeerId): Promise<RTCSessionDescriptionInit>

  createAnswer(remotePeerId: PeerId, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit>

  addIceCandidate(remotePeerId: PeerId, candidate: RTCIceCandidate): Promise<void>

  setRemoteDescription(remotePeerId: PeerId, description: RTCSessionDescription): Promise<void>

  onMessage(callback: P2PChannelMessageCallback<IRTCMessagePayload>): void

  onIceCandidate(callback: RTCEventCallback<RTCPeerConnectionIceEvent>): void

  onConnected(callback: RTCEventCallback<void>): void

  onDisconnected(callback: RTCEventCallback<void>): void
}
