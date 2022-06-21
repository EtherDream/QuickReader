import {QuickReader, A} from '../../src/index'
import {createReader} from './util'


class QuickReaderEx extends QuickReader {
  protected async _pull() : Promise<Uint8Array | undefined> {
    const chunk = await super._pull()
    if (chunk) {
      for (let i = 0; i < chunk.length; i++) {
        chunk[i] ^= 123
      }
    }
    return chunk
  }
}

describe('subclass', () => {
  it('decrypt', async () => {
    const crypt = (arr: number[]) => {
      return arr.map(v => v ^ 123)
    }
    const reader = createReader([
      crypt([0x10, 0x11, 0x12, 0x13, 0x14]),
      crypt([0x20, 0x21, 0x22, 0x23, 0x24]),
    ], QuickReaderEx)

    const r1 = reader.u32be() ?? await A
    expect(r1).toBe(0x10_11_12_13)

    const r2 = reader.u16be() ?? await A
    expect(r2).toBe(0x14_20)

    const r3 = reader.u32be() ?? await A
    expect(r3).toBe(0x21_22_23_24)

    expect(reader.eof).toBe(true)
  })
})