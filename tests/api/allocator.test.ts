import {QuickReader, A} from '../../src/index'
import {createReader} from './util'


describe('allocator', () => {
  it('buffer type', async () => {
    const reader = createReader([
      [0x10, 0x11],
      [0x20, 0x21],
    ], QuickReader<Buffer>)

    reader.allocator = (len: number) => {
      return Buffer.alloc(len)
    }
    const r1 = reader.bytes(4) ?? await A
    expect(r1).toBeInstanceOf(Buffer)
  })


  it('buffer type', async () => {
    const reader = createReader([
      [0x10, 0x11],
      [0x20, 0x21],
    ], QuickReader<Uint8Array>)

    reader.allocator = (len: number) => {
      return new Uint8Array(len)
    }
    const r1 = reader.bytes(4) ?? await A
    expect(r1).toBeInstanceOf(Uint8Array)
  })
})