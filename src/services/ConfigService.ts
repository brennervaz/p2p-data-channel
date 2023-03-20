import { LogLevel } from '@src/decorators'
import { IConfig, IConfigService } from '@src/types'

import { defaultConfig } from '..'

/**
 * Service for managing global config.
 */
export class ConfigServiceClass implements IConfigService {
  protected logLevel = LogLevel.DEBUG
  private configMap: Map<keyof IConfig, unknown> = new Map()

  fromObject(config?: Partial<IConfig>): void {
    this.configMap = new Map(Object.entries({ ...defaultConfig, ...(config || {}) })) as Map<keyof IConfig, unknown>
  }

  setConfig<T>(key: keyof IConfig, value: T): void {
    this.configMap.set(key, value)
  }

  getConfig<T>(key: keyof IConfig): T {
    return this.configMap.get(key) as T
  }
}
