import ConnectionNotEstablished from '@src/exceptions/ConnectionNotEstablished'
import { LogService } from '@src/services'
import { IConnection, IConnectionService, PeerId } from '@src/types'

export class ConnectionService<IConnectionType> implements IConnectionService<IConnectionType> {
  private logService = new LogService(ConnectionService.name)
  private peerConnections = new Map<PeerId, IConnection<IConnectionType>>()

  addConnection(peerId: PeerId, connection: IConnectionType): void {
    const peerConnection: IConnection<IConnectionType> = { peerId, connection }
    this.peerConnections.set(peerId, peerConnection)
    this.logService.log('added connection', peerConnection)
  }

  removeConnection(peerId: PeerId): void {
    this.peerConnections.delete(peerId)
    this.logService.log('removed connection', peerId)
  }

  getConnection(peerId: PeerId): IConnectionType {
    const peerConnection = this.peerConnections.get(peerId)
    if (!peerConnection) throw new ConnectionNotEstablished(`Connection not found for peer ${peerId}`)
    this.logService.debug('connection', peerConnection)
    return peerConnection.connection
  }

  getAll(): IConnectionType[] {
    return Array.from(this.peerConnections.values()).map(p => p.connection)
  }
}
