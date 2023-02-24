import { LogService } from '@src/services'
import { IEncodingService } from '@src/types'

export class JsonEncodingService implements IEncodingService {
  private _logginService = new LogService(JsonEncodingService.name)

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
    try {
      return JSON.parse(data) as T
    } catch (e) {
      this._logginService.error(e as Error)
      throw e
    }
  }
}
