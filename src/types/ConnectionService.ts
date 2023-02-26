import { ConnectionNotEstablished } from '@src/exceptions'
import { PeerId } from '@src/types'

export interface IConnection<IConnectionType> {
  peerId: PeerId
  connection: IConnectionType
}

export interface IConnectionService<IConnectionType> {
  addConnection(peerId: PeerId, connection: IConnectionType): void

  removeConnection(peerId: PeerId): void

  getConnection(peerId: PeerId): IConnectionType | ConnectionNotEstablished

  getAll(): IConnectionType[]
}
