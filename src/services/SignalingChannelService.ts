import PeerJS, { DataConnection } from 'peerjs'

import { logLevel, LogLevel } from '@src/decorators'
import { BaseService, ConnectionService, JsonEncodingService, LogService } from '@src/services'
import {
  IP2PChannelMessage,
  P2PChannelMessageCallback,
  PeerId,
  ConnectionReceivedCallback,
  ISignalingChannelService,
  ISignalingMessage,
  SigalingEventKey
} from '@src/types'

export class SignalingChannelService extends BaseService implements ISignalingChannelService {
  public localPeerId: PeerId
  private logService = new LogService(SignalingChannelService.name)
  private encodingService = new JsonEncodingService()
  private connectionService = new ConnectionService<DataConnection>()
  private peerJS: PeerJS

  private onMessageCallback?: P2PChannelMessageCallback<ISignalingMessage>
  private onConnectionReceivedCallback?: ConnectionReceivedCallback

  constructor(localPeerId: PeerId, ...args: unknown[]) {
    super(args)
    this.localPeerId = localPeerId
    this.peerJS = new PeerJS(localPeerId)
    this.peerJS.on(SigalingEventKey.OPEN, () => {
      this.peerJS.on(SigalingEventKey.CONNECTION, (...args) => {
        this.onConnectionReceivedInternalCallback(...args)
      })
    })
  }

  /* PUBLIC */

  public close(): void {
    this.peerJS.destroy()
  }

  public async connect(remotePeerId: PeerId): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peerJS.on(SigalingEventKey.ERROR, reject)
      this.peerJS.on(SigalingEventKey.OPEN, () => {
        const dataConnection = this.peerJS.connect(remotePeerId)
        dataConnection.on(SigalingEventKey.ERROR, reject)
        dataConnection.on(SigalingEventKey.OPEN, () => {
          dataConnection.on(SigalingEventKey.DATA, this.onDataInternalCallback.bind(this))
          this.connectionService.addConnection(remotePeerId, dataConnection)
          resolve()
        })
      })
    })
  }

  public disconnect(remotePeerId: PeerId): void {
    const dataConnection = this.connectionService.getConnection(remotePeerId)
    dataConnection.close()
    this.connectionService.removeConnection(remotePeerId)
  }

  public send(remotePeerId: PeerId, message: ISignalingMessage): void {
    const dataConnection = this.connectionService.getConnection(remotePeerId)
    const payload: IP2PChannelMessage<ISignalingMessage> = { sender: this.localPeerId, payload: message }
    const encodedPayload = this.encodingService.encode(payload)
    dataConnection.send(encodedPayload)
  }

  @logLevel(LogLevel.DEBUG)
  public onMessage(callback: P2PChannelMessageCallback<ISignalingMessage>): void {
    this.onMessageCallback = callback
  }

  @logLevel(LogLevel.DEBUG)
  public onConnectionReceived(callback: ConnectionReceivedCallback): void {
    this.onConnectionReceivedCallback = callback
  }

  /* PRIVATE */

  private onConnectionReceivedInternalCallback(dataConnection: DataConnection): void {
    dataConnection.on(SigalingEventKey.OPEN, () => {
      dataConnection.on(SigalingEventKey.DATA, (...args) => {
        this.onDataInternalCallback(...args)
      })
      this.connectionService.addConnection(dataConnection.peer, dataConnection)
      if (!this.onConnectionReceivedCallback) {
        this.logService.warn('onConnectionReceivedCallback not set')
        return
      }
      this.onConnectionReceivedCallback(dataConnection.peer)
    })
  }

  private onDataInternalCallback(data: unknown): void {
    if (!this.onMessageCallback) {
      this.logService.warn('onMessageCallback not set')
      return
    }
    const parsedData = this.encodingService.decode<IP2PChannelMessage<ISignalingMessage>>(String(data))
    void this.onMessageCallback(parsedData)
  }
}
