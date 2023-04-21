import {QuickReaderError, QuickReaderErrorCode} from '../../src/index'
import {createReader} from './util'


describe('chunk', () => {
  it('first reading', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
    ])
    const r1 = await reader.chunk()
    expect(r1.join()).toBe([10, 11, 12, 13] + '')
  })

  it('eof', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
      [20, 21, 22, 23],
    ])
    await reader.chunk()
    await reader.chunk()
    expect(reader.eof).toBe(true)
  })

  it('read after eof', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
    ])
    await reader.chunk()
    expect(reader.eof).toBe(true)
    try {
      await reader.chunk()
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
    }
    expect(reader.eof).toBe(true)
  })

  it('empty stream', async () => {
    const reader = createReader([
    ])
    try {
      await reader.chunk()
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
      [], [],
      [10, 11, 12, 13]
    ])
    const r1 = await reader.chunk()
    expect(r1.join()).toBe([10, 11, 12, 13] + '')
  })

  it('1st chunk error', async () => {
    const reader = createReader([
      ['ERROR', 'failed to read'],
    ])
    try {
      await reader.chunk()
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.FAILED_TO_PULL)
      expect(err.message).toContain('FAILED_TO_PULL')
      expect(err.message).toContain('failed to read')
    }
    expect(reader.eof).toBe(true)
  })

  it('2nd chunk error', async () => {
    const reader = createReader([
      [10, 11, 12, 13],
      ['ERROR', 'failed to read'],
    ])
    const r1 = await reader.chunk()
    expect(r1.join()).toBe([10, 11, 12, 13] + '')
  })
})