import { logLevel, LogLevel } from '@src/decorators'
import { BaseService, ConfigService, ConnectionService, JsonEncodingService, LogService } from '@src/services'
import {
  P2PChannelMessageCallback,
  IP2PChannelMessage,
  PeerId,
  IRTCConnectionService,
  RTCEventCallback,
  RTCEventKey,
  RTCDataChannelEventKey,
  ConnectionTimeoutCheck,
  ConfigKey
} from '@src/types'

export class RTCConnectionService<IRTCMessagePayload> extends BaseService implements IRTCConnectionService<IRTCMessagePayload> {
  public localPeerId: PeerId
  private connectionService = new ConnectionService<RTCPeerConnection>()
  private dataChannelService = new ConnectionService<RTCDataChannel>()
  private logService = new LogService(RTCConnectionService.name)
  private encodingService = new JsonEncodingService()
  private timeoutChecks: ConnectionTimeoutCheck = new Map()
  private pingIntervals: ConnectionTimeoutCheck = new Map()

  private onMessageCallback?: P2PChannelMessageCallback<IRTCMessagePayload>
  private onIceCandidateCallback?: RTCEventCallback<RTCPeerConnectionIceEvent>
  private onConnectedCallback?: RTCEventCallback<void>
  private onDisconnectedCallback?: RTCEventCallback<void>

  constructor(localPeerId: PeerId, ...args: unknown[]) {
    super(args)
    this.localPeerId = localPeerId
  }

  /* PUBLIC */

  public async connect(remotePeerId: PeerId, createDataChannel = false): Promise<void> {
    return new Promise(resolve => {
      const connection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })

      connection.addEventListener(RTCEventKey.DATA_CHANNEL, event => this.onDataChannelInternalCallback(remotePeerId, event))
      connection.onicecandidate = event => this.onIceCandidateInternalCallback(remotePeerId, event)

      if (createDataChannel) {
        const dataChannel = connection.createDataChannel(ConfigService.getConfig(ConfigKey.dataChannel))
        resolve(this.initDataChannel(remotePeerId, dataChannel))
      }
      this.connectionService.addConnection(remotePeerId, connection)
    })
  }

  public disconnect(remotePeerId: PeerId): void {
    this.clearPingSequence(remotePeerId)
    this.connectionService.removeConnection(remotePeerId)
    if (!this.onDisconnectedCallback) {
      this.logService.warn('onDisconnectedCallback not set')
      return
    }
    void this.onDisconnectedCallback(remotePeerId)
  }

  public send(remotePeerId: PeerId, payload: IRTCMessagePayload): void {
    const connection = this.dataChannelService.getConnection(remotePeerId)
    const message: IP2PChannelMessage<IRTCMessagePayload> = { sender: this.localPeerId, payload }
    const encodedMessage = this.encodingService.encode(message)
    connection.send(encodedMessage)
  }

  public broadcast(payload: IRTCMessagePayload): void {
    const message: IP2PChannelMessage<IRTCMessagePayload> = { sender: this.localPeerId, payload }
    const encodedMessage = this.encodingService.encode(message)
    this.dataChannelService.getAll().forEach(dataChannel => dataChannel.send(encodedMessage))
  }

  public async createOffer(remotePeerId: PeerId): Promise<RTCSessionDescriptionInit> {
    const connection = this.connectionService.getConnection(remotePeerId)
    const offer = await connection.createOffer()
    await connection.setLocalDescription(offer)
    return offer
  }

  public async createAnswer(remotePeerId: PeerId, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const connection = this.connectionService.getConnection(remotePeerId)
    await connection.setRemoteDescription(offer)
    const answer = await connection.createAnswer()
    await connection.setLocalDescription(answer)
    return answer
  }

  public async addIceCandidate(remotePeerId: PeerId, candidate: RTCIceCandidate): Promise<void> {
    const connection = this.connectionService.getConnection(remotePeerId)
    await connection.addIceCandidate(candidate)
  }

  public async setRemoteDescription(remotePeerId: PeerId, description: RTCSessionDescription): Promise<void> {
    const connection = this.connectionService.getConnection(remotePeerId)
    await connection.setRemoteDescription(description)
  }

  @logLevel(LogLevel.DEBUG)
  public onMessage(callback: P2PChannelMessageCallback<IRTCMessagePayload>): void {
    this.onMessageCallback = callback
  }

  @logLevel(LogLevel.DEBUG)
  public onIceCandidate(callback: RTCEventCallback<RTCPeerConnectionIceEvent>): void {
    this.onIceCandidateCallback = callback
  }

  @logLevel(LogLevel.DEBUG)
  public onConnected(callback: RTCEventCallback<void>): void {
    this.onConnectedCallback = callback
  }

  @logLevel(LogLevel.DEBUG)
  public onDisconnected(callback: RTCEventCallback<void>): void {
    this.onDisconnectedCallback = callback
  }

  /* PRIVATE */

  @logLevel(LogLevel.DEBUG)
  private async initDataChannel(remotePeerId: PeerId, dataChannel: RTCDataChannel): Promise<void> {
    return new Promise(resolve => {
      dataChannel.addEventListener(RTCDataChannelEventKey.OPEN, () => {
        this.onDataChannelOpenInternalCallback(remotePeerId)
        resolve()
      })
      dataChannel.addEventListener(RTCDataChannelEventKey.MESSAGE, this.onDataChannelDataInternalCallback.bind(this))
      this.dataChannelService.addConnection(remotePeerId, dataChannel)
    })
  }

  @logLevel(LogLevel.DEBUG)
  private onDataChannelDataInternalCallback(event: MessageEvent) {
    if (!event.data) return
    if (!this.onMessageCallback) {
      this.logService.warn('onMessageCallback not set')
      return
    }
    const decodedMessage = this.encodingService.decode<IP2PChannelMessage<IRTCMessagePayload>>(String(event.data))
    if (decodedMessage.payload === 'ping') {
      this.send(decodedMessage.sender, 'pong' as IRTCMessagePayload)
      return
    }
    if (decodedMessage.payload === 'pong') {
      this.clearPingTimeout(decodedMessage.sender)
      return
    }
    void this.onMessageCallback(decodedMessage)
  }

  @logLevel(LogLevel.DEBUG)
  private onIceCandidateInternalCallback(remotePeerId: PeerId, event: RTCPeerConnectionIceEvent) {
    if (!event.candidate) return
    if (!this.onIceCandidateCallback) {
      this.logService.warn('onIceCandidateCallback not set')
      return
    }
    void this.onIceCandidateCallback(remotePeerId, event)
  }

  @logLevel(LogLevel.DEBUG)
  private onDataChannelInternalCallback(remotePeerId: PeerId, event: RTCDataChannelEvent) {
    if (!event.channel) return
    void this.initDataChannel(remotePeerId, event.channel)
  }

  @logLevel(LogLevel.DEBUG)
  private onDataChannelOpenInternalCallback(remotePeerId: PeerId) {
    this.setPingInterval(remotePeerId)
    if (!this.onConnectedCallback) {
      this.logService.warn('onConnectedCallback not set')
      return
    }
    void this.onConnectedCallback(remotePeerId)
  }

  @logLevel(LogLevel.DEBUG)
  private clearPingInterval(remotePeerId: PeerId, shouldDelete = false) {
    const pingInterval = this.pingIntervals.get(remotePeerId)
    if (pingInterval) {
      clearInterval(pingInterval)
      if (shouldDelete) {
        this.pingIntervals.delete(remotePeerId)
      }
    }
  }

  @logLevel(LogLevel.DEBUG)
  private clearPingTimeout(remotePeerId: PeerId, shouldDelete = false) {
    const timeoutCheck = this.timeoutChecks.get(remotePeerId)
    if (timeoutCheck) {
      clearTimeout(timeoutCheck)
      if (shouldDelete) {
        this.timeoutChecks.delete(remotePeerId)
      }
    }
  }

  @logLevel(LogLevel.DEBUG)
  private setPingInterval(remotePeerId: PeerId) {
    this.clearPingSequence(remotePeerId)
    const pingInterval = setInterval(() => {
      this.send(remotePeerId, 'ping' as IRTCMessagePayload)
      this.setPingTimeout(remotePeerId)
    }, ConfigService.getConfig(ConfigKey.pingInterval))
    this.pingIntervals.set(remotePeerId, pingInterval)
  }

  @logLevel(LogLevel.DEBUG)
  private setPingTimeout(remotePeerId: PeerId) {
    const timeoutId = setTimeout(() => {
      const timeout = this.timeoutChecks.get(remotePeerId)
      if (timeout) this.disconnect(remotePeerId)
    }, ConfigService.getConfig(ConfigKey.pingTimeout))
    this.timeoutChecks.set(remotePeerId, timeoutId)
  }

  @logLevel(LogLevel.DEBUG)
  private clearPingSequence(remotePeerId: PeerId) {
    this.clearPingInterval(remotePeerId, true)
    this.clearPingTimeout(remotePeerId, true)
  }
}
