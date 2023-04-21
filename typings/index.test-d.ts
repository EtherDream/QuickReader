import './src.test-d'

import {QuickReader, A} from './index'
import {expectType} from 'tsd'
import fs from 'fs'




const nodeStream = fs.createReadStream('/tmp/1.txt')
expectType< QuickReader<Buffer> >(new QuickReader<Buffer>(nodeStream))


const webStream = await fetch('/')
expectType< QuickReader<Uint8Array> >(new QuickReader(webStream.body!))


const bufferReader = new QuickReader({
  [Symbol.asyncIterator]: async function*() {
    yield Buffer.alloc(1)
  }
})
expectType< QuickReader<Buffer> >(bufferReader)


const uint8ArrayReader = new QuickReader({
  [Symbol.asyncIterator]: async function*() {
    yield new Uint8Array(1)
  }
})
expectType< QuickReader<Uint8Array> >(uint8ArrayReader)


{
  // pull
  expectType<Promise<void>>(uint8ArrayReader.pull())

  // chunk
  expectType<Promise<Uint8Array>>(uint8ArrayReader.chunk())
  expectType<Promise<Buffer>>(bufferReader.chunk())

  // chunks
  expectType<AsyncGenerator<Uint8Array>>(uint8ArrayReader.chunks(10))
  expectType<AsyncGenerator<Buffer>>(bufferReader.chunks(10))

  // chunksToEnd
  expectType<AsyncGenerator<Uint8Array>>(uint8ArrayReader.chunksToEnd(10))
  expectType<AsyncGenerator<Buffer>>(bufferReader.chunksToEnd(10))
}
{
  // bytes
  expectType<Uint8Array | undefined>(uint8ArrayReader.bytes(10))
  expectType<Uint8Array | undefined>(uint8ArrayReader.bytesTo(32))

  expectType<Buffer | undefined>(bufferReader.bytes(10))
  expectType<Buffer | undefined>(bufferReader.bytesTo(32))

  // skip
  expectType<number | undefined>(bufferReader.skip(10))
  expectType<number | undefined>(bufferReader.skipTo(32))

  // text
  expectType<string | undefined>(bufferReader.txtNum(10))
  expectType<string | undefined>(bufferReader.txtTo(32))
  expectType<string | undefined>(bufferReader.txt())
  expectType<string | undefined>(bufferReader.txtLn())

  // little-endian
  expectType<bigint | undefined>(bufferReader.u64())
  expectType<bigint | undefined>(bufferReader.i64())

  expectType<number | undefined>(bufferReader.u32())
  expectType<number | undefined>(bufferReader.i32())

  expectType<number | undefined>(bufferReader.u16())
  expectType<number | undefined>(bufferReader.i16())

  expectType<number | undefined>(bufferReader.u8())
  expectType<number | undefined>(bufferReader.i8())

  expectType<number | undefined>(bufferReader.f64())
  expectType<number | undefined>(bufferReader.f32())

  // big-endian
  expectType<bigint | undefined>(bufferReader.u64be())
  expectType<bigint | undefined>(bufferReader.i64be())

  expectType<number | undefined>(bufferReader.u32be())
  expectType<number | undefined>(bufferReader.i32be())

  expectType<number | undefined>(bufferReader.u16be())
  expectType<number | undefined>(bufferReader.i16be())

  expectType<number | undefined>(bufferReader.f64be())
  expectType<number | undefined>(bufferReader.f32be())
}
{
  // bytes
  expectType<Uint8Array>(uint8ArrayReader.bytes(10) ?? await A)
  expectType<Uint8Array>(uint8ArrayReader.bytesTo(32) ?? await A)

  expectType<Buffer>(bufferReader.bytes(10) ?? await A)
  expectType<Buffer>(bufferReader.bytesTo(32) ?? await A)

  // skip
  expectType<number>(bufferReader.skip(10) ?? await A)
  expectType<number>(bufferReader.skipTo(32) ?? await A)

  // text
  expectType<string>(bufferReader.txtNum(10) ?? await A)
  expectType<string>(bufferReader.txtTo(32) ?? await A)
  expectType<string>(bufferReader.txt() ?? await A)
  expectType<string>(bufferReader.txtLn() ?? await A)

  // little-endian
  expectType<bigint>(bufferReader.u64() ?? await A)
  expectType<bigint>(bufferReader.i64() ?? await A)

  expectType<number>(bufferReader.u32() ?? await A)
  expectType<number>(bufferReader.i32() ?? await A)

  expectType<number>(bufferReader.u16() ?? await A)
  expectType<number>(bufferReader.i16() ?? await A)

  expectType<number>(bufferReader.u8() ?? await A)
  expectType<number>(bufferReader.i8() ?? await A)

  expectType<number>(bufferReader.f64() ?? await A)
  expectType<number>(bufferReader.f32() ?? await A)

  // big-endian
  expectType<bigint>(bufferReader.u64be() ?? await A)
  expectType<bigint>(bufferReader.i64be() ?? await A)

  expectType<number>(bufferReader.u32be() ?? await A)
  expectType<number>(bufferReader.i32be() ?? await A)

  expectType<number>(bufferReader.u16be() ?? await A)
  expectType<number>(bufferReader.i16be() ?? await A)

  expectType<number>(bufferReader.f64be() ?? await A)
  expectType<number>(bufferReader.f32be() ?? await A)
}