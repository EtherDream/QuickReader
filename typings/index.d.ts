export const A: PromiseLike<never /* prevent type confusion */>

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

    If the chunk type of the stream is not clear, you need to specify
    the `T` manually, so that the same type can be obtained when reading
    a buffer:

    ```ts
    const reader1 = new QuickReader<Buffer>(getStreamSomeHow())
    reader1.bytes(10) ?? await A    // Buffer {...}

    const reader2 = new QuickReader<Uint8Array>(getStreamSomeHow())
    reader2.bytes(10) ?? await A    // Uint8Array {...}
    ```
   */
  public constructor(stream: AsyncIterable<T> | ReadableStream<T>)

  /**
    A callback function for allocating a buffer, will be called when
    reading a buffer across multiple chunks.

    By default, `Buffer.allocUnsafe(len)` is used in Node.js and
    `new Uint8Array(len)` is used in the browser.
   */
  public allocator: (len: number) => T

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


  /**
    Override this method to intercept reading data from the stream.
    Can be used for data decoding, decryption, etc.

    ```
    class QuickReaderEx extends QuickReader {
      async _pull() {
        const chunk = await super._pull()
        if (chunk) {
          for (let i = 0; i < chunk.length; i++) {
            chunk[i] ^= 123
          }
        }
        return chunk
      }
    }
    ```
    This is only used for simple processing, pipe the original stream to a
    transform stream is the standard way.
   */
  protected _pull() : Promise<T | undefined>
}