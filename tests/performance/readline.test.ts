import {Readable} from 'stream'
import * as readline from 'readline'
import {QuickReader, A} from '../../src/index'


describe('readline perf', () => {
  const LINE_NUM = 1e6
  const lines = new Uint32Array(LINE_NUM)

  for (let i = 0; i < lines.length; i++) {
    lines[i] = Math.random() * 0xffffffff
  }
  const expStr = lines.join('\n')
  const bigBuf = Buffer.from(expStr)

  const CHUNK_LEN = 16384
  const chunks: Buffer[] = []

  for (let i = 0; i < bigBuf.length; i += CHUNK_LEN) {
    const chunk = bigBuf.subarray(i, i + CHUNK_LEN)
    chunks.push(chunk)
  }


  function createNodeStream() {
    let id = 0
    const stream = new Readable({
      read() {
        this.push(chunks[id++] || null)
      }
    })
    return stream
  }


  it('with payload', async () => {
    let t1 = 0
    {
      const result: number[] = []
      const stream = createNodeStream()
      const rl = readline.createInterface({input: stream})

      const t = Date.now()
      for await (const line of rl) {
        result.push(+line)
      }
      t1 = Date.now() - t

      expect(result.join('\n')).toBe(expStr)
    }

    let t2 = 0
    {
      const result: number[] = []
      const stream = createNodeStream()
      const reader = new QuickReader(stream)
      reader.eofAsDelim = true

      const t = Date.now()
      do {
        const line = reader.txtLn() ?? await A
        result.push(+line)
      } while (!reader.eof)

      t2 = Date.now() - t
      expect(result.join('\n')).toBe(expStr)
    }
    console.log('t1:', t1, 't2:', t2,)
  })


  it('no payload', async () => {
    let t1 = 0
    {
      const stream = createNodeStream()
      const rl = readline.createInterface({input: stream})

      const t = Date.now()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const line of rl) {
      }
      t1 = Date.now() - t
    }

    let t2 = 0
    {
      const stream = createNodeStream()
      const reader = new QuickReader(stream)
      reader.eofAsDelim = true

      const t = Date.now()
      do {
        reader.txtLn() ?? await A
      } while (!reader.eof)

      t2 = Date.now() - t
    }
    console.log('t1:', t1, 't2:', t2)
  })
})