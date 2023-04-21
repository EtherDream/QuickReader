export const A: PromiseLike<never>

export const enum QuickReaderErrorCode {
  NO_MORE_DATA = 1,
  FAILED_TO_PULL,
  OUT_OF_RANGE,
  MAX_QUEUE_EXCEED,
}

export class QuickReaderError extends Error {
  public readonly name = 'QuickReaderError'
  public readonly code: QuickReaderErrorCode
}

export class QuickReader<T extends Uint8Array = Uint8Array> {
  /**
    `stream` can be a NodeStream or WebStream.
   */
  public constructor(stream: AsyncIterable<T> | ReadableStream<T>)

  /**
    Indicates whether the stream is closed and the buffer is empty.

    If true, it can no longer be read, otherwise a `QuickReaderError` with
    code `NO_MORE_DATA` will be thrown.

    Since the property is synchronized, it's meaningless until the first
    reading.
   */
  public readonly eof: boolean

  /**
   * If true, the EOF can be used as a delimiter.
   * @default false
   */
  public eofAsDelim: boolean

  /**
    Read a chunk from the stream.
   */
  public chunk() : Promise<T>

  /**
    Read data of specified length using async iteration
   */
  public chunks(len: number) : AsyncGenerator<T>

  /**
    Read all data until `len` bytes remaining.
   */
  public chunksToEnd(len: number) : AsyncGenerator<T>

  /**
    Pull a chunk from stream to the buffer.

    This method is called at initialization so that eof can be detected
    before the first read.
   */
  public pull() : Promise<void>

  /**
    Read *len* bytes.

    If the stream cannot provide enough data, a `QuickReaderError` with code
    `NO_MORE_DATA` will be thrown.

    Note: for shorter bytes it is likely reference to the underlying buffer.
    If the result will be used for a long time, it is better to make a copy
    before using it, e.g. `result.slice()`; otherwise the underlying buffer
    will not be GCed.
   */
  public bytes(len: number) : T | undefined

  /**
    Read the bytes before *delim*. The delimiter will be consumed, but not
    included in the result.

    If more than `QuickReader.maxQueueLen` (default 64Mi) bytes have been read
    before the delimiter is found, a `QuickReaderError` with code
    `MAX_QUEUE_EXCEED` will be thrown.

    If the `eofAsDelim` property is true, the EOF can be used as a delimiter;
    otherwise, a `QuickReaderError` with code `NO_MORE_DATA` will be thrown if
    the delimiter is not found after reading all the data.

    Like the `bytes` method, this method also needs to consider the GC issue.
   */
  public bytesTo(delim: number) : T | undefined

  /**
    Read *len* bytes and return the length.

    Similar to the `bytes` method, but faster.
   */
  public skip(len: number) : number | undefined

  /**
    Read to *delim* and return the length (including the delimiter).

    Similar to the `bytesTo` method, but faster.
    */
  public skipTo(delim: number) : number | undefined


  /**
    Read *len* bytes and convert to UTF-8 string.

    Similar to `bytes` method.
   */
  public txtNum(len: number) : string | undefined

  /**
    Read the bytes before *delim* and convert to UTF-8 string.

    Similar to `bytesTo` method.
   */
  public txtTo(delim: number) : string | undefined

  /**
    Read the bytes before '\0' and convert to UTF-8 string.

    Equivalent to `txtTo(0)`.
   */
  public txt() : string | undefined

  /**
    Read the bytes before '\n' and convert to UTF-8 string.

    Equivalent to `txtTo(10)`.
   */
  public txtLn() : string | undefined


  /**
    Read a byte.
   */
  public u8() : number | undefined
  public i8() : number | undefined

  /**
    Read a number, little-endian.
   */
  public u16() : number | undefined
  public i16() : number | undefined

  public u32() : number | undefined
  public i32() : number | undefined

  public u64() : bigint | undefined
  public i64() : bigint | undefined

  public f64() : number | undefined
  public f32() : number | undefined

  /**
    Read a number, big-endian.
   */
  public u16be() : number | undefined
  public i16be() : number | undefined

  public u32be() : number | undefined
  public i32be() : number | undefined

  public u64be() : bigint | undefined
  public i64be() : bigint | undefined

  public f64be() : number | undefined
  public f32be() : number | undefined
}