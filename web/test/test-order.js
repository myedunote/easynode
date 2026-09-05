import assert from 'node:assert/strict'
import { moveArrayItem } from '../src/composables/useListOrder.js'

const ids = ['a', 'b', 'c', 'd',]
assert.deepEqual(moveArrayItem(ids, 1, 3), ['a', 'c', 'd', 'b',])
assert.deepEqual(moveArrayItem(ids, 3, 0), ['b', 'a', 'c', 'd',])
console.log('order helper tests passed')
