import PeerJS, { DataConnection } from 'peerjs'

import ConnectionNotEstablished from '@src/exceptions/ConnectionNotEstablished'
import { ConnectionService, JsonEncodingService, LogService } from '@src/services'
import {
  IP2PChannelMessage,
  P2PChannelMessageCallback,
  PeerId,
  ConnectionReceivedCallback,
  ISignalingChannelService,
  ISignalingMessage
} from '@src/types'

enum ChannelEventKey {
  OPEN = 'open',
  CONNECTION = 'connection',
  DATA = 'data',
  CLOSE = 'close',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export class SignalingChannelService implements ISignalingChannelService {
  private logService = new LogService(SignalingChannelService.name)
  private encodingService = new JsonEncodingService()
  private connectionService = new ConnectionService<DataConnection>()
  private _peerJS?: PeerJS
  private onMessageCallback?: P2PChannelMessageCallback<ISignalingMessage>
  private onConnectionReceivedCallback?: ConnectionReceivedCallback

  private get peerJS(): PeerJS {
    if (!this._peerJS) throw new ConnectionNotEstablished('The signaling channel is not open')
    return this._peerJS
  }

  /* PUBLIC */

  public open(localPeerId: PeerId): void {
    this._peerJS = new PeerJS(localPeerId)
    this._peerJS.on(ChannelEventKey.CONNECTION, this.onConnectionReceivedInternalCallback.bind(this))
    this.logService.log('signaling channel open', localPeerId)
  }

  public close(): void {
    this.peerJS.destroy()
    this.logService.log('signaling channel destroyed')
  }

  public async connect(remotePeerId: PeerId): Promise<void> {
    return new Promise(resolve => {
      const dataConnection = this.peerJS.connect(remotePeerId)
      dataConnection.on(ChannelEventKey.OPEN, () => {
        this.connectionService.addConnection(remotePeerId, dataConnection)
        this.logService.log('connected', { remotePeerId, dataConnection })
        resolve()
      })
    })
  }

  public disconnect(remotePeerId: PeerId): void {
    const dataConnection = this.connectionService.getConnection(remotePeerId)
    dataConnection.close()
    this.connectionService.removeConnection(remotePeerId)
    this.logService.log('disconnected', remotePeerId)
  }

  public async send(remotePeerId: PeerId, payload: IP2PChannelMessage<ISignalingMessage>): Promise<void> {
    return new Promise(resolve => {
      const dataConnection = this.connectionService.getConnection(remotePeerId)
      const encodedPayload = this.encodingService.encode(payload)
      dataConnection.on(ChannelEventKey.OPEN, () => {
        dataConnection.send(encodedPayload)
        this.logService.log('sent message', { remotePeerId, payload })
        resolve()
      })
    })
  }

  public onMessage(callback: P2PChannelMessageCallback<ISignalingMessage>): void {
    this.onMessageCallback = callback
    this.logService.debug('set onMessage callback', callback)
  }

  public onConnectionReceived(callback: ConnectionReceivedCallback): void {
    this.onConnectionReceivedCallback = callback
    this.logService.debug('set onConnectionReceived callback', callback)
  }

  /* PRIVATE */

  private onConnectionReceivedInternalCallback(dataConnection: DataConnection): void {
    dataConnection.on(ChannelEventKey.DATA, this.onDataInternalCallback.bind(this))
    if (!this.onConnectionReceivedCallback) {
      this.logService.warn('onConnectionReceivedCallback not set')
      return
    }
    this.onConnectionReceivedCallback(dataConnection.peer)
    this.logService.debug('called onConnectionReceivedCallback with', dataConnection.peer)
  }

  private onDataInternalCallback(data: unknown): void {
    if (!this.onMessageCallback) {
      this.logService.warn('onMessageCallback not set')
      return
    }

    const parsedData = this.encodingService.decode<IP2PChannelMessage<ISignalingMessage>>(String(data))
    void this.onMessageCallback(parsedData)
    this.logService.debug('called onMessageCallback with', parsedData)
  }
}
