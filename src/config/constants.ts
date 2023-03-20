import { IConfig } from '..'

export const defaultConfig: IConfig = {
  debug: false,
  dataChannel: 'default',
  connectionTimeout: 5000,
  pingInterval: 3000,
  pingTimeout: 6000
}
