import { ConnectionService, JsonEncodingService, LogService } from '@src/services'
import {
  P2PChannelMessageCallback,
  IP2PChannelMessage,
  PeerId,
  IRTCConnectionService,
  RTCEventCallback,
  RTCEventKey,
  RTCDataChannelEventKey
} from '@src/types'

import { DEFAULT_DATA_CHANNEL } from '..'

export class RTCConnectionService<IRTCMessagePayload> implements IRTCConnectionService<IRTCMessagePayload> {
  private connectionService = new ConnectionService<RTCPeerConnection>()
  private dataChannelService = new ConnectionService<RTCDataChannel>()
  private logService = new LogService(RTCConnectionService.name)
  private encodingService = new JsonEncodingService()

  private onMessageCallback?: P2PChannelMessageCallback<IRTCMessagePayload>
  private onIceCandidateCallback?: RTCEventCallback<RTCPeerConnectionIceEvent>

  /* PUBLIC */

  public connect(remotePeerId: PeerId, createDataChannel = false): void {
    this.logService.debug('connecting', { remotePeerId, createDataChannel })
    const connection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
    if (createDataChannel) {
      const dataChannel = connection.createDataChannel(DEFAULT_DATA_CHANNEL)
      this.initDataChannel(remotePeerId, dataChannel)
      this.logService.log('data channel created', { remotePeerId, dataChannel })
    }
    connection.addEventListener(RTCEventKey.DATA_CHANNEL, event => this.onDataChannelInternalCallback(remotePeerId, event))
    connection.onicecandidate = event => this.onIceCandidateInternalCallback(remotePeerId, event)
    this.connectionService.addConnection(remotePeerId, connection)
    this.logService.log('connected', remotePeerId)
  }

  public disconnect(remotePeerId: PeerId): void {
    const connection = this.connectionService.getConnection(remotePeerId)
    connection.close()
    this.logService.log('disconnected', remotePeerId)
  }

  public onMessage(callback: P2PChannelMessageCallback<IRTCMessagePayload>): void {
    this.onMessageCallback = callback
    this.logService.debug('onMessage callback set', { callback })
  }

  public send(remotePeerId: PeerId, message: IP2PChannelMessage<IRTCMessagePayload>): void {
    const connection = this.dataChannelService.getConnection(remotePeerId)
    const encodedMessage = this.encodingService.encode(message)
    connection.send(encodedMessage)
    this.logService.log('sent message', { remotePeerId, message })
  }

  public broadcast(message: IP2PChannelMessage<IRTCMessagePayload>): void {
    const encodedMessage = this.encodingService.encode(message)
    this.dataChannelService.getAll().forEach(dataChannel => dataChannel.send(encodedMessage))
    this.logService.log('broadcasted message', message)
  }

  public async createOffer(remotePeerId: PeerId): Promise<RTCSessionDescriptionInit> {
    const connection = this.connectionService.getConnection(remotePeerId)
    const offer = await connection.createOffer()
    await connection.setLocalDescription(offer)
    this.logService.log('created offer', { remotePeerId, offer })
    return offer
  }

  public async createAnswer(remotePeerId: PeerId, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const connection = this.connectionService.getConnection(remotePeerId)
    await connection.setRemoteDescription(offer)
    const answer = await connection.createAnswer()
    await connection.setLocalDescription(answer)
    this.logService.log('created answer', { remotePeerId, answer })
    return answer
  }

  public async addIceCandidate(remotePeerId: PeerId, candidate: RTCIceCandidate): Promise<void> {
    const connection = this.connectionService.getConnection(remotePeerId)
    await connection.addIceCandidate(candidate)
    this.logService.log('added ice candidate', { remotePeerId, candidate })
  }

  public async setRemoteDescription(remotePeerId: PeerId, description: RTCSessionDescription): Promise<void> {
    const connection = this.connectionService.getConnection(remotePeerId)
    await connection.setRemoteDescription(description)
    this.logService.log('set remote description', {
      remotePeerId,
      description
    })
  }

  public onIceCandidate(callback: RTCEventCallback<RTCPeerConnectionIceEvent>): void {
    this.onIceCandidateCallback = callback
    this.logService.debug('set onIceCandidate callback')
  }

  /* PRIVATE */

  private initDataChannel(remotePeerId: PeerId, dataChannel: RTCDataChannel): void {
    dataChannel.addEventListener(RTCDataChannelEventKey.OPEN, event =>
      this.onDataChannelOpenInternalCallback(remotePeerId, dataChannel, event)
    )
    dataChannel.addEventListener(RTCDataChannelEventKey.MESSAGE, event =>
      this.onDataChannelDataInternalCallback(remotePeerId, event)
    )
    this.dataChannelService.addConnection(remotePeerId, dataChannel)
    this.logService.debug('data channel initiated', {
      remotePeerId,
      dataChannel
    })
  }

  private onIceCandidateInternalCallback(remotePeerId: PeerId, event: RTCPeerConnectionIceEvent) {
    this.logService.debug('ice candidate event', event)
    if (!event.candidate) return

    if (!this.onIceCandidateCallback) {
      this.logService.warn('onIceCandidateCallback not set')
      return
    }

    void this.onIceCandidateCallback(remotePeerId, event)
    this.logService.debug('called onIceCandidateCallback with', {
      remotePeerId,
      event
    })
  }

  private onDataChannelInternalCallback(remotePeerId: PeerId, event: RTCDataChannelEvent) {
    this.logService.debug('data channel event', event)
    if (!event.channel) return

    this.initDataChannel(remotePeerId, event.channel)
    this.logService.log('initiated data channel')
  }

  private onDataChannelDataInternalCallback(remotePeerId: PeerId, event: MessageEvent) {
    this.logService.debug('data channel event', event)
    if (!event.data) return

    if (!this.onMessageCallback) {
      this.logService.warn('onMessageCallback not set')
      return
    }
    const decodedMessage = this.encodingService.decode<IP2PChannelMessage<IRTCMessagePayload>>(String(event.data))
    void this.onMessageCallback(decodedMessage)
    this.logService.debug('called onMessageCallback with', decodedMessage)
  }

  private onDataChannelOpenInternalCallback(remotePeerId: PeerId, dataChannel: RTCDataChannel, event: Event) {
    this.logService.debug('data channel open event', event)
  }
}
