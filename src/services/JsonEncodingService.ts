import { LogLevel } from '@src/decorators'
import { BaseService } from '@src/services'
import { IEncodingService } from '@src/types'

export class JsonEncodingService extends BaseService implements IEncodingService {
  protected logLevel = LogLevel.DEBUG

  /**
   * Encodes the given data to a JSON string.
   *
   * @template T
   * @param {T} data The data to be encoded.
   * @returns {string} The encoded JSON string.
   */
  public encode<T>(data: T): string {
    return JSON.stringify(data)
  }

  /**
   * Decodes the given JSON string to the specified type.
   *
   * @template T
   * @param {string} data The JSON string to be decoded.
   * @returns {T} The decoded data.
   */
  public decode<T>(data: string): T {
    return JSON.parse(data) as T
  }
}
