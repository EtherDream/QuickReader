import {QuickReader, A} from '../../src/index'
import {createReader} from './util'


describe('buf-type', () => {
  it('node buffer', async () => {
    const reader = createReader([
      Buffer.from([0x10, 0x11]),
      Buffer.from([0x20, 0x21]),
    ], QuickReader<Buffer>)

    const r1 = reader.bytes(4) ?? await A
    expect(r1).toBeInstanceOf(Buffer)
  })


  it('Uint8Array', async () => {
    const reader = createReader([
      [0x10, 0x11],
      [0x20, 0x21],
    ], QuickReader<Uint8Array>)

    const r1 = reader.bytes(4) ?? await A
    expect(r1).toBeInstanceOf(Uint8Array)
  })
})