import { LogLevel } from '@src/decorators'
import { ConnectionNotEstablished } from '@src/exceptions'
import { BaseService } from '@src/services'
import { IConnection, IConnectionService, PeerId } from '@src/types'

/**
 * Service for managing connections with peers.
 */
export class ConnectionService<IConnectionType> extends BaseService implements IConnectionService<IConnectionType> {
  protected logLevel = LogLevel.DEBUG
  private peerConnections = new Map<PeerId, IConnection<IConnectionType>>()

  /**
   * Add a connection to a peer.
   *
   * @param peerId The ID of the peer.
   * @param connection The connection object to add.
   */
  addConnection(peerId: PeerId, connection: IConnectionType): void {
    const peerConnection: IConnection<IConnectionType> = { peerId, connection }
    this.peerConnections.set(peerId, peerConnection)
  }

  /**
   * Remove the connection to a peer.
   *
   * @param peerId The ID of the peer.
   */
  removeConnection(peerId: PeerId): void {
    this.peerConnections.delete(peerId)
  }

  /**
   * Get the connection to a peer.
   *
   * @param peerId The ID of the peer.
   * @returns The connection object for the peer.
   * @throws ConnectionNotEstablished if the connection is not found for the peer.
   */
  getConnection(peerId: PeerId): IConnectionType {
    const peerConnection = this.peerConnections.get(peerId)
    if (!peerConnection) throw new ConnectionNotEstablished(`Connection not found for peer ${peerId}`)
    return peerConnection.connection
  }

  /**
   * Get all the connections.
   *
   * @returns An array of all the connection objects.
   */
  getAll(): IConnectionType[] {
    return Array.from(this.peerConnections.values()).map(p => p.connection)
  }
}
