// TODO: Enable eslint rules

/* eslint-disable jsdoc/require-jsdoc */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unsafe-return */

/* eslint-disable @typescript-eslint/no-unsafe-call */

/* eslint-disable @typescript-eslint/no-unsafe-argument */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { LogService } from '@src/services'

export enum LogLevel {
  INFO = 'log',
  DEBUG = 'debug'
}

type UnknownFunction = (...args: unknown[]) => unknown

function getParamNames(fn: UnknownFunction): string[] {
  const str = fn.toString()
  const start = str.indexOf('(') + 1
  const end = str.indexOf(')')
  const paramString = str.slice(start, end)
  const paramNames = paramString.split(',').map(param => param.trim())
  return paramNames
}

export function logLevel(level: LogLevel): MethodDecorator {
  return (target: unknown, key: unknown, descriptor: PropertyDescriptor) => {
    descriptor.value.logLevel = level
    return descriptor
  }
}

export function logger<T extends abstract new (...args: any[]) => any>(constructor: T) {
  abstract class Wrapper extends constructor {
    logService = new LogService(this.constructor.name)

    constructor(...args: any[]) {
      super(args)
      this.wrapMethods()
    }

    public logMethodCall(logLevel: LogLevel, method: string, args: unknown, result: unknown) {
      this.logService[logLevel](method, {
        arguments: args,
        result: result === undefined ? 'void' : result
      })
    }

    public wrapMethod(method: string) {
      const unhookedMethod = this[method]
      this[method] = (...args: unknown[]): unknown => {
        const params = getParamNames(unhookedMethod)
        const mappedArguments = params.reduce((acc, cur, i) => ({ ...acc, [cur]: args[i] }), {})
        try {
          const result = unhookedMethod.apply(this, args)
          const logLevel = unhookedMethod.logLevel || this.logLevel
          this.logMethodCall(logLevel, method, mappedArguments, result)
          return result
        } catch (e) {
          this.logService.error(e as Error)
        }
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
