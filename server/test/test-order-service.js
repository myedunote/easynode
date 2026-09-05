import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const originalCwd = process.cwd()
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'easynode-order-'))
await fs.mkdir(path.join(tempRoot, 'app', 'db'), { recursive: true })
process.chdir(tempRoot)
global.logger = { info() {}, warn() {}, error() {} }

try {
  const {
    GroupDB,
    HostListDB,
    OrderDB,
    ScriptGroupDB,
    ScriptsDB
  } = await import('../app/utils/db-class.js')
  const {
    addItemsToOrder,
    getLayout,
    initializeOrderSystem,
    moveItemsToGroup,
    ORDER_DOMAIN,
    OrderConflictError,
    OrderValidationError,
    updateOrder
  } = await import('../app/services/order-service.js')

  const hosts = new HostListDB().getInstance()
  const groups = new GroupDB().getInstance()
  const scripts = new ScriptsDB().getInstance()
  const scriptGroups = new ScriptGroupDB().getInstance()
  const orders = new OrderDB().getInstance()

  await groups.insertAsync([
    { _id: 'default', name: 'Default', index: '2' },
    { _id: 'group-a', name: 'A', index: 10 },
    { _id: 'group-b', name: 'B', index: 'bad' }
  ])
  await hosts.insertAsync([
    { _id: 'host-1', name: 'one', group: 'group-a', index: '5' },
    { _id: 'host-2', name: 'two', group: 'missing', index: 5 },
    { _id: 'host-3', name: 'three', group: 'group-a', index: -1 },
    { _id: 'host-4', name: 'four', group: 'group-b' }
  ])
  await scriptGroups.insertAsync([
    { _id: 'default', name: 'Default', index: 1 },
    { _id: 'builtin', name: 'Builtin', index: 999 },
    { _id: 'tools', name: 'Tools', index: 1 }
  ])
  await scripts.insertAsync([
    { _id: 'script-1', name: 'one', group: 'tools', index: 3 },
    { _id: 'script-2', name: 'two', group: 'invalid', index: 4 }
  ])

  await initializeOrderSystem()
  const initialHosts = await getLayout(ORDER_DOMAIN.HOSTS)
  assert.deepEqual(initialHosts.sections.map(({ groupId }) => groupId), [
    'group-a',
    'default',
    'group-b'
  ])
  assert.deepEqual(initialHosts.flatItemIds, ['host-1', 'host-2', 'host-4', 'host-3'])
  assert.deepEqual(
    initialHosts.sections.find(({ groupId }) => groupId === 'group-a').itemIds,
    ['host-1', 'host-3']
  )
  assert.equal((await hosts.findOneAsync({ _id: 'host-2' })).group, 'default')
  assert.equal((await scripts.findOneAsync({ _id: 'script-2' })).group, 'default')

  for (const db of [hosts, groups, scripts, scriptGroups]) {
    assert.equal((await db.findAsync({})).some(record => 'index' in record), false)
  }

  const initialScripts = await getLayout(ORDER_DOMAIN.SCRIPTS)
  assert.equal(initialScripts.sections.some(({ groupId }) => groupId === 'builtin'), false)
  const revisions = [initialHosts.revision, initialScripts.revision]
  const migrationFiles = ['host.db', 'group.db', 'scripts.db', 'script-group.db', 'order.db']
  const filesBeforeSecondInit = await Promise.all(
    migrationFiles.map(file => fs.readFile(path.join(tempRoot, 'app', 'db', file), 'utf8'))
  )
  await initializeOrderSystem()
  assert.deepEqual([
    (await getLayout(ORDER_DOMAIN.HOSTS)).revision,
    (await getLayout(ORDER_DOMAIN.SCRIPTS)).revision
  ], revisions)
  const filesAfterSecondInit = await Promise.all(
    migrationFiles.map(file => fs.readFile(path.join(tempRoot, 'app', 'db', file), 'utf8'))
  )
  assert.deepEqual(filesAfterSecondInit, filesBeforeSecondInit)

  await orders.updateAsync({ _id: 'hosts' }, {
    $set: {
      sections: [
        { groupId: 'group-a', itemIds: ['host-1', 'host-1', 'host-2', 'stale'] },
        { groupId: 'group-a', itemIds: ['host-3'] },
        { groupId: 'stale', itemIds: ['host-4'] }
      ],
      flatItemIds: ['host-1', 'host-1', 'stale']
    }
  })
  const repaired = await getLayout(ORDER_DOMAIN.HOSTS)
  assert.deepEqual(new Set(repaired.flatItemIds), new Set(['host-1', 'host-2', 'host-3', 'host-4']))
  assert.deepEqual(repaired.flatItemIds.slice(0, 3), ['host-2', 'host-3', 'host-4'])
  assert.deepEqual(
    repaired.sections.find(({ groupId }) => groupId === 'group-a').itemIds,
    ['host-3', 'host-1']
  )
  assert.deepEqual(
    repaired.sections.find(({ groupId }) => groupId === 'default').itemIds,
    ['host-2']
  )

  const reversed = [...repaired.flatItemIds].reverse()
  const updated = await updateOrder(ORDER_DOMAIN.HOSTS, repaired.revision, [
    { scope: 'flat', orderedIds: reversed }
  ])
  assert.deepEqual(updated.flatItemIds, reversed)
  assert.deepEqual(updated.sections, repaired.sections)

  await assert.rejects(
    updateOrder(ORDER_DOMAIN.HOSTS, repaired.revision, [
      { scope: 'flat', orderedIds: reversed }
    ]),
    OrderConflictError
  )
  await assert.rejects(
    updateOrder(ORDER_DOMAIN.HOSTS, updated.revision, [
      { scope: 'flat', orderedIds: [reversed[0], reversed[0]] }
    ]),
    OrderValidationError
  )
  await assert.rejects(
    updateOrder(ORDER_DOMAIN.HOSTS, updated.revision, [
      { scope: 'flat', orderedIds: reversed },
      { scope: 'flat', orderedIds: reversed }
    ]),
    OrderValidationError
  )
  await assert.rejects(
    updateOrder(ORDER_DOMAIN.HOSTS, updated.revision, [
      { scope: 'groupItems', groupId: 'group-a', orderedIds: ['host-2'] }
    ]),
    OrderValidationError
  )
  await assert.rejects(
    updateOrder(ORDER_DOMAIN.SCRIPTS, initialScripts.revision, [
      { scope: 'flat', orderedIds: [] }
    ]),
    OrderValidationError
  )

  const reorderedGroups = await updateOrder(ORDER_DOMAIN.HOSTS, updated.revision, [
    { scope: 'groups', orderedIds: [...updated.sections.map(({ groupId }) => groupId)].reverse() }
  ])
  assert.deepEqual(
    reorderedGroups.sections.map(({ groupId }) => groupId),
    [...updated.sections.map(({ groupId }) => groupId)].reverse()
  )
  assert.deepEqual(reorderedGroups.flatItemIds, updated.flatItemIds)

  const toolsSection = initialScripts.sections.find(({ groupId }) => groupId === 'tools')
  const reorderedScripts = await updateOrder(ORDER_DOMAIN.SCRIPTS, initialScripts.revision, [
    { scope: 'groupItems', groupId: 'tools', orderedIds: [...toolsSection.itemIds].reverse() }
  ])
  assert.equal(reorderedScripts.flatItemIds, undefined)
  await assert.rejects(
    updateOrder(ORDER_DOMAIN.SCRIPTS, reorderedScripts.revision, [
      { scope: 'groupItems', groupId: 'builtin', orderedIds: [] }
    ]),
    OrderValidationError
  )

  const inserted = await hosts.insertAsync([
    { _id: 'host-5', name: 'five', group: 'group-a' },
    { _id: 'host-6', name: 'six', group: 'default' }
  ])
  await addItemsToOrder(ORDER_DOMAIN.HOSTS, inserted)
  const afterInsert = await getLayout(ORDER_DOMAIN.HOSTS)
  assert.deepEqual(afterInsert.flatItemIds.slice(0, 2), ['host-5', 'host-6'])
  assert.equal(
    afterInsert.sections.find(({ groupId }) => groupId === 'group-a').itemIds[0],
    'host-5'
  )

  const invalidGroupBatch = await hosts.insertAsync([
    { _id: 'host-7', name: 'seven', group: 'removed-group' },
    { _id: 'host-8', name: 'eight', group: 'removed-group' }
  ])
  await addItemsToOrder(ORDER_DOMAIN.HOSTS, invalidGroupBatch)
  const afterInvalidGroupInsert = await getLayout(ORDER_DOMAIN.HOSTS)
  assert.deepEqual(
    afterInvalidGroupInsert.sections.find(({ groupId }) => groupId === 'default').itemIds.slice(0, 2),
    ['host-7', 'host-8']
  )
  assert.equal((await hosts.findOneAsync({ _id: 'host-7' })).group, 'default')

  await hosts.updateAsync(
    { _id: { $in: ['host-1', 'host-3'] } },
    { $set: { group: 'removed-group' } },
    { multi: true }
  )
  await moveItemsToGroup(ORDER_DOMAIN.HOSTS, ['host-3', 'host-1'], 'removed-group')
  const afterMove = await getLayout(ORDER_DOMAIN.HOSTS)
  assert.deepEqual(
    afterMove.sections.find(({ groupId }) => groupId === 'default').itemIds.slice(0, 2),
    ['host-3', 'host-1']
  )
  assert.deepEqual(afterMove.flatItemIds, afterInvalidGroupInsert.flatItemIds)

  console.log('order service tests passed')
} finally {
  process.chdir(originalCwd)
  await fs.rm(tempRoot, { recursive: true, force: true })
}
