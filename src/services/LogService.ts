const ENV = process.env.ENV || 'development'

class LogService {
  private name: string

  constructor(loggerName: string) {
    this.name = loggerName
  }

  private formatMessage(message: Error | string) {
    message = message instanceof Error ? message.message : message
    return `[${new Date().toUTCString()}][${this.name}] ${message}`
  }

  public log(message: string, ...args: unknown[]): void {
    if (ENV === 'development') {
      console.log(this.formatMessage(message), ...args)
    }
  }

  public debug(message: string, ...args: unknown[]): void {
    if (ENV === 'development') {
      console.debug(this.formatMessage(message), ...args)
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage(message), ...args)
  }

  public error(message: Error | string, ...args: unknown[]): void {
    console.error(this.formatMessage(message), ...args)
  }
}

export default LogService
