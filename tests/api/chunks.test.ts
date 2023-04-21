import {QuickReaderError, QuickReaderErrorCode, A} from '../../src/index'
import {createReader} from './util'


describe('chunks', () => {

  it('first reading', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
    ])
    // [10, 11, 12]
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunks(3)) {
      result.push(chunk)
    }
    expect(result.join('|')).toBe([
      [10, 11, 12],
    ].join('|'))
  })

  it('from buffer', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
    ])
    // [10]
    reader.bytes(1) ?? await A

    // [11, 12, 13]
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunks(3)) {
      result.push(chunk)
    }
    expect(result.join('|')).toBe([
      [11, 12, 13],
    ].join('|'))

    // [14]
    const num = reader.u8() ?? await A
    expect(num).toBe(14)
  })

  it('chunks concat', async () => {
    const reader = createReader([
      [10, 11, 12],
      [20, 21, 22],
      [30, 31, 32],
    ])
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunks(9)) {
      result.push(chunk)
    }
    expect(result.join('|')).toBe([
      [10, 11, 12],
      [20, 21, 22],
      [30, 31, 32],
    ].join('|'))
  })

  it('buffer used up', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
    ])
    // [10, 11, 12, 13]
    reader.bytes(4) ?? await A

    // [14]
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunks(1)) {
      result.push(chunk)
    }
    expect(result.join('|')).toBe([
      [14],
    ].join('|'))

    // [20]
    const r2 = reader.u8()
    expect(r2).toBe(20)
  })

  it('chunk used up', async () => {
    const reader = createReader([
      [10, 11, 12, 13, 14],
      [20, 21, 22, 23, 24],
      [30, 31, 32, 33, 34],
    ])
    // [10, 11, 12, 13]
    reader.bytes(4) ?? await A

    // [14], [20, 21, 22, 23, 24]
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunks(6)) {
      result.push(chunk)
    }
    expect(result.join('|')).toBe([
      [14],
      [20, 21, 22, 23, 24],
    ].join('|'))

    // [30]
    const r2 = reader.u8()
    expect(r2).toBe(30)
  })

  it('read zero', async () => {
    const reader = createReader([
      [10, 11, 12],
    ])
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunks(0)) {
      result.push(chunk)
    }
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveLength(0)
  })

  it('eof', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
      [20, 21, 22, 23],
      [30, 31, 32, 33],
    ])
    for await (const chunk of reader.chunks(12)) {
      chunk
    }
    expect(reader.eof).toBe(true)
  })

  it('read after eof', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
    ])
    reader.u32() ?? await A
    expect(reader.eof).toBe(true)

    try {
      for await (const chunk of reader.chunks(1)) {
        chunk
      }
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
    }
    expect(reader.eof).toBe(true)
  })

  it('read too much', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
      [20, 21, 22, 23],
    ])
    const result: Uint8Array[] = []
    try {
      for await (const chunk of reader.chunks(9)) {
        result.push(chunk)
      }
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
    }

    expect(result.join('|')).toBe([
      [10, 11, 12, 13],
      [20, 21, 22, 23],
    ].join('|'))
    expect(reader.eof).toBe(true)
  })

  it('empty stream', async () => {
    const reader = createReader([
    ])
    try {
      for await (const chunk of reader.chunks(1)) {
        chunk
      }
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
    }
    expect(reader.eof).toBe(true)
  })

  it('1st chunk error', async () => {
    const reader = createReader([
      ['ERROR', 'failed to read'],
    ])
    const result: Uint8Array[] = []

    try {
      for await (const chunk of reader.chunks(1)) {
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

  it('2nd chunk error (buf used up)', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
      ['ERROR', 'failed to read'],
    ])
    const result: Uint8Array[] = []

    for await (const chunk of reader.chunks(4)) {
      result.push(chunk)
    }
    expect(result.join('|')).toBe([
      [10, 11, 12, 13],
    ].join('|'))
    expect(reader.eof).toBe(true)
  })

  it('2nd chunk error', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
      ['ERROR', 'failed to read'],
    ])
    const result: Uint8Array[] = []

    try {
      for await (const chunk of reader.chunks(5)) {
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
      [10, 11, 12, 13],
    ].join('|'))
    expect(reader.eof).toBe(true)
  })
})