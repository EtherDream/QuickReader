import * as crypto from 'crypto'
import {QuickReaderError, QuickReaderErrorCode, A} from '../../src/index'
import {createReader} from './util'


describe('number', () => {
  const methods = [
    ['u8', 'readUInt8'],
    ['i8', 'readInt8'],

    ['u16', 'readUInt16LE'],
    ['u32', 'readUInt32LE'],
    ['u64', 'readBigUInt64LE'],

    ['i16', 'readInt16LE'],
    ['i32', 'readInt32LE'],
    ['i64', 'readBigInt64LE'],

    ['f32', 'readFloatLE'],
    ['f64', 'readDoubleLE'],

    ['u16be', 'readUInt16BE'],
    ['u32be', 'readUInt32BE'],
    ['u64be', 'readBigUInt64BE'],

    ['i16be', 'readInt16BE'],
    ['i32be', 'readInt32BE'],
    ['i64be', 'readBigInt64BE'],

    ['f32be', 'readFloatBE'],
    ['f64be', 'readDoubleBE'],
  ]

  for (const [readerMethod, bufMethod] of methods) {
    it(readerMethod, async () => {
      for (let i = 0; i < 1000; i++) {
        const data = crypto.randomBytes(8)
        const reader = createReader([data])

        const exp = (data as any)[bufMethod](0)
        const got = (reader as any)[readerMethod]() ?? await A

        expect(got).toBe(exp)
      }
    })
  }

  it('first reading', async () => {
    const reader = createReader([
      [0x10, 0x11, 0x12, 0x13, 0x14],
    ])
    const r1 = reader.u32be()
    expect(r1).toBe(undefined)
    expect(await A).toBe(0x10_11_12_13)
  })

  it('from buffer', async () => {
    const reader = createReader([
      [0x10, 0x11, 0x12, 0x13, 0x14],
    ])
    reader.u8() ?? await A

    const r1 = reader.u16be()
    expect(r1).toBe(0x11_12)
  })

  it('chunks concat', async () => {
    const reader = createReader([
      [0x10],
      [0x11],
      [0x12],
      [0x13],
    ])
    const r1 = reader.u32be() ?? await A
    expect(r1).toBe(0x10_11_12_13)
  })

  it('buffer used up', async () => {
    const reader = createReader([
      [0x10, 0x11, 0x12, 0x13, 0x14],
      [0x20, 0x21, 0x22, 0x23, 0x24],
    ])
    reader.u8() ?? await A

    const r1 = reader.u32be()
    expect(r1).toBe(undefined)
    expect(await A).toBe(0x11_12_13_14)

    const r2 = reader.u8()
    expect(r2).toBe(0x20)
  })

  it('chunk used up', async () => {
    const reader = createReader([
      [0x10, 0x11, 0x12, 0x13, 0x14],
      [0x20, 0x21, 0x22, 0x23, 0x24],
      [0x30, 0x31, 0x32, 0x33, 0x34],
    ])
    // [0x10, 0x11]
    reader.u16() ?? await A

    // [            0x12, 0x13, 0x14]
    // [0x20, 0x21, 0x22, 0x23, 0x24]
    const r2 = reader.u64be()
    expect(r2).toBe(undefined)
    expect(await A).toBe(0x12_13_14_20_21_22_23_24n)

    // [0x30, 0x31]
    const r3 = reader.u16be()
    expect(r3).toBe(0x30_31)
  })

  it('empty chunk', async () => {
    const reader = createReader([
      [], [0x10], [], [0x11, 0x12, 0x13], [], [0x14], [], [0x15]
    ])
    const r1 = reader.u32be() ?? await A
    expect(r1).toBe(0x10_11_12_13)

    const r2 = reader.u8() ?? await A
    expect(r2).toBe(0x14)
    expect(reader.eof).toBe(false)

    const r3 = reader.u8() ?? await A
    expect(r3).toBe(0x15)
    expect(reader.eof).toBe(true)
  })

  it('eof', async () => {
    const reader = createReader([
      [0x10, 0x11, 0x12, 0x13, 0x14],
      [0x20, 0x21, 0x22, 0x23, 0x24],
    ])
    reader.u64() ?? await A
    expect(reader.eof).toBe(false)

    reader.u16() ?? await A
    expect(reader.eof).toBe(true)
  })

  it('read after eof', async () => {
    const reader = createReader([
      [1, 2, 3, 4],
    ])
    reader.u32() ?? await A
    expect(reader.eof).toBe(true)

    try {
      reader.u8() ?? await A
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
      [1, 2, 3, 4, 5, 6, 7],
    ])
    try {
      reader.u64() ?? await A
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
      reader.u8() ?? await A
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
      reader.u8() ?? await A
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
