import {QuickReaderError, QuickReaderErrorCode, QuickReader, A} from '../../src/index'
import {createReader} from './util'


describe('chunksToEnd', () => {

  it('first reading', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    // [10 - 22]
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunksToEnd(2)) {
      result.push(chunk)
    }
    expect(result.join('|')).toBe([
      [10, 11, 12],
      [13, 14, 20, 21, 22]
    ].join('|'))
    expect(reader.eof).toBe(false)

    // [23]
    const n1 = reader.u8() ?? await A
    expect(n1).toBe(23)
    expect(reader.eof).toBe(false)

    // [24]
    const n2 = reader.u8() ?? await A
    expect(n2).toBe(24)
    expect(reader.eof).toBe(true)
  })

  it('from buffer', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    // [10]
    reader.bytes(1) ?? await A

    // [11 - 22]
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunksToEnd(2)) {
      result.push(chunk)
    }
    expect(result.join('|')).toBe([
      [11, 12], [13, 14, 20, 21, 22]
    ].join('|'))

    // [23]
    const n1 = reader.u8() ?? await A
    expect(n1).toBe(23)
    expect(reader.eof).toBe(false)

    // [24]
    const n2 = reader.u8() ?? await A
    expect(n2).toBe(24)
    expect(reader.eof).toBe(true)
  })

  it('chunk used up', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunksToEnd(10)) {
      result.push(chunk)
    }
    expect(result).toHaveLength(0)

    const remain = reader.bytes(10) ?? await A
    expect(remain).toHaveLength(10)
    expect(reader.eof).toBe(true)
  })

  it('zero len', async () => {
    const reader = createReader([
      [10, 11, 12],
      [20, 21, 22],
    ])
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunksToEnd(0)) {
      result.push(chunk)
    }
    expect(result.join('|')).toBe([
      [10, 11, 12],
      [20, 21, 22]
    ].join('|'))
    expect(reader.eof).toBe(true)
  })

  it('out of range', async () => {
    const MAX_QUEUE_LEN = 5
    QuickReader.maxQueueLen = MAX_QUEUE_LEN

    const reader = createReader([
      [10, 11, 12, 13, 14],
    ])
    const result: Uint8Array[] = []

    try {
      for await (const chunk of reader.chunksToEnd(MAX_QUEUE_LEN + 1)) {
        result.push(chunk)
      }
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.OUT_OF_RANGE)
      expect(err.message).toContain('OUT_OF_RANGE')
    }
    expect(result).toHaveLength(0)
    expect(reader.eof).toBe(false)
    QuickReader.maxQueueLen = 64 * 1024 ** 2
  })

  it('read after eof', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
    ])
    reader.bytes(4) ?? await A
    expect(reader.eof).toBe(true)

    const result: Uint8Array[] = []

    // test 1
    for await (const chunk of reader.chunksToEnd(0)) {
      result.push(chunk)
    }
    expect(result).toHaveLength(0)

    // test 2
    try {
      for await (const chunk of reader.chunksToEnd(1)) {
        result.push(chunk)
      }
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
    }
    expect(result).toHaveLength(0)
    expect(reader.eof).toBe(true)
  })

  it('read too much', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
      [20, 21, 22, 23],
    ])
    const result: Uint8Array[] = []
    try {
      for await (const chunk of reader.chunksToEnd(9)) {
        result.push(chunk)
      }
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
    }
    expect(result).toHaveLength(0)
    expect(reader.eof).toBe(true)
  })

  it('empty stream', async () => {
    const reader = createReader([
    ])
    const result: Uint8Array[] = []
    try {
      for await (const chunk of reader.chunksToEnd(9)) {
        result.push(chunk)
      }
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
    }
    expect(result).toHaveLength(0)
    expect(reader.eof).toBe(true)
  })

  it('1st chunk error', async () => {
    const reader = createReader([
      ['ERROR', 'failed to read'],
    ])
    const result: Uint8Array[] = []

    try {
      for await (const chunk of reader.chunksToEnd(2)) {
        result.push(chunk)
      }
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.FAILED_TO_PULL)
      expect(err.message).toContain('FAILED_TO_PULL')
      expect(err.message).toContain('failed to read')
    }

    expect(result).toHaveLength(0)
    expect(reader.eof).toBe(true)
  })

  it('2nd chunk error', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      ['ERROR', 'failed to read'],
    ])
    const result: Uint8Array[] = []

    try {
      for await (const chunk of reader.chunksToEnd(2)) {
        result.push(chunk)
      }
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.FAILED_TO_PULL)
      expect(err.message).toContain('FAILED_TO_PULL')
      expect(err.message).toContain('failed to read')
    }

    expect(result.join('|')).toBe([
      [10, 11, 12],
    ].join('|'))
    expect(reader.eof).toBe(true)
  })
})