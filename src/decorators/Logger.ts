import { LogService } from '@src/services'

export enum LogLevel {
  INFO = 'log',
  DEBUG = 'debug'
}

type UnknownFunction = (...args: unknown[]) => unknown

interface ClassPrototype {
  [key: string]: (...args: unknown[]) => unknown
}

/**
 * Extracts the names of the parameters from the source code of a function.
 *
 * @param {UnknownFunction} fn - The function to extract the parameter names from.
 * @returns {string[]} - An array of the parameter names.
 */
function getParamNames(fn: UnknownFunction): string[] {
  const str = fn.toString()
  const start = str.indexOf('(') + 1
  const end = str.indexOf(')')
  const paramString = str.slice(start, end)
  const paramNames = paramString.split(',').map(param => param.trim())
  return paramNames
}

export function logger<T extends abstract new (...args: any[]) => any>(constructor: T) {
  abstract class Wrapper extends constructor {
    logLevel: LogLevel

    constructor(...args: any[]) {
      super(...args)
      const logLevel = args.find(arg => typeof arg === 'object' && String(arg) in LogLevel)
      this.logLevel = (logLevel as LogLevel) || LogLevel.INFO
      this.wrapMethods()
    }

    public logMethodCall(method: string, args: unknown, result: unknown) {
      const logService = new LogService(this.constructor.name)
      logService[String(this.logLevel) as LogLevel](method, {
        arguments: args,
        result: result === undefined ? 'void' : result
      })
    }

    public wrapMethod(method: string) {
      const unhookedMethod = this[method]
      this[method] = (...args: unknown[]): unknown => {
        const params = getParamNames(unhookedMethod)
        const mappedArguments = params.reduce((acc, cur, i) => ({ ...acc, [cur]: args[i] }), {})
        const result = unhookedMethod.apply(this, args)
        this.logMethodCall(method, mappedArguments, result)
        return result
      }
    }

    public wrapMethods() {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      methods.forEach((method: string) => {
        if (method === 'constructor') return
        this.wrapMethod(method)
      })
    }
  }

  return Wrapper
}
