import * as fs from 'fs'
import * as http from 'http'
import express from 'express'
import nodeFetch from 'node-fetch'
import {QuickReader, QuickReaderError, QuickReaderErrorCode, A} from '../../src/index'

const DEMO_FILE = 'tests/demo/demo.bin'
const DEMO_CORRUPTED_FILE = 'tests/demo/demo-corrupted.bin'


const testData = [
  {id: 10000, age: 22, name: 'Alice'},
  {id: 10001, age: 24, name: 'Bob'},
  {id: 10002, age: 26, name: '查利'},
  {id: 10003, age: 28, name: '戴夫'},
  {id: 10004, age: 30, name: 'Ева'},
  {id: 10005, age: 32, name: 'Мэллори'},
  {id: 10006, age: 30, name: 'オスカー'},
  {id: 10007, age: 28, name: 'ペギー'},
  {id: 10008, age: 26, name: '스티브'},
  {id: 10009, age: 24, name: '트루디'},
  {id: 10010, age: 97, name: '👓'},
]

function genDemoFile() {
  const bufs: Buffer[] = []

  for (const item of testData) {
    const idBuf = Buffer.alloc(4)
    idBuf.writeUInt32LE(item.id)
    const nameBuf = Buffer.from(item.name + '\0')
    const ageBuf = Buffer.from([item.age])

    bufs.push(idBuf, nameBuf, ageBuf)
  }
  const buf = Buffer.concat(bufs)
  fs.writeFileSync(DEMO_FILE, buf)
  fs.writeFileSync(DEMO_CORRUPTED_FILE, buf.subarray(0, -1))
}


describe('demo', () => {
  genDemoFile()

  async function readDemo(stream: any) {
    const reader = new QuickReader(stream)
    const result: typeof testData = []
    do {
      const id   = reader.u32() ?? await A
      const name = reader.txt() ?? await A
      const age  = reader.u8()  ?? await A

      result.push({id, age, name})
    } while (!reader.eof)

    expect(result).toEqual(testData)
  }


  async function readCorruptedDemo(stream: any) {
    const reader = new QuickReader(stream)
    const result: typeof testData = []
    try {
      do {
        const id   = reader.u32() ?? await A
        const name = reader.txt() ?? await A
        const age  = reader.u8()  ?? await A

        result.push({id, age, name})
      } while (!reader.eof)
      fail()
    } catch (err: any) {
      expect(err).toBeInstanceOf(QuickReaderError)
      expect(err.code).toBe(QuickReaderErrorCode.NO_MORE_DATA)
      expect(err.message).toContain('NO_MORE_DATA')
      expect(reader.eof).toBe(true)
    }

    expect(result).toEqual(testData.slice(0, -1))
  }


  it('nodejs', async () => {
    const stream1 = fs.createReadStream(DEMO_FILE)
    await readDemo(stream1)

    const stream2 = fs.createReadStream(DEMO_CORRUPTED_FILE)
    await readCorruptedDemo(stream2)
  })


  let svr: http.Server
  let addr = ''

  beforeAll(done => {
    const app = express()
    app.use(express.static('.'))

    svr = app.listen(0, async () => {
      const port = (svr.address() as any).port
      addr = 'http://127.0.0.1:' + port + '/'
      console.log(addr)
      done()
    })
  })

  afterAll(done => {
    svr.close(done)
  })

  it('node-fetch library', async () => {
    const res1 = await nodeFetch(addr + DEMO_FILE)
    await readDemo(res1.body)

    const res2 = await nodeFetch(addr + DEMO_CORRUPTED_FILE)
    await readCorruptedDemo(res2.body)
  })

  it('node-fetch native', async () => {
    if (typeof fetch !== 'function') {
      return
    }
    const res1 = await fetch(addr + DEMO_FILE)
    const stream1 = res1.body as any
    stream1[Symbol.asyncIterator] = undefined
    await readDemo(stream1)

    const res2 = await fetch(addr + DEMO_CORRUPTED_FILE)
    const stream2 = res2.body as any
    stream2[Symbol.asyncIterator] = undefined
    await readCorruptedDemo(stream2)
  })
})
