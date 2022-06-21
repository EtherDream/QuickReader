import {QuickReaderError, QuickReaderErrorCode, A} from '../../src/index'
import {createReader} from './util'


describe('txtNum', () => {
  //   ['F', 'G', 'H', 'I', 'J'],
  //   ['K', 'L', 'M', 'N', 'O'],
  //   ['P', 'Q', 'R', 'S', 'T'],
  //   ['U', 'V', 'W', 'X', 'Y'],
  it('first reading', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
    ])
    const r1 = reader.txtNum(2)
    expect(r1).toBe(undefined)
    expect(await A).toBe('AB')
  })

  it('from buffer', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
    ])
    reader.txtNum(1) ?? await A

    const r1 = reader.txtNum(2)
    expect(r1).toBe('BC')
  })

  it('chunks concat', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
      ['K', 'L', 'M', 'N', 'O'],
    ])
    const r1 = reader.txtNum(11) ?? await A
    expect(r1).toBe('ABCDE' + 'FGHIJ' + 'K')
  })

  it('buffer used up', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
    ])
    // 'ABCD'
    reader.txtNum(4) ?? await A
    // 'E'
    const r1 = reader.txtNum(1)
    expect(r1).toBe(undefined)
    expect(await A).toBe('E')
  })

  it('chunk used up', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
      ['K', 'L', 'M', 'N', 'O'],
    ])
    // 'ABCD'
    reader.txtNum(4) ?? await A

    const r1 = reader.txtNum(6)
    expect(r1).toBe(undefined)
    expect(await A).toBe('E' + 'FGHIJ')

    const r2 = reader.txtNum(3)
    expect(r2).toBe('KLM')
  })

  it('param type', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
    ])
    const r1 = reader.txtNum('1.99' as any) ?? await A
    expect(r1).toBe('A')
  })

  it('read zero', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
    ])
    const r1 = reader.txtNum(0)
    expect(r1).toBe(undefined)
    expect(await A).toBe('')

    const r2 = reader.txtNum(0)
    expect(r2).toBe('')
  })

  it('out of range', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
    ])
    try {
      reader.txtNum(64 * 1024 ** 2 + 1) ?? await A
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
      [], ['A'], [], ['B', 'C', 'D'], [], ['E'], [], ['F']
    ])
    const r1 = reader.txtNum(4) ?? await A
    expect(r1).toBe('ABCD')

    const v1 = reader.txtNum(1) ?? await A
    expect(v1).toBe('E')

    const r2 = reader.txtNum(1) ?? await A
    expect(r2).toBe('F')
    expect(reader.eof).toBe(true)
  })

  it('eof', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
    ])
    reader.txtNum(9) ?? await A
    expect(reader.eof).toBe(false)

    reader.txtNum(1) ?? await A
    expect(reader.eof).toBe(true)
  })

  it('read after eof', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
    ])
    reader.txtNum(5) ?? await A
    expect(reader.eof).toBe(true)

    try {
      reader.txtNum(1) ?? await A
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
      ['A', 'B', 'C', 'D', 'E'],
    ])
    try {
      reader.txtNum(6) ?? await A
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
      reader.txtNum(1) ?? await A
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
      reader.txtNum(1) ?? await A
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