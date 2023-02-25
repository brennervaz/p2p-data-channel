import PeerJS, { DataConnection } from 'peerjs'

import { CONNECTION_TIMEOUT } from '@src/config'
import ConnectionNotEstablished from '@src/exceptions/ConnectionNotEstablished'
import { ConnectionService, JsonEncodingService, LogService } from '@src/services'
import {
  IP2PChannelMessage,
  P2PChannelMessageCallback,
  PeerId,
  ConnectionReceivedCallback,
  ISignalingChannelService,
  ISignalingMessage,
  SigalingEventKey
} from '@src/types'

export class SignalingChannelService implements ISignalingChannelService {
  private logService = new LogService(SignalingChannelService.name)
  private encodingService = new JsonEncodingService()
  private connectionService = new ConnectionService<DataConnection>()
  private peerJS: PeerJS
  private onMessageCallback?: P2PChannelMessageCallback<ISignalingMessage>
  private onConnectionReceivedCallback?: ConnectionReceivedCallback

  constructor(localPeerId: PeerId) {
    this.peerJS = new PeerJS(localPeerId)
    this.peerJS.on(SigalingEventKey.OPEN, () => {
      this.peerJS.on(SigalingEventKey.CONNECTION, (...args) => {
        this.onConnectionReceivedInternalCallback(...args)
      })
    })
    this.logService.log('signaling channel open', localPeerId)
  }

  /* PUBLIC */
  public close(): void {
    this.peerJS.destroy()
    this.logService.log('signaling channel destroyed')
  }

  public async connect(remotePeerId: PeerId): Promise<void> {
    this.logService.debug('connecting', remotePeerId)
    return new Promise((resolve, reject) => {
      this.peerJS.on(SigalingEventKey.OPEN, () => {
        const dataConnection = this.peerJS.connect(remotePeerId)
        dataConnection.on(SigalingEventKey.OPEN, () => {
          this.logService.log('connected', { remotePeerId, dataConnection })
          dataConnection.on(SigalingEventKey.DATA, (...args) => this.onDataInternalCallback(...args))
          this.connectionService.addConnection(remotePeerId, dataConnection)
          resolve()
        })
      })
      setTimeout(() => reject(new ConnectionNotEstablished('timeout')), CONNECTION_TIMEOUT)
    })
  }

  public disconnect(remotePeerId: PeerId): void {
    const dataConnection = this.connectionService.getConnection(remotePeerId)
    dataConnection.close()
    this.connectionService.removeConnection(remotePeerId)
    this.logService.log('disconnected', remotePeerId)
  }

  public async send(remotePeerId: PeerId, payload: IP2PChannelMessage<ISignalingMessage>): Promise<void> {
    return new Promise((resolve, reject) => {
      const dataConnection = this.connectionService.getConnection(remotePeerId)
      const encodedPayload = this.encodingService.encode(payload)
      dataConnection.send(encodedPayload)
      this.logService.log('sent message', { remotePeerId, payload })
      resolve()
      setTimeout(() => reject(new ConnectionNotEstablished('timeout')), CONNECTION_TIMEOUT)
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
    this.logService.debug('on connection received internal callback', dataConnection)
    dataConnection.on(SigalingEventKey.OPEN, () => {
      this.logService.debug('data connection open', { dataConnection })
      dataConnection.on(SigalingEventKey.DATA, (...args) => {
        this.onDataInternalCallback(...args)
      })
      this.connectionService.addConnection(dataConnection.peer, dataConnection)
      if (!this.onConnectionReceivedCallback) {
        this.logService.warn('onConnectionReceivedCallback not set')
        return
      }
      this.onConnectionReceivedCallback(dataConnection.peer)
      this.logService.debug('called onConnectionReceivedCallback with', dataConnection.peer)
    })
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
