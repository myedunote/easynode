export const execStatusEnum = Object.freeze({
  connecting: '连接中',
  connectFail: '连接失败',
  executing: '执行中',
  execSuccess: '执行成功',
  execFail: '执行失败',
  execTimeout: '执行超时',
  socketInterrupt: '执行中断'
})

function timestampOf(record, field) {
  const value = Number(record?.[field])
  return Number.isFinite(value) ? value : 0
}

export function sortOnekeyRecords(records = []) {
  return [...records].sort((left, right) => {
    const leftBatchTime = timestampOf(left, 'batchStartDate') || timestampOf(left, 'startDate')
    const rightBatchTime = timestampOf(right, 'batchStartDate') || timestampOf(right, 'startDate')
    const batchTimeDiff = rightBatchTime - leftBatchTime
    if (batchTimeDiff) return batchTimeDiff

    if (left.batchId && left.batchId === right.batchId) {
      return timestampOf(left, 'order') - timestampOf(right, 'order')
    }

    // 旧记录没有批次字段，保持原有的时间倒序行为。
    return timestampOf(right, 'startDate') - timestampOf(left, 'startDate')
  })
}

function safelyCall(resource, method, ...args) {
  if (typeof resource?.[method] !== 'function') return
  try {
    resource[method](...args)
  } catch {
    // 连接可能已被其他终态回调关闭，这里只做幂等清理。
  }
}

function closeStream(stream, interrupt = false) {
  if (interrupt) safelyCall(stream, 'signal', 'INT')
  safelyCall(stream, 'close')
  safelyCall(stream, 'end')
  safelyCall(stream, 'destroy')
}

function closeClient(client) {
  safelyCall(client, 'end')
  safelyCall(client, 'destroy')
}

function shouldInterrupt(status) {
  return [execStatusEnum.execTimeout, execStatusEnum.socketInterrupt].includes(status)
}

export class OnekeyExecutionState {
  constructor({ emitOutput = () => {}, now = () => Date.now() } = {}) {
    this.emitOutput = emitOutput
    this.now = now
    this.results = []
    this.targets = new Map()
  }

  addTarget(result) {
    let resolve
    const promise = new Promise(done => {
      resolve = done
    })
    const target = {
      result,
      resolve,
      promise,
      settled: false,
      sshClient: null,
      transport: null,
      stream: null,
      jumpClients: []
    }
    this.results.push(result)
    this.targets.set(result.hostId, target)
    return target
  }

  getTarget(hostId) {
    return this.targets.get(hostId)
  }

  isActive(hostId) {
    const target = this.getTarget(hostId)
    return Boolean(target && !target.settled)
  }

  attachSshClient(hostId, sshClient) {
    const target = this.getTarget(hostId)
    if (!target || target.settled) {
      closeClient(sshClient)
      return false
    }
    target.sshClient = sshClient
    return true
  }

  attachTransport(hostId, transport) {
    if (!transport) return true
    const target = this.getTarget(hostId)
    if (!target || target.settled) {
      closeClient(transport)
      return false
    }
    target.transport = transport
    return true
  }

  attachStream(hostId, stream) {
    const target = this.getTarget(hostId)
    if (!target || target.settled) {
      closeStream(stream, shouldInterrupt(target?.result.status))
      return false
    }
    target.stream = stream
    return true
  }

  attachJumpClients(hostId, jumpClients = []) {
    const clients = Array.isArray(jumpClients) ? jumpClients.filter(Boolean) : []
    const target = this.getTarget(hostId)
    if (!target || target.settled) {
      clients.forEach(closeClient)
      return false
    }
    target.jumpClients.push(...clients)
    return true
  }

  appendOutput(hostId, data) {
    const target = this.getTarget(hostId)
    if (!target || target.settled) return false
    target.result.status = execStatusEnum.executing
    target.result.result += data.toString()
    return true
  }

  finishHost(hostId, status, message = '', emit = true) {
    const target = this.getTarget(hostId)
    if (!target || target.settled) return false
    target.settled = true
    target.result.status = status
    if (message) target.result.result += message
    target.result.endDate = this.now()
    this.cleanupTarget(target, shouldInterrupt(status))
    target.resolve(target.result)
    if (emit) this.emitOutput(this.results)
    return true
  }

  stopHost(hostId) {
    const target = this.getTarget(hostId)
    if (!target) return { ok: false, message: '未找到该实例的执行任务' }
    if (target.settled) return { ok: false, message: '该实例的执行任务已结束' }
    this.finishHost(hostId, execStatusEnum.socketInterrupt)
    return { ok: true, message: '已停止该实例的执行任务' }
  }

  finishPending(status) {
    let count = 0
    for (const [hostId, target] of this.targets) {
      if (target.settled) continue
      if (this.finishHost(hostId, status, '', false)) count++
    }
    if (count) this.emitOutput(this.results)
    return count
  }

  waitForAll() {
    return Promise.all([...this.targets.values()].map(target => target.promise))
  }

  cleanupTarget(target, interrupt = false) {
    closeStream(target.stream, interrupt)
    closeClient(target.sshClient)
    closeClient(target.transport)
    target.jumpClients.forEach(closeClient)
    target.stream = null
    target.sshClient = null
    target.transport = null
    target.jumpClients = []
  }
}
