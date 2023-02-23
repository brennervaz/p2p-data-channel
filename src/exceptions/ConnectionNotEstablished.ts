export default class ConnectionNotEstablished implements Error {
  name = 'connection_not_established'
  message = 'The connection is not established'

  constructor(message?: string) {
    if (message) this.message = message
  }
}
