import { LogService, RTCConnectionService, SignalingChannelService } from '@src/services'
import {
  IP2PDataChannel,
  IP2PChannelMessage,
  P2PChannelMessageCallback,
  PeerId,
  ISignalingMessage,
  SignalingMessageType
} from '@src/types'

export class P2PDataChannel<IRTCMessagePayload> implements IP2PDataChannel<IRTCMessagePayload> {
  private signalingChannelService: SignalingChannelService
  private rtcConnectionService = new RTCConnectionService<IRTCMessagePayload>()
  private logService = new LogService(P2PDataChannel.name)
  private onMessageCallback?: P2PChannelMessageCallback<IRTCMessagePayload>

  public localPeerId: PeerId

  constructor(localPeerId: PeerId) {
    this.localPeerId = localPeerId
    this.signalingChannelService = new SignalingChannelService(localPeerId)
    this.signalingChannelService.onMessage(this.onSignalingChannelMessage.bind(this))
    this.signalingChannelService.onConnectionReceived(this.onConnectionReceived.bind(this))
    this.rtcConnectionService.onIceCandidate(this.onIceCandidateInternalCallback.bind(this))
    this.rtcConnectionService.onMessage(this.onMessageInternalCallback.bind(this))
    this.logService.log('P2PDataChannel initiated')
  }

  /* PUBLIC */

  async connect(remotePeerId: PeerId): Promise<void> {
    this.logService.debug('connecting signaling channel', remotePeerId)
    await this.signalingChannelService.connect(remotePeerId)
    this.rtcConnectionService.connect(remotePeerId, true)
    await this.sendOffer(remotePeerId)
    this.logService.log('connected', remotePeerId)
  }

  disconnect(remotePeerId: PeerId): void {
    this.logService.debug('disconnecting', remotePeerId)
    this.signalingChannelService.disconnect(remotePeerId)
    this.rtcConnectionService.disconnect(remotePeerId)
    this.logService.log('disconnected', remotePeerId)
  }

  onMessage(callback: P2PChannelMessageCallback<IRTCMessagePayload>): void {
    this.onMessageCallback = callback
    this.logService.debug('set onMessageCallback', { callback })
  }

  send(remotePeerId: PeerId, payload: IRTCMessagePayload): void {
    const message = {
      sender: this.localPeerId,
      payload
    }
    this.rtcConnectionService.send(remotePeerId, message)
    this.logService.log('sent message', message)
  }

  broadcast(message: IRTCMessagePayload): void {
    const payload: IP2PChannelMessage<IRTCMessagePayload> = {
      sender: this.localPeerId,
      payload: message
    }
    this.rtcConnectionService.broadcast(payload)
    this.logService.log('broadcasted message', message)
  }

  /* PRIVATE */

  private signPayload<IMessageType>(payload: IMessageType): IP2PChannelMessage<IMessageType> {
    return {
      sender: this.localPeerId,
      payload
    }
  }

  private async sendOffer(remotePeerId: PeerId): Promise<void> {
    this.logService.debug('sending offer', remotePeerId)
    const offer = await this.rtcConnectionService.createOffer(remotePeerId)
    const message = this.signPayload<ISignalingMessage>({
      type: SignalingMessageType.OFFER,
      payload: offer
    })
    await this.signalingChannelService.send(remotePeerId, message)
    this.logService.log('sent offer', { remotePeerId, offer })
  }

  private async sendAnswer(remotePeerId: PeerId, offer: RTCSessionDescriptionInit): Promise<void> {
    this.logService.debug('sending answer', { remotePeerId, offer })
    const answer = await this.rtcConnectionService.createAnswer(remotePeerId, offer)
    const message = this.signPayload<ISignalingMessage>({
      type: SignalingMessageType.ANSWER,
      payload: answer
    })
    await this.signalingChannelService.send(remotePeerId, message)
    this.logService.log('sent answer', { remotePeerId, answer })
  }

  private async sendIceCandidate(remotePeerId: PeerId, candidate: RTCIceCandidate): Promise<void> {
    this.logService.debug('sending ice candidate', { remotePeerId, candidate })
    const message = this.signPayload<ISignalingMessage>({
      type: SignalingMessageType.CANDIDATE,
      payload: candidate
    })
    await this.signalingChannelService.send(remotePeerId, message)
    this.logService.log('sent answer', { remotePeerId, candidate })
  }

  private async onSignalingChannelMessage(message: IP2PChannelMessage<ISignalingMessage>): Promise<void> {
    this.logService.debug('signaling channel message', message)
    if (message) {
      switch (message.payload.type) {
        case SignalingMessageType.OFFER:
          this.logService.log('offer received', message)
          await this.sendAnswer(message.sender, message.payload.payload as RTCSessionDescriptionInit)
          break
        case SignalingMessageType.ANSWER:
          this.logService.log('answer received', message)
          await this.rtcConnectionService.setRemoteDescription(message.sender, message.payload.payload as RTCSessionDescription)
          break
        case SignalingMessageType.CANDIDATE:
          this.logService.log('ice candidate received from', message.sender)
          await this.rtcConnectionService.addIceCandidate(message.sender, message.payload.payload as RTCIceCandidate)
          break
      }
    }
  }

  private onMessageInternalCallback(message: IP2PChannelMessage<IRTCMessagePayload>): void {
    this.logService.debug('message internal callback', { message })
    if (!this.onMessageCallback) {
      this.logService.warn('onMessageCallback not set')
      return
    }
    void this.onMessageCallback(message)
    this.logService.debug('called onMessageCallback with', { message })
  }

  private async onIceCandidateInternalCallback(remotePeerId: PeerId, event: RTCPeerConnectionIceEvent): Promise<void> {
    this.logService.debug('ice candidate internal callback', { remotePeerId, event })
    if (!event.candidate) return
    await this.sendIceCandidate(remotePeerId, event.candidate)
    this.logService.log('ice candidate sent', { remotePeerId, candidate: event.candidate })
  }

  private onConnectionReceived(remotePeerId: PeerId) {
    this.logService.debug('connection received', { remotePeerId })
    this.rtcConnectionService.connect(remotePeerId)
    this.logService.log('connected', { remotePeerId })
  }
}
