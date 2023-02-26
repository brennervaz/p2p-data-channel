import { DEFAULT_DATA_CHANNEL } from '@src/config'
import { BaseService, ConnectionService, JsonEncodingService, LogService } from '@src/services'
import {
  P2PChannelMessageCallback,
  IP2PChannelMessage,
  PeerId,
  IRTCConnectionService,
  RTCEventCallback,
  RTCEventKey,
  RTCDataChannelEventKey
} from '@src/types'

export class RTCConnectionService<IRTCMessagePayload> extends BaseService implements IRTCConnectionService<IRTCMessagePayload> {
  private connectionService = new ConnectionService<RTCPeerConnection>()
  private dataChannelService = new ConnectionService<RTCDataChannel>()
  private logService = new LogService(RTCConnectionService.name)
  private encodingService = new JsonEncodingService()

  private onMessageCallback?: P2PChannelMessageCallback<IRTCMessagePayload>
  private onIceCandidateCallback?: RTCEventCallback<RTCPeerConnectionIceEvent>

  /* PUBLIC */

  public connect(remotePeerId: PeerId, createDataChannel = false): void {
    const connection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    if (createDataChannel) {
      const dataChannel = connection.createDataChannel(DEFAULT_DATA_CHANNEL)
      this.initDataChannel(remotePeerId, dataChannel)
    }
    connection.addEventListener(RTCEventKey.DATA_CHANNEL, event => this.onDataChannelInternalCallback(remotePeerId, event))
    connection.onicecandidate = event => this.onIceCandidateInternalCallback(remotePeerId, event)
    this.connectionService.addConnection(remotePeerId, connection)
  }

  public disconnect(remotePeerId: PeerId): void {
    this.connectionService.getConnection(remotePeerId).close()
  }

  public onMessage(callback: P2PChannelMessageCallback<IRTCMessagePayload>): void {
    this.onMessageCallback = callback
  }

  public send(remotePeerId: PeerId, message: IP2PChannelMessage<IRTCMessagePayload>): void {
    const connection = this.dataChannelService.getConnection(remotePeerId)
    const encodedMessage = this.encodingService.encode(message)
    connection.send(encodedMessage)
  }

  public broadcast(message: IP2PChannelMessage<IRTCMessagePayload>): void {
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

  public onIceCandidate(callback: RTCEventCallback<RTCPeerConnectionIceEvent>): void {
    this.onIceCandidateCallback = callback
  }

  /* PRIVATE */

  private initDataChannel(remotePeerId: PeerId, dataChannel: RTCDataChannel): void {
    dataChannel.addEventListener(RTCDataChannelEventKey.OPEN, this.onDataChannelOpenInternalCallback.bind(this))
    dataChannel.addEventListener(RTCDataChannelEventKey.MESSAGE, this.onDataChannelDataInternalCallback.bind(this))
    this.dataChannelService.addConnection(remotePeerId, dataChannel)
  }

  private onDataChannelDataInternalCallback(event: MessageEvent) {
    if (!event.data) return
    if (!this.onMessageCallback) {
      this.logService.warn('onMessageCallback not set')
      return
    }
    const decodedMessage = this.encodingService.decode<IP2PChannelMessage<IRTCMessagePayload>>(String(event.data))
    void this.onMessageCallback(decodedMessage)
  }

  private onIceCandidateInternalCallback(remotePeerId: PeerId, event: RTCPeerConnectionIceEvent) {
    if (!event.candidate) return
    if (!this.onIceCandidateCallback) {
      this.logService.warn('onIceCandidateCallback not set')
      return
    }
    void this.onIceCandidateCallback(remotePeerId, event)
  }

  private onDataChannelInternalCallback(remotePeerId: PeerId, event: RTCDataChannelEvent) {
    if (!event.channel) return
    this.initDataChannel(remotePeerId, event.channel)
  }

  private onDataChannelOpenInternalCallback() {
    return
  }
}
