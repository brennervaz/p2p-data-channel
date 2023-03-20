export enum ConfigKey {
  debug = 'debug',
  dataChannel = 'dataChannel',
  connectionTimeout = 'connectionTimeout',
  pingInterval = 'pingInterval',
  pingTimeout = 'pingTimeout'
}

export interface IConfig {
  [ConfigKey.debug]: boolean
  [ConfigKey.dataChannel]: string
  [ConfigKey.connectionTimeout]: number
  [ConfigKey.pingInterval]: number
  [ConfigKey.pingTimeout]: number
}

export interface IConfigService {
  fromObject(config?: Partial<IConfig>): void

  setConfig<ConfigValueType>(key: keyof IConfig, value: ConfigValueType): void

  getConfig<ConfigValueType>(key: keyof IConfig): ConfigValueType
}
