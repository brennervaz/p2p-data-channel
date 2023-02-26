import { logger, LogLevel } from '@src/decorators'

@logger
export abstract class BaseService {
  protected logLevel: LogLevel

  constructor(...args: unknown[]) {
    const logLevel = args.find(arg => typeof arg === 'object' && String(arg) in LogLevel)
    this.logLevel = (logLevel as LogLevel) || LogLevel.INFO
  }
}
