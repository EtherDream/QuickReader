import {QuickReader} from '../../src/index'

type chunk_t = Uint8Array | number[] | string[]


export function createReader(chunks: chunk_t[], cls = QuickReader<Uint8Array>) {
  const stream = {
    [Symbol.asyncIterator]: async function*() {
      for (const chunk of chunks) {
        if (!Array.isArray(chunk)) {
          yield chunk
          continue
        }
        if (chunk[0] === 'ERROR') {
          throw new Error(chunk[1] as string)
        }
        const arr = chunk.map((v: number | string) => {
          return typeof v === 'string' ? v.charCodeAt(0) : v
        })
        const buf = new Uint8Array(arr)
        yield buf
      }
    }
  }
  return new cls(stream)
}