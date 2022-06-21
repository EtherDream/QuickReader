import {A} from '../../src/index'
import {createReader} from './util'


describe('txt', () => {
  it('txt by null', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', '\0'],
    ])
    const r1 = reader.txt() ?? await A
    expect(r1).toBe('ABCD')
  })

  it('txt by line', async () => {
    const reader = createReader([
      ['A', 'B', 'C', 'D', '\n'],
    ])
    const r1 = reader.txtLn() ?? await A
    expect(r1).toBe('ABCD')
  })
})