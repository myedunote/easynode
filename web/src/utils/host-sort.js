const hostNameCollator = new Intl.Collator('zh-CN-u-co-pinyin', {
  numeric: true,
  sensitivity: 'base'
})

const toSortableText = (value) => String(value ?? '')

const compareIds = (left, right) => {
  const leftId = toSortableText(left)
  const rightId = toSortableText(right)
  if (leftId === rightId) return 0
  return leftId < rightId ? -1 : 1
}

export const compareHostNames = (left, right) => {
  const result = hostNameCollator.compare(
    toSortableText(left?.name),
    toSortableText(right?.name)
  )
  if (result !== 0) return result
  return compareIds(left?.id, right?.id)
}

const normalizeSearchField = value => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return value.name ?? value.label ?? value.value ?? ''
  return String(value)
}

export const matchesHostSearch = (host, searchValue) => {
  const keyword = normalizeSearchField(searchValue).trim().toLocaleLowerCase()
  if (!keyword) return true

  const tags = Array.isArray(host?.tag) ? host.tag : [host?.tag,]
  return [host?.name, host?.username, host?.host, ...tags,]
    .some(value => normalizeSearchField(value).toLocaleLowerCase().includes(keyword))
}
