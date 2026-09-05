import Sortable from 'sortablejs'
import { nextTick, onBeforeUnmount, watch } from 'vue'

export function moveArrayItem(items, oldIndex, newIndex) {
  const [item,] = items.splice(oldIndex, 1)
  items.splice(newIndex, 0, item)
  return items
}

export default function useListOrder({ rootRef, enabled, onMove, draggable = 'tr' }) {
  let sortable = null
  let sortableBody = null

  const destroy = () => {
    sortable?.destroy()
    sortableBody?.classList.remove('order-sortable-body')
    sortable = null
    sortableBody = null
  }

  const mount = async () => {
    destroy()
    if (!enabled.value) return
    await nextTick()
    const body = rootRef.value?.$el?.querySelector('.el-table__body-wrapper tbody') ||
      rootRef.value?.querySelector?.('.el-table__body-wrapper tbody')
    if (!body) return
    sortableBody = body
    sortableBody.classList.add('order-sortable-body')
    sortable = Sortable.create(body, {
      animation: 180,
      draggable,
      ghostClass: 'order-sortable-ghost',
      chosenClass: 'order-sortable-chosen',
      dragClass: 'order-sortable-drag',
      onEnd: ({ oldIndex, newIndex, oldDraggableIndex, newDraggableIndex, from, item }) => {
        const sourceIndex = Number.isInteger(oldDraggableIndex) ? oldDraggableIndex : oldIndex
        const targetIndex = Number.isInteger(newDraggableIndex) ? newDraggableIndex : newIndex

        // Sortable has already moved the real DOM. Restore it before updating Vue state,
        // otherwise the renderer can apply the same move a second time and revert the rows.
        if (oldIndex !== newIndex && Number.isInteger(oldIndex) && item?.parentNode === from) {
          from.removeChild(item)
          from.insertBefore(item, from.children[oldIndex] || null)
        }
        if (sourceIndex === targetIndex || !Number.isInteger(sourceIndex) || !Number.isInteger(targetIndex)) return
        onMove(sourceIndex, targetIndex)
      }
    })
  }

  watch(enabled, mount, { immediate: true })
  watch(rootRef, mount)
  onBeforeUnmount(destroy)

  return { refreshSortable: mount }
}
