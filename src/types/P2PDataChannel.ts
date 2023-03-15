export type PeerId = string

export type P2PChannelMessageCallback<IMessagePayload> = (message: IP2PChannelMessage<IMessagePayload>) => void | Promise<void>

export interface IP2PChannelMessage<IMessagePayload> {
  sender: PeerId
  payload: IMessagePayload
}

export interface IP2PDataChannel<IMessagePayload> {
  connect(remotePeerId: PeerId): Promise<void>

  disconnect(remotePeerId: PeerId): void

  onMessage(callback: P2PChannelMessageCallback<IMessagePayload>): void

  onConnected(callback: (remotePeerId: PeerId) => void): void

  onDisconnected(callback: (remotePeerId: PeerId) => void): void

  send(remotePeerId: PeerId, payload: IMessagePayload): void

  broadcast(message: IMessagePayload): void
}
