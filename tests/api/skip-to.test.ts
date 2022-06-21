import {QuickReaderError, QuickReaderErrorCode, A} from '../../src/index'
import {createReader} from './util'


describe('skipTo', () => {
  it('first reading', async () => {
    const reader = createReader([
      [10, 11, 0, 13],
    ])
    const r1 = reader.skipTo(0)
    expect(r1).toBe(undefined)

    // [10, 11]
    const r2 = await A
    expect(r2).toBe(3)
  })

  it('from buffer', async () => {
    const reader = createReader([
      [10, 11, 0, 13, 0, 15],
    ])
    reader.skipTo(0) ?? await A

    // [13, 0]
    const r1 = reader.skipTo(0)
    expect(r1).toBe(2)
  })

  it('chunks concat', async () => {
    const reader = createReader([
      [10, 11, 12],
      [20, 21, 22],
      [30,  0, 32],
    ])
    const r1 = reader.skipTo(0) ?? await A
    expect(r1).toBe(8)
  })

  it('buffer used up', async () => {
    const reader = createReader([
      [10,  0, 12, 13,  0],
      [20, 21, 22,  0, 24],
    ])
    // [10, 0]
    reader.skipTo(0) ?? await A

    // [12, 13, 0]
    const r1 = reader.skipTo(0)
    expect(r1).toBe(undefined)
    expect(await A).toBe(3)

    // [20, 21, 22, 0]
    const r2 = reader.skipTo(0)
    expect(r2).toBe(4)
  })

  it('chunk used up', async () => {
    const reader = createReader([
      [10,  0, 12, 13, 14],
      [20, 21, 22, 23,  0],
      [30, 31,  0, 33, 34],
    ])
    // [10, 0]
    reader.skipTo(0) ?? await A

    // [12, 13, 14]
    // [20, 21, 22, 23, 0]
    const r1 = reader.skipTo(0)
    expect(r1).toBe(undefined)
    expect(await A).toBe(8)

    // [30, 31, 0]
    const r2 = reader.skipTo(0)
    expect(r2).toBe(3)
  })

  it('param type', async () => {
    const reader = createReader([
      [10, 11, 1,  13],
    ])
    const r1 = reader.skipTo('1.99' as any) ?? await A
    expect(r1).toBe(3)
  })

  it('read zero', async () => {
    const reader = createReader([
      [0, 0, 0],
    ])
    const r1 = reader.skipTo(0)
    expect(r1).toBe(undefined)
    expect(await A).toBe(1)

    const r2 = reader.skipTo(0)
    expect(r2).toBe(1)
    expect(reader.eof).toBe(false)

    const r3 = reader.skipTo(0)
    expect(r3).toBe(undefined)
    expect(await A).toBe(1)
    expect(reader.eof).toBe(true)
  })

  it('empty chunk', async () => {
    const reader = createReader([
      [], [10], [], [0, 12, 13], [], [0], [], [0]
    ])
    const r1 = reader.skipTo(0) ?? await A
    expect(r1).toBe(2)

    const r2 = reader.skipTo(0) ?? await A
    expect(r2).toBe(3)
    expect(reader.eof).toBe(false)

    reader.skipTo(0) ?? await A
    expect(reader.eof).toBe(true)
  })

  it('eof', async () => {
    const reader = createReader([
      [10,  0, 12, 13],
      [20, 21, 22,  0],
    ])
    reader.skipTo(0) ?? await A
    reader.skipTo(0) ?? await A
    expect(reader.eof).toBe(true)
  })

  it('read after eof', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 0],
    ])
    reader.skipTo(0) ?? await A
    expect(reader.eof).toBe(true)
    try {
      reader.skipTo(0) ?? await A
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
    reader.skipTo(0) ?? await A

    try {
      reader.skipTo(0) ?? await A
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
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    reader.eofAsDelim = true

    const r1 = reader.skipTo(0) ?? await A
    expect(r1).toBe(10)
  })

  it('empty stream', async () => {
    const reader = createReader([
      [],
    ])
    try {
      reader.skipTo(0) ?? await A
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
      reader.skipTo(0) ?? await A
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