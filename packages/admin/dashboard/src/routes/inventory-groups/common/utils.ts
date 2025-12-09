import { InventoryGroupTreeItem } from "./types"

export function flattenTree(
  items: InventoryGroupTreeItem[]
): InventoryGroupTreeItem[] {
  const result: InventoryGroupTreeItem[] = []

  function traverse(item: InventoryGroupTreeItem) {
    result.push(item)
    if (item.group_children?.length) {
      item.group_children.forEach(traverse)
    }
  }

  items.forEach(traverse)
  return result
}

export function findItemInTree(
  items: InventoryGroupTreeItem[],
  id: string
): InventoryGroupTreeItem | null {
  for (const item of items) {
    if (item.id === id) {
      return item
    }
    if (item.group_children?.length) {
      const found = findItemInTree(item.group_children, id)
      if (found) {
        return found
      }
    }
  }
  return null
}

export function getAncestorPath(
  items: InventoryGroupTreeItem[],
  id: string
): InventoryGroupTreeItem[] {
  const path: InventoryGroupTreeItem[] = []

  function traverse(
    item: InventoryGroupTreeItem,
    currentPath: InventoryGroupTreeItem[]
  ): boolean {
    const newPath = [...currentPath, item]

    if (item.id === id) {
      path.push(...newPath)
      return true
    }

    if (item.group_children?.length) {
      for (const child of item.group_children) {
        if (traverse(child, newPath)) {
          return true
        }
      }
    }

    return false
  }

  for (const item of items) {
    if (traverse(item, [])) {
      break
    }
  }

  return path
}

