# QuickReader

An ultra-high performance stream reader for browser and Node.js, easy-to-use, zero dependency.

[![NPM Version](https://badgen.net/npm/v/quickreader)](https://npmjs.org/package/quickreader)
[![NPM Install Size](https://badgen.net/packagephobia/install/quickreader)](https://packagephobia.com/result?p=quickreader)
![GitHub CI](https://github.com/EtherDream/quickreader/actions/workflows/ci.yml/badge.svg)


# Install

```bash
npm i quickreader
```


# Demo

```js
import {QuickReader, A} from 'quickreader'

const res = await fetch('https://unpkg.com/quickreader-demo/demo.bin')
const stream = res.body   // ReadableStream
const reader = new QuickReader(stream)

do {
  const id   = reader.u32() ?? await A
  const name = reader.txt() ?? await A
  const age  = reader.u8()  ?? await A

  console.log(id, name, age)

} while (!reader.eof)
```

https://jsbin.com/loyuxad/edit?html,console

With a stream reader, you can read the data in the specified types while downloading, which makes the user experience better. You don't have to do the chunk slicing and buffering yourself, the reader does all that.

Without it, you would have to wait for all the data to be downloaded before you could read it (e.g., via DataView). Since JS doesn't support structures, you have to pass in an offset parameter for each read, which is inconvenient to use.


# Why Quick

We used two tricks to improve performance:

* selective await

* synchronized EOF

## selective await

The overhead of await is considerable, here is a test:

```js
let s1 = 0, s2 = 0

console.time('no-await')
for (let i = 0; i < 1e7; i++) {
  s1 += i
}
console.timeEnd('no-await')   // ~15ms

console.time('await')
for (let i = 0; i < 1e7; i++) {
  s2 += await i
}
console.timeEnd('await')      // Chrome: ~800ms, Safari: ~3000ms
```

https://jsbin.com/gehazin/edit?html,output

The above two cases do the same thing, but the await one is 50x to 200x slower than the no-await. On Chrome it's even ~2000x slower if the console is open (only ~500 await/ms).

This test seems meaningless, but in fact, sometimes we call await heavily in an almost synchronous logic, such as an async query function that will mostly hit the memory cache and return.

```js
async function query(key) {
  if (cacheMap.has(key)) {
    return ...  // 99.9%
  }
  await ...
}
```

Reading data from a stream has the same issue. For a single integer or tiny text, it takes only a few bytes, in most cases, it can be read directly from the buffer without I/O calls, so await is unnecessary; await is only needed when the buffer is not enough.

If await is called only when needed, the overhead can be reduced many times.

```js
console.time('selective-await')
for (let i = 0; i < 1e7; i++) {
  const value = (i % 1000)  // buffer enough?
    ? i         // 99.9%
    : await i   //  0.1%
}
console.timeEnd('selective-await')  // ~40ms 🚀
```

For `QuickReader`, when its buffer is enough, it returns the result immediately; otherwise, it returns nothing (`undefined`), and the result can be obtained by `await A`.

```js
function readBytes(len) {
  if (len < availableLen) {
    return buf.subarray(offset, offset + len)   // likely
  }
  A = readBytesAsync(len)
}

async function readBytesAsync(len) {
  await stream.read()
  ...
}
```

The calling logic can be simplified into one line using the [nullish coalescing operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator):

```js
result = readBytes(10) ?? await A
```

This is both high-performance and easy-to-use. 

> Note: The `A` is not a global variable in the real code, it's just an imported object that implements [thenable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await#thenable_objects), you can rename it on import.

## synchronized EOF

`QuickReader` always keeps its buffer at least 1 byte, this means when the available buffer length is 4 and call `reader.u32()`, the result will not be returned immediately, but requires await. The buffer will not be fully read until the stream is closed.

In this way, the EOF state can be detected synchronously, nearly zero overhead.


# Node.js

NodeStream is also supported:

```js
const stream = fs.createReadStream('/path/to')
const reader = new QuickReader(stream)
// ...
```

If the stream provides data as `Buffer`, buffer-related methods like `bytes`, `bytesTo`, etc. return `Buffer` as well, otherwise they return `Uint8Array`.

> [Buffer](https://nodejs.org/api/buffer.html#buffer) is a subclass of `Uint8Array`.


# API

## Class

* QuickReader`<T extends Uint8Array = Uint8Array>`

## Constructor

* new(stream: `AsyncIterable<T>` | `ReadableStream<T>`)

## By length

* bytes(len: `number`) : `T` | `undefined`

* skip(len: `number`) : `number` | `undefined`

* txtNum(len: `number`) : `string` | `undefined`

## By delimiter

* bytesTo(delim: `number`) : `T` | `undefined`

* skipTo(delim: `number`) : `number` | `undefined`

* txtTo(delim: `number`) : `string` | `undefined`

## Helper

* txt() : `string` - Equivalent to `txtTo(0)`.

* txtLn() : `string` - Equivalent to `txtTo(10)`.

## Number

* {u, i}{8, 16, 32, 16be, 32be}() : `number` | `undefined`

* {u, i}{64, 64be}() : `bigint` | `undefined`

* f{32, 64, 32be, 64be}() : `number` | `undefined`

## Chunk

* chunk(): `Promise<T>`

* chunks(len: number) : `AsyncGenerator<T>`

* chunksToEnd(len: number) : `AsyncGenerator<T>`

## Property

* eof: `boolean`

* eofAsDelim: `boolean` (default `false`)

## More

See [index.d.ts](typings/index.d.ts)

> Note: The program will not check the parameter `len`, but converts it to u32,  which may cause negative values become large numbers. So the caller needs to ensure that `len >= 0`. Similarly, the parameter `delim` will not be checked, but converted to u8.


# EOF State

Since the `eof` property is synchronized, it's meaningless until the first read.

If the stream is expected to be non-empty, you can read before detecting:

```js
const reader = new QuickReader(stream)
do {
  const line = reader.txtLn() ?? await A
} while (!reader.eof)
```

However, an error will be thrown when the stream is empty.

If the empty stream needs to be considered, you can call `pull` method first, then the `eof` will be meaningful:

```js
const reader = new QuickReader(stream)
await reader.pull()

while (!reader.eof) {
  const line = reader.txtLn() ?? await A
}
```

In this way, no error will be thrown if the stream is empty.


# Buffer Type

The generic type `T` can be used as a type hint for the buffer:

```ts
class QuickReader<T extends Uint8Array = Uint8Array> {

  new(stream: AsyncIterable<T> | ReadableStream<T>)

  public bytes(len: number) : T | undefined
  public bytesTo(delim: number) : T | undefined

  public chunk() : Promise<T>
  public chunks(len: number) : AsyncGenerator<T>
  public chunksToEnd(len: number) : AsyncGenerator<T>
}
```

`T` is based on the type of the construction parameter `stream`, if it is not clear, you need to specify `T` manually:

```ts
{
  const reader = new QuickReader<Buffer>(fs.createReadStream('/path/to'))
  const buffer = reader.bytes(10) ?? await A
  buffer  // Type Hint: Buffer
}
{
  const reader = new QuickReader<Uint8Array>(getStreamSomeHow())
  const buffer = reader.bytes(10) ?? await A
  buffer  // Type Hint: Uint8Array
}
```

When `T` is explicit, buffer-related methods can get the expected return type hint.


# Chunk Reading

## chunk

When processing a large file, after reading the header, sometimes we want to read the remaining data chunk by chunk instead of all at once. In this case, we can use the `chunk` method:

```js
const header = reader.byte(10) ?? await A
do {
  const chunk = await reader.chunk()
  // ...
} while (!reader.eof)
```

Once this method is called, the amount of remaining data will be unpredictable, you can only call this method repeatedly.

## chunks

Using the `chunks` method, you can specify the read length:

```js
const ver = reader.u32() ?? await A
const len = reader.u32() ?? await A

for await (const chunk of reader.chunks(len)) {
  // ...
}

const trailer = reader.bytes(8) ?? await A
```

In this way, after reading some chunks, you can continue to read data with types.

> During iteration, calling other methods to read data is not allowed.

## chunksToEnd

This method will read all data until `len` bytes remaining, so that the trailer can be excluded.

```ts
const header = reader.bytes(10) ?? await A

for await (const chunk of reader.chunksToEnd(8)) {
  // ...
}

const trailer = reader.bytes(8) ?? await A
```

After calling this method, the stream is closed, and the buffer has `len` bytes.

If `len` is `0`, it is similar to calling `chunk` method repeatedly.

# Type Check

It is better to use TypeScript. When you forget to add `?? await A`, the type of result will be unioned with `undefined`, which makes it easier to expose the issue.

```js
const id = reader.u32()   // number | undefined
id.toString()             // ❌
```


# Concurrency

The same reader is not allowed to be called by multiple co-routines in parallel, as this would break the waiting order. Therefore, the following logic should not be used:

```js
const reader = new QuickReader(stream)

async function routine() {
  do {
    const id = reader.u32() ?? await A
    const name = reader.txt() ?? await A
    // ...
  } while (!reader.eof)
}

// ❌
for (let i = 0; i < 10; i++) {
  routine()
}
```


# Read Line

`QuickReader` is also a high performance line reader. It reduces the overhead by ~60% compared to the Node.js' native `readline` module, because its parsing logic is simpler, e.g. using only `\n` delimiter (ignoring `\r`).

```js
const stream = fs.createReadStream('log.txt')
const reader = new QuickReader(stream)
await reader.pull()

// no error if the file does not end with '\n'
reader.eofAsDelim = true

while (!reader.eof) {
  const line = reader.txtLn() ?? await A
  // ...
}
```

Of course, as mentioned above, concurrency is not supported. If there are multiple co-routines reading the same file, it is better to use the native `readline` module:

```js
import fs from 'node:fs'
import readline from 'node:readline'

const stream = fs.createReadStream('urls.txt')
const rl = readline.createInterface({input: stream})
const iter = rl[Symbol.asyncIterator]()

async function routine() {
  for (;;) {
    const {value: url} = await iter.next()
    if (!url) { 
      break
    }
    const res = await fetch(url)
    // ...
  }
}

for (let i = 0; i < 100; i++) {
  routine()
}
```


# About

The idea of this project was born when the `await` keyword was introduced. The earliest solution was:

```js
const result = reader.read() || await A
```

Since the `||` operator will also short-circuit `0` and `''`, so it was not perfect, until the `??` was introduced in ES2020.

However, the performance of await had been greatly improved compared to the past, so it was not as meaningful as it was then. Anyway, I still share this idea, even if it is 2022 now, after all, performance optimization is never-ending.

Due to limited time and English, the document and some code comments (e.g. index.d.ts) were translated via Google, hopefully someone will improve it.


# License

MIT
