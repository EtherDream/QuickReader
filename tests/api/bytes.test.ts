import {QuickReader, QuickReaderError, QuickReaderErrorCode, A} from '../../src/index'
import {createReader} from './util'


describe('bytes', () => {
  it('first reading', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
    ])
    const r1 = reader.bytes(2)
    expect(r1).toBeUndefined()

    // [10, 11]
    const result = (await A) as Buffer
    expect(result.join()).toBe([10, 11] + '')
  })

  it('from buffer', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
    ])
    reader.bytes(1) ?? await A

    // [10]
    const r1 = reader.bytes(2)
    expect(r1!.join()).toBe([11, 12] + '')
  })

  it('pull', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14]
    ])
    await reader.pull()

    const r1 = reader.bytes(2)
    expect(r1!.join()).toBe([10, 11] + '')
  })


  it('chunks concat', async () => {
    const reader = createReader([
      [10, 11, 12],
      [20, 21, 22],
      [30, 31, 32],
    ])
    const r1 = reader.bytes(9) ?? await A
    expect(r1.join()).toBe([
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
    expect(r1).toBeUndefined()

    const result1 = (await A) as Buffer
    expect(result1.join()).toBe([14] + '')

    // [20, 21]
    const r2 = reader.bytes(2)
    expect(r2!.join()).toBe([20, 21] + '')
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
    expect(r1).toBeUndefined()

    const result = (await A) as Buffer
    expect(result.join()).toBe([14, 20, 21, 22, 23, 24] + '')

    // [30, 31, 32]
    const r2 = reader.bytes(3)
    expect(r2!.join()).toBe([30, 31, 32] + '')
  })

  it('read zero', async () => {
    const reader = createReader([
      [10, 11, 12],
    ])
    const r1 = reader.bytes(0)
    expect(r1).toBeUndefined()

    const result: Uint8Array = await A
    expect(result).toHaveLength(0)

    const r2 = reader.bytes(0)
    expect(r2).toHaveLength(0)
  })

  it('out of range', async () => {
    const MAX_QUEUE_LEN = 1024 * 64
    QuickReader.maxQueueLen = MAX_QUEUE_LEN


    const reader1 = createReader([
      Buffer.alloc(MAX_QUEUE_LEN),
    ])
    const r1 = reader1.bytes(1024 * 64) ?? await A
    expect(r1).toHaveLength(MAX_QUEUE_LEN)


    const reader2 = createReader([
      Buffer.alloc(MAX_QUEUE_LEN),
    ])
    try {
      reader2.bytes(MAX_QUEUE_LEN + 1) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.OUT_OF_RANGE)
      expect(err.message).toContain('OUT_OF_RANGE')
      expect(reader2.eof).toBe(false)
    }

    QuickReader.maxQueueLen = 64 * 1024 ** 2
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
    }
    expect(reader.eof).toBe(true)
  })

  it('empty chunk', async () => {
    const reader = createReader([
      [], [10, 11], [],
      [], [12, 13, 14], [],
    ])
    const r1 = reader.bytes(3) ?? await A
    expect(r1.join()).toBe([10, 11, 12] + '')
    expect(reader.eof).toBe(false)

    const r2 = reader.bytes(2) ?? await A
    expect(r2.join()).toBe([13, 14] + '')
    expect(reader.eof).toBe(true)
  })

  it('empty stream', async () => {
    const reader = createReader([
    ])
    try {
      reader.bytes(1) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
    }
    expect(reader.eof).toBe(true)
  })

  it('check empty stream', async () => {
    const reader = createReader([
    ])
    await reader.pull()
    expect(reader.eof).toBe(true)
  })

  it('stream error (buf used up)', async () => {
    const reader = createReader([
      [1, 2, 3, 4, 5],
      ['ERROR', 'failed to read'],
    ])
    const r1 = reader.bytes(5) ?? await A
    expect(r1.join()).toBe([1, 2, 3, 4, 5] + '')
    expect(reader.eof).toBe(true)
  })

  it('stream error', async () => {
    const reader = createReader([
      [1, 2, 3, 4, 5],
      ['ERROR', 'failed to read'],
    ])
    try {
      reader.bytes(6) ?? await A
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.FAILED_TO_PULL)
      expect(err.message).toContain('FAILED_TO_PULL')
      expect(err.message).toContain('failed to read')
    }
    expect(reader.eof).toBe(true)
  })
})