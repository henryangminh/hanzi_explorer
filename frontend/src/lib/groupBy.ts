/** Items grouped by stroke count, ascending (unknown counts are grouped under 0). */
export function groupByStrokeCount<T extends { stroke_count?: number | null }>(items: T[]): [number, T[]][] {
  const groups = new Map<number, T[]>()
  for (const item of items) {
    const key = item.stroke_count ?? 0
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups.entries()].sort(([a], [b]) => a - b)
}

/** Items grouped by key, groups in first-appearance order. */
export function groupInOrder<T, K>(items: T[], keyOf: (item: T) => K): { key: K; items: T[] }[] {
  const groups: { key: K; items: T[] }[] = []
  for (const item of items) {
    const key = keyOf(item)
    const group = groups.find((g) => g.key === key)
    if (group) group.items.push(item)
    else groups.push({ key, items: [item] })
  }
  return groups
}
