import { AESDecryptAsync } from '../utils/encrypt.js'
import { GroupDB, HostListDB, ScriptGroupDB, ScriptsDB } from '../utils/db-class.js'
import { listBuiltinScripts } from '../services/script-library.js'
import {
  getLayout,
  ORDER_DOMAIN,
  orderByIds,
  updateOrder
} from '../services/order-service.js'

const hostListDB = new HostListDB().getInstance()
const groupDB = new GroupDB().getInstance()
const scriptsDB = new ScriptsDB().getInstance()
const scriptGroupDB = new ScriptGroupDB().getInstance()

async function publicHost(item) {
  let credential = item.credential
  if (credential) {
    try {
      credential = await AESDecryptAsync(credential)
    } catch (error) {
      logger.error(`decrypt host credential failed: ${ item._id }`, error)
      credential = ''
    }
  }
  const { authType, _id: id } = item
  return {
    ...item,
    id,
    isConfig: Boolean(authType && item[authType]),
    password: '',
    privateKey: '',
    credential
  }
}

function publicGroup(item) {
  return { ...item, id: item._id }
}

function publicScript(item) {
  return {
    ...item,
    id: item._id,
    group: item.group || 'default',
    builtin: false
  }
}

export async function getHostCatalog({ res }) {
  const order = await getLayout(ORDER_DOMAIN.HOSTS)
  const [hostRecords, groupRecords] = await Promise.all([
    hostListDB.findAsync({}),
    groupDB.findAsync({})
  ])
  const hosts = await Promise.all(orderByIds(hostRecords, order.flatItemIds).map(publicHost))
  const groups = orderByIds(groupRecords, order.sections.map(({ groupId }) => groupId)).map(publicGroup)
  res.success({ data: { hosts, groups, order } })
}

export async function getScriptCatalog({ res }) {
  const order = await getLayout(ORDER_DOMAIN.SCRIPTS)
  const [scriptRecords, groupRecords] = await Promise.all([
    scriptsDB.findAsync({}),
    scriptGroupDB.findAsync({})
  ])
  const storedScripts = order.sections.flatMap(section =>
    orderByIds(scriptRecords, section.itemIds).map(publicScript)
  )
  const mutableGroups = orderByIds(groupRecords, order.sections.map(({ groupId }) => groupId)).map(publicGroup)
  const builtinGroup = groupRecords.find(({ _id }) => _id === 'builtin')
  const groups = builtinGroup ? [...mutableGroups, publicGroup(builtinGroup)] : mutableGroups
  res.success({
    data: {
      scripts: [...storedScripts, ...listBuiltinScripts()],
      groups,
      order
    }
  })
}

async function putOrder(domain, { res, request }) {
  const { revision, changes } = request.body || {}
  try {
    const order = await updateOrder(domain, revision, changes)
    res.success({ data: order })
  } catch (error) {
    if (error.code === 'ORDER_CONFLICT' || error.code === 'INVALID_ORDER') {
      return res.fail({
        status: error.status,
        msg: error.message,
        data: { code: error.code }
      })
    }
    throw error
  }
}

export async function putHostOrder(ctx) {
  return putOrder(ORDER_DOMAIN.HOSTS, ctx)
}

export async function putScriptOrder(ctx) {
  return putOrder(ORDER_DOMAIN.SCRIPTS, ctx)
}
