import { IConfig } from '..'

export const defaultConfig: IConfig = {
  debug: false,
  dataChannel: 'default',
  connectionTimeout: 5000,
  pingInterval: 4000,
  pingTimeout: 8000
}
