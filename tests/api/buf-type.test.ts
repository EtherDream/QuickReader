import {QuickReader, A} from '../../src/index'
import {createReader} from './util'


describe('buffer type', () => {
  it('node buffer', async () => {
    const reader = createReader([
      Buffer.from([0x10, 0x11]),
      Buffer.from([0x20, 0x21]),
    ], QuickReader<Buffer>)

    const result = reader.bytes(4) ?? await A
    expect(result).toBeInstanceOf(Buffer)
  })


  it('Uint8Array', async () => {
    const reader = createReader([
      [0x10, 0x11],
      [0x20, 0x21],
    ], QuickReader<Uint8Array>)

    const result = reader.bytes(4) ?? await A
    expect(result).toBeInstanceOf(Uint8Array)
  })
})