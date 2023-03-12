import { logLevel, LogLevel } from '@src/decorators'
import { LogService, RTCConnectionService, SignalingChannelService, BaseService, ConfigService } from '@src/services'
import {
  IP2PDataChannel,
  IP2PChannelMessage,
  P2PChannelMessageCallback,
  PeerId,
  ISignalingMessage,
  SignalingMessageType,
  IConfig
} from '@src/types'

import { ConnectionNotEstablished, CONNECTION_TIMEOUT } from '..'

export class P2PDataChannel<IRTCMessagePayload> extends BaseService implements IP2PDataChannel<IRTCMessagePayload> {
  public localPeerId: PeerId

  private signalingChannelService: SignalingChannelService
  private rtcConnectionService = new RTCConnectionService<IRTCMessagePayload>()
  private logService = new LogService(P2PDataChannel.name)

  private onMessageCallback?: P2PChannelMessageCallback<IRTCMessagePayload>
  private onConnectedCallback?: (remotePeerId: PeerId) => void

  constructor(localPeerId: PeerId, config?: IConfig, ...args: unknown[]) {
    super(args)
    if (config) ConfigService.fromObject(config)
    this.localPeerId = localPeerId
    this.signalingChannelService = new SignalingChannelService(localPeerId)
    this.signalingChannelService.onMessage(this.onSignalingChannelMessage.bind(this))
    this.rtcConnectionService.onIceCandidate(this.onIceCandidateInternalCallback.bind(this))
    this.rtcConnectionService.onMessage(this.onMessageInternalCallback.bind(this))
    this.rtcConnectionService.onConnected(this.onConnectedInternalCallback.bind(this))
    this.signalingChannelService.onConnectionReceived((...args) => this.rtcConnectionService.connect(...args))
  }

  /* PUBLIC */

  async connect(remotePeerId: PeerId): Promise<void> {
    await this.signalingChannelService.connect(remotePeerId)
    return new Promise((resolve, reject) => {
      this.rtcConnectionService.connect(remotePeerId, true)
      void this.sendOffer(remotePeerId)
      this.rtcConnectionService.onConnected(id => {
        if (remotePeerId === id) return resolve()
      })
      setTimeout(() => reject(new ConnectionNotEstablished('timeout')), CONNECTION_TIMEOUT)
    })
  }

  disconnect(remotePeerId: PeerId): void {
    this.signalingChannelService.disconnect(remotePeerId)
    this.rtcConnectionService.disconnect(remotePeerId)
  }

  send(remotePeerId: PeerId, payload: IRTCMessagePayload): void {
    const message = {
      sender: this.localPeerId,
      payload
    }
    this.rtcConnectionService.send(remotePeerId, message)
  }

  broadcast(message: IRTCMessagePayload): void {
    const payload: IP2PChannelMessage<IRTCMessagePayload> = {
      sender: this.localPeerId,
      payload: message
    }
    this.rtcConnectionService.broadcast(payload)
  }

  @logLevel(LogLevel.DEBUG)
  onMessage(callback: P2PChannelMessageCallback<IRTCMessagePayload>): void {
    this.onMessageCallback = callback
  }

  @logLevel(LogLevel.DEBUG)
  onConnected(callback: (remotePeerId: PeerId) => void): void {
    this.onConnectedCallback = callback
  }

  /* PRIVATE */

  @logLevel(LogLevel.DEBUG)
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
    this.signalingChannelService.send(remotePeerId, message)
  }

  private async sendAnswer(remotePeerId: PeerId, offer: RTCSessionDescriptionInit): Promise<void> {
    const answer = await this.rtcConnectionService.createAnswer(remotePeerId, offer)
    const message = this.signPayload<ISignalingMessage>({
      type: SignalingMessageType.ANSWER,
      payload: answer
    })
    this.signalingChannelService.send(remotePeerId, message)
  }

  private sendIceCandidate(remotePeerId: PeerId, candidate: RTCIceCandidate): void {
    const message = this.signPayload<ISignalingMessage>({
      type: SignalingMessageType.CANDIDATE,
      payload: candidate
    })
    this.signalingChannelService.send(remotePeerId, message)
  }

  private async onSignalingChannelMessage(message: IP2PChannelMessage<ISignalingMessage>): Promise<void> {
    if (message) {
      switch (message.payload.type) {
        case SignalingMessageType.OFFER:
          await this.sendAnswer(message.sender, message.payload.payload as RTCSessionDescriptionInit)
          break
        case SignalingMessageType.ANSWER:
          await this.rtcConnectionService.setRemoteDescription(message.sender, message.payload.payload as RTCSessionDescription)
          break
        case SignalingMessageType.CANDIDATE:
          await this.rtcConnectionService.addIceCandidate(message.sender, message.payload.payload as RTCIceCandidate)
          break
      }
    }
  }

  @logLevel(LogLevel.DEBUG)
  private onMessageInternalCallback(message: IP2PChannelMessage<IRTCMessagePayload>): void {
    if (!this.onMessageCallback) {
      this.logService.warn('onMessageCallback not set')
      return
    }
    void this.onMessageCallback(message)
  }

  @logLevel(LogLevel.DEBUG)
  private onConnectedInternalCallback(remotePeerId: PeerId): void {
    if (!this.onConnectedCallback) {
      this.logService.warn('onConnected not set')
      return
    }
    void this.onConnectedCallback(remotePeerId)
  }

  private onIceCandidateInternalCallback(remotePeerId: PeerId, event: RTCPeerConnectionIceEvent): void {
    if (!event.candidate) return
    this.sendIceCandidate(remotePeerId, event.candidate)
  }
}
