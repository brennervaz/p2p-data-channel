export interface IEncodingService {
  encode<T>(data: T): string

  decode<T>(data: string): T
}
