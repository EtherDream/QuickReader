import './src.test-d'
import {QuickReader, A} from './index'
import {expectType} from 'tsd'
import fs from 'fs'


const nodeStream = fs.createReadStream('/tmp/1.txt')
expectType<QuickReader>(new QuickReader(nodeStream))


const webStream = await fetch('/')
if (webStream.body) {
  expectType<QuickReader>(new QuickReader(webStream.body))
}


class QuickReaderEx extends QuickReader {
  protected async _pull(): Promise<Uint8Array | undefined> {
    const chunk = await super._pull()
    return chunk
  }
}
new QuickReaderEx(new ReadableStream())


const customStream = {
  [Symbol.asyncIterator]: async function*() {
    yield new Uint8Array(1)
  }
}
const reader = new QuickReader(customStream)
expectType<QuickReader>(reader)



{
  // bytes
  expectType<Uint8Array | undefined>(reader.bytes(10))
  expectType<Uint8Array | undefined>(reader.bytesTo(32))

  // skip
  expectType<number | undefined>(reader.skip(10))
  expectType<number | undefined>(reader.skipTo(32))

  // text
  expectType<string | undefined>(reader.txtNum(10))
  expectType<string | undefined>(reader.txtTo(32))
  expectType<string | undefined>(reader.txt())
  expectType<string | undefined>(reader.txtLn())

  // little-endian
  expectType<bigint | undefined>(reader.u64())
  expectType<bigint | undefined>(reader.i64())

  expectType<number | undefined>(reader.u32())
  expectType<number | undefined>(reader.i32())

  expectType<number | undefined>(reader.u16())
  expectType<number | undefined>(reader.i16())

  expectType<number | undefined>(reader.u8())
  expectType<number | undefined>(reader.i8())

  expectType<number | undefined>(reader.f64())
  expectType<number | undefined>(reader.f32())

  // big-endian
  expectType<bigint | undefined>(reader.u64be())
  expectType<bigint | undefined>(reader.i64be())

  expectType<number | undefined>(reader.u32be())
  expectType<number | undefined>(reader.i32be())

  expectType<number | undefined>(reader.u16be())
  expectType<number | undefined>(reader.i16be())

  expectType<number | undefined>(reader.f64be())
  expectType<number | undefined>(reader.f32be())
}
{
  // bytes
  expectType<Uint8Array>(reader.bytes(10) ?? await A)
  expectType<Uint8Array>(reader.bytesTo(32) ?? await A)

  // skip
  expectType<number>(reader.skip(10) ?? await A)
  expectType<number>(reader.skipTo(32) ?? await A)

  // text
  expectType<string>(reader.txtNum(10) ?? await A)
  expectType<string>(reader.txtTo(32) ?? await A)
  expectType<string>(reader.txt() ?? await A)
  expectType<string>(reader.txtLn() ?? await A)

  // little-endian
  expectType<bigint>(reader.u64() ?? await A)
  expectType<bigint>(reader.i64() ?? await A)

  expectType<number>(reader.u32() ?? await A)
  expectType<number>(reader.i32() ?? await A)

  expectType<number>(reader.u16() ?? await A)
  expectType<number>(reader.i16() ?? await A)

  expectType<number>(reader.u8() ?? await A)
  expectType<number>(reader.i8() ?? await A)

  expectType<number>(reader.f64() ?? await A)
  expectType<number>(reader.f32() ?? await A)

  // big-endian
  expectType<bigint>(reader.u64be() ?? await A)
  expectType<bigint>(reader.i64be() ?? await A)

  expectType<number>(reader.u32be() ?? await A)
  expectType<number>(reader.i32be() ?? await A)

  expectType<number>(reader.u16be() ?? await A)
  expectType<number>(reader.i16be() ?? await A)

  expectType<number>(reader.f64be() ?? await A)
  expectType<number>(reader.f32be() ?? await A)
}