import assert from 'node:assert/strict'
import {
  OnekeyExecutionState,
  execStatusEnum,
  sortOnekeyRecords
} from '../app/services/onekey-execution.js'

function createResource() {
  return {
    calls: [],
    signal(value) { this.calls.push(`signal:${ value }`) },
    close() { this.calls.push('close') },
    end() { this.calls.push('end') },
    destroy() { this.calls.push('destroy') }
  }
}

function addTarget(state, hostId, status = execStatusEnum.connecting) {
  return state.addTarget({
    hostId,
    host: `${ hostId }.example.com`,
    result: '',
    status,
    startDate: 1
  })
}

{
  const records = sortOnekeyRecords([
    { name: 'old-batch-second', batchId: 'old', batchStartDate: 100, order: 1, startDate: 101 },
    { name: 'new-batch-second', batchId: 'new', batchStartDate: 300, order: 1, startDate: 301 },
    { name: 'legacy', startDate: 200 },
    { name: 'new-batch-first', batchId: 'new', batchStartDate: 300, order: 0, startDate: 300 },
    { name: 'old-batch-first', batchId: 'old', batchStartDate: 100, order: 0, startDate: 100 }
  ])
  assert.deepEqual(records.map(item => item.name), [
    'new-batch-first',
    'new-batch-second',
    'legacy',
    'old-batch-first',
    'old-batch-second'
  ])
}

{
  const outputs = []
  let now = 10
  const state = new OnekeyExecutionState({
    emitOutput: results => outputs.push(results.map(item => ({ ...item }))),
    now: () => now++
  })
  const first = addTarget(state, 'host-1')
  const second = addTarget(state, 'host-2')
  const firstClient = createResource()
  const secondClient = createResource()
  const secondStream = createResource()
  const secondJump = createResource()

  state.attachSshClient('host-1', firstClient)
  state.attachSshClient('host-2', secondClient)
  state.attachStream('host-2', secondStream)
  state.attachJumpClients('host-2', [secondJump])
  state.appendOutput('host-2', 'running')
  state.finishHost('host-1', execStatusEnum.execSuccess)
  assert.deepEqual(state.stopHost('host-2'), {
    ok: true,
    message: '已停止该实例的执行任务'
  })

  await state.waitForAll()
  assert.equal(first.result.status, execStatusEnum.execSuccess)
  assert.equal(second.result.status, execStatusEnum.socketInterrupt)
  assert.equal(second.result.result, 'running')
  assert.equal(second.result.endDate, 11)
  assert.deepEqual(secondStream.calls, ['signal:INT', 'close', 'end', 'destroy'])
  assert.deepEqual(secondClient.calls, ['end', 'destroy'])
  assert.deepEqual(secondJump.calls, ['end', 'destroy'])
  assert.equal(outputs.length, 2)

  assert.equal(state.finishHost('host-2', execStatusEnum.execSuccess), false)
  assert.deepEqual(state.stopHost('host-2'), {
    ok: false,
    message: '该实例的执行任务已结束'
  })
  assert.equal(second.result.status, execStatusEnum.socketInterrupt)
}

{
  const state = new OnekeyExecutionState()
  const connecting = addTarget(state, 'connecting')
  state.stopHost('connecting')

  const lateClient = createResource()
  const lateTransport = createResource()
  const lateStream = createResource()
  const lateJump = createResource()
  assert.equal(state.attachSshClient('connecting', lateClient), false)
  assert.equal(state.attachTransport('connecting', lateTransport), false)
  assert.equal(state.attachStream('connecting', lateStream), false)
  assert.equal(state.attachJumpClients('connecting', [lateJump]), false)
  assert.deepEqual(lateClient.calls, ['end', 'destroy'])
  assert.deepEqual(lateTransport.calls, ['end', 'destroy'])
  assert.deepEqual(lateStream.calls, ['signal:INT', 'close', 'end', 'destroy'])
  assert.deepEqual(lateJump.calls, ['end', 'destroy'])
  assert.equal(state.appendOutput('connecting', 'late output'), false)
  assert.equal(connecting.result.result, '')
}

{
  const outputs = []
  const state = new OnekeyExecutionState({ emitOutput: results => outputs.push(results) })
  const completed = addTarget(state, 'completed')
  const running = addTarget(state, 'running', execStatusEnum.executing)
  const connecting = addTarget(state, 'connecting')
  state.finishHost('completed', execStatusEnum.execSuccess)

  assert.equal(state.finishPending(execStatusEnum.execTimeout), 2)
  await state.waitForAll()
  assert.equal(completed.result.status, execStatusEnum.execSuccess)
  assert.equal(running.result.status, execStatusEnum.execTimeout)
  assert.equal(connecting.result.status, execStatusEnum.execTimeout)
  // 批量收尾只广播一次，不随实例数量放大。
  assert.equal(outputs.length, 2)
  assert.equal(state.finishPending(execStatusEnum.socketInterrupt), 0)
}

console.log('onekey execution lifecycle tests passed')
