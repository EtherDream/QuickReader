import {QuickReader, QuickReaderError, QuickReaderErrorCode, A} from '../../src/index'
import {createReader} from './util'


describe('txtTo', () => {
  const SEP = '\t'
  const DELIM = SEP.charCodeAt(0)


  it('first reading', async () => {
    const reader = createReader([
      ['A', SEP, 'C', 'D', 'E'],
    ])
    const r1 = reader.txtTo(DELIM)
    expect(r1).toBe(undefined)
    expect(await A).toBe('A')
  })

  it('from buffer', async () => {
    const reader = createReader([
      ['A', SEP, 'C', SEP, 'E'],
    ])
    reader.txtTo(DELIM) ?? await A

    const r1 = reader.txtTo(DELIM)
    expect(r1).toBe('C')
  })

  it('chunks concat', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
      ['K', SEP, 'M', 'N', 'O'],
    ])
    const r1 = reader.txtTo(DELIM) ?? await A
    expect(r1).toBe('ABCDE' + 'FGHIJ' + 'K')
  })

  it('buffer used up', async () => {
    const reader = createReader([
      ['A', SEP, 'C', 'D', SEP],
      ['F', 'G', 'H', SEP, 'J'],
    ])
    reader.txtTo(DELIM) ?? await A

    const r1 = reader.txtTo(DELIM)
    expect(r1).toBe(undefined)
    expect(await A).toBe('CD')

    const r2 = reader.txtTo(DELIM)
    expect(r2).toBe('FGH')
  })

  it('chunk used up', async () => {
    const reader = createReader([
      ['A', SEP, 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', SEP],
      ['K', 'L', SEP, 'N', 'O'],
    ])
    reader.txtTo(DELIM) ?? await A

    const r1 = reader.txtTo(DELIM)
    expect(r1).toBe(undefined)
    expect(await A).toBe('CDE' + 'FGHI')

    const r2 = reader.txtTo(DELIM)
    expect(r2).toBe('KL')
  })

  it('param type', async () => {
    const reader = createReader([
      ['A', SEP, 'C'],
    ])
    const r1 = reader.txtTo('9.99' as any) ?? await A
    expect(r1).toBe('A')
  })

  it('read zero', async () => {
    const reader = createReader([
      [SEP, SEP, SEP],
    ])
    const r1 = reader.txtTo(DELIM)
    expect(r1).toBe(undefined)
    expect(await A).toBe('')

    const r2 = reader.txtTo(DELIM)
    expect(r2).toBe('')
    expect(reader.eof).toBe(false)

    const r3 = reader.txtTo(DELIM)
    expect(r3).toBe(undefined)
    expect(await A).toBe('')
    expect(reader.eof).toBe(true)
  })

  it('out of range', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
    ])
    QuickReader.maxQueueLen = 6
    try {
      reader.txtTo(0) ?? await A
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
      [], ['A'], [], ['\0', 'C', 'D'], [], ['\0'], [], ['\0']
    ])
    const r1 = reader.txtTo(0) ?? await A
    expect(r1).toBe('A')

    const v1 = reader.txtTo(0) ?? await A
    expect(v1).toBe('CD')

    const r2 = reader.txtTo(0) ?? await A
    expect(r2).toBe('')
    expect(reader.eof).toBe(true)
  })

  it('eof', async () => {
    const reader = createReader([
      ['A', SEP, 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', SEP],
    ])
    reader.txtTo(DELIM) ?? await A
    reader.txtTo(DELIM) ?? await A
    expect(reader.eof).toBe(true)
  })

  it('read after eof', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', SEP],
    ])
    reader.txtTo(DELIM) ?? await A
    expect(reader.eof).toBe(true)

    try {
      reader.txtTo(DELIM) ?? await A
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
      ['A', SEP, 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
    ])
    reader.txtTo(DELIM) ?? await A

    try {
      reader.txtTo(DELIM) ?? await A
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
      ['A', 'B', 'C', 'D', 'E'],
      ['F', 'G', 'H', 'I', 'J'],
    ])
    reader.eofAsDelim = true

    const r1 = reader.txtTo(DELIM) ?? await A
    expect(r1).toBe('ABCDE' + 'FGHIJ')
  })

  it('empty stream', async () => {
    const reader = createReader([
      [],
    ])
    try {
      reader.txtTo(0) ?? await A
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
      reader.txtTo(0) ?? await A
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