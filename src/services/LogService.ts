import { ConfigService } from '@src/services'

/**
 * A logging service that provides methods for logging messages at different levels.
 */
export class LogService {
  /**
   * The name of the logger.
   */
  private name: string

  /**
   * Creates a new instance of the LogService class.
   *
   * @param loggerName The name of the logger.
   */
  constructor(loggerName: string) {
    this.name = loggerName
  }

  /**
   * Checks if the log should be created.
   *
   * @returns {boolean} true if the log should be created
   */
  private shouldLog(): boolean {
    return ConfigService.getConfig('debug')
  }

  /**
   * Formats a log message with a timestamp and the logger name.
   *
   * @param message The log message.
   * @returns The formatted log message.
   */
  private formatMessage(message: Error | string): string {
    message = message instanceof Error ? message.message : message
    return `[${new Date().toUTCString()}][${this.name}] ${message}`
  }

  /**
   * Logs a message at the "info" level.
   *
   * @param message The log message.
   * @param args Optional arguments to include in the log message.
   */
  public log(message: string, ...args: unknown[]): void {
    if (this.shouldLog()) {
      console.log(this.formatMessage(message), ...args)
    }
  }

  /**
   * Logs a message at the "debug" level.
   *
   * @param message The log message.
   * @param args Optional arguments to include in the log message.
   */
  public debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog()) {
      console.debug(this.formatMessage(message), ...args)
    }
  }

  /**
   * Logs a message at the "warning" level.
   *
   * @param message The log message.
   * @param args Optional arguments to include in the log message.
   */
  public warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog()) {
      console.warn(this.formatMessage(message), ...args)
    }
  }

  /**
   * Logs a message at the "error" level.
   *
   * @param message The log message or error object.
   * @param args Optional arguments to include in the log message.
   */
  public error(message: Error | string, ...args: unknown[]): void {
    console.error(this.formatMessage(message), ...args)
  }
}
