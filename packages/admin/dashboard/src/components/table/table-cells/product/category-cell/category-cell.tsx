import { PlaceholderCell } from "../../common/placeholder-cell"
import { HttpTypes } from "@switchyard/types"

type CategoryCellProps = {
  categories?: HttpTypes.AdminProductCategory[] | null
}

export const CategoryCell = ({ categories }: CategoryCellProps) => {
  if (!categories || categories.length === 0) {
    return <PlaceholderCell />
  }

  // Show the first category (or subcategory if there's a hierarchy)
  // For Goods, we typically show the most specific category
  const category = categories[0]
  
  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <span className="truncate">{category.name}</span>
    </div>
  )
}

export const CategoryHeader = () => {
  return (
    <div className="flex h-full w-full items-center">
      <span>Category</span>
    </div>
  )
}

