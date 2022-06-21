import {QuickReader, QuickReaderError, QuickReaderErrorCode, A} from '../../src/index'
import {createReader} from './util'


describe('bytesTo', () => {
  it('first reading', async () => {
    const reader = createReader([
      [10, 11, 0, 13],
    ])
    const r1 = reader.bytesTo(0)
    expect(r1).toBe(undefined)

    // [10, 11]
    expect('' + await A).toBe([10, 11] + '')
  })

  it('from buffer', async () => {
    const reader = createReader([
      [10, 11, 0,  13, 0,  15],
    ])
    reader.bytesTo(0) ?? await A

    // [13, 0]
    const r1 = reader.bytesTo(0)
    expect('' + r1).toBe([13] + '')
  })

  it('chunks concat', async () => {
    const reader = createReader([
      [10, 11, 12],
      [20, 21, 22],
      [30,  0, 32],
    ])
    const r1 = reader.bytesTo(0) ?? await A
    expect('' + r1).toBe([
      10, 11, 12,
      20, 21, 22,
      30
    ] + '')
  })

  it('buffer used up', async () => {
    const reader = createReader([
      [10,  0, 12, 13,  0],
      [20, 21, 22,  0, 24],
    ])
    // [10, 0]
    reader.bytesTo(0) ?? await A

    // [12, 13, 0]
    const r1 = reader.bytesTo(0)
    expect(r1).toBe(undefined)
    expect('' + await A).toBe([12, 13] + '')

    // [20, 21, 22, 0]
    const r2 = reader.bytesTo(0)
    expect('' + r2).toBe([20, 21, 22] + '')
  })

  it('chunk used up', async () => {
    const reader = createReader([
      [10,  0, 12, 13, 14],
      [20, 21, 22, 23,  0],
      [30, 31,  0, 33, 34],
    ])
    // [10, 0]
    reader.bytesTo(0) ?? await A

    // [12, 13, 14]
    // [20, 21, 22, 23, 0]
    const r1 = reader.bytesTo(0)
    expect(r1).toBe(undefined)
    expect('' + await A).toBe([
      12, 13, 14,
      20, 21, 22, 23] + '')

    // [30, 31, 0]
    const r2 = reader.bytesTo(0)
    expect('' + r2).toBe([30, 31] + '')
  })

  it('param type', async () => {
    const reader = createReader([
      [10, 1, 12],
    ])
    const r1 = reader.bytesTo('1.99' as any) ?? await A
    expect('' + r1).toBe([10] + '')
  })

  it('read zero', async () => {
    const reader = createReader([
      [0, 0, 0],
    ])
    const r1 = reader.bytesTo(0)
    expect(r1).toBe(undefined)
    expect('' + await A).toBe([] + '')

    const r2 = reader.bytesTo(0)
    expect('' + r2).toBe([] + '')
    expect(reader.eof).toBe(false)

    const r3 = reader.bytesTo(0)
    expect(r3).toBe(undefined)
    expect('' + await A).toBe([] + '')
    expect(reader.eof).toBe(true)
  })

  it('out of range', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    QuickReader.maxQueueLen = 6
    try {
      reader.bytesTo(0) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.MAX_QUEUE_EXCEED)
      expect(err.message).toContain('MAX_QUEUE_EXCEED')
      expect(reader.eof).toBe(true)
    }
    QuickReader.maxQueueLen = 64 * 1024 ** 2
  })

  it('empty chunk', async () => {
    const reader = createReader([
      [], [10], [], [0, 12, 13], [], [0], [], [0]
    ])
    const r1 = reader.bytesTo(0) ?? await A
    expect('' + r1).toBe([10] + '')

    const r2 = reader.bytesTo(0) ?? await A
    expect('' + r2).toBe([12, 13] + '')
    expect(reader.eof).toBe(false)

    const r3 = reader.bytesTo(0) ?? await A
    expect('' + r3).toBe([] + '')
    expect(reader.eof).toBe(true)
  })

  it('eof', async () => {
    const reader = createReader([
      [10,  0, 12, 13],
      [20, 21, 22,  0],
    ])
    reader.bytesTo(0) ?? await A
    reader.bytesTo(0) ?? await A
    expect(reader.eof).toBe(true)
  })

  it('read after eof', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 0],
    ])
    reader.bytesTo(0) ?? await A
    expect(reader.eof).toBe(true)
    try {
      reader.bytesTo(0) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
      expect(reader.eof).toBe(true)
    }
  })

  it('delim not found', async () => {
    const reader = createReader([
      [10,  0, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    reader.bytesTo(0) ?? await A

    try {
      reader.bytesTo(0) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
      expect(reader.eof).toBe(true)
    }
  })

  it('eof as delim', async () => {
    const reader = createReader([
      [10, 11, 12],
      [20, 21, 22],
    ])
    reader.eofAsDelim = true

    const r1 = reader.bytesTo(0) ?? await A
    expect('' + r1).toBe([
      10, 11, 12,
      20, 21, 22] + '')
  })

  it('empty stream', async () => {
    const reader = createReader([
      [],
    ])
    try {
      reader.bytesTo(0) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
      expect(reader.eof).toBe(true)
    }
  })

  it('stream error', async () => {
    const reader = createReader([
      ['ERROR', 'failed to read'],
    ])
    try {
      reader.bytesTo(0) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.FAILED_TO_PULL)
      expect(err.message).toContain('FAILED_TO_PULL')
      expect(err.message).toContain('failed to read')
      expect(reader.eof).toBe(true)
    }
  })
})