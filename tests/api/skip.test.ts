import {QuickReaderError, QuickReaderErrorCode, A} from '../../src/index'
import {createReader} from './util'


describe('skip', () => {
  it('first reading', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
    ])
    // [10, 11]
    const r1 = reader.skip(2)
    expect(r1).toBe(undefined)
    expect(await A).toBe(2)

    const r2 = reader.u8()
    expect(r2).toBe(12)
  })

  it('from buffer', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
    ])
    reader.skip(1) ?? await A

    // [11, 12]
    const r1 = reader.skip(2)
    expect(r1).toBe(2)

    const r2 = reader.u8()
    expect(r2).toBe(13)
  })

  it('chunks concat', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
      [30, 31, 32, 33, 34],
    ])
    // [10, 11, 12, 13, 14]
    // [20, 21, 22, 23, 24]
    // [30]
    const r1 = reader.skip(11) ?? await A
    expect(r1).toBe(11)

    const r2 = reader.u8()
    expect(r2).toBe(31)
  })

  it('buffer used up', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    // [10, 11, 12, 13]
    reader.skip(4) ?? await A

    // [14]
    const r1 = reader.skip(1)
    expect(r1).toBe(undefined)
    expect(await A).toBe(1)

    // [20, 21]
    const r2 = reader.skip(2)
    expect(r2).toBe(2)

    const r3 = reader.u8()
    expect(r3).toBe(22)
  })

  it('chunk used up', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
      [30, 31, 32, 33, 34],
    ])
    // [10, 11, 12, 13]
    reader.skip(4) ?? await A

    // [14]
    // [20, 21, 22, 23, 24]
    const r2 = reader.skip(6)
    expect(r2).toBe(undefined)
    expect(await A).toBe(6)

    // [30, 31]
    const r3 = reader.skip(2)
    expect(r3).toBe(2)

    const r4 = reader.u8()
    expect(r4).toBe(32)
  })

  it('param type', async () => {
    const reader = createReader([
      [10, 11, 12],
    ])
    const r1 = reader.skip('1.99' as any) ?? await A
    expect(r1).toBe(1)
  })

  it('read zero', async () => {
    const reader = createReader([
      [10, 11, 12],
    ])
    const r1 = reader.skip(0)
    expect(r1).toBe(undefined)
    expect(await A).toBe(0)

    const r2 = reader.skip(0)
    expect(r2).toBe(0)

    const r3 = reader.u8()
    expect(r3).toBe(10)
  })

  it('empty chunk', async () => {
    const reader = createReader([
      [], [10], [], [11, 12, 13], [], [14], [], [15]
    ])
    const r1 = reader.skip(3) ?? await A
    expect(r1).toBe(3)

    const v1 = reader.u8() ?? await A
    expect(v1).toBe(13)

    const r2 = reader.skip(1) ?? await A
    expect(r2).toBe(1)
    expect(reader.eof).toBe(false)

    const v2 = reader.u8() ?? await A
    expect(v2).toBe(15)
    expect(reader.eof).toBe(true)
  })

  it('eof', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    reader.skip(9) ?? await A
    expect(reader.eof).toBe(false)

    reader.skip(1) ?? await A
    expect(reader.eof).toBe(true)
  })

  it('read after eof', async () => {
    const reader = createReader([
      [1, 2, 3, 4, 5],
    ])
    reader.skip(5) ?? await A
    expect(reader.eof).toBe(true)

    try {
      reader.skip(1) ?? await A
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
      reader.skip(6) ?? await A
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
      reader.skip(1) ?? await A
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
      reader.skip(1) ?? await A
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