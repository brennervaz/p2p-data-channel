export interface IConfig {
  debug: boolean
}

export interface IConfigService {
  fromObject(config: IConfig): void

  setConfig<ConfigValueType>(key: keyof IConfig, value: ConfigValueType): void

  getConfig<ConfigValueType>(key: keyof IConfig): ConfigValueType
}
