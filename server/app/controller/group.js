import { HostListDB, GroupDB } from '../utils/db-class.js'
import { addGroupToOrder, getLayout, moveItemsToGroup, ORDER_DOMAIN } from '../services/order-service.js'

const hostListDB = new HostListDB().getInstance()
const groupDB = new GroupDB().getInstance()

const addGroupList = async ({ res, request }) => {
  let { body: { name } } = request
  if (!name) return res.fail({ data: false, msg: '参数错误' })
  const group = await groupDB.insertAsync({ name })
  await addGroupToOrder(ORDER_DOMAIN.HOSTS, group._id)
  res.success({ data: '添加成功' })
}

const updateGroupList = async ({ res, request }) => {
  let { params: { id } } = request
  let { body: { name } } = request
  if (!id || !name) return res.fail({ data: false, msg: '参数错误' })
  let target = await groupDB.findOneAsync({ _id: id })
  if (!target) return res.fail({ data: false, msg: `分组ID${ id }不存在` })
  await groupDB.updateAsync({ _id: id }, { $set: { name } })
  res.success({ data: '修改成功' })
}

const removeGroup = async ({ res, request }) => {
  let { params: { id } } = request
  if (id === 'default') return res.fail({ data: false, msg: '保留分组, 禁止删除' })
  const order = await getLayout(ORDER_DOMAIN.HOSTS)
  const movedIds = order.sections.find(section => section.groupId === id)?.itemIds || []
  // 移除分组将所有该分组下host分配到default中去
  await hostListDB.updateAsync(
    { group: id },
    { $set: { group: 'default' } },
    { multi: true }
  )
  await groupDB.removeAsync({ _id: id })
  await moveItemsToGroup(ORDER_DOMAIN.HOSTS, movedIds, 'default')
  res.success({ data: '移除成功' })
}

export {
  addGroupList,
  updateGroupList,
  removeGroup
}
