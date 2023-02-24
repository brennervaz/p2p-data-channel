import { ConnectionService, JsonEncodingService, LogService } from '@src/services'
import { P2PChannelMessageCallback, IP2PChannelMessage, PeerId, IRTCConnectionService, RTCEventCallback } from '@src/types'

export class RTCConnectionService<IRTCMessagePayload> implements IRTCConnectionService<IRTCMessagePayload> {
  private connectionService = new ConnectionService<RTCPeerConnection>()
  private dataChannelService = new ConnectionService<RTCDataChannel>()
  private logService = new LogService(RTCConnectionService.name)
  private encodingService = new JsonEncodingService()

  private onMessageCallback?: P2PChannelMessageCallback<IRTCMessagePayload>
  private onIceCandidateCallback?: RTCEventCallback<RTCPeerConnectionIceEvent>
  private onDataChannelCallback?: RTCEventCallback<RTCDataChannelEvent>

  /* PUBLIC */

  public connect(remotePeerId: PeerId): void {
    const connection = new RTCPeerConnection()
    connection.onicecandidate = this.onIceCandidateInternalCallback(remotePeerId).bind(this)
    connection.ondatachannel = this.onDataChannelInternalCallback(remotePeerId).bind(this)
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

  public onDataChannel(callback: RTCEventCallback<RTCDataChannelEvent>): void {
    this.onDataChannelCallback = callback
    this.logService.debug('set onDataChannel callback')
  }

  public createDataChannel(remotePeerId: PeerId, label: string): void {
    const connection = this.connectionService.getConnection(remotePeerId)
    const dataChannel = connection.createDataChannel(label)
    this.initDataChannel(remotePeerId, dataChannel)
    this.logService.log('created data channel')
  }

  /* PRIVATE */

  private initDataChannel(remotePeerId: PeerId, dataChannel: RTCDataChannel): void {
    dataChannel.onopen = this.onDataChannelOpenInternalCallback(remotePeerId, dataChannel).bind(this)
    this.dataChannelService.addConnection(remotePeerId, dataChannel)
    this.logService.debug('initiated data channel', {
      remotePeerId,
      dataChannel
    })
  }

  private onIceCandidateInternalCallback(remotePeerId: PeerId): (event: RTCPeerConnectionIceEvent) => void {
    return event => {
      this.logService.debug('ice candidate event', event)
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
  }

  private onDataChannelInternalCallback(remotePeerId: PeerId): (event: RTCDataChannelEvent) => void {
    return event => {
      this.logService.debug('data channel event', event)
      if (!event.channel) return

      this.initDataChannel(remotePeerId, event.channel)
      this.logService.log('initiated data channel')

      if (!this.onDataChannelCallback) {
        this.logService.warn('onDataChannelCallback not set')
        return
      }

      void this.onDataChannelCallback(remotePeerId, event)
      this.logService.debug('called onDataChannelCallback with', {
        remotePeerId,
        event
      })
    }
  }

  private onDataChannelDataInternalCallback(remotePeerId: PeerId): (data: unknown) => void {
    return data => {
      this.logService.debug('data channel event', event)
      if (!data) return

      if (!this.onMessageCallback) {
        this.logService.warn('onMessageCallback not set')
        return
      }
      const decodedMessage = this.encodingService.decode<IRTCMessagePayload>(String(data))
      const message: IP2PChannelMessage<IRTCMessagePayload> = {
        sender: remotePeerId,
        payload: decodedMessage
      }
      void this.onMessageCallback(message)
      this.logService.debug('called onMessageCallback with', {
        remotePeerId,
        event
      })
    }
  }

  private onDataChannelOpenInternalCallback(remotePeerId: PeerId, dataChannel: RTCDataChannel): (event: Event) => void {
    return event => {
      this.logService.debug('data channel open event', event)
      dataChannel.onmessage = this.onDataChannelDataInternalCallback(remotePeerId).bind(this)
    }
  }
}
