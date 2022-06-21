import {QuickReaderError, QuickReaderErrorCode, A} from '../../src/index'
import {createReader} from './util'


describe('bytes', () => {
  it('first reading', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
    ])
    const r1 = reader.bytes(2)
    expect(r1).toBe(undefined)

    // [10, 11]
    expect('' + await A).toBe([10, 11] + '')
  })

  it('from buffer', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
    ])
    reader.bytes(1) ?? await A

    // [11, 12]
    const r1 = reader.bytes(2)
    expect('' + r1).toBe([11, 12] + '')
  })

  it('chunks concat', async () => {
    const reader = createReader([
      [10, 11, 12],
      [20, 21, 22],
      [30, 31, 32],
    ])
    const r1 = reader.bytes(9) ?? await A
    expect('' + r1).toBe([
      10, 11, 12,
      20, 21, 22,
      30, 31, 32
    ] + '')
  })

  it('buffer used up', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    // [10, 11, 12, 13]
    reader.bytes(4) ?? await A

    // [14]
    const r1 = reader.bytes(1)
    expect(r1).toBe(undefined)
    expect('' + await A).toBe([14] + '')

    // [20, 21]
    const r2 = reader.bytes(2)
    expect('' + r2).toBe([20, 21] + '')
  })

  it('chunk used up', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
      [30, 31, 32, 33, 34],
    ])
    // [10, 11, 12, 13]
    reader.bytes(4) ?? await A

    const r1 = reader.bytes(6)
    expect(r1).toBe(undefined)
    expect('' + await A).toBe([14, 20, 21, 22, 23, 24] + '')

    // [30, 31, 32]
    const r2 = reader.bytes(3)
    expect('' + r2).toBe([30, 31, 32] + '')
  })

  it('param type', async () => {
    const reader = createReader([
      [10, 11, 12],
    ])
    const r1 = reader.bytes('1.99' as any) ?? await A
    expect('' + r1).toBe([10] + '')
  })

  it('read byte', async () => {
    const reader = createReader([
      [10, 11, 12],
    ])
    const r1 = reader.bytes(0)
    expect(r1).toBe(undefined)
    expect('' + await A).toBe([] + '')

    const r2 = reader.bytes(0)
    expect('' + r2).toBe([] + '')
  })

  it('out of range', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
    ])
    try {
      reader.bytes(64 * 1024 ** 2 + 1) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.OUT_OF_RANGE)
      expect(err.message).toContain('OUT_OF_RANGE')
      expect(reader.eof).toBe(false)
    }
  })

  it('empty chunk', async () => {
    const reader = createReader([
      [], [10], [], [11, 12, 13], [], [14], [], [15]
    ])
    const r1 = reader.bytes(4) ?? await A
    expect('' + r1).toBe([10, 11, 12, 13] + '')

    const r2 = reader.bytes(1) ?? await A
    expect('' + r2).toBe([14] + '')
    expect(reader.eof).toBe(false)

    const r3 = reader.bytes(1) ?? await A
    expect('' + r3).toBe([15] + '')
    expect(reader.eof).toBe(true)
  })

  it('eof', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    reader.bytes(9) ?? await A
    expect(reader.eof).toBe(false)

    reader.bytes(1) ?? await A
    expect(reader.eof).toBe(true)
  })

  it('read after eof', async () => {
    const reader = createReader([
      [1, 2, 3, 4, 5],
    ])
    reader.bytes(5) ?? await A
    expect(reader.eof).toBe(true)

    try {
      reader.bytes(1) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
      expect(reader.eof).toBe(true)
    }
  })

  it('read too much', async () => {
    const reader = createReader([
      [1, 2, 3, 4, 5],
    ])
    try {
      reader.bytes(6) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
      expect(reader.eof).toBe(true)
    }
  })

  it('empty stream', async () => {
    const reader = createReader([
      [],
    ])
    try {
      reader.bytes(1) ?? await A
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
      reader.bytes(1) ?? await A
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