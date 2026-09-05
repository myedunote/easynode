import {
  GroupDB,
  HostListDB,
  OrderDB,
  ScriptGroupDB,
  ScriptsDB,
  ServerListDB
} from '../utils/db-class.js'

const SCHEMA_VERSION = 1
const HOSTS = 'hosts'
const SCRIPTS = 'scripts'

const hostListDB = new HostListDB().getInstance()
const groupDB = new GroupDB().getInstance()
const scriptsDB = new ScriptsDB().getInstance()
const scriptGroupDB = new ScriptGroupDB().getInstance()
const orderDB = new OrderDB().getInstance()
const serverListDB = new ServerListDB().getInstance()

const queues = new Map()

function serialized(domain, task) {
  const previous = queues.get(domain) || Promise.resolve()
  const current = previous.catch(() => {}).then(task)
  queues.set(domain, current)
  return current.finally(() => {
    if (queues.get(domain) === current) queues.delete(domain)
  })
}

function numericIndex(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function compareIds(a, b) {
  const left = String(a)
  const right = String(b)
  if (left === right) return 0
  return left < right ? -1 : 1
}

function legacySort(a, b) {
  const byIndex = numericIndex(b.index) - numericIndex(a.index)
  return byIndex || compareIds(a._id, b._id)
}

function uniqueIds(ids) {
  const result = []
  const seen = new Set()
  for (const id of Array.isArray(ids) ? ids : []) {
    if (typeof id !== 'string' || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

async function readDomain(domain) {
  if (domain === HOSTS) {
    return {
      groups: await groupDB.findAsync({}),
      items: await hostListDB.findAsync({})
    }
  }
  return {
    groups: (await scriptGroupDB.findAsync({})).filter(({ _id }) => _id !== 'builtin'),
    items: await scriptsDB.findAsync({})
  }
}

async function normalizeBusinessGroups(domain, groups, items) {
  const groupIds = new Set(groups.map(({ _id }) => _id))
  const invalidItems = items.filter(({ group }) => !groupIds.has(group))
  if (!invalidItems.length) return items

  const db = domain === HOSTS ? hostListDB : scriptsDB
  await db.updateAsync(
    { _id: { $in: invalidItems.map(({ _id }) => _id) } },
    { $set: { group: 'default' } },
    { multi: true }
  )
  return items.map(item => groupIds.has(item.group) ? item : { ...item, group: 'default' })
}

function createInitialLayout(domain, groups, items) {
  const orderedGroups = [...groups].sort(legacySort)
  const orderedItems = [...items].sort(legacySort)
  const sections = orderedGroups.map(group => ({
    groupId: group._id,
    itemIds: orderedItems.filter(item => item.group === group._id).map(item => item._id)
  }))
  const layout = {
    _id: domain,
    schemaVersion: SCHEMA_VERSION,
    revision: 1,
    sections
  }
  if (domain === HOSTS) layout.flatItemIds = orderedItems.map(({ _id }) => _id)
  return layout
}

function normalizeLayout(domain, layout, groups, items) {
  const groupIds = new Set(groups.map(({ _id }) => _id))
  const itemById = new Map(items.map(item => [item._id, item]))
  const seenGroups = new Set()
  const seenItems = new Set()
  const sections = []

  for (const section of Array.isArray(layout?.sections) ? layout.sections : []) {
    if (!groupIds.has(section?.groupId) || seenGroups.has(section.groupId)) continue
    seenGroups.add(section.groupId)
    const itemIds = []
    for (const id of uniqueIds(section.itemIds)) {
      const item = itemById.get(id)
      if (!item || item.group !== section.groupId || seenItems.has(id)) continue
      seenItems.add(id)
      itemIds.push(id)
    }
    sections.push({ groupId: section.groupId, itemIds })
  }

  const missingGroups = groups
    .filter(({ _id }) => !seenGroups.has(_id))
    .sort((a, b) => compareIds(a._id, b._id))
    .map(({ _id }) => ({ groupId: _id, itemIds: [] }))
  sections.unshift(...missingGroups)

  for (const section of sections) {
    const missingItems = items
      .filter(item => item.group === section.groupId && !seenItems.has(item._id))
      .sort((a, b) => compareIds(a._id, b._id))
      .map(({ _id }) => _id)
    missingItems.forEach(id => seenItems.add(id))
    section.itemIds.unshift(...missingItems)
  }

  const normalized = {
    _id: domain,
    schemaVersion: SCHEMA_VERSION,
    revision: Number.isInteger(layout?.revision) && layout.revision > 0 ? layout.revision : 1,
    sections
  }
  if (domain === HOSTS) {
    const allIds = new Set(items.map(({ _id }) => _id))
    const flatIds = uniqueIds(layout?.flatItemIds).filter(id => allIds.has(id))
    const included = new Set(flatIds)
    const missing = items
      .filter(({ _id }) => !included.has(_id))
      .sort((a, b) => compareIds(a._id, b._id))
      .map(({ _id }) => _id)
    normalized.flatItemIds = [...missing, ...flatIds]
  }
  return normalized
}

function layoutContent(layout) {
  const publicLayout = { ...layout }
  delete publicLayout._id
  return publicLayout
}

function sameLayout(a, b) {
  return JSON.stringify(layoutContent(a)) === JSON.stringify(layoutContent(b))
}

async function loadNormalizedLayout(domain) {
  const { groups, items: rawItems } = await readDomain(domain)
  const items = await normalizeBusinessGroups(domain, groups, rawItems)
  let layout = await orderDB.findOneAsync({ _id: domain })
  if (!layout) {
    layout = createInitialLayout(domain, groups, items)
    await orderDB.insertAsync(layout)
    return { layout, groups, items }
  }

  const normalized = normalizeLayout(domain, layout, groups, items)
  if (!sameLayout(layout, normalized)) {
    const revision = Number.isInteger(layout.revision) && layout.revision > 0
      ? layout.revision
      : 0
    normalized.revision = revision + 1
    await orderDB.updateAsync({ _id: domain }, normalized)
    layout = normalized
  }
  return { layout, groups, items }
}

async function mutateLayout(domain, mutate) {
  return serialized(domain, async () => {
    const { layout, groups, items } = await loadNormalizedLayout(domain)
    const next = structuredClone(layout)
    mutate(next, { groups, items })
    const normalized = normalizeLayout(domain, next, groups, items)
    if (sameLayout(layout, normalized)) return layoutContent(layout)
    normalized.revision = layout.revision + 1
    const result = await orderDB.updateAsync(
      { _id: domain, revision: layout.revision },
      normalized
    )
    if (result.numAffected !== 1) throw new OrderConflictError()
    return layoutContent(normalized)
  })
}

export class OrderConflictError extends Error {
  constructor() {
    super('顺序已被其他客户端修改，请重新调整')
    this.code = 'ORDER_CONFLICT'
    this.status = 409
  }
}

export class OrderValidationError extends Error {
  constructor(message) {
    super(message)
    this.code = 'INVALID_ORDER'
    this.status = 422
  }
}

function assertExactIds(actual, expected, label) {
  if (!Array.isArray(actual)) throw new OrderValidationError(`${ label } orderedIds 必须是数组`)
  if (uniqueIds(actual).length !== actual.length) throw new OrderValidationError(`${ label } orderedIds 存在重复或无效 ID`)
  const expectedSet = new Set(expected)
  if (actual.length !== expected.length || actual.some(id => !expectedSet.has(id))) {
    throw new OrderValidationError(`${ label } orderedIds 必须包含当前 scope 的全部成员且不能包含未知项`)
  }
}

export async function updateOrder(domain, revision, changes) {
  if (![HOSTS, SCRIPTS].includes(domain)) throw new OrderValidationError('未知排序域')
  if (!Number.isInteger(revision) || !Array.isArray(changes) || !changes.length) {
    throw new OrderValidationError('revision 和 changes 参数错误')
  }

  return serialized(domain, async () => {
    const { layout } = await loadNormalizedLayout(domain)
    if (layout.revision !== revision) throw new OrderConflictError()
    const next = structuredClone(layout)
    const keys = new Set()

    for (const change of changes) {
      const { scope, groupId, orderedIds } = change || {}
      if (domain === SCRIPTS && scope === 'flat') throw new OrderValidationError('脚本域不支持 flat 排序')
      const key = scope === 'groupItems' ? `${ scope }:${ groupId || '' }` : scope
      if (keys.has(key)) throw new OrderValidationError('同一 scope/group 不能重复提交')
      keys.add(key)

      if (scope === 'flat' && domain === HOSTS) {
        assertExactIds(orderedIds, layout.flatItemIds, 'flat')
        next.flatItemIds = [...orderedIds]
      } else if (scope === 'groups') {
        const expected = layout.sections.map(({ groupId: id }) => id)
        assertExactIds(orderedIds, expected, 'groups')
        const sectionById = new Map(next.sections.map(section => [section.groupId, section]))
        next.sections = orderedIds.map(id => sectionById.get(id))
      } else if (scope === 'groupItems') {
        if (!groupId || (domain === SCRIPTS && groupId === 'builtin')) {
          throw new OrderValidationError('groupItems 缺少有效 groupId')
        }
        const section = next.sections.find(item => item.groupId === groupId)
        if (!section) throw new OrderValidationError('分组不存在')
        assertExactIds(orderedIds, section.itemIds, `groupItems:${ groupId }`)
        section.itemIds = [...orderedIds]
      } else {
        throw new OrderValidationError('不支持的排序 scope')
      }
    }

    next.revision = layout.revision + 1
    const result = await orderDB.updateAsync(
      { _id: domain, revision: layout.revision },
      next
    )
    if (result.numAffected !== 1) throw new OrderConflictError()
    return layoutContent(next)
  })
}

export async function getLayout(domain) {
  return serialized(domain, async () => layoutContent((await loadNormalizedLayout(domain)).layout))
}

export async function addItemsToOrder(domain, records) {
  const added = (Array.isArray(records) ? records : [records]).filter(Boolean)
  if (!added.length) return getLayout(domain)
  return mutateLayout(domain, (layout, { items }) => {
    const addedIds = added.map(({ _id }) => _id)
    const itemById = new Map(items.map(item => [item._id, item]))
    for (const section of layout.sections) {
      const ids = addedIds.filter(id => itemById.get(id)?.group === section.groupId)
      if (ids.length) section.itemIds = [...ids, ...section.itemIds.filter(id => !ids.includes(id))]
    }
    if (domain === HOSTS) {
      layout.flatItemIds = [...addedIds, ...layout.flatItemIds.filter(id => !addedIds.includes(id))]
    }
  })
}

export async function moveItemsToGroup(domain, ids, targetGroupId) {
  return mutateLayout(domain, layout => {
    const moving = new Set(ids)
    for (const section of layout.sections) {
      section.itemIds = section.itemIds.filter(id => !moving.has(id))
    }
    const target = layout.sections.find(({ groupId }) => groupId === targetGroupId) ||
      layout.sections.find(({ groupId }) => groupId === 'default')
    if (target) target.itemIds.unshift(...ids)
  })
}

export async function removeItemsFromOrder(domain, ids) {
  return mutateLayout(domain, layout => {
    const removed = new Set(ids)
    for (const section of layout.sections) {
      section.itemIds = section.itemIds.filter(id => !removed.has(id))
    }
    if (domain === HOSTS) layout.flatItemIds = layout.flatItemIds.filter(id => !removed.has(id))
  })
}

export async function addGroupToOrder(domain, groupId) {
  return mutateLayout(domain, layout => {
    layout.sections = [
      { groupId, itemIds: [] },
      ...layout.sections.filter(section => section.groupId !== groupId)
    ]
  })
}

export function orderByIds(records, ids) {
  const byId = new Map(records.map(item => [item._id || item.id, item]))
  return ids.map(id => byId.get(id)).filter(Boolean)
}

export async function initializeOrderSystem() {
  await serialized(HOSTS, () => loadNormalizedLayout(HOSTS))
  await serialized(SCRIPTS, () => loadNormalizedLayout(SCRIPTS))
  await orderDB.removeAsync({ _id: { $nin: [HOSTS, SCRIPTS] } }, { multi: true })

  await Promise.all([
    hostListDB.updateAsync({ index: { $exists: true } }, { $unset: { index: true } }, { multi: true }),
    groupDB.updateAsync({ index: { $exists: true } }, { $unset: { index: true } }, { multi: true }),
    scriptsDB.updateAsync({ index: { $exists: true } }, { $unset: { index: true } }, { multi: true }),
    scriptGroupDB.updateAsync({ index: { $exists: true } }, { $unset: { index: true } }, { multi: true })
  ])

  const config = await serverListDB.findOneAsync({})
  if (config?.columnSettings?.index !== undefined) {
    const columnSettings = { ...config.columnSettings }
    delete columnSettings.index
    await serverListDB.updateAsync({ _id: config._id }, { $set: { columnSettings } })
  }
}

export const ORDER_DOMAIN = { HOSTS, SCRIPTS }
