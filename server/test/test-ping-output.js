import assert from 'node:assert/strict'
import { parsePingTime } from '../app/utils/tools.js'

const linuxOutput = `
rtt min/avg/max/mdev = 18.100/18.282/18.500/0.120 ms
`
const macOutput = `
round-trip min/avg/max/stddev = 18.902/18.902/18.902/nan ms
`
const packetOutput = '64 bytes from 43.136.14.137: icmp_seq=0 ttl=51 time=19.379 ms'

assert.equal(parsePingTime(linuxOutput), 18.282)
assert.equal(parsePingTime(macOutput), 18.902)
assert.equal(parsePingTime(packetOutput), 19.379)
assert.equal(parsePingTime('Average = 20ms', true), 20)
assert.equal(parsePingTime('平均 = 21ms', true), 21)
assert.equal(parsePingTime('ping: cannot resolve invalid.example'), null)

console.log('ping output parser tests passed')
