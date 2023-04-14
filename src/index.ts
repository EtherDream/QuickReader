type result_t = number | bigint | string | Uint8Array

let gPromise: Promise<result_t>

// const result = reader.txt()                ?? await A
//  ✗    ↑ result_t  <=  ↑ string | undefined    ↑ result_t
//  ✓    ↑ string    <=  ↑ string | undefined    ↑ never
export const A = {
  then(resolve: (result: typeof gPromise) => void) {
    resolve(gPromise)
  }
} as PromiseLike<never>


export enum QuickReaderErrorCode {
  NO_MORE_DATA = 1,
  FAILED_TO_PULL,
  OUT_OF_RANGE,
  MAX_QUEUE_EXCEED,
}

export class QuickReaderError extends Error {
  public readonly name = 'QuickReaderError'
  public constructor(
    public readonly code: QuickReaderErrorCode,
    desc?: any,
  ) {
    if (desc !== undefined) {
      desc = ' (' + desc + ')'
    } else {
      desc = ''
    }
    const msg = QuickReaderErrorCode[code] + desc
    super(msg)
  }
}

function isAsyncIterable(stream: any) : stream is AsyncIterable<any> {
  return typeof stream[Symbol.asyncIterator] === 'function'
}

const HAS_NODE_BUF = typeof Buffer === 'function' && !!Buffer?.prototype

const bufToStr = (function() :
  (this: Uint8Array, begin: number, end: number) => string
{
  // Node.js internal function, 10x faster
  if (HAS_NODE_BUF) {
    return Buffer.prototype.utf8Slice
  }
  const textDecoder = new TextDecoder()

  return function(begin, end) {
    const buf = this.subarray(begin, end)
    return textDecoder.decode(buf)
  }
})()

const DEFAULT_ALLOCATOR = HAS_NODE_BUF
  ? Buffer.allocUnsafe
  : (len: number) => new Uint8Array(len)


const EMPTY_BUF = new Uint8Array(0)


export class QuickReader<T extends Uint8Array = Uint8Array> {
  public static maxQueueLen = 1024 * 1024 * 64

  private _buffer = EMPTY_BUF
  private _offset = 0
  private _closed = false
  private _getChunk: () => Promise<{value?: T}>

  public allocator = DEFAULT_ALLOCATOR
  public eofAsDelim = false


  public get eof() : boolean {
    return this._closed
  }

  public constructor(stream: AsyncIterable<T> | ReadableStream<T>) {
    if (isAsyncIterable(stream)) {
      const obj = stream[Symbol.asyncIterator]()
      this._getChunk = obj.next.bind(obj)
    } else {
      const obj = stream.getReader()
      this._getChunk = obj.read.bind(obj)
    }
  }

  protected async _pull() : Promise<T | undefined> {
    if (this._closed) {
      throw new QuickReaderError(QuickReaderErrorCode.NO_MORE_DATA)
    }
    try {
      const {value} = await this._getChunk()
      return value
    } catch (err: any) {
      this._close()
      throw new QuickReaderError(QuickReaderErrorCode.FAILED_TO_PULL, err?.message)
    }
  }

  private _close() {
    this._closed = true
    this._buffer = EMPTY_BUF
    this._offset = 0
  }

  private _concatBufs(bufs: Uint8Array[], len: number) : Uint8Array {
    const ret = this.allocator(len)
    let pos = 0

    for (let i = 0; i < bufs.length; i++) {
      const buf = bufs[i]
      ret.set(buf, pos)
      pos += buf.length
    }
    return ret
  }

  private async _pullAndReturn<R extends result_t>(result: R) : Promise<R> {
    const chunk = await this._pull()
    if (!chunk) {
      this._close()
    } else {
      this._buffer = chunk
      this._offset = 0
    }
    return result
  }


  public bytes(len: number) : T | undefined {
    len >>>= 0
    const buf = this._buffer
    const pos = this._offset
    const end = pos + len

    if (end < buf.length) {
      this._offset = end
      return buf.subarray(pos, end) as T
    }
    if (end === buf.length) {
      const result = buf.subarray(pos)
      gPromise = this._pullAndReturn(result)
    } else {
      if (len > QuickReader.maxQueueLen) {
        throw new QuickReaderError(QuickReaderErrorCode.OUT_OF_RANGE, len)
      }
      gPromise = this._bytes(len)
    }
  }

  private async _bytes(len: number) : Promise<T> {
    const result = this.allocator(len) as T
    const tail = this._buffer.subarray(this._offset)

    let num = tail.length
    result.set(tail, 0)

    for (;;) {
      const chunk = await this._pull()
      if (!chunk) {
        this._close()
        throw new QuickReaderError(QuickReaderErrorCode.NO_MORE_DATA)
      }
      // |----------------------------------------------|
      // | *tail* | *chunks...* |       *chunk*         |
      // |<------- num -------->|<--- chunk.length ---->|
      // |<------------------- end -------------------->|
      // |<------------ LEN ------------>|<-- exceed -->|
      //                        | *head* |
      // | *********** result ********** |
      const end = num + chunk.length
      const exceed = end - len

      if (exceed > 0) {
        const head = chunk.subarray(0, -exceed)
        result.set(head, num)
        this._offset = head.length
        this._buffer = chunk
        return result
      }
      result.set(chunk, num)

      if (exceed === 0) {
        return this._pullAndReturn(result)
      }
      num = end
    }
  }


  public bytesTo(delim: number) : T | undefined {
    delim &= 0xff
    const buf = this._buffer
    const pos = this._offset

    const index = buf.indexOf(delim, pos)
    if (index !== -1) {
      const result = buf.subarray(pos, index) as T
      const offset = index + 1

      if (offset !== buf.length) {
        this._offset = offset
        return result
      }
      gPromise = this._pullAndReturn(result)
    } else {
      gPromise = this._bytesTo(delim)
    }
  }

  private async _bytesTo(delim: number) : Promise<T> {
    const tail = this._buffer.subarray(this._offset)
    const queueArr = [tail]
    let queueLen = tail.length

    for (;;) {
      const chunk = await this._pull()
      if (!chunk) {
        this._close()
        if (!this.eofAsDelim) {
          throw new QuickReaderError(QuickReaderErrorCode.NO_MORE_DATA)
        }
        return this._concatBufs(queueArr, queueLen) as T
      }

      const index = chunk.indexOf(delim)
      if (index === -1) {
        queueLen += chunk.length
        if (queueLen > QuickReader.maxQueueLen) {
          this._close()
          throw new QuickReaderError(QuickReaderErrorCode.MAX_QUEUE_EXCEED)
        }
        queueArr.push(chunk)
        continue
      }
      // |<----- e.g. chunk.length (9) ----->|
      // | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
      // | * | ↑ offset min
      // | *   *   *   *   *   *   *   *   * | ↑ offset max
      const head = chunk.subarray(0, index)
      queueArr.push(head)
      queueLen += head.length

      const result = this._concatBufs(queueArr, queueLen) as T
      const offset = index + 1

      if (offset !== chunk.length) {
        this._offset = offset
        this._buffer = chunk
        return result
      }
      // offset max
      return this._pullAndReturn(result)
    }
  }


  public skip(len: number) : number | undefined {
    len >>>= 0
    const buf = this._buffer
    const pos = this._offset
    const end = pos + len

    if (end < buf.length) {
      this._offset = end
      return len
    }
    if (end === buf.length) {
      gPromise = this._pullAndReturn(len)
    } else {
      gPromise = this._skip(len)
    }
  }

  private async _skip(len: number) : Promise<number> {
    let num = this._buffer.length - this._offset

    for (;;) {
      const chunk = await this._pull()
      if (!chunk) {
        this._close()
        throw new QuickReaderError(QuickReaderErrorCode.NO_MORE_DATA)
      }
      const end = num + chunk.length

      // |--------------------------------------------------|
      // | *tail* | *chunks...* |          *chunk*          |
      // |<------- num -------->|<------ chunk.length ----->|
      // |<------------------- end ------------------------>|
      // |<------------- LEN --------------->|<-- exceed -->|
      //                        |<-- head -->|
      // |<============= result ============>|
      const exceed = end - len
      if (exceed > 0) {
        const head = chunk.length - exceed
        this._offset = head
        this._buffer = chunk
        return num + head
      }
      if (exceed === 0) {
        return this._pullAndReturn(end)
      }
      num = end
    }
  }


  public skipTo(delim: number) : number | undefined {
    delim &= 0xff
    const buf = this._buffer
    const pos = this._offset

    const index = buf.indexOf(delim, pos)
    if (index !== -1) {
      const offset = index + 1

      if (offset !== buf.length) {
        this._offset = offset
        return offset - pos
      }
      gPromise = this._pullAndReturn(offset - pos)
    } else {
      gPromise = this._skipTo(delim)
    }
  }

  private async _skipTo(delim: number) : Promise<number> {
    let num = this._buffer.length - this._offset

    for (;;) {
      const chunk = await this._pull()
      if (!chunk) {
        this._close()
        if (!this.eofAsDelim) {
          throw new QuickReaderError(QuickReaderErrorCode.NO_MORE_DATA)
        }
        return num
      }
      const end = num + chunk.length

      const index = chunk.indexOf(delim)
      if (index === -1) {
        num = end
        continue
      }
      // |<----- e.g. chunk.length (9) ----->|
      // | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
      // | * | ↑ offset min
      // | *   *   *   *   *   *   *   *   * | ↑ offset max
      const offset = index + 1

      if (offset < chunk.length) {
        this._offset = offset
        this._buffer = chunk
        return num + offset
      }
      // offset max
      return this._pullAndReturn(num + offset)
    }
  }


  public txtNum(len: number) : string | undefined {
    len >>>= 0
    const buf = this._buffer
    const pos = this._offset
    const end = pos + len

    if (end < buf.length) {
      this._offset = end
      return bufToStr.call(buf, pos, end)
    }
    if (end === buf.length) {
      const result = bufToStr.call(buf, pos, end)
      gPromise = this._pullAndReturn(result)
    } else {
      if (len > QuickReader.maxQueueLen) {
        throw new QuickReaderError(QuickReaderErrorCode.OUT_OF_RANGE, len)
      }
      gPromise = this._txtNum(len)
    }
  }

  private async _txtNum(len: number) : Promise<string> {
    const bytes = await this._bytes(len)
    return bufToStr.call(bytes, 0, bytes.length)
  }


  public txtTo(delim: number) : string | undefined {
    delim &= 0xff
    const buf = this._buffer
    const pos = this._offset

    const index = buf.indexOf(delim, pos)
    if (index !== -1) {
      const result = bufToStr.call(buf, pos, index)
      const offset = index + 1

      if (offset !== buf.length) {
        this._offset = offset
        return result
      }
      gPromise = this._pullAndReturn(result)
    } else {
      gPromise = this._txtTo(delim)
    }
  }

  private async _txtTo(delim: number) : Promise<string> {
    const bytes = await this._bytesTo(delim)
    return bufToStr.call(bytes, 0, bytes.length)
  }

  public txt() : string | undefined {
    return this.txtTo(0)
  }
  public txtLn() : string | undefined {
    return this.txtTo(10)
  }

  public declare u8: () => number | undefined
  public declare i8: () => number | undefined

  public declare u16: () => number | undefined
  public declare i16: () => number | undefined

  public declare u32: () => number | undefined
  public declare i32: () => number | undefined

  public declare u64: () => bigint | undefined
  public declare i64: () => bigint | undefined

  public declare f32: () => number | undefined
  public declare f64: () => number | undefined

  public declare u16be: () => number | undefined
  public declare i16be: () => number | undefined

  public declare u32be: () => number | undefined
  public declare i32be: () => number | undefined

  public declare u64be: () => bigint | undefined
  public declare i64be: () => bigint | undefined

  public declare f32be: () => number | undefined
  public declare f64be: () => number | undefined

  static {
    type to_num_t = (buf: Uint8Array, pos: number) => number
    type to_int_t = (buf: Uint8Array, pos: number) => bigint
    type fn_t = to_num_t | to_int_t

    const
    MEM_BUF = new ArrayBuffer(8),
    MEM_I32 = new Int32Array(MEM_BUF),
    MEM_U64 = new BigUint64Array(MEM_BUF),
    MEM_I64 = new BigInt64Array(MEM_BUF),
    MEM_F64 = new Float64Array(MEM_BUF),
    MEM_F32 = new Float32Array(MEM_BUF),

    u8: to_num_t = (buf, pos) => buf[pos],
    i8: to_num_t = (buf, pos) => buf[pos] << 24 >> 24,

    u16Le: to_num_t = (buf, pos) => buf[pos]      | buf[pos + 1] << 8,
    u16Be: to_num_t = (buf, pos) => buf[pos] << 8 | buf[pos + 1],

    i16Le: to_num_t = (buf, pos) => buf[pos]             | buf[pos + 1] << 24 >> 16,
    i16Be: to_num_t = (buf, pos) => buf[pos] << 24 >> 16 | buf[pos + 1],

    u32Le: to_num_t = (buf, pos) => i32Le(buf, pos) >>> 0,
    u32Be: to_num_t = (buf, pos) => i32Be(buf, pos) >>> 0,

    i32Le: to_num_t = (buf, pos) =>
      buf[pos    ]       |
      buf[pos + 1] <<  8 |
      buf[pos + 2] << 16 |
      buf[pos + 3] << 24
    ,
    i32Be: to_num_t = (buf, pos) =>
      buf[pos    ] << 24 |
      buf[pos + 1] << 16 |
      buf[pos + 2] <<  8 |
      buf[pos + 3]
    ,
    f32Le: to_num_t = (buf, pos) => (MEM_I32[0] = i32Le(buf, pos), MEM_F32[0]),
    f32Be: to_num_t = (buf, pos) => (MEM_I32[0] = i32Be(buf, pos), MEM_F32[0]),

    f64Le: to_num_t = (buf, pos) => (copy64Le(buf, pos), MEM_F64[0]),
    f64Be: to_num_t = (buf, pos) => (copy64Be(buf, pos), MEM_F64[0]),

    u64Le: to_int_t = (buf, pos) => (copy64Le(buf, pos), MEM_U64[0]),
    u64Be: to_int_t = (buf, pos) => (copy64Be(buf, pos), MEM_U64[0]),

    i64Le: to_int_t = (buf, pos) => (copy64Le(buf, pos), MEM_I64[0]),
    i64Be: to_int_t = (buf, pos) => (copy64Be(buf, pos), MEM_I64[0]),

    copy64Le = (buf: Uint8Array, pos: number) : void => {
      MEM_I32[0] = i32Le(buf, pos)
      MEM_I32[1] = i32Le(buf, pos + 4)
    },
    copy64Be = (buf: Uint8Array, pos: number) : void => {
      MEM_I32[0] = i32Be(buf, pos + 4)
      MEM_I32[1] = i32Be(buf, pos)
    },

    readAndCall = async (reader: QuickReader, len: number, fn: fn_t)
    : Promise<number | bigint> => {
      const bytes = await reader._bytes(len)
      return fn(bytes, 0)
    },

    addReadNumMethod = (name: keyof QuickReader, len: number, fn: fn_t) : void => {
      (QuickReader.prototype as any)[name] = function(this: QuickReader) {
        const buf = this._buffer
        const pos = this._offset
        const end = pos + len

        if (end < buf.length) {
          this._offset = end
          return fn(buf, pos)
        }
        if (end === buf.length) {
          const result = fn(buf, pos)
          gPromise = this._pullAndReturn(result)
        } else {
          gPromise = readAndCall(this, len, fn)
        }
      }
    }
    addReadNumMethod('i8',    1, i8)
    addReadNumMethod('u8',    1, u8)

    addReadNumMethod('i16',   2, i16Le)
    addReadNumMethod('u16',   2, u16Le)
    addReadNumMethod('i16be', 2, i16Be)
    addReadNumMethod('u16be', 2, u16Be)

    addReadNumMethod('i32',   4, i32Le)
    addReadNumMethod('u32',   4, u32Le)
    addReadNumMethod('i32be', 4, i32Be)
    addReadNumMethod('u32be', 4, u32Be)

    addReadNumMethod('i64',   8, i64Le)
    addReadNumMethod('u64',   8, u64Le)
    addReadNumMethod('i64be', 8, i64Be)
    addReadNumMethod('u64be', 8, u64Be)

    addReadNumMethod('f32',   4, f32Le)
    addReadNumMethod('f64',   8, f64Le)
    addReadNumMethod('f32be', 4, f32Be)
    addReadNumMethod('f64be', 8, f64Be)
  }
}