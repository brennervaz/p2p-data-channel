import {
  IP2PDataChannel,
  IP2PChannelMessage,
  P2PChannelMessageCallback,
  PeerId,
  ISignalingMessage,
  SignalingMessageType
} from '@src/types'
import LogService from '@src/services/LogService'
import RTCConnectionService from '@src/services/RTCConnectionService'
import SignalingChannelService from '@src/services/SignalingChannelService'
import { DEFAULT_DATA_CHANNEL } from '@src/config/constants'

class P2PDataChannel<IRTCMessagePayload> implements IP2PDataChannel<IRTCMessagePayload> {
  private signalingChannelService = new SignalingChannelService()
  private rtcConnectionService = new RTCConnectionService<IRTCMessagePayload>()
  private logService = new LogService(P2PDataChannel.name)
  private onMessageCallback?: P2PChannelMessageCallback<IRTCMessagePayload>

  public localPeerId: PeerId

  constructor(localPeerId: PeerId) {
    this.localPeerId = localPeerId
    this.signalingChannelService.open(localPeerId)
    this.signalingChannelService.onMessage(this.onSignalingChannelMessage.bind(this))
    this.rtcConnectionService.onIceCandidate(this.onIceCandidateInternalCallback.bind(this))
    this.rtcConnectionService.onMessage(this.onMessageInternalCallback.bind(this))
    this.logService.log('P2PDataChannel initiated')
  }

  /* PUBLIC */

  async connect(remotePeerId: PeerId): Promise<void> {
    await this.signalingChannelService.connect(remotePeerId)
    this.rtcConnectionService.connect(remotePeerId)
    await this.sendOffer(remotePeerId)
  }

  disconnect(remotePeerId: PeerId): void {
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
    this.logService.log('send message', message)
  }

  broadcast(message: IRTCMessagePayload): void {
    const payload: IP2PChannelMessage<IRTCMessagePayload> = { sender: this.localPeerId, payload: message }
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
    const offer = await this.rtcConnectionService.createOffer(remotePeerId)
    const message = this.signPayload<ISignalingMessage>({
      type: SignalingMessageType.OFFER,
      payload: offer
    })
    await this.signalingChannelService.send(remotePeerId, message)
    this.logService.log('sent offer', { remotePeerId, offer })
  }

  private async sendAnswer(remotePeerId: PeerId, offer: RTCSessionDescriptionInit): Promise<void> {
    this.rtcConnectionService.connect(remotePeerId)
    const answer = await this.rtcConnectionService.createAnswer(remotePeerId, offer)
    const message = this.signPayload<ISignalingMessage>({
      type: SignalingMessageType.ANSWER,
      payload: answer
    })
    await this.signalingChannelService.send(remotePeerId, message)
    this.logService.log('sent answer', { remotePeerId, answer })
  }

  private async onSignalingChannelMessage(message: IP2PChannelMessage<ISignalingMessage>): Promise<void> {
    if (message) {
      switch (message.payload.type) {
        case SignalingMessageType.OFFER:
          this.logService.log('offer received', message)
          await this.sendAnswer(message.sender, message.payload.payload as RTCSessionDescriptionInit)
          break
        case SignalingMessageType.ANSWER:
          this.logService.log('answer received', message)
          await this.rtcConnectionService.setRemoteDescription(message.sender, message.payload.payload as RTCSessionDescription)
          this.rtcConnectionService.createDataChannel(message.sender, DEFAULT_DATA_CHANNEL)
          break
        case SignalingMessageType.CANDIDATE:
          this.logService.log('ice candidate received from', message.sender)
          await this.rtcConnectionService.addIceCandidate(message.sender, message.payload.payload as RTCIceCandidate)
          break
      }
    }
  }

  private onMessageInternalCallback(message: IP2PChannelMessage<IRTCMessagePayload>): void {
    if (!this.onMessageCallback) {
      console.warn('onMessageCallback not set')
      return
    }
    void this.onMessageCallback(message)
    this.logService.debug('called onMessageCallback with', { message })
  }

  private async onIceCandidateInternalCallback(remotePeerId: PeerId, event: RTCPeerConnectionIceEvent): Promise<void> {
    if (!event.candidate) return
    await this.rtcConnectionService.addIceCandidate(remotePeerId, event.candidate)
    this.logService.log('added ice candidate', { remotePeerId, candidate: event.candidate })
  }
}

export default P2PDataChannel
